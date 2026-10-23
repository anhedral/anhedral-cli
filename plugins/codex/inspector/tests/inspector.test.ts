import { readProjectSection, writeProjectSection } from '../../../../src/project-config.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { inspectApplication } from '../../../../src/project-inspector.ts';
import { inspectionSchema } from '../shared/schema.ts';
import { projectDraftMessage } from '../shared/starter.ts';

test('inspector workflow requests remain unsent drafts in the current conversation', () => {
  for (const request of [
    'Explain the recorded stack and propose the next development step.',
    'Guide provider authentication for this project.',
    'Review deployment prerequisites before shipping.',
    'Inspect the interrupted operation and propose safe recovery.',
  ]) {
    const message = projectDraftMessage(request);
    assert.deepEqual(message._meta['openai/message'], { target: 'active', send: false });
    assert.deepEqual(message.content, [{ type: 'text', text: request }]);
  }
});

const cloudflareId = '00000000-0000-4000-8000-000000000001';
const vercelId = '00000000-0000-4000-8000-000000000002';
const timestamp = '2026-10-12T00:00:00.000Z';
function fixture(run: (root: string, save: (file: string, value: unknown) => void) => void) {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'anhedral-inspector-contract-'));
  const save = (file: string, value: unknown) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), JSON.stringify(value));
  };
  save('package.json', { name: 'mixed-application' });
  save('apps/api/package.json', { name: '@example/api' });
  save('apps/web/package.json', { name: '@example/web' });
  writeProjectSection(root, 'standard', {
    schemaVersion: 1,
    products: ['expo', 'hono', 'd1', 'r2', 'better-auth', 'styling'],
    hosting: 'cloudflare',
  });
  writeProjectSection(root, 'cloudflare', {
    schemaVersion: 1,
    id: cloudflareId,
    name: 'mixed-application',
    ownership: 'customer',
    provider: 'cloudflare',
    deliveryEngine: 'wrangler',
    accountId: 'a'.repeat(32),
    audience: 'public',
    targets: [{ id: 'api', directory: 'apps/api', workerName: 'example-api' }],
  });
  save('.anhedral/releases.json', {
    schemaVersion: 1,
    projectId: cloudflareId,
    releases: [
      {
        id: 'cf-success',
        commit: 'a'.repeat(40),
        startedAt: timestamp,
        state: 'deployed',
        targets: [
          {
            target: 'api',
            versionId: 'v1',
            urls: ['https://api.example.com'],
            providerConfirmed: true,
          },
        ],
      },
      {
        id: 'cf-failure',
        commit: 'b'.repeat(40),
        startedAt: '2026-10-12T01:00:00.000Z',
        state: 'failed',
        targets: [],
      },
    ],
  });
  try {
    run(root, save);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('Cloudflare delivery preserves independent latest attempt and last success without live claims', () =>
  fixture((root) => {
    const result = inspectApplication(root);
    assert.deepEqual(inspectionSchema.parse(result), result);
    const api = result.targets.data.find((target) => target.provider === 'cloudflare');
    assert.equal(api?.latestAttempt?.id, 'cf-failure');
    assert.equal(api?.lastSuccessful?.id, 'cf-success');
    assert.equal(api?.lastSuccessful?.url, 'https://api.example.com/');
    assert.equal(api?.liveStatus, 'unknown');
    assert.equal(result.authentication.state, 'not-checked');
  }));

test('foreign Cloudflare journal isolates its error while retaining workspace evidence', () =>
  fixture((root, save) => {
    save('.anhedral/releases.json', { schemaVersion: 1, projectId: vercelId, releases: [] });
    const result = inspectApplication(root);
    assert.deepEqual(inspectionSchema.parse(result), result);
    assert.equal(result.workspaces.state, 'available');
    const api = result.targets.data.find((target) => target.provider === 'cloudflare');
    assert.ok(api?.error);
    assert.equal(api?.lastSuccessful, null);
  }));

test('an overall deployment receipt cannot prove success for an unrecorded Cloudflare target', () =>
  fixture((root, save) => {
    const manifest = readProjectSection<any>(root, 'cloudflare');
    manifest.targets.push({ id: 'worker', directory: 'apps/worker', workerName: 'example-worker' });
    writeProjectSection(root, 'cloudflare', manifest);
    save('apps/worker/package.json', { name: '@example/worker' });
    const result = inspectApplication(root);
    assert.deepEqual(inspectionSchema.parse(result), result);
    const worker = result.targets.data.find((target) => target.id === 'cloudflare:worker');
    assert.ok(worker);
    assert.equal(worker.lastSuccessful, null);
  }));

test('foreign mobile receipts never become successful artifact evidence', () =>
  fixture((root, save) => {
    save('apps/mobile/package.json', { name: '@example/mobile' });
    save('apps/mobile/app.json', { expo: { extra: { eas: { projectId: cloudflareId } } } });
    save('.anhedral/mobile-build.json', {
      schemaVersion: 1,
      state: 'built',
      projectId: vercelId,
      platform: 'android',
      profile: 'preview',
      commit: 'c'.repeat(40),
      buildId: 'build-example',
      recordedAt: timestamp,
      buildPageUrl: 'https://expo.dev/builds/build-example',
      artifact: 'apk',
      downloadUrl: 'https://expo.dev/artifacts/example.apk',
    });
    const result = inspectApplication(root);
    assert.deepEqual(inspectionSchema.parse(result), result);
    const mobile = result.targets.data.find((target) => target.id === 'expo:android');
    assert.ok(mobile?.error);
    assert.equal(mobile?.lastSuccessful, null);
    assert.equal(
      result.targets.data.find((target) => target.provider === 'cloudflare')?.lastSuccessful?.id,
      'cf-success',
    );
  }));

test('valid mobile build records preserve safe artifact evidence separately from store delivery', () =>
  fixture((root, save) => {
    save('apps/mobile/package.json', { name: '@example/mobile' });
    save('apps/mobile/app.json', { expo: { extra: { eas: { projectId: cloudflareId } } } });
    save('.anhedral/mobile-build.json', {
      schemaVersion: 1,
      state: 'built',
      projectId: cloudflareId,
      platform: 'android',
      profile: 'preview',
      commit: 'c'.repeat(40),
      buildId: 'build-example',
      recordedAt: timestamp,
      buildPageUrl: 'https://expo.dev/builds/build-example',
      artifact: 'apk',
      downloadUrl: 'https://expo.dev/artifacts/example.apk',
    });
    const result = inspectApplication(root);
    assert.deepEqual(inspectionSchema.parse(result), result);
    const mobile = result.targets.data.find((target) => target.id === 'expo:android');
    assert.equal(mobile?.error, undefined);
    assert.equal(mobile?.lastSuccessful?.id, 'build-example');
    assert.equal(mobile?.lastSuccessful?.artifact, 'apk');
    assert.equal(mobile?.delivery, 'artifact-only');
    assert.equal(mobile?.liveStatus, 'unknown');
  }));

test('inspection never opens private credential files, mutates files, or contacts a provider', () =>
  fixture((root, save) => {
    for (const file of [
      '.anhedral/provider-credentials.json',
      '.anhedral/runtime.json',
      'apps/api/.dev.vars',
      'apps/web/.env.local',
    ])
      save(file, { secret: 'private-sentinel-do-not-open' });
    save('.anhedral/providers.json', {
      schemaVersion: 1,
      providers: {
        neon: {
          config: 'd'.repeat(64),
          operations: {
            ['e'.repeat(64)]: {
              status: 'complete',
              value: { id: 'project_example', token: 'legacy-private-token' },
            },
          },
        },
      },
    });
    const attempts: string[] = [];
    const originalOpen = fs.openSync;
    const originalRead = fs.readFileSync;
    const originalFetch = globalThis.fetch;
    const mutations = ['writeFileSync', 'mkdirSync', 'renameSync', 'rmSync', 'unlinkSync'] as const;
    const originals = Object.fromEntries(mutations.map((key) => [key, fs[key]]));
    const sensitive = (file: unknown) =>
      typeof file === 'string' &&
      /(?:provider-credentials\.json|runtime\.json|\.dev\.vars|\.env\.local)$/.test(file);
    fs.openSync = ((file: unknown, ...args: unknown[]) => {
      if (sensitive(file)) {
        attempts.push(String(file));
        throw new Error('Secret read forbidden');
      }
      return Reflect.apply(originalOpen, fs, [file, ...args]);
    }) as typeof fs.openSync;
    fs.readFileSync = ((file: unknown, ...args: unknown[]) => {
      if (sensitive(file)) {
        attempts.push(String(file));
        throw new Error('Secret read forbidden');
      }
      return Reflect.apply(originalRead, fs, [file, ...args]);
    }) as typeof fs.readFileSync;
    for (const key of mutations)
      (fs as unknown as Record<string, unknown>)[key] = () => {
        attempts.push(key);
        throw new Error('Inspection mutation forbidden');
      };
    globalThis.fetch = (() => {
      attempts.push('fetch');
      throw new Error('Provider call forbidden');
    }) as typeof fetch;
    syncBuiltinESMExports();
    try {
      const result = inspectApplication(root);
      assert.deepEqual(inspectionSchema.parse(result), result);
      assert.deepEqual(attempts, []);
      assert.doesNotMatch(JSON.stringify(result), /private-sentinel|legacy-private-token/);
    } finally {
      fs.openSync = originalOpen;
      fs.readFileSync = originalRead;
      for (const key of mutations) (fs as unknown as Record<string, unknown>)[key] = originals[key];
      globalThis.fetch = originalFetch;
      syncBuiltinESMExports();
    }
  }));

test('malformed consolidated hosting sections preserve independent valid evidence', () =>
  fixture((root) => {
    writeProjectSection(root, 'cloudflare', { schemaVersion: 999 });
    const result = inspectApplication(root);
    assert.ok(result.targets.data.find((target) => target.id === 'cloudflare:unavailable')?.error);
    assert.equal(result.workspaces.state, 'available');
  }));

test('unknown consolidated envelope schemas refuse metadata without hiding workspace evidence', () =>
  fixture((root) => {
    const file = path.join(root, 'anhedral.json');
    const configuration = JSON.parse(fs.readFileSync(file, 'utf8'));
    configuration.schemaVersion = 999;
    fs.writeFileSync(file, JSON.stringify(configuration));
    const result = inspectApplication(root);
    assert.equal(result.selection.state, 'unavailable');
    assert.ok(result.targets.data.every((target) => target.error));
    assert.equal(result.workspaces.state, 'available');
  }));
