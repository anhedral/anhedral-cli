import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  readdirSync,
  renameSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { planVoidDelivery, supportsVoidRuntime } from '../dist/void.js';

function fixture(ids = ['api', 'web']) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-void-'));
  const project = {
    schemaVersion: 1,
    id: '12345678-1234-1234-1234-123456789012',
    name: 'example',
    ownership: 'customer',
    provider: 'cloudflare',
    accountId: 'a'.repeat(32),
    audience: 'private',
    access: { emails: ['owner@example.com'] },
    targets: ids.map((id) => ({ id, directory: `apps/${id}`, workerName: `example-${id}` })),
  };
  writeFileSync(path.join(root, 'anhedral.project.json'), JSON.stringify(project));
  for (const { directory, workerName } of project.targets) {
    mkdirSync(path.join(root, directory), { recursive: true });
    writeFileSync(
      path.join(root, directory, 'wrangler.jsonc'),
      JSON.stringify({
        name: workerName,
        main: 'src/index.ts',
        ...(directory === 'apps/api'
          ? {
              d1_databases: [
                {
                  binding: 'DB',
                  database_name: 'shared-db',
                  database_id: 'existing-db',
                  migrations_dir: '../../packages/db/drizzle',
                },
              ],
              r2_buckets: [{ binding: 'UPLOADS', bucket_name: 'private-uploads' }],
              kv_namespaces: [{ binding: 'CACHE', id: 'existing-kv', anhedral_name: 'cache' }],
            }
          : {}),
      }),
    );
  }
  return root;
}

test('Void candidate preserves customer resources and per-server boundaries without mutating source', () => {
  const root = fixture();
  const file = path.join(root, 'apps/api/wrangler.jsonc');
  const before = readFileSync(file, 'utf8');
  try {
    const plan = planVoidDelivery(root);
    assert.equal(plan.mutation, false);
    assert.equal(plan.activation, 'runtime-validation-required');
    assert.equal(plan.migrationOwner, 'api');
    assert.deepEqual(plan.blockers, []);
    const [api, web] = plan.targets;
    assert.equal(api.config.cloudflare.account_id, 'a'.repeat(32));
    assert.equal(api.config.cloudflare.d1_databases[0].database_id, 'existing-db');
    assert.equal(api.config.cloudflare.d1_databases[0].migrations_dir, '../../packages/db/drizzle');
    assert.equal(api.config.cloudflare.r2_buckets[0].binding, 'UPLOADS');
    assert.equal(api.config.cloudflare.kv_namespaces[0].anhedral_name, undefined);
    assert.equal(web.config.cloudflare.d1_databases, undefined);
    assert.equal(web.config.inference.bindings.db, false);
    assert.deepEqual(api.command.slice(-3), ['deploy', '--platform', 'cloudflare']);
    assert.equal(readFileSync(file, 'utf8'), before);
    assert.deepEqual(readdirSync(path.join(root, 'apps/api')), ['wrangler.jsonc']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Void migration refuses account/environment changes and exposes duplicate migration owners', () => {
  const root = fixture();
  const file = path.join(root, 'apps/web/wrangler.jsonc');
  try {
    const config = JSON.parse(readFileSync(file, 'utf8'));
    writeFileSync(file, JSON.stringify({ ...config, account_id: 'b'.repeat(32) }));
    assert.throws(() => planVoidDelivery(root), /customer Cloudflare account/);
    writeFileSync(file, JSON.stringify({ ...config, env: { production: {} } }));
    assert.ok(
      planVoidDelivery(root).blockers.some((item) => item.includes('separate Void target')),
    );
    assert.equal(planVoidDelivery(root).targets[1].config.cloudflare.env, undefined);
    writeFileSync(
      file,
      JSON.stringify({
        ...config,
        d1_databases: [{ binding: 'DB', migrations_dir: '../../packages/db/drizzle' }],
      }),
    );
    const plan = planVoidDelivery(root);
    assert.equal(plan.migrationOwner, null);
    assert.ok(plan.blockers.some((item) => item.includes('one D1 migration owner')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('database consumers do not become migration owners and explicit ownership resolves shared bindings', () => {
  const root = fixture();
  const file = path.join(root, 'apps/web/wrangler.jsonc');
  try {
    const config = JSON.parse(readFileSync(file, 'utf8'));
    const database = { binding: 'DB', database_name: 'shared-db', database_id: 'existing-db' };
    writeFileSync(file, JSON.stringify({ ...config, d1_databases: [database] }));
    let plan = planVoidDelivery(root);
    assert.equal(plan.migrationOwner, 'api');
    assert.deepEqual(plan.databaseConsumers, ['api', 'web']);
    assert.deepEqual(plan.blockers, []);
    writeFileSync(
      file,
      JSON.stringify({
        ...config,
        d1_databases: [
          {
            ...database,
            migrations_dir: '../../packages/db/drizzle',
          },
        ],
      }),
    );
    plan = planVoidDelivery(root, { migrationOwner: 'api' });
    assert.deepEqual(plan.blockers, []);
    assert.equal(plan.targets[1].config.cloudflare.d1_databases[0].migrations_dir, undefined);
    assert.equal(plan.targets[1].config.cloudflare.d1_databases[0].database_id, 'existing-db');
    assert.equal(
      JSON.parse(readFileSync(file, 'utf8')).d1_databases[0].migrations_dir,
      '../../packages/db/drizzle',
    );
    assert.throws(
      () => planVoidDelivery(root, { migrationOwner: 'missing' }),
      /database-consuming/,
    );
    assert.ok(plan.acceptance.some((item) => item.includes('consumers never apply migrations')));
    assert.equal(plan.targets[1].bindingEvidence, 'generated-output-validation-required');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('environment migration inventories filenames without reading or exposing local secrets', () => {
  const root = fixture();
  try {
    mkdirSync(path.join(root, 'packages/db'), { recursive: true });
    writeFileSync(path.join(root, 'apps/api/.dev.vars'), 'PRIVATE_KEY=never-include-this-value');
    writeFileSync(
      path.join(root, 'packages/db/.env.local'),
      'DATABASE_URL_UNPOOLED=another-secret-value',
    );
    writeFileSync(path.join(root, 'apps/api/.dev.vars.example'), 'EXAMPLE=placeholder');
    const plan = planVoidDelivery(root);
    assert.equal(plan.environment.sourceValuesRead, false);
    assert.equal(plan.environment.buildPublicPrefix, 'VITE_');
    assert.ok(plan.blockers.some((item) => item.includes('local environment files')));
    assert.deepEqual(plan.environment.filesToReview[0].files, [
      'apps/api/.dev.vars',
      'packages/db/.env.local',
    ]);
    const serialized = JSON.stringify(plan);
    assert.equal(serialized.includes('never-include-this-value'), false);
    assert.equal(serialized.includes('another-secret-value'), false);
    assert.equal(serialized.includes('.dev.vars.example'), false);
    assert.equal(plan.provisioning.writer, 'void');
    assert.equal(plan.provisioning.concurrency, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Void candidate reports missing ownership and targets without treating a plan as deployable', () => {
  const root = fixture([]);
  try {
    const file = path.join(root, 'anhedral.project.json');
    const project = JSON.parse(readFileSync(file, 'utf8'));
    writeFileSync(file, JSON.stringify({ ...project, accountId: null, audience: 'unconfigured' }));
    const plan = planVoidDelivery(root);
    assert.equal(plan.blockers.length, 3);
    assert.equal(plan.activation, 'runtime-validation-required');
    assert.equal(plan.mutation, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Void runtime floor does not accept older Node lines or prereleases', () => {
  for (const version of ['22.99.0', '24.20.9', '24.21.0-rc.1', 'garbage'])
    assert.equal(supportsVoidRuntime(version), false);
  for (const version of ['24.21.0', '24.22.0', '25.0.0'])
    assert.equal(supportsVoidRuntime(version), true);
});

test('fresh checkout consumer locks retain existing IDs without acquiring migration ownership', () => {
  const root = fixture();
  try {
    for (const app of ['api', 'web']) {
      const directory = path.join(root, 'apps', app);
      renameSync(
        path.join(directory, 'wrangler.jsonc'),
        path.join(directory, 'anhedral.cloudflare.json'),
      );
    }
    const file = path.join(root, 'apps/web/anhedral.cloudflare.json');
    const authored = JSON.parse(readFileSync(file, 'utf8'));
    authored.d1_databases = [
      { binding: 'DB', database_name: 'shared-db', database_id: 'REPLACE_WITH_D1_ID' },
    ];
    writeFileSync(file, JSON.stringify(authored));
    const source = structuredClone(authored);
    delete source.d1_databases[0].database_id;
    const resolved = structuredClone(source);
    resolved.d1_databases[0].database_id = 'existing-db';
    resolved.d1_databases[0].migrations_dir = './db/migrations';
    writeFileSync(
      path.join(root, 'apps/web/void.lock.json'),
      JSON.stringify({ version: 1, source, resolved, text: '{}' }),
    );
    const before = readFileSync(file, 'utf8');
    const plan = planVoidDelivery(root);
    assert.equal(plan.migrationOwner, 'api');
    assert.deepEqual(plan.databaseConsumers, ['api', 'web']);
    assert.equal(plan.targets[1].config.cloudflare.d1_databases[0].database_id, 'existing-db');
    assert.equal(plan.targets[1].config.cloudflare.d1_databases[0].migrations_dir, undefined);
    assert.deepEqual(plan.blockers, []);
    assert.equal(readFileSync(file, 'utf8'), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
