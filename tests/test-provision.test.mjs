import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parse } from 'jsonc-parser';
import { registerApplication, connectApplication } from '../dist/delivery.js';
import {
  planProvisioning,
  provisionApplication,
  inspectApplicationResources,
} from '../dist/provision.js';
import { reconcileAccess } from '../dist/access.js';
import { listCloudflare, cloudflareRequest } from '../dist/cloudflare.js';
const account = 'a'.repeat(32);

test('Basin creates private JSON streams, resolves bindings and refuses public ingestion during reconciliation', async () => {
  const root = fixture({
    pipelines: [{ binding: 'ANALYTICS', stream: 'REPLACE_WITH_BASIN_STREAM_ID' }],
  });
  const id = 'b'.repeat(32);
  let created;
  const request = async (method, endpoint, body) => {
    if (method === 'POST') {
      created = { id, ...body };
      return { result: created };
    }
    if (endpoint.split('?')[0] === '/pipelines/v1/streams')
      return { result: created ? [created] : [] };
    return { result: created };
  };
  try {
    await connectApplication(root, account, 'public', run);
    const first = await provisionApplication(root, false, run, request);
    assert.equal(first.resources[0].kind, 'stream');
    assert.deepEqual(created.http, { enabled: false, authentication: true });
    assert.deepEqual(created.worker_binding, { enabled: true });
    assert.equal(
      parse(readFileSync(path.join(root, 'apps/web/wrangler.jsonc'), 'utf8')).pipelines[0].stream,
      id,
    );
    await provisionApplication(root, false, run, request);
    created.http.enabled = true;
    await assert.rejects(inspectApplicationResources(root, request), /private Worker binding/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
function fixture(config = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-resource-test-'));
  mkdirSync(path.join(root, 'apps/web'), { recursive: true });
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'example' }));
  writeFileSync(path.join(root, 'anhedral.setup.json'), JSON.stringify({ hosting: 'cloudflare' }));
  writeFileSync(
    path.join(root, 'apps/web/package.json'),
    JSON.stringify({ scripts: { deploy: 'wrangler deploy' } }),
  );
  writeFileSync(
    path.join(root, 'apps/web/wrangler.jsonc'),
    '// Preserve this comment\n' + JSON.stringify({ name: 'example-web', ...config }, null, 2),
  );
  registerApplication(root);
  return root;
}
const run = async () => JSON.stringify({ loggedIn: true, accounts: [{ id: account }] });
function provider({ publicBucket = false, failQueue = false } = {}) {
  const calls = [];
  const resources = new Map();
  const request = async (method, endpoint, body) => {
    calls.push({ method, endpoint, body });
    const route = endpoint.split('?')[0];
    if (route.endsWith('/domains/managed')) return { result: { enabled: publicBucket } };
    if (route.endsWith('/domains/custom')) return { result: { domains: [] } };
    if (!resources.has(route)) resources.set(route, []);
    if (method === 'GET')
      return {
        result: route === '/r2/buckets' ? { buckets: resources.get(route) } : resources.get(route),
        result_info: { total_pages: 1 },
      };
    if (route === '/queues' && failQueue) throw new Error('Queue permission denied');
    const item =
      route === '/d1/database'
        ? { name: body.name, uuid: 'd1-id' }
        : route === '/storage/kv/namespaces'
          ? { title: body.title, id: 'kv-id' }
          : route === '/queues'
            ? { queue_name: body.queue_name, queue_id: 'queue-id' }
            : { name: body.name };
    resources.get(route).push(item);
    return { result: item };
  };
  return { request, calls, resources };
}
const config = {
  d1_databases: [{ binding: 'DB', database_name: 'example-db', database_id: 'REPLACE_WITH_D1_ID' }],
  kv_namespaces: [{ binding: 'CONFIG', id: 'REPLACE_WITH_KV_ID' }],
  r2_buckets: [{ binding: 'FILES', bucket_name: 'example-files' }],
  queues: {
    producers: [{ queue: 'example-jobs', binding: 'JOBS' }],
    consumers: [{ queue: 'example-jobs', dead_letter_queue: 'example-jobs-dlq' }],
  },
};
test('resource plans are read-only and provisioning is idempotent with comment-preserving binding updates', async () => {
  const root = fixture(config);
  try {
    assert.equal(planProvisioning(root).resources.length, 6);
    assert.equal(existsSync(path.join(root, '.anhedral')), false);
    await connectApplication(root, account, 'public', run);
    const api = provider();
    const first = await provisionApplication(root, false, run, api.request);
    assert.equal(first.resources.length, 5);
    assert.equal(first.state, 'reconciled');
    const file = readFileSync(path.join(root, 'apps/web/wrangler.jsonc'), 'utf8');
    assert.ok(file.startsWith('// Preserve this comment'));
    assert.equal(parse(file).d1_databases[0].database_id, 'd1-id');
    assert.equal(parse(file).kv_namespaces[0].id, 'kv-id');
    const before = api.calls.filter((call) => call.method === 'POST').length;
    const second = await provisionApplication(root, false, run, api.request);
    assert.ok(second.resources.every((item) => item.reused));
    assert.ok(
      second.resources.every((item) => item.createdByProject),
      'Creation ownership survives idempotent provisioning retries',
    );
    assert.equal(api.calls.filter((call) => call.method === 'POST').length, before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('resource failure preserves created identities and unsafe storage is rejected', async () => {
  for (const options of [{ publicBucket: true }, { failQueue: true }]) {
    const root = fixture(config);
    try {
      await connectApplication(root, account, 'public', run);
      const api = provider(options);
      await assert.rejects(
        provisionApplication(root, false, run, api.request),
        /public|Queue permission/,
      );
      const receipt = JSON.parse(readFileSync(path.join(root, '.anhedral/resources.json'), 'utf8'));
      assert.equal(receipt.state, 'reconciling');
      assert.ok(receipt.resources.some((item) => item.kind === 'd1'));
      assert.equal(existsSync(path.join(root, '.anhedral/ship.lock')), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});
test('configured resource IDs never silently bind to another resource', async () => {
  const root = fixture({
    d1_databases: [{ binding: 'DB', database_name: 'example-db', database_id: 'existing-id' }],
  });
  try {
    await connectApplication(root, account, 'public', run);
    const api = provider();
    await assert.rejects(provisionApplication(root, false, run, api.request), /does not match/);
    assert.equal(
      api.calls.some((call) => call.method === 'POST'),
      false,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('provider lists traverse pages and malformed credential output is not disclosed', async () => {
  const calls = [];
  const list = await listCloudflare(async (_, endpoint) => {
    calls.push(endpoint);
    return { result: [{ id: calls.length }], result_info: { total_pages: 2 } };
  }, '/access/apps');
  assert.equal(list.length, 2);
  assert.ok(calls[1].includes('page=2'));
  await assert.rejects(
    cloudflareRequest({ accountId: account }, '/tmp', async () => 'secret-invalid-payload', {}),
    (error) => !error.message.includes('secret-invalid-payload'),
  );
});
function accessProvider({ broad = false, denied = false } = {}) {
  const calls = [];
  const workers = [];
  const apps = [];
  const policies = [];
  const request = async (method, endpoint, body) => {
    calls.push({ method, endpoint, body });
    const route = endpoint.split('?')[0];
    if (route === '/workers/workers') {
      if (method === 'POST') {
        const value = { id: 'b'.repeat(32), name: body.name };
        workers.push(value);
        return { result: value };
      }
      return { result: workers, result_info: { total_pages: 1 } };
    }
    if (route === '/access/apps') {
      if (denied) throw new Error('Access permission denied');
      if (method === 'POST') {
        const value = { ...body, id: '12345678-1234-1234-1234-123456789abc' };
        apps.push(value);
        policies.push(...body.policies);
        return { result: value };
      }
      return { result: apps, result_info: { total_pages: 1 } };
    }
    if (route.endsWith('/policies'))
      return {
        result: broad ? [{ decision: 'bypass', include: [{ everyone: {} }] }] : policies,
        result_info: { total_pages: 1 },
      };
    throw new Error('Unexpected provider call');
  };
  return { request, calls };
}
test('private Access covers the entire Worker and reuses exact member policies', async () => {
  const root = fixture();
  try {
    const project = await connectApplication(root, account, 'private', run, ['Owner@Example.com']);
    const api = accessProvider();
    const result = await reconcileAccess(root, project, api.request, true);
    assert.equal(result.length, 1);
    const application = api.calls.find(
      (call) => call.method === 'POST' && call.endpoint === '/access/apps',
    );
    assert.deepEqual(application.body.destinations, [
      { type: 'worker', worker_id: 'b'.repeat(32) },
    ]);
    assert.deepEqual(application.body.policies[0].include, [
      { email: { email: 'owner@example.com' } },
    ]);
    const mutations = api.calls.filter((call) => call.method === 'POST').length;
    await reconcileAccess(root, project, api.request, false);
    assert.equal(api.calls.filter((call) => call.method === 'POST').length, mutations);
    await assert.rejects(connectApplication(root, account, 'public', run), /audience/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('private Access rejects broad policies, missing permissions and unsupported WebSocket protection', async () => {
  const root = fixture();
  try {
    await assert.rejects(connectApplication(root, account, 'private', run), /allowed email/);
    const project = await connectApplication(root, account, 'private', run, ['owner@example.com']);
    await assert.rejects(
      reconcileAccess(root, project, accessProvider({ broad: true }).request, true),
      /policies differ/,
    );
    await assert.rejects(
      reconcileAccess(root, project, accessProvider({ denied: true }).request, true),
      /permission denied/,
    );
    writeFileSync(
      path.join(root, 'apps/web/wrangler.jsonc'),
      JSON.stringify({
        name: 'example-web',
        durable_objects: { bindings: [{ class_name: 'Rooms' }] },
      }),
    );
    await assert.rejects(
      reconcileAccess(root, project, accessProvider().request, true),
      /WebSockets/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('resource recovery independently checks committed IDs without creation or config writes', async () => {
  const root = fixture(config);
  try {
    await connectApplication(root, account, 'public', run);
    const api = provider();
    await provisionApplication(root, false, run, api.request);
    rmSync(path.join(root, '.anhedral/resources.json'));
    const file = path.join(root, 'apps/web/wrangler.jsonc');
    const before = readFileSync(file, 'utf8');
    const mutationCount = api.calls.filter((call) => call.method === 'POST').length;
    const recovered = await inspectApplicationResources(root, api.request);
    assert.equal(recovered.resources.length, 6);
    assert.equal(readFileSync(file, 'utf8'), before);
    assert.equal(existsSync(path.join(root, '.anhedral/resources.json')), false);
    assert.equal(api.calls.filter((call) => call.method === 'POST').length, mutationCount);
    api.resources.get('/d1/database')[0].uuid = 'other-id';
    await assert.rejects(inspectApplicationResources(root, api.request), /identity differs/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('provisioning refuses a stale binding plan after asynchronous configuration edits', async () => {
  const root = fixture({
    d1_databases: [
      { binding: 'DB', database_name: 'example-db', database_id: 'REPLACE_WITH_D1_ID' },
    ],
  });
  try {
    await connectApplication(root, account, 'public', run);
    const calls = [];
    const request = async (method) => {
      calls.push(method);
      writeFileSync(
        path.join(root, 'apps/web/wrangler.jsonc'),
        JSON.stringify({
          name: 'example-web',
          d1_databases: [
            { binding: 'OTHER', database_name: 'other-db', database_id: 'REPLACE_WITH_D1_ID' },
          ],
        }),
      );
      return { result: [], result_info: { total_pages: 1 } };
    };
    await assert.rejects(provisionApplication(root, false, run, request), /Configuration changed/);
    assert.deepEqual(calls, ['GET']);
    assert.equal(
      parse(readFileSync(path.join(root, 'apps/web/wrangler.jsonc'), 'utf8')).d1_databases[0]
        .binding,
      'OTHER',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Void alone provisions new project resources; Anhedral never invokes a second resource writer', async () => {
  const root = fixture({
    d1_databases: [
      { binding: 'DB', database_name: 'example-db', database_id: 'REPLACE_WITH_D1_ID' },
    ],
  });
  try {
    const file = path.join(root, 'anhedral.project.json');
    const project = JSON.parse(readFileSync(file, 'utf8'));
    project.deliveryEngine = 'void';
    writeFileSync(file, JSON.stringify(project));
    const before = readFileSync(path.join(root, 'apps/web/wrangler.jsonc'), 'utf8');
    const result = await provisionApplication(
      root,
      false,
      async () => assert.fail('No provider CLI before Void'),
      async () => assert.fail('No provider API before Void'),
    );
    assert.equal(result.writer, 'void');
    assert.equal(result.deferredToDeployment, true);
    assert.equal(result.mutation, false);
    assert.equal(readFileSync(path.join(root, 'apps/web/wrangler.jsonc'), 'utf8'), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
