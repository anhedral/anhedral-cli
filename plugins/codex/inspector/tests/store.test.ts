import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir, hostname } from 'node:os';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ProjectStore } from '../server/store.ts';
const projectId = '00000000-0000-4000-8000-000000000001';
const cloudflareProject = {
  schemaVersion: 1,
  id: projectId,
  name: 'example-site',
  ownership: 'customer',
  provider: 'cloudflare',
  audience: 'private',
  accountId: 'a'.repeat(32),
  targets: [{ id: 'web', directory: 'apps/web', workerName: 'example-web' }],
};
function fixture(run: (value: { root: string; data: string; store: ProjectStore }) => void) {
  const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-ui-'));
  const root = path.join(directory, 'project');
  mkdirSync(root);
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'example-site' }));
  const data = path.join(directory, 'catalog');
  const store = new ProjectStore(data);
  try {
    run({ root, data, store });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
test('catalog persists display preferences and names without changing project source', () =>
  fixture(({ root, data, store }) => {
    const id = store.register(root, 'Example ProjectSummary');
    assert.equal(store.register(root), id);
    store.call('rename_project', { id, name: 'Renamed' });
    store.call('set_view', { view: 'grid' });
    const restored = new ProjectStore(data);
    assert.equal(restored.snapshot().projects[0].name, 'Renamed');
    assert.equal(restored.snapshot().preferences.view, 'grid');
    assert.equal(
      JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).name,
      'example-site',
    );
    assert.equal(restored.context(id).directory, realpathSync(root));
    restored.call('forget_project', { id });
    assert.equal(restored.snapshot().projects.length, 0);
    assert.ok(readFileSync(path.join(root, 'package.json')));
  }));
test('unknown project IDs and arbitrary filesystem arguments cannot expand catalog access', () =>
  fixture(({ store, root }) => {
    assert.throws(() => store.call('get_project', { id: '00000000-0000-4000-8000-000000000000' }));
    assert.throws(() => store.call('list_projects', { root } as never));
    assert.throws(() => store.register(root, ' '.repeat(3)));
    assert.throws(() => store.call('rename_project', { name: 'x', id: '../project' }));
  }));
test('project projection exposes environment names and recorded configuration without secret values', () =>
  fixture(({ root, store }) => {
    const id = store.register(root);
    mkdirSync(path.join(root, 'apps', 'web'), { recursive: true });
    mkdirSync(path.join(root, '.anhedral'));
    writeFileSync(path.join(root, 'anhedral.project.json'), JSON.stringify(cloudflareProject));
    writeFileSync(
      path.join(root, 'anhedral.standard.json'),
      JSON.stringify({ products: ['vinext', 'd1'] }),
    );
    writeFileSync(
      path.join(root, 'apps/web/wrangler.jsonc'),
      '{"d1_databases":[{"binding":"DB","database_id":"REPLACE_WITH_DATABASE_ID"}],"triggers":{"crons":["0 * * * *"]}}',
    );
    writeFileSync(
      path.join(root, 'apps/web/.dev.vars.example'),
      'SECRET_KEY=example-private-value\n',
    );
    writeFileSync(path.join(root, 'apps/web/.dev.vars'), 'SECRET_KEY=actual-private-value\n');
    writeFileSync(
      path.join(root, '.anhedral/releases.json'),
      JSON.stringify({
        schemaVersion: 1,
        projectId,
        releases: [
          {
            id: 'release',
            startedAt: '2026-10-11T00:00:00Z',
            state: 'deployed',
            commit: 'b'.repeat(40),
            targets: [
              {
                target: 'web',
                versionId: 'version-example',
                providerConfirmed: true,
                urls: ['https://example.com'],
              },
            ],
            failure: 'private provider diagnostic',
          },
        ],
      }),
    );
    const result = store.call('get_project', { id }).projects[0];
    assert.equal(result.inspection?.targets.data[0].lastSuccessful?.url, 'https://example.com/');
    assert.equal(result.inspection?.targets.data[0].audience, 'private');
    assert.equal(result.inspection?.configuration.data.bindings[0].configured, false);
    assert.equal(result.inspection?.configuration.data.schedules[0].expression, '0 * * * *');
    assert.equal(result.inspection?.configuration.data.environment[0].name, 'SECRET_KEY');
    assert.doesNotMatch(
      JSON.stringify(result),
      /private-value|private provider diagnostic|database_id|example-private/,
    );
  }));
test('foreign receipts and links outside a registered root become unavailable, never leaked', () =>
  fixture(({ root, data, store }) => {
    const id = store.register(root);
    mkdirSync(path.join(root, '.anhedral'));
    writeFileSync(path.join(root, 'anhedral.project.json'), JSON.stringify(cloudflareProject));
    writeFileSync(
      path.join(root, '.anhedral/releases.json'),
      '{"schemaVersion":1,"projectId":"foreign","releases":[]}',
    );
    assert.ok(store.call('get_project', { id }).projects[0].inspection?.targets.data[0].error);
    rmSync(path.join(root, '.anhedral'), { recursive: true });
    symlinkSync(data, path.join(root, 'apps'), 'dir');
    assert.equal(
      store.call('get_project', { id }).projects[0].inspection?.workspaces.state,
      'unavailable',
    );
  }));
test('invalid and oversized catalogs fail closed without returning JSON values', () =>
  fixture(({ data, store }) => {
    writeFileSync(path.join(data, 'sites.json'), '{"private-data"');
    assert.throws(() => store.snapshot(), /catalog is invalid/);
    writeFileSync(path.join(data, 'sites.json'), 'x'.repeat(1024 * 1024 + 1));
    assert.throws(() => store.snapshot(), /catalog is invalid/);
  }));
test('deployment receipt projection rejects credentialed and token-bearing URLs', () =>
  fixture(({ root, store }) => {
    const id = store.register(root);
    mkdirSync(path.join(root, '.anhedral'));
    writeFileSync(path.join(root, 'anhedral.project.json'), JSON.stringify(cloudflareProject));
    for (const url of [
      'javascript:alert(1)',
      'https://user:secret@example.com',
      'https://example.com?token=secret',
      'https://example.com#token',
      'http://example.com',
    ]) {
      writeFileSync(
        path.join(root, '.anhedral/releases.json'),
        JSON.stringify({
          schemaVersion: 1,
          projectId,
          releases: [
            {
              id: 'release',
              state: 'deployed',
              commit: 'a'.repeat(40),
              startedAt: '2026-10-11T00:00:00Z',
              targets: [
                {
                  target: 'web',
                  versionId: 'version-example',
                  providerConfirmed: true,
                  urls: [url],
                },
              ],
            },
          ],
        }),
      );
      const result = store.call('get_project', { id }).projects[0];
      assert.equal(result.inspection?.targets.data[0].lastSuccessful?.url ?? null, null);
      assert.doesNotMatch(JSON.stringify(result), /user:secret|token=secret|javascript:/);
    }
  }));

test('concurrent catalog writers fail closed and preserve the existing catalog', () =>
  fixture(({ root, data, store }) => {
    store.register(root);
    writeFileSync(path.join(data, 'sites.lock'), 'another writer');
    assert.throws(() => store.call('set_view', { view: 'grid' }), /catalog is busy/);
    assert.equal(store.snapshot().preferences.view, 'list');
    rmSync(path.join(data, 'sites.lock'));
    store.call('set_view', { view: 'grid' });
    assert.equal(store.snapshot().preferences.view, 'grid');
  }));

test('unknown operations and arguments fail before any catalog mutation', () =>
  fixture(({ store, root, data }) => {
    const id = store.register(root);
    const original = readFileSync(path.join(data, 'sites.json'));
    for (const [tool, args] of [
      ['unknown_operation', { id }],
      ['list_projects', { id }],
      ['set_view', { id, view: 'grid' }],
      ['forget_project', { id, name: 'unexpected' }],
    ] as const)
      assert.throws(() => store.call(tool as never, args as never));
    assert.deepEqual(readFileSync(path.join(data, 'sites.json')), original);
    assert.equal(store.snapshot().projects[0].id, id);
  }));

test('oversized catalog writes preserve the previous catalog', () =>
  fixture(({ store, root, data }) => {
    store.register(root);
    const original = readFileSync(path.join(data, 'sites.json'));
    const catalog = JSON.parse(original.toString());
    catalog.sites[0].root = 'x'.repeat(1024 * 1024);
    assert.throws(
      () => (store as unknown as { write(value: unknown): void }).write(catalog),
      /storage limit/,
    );
    assert.deepEqual(readFileSync(path.join(data, 'sites.json')), original);
  }));

test('invalid release evidence is isolated while missing source manifests remain unavailable', () =>
  fixture(({ store, root }) => {
    const id = store.register(root);
    mkdirSync(path.join(root, '.anhedral'));
    const project = path.join(root, 'anhedral.project.json');
    const history = path.join(root, '.anhedral/releases.json');
    writeFileSync(project, JSON.stringify(cloudflareProject));
    const release = {
      id: 'release',
      state: 'checked',
      commit: 'a'.repeat(40),
      startedAt: 'not-a-date',
      targets: [],
    };
    const save = (releases: unknown[]) =>
      writeFileSync(history, JSON.stringify({ schemaVersion: 1, projectId, releases }));
    save([release]);
    assert.ok(store.call('get_project', { id }).projects[0].inspection?.targets.data[0].error);
    release.startedAt = '2026-10-11T00:00:00Z';
    save([release, release]);
    assert.ok(store.call('get_project', { id }).projects[0].inspection?.targets.data[0].error);
    save([release]);
    assert.equal(
      store.call('get_project', { id }).projects[0].inspection?.targets.data[0].error,
      undefined,
    );
    writeFileSync(project, '{}');
    assert.ok(store.call('get_project', { id }).projects[0].inspection?.targets.data[0].error);
    rmSync(path.join(root, 'package.json'));
    assert.equal(store.call('get_project', { id }).projects[0].status, 'unavailable');
  }));

test('recorded deployment evidence cannot mask a missing source manifest', () =>
  fixture(({ store, root }) => {
    const id = store.register(root);
    mkdirSync(path.join(root, '.anhedral'));
    writeFileSync(path.join(root, 'anhedral.project.json'), JSON.stringify(cloudflareProject));
    writeFileSync(
      path.join(root, '.anhedral/releases.json'),
      JSON.stringify({
        schemaVersion: 1,
        projectId,
        releases: [
          {
            id: 'release',
            state: 'deployed',
            startedAt: '2026-10-11T00:00:00Z',
            commit: 'a'.repeat(40),
            targets: [
              {
                target: 'web',
                versionId: 'version-example',
                providerConfirmed: true,
                urls: ['https://example.com'],
              },
            ],
          },
        ],
      }),
    );
    rmSync(path.join(root, 'package.json'));
    const result = store.call('get_project', { id }).projects[0];
    assert.equal(result.status, 'unavailable');
    assert.equal(result.inspection?.targets.data[0].lastSuccessful?.id, 'release');
  }));

test('catalog errors provide actionable codes without including untrusted input', () =>
  fixture(({ store, data }) => {
    assert.throws(
      () => store.call('get_project', { id: '00000000-0000-4000-8000-000000000000' }),
      (error: unknown) => {
        assert.equal((error as { code: string }).code, 'PROJECT_NOT_FOUND');
        return true;
      },
    );
    writeFileSync(path.join(data, 'sites.json'), '{"secret":"sensitive-invalid-data"');
    assert.throws(
      () => store.snapshot(),
      (error: unknown) => {
        assert.equal((error as { code: string }).code, 'CATALOG_INVALID');
        assert.doesNotMatch(String(error), /sensitive-invalid-data/);
        return true;
      },
    );
  }));

test('explicit catalog recovery removes only a proven dead same-host lock', () =>
  fixture(({ store, data, root }) => {
    store.register(root);
    const dead = spawnSync(process.execPath, ['-e', '']);
    assert.ok(dead.pid);
    const file = path.join(data, 'sites.lock');
    writeFileSync(
      file,
      JSON.stringify({
        schemaVersion: 1,
        pid: dead.pid,
        host: hostname(),
        token: randomUUID(),
        createdAt: new Date().toISOString(),
      }),
    );
    assert.deepEqual(store.recoverCatalogLock(), { recovered: true });
    assert.deepEqual(store.recoverCatalogLock(), { recovered: false });
    store.call('set_view', { view: 'grid' });
    assert.equal(store.snapshot().preferences.view, 'grid');
  }));

for (const kind of ['live', 'foreign host', 'legacy', 'malformed'] as const)
  test(`catalog recovery preserves ${kind} lock without proof of stale ownership`, () =>
    fixture(({ store, data }) => {
      const file = path.join(data, 'sites.lock');
      const value =
        kind === 'legacy'
          ? ''
          : kind === 'malformed'
            ? 'bad private data'
            : JSON.stringify({
                schemaVersion: 1,
                pid: process.pid,
                host: kind === 'foreign host' ? 'another-host' : hostname(),
                token: randomUUID(),
                createdAt: new Date().toISOString(),
              });
      writeFileSync(file, value);
      assert.throws(() => store.recoverCatalogLock(), /catalog is busy/);
      assert.equal(readFileSync(file, 'utf8'), value);
    }));

test('dashboard projects only validated nonsecret operation progress and refuses injected fields', () =>
  fixture(({ store, root }) => {
    const id = store.register(root);
    mkdirSync(path.join(root, '.anhedral'));
    const operation = {
      schemaVersion: 1,
      id: randomUUID(),
      target: 'mixed',
      state: 'blocked',
      startedAt: '2026-10-12T00:00:00.000Z',
      updatedAt: '2026-10-12T00:01:00.000Z',
      phases: [{ name: 'cloudflare-resources', state: 'completed' }],
    };
    const file = path.join(root, '.anhedral/operation.json');
    writeFileSync(file, JSON.stringify(operation), { mode: 0o600 });
    const snapshot = store.call('get_project', { id });
    assert.deepEqual(snapshot.projects[0].inspection?.operation.data, operation);
    writeFileSync(file, JSON.stringify({ ...operation, secret: 'must-not-leak' }));
    const invalid = store.call('get_project', { id });
    assert.equal(invalid.projects[0].inspection?.operation.state, 'unavailable');
    assert.equal(JSON.stringify(invalid).includes('must-not-leak'), false);
  }));
