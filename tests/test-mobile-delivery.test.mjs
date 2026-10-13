import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createSetupPlan } from '../dist/capabilities.js';
import { parseStandardOptions } from '../dist/standard.js';
import { buildMobileApplication } from '../dist/mobile-delivery.js';

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-mobile-delivery-'));
  mkdirSync(path.join(root, 'apps/mobile'), { recursive: true });
  writeFileSync(
    path.join(root, 'apps/mobile/app.json'),
    JSON.stringify({
      expo: {
        owner: 'fixture',
        slug: 'mobile-app',
        extra: { eas: { projectId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } },
      },
    }),
  );
  writeFileSync(
    path.join(root, 'anhedral.setup.json'),
    JSON.stringify(createSetupPlan(parseStandardOptions('new', [root, '--expo']))),
  );
  writeFileSync(
    path.join(root, 'apps/mobile/eas.json'),
    JSON.stringify({
      build: {
        simulator: { ios: { simulator: true } },
        preview: { distribution: 'internal', android: { buildType: 'apk' } },
      },
    }),
  );
  return root;
}

test('mobile dry run needs no provider access; completed build returns a downloadable artifact without submission', async () => {
  const root = fixture();
  const calls = [];
  const run = async (command, args) => {
    calls.push({ command, args });
    if (args.includes('check-ignore')) return args.at(-1);
    if (args.includes('ls-files')) return '';
    if (args.includes('--show-toplevel')) return root;
    if (args.includes('--porcelain')) return '';
    if (args.includes('HEAD')) return 'a'.repeat(40);
    if (args.includes('project:info'))
      return 'fullName  @fixture/mobile-app\nID        aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\n';
    if (args.includes('build'))
      return JSON.stringify([
        {
          id: 'build-123',
          platform: 'IOS',
          buildProfile: 'simulator',
          isForIosSimulator: true,
          status: 'FINISHED',
          gitCommitHash: 'a'.repeat(40),
          project: {
            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            ownerAccount: { name: 'fixture' },
            slug: 'mobile-app',
          },
          artifacts: { buildUrl: 'https://expo.dev/builds/build-123/download' },
        },
      ]);
    return '';
  };
  try {
    const preview = await buildMobileApplication(
      root,
      { platform: 'ios', profile: 'simulator', dryRun: true },
      run,
    );
    assert.equal(preview.mutation, false);
    assert.equal(calls.length, 0);
    const result = await buildMobileApplication(
      root,
      { platform: 'ios', profile: 'simulator' },
      run,
    );
    assert.equal(result.artifact, 'ios-simulator');
    assert.equal(result.storeSubmission, false);
    assert.match(result.downloadUrl, /^https:/);
    assert.equal(
      result.buildPageUrl,
      'https://expo.dev/accounts/fixture/projects/mobile-app/builds/build-123',
    );
    assert.equal(
      calls.some((c) => c.args.includes('submit')),
      false,
    );
    assert.equal(
      JSON.parse(readFileSync(path.join(root, '.anhedral/mobile-build.json'))).buildId,
      result.buildId,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('mobile delivery rejects dirty source, missing profiles and unverifiable EAS builds', async () => {
  const root = fixture();
  try {
    await assert.rejects(
      buildMobileApplication(root, { platform: 'android', profile: 'unknown', dryRun: true }),
      /not configured/,
    );
    await assert.rejects(
      buildMobileApplication(
        root,
        { platform: 'android', profile: 'preview' },
        async (_command, args) => {
          if (args.includes('check-ignore')) return args.at(-1);
          if (args.includes('ls-files')) return '';
          return args.includes('--show-toplevel') ? root : 'dirty';
        },
      ),
      /clean application/,
    );
    await assert.rejects(
      buildMobileApplication(
        root,
        { platform: 'android', profile: 'preview' },
        async (_command, args) => {
          if (args.includes('check-ignore')) return args.at(-1);
          if (args.includes('ls-files')) return '';
          if (args.includes('--show-toplevel')) return root;
          if (args.includes('--porcelain')) return '';
          if (args.includes('HEAD')) return 'b'.repeat(40);
          if (args.includes('project:info'))
            return 'fullName  @fixture/mobile-app\nID        aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\n';
          if (args.includes('build'))
            return JSON.stringify([{ id: 'build-456', status: 'IN_QUEUE' }]);
          return '';
        },
      ),
      /different project/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('queued builds retain their ID and the next ship inspects that build without submitting another', async () => {
  const root = fixture();
  const calls = [];
  const project = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    slug: 'mobile-app',
    ownerAccount: { name: 'fixture' },
  };
  const run = async (_command, args) => {
    calls.push(args);
    if (args.includes('check-ignore')) return args.at(-1);
    if (args.includes('ls-files')) return '';
    if (args.includes('--show-toplevel')) return root;
    if (args.includes('--porcelain')) return '';
    if (args.includes('HEAD')) return 'a'.repeat(40);
    if (args.includes('project:info'))
      return `fullName  @fixture/mobile-app\nID        ${project.id}\n`;
    const build = {
      id: 'build-queued',
      platform: 'ANDROID',
      buildProfile: 'preview',
      project,
      gitCommitHash: 'a'.repeat(40),
    };
    if (args.includes('build')) return JSON.stringify([{ ...build, status: 'IN_QUEUE' }]);
    if (args.includes('build:view'))
      return JSON.stringify({
        ...build,
        status: 'FINISHED',
        artifacts: { buildUrl: 'https://expo.dev/builds/build-queued/download' },
      });
    return '';
  };
  try {
    const queued = await buildMobileApplication(
      root,
      { platform: 'android', profile: 'preview' },
      run,
    );
    assert.equal(queued.state, 'building');
    assert.equal(queued.downloadUrl, undefined);
    const finished = await buildMobileApplication(
      root,
      { platform: 'android', profile: 'preview' },
      run,
    );
    assert.equal(finished.state, 'built');
    assert.equal(finished.buildId, queued.buildId);
    assert.equal(calls.filter((args) => args.includes('build')).length, 1);
    assert.equal(calls.filter((args) => args.includes('build:view')).length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const profile of [[], null, 'preview', { extends: 'production' }]) {
  test(`mobile rejects unusable profile before provider access: ${JSON.stringify(profile)}`, async () => {
    const root = fixture();
    let calls = 0;
    try {
      writeFileSync(
        path.join(root, 'apps/mobile/eas.json'),
        JSON.stringify({ build: { preview: profile } }),
      );
      await assert.rejects(
        buildMobileApplication(
          root,
          { platform: 'android', profile: 'preview', dryRun: true },
          async () => {
            calls++;
            return '';
          },
        ),
        /not configured|inherited EAS profiles/,
      );
      assert.equal(calls, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

const buildCases = [
  ['foreign platform', { platform: 'IOS' }, /platform, profile or environment/],
  ['missing platform', { platform: undefined }, /platform, profile or environment/],
  ['foreign profile', { buildProfile: 'production' }, /platform, profile or environment/],
  ['foreign environment', { environment: 'production' }, /platform, profile or environment/],
  ['queued', { status: 'IN_QUEUE' }, 'building'],
  ['running', { status: 'IN_PROGRESS' }, 'building'],
  ['failed', { status: 'ERRORED' }, /completed downloadable build/],
  ['canceled', { status: 'CANCELED' }, /completed downloadable build/],
  ['missing artifact', { status: 'FINISHED' }, /completed downloadable build/],
  [
    'insecure artifact',
    { status: 'FINISHED', artifacts: { buildUrl: 'http://example.com/app.apk' } },
    /completed downloadable build/,
  ],
  [
    'credentialed artifact',
    { status: 'FINISHED', artifacts: { buildUrl: 'https://user:secret@example.com/app.apk' } },
    /completed downloadable build/,
  ],
  ['foreign source', { status: 'FINISHED', gitCommitHash: 'b'.repeat(40) }, /source differs/],
  [
    'foreign owner',
    {
      status: 'IN_QUEUE',
      project: {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        slug: 'mobile-app',
        ownerAccount: { name: 'foreign' },
      },
    },
    /different project/,
  ],
  ['invalid ID', { id: '../foreign', status: 'IN_QUEUE' }, /valid build ID/],
];
for (const [name, overrides, expected] of buildCases) {
  test(`mobile build ${name} never claims a completed artifact or submits to stores`, async () => {
    const root = fixture();
    const calls = [];
    try {
      const run = async (_command, args) => {
        calls.push(args);
        if (args.includes('check-ignore')) return args.at(-1);
        if (args.includes('ls-files')) return '';
        if (args.includes('--show-toplevel')) return root;
        if (args.includes('--porcelain')) return '';
        if (args.includes('HEAD')) return 'a'.repeat(40);
        if (args.includes('project:info'))
          return 'fullName @fixture/mobile-app\nID aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\n';
        if (args.includes('build'))
          return JSON.stringify([
            {
              id: 'build-1',
              platform: 'ANDROID',
              buildProfile: 'preview',
              gitCommitHash: 'a'.repeat(40),
              project: {
                id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                slug: 'mobile-app',
                ownerAccount: { name: 'fixture' },
              },
              ...overrides,
            },
          ]);
        return '';
      };
      const result = buildMobileApplication(root, { platform: 'android', profile: 'preview' }, run);
      if (typeof expected === 'string') {
        const building = await result;
        assert.equal(building.state, expected);
        assert.equal(building.downloadUrl, undefined);
        assert.equal(building.storeSubmission, false);
      } else await assert.rejects(result, expected);
      assert.equal(
        calls.some((args) => args.includes('submit')),
        false,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

function mobileRunner(root, build) {
  return async (_command, args) => {
    if (args.includes('check-ignore')) return args.at(-1);
    if (args.includes('ls-files')) return '';
    if (args.includes('--show-toplevel')) return root;
    if (args.includes('--porcelain')) return '';
    if (args.includes('HEAD')) return 'a'.repeat(40);
    if (args.includes('project:info'))
      return 'fullName @fixture/mobile-app\nID aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\n';
    if (args.includes('build') || args.includes('build:view')) return build(args);
    return '';
  };
}

for (const outcome of ['lost response', 'invalid JSON', 'foreign owner', 'foreign source']) {
  test(`mobile submission ${outcome} retains intent and never queues twice`, async () => {
    const root = fixture();
    let submissions = 0;
    const run = mobileRunner(root, async (args) => {
      assert.equal(args.includes('build:view'), false);
      submissions++;
      const intent = JSON.parse(
        readFileSync(path.join(root, '.anhedral/mobile-build.pending.json')),
      );
      assert.equal(intent.status, 'submitting');
      assert.equal(intent.buildId, undefined);
      if (outcome === 'lost response') throw new Error('Remote queue response lost.');
      if (outcome === 'invalid JSON') return '{';
      return JSON.stringify([
        {
          id: 'untrusted-id',
          platform: 'ANDROID',
          buildProfile: 'preview',
          status: 'IN_QUEUE',
          gitCommitHash: (outcome === 'foreign source' ? 'b' : 'a').repeat(40),
          project: {
            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            slug: 'mobile-app',
            ownerAccount: { name: outcome === 'foreign owner' ? 'foreign' : 'fixture' },
          },
        },
      ]);
    });
    try {
      const options = { platform: 'android', profile: 'preview' };
      await assert.rejects(buildMobileApplication(root, options, run));
      const pending = JSON.parse(
        readFileSync(path.join(root, '.anhedral/mobile-build.pending.json')),
      );
      assert.equal(pending.status, 'submitting');
      assert.equal(pending.buildId, undefined);
      await assert.rejects(buildMobileApplication(root, options, run), /unknown outcome/);
      assert.equal(submissions, 1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test('mobile resume rejects a different returned build ID without replacing the recorded selection', async () => {
  const root = fixture();
  const pending = {
    schemaVersion: 1,
    commit: 'a'.repeat(40),
    platform: 'android',
    profile: 'preview',
    projectId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    buildId: 'expected-build',
  };
  mkdirSync(path.join(root, '.anhedral'));
  writeFileSync(path.join(root, '.anhedral/mobile-build.pending.json'), JSON.stringify(pending));
  const run = mobileRunner(root, async (args) => {
    assert.equal(args.includes('build:view'), true);
    return JSON.stringify({
      id: 'other-build',
      platform: 'ANDROID',
      buildProfile: 'preview',
      status: 'IN_QUEUE',
      gitCommitHash: pending.commit,
      project: { id: pending.projectId, slug: 'mobile-app', ownerAccount: { name: 'fixture' } },
    });
  });
  try {
    await assert.rejects(
      buildMobileApplication(root, { platform: 'android', profile: 'preview' }, run),
      /different build/,
    );
    assert.deepEqual(
      JSON.parse(readFileSync(path.join(root, '.anhedral/mobile-build.pending.json'))),
      pending,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('mobile validates EAS environment before provider access even without runtime values', async () => {
  const root = fixture();
  let calls = 0;
  try {
    writeFileSync(
      path.join(root, 'apps/mobile/eas.json'),
      JSON.stringify({ build: { preview: { environment: 'foreign' } } }),
    );
    await assert.rejects(
      buildMobileApplication(root, { platform: 'android', profile: 'preview' }, async () => {
        calls++;
        return '';
      }),
      /supported EAS environment/,
    );
    assert.equal(calls, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('mobile whole-flow lock excludes a concurrent delivery before any mutation command', async () => {
  const root = fixture();
  let entered;
  const started = new Promise((resolve) => {
    entered = resolve;
  });
  let release;
  const pause = new Promise((resolve) => {
    release = resolve;
  });
  let secondCalls = 0;
  const run = mobileRunner(root, async () => {
    throw new Error('Queue response lost.');
  });
  let paused = false;
  const first = buildMobileApplication(
    root,
    { platform: 'android', profile: 'preview' },
    async (...args) => {
      if (!paused && args[1].includes('check')) {
        paused = true;
        entered();
        await pause;
      }
      return run(...args);
    },
  );
  try {
    await started;
    await assert.rejects(
      buildMobileApplication(
        root,
        { platform: 'android', profile: 'preview' },
        async (_command, args) => {
          if (args.includes('check-ignore')) return args.at(-1);
          if (args.includes('ls-files')) return '';
          secondCalls++;
          return '';
        },
      ),
      /Another delivery/,
    );
    assert.equal(secondCalls, 0);
    release();
    await assert.rejects(first, /inspect the selected Expo project/);
  } finally {
    release();
    await first.catch(() => undefined);
    rmSync(root, { recursive: true, force: true });
  }
});

test('unknown EAS submission blocks provisioning, checks and remote configuration', async () => {
  const root = fixture();
  mkdirSync(path.join(root, '.anhedral'));
  writeFileSync(
    path.join(root, '.anhedral/mobile-build.pending.json'),
    JSON.stringify({
      schemaVersion: 1,
      status: 'submitting',
      commit: 'a'.repeat(40),
      platform: 'android',
      profile: 'preview',
      projectId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    }),
  );
  const calls = [];
  try {
    await assert.rejects(
      buildMobileApplication(
        root,
        { platform: 'android', profile: 'preview' },
        async (command, args) => {
          calls.push(command);
          if (command !== 'git') throw new Error('Unexpected execution after unknown submission.');
          if (args.includes('check-ignore')) return args.at(-1);
          if (args.includes('ls-files')) return '';
          if (args.includes('--show-toplevel')) return root;
          if (args.includes('--porcelain')) return '';
          if (args.includes('HEAD')) return 'a'.repeat(40);
          return '';
        },
      ),
      /unknown outcome/,
    );
    assert.equal(
      calls.every((command) => command === 'git'),
      true,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const simulator of [undefined, false]) {
  test(`mobile simulator artifact requires verified simulator evidence: ${simulator}`, async () => {
    const root = fixture();
    try {
      await assert.rejects(
        buildMobileApplication(
          root,
          { platform: 'ios', profile: 'simulator' },
          mobileRunner(root, async () =>
            JSON.stringify([
              {
                id: 'ios-build',
                platform: 'IOS',
                buildProfile: 'simulator',
                isForIosSimulator: simulator,
                gitCommitHash: 'a'.repeat(40),
                status: 'FINISHED',
                artifacts: { buildUrl: 'https://expo.dev/artifact.tar.gz' },
                project: {
                  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                  slug: 'mobile-app',
                  ownerAccount: { name: 'fixture' },
                },
              },
            ]),
          ),
        ),
        /platform, profile or environment/,
      );
      assert.equal(
        JSON.parse(readFileSync(path.join(root, '.anhedral/mobile-build.pending.json'))).status,
        'submitting',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test('mobile child commands never inherit management or server runtime credentials', async () => {
  const root = fixture();
  const secrets = {
    NEON_API_KEY: 'private-management',
    DATABASE_URL: 'private-database',
    BETTER_AUTH_SECRET: 'private-auth',
    OPENAI_API_KEY: 'private-runtime',
  };
  const previous = Object.fromEntries(Object.keys(secrets).map((key) => [key, process.env[key]]));
  Object.assign(process.env, secrets);
  try {
    const base = mobileRunner(root, async () => {
      throw new Error('Simulated queue failure.');
    });
    const observed = [];
    await assert.rejects(
      buildMobileApplication(
        root,
        { platform: 'android', profile: 'preview' },
        async (command, args, cwd, environment) => {
          // Lifecycle uses Git for ignored-file preflight; application children must be restricted.
          if (command === 'pnpm') observed.push(environment);
          return base(command, args, cwd, environment);
        },
      ),
      /inspect the selected Expo project/,
    );
    assert.ok(observed.length > 0);
    for (const environment of observed)
      for (const key of Object.keys(secrets)) assert.equal(environment[key], undefined);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(root, { recursive: true, force: true });
  }
});
