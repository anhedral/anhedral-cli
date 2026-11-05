import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  existsSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import { GENERATOR_VERSION } from '../dist/version.js';
import { planStackUpdate, runStackUpdate, updateDiff } from '../dist/stack-update.js';
import { ArtifactUnavailableError, resolvePublishedCliArtifact } from '../dist/release-artifact.js';
import { runStagedTransaction } from '../dist/transaction.js';

const executable = path.resolve('dist/bin.js');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const read = (root, file) => readFileSync(path.join(root, file), 'utf8');
const json = (root, file) => JSON.parse(read(root, file));
const writeJson = (root, file, value) =>
  writeFileSync(path.join(root, file), JSON.stringify(value, null, 2) + '\n');
function run(root, args) {
  return spawnSync(
    process.execPath,
    [executable, 'stack', 'update', '--offline', '--json', ...args],
    { cwd: root, encoding: 'utf8', timeout: 30000 },
  );
}
function snapshot(root) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const file = path.join(entry.parentPath, entry.name);
      return [path.relative(root, file), digest(readFileSync(file))];
    })
    .sort(([a], [b]) => a.localeCompare(b));
}
function fixture(t) {
  const base = mkdtempSync(path.join(tmpdir(), 'anhedral-stack-update-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = path.join(base, 'project');
  const initialized = spawnSync(
    process.execPath,
    [executable, 'init', root, '--skip-install', '--no-git', '--json'],
    { encoding: 'utf8', timeout: 30000 },
  );
  assert.equal(initialized.status, 0, initialized.stderr);
  const configuration = json(root, 'anhedral.json');
  configuration.setup.cliVersion = '0.18.0';
  configuration.composition.generatorVersion = '0.18.0';
  for (const file of ['scripts/oj.mjs', 'scripts/oj-runtime.json', 'scripts/OJ.LICENSE']) {
    rmSync(path.join(root, file));
    delete configuration.capabilities.managedFiles[file];
  }
  writeJson(root, 'anhedral.json', configuration);
  const pkg = json(root, 'apps/web/package.json');
  Object.assign(pkg.scripts, {
    dev: 'vite dev --host 0.0.0.0 --port 3000',
    build: 'vite build',
    preview: 'vite preview --host 0.0.0.0 --port 3000',
  });
  delete pkg.scripts.deploy;
  writeJson(root, 'apps/web/package.json', pkg);
  writeFileSync(
    path.join(root, 'pnpm-workspace.yaml'),
    '# custom workspace comment\npackages: ["apps/*","packages/*"]\nsharedWorkspaceLockfile: true\nonlyBuiltDependencies: ["esbuild","workerd"]\ncustomSetting: preserved\n',
  );
  const authored = 'export const authored = "keep this application exactly";\n';
  writeFileSync(path.join(root, 'apps/web/src/routes/customer.tsx'), authored);
  writeFileSync(path.join(root, '.env'), 'PRIVATE_TEST_SECRET=must-never-be-previewed\n');
  const rootPackage = json(root, 'package.json');
  rootPackage.scripts.preinstall = `node -e "require('fs').writeFileSync('lifecycle-ran','bad')"`;
  writeJson(root, 'package.json', rootPackage);
  return root;
}
async function publishedArtifact() {
  const revision = 'a'.repeat(40);
  const integrity = `sha512-${Buffer.alloc(64, 1).toString('base64')}`;
  return resolvePublishedCliArtifact({
    fetch: async (input) => {
      const url = String(input);
      if (url.startsWith('https://github.com/anhedral/anhedral-cli/releases/download/'))
        return Response.json({
          schemaVersion: 1,
          name: 'anhedral',
          version: GENERATOR_VERSION,
          filename: `anhedral-${GENERATOR_VERSION}.tgz`,
          sourceRevision: revision,
          integrity,
        });
      if (url === `https://registry.npmjs.org/anhedral/${GENERATOR_VERSION}`)
        return Response.json({
          name: 'anhedral',
          version: GENERATOR_VERSION,
          dist: {
            integrity,
            tarball: `https://registry.npmjs.org/anhedral/-/anhedral-${GENERATOR_VERSION}.tgz`,
          },
        });
      assert.equal(
        url,
        `https://api.github.com/repos/anhedral/anhedral-cli/git/ref/tags/v${GENERATOR_VERSION}`,
      );
      return Response.json({
        ref: `refs/tags/v${GENERATOR_VERSION}`,
        object: { type: 'commit', sha: revision },
      });
    },
  });
}
async function online(root, args, artifact) {
  let output = '';
  const previous = process.cwd();
  process.chdir(root);
  try {
    await runStackUpdate(
      ['update', ...args],
      {
        json: true,
        io: {
          out: {
            write: (value) => {
              output += value;
            },
          },
          err: { write() {} },
          stdinTTY: false,
          stdoutTTY: false,
          stderrTTY: false,
        },
      },
      { resolveArtifact: async () => artifact },
    );
    return JSON.parse(output);
  } finally {
    process.chdir(previous);
  }
}

test('offline preview is deterministic and applies the exact fenced source plan without lifecycle execution', (t) => {
  const root = fixture(t);
  const before = snapshot(root);
  const identity = json(root, 'anhedral.json').identity;
  const preview = run(root, ['--dry-run']);
  assert.equal(preview.status, 0, preview.stderr);
  const plan = JSON.parse(preview.stdout);
  assert.equal(plan.dryRun, true);
  assert.equal(plan.applied, false);
  assert.equal(plan.deployment.artifactRequired, true);
  assert.ok(plan.changes.some((change) => change.path === 'scripts/oj.mjs'));
  assert.ok(plan.changes.some((change) => change.path === 'pnpm-workspace.yaml'));
  assert.ok(
    plan.changes.every(
      (change) => change.diff.startsWith('--- ') && /^[a-f0-9]{64}$/.test(change.afterDigest),
    ),
  );
  assert.equal(preview.stdout.includes('must-never-be-previewed'), false);
  assert.deepEqual(snapshot(root), before);
  assert.equal(JSON.parse(run(root, ['--dry-run']).stdout).planId, plan.planId);
  const applied = run(root, ['--expect-plan', plan.planId]);
  assert.equal(applied.status, 0, applied.stderr);
  assert.equal(JSON.parse(applied.stdout).applied, true);
  for (const change of plan.changes)
    assert.equal(digest(read(root, change.path)), change.afterDigest);
  assert.equal(
    read(root, 'apps/web/src/routes/customer.tsx'),
    'export const authored = "keep this application exactly";\n',
  );
  assert.equal(existsSync(path.join(root, 'lifecycle-ran')), false);
  assert.equal(existsSync(path.join(root, 'node_modules')), false);
  assert.equal(existsSync(path.join(root, 'pnpm-lock.yaml')), false);
  assert.deepEqual(json(root, 'anhedral.json').identity, identity);
  assert.equal(json(root, 'anhedral.json').composition.generatorVersion, GENERATOR_VERSION);
  assert.deepEqual(json(root, 'anhedral.json').capabilities.installed, []);
  assert.deepEqual(parse(read(root, 'pnpm-workspace.yaml')).allowBuilds, {
    esbuild: true,
    workerd: true,
  });
  assert.match(
    read(root, 'pnpm-workspace.yaml'),
    /^# custom workspace comment\npackages: \["apps\/\*","packages\/\*"\]/,
  );
  assert.equal(parse(read(root, 'pnpm-workspace.yaml')).customSetting, 'preserved');
  const updated = snapshot(root);
  const repeated = run(root, []);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.deepEqual(JSON.parse(repeated.stdout).changes, []);
  assert.deepEqual(snapshot(root), updated);
});

test('online update derives a protected web-only manifest from a verified published artifact and is idempotent', async (t) => {
  const root = fixture(t);
  const artifact = await publishedArtifact();
  const before = snapshot(root);
  const plan = await online(root, ['--dry-run'], artifact);
  assert.equal(plan.deployment.artifactRequired, false);
  assert.equal(plan.deployment.provenanceReady, true);
  assert.deepEqual(snapshot(root), before);
  const applied = await online(root, ['--expect-plan', plan.planId], artifact);
  assert.equal(applied.applied, true);
  const manifest = json(root, 'deployment.json');
  assert.deepEqual(manifest.cliArtifact, { ...artifact });
  assert.equal(manifest.identity, 'none');
  assert.deepEqual(manifest.capabilities, []);
  assert.equal(manifest.intent.visibility, 'protected');
  assert.equal(manifest.intent.environment, 'preview');
  assert.deepEqual((await online(root, [], artifact)).changes, []);
  assert.throws(() => planStackUpdate(root, { ...artifact }), /verified published artifact/);
});

test('stale plan, customized launcher and customized pnpm policy preserve every source byte', (t) => {
  const root = fixture(t);
  const plan = JSON.parse(run(root, ['--dry-run']).stdout);
  const pkg = json(root, 'apps/web/package.json');
  pkg.scripts.dev = 'node customer-dev.mjs';
  writeJson(root, 'apps/web/package.json', pkg);
  writeFileSync(
    path.join(root, 'pnpm-workspace.yaml'),
    'packages: ["apps/*"]\nallowBuilds: { unreviewed: true }\n',
  );
  const before = snapshot(root);
  const stale = run(root, ['--expect-plan', plan.planId]);
  assert.notEqual(stale.status, 0);
  assert.match(stale.stderr, /plan changed/);
  const result = run(root, []);
  assert.notEqual(result.status, 0);
  assert.equal(JSON.parse(result.stdout).conflicts.length, 2);
  assert.equal(JSON.parse(result.stdout).applied, false);
  assert.deepEqual(snapshot(root), before);
});

test('symlinked owned configuration is rejected without touching external files', (t) => {
  const root = fixture(t);
  const external = path.join(path.dirname(root), 'external.yaml');
  writeFileSync(external, 'onlyBuiltDependencies: ["esbuild","workerd"]\n');
  rmSync(path.join(root, 'pnpm-workspace.yaml'));
  symlinkSync(external, path.join(root, 'pnpm-workspace.yaml'));
  const before = readFileSync(external, 'utf8');
  const result = run(root, []);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /symlink/);
  assert.equal(readFileSync(external, 'utf8'), before);
  assert.equal(json(root, 'anhedral.json').composition.generatorVersion, '0.18.0');
});

test('editor detects post-plan changes and update transactions reject recovery under the lock', async (t) => {
  const root = fixture(t);
  const { editor } = planStackUpdate(root);
  const pkg = json(root, 'apps/web/package.json');
  pkg.scripts.dev = 'node changed-after-plan.mjs';
  writeJson(root, 'apps/web/package.json', pkg);
  assert.throws(() => editor.verify(), /Source changed/);
  const journal = path.join(root, '.anhedral-journal.json');
  writeFileSync(journal, 'private interrupted evidence');
  const before = snapshot(root);
  const preview = run(root, ['--dry-run']);
  assert.notEqual(preview.status, 0);
  assert.match(preview.stdout, /RECOVERY_REQUIRED/);
  await assert.rejects(
    runStagedTransaction(root, {
      recover: false,
      commitPaths: ['new.txt'],
      build: async () => {
        assert.fail('must not build or recover');
      },
    }),
    /requires recovery/,
  );
  assert.deepEqual(snapshot(root), before);
});

test('newer source is never downgraded and private changed configuration is never printed', (t) => {
  const root = fixture(t);
  const configuration = json(root, 'anhedral.json');
  configuration.composition.generatorVersion = '999.0.0';
  writeJson(root, 'anhedral.json', configuration);
  assert.match(run(root, ['--dry-run']).stdout, /NEWER_SOURCE/);
  configuration.composition.generatorVersion = '0.18.0';
  writeJson(root, 'anhedral.json', configuration);
  const pkg = json(root, 'apps/web/package.json');
  pkg[['PRIVATE', 'API', 'KEY'].join('_')] = 'private-config-value-never-print';
  writeFileSync(path.join(root, 'apps/web/package.json'), JSON.stringify(pkg));
  const result = run(root, ['--dry-run']);
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout.includes('private-config-value-never-print'), false);
  assert.match(result.stdout, /SENSITIVE_PREVIEW/);
  assert.deepEqual(JSON.parse(result.stdout).changes, []);
});

test('preview replacement hunks reproduce exact bytes including insertion and trailing newlines', (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-update-diff-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [before, after] of [
    ['first\n', 'first\nsecond\n'],
    ['first', 'first\n'],
    ['first\n', 'first'],
    ['one\ntwo\nthree\n', 'new\ntwo\nthree\n'],
  ]) {
    writeFileSync(path.join(root, 'owned.txt'), before);
    const patch = path.join(root, 'change.patch');
    writeFileSync(patch, updateDiff('owned.txt', before, after));
    const applied = spawnSync('git', ['apply', '--unidiff-zero', patch], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(applied.status, 0, applied.stderr);
    assert.equal(read(root, 'owned.txt'), after);
  }
});

test('canonical CSS URL adapter upgrades inside an authored root without rewriting application markup', (t) => {
  const root = fixture(t);
  const file = path.join(root, 'apps/web/src/routes/__root.tsx');
  const authored = readFileSync(file, 'utf8')
    .replace("import '../styles.css';", "import styles from '../styles.css?url';")
    .replace('    ],\n  }),', "    ],\n    links: [{ rel: 'stylesheet', href: styles }],\n  }),")
    .replace('Anhedral web application', 'Authored customer description')
    .replace('<html lang="en">', '<html lang="en" className="authored-dark">');
  writeFileSync(file, authored);
  const expected = authored
    .replace("import styles from '../styles.css?url';", "import '../styles.css';")
    .replace("    links: [{ rel: 'stylesheet', href: styles }],\n", '');
  const result = run(root, []);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(file, 'utf8'), expected);
  assert.equal(
    json(root, 'anhedral.json').capabilities.managedFiles['apps/web/src/routes/__root.tsx'],
    undefined,
  );
});

test('additional stylesheet URL uses fail closed and preserve the authored root', (t) => {
  const root = fixture(t);
  const file = path.join(root, 'apps/web/src/routes/__root.tsx');
  const authored =
    readFileSync(file, 'utf8')
      .replace("import '../styles.css';", "import styles from '../styles.css?url';")
      .replace(
        '    ],\n  }),',
        "    ],\n    links: [{ rel: 'stylesheet', href: styles }],\n  }),",
      ) + '\nexport const customerStyles = styles;\n';
  writeFileSync(file, authored);
  const before = snapshot(root);
  const result = run(root, []);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /additional uses/);
  assert.deepEqual(snapshot(root), before);
});

test('existing deployment intent is preserved while only verified artifact provenance changes', async (t) => {
  const root = fixture(t);
  const artifact = await publishedArtifact();
  const manifest = {
    contractVersion: 1,
    foundation: 'tanstack-start',
    capabilities: [],
    identity: 'none',
    cliArtifact: { ...artifact, version: '0.18.0', sourceRevision: 'b'.repeat(40) },
    intent: {
      contractVersion: 1,
      runtimeProfile: 'anhedral-stack',
      environment: 'production',
      visibility: 'public',
    },
  };
  writeJson(root, 'deployment.json', manifest);
  const result = await online(root, [], artifact);
  assert.equal(result.applied, true);
  assert.deepEqual(json(root, 'deployment.json').intent, manifest.intent);
  assert.deepEqual(json(root, 'deployment.json').cliArtifact, { ...artifact });
  const conflicting = {
    ...manifest,
    capabilities: ['hono', 'database-auth'],
    identity: 'better-auth-d1-v1',
  };
  writeJson(root, 'deployment.json', conflicting);
  const before = snapshot(root);
  const rejected = run(root, []);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stdout, /identity or capabilities disagree/);
  assert.deepEqual(snapshot(root), before);
});

test('human preview strips OSC and control bytes while JSON binds exact authored source', (t) => {
  const root = fixture(t);
  const file = path.join(root, 'apps/web/src/routes/__root.tsx');
  const control = '\u001b]52;c;untrusted-clipboard\u0007\u0001\rspoofed-terminal';
  const authored = readFileSync(file, 'utf8')
    .replace("import '../styles.css';", "import styles from '../styles.css?url';")
    .replace('    ],\n  }),', "    ],\n    links: [{ rel: 'stylesheet', href: styles }],\n  }),")
    .replace('Anhedral web application', `Authored ${control}`);
  writeFileSync(file, authored);
  const preview = run(root, ['--dry-run']);
  assert.equal(preview.status, 0, preview.stderr);
  assert.ok(JSON.parse(preview.stdout).changes.some((change) => change.diff.includes(control)));
  const human = spawnSync(
    process.execPath,
    [executable, 'stack', '--offline', '--dry-run', 'update', '--human'],
    { cwd: root, encoding: 'utf8', timeout: 30000 },
  );
  assert.equal(human.status, 0, human.stderr);
  assert.doesNotMatch(human.stdout, /[\u001b\u0007\u0001\r]/);
  assert.equal(readFileSync(file, 'utf8'), authored);
});

test('YAML anchor references cannot be broken by removing a build-policy definition', (t) => {
  const root = fixture(t);
  writeFileSync(
    path.join(root, 'pnpm-workspace.yaml'),
    'packages: ["apps/*"]\nonlyBuiltDependencies: &reviewed ["esbuild", "workerd"]\ncustomerList: *reviewed\n',
  );
  const before = snapshot(root);
  const result = run(root, []);
  assert.notEqual(result.status, 0);
  assert.deepEqual(snapshot(root), before);
});

test('offline mode performs no artifact lookup and failed official resolution cannot mutate source', async (t) => {
  const root = fixture(t);
  const before = snapshot(root);
  const original = process.cwd();
  process.chdir(root);
  const output = {
    json: true,
    io: {
      out: { write() {} },
      err: { write() {} },
      stdinTTY: false,
      stdoutTTY: false,
      stderrTTY: false,
    },
  };
  try {
    await runStackUpdate(['update', '--offline', '--dry-run'], output, {
      resolveArtifact: async () => {
        assert.fail('offline must not resolve an artifact');
      },
    });
    await assert.rejects(
      runStackUpdate(['update', '--dry-run'], output, {
        resolveArtifact: async () => {
          throw new ArtifactUnavailableError();
        },
      }),
      (error) =>
        error.code === 'ARTIFACT_UNAVAILABLE' &&
        error.category === 'network' &&
        error.retryable === true,
    );
  } finally {
    process.chdir(original);
  }
  assert.deepEqual(snapshot(root), before);
});

test('oversized update previews fail closed without dumping or truncating project content', (t) => {
  const root = fixture(t);
  const pkg = json(root, 'apps/web/package.json');
  pkg.customerContent = 'x'.repeat(256 * 1024);
  writeJson(root, 'apps/web/package.json', pkg);
  const before = snapshot(root);
  const result = run(root, ['--dry-run']);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /PREVIEW_LIMIT/);
  assert.deepEqual(JSON.parse(result.stdout).changes, []);
  assert.ok(result.stdout.length < 10000);
  assert.deepEqual(snapshot(root), before);
});
