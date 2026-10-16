import { writeProjectSection } from '../dist/project-config.js';
import { serviceOperation } from '../dist/service-operations.js';
import { runServiceCommand } from '../dist/services-command.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveService } from '../dist/service-descriptor.js';
import {
  observeService,
  browseServiceData,
  listServiceTables,
  readServiceMetrics,
} from '../dist/service-readers.js';
import { ServiceDeletionStore, assertNoDeletedServices } from '../dist/service-deletion.js';
import { CloudflareRequestError } from '../dist/cloudflare.js';
import { ProjectStore } from '../dist/project-catalog.js';
import { registerGeneratedProject } from '../dist/catalog-registration.js';
async function fixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-service-contract-'));
  const save = (file, value) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true, mode: 0o700 });
    writeFileSync(path.join(root, file), JSON.stringify(value));
  };
  save('package.json', { name: 'service-fixture' });
  save('apps/api/package.json', { name: 'api' });
  save('apps/api/wrangler.jsonc', {
    name: 'fixture-api',
    d1_databases: [{ binding: 'DB', database_id: 'database-id', database_name: 'fixture-data' }],
  });
  const projectId = '00000000-0000-4000-8000-000000000001';
  writeProjectSection(root, 'cloudflare', {
    schemaVersion: 1,
    id: projectId,
    name: 'fixture',
    ownership: 'customer',
    provider: 'cloudflare',
    deliveryEngine: 'wrangler',
    accountId: 'a'.repeat(32),
    audience: 'public',
    targets: [{ id: 'api', directory: 'apps/api', workerName: 'fixture-api' }],
  });
  save('.anhedral/resources.json', {
    schemaVersion: 1,
    projectId,
    accountId: 'a'.repeat(32),
    checkedAt: '2026-10-14T00:00:00.000Z',
    resources: [{ kind: 'd1', name: 'fixture-data', id: 'database-id', reused: false }],
  });
  const key = 'binding:apps/api:D1:DB';
  const calls = [];
  let deleted = false;
  const request = async (method, endpoint, body) => {
    calls.push({ method, endpoint, body });
    if (endpoint.startsWith('/workers/scripts?')) return { result: [{ id: 'fixture-api' }] };
    if (endpoint.endsWith('/settings'))
      return { result: { bindings: [{ type: 'd1', id: 'database-id' }] } };
    if (method === 'DELETE') {
      deleted = true;
      return { result: null };
    }
    if (deleted) throw new CloudflareRequestError('Not found', 404);
    return { result: { uuid: 'database-id', name: 'fixture-data' } };
  };
  try {
    await run({ root, save, key, request, calls, service: resolveService(root, key) });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test('automatic registration reuses one catalog identity and never rolls back source on a busy catalog', async () =>
  fixture(({ root }) => {
    const directory = path.join(root, 'catalog');
    const first = registerGeneratedProject(root, { ANHEDRAL_PLUGIN_DATA: directory });
    const second = registerGeneratedProject(root, { ANHEDRAL_PLUGIN_DATA: directory });
    assert.equal(first.state, 'registered');
    assert.equal(first.id, second.id);
    writeFileSync(path.join(directory, 'projects.lock'), 'busy');
    assert.equal(
      registerGeneratedProject(root, { ANHEDRAL_PLUGIN_DATA: directory }).state,
      'pending',
    );
    assert.equal(JSON.parse(readFileSync(path.join(root, 'package.json'))).name, 'service-fixture');
    assert.equal(new ProjectStore(directory).snapshot().projects.length, 1);
  }));
test('live status requires matching identity and distinguishes 403/404 without provider diagnostic leakage', async () =>
  fixture(async ({ service, request }) => {
    assert.equal((await observeService(service, request)).state, 'available');
    for (const [status, state] of [
      [403, 'permission-required'],
      [404, 'not-found'],
      [429, 'unavailable'],
    ]) {
      const result = await observeService(service, async () => {
        throw new CloudflareRequestError('secret-token', status);
      });
      assert.equal(result.state, state);
      assert.doesNotMatch(JSON.stringify(result), /secret-token/);
    }
    assert.equal(
      (
        await observeService(service, async () => ({
          result: { uuid: 'foreign-id', name: 'fixture-data' },
        }))
      ).state,
      'unavailable',
    );
  }));
test('D1 browsing uses bounded SQL, validates schema identifiers, and masks private fields', async () =>
  fixture(async ({ service }) => {
    const calls = [];
    const query = async (method, endpoint, body) => {
      calls.push({ method, endpoint, body });
      return {
        result: [
          {
            success: true,
            meta: { changes: 0, changed_db: false },
            results: body.sql.includes('sqlite_schema')
              ? [{ name: 'notes' }]
              : body.sql.startsWith('PRAGMA')
                ? [{ name: 'id' }, { name: 'email' }, { name: 'text' }]
                : [{ id: 1, email: 'secret@example.com', text: 'sk_test_secret' }],
          },
        ],
      };
    };
    const data = await browseServiceData(service, query, 'notes');
    assert.equal(data.masked, true);
    assert.deepEqual(data.rows, [[1, '[masked]', '[masked]']]);
    assert.deepEqual(calls.at(-1).body.params, [26, 0]);
    assert.match(calls.at(-1).body.sql, /'\[masked\]' AS \"email\"/);
    assert.match(calls.at(-1).body.sql, /ORDER BY 1, 2, 3/);
    assert.doesNotMatch(calls.at(-1).body.sql, /SELECT \*/);
    await assert.rejects(browseServiceData(service, query, 'notes;DELETE'), /existing supported/);
    await assert.rejects(browseServiceData(service, query, 'notes', -1), /bounded/);
    await assert.rejects(
      listServiceTables(service, async () => ({
        result: [{ success: true, meta: { changed_db: true }, results: [] }],
      })),
      /safely/,
    );
  }));
test('analytics verifies selected resource, uses complete UTC days, and never invents empty results', async () =>
  fixture(async ({ service }) => {
    let variables;
    const metrics = await readServiceMetrics(
      service,
      async (_method, _endpoint, body) => {
        variables = body.variables;
        return {
          result: {
            viewer: {
              accounts: [
                {
                  d1AnalyticsAdaptiveGroups: [
                    {
                      dimensions: { date: body.variables.start, databaseId: service.id },
                      sum: { readQueries: 4, writeQueries: 2 },
                    },
                  ],
                },
              ],
            },
          },
        };
      },
      24,
    );
    assert.equal(metrics.points[0].values.readQueries, 4);
    assert.ok(metrics.end.endsWith('T00:00:00.000Z'));
    assert.ok(variables.end < metrics.end.slice(0, 10));
    await assert.rejects(
      readServiceMetrics(service, async () => ({ result: { viewer: { accounts: [] } } })),
      /unavailable/,
    );
    await assert.rejects(
      readServiceMetrics(service, async () => ({
        result: {
          viewer: {
            accounts: [
              {
                d1AnalyticsAdaptiveGroups: [
                  {
                    dimensions: { date: variables.start, databaseId: 'foreign' },
                    sum: { readQueries: 1, writeQueries: 0 },
                  },
                ],
              },
            ],
          },
        },
      })),
      /identity/,
    );
    await assert.rejects(
      readServiceMetrics(
        service,
        async () => {
          throw new Error();
        },
        1,
      ),
      /Unsupported/,
    );
  }));
test('deletion requires exact typed name, detects drift, confirms absence and rejects replay', async () =>
  fixture(async ({ root, key, request, calls, save }) => {
    const deletions = new ServiceDeletionStore(path.join(root, 'confirmations'));
    const plan = await deletions.plan(root, key, request);
    assert.equal(
      calls.some((call) => call.method === 'DELETE'),
      false,
    );
    await assert.rejects(
      deletions.execute(root, key, plan.token, 'wrong-name', request),
      /confirmation/,
    );
    assert.equal(
      calls.some((call) => call.method === 'DELETE'),
      false,
    );
    const result = await deletions.execute(root, key, plan.token, plan.name, request);
    assert.equal(result.state, 'deleted');
    assert.equal(calls.filter((call) => call.method === 'DELETE').length, 1);
    await assert.rejects(
      deletions.execute(root, key, plan.token, plan.name, request),
      /already used/,
    );
    assert.throws(
      () => assertNoDeletedServices(root, [{ kind: 'd1', name: 'fixture-data' }]),
      /not recreated/,
    );
    save('apps/api/wrangler.jsonc', {
      name: 'fixture-api',
      d1_databases: [{ binding: 'DB', database_id: 'changed-id' }],
    });
  }));
test('resource/source drift, adoption, and remote shared references block deletion before mutation', async () =>
  fixture(async ({ root, key, request, calls, save }) => {
    const deletions = new ServiceDeletionStore(path.join(root, 'confirmations'));
    const plan = await deletions.plan(root, key, request);
    save('apps/api/wrangler.jsonc', {
      name: 'fixture-api',
      d1_databases: [{ binding: 'DB', database_id: 'different-id' }],
    });
    await assert.rejects(deletions.execute(root, key, plan.token, plan.name, request), /changed/);
    assert.equal(
      calls.some((call) => call.method === 'DELETE'),
      false,
    );
  }));
test('remote shared dependencies and uncertain provider output never produce a deleted claim', async () =>
  fixture(async ({ root, key, request, calls }) => {
    const deletions = new ServiceDeletionStore(path.join(root, 'confirmations'));
    const shared = async (method, endpoint, body) =>
      endpoint.startsWith('/workers/scripts?')
        ? { result: [{ id: 'someone-else' }] }
        : request(method, endpoint, body);
    await assert.rejects(deletions.plan(root, key, shared), /Another Worker/);
    const plan = await deletions.plan(root, key, request);
    const ambiguous = async (method, endpoint, body) =>
      method === 'DELETE'
        ? (() => {
            throw new Error('network timeout');
          })()
        : request(method, endpoint, body);
    assert.equal(
      (await deletions.execute(root, key, plan.token, plan.name, ambiguous)).state,
      'uncertain',
    );
    await assert.rejects(
      deletions.execute(root, key, plan.token, plan.name, ambiguous),
      /already used/,
    );
    assert.throws(
      () => assertNoDeletedServices(root, [{ kind: 'd1', name: 'fixture-data' }]),
      /not recreated/,
    );
    assert.equal(
      calls.some((call) => call.method === 'DELETE'),
      false,
    );
  }));

test('expired tokens cannot mutate resources and unknown dependency schemas block planning', async () =>
  fixture(async ({ root, key, request, calls }) => {
    const { createHash } = await import('node:crypto');
    const directory = path.join(root, 'confirmations');
    const deletions = new ServiceDeletionStore(directory);
    const plan = await deletions.plan(root, key, request);
    const file = path.join(
      directory,
      createHash('sha256').update(plan.token).digest('hex') + '.json',
    );
    const stored = JSON.parse(readFileSync(file));
    stored.expiresAt = 0;
    writeFileSync(file, JSON.stringify(stored));
    await assert.rejects(deletions.execute(root, key, plan.token, plan.name, request), /expired/);
    assert.equal(
      calls.some((call) => call.method === 'DELETE'),
      false,
    );
    await assert.rejects(
      deletions.plan(root, key, async (method, endpoint, body) =>
        endpoint.endsWith('/settings')
          ? { result: { bindings: [{ type: 'd1' }] } }
          : request(method, endpoint, body),
      ),
      /incomplete/,
    );
  }));

test('recreating a source directory records a new app identity and does not retarget the old catalog entry', async () =>
  fixture(({ root, save }) => {
    writeProjectSection(root, 'identity', {
      schemaVersion: 1,
      id: '00000000-0000-4000-8000-000000000011',
    });
    const store = new ProjectStore(path.join(root, 'catalog'));
    const old = store.register(root);
    writeProjectSection(root, 'identity', {
      schemaVersion: 1,
      id: '00000000-0000-4000-8000-000000000012',
    });
    const current = store.register(root);
    assert.notEqual(current, old);
    assert.throws(() => store.context(old), /unavailable/);
    assert.equal(
      store.snapshot().projects.find((project) => project.id === old).status,
      'unavailable',
    );
    assert.equal(store.context(current).directory, realpathSync(root));
  }));

test('CLI service selectors include orphan receipts and share the normalized service operation', async () =>
  fixture(async ({ root, save, service, request }) => {
    save('apps/api/wrangler.jsonc', { name: 'fixture-api' });
    const listing = await runServiceCommand(root, ['list']);
    const key = `receipt:d1:${service.id}`;
    assert.ok(listing.services.some((entry) => entry.key === key && entry.capabilities.status));
    const result = await serviceOperation(
      root,
      'status',
      key,
      {},
      { request: async () => request },
    );
    assert.equal(result.status.state, 'available');
    assert.equal(result.status.name, service.name);
  }));
