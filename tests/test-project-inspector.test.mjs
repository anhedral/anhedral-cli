import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { inspectApplication } from '../dist/project-inspector.js';
import { parseStandardOptions } from '../dist/standard.js';
import { createSetupPlan } from '../dist/capabilities.js';
const projectId = '00000000-0000-4000-8000-000000000001';
const secret = 'private-sentinel-never-project';
function fixture() {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'anhedral-project-inspector-'));
  const save = (relative, value) => {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.writeFileSync(
      path.join(root, relative),
      typeof value === 'string' ? value : JSON.stringify(value),
    );
  };
  save('package.json', { name: 'customer-app' });
  save('apps/api/package.json', {
    name: '@app/api',
    dependencies: { '@app/db': 'workspace:*' },
    devDependencies: { '@app/types': 'workspace:*' },
  });
  save('packages/db/package.json', { name: '@app/db' });
  save('packages/types/package.json', { name: '@app/types' });
  const plan = createSetupPlan(
    parseStandardOptions('new', [root, '--hono', '--neon', '--resend', '--skip-install']),
  );
  save('anhedral.setup.json', plan);
  save('anhedral.standard.json', { schemaVersion: 1, products: plan.products, hosting: null });
  save('anhedral.project.json', {
    schemaVersion: 1,
    id: projectId,
    provider: 'cloudflare',
    ownership: 'customer',
    accountId: 'a'.repeat(32),
    audience: 'private',
    targets: [{ id: 'api', directory: 'apps/api', workerName: 'example-api' }],
  });
  save('apps/api/wrangler.jsonc', {
    d1_databases: [{ binding: 'DB', database_id: 'REPLACE_WITH_D1_ID' }],
    pipelines: [{ binding: 'EVENTS', stream: 'b'.repeat(32) }],
    queues: { producers: [{ binding: 'JOBS', queue: 'app-jobs' }] },
    durable_objects: { bindings: [{ name: 'ROOMS', class_name: 'Room' }] },
    ai: { binding: 'AI' },
    triggers: { crons: ['0 0 * * MON'] },
  });
  save('apps/api/.dev.vars.example', `DATABASE_URL=${secret}\nBETTER_AUTH_SECRET=${secret}\n`);
  return { root, save, clean: () => fs.rmSync(root, { recursive: true, force: true }) };
}
function release(state = 'deployed', overrides = {}) {
  return {
    id: `release-${state}`,
    state,
    commit: 'a'.repeat(40),
    startedAt: '2026-10-12T00:00:00.000Z',
    targets: [
      {
        target: 'api',
        versionId: 'version_1',
        providerConfirmed: true,
        urls: ['https://api.customer.com'],
      },
    ],
    ...overrides,
  };
}
function journal(save, releases) {
  save('.anhedral/releases.json', { schemaVersion: 1, projectId, releases });
}

test('inspection reports selected requirements and dependency kinds without reading credential values', () => {
  const { root, clean } = fixture();
  try {
    const result = inspectApplication(root);
    assert.equal(result.schemaVersion, 1);
    assert.equal(result.name, 'customer-app');
    assert.equal(result.selection.state, 'available');
    assert.deepEqual(result.workspaces.data.find((node) => node.name === '@app/api').dependencies, [
      { name: '@app/db', kind: 'dependencies' },
      { name: '@app/types', kind: 'devDependencies' },
    ]);
    assert.ok(
      result.setupProviders.data.some(
        (provider) => provider.id === 'neon' && provider.managementCredential === 'NEON_API_KEY',
      ),
    );
    assert.ok(
      result.setupProviders.data.every(
        (provider) =>
          provider.authentication === 'not-checked' &&
          provider.permissions === 'unknown' &&
          provider.billing === 'unknown',
      ),
    );
    assert.equal(JSON.stringify(result).includes(secret), false);
    assert.deepEqual(result.configuration.data.environment, [
      { application: 'apps/api', name: 'DATABASE_URL' },
      { application: 'apps/api', name: 'BETTER_AUTH_SECRET' },
    ]);
    const binding = result.configuration.data.bindings.find((item) => item.kind === 'Basin stream');
    assert.equal(binding.resourceId, 'b'.repeat(32));
    assert.equal(binding.configured, true);
    assert.equal(binding.identifierRequired, true);
    assert.equal(
      result.configuration.data.bindings.find((item) => item.kind === 'D1').configured,
      false,
    );
    for (const kind of ['Workers AI', 'Durable Object namespace']) {
      const declaration = result.configuration.data.bindings.find((item) => item.kind === kind);
      assert.equal(declaration.configured, true);
      assert.equal(declaration.identifierRequired, false);
      assert.equal(declaration.resourceId, null);
    }
    assert.equal(
      result.configuration.data.bindings.find((item) => item.kind === 'D1').identifierRequired,
      true,
    );
    assert.equal(result.configuration.data.schedules[0].expression, '0 0 * * MON');
  } finally {
    clean();
  }
});
test('latest failed delivery and last successful target remain independent', () => {
  const { root, save, clean } = fixture();
  try {
    journal(save, [release(), release('failed', { targets: [] })]);
    const target = inspectApplication(root).targets.data[0];
    assert.equal(target.latestAttempt.state, 'failed');
    assert.equal(target.lastSuccessful.state, 'deployed');
    assert.equal(target.liveStatus, 'unknown');
    assert.equal(target.lastSuccessful.url, 'https://api.customer.com/');
  } finally {
    clean();
  }
});
for (const targets of [
  [],
  [{ target: 'foreign', versionId: 'v1', providerConfirmed: true }],
  [
    { target: 'api', versionId: 'v1', providerConfirmed: true },
    { target: 'api', versionId: 'v2', providerConfirmed: true },
  ],
  [{ target: 'api', versionId: 'v1', providerConfirmed: false }],
]) {
  test('overall success does not establish an absent, conflicting, or unconfirmed target release', () => {
    const { root, save, clean } = fixture();
    try {
      journal(save, [release('deployed', { targets })]);
      const target = inspectApplication(root).targets.data[0];
      assert.equal(target.lastSuccessful, null);
      assert.ok(target.error);
    } finally {
      clean();
    }
  });
}
for (const startedAt of [
  '2026-10-12T00:00:00',
  '2026-02-31T00:00:00Z',
  '2026-10-12T00:00:00+99:00',
  'private diagnostic',
]) {
  test('invalid recorded time isolates release evidence and never invents freshness', () => {
    const { root, save, clean } = fixture();
    try {
      journal(save, [release('deployed', { startedAt })]);
      const result = inspectApplication(root);
      assert.ok(result.targets.data[0].error);
      assert.equal(result.targets.data[0].lastSuccessful, null);
      assert.equal(result.workspaces.state, 'available');
    } finally {
      clean();
    }
  });
}
test('missing timestamp remains unknown while valid offset time is preserved', () => {
  const { root, save, clean } = fixture();
  try {
    journal(save, [release('deployed', { startedAt: undefined })]);
    assert.equal(inspectApplication(root).targets.data[0].lastSuccessful.recordedAt, null);
    journal(save, [release('deployed', { startedAt: '2026-10-12T00:00:00+02:00' })]);
    assert.equal(
      inspectApplication(root).targets.data[0].lastSuccessful.recordedAt,
      '2026-10-12T00:00:00+02:00',
    );
  } finally {
    clean();
  }
});
test('corrupt operation and credentialed URLs cannot hide valid workspace evidence or leak values', () => {
  const { root, save, clean } = fixture();
  try {
    save('.anhedral/operation.json', { schemaVersion: 1, secret });
    journal(save, [
      release('deployed', {
        targets: [
          {
            target: 'api',
            versionId: 'v1',
            providerConfirmed: true,
            urls: [`https://user:${secret}@api.customer.com`],
          },
        ],
      }),
    ]);
    const result = inspectApplication(root);
    assert.equal(result.operation.state, 'unavailable');
    assert.ok(result.targets.data[0].error);
    assert.equal(result.workspaces.state, 'available');
    assert.equal(JSON.stringify(result).includes(secret), false);
  } finally {
    clean();
  }
});
test('unknown-scope older mobile success is history rather than current target acceptance', () => {
  const { root, save, clean } = fixture();
  try {
    save('apps/mobile/package.json', { name: '@app/mobile' });
    save('apps/mobile/app.json', {
      expo: { owner: 'customer', slug: 'app', extra: { eas: { projectId } } },
    });
    save('.anhedral/mobile-build.json', {
      schemaVersion: 1,
      state: 'built',
      platform: 'android',
      profile: 'preview',
      buildId: 'build_1',
      commit: 'a'.repeat(40),
      artifact: 'apk',
      downloadUrl: `https://downloads.example.com/file?token=${secret}`,
    });
    const result = inspectApplication(root);
    const target = result.targets.data.find((item) => item.id === 'expo:android');
    assert.equal(target.lastSuccessful, null);
    assert.equal(target.latestAttempt.state, 'identity-unknown');
    assert.ok(target.error);
    assert.equal(JSON.stringify(result).includes(secret), false);
  } finally {
    clean();
  }
});
test('source symlinks and oversized files are isolated without loading private targets', () => {
  const { root, save, clean } = fixture();
  try {
    const outside = fs.mkdtempSync(path.join(tmpdir(), 'anhedral-inspector-external-'));
    try {
      fs.writeFileSync(path.join(outside, 'secret'), secret);
      fs.rmSync(path.join(root, 'anhedral.setup.json'));
      fs.symlinkSync(path.join(outside, 'secret'), path.join(root, 'anhedral.setup.json'));
      save('.anhedral/releases.json', 'x'.repeat(256 * 1024 + 1));
      const result = inspectApplication(root);
      assert.equal(result.selection.state, 'unavailable');
      assert.equal(result.workspaces.state, 'available');
      assert.ok(result.targets.data[0].error);
      assert.equal(JSON.stringify(result).includes(secret), false);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  } finally {
    clean();
  }
});

test('partial Cloudflare failure preserves deployment acknowledged for an earlier target', () => {
  const { root, save, clean } = fixture();
  try {
    save('apps/web/package.json', { name: '@app/web' });
    const project = JSON.parse(fs.readFileSync(path.join(root, 'anhedral.project.json')));
    project.targets.push({ id: 'web', directory: 'apps/web', workerName: 'example-web' });
    save('anhedral.project.json', project);
    journal(save, [release('failed')]);
    const targets = inspectApplication(root).targets.data;
    const api = targets.find((target) => target.id === 'cloudflare:api');
    const web = targets.find((target) => target.id === 'cloudflare:web');
    assert.equal(api.lastSuccessful.state, 'deployed');
    assert.equal(api.latestAttempt.operationState, 'failed');
    assert.equal(web.lastSuccessful, null);
    assert.equal(web.latestAttempt.state, 'failed');
  } finally {
    clean();
  }
});

test('Basin stream identifier is configured only from the actual stream field', () => {
  const { root, save, clean } = fixture();
  try {
    save('apps/api/wrangler.jsonc', {
      pipelines: [
        {
          binding: 'EVENTS',
          stream: 'REPLACE_WITH_BASIN_STREAM_ID',
          pipeline: 'legacy_not_a_stream_identity',
        },
      ],
    });
    let binding = inspectApplication(root).configuration.data.bindings[0];
    assert.equal(binding.identifierRequired, true);
    assert.equal(binding.configured, false);
    assert.equal(binding.resourceId, null);
    save('apps/api/wrangler.jsonc', { pipelines: [{ binding: 'EVENTS', stream: 'c'.repeat(32) }] });
    binding = inspectApplication(root).configuration.data.bindings[0];
    assert.equal(binding.configured, true);
    assert.equal(binding.resourceId, 'c'.repeat(32));
  } finally {
    clean();
  }
});

test('Void inspector resolves recorded binding identities without ignoring authored changes', () => {
  const { root, save, clean } = fixture();
  const declaration = {
    name: 'example-api',
    d1_databases: [
      { binding: 'DB', database_name: 'shared-db', database_id: 'REPLACE_WITH_D1_ID' },
    ],
    kv_namespaces: [{ binding: 'CACHE', id: 'REPLACE_WITH_KV_ID' }],
  };
  const source = {
    name: 'example-api',
    d1_databases: [{ binding: 'DB', database_name: 'shared-db' }],
    kv_namespaces: [{ binding: 'CACHE' }],
  };
  const resolved = {
    ...source,
    d1_databases: [{ ...source.d1_databases[0], database_id: 'recorded-db' }],
    kv_namespaces: [{ binding: 'CACHE', id: 'recorded-kv' }],
  };
  try {
    save('apps/api/anhedral.cloudflare.json', declaration);
    save('apps/api/void.lock.json', { version: 1, source, resolved, text: JSON.stringify(source) });
    let result = inspectApplication(root);
    assert.equal(result.configuration.state, 'available');
    assert.equal(
      result.configuration.data.bindings.find((binding) => binding.kind === 'D1').resourceId,
      'recorded-db',
    );
    assert.equal(
      result.configuration.data.bindings.find((binding) => binding.kind === 'KV').resourceId,
      'recorded-kv',
    );
    declaration.d1_databases[0].database_id = 'new-authored-db';
    save('apps/api/anhedral.cloudflare.json', declaration);
    result = inspectApplication(root);
    assert.equal(
      result.configuration.data.bindings.find((binding) => binding.kind === 'D1').resourceId,
      'new-authored-db',
    );
    save('apps/api/void.lock.json', { version: 999, source, resolved, text: secret });
    result = inspectApplication(root);
    assert.equal(result.configuration.state, 'unavailable');
    assert.ok(!JSON.stringify(result).includes(secret));
  } finally {
    clean();
  }
});
