import { writeProjectSection } from '../dist/project-config.js';
import { createSetupPlan } from '../dist/capabilities.js';
import { parseStandardOptions } from '../dist/registry/options.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseVoidDeploymentLog } from '../dist/void-state.js';
const target = { id: 'web', workerName: 'customer-web' };
const versionId = '12345678-1234-1234-1234-123456789abc';
const records = [
  { ts: 100, msg: 'deploy_start', cwd: '/customer/apps/web' },
  { ts: 200, msg: 'cloudflare_deploy_end', ok: true, worker: 'customer-web', versionId },
  { ts: 210, msg: 'deploy_end', ok: true },
];
const parse = (value = records, dir = '/customer/apps/web', since = 100) =>
  parseVoidDeploymentLog(value.map(JSON.stringify).join('\n'), dir, target, since);
test('pinned Void structured success receipt retains unconfirmed provider state', () => {
  assert.deepEqual(parse(), { target: 'web', versionId, urls: [], providerConfirmed: false });
});
test('Void receipt rejects stale, foreign, failed, incomplete and ambiguous logs', () => {
  assert.equal(parse(records, '/other'), undefined);
  assert.equal(parse(records, '/customer/apps/web', 101), undefined);
  assert.equal(parse(records.slice(0, 2)), undefined);
  assert.equal(parse([...records.slice(0, 2), { msg: 'deploy_end', ok: false }]), undefined);
  assert.equal(parse([records[0], records[1], records[1], records[2]]), undefined);
  assert.equal(parse([records[0], { ...records[1], worker: 'other' }, records[2]]), undefined);
});
test('Void receipt rejects prose, malformed JSON and missing version evidence', () => {
  assert.equal(
    parseVoidDeploymentLog('Deployed successfully', '/customer/apps/web', target, 100),
    undefined,
  );
  assert.equal(parse([records[0], { ...records[1], versionId: '' }, records[2]]), undefined);
});
test('Void receipt rejects non-object records', () => {
  assert.equal(parseVoidDeploymentLog('null', '/customer/apps/web', target, 100), undefined);
});

test('canonical Cloudflare config merges recorded Void IDs and preserves authored changes', async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { readConfig } = await import('../dist/project-state.js');
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-void-lock-test-'));
  const source = { name: 'old-name', d1_databases: [{ binding: 'DB', database_name: 'shared' }] };
  const resolved = {
    ...source,
    d1_databases: [{ ...source.d1_databases[0], database_id: 'recorded-id' }],
  };
  try {
    writeFileSync(
      path.join(root, 'anhedral.cloudflare.json'),
      JSON.stringify({ ...source, name: 'new-name' }),
    );
    writeFileSync(
      path.join(root, 'void.lock.json'),
      JSON.stringify({ version: 1, source, resolved, text: JSON.stringify(resolved) }),
    );
    const config = readConfig(root);
    assert.equal(config.name, 'new-name');
    assert.equal(config.d1_databases[0].database_id, 'recorded-id');
    writeFileSync(
      path.join(root, 'void.lock.json'),
      JSON.stringify({ version: 2, source, resolved, text: '' }),
    );
    assert.throws(() => readConfig(root), /Invalid pinned Void resource lock/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Void delivery validates resolved bindings rather than authored placeholder text', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { registerApplication, planDelivery } = await import('../dist/delivery.js');
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-void-resolved-test-'));
  const directory = path.join(root, 'apps/web');
  try {
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'test-app' }));
    writeProjectSection(
      root,
      'setup',
      createSetupPlan(parseStandardOptions([root, '--hono', '--vinext'])),
    );
    writeFileSync(
      path.join(directory, 'package.json'),
      JSON.stringify({ scripts: { deploy: 'void deploy' } }),
    );
    writeFileSync(path.join(directory, 'void.config.ts'), 'export default {};');
    const source = { name: 'test-web', d1_databases: [{ binding: 'DB', database_name: 'shared' }] };
    const resolved = {
      ...source,
      d1_databases: [{ ...source.d1_databases[0], database_id: 'recorded-id' }],
    };
    writeFileSync(
      path.join(directory, 'anhedral.cloudflare.json'),
      JSON.stringify({
        ...source,
        d1_databases: [{ ...source.d1_databases[0], database_id: 'REPLACE_WITH_D1_ID' }],
      }),
    );
    writeFileSync(
      path.join(directory, 'void.lock.json'),
      JSON.stringify({ version: 1, source, resolved, text: JSON.stringify(resolved) }),
    );
    assert.equal(registerApplication(root).deliveryEngine, 'void');
    assert.doesNotThrow(() => planDelivery(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Void delivery refuses multiple shared migration owners before provider operations', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { registerApplication, planDelivery } = await import('../dist/delivery.js');
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-void-owners-'));
  try {
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'test-app' }));
    writeProjectSection(
      root,
      'setup',
      createSetupPlan(parseStandardOptions([root, '--hono', '--vinext'])),
    );
    for (const id of ['api', 'web']) {
      const directory = path.join(root, 'apps', id);
      mkdirSync(directory, { recursive: true });
      writeFileSync(path.join(directory, 'void.config.ts'), 'export default {};');
      writeFileSync(
        path.join(directory, 'package.json'),
        JSON.stringify({ scripts: { deploy: 'void deploy' } }),
      );
      writeFileSync(
        path.join(directory, 'anhedral.cloudflare.json'),
        JSON.stringify({
          name: `test-${id}`,
          d1_databases: [
            {
              binding: 'DB',
              database_name: 'shared',
              database_id: 'existing-id',
              migrations_dir: '../../packages/db/drizzle',
            },
          ],
        }),
      );
    }
    registerApplication(root);
    assert.throws(() => planDelivery(root), /one D1 migration owner/);
    const file = path.join(root, 'apps/web/anhedral.cloudflare.json');
    const consumer = JSON.parse((await import('node:fs')).readFileSync(file, 'utf8'));
    delete consumer.d1_databases[0].migrations_dir;
    writeFileSync(file, JSON.stringify(consumer));
    const resolved = structuredClone(consumer);
    resolved.d1_databases[0].migrations_dir = './db/migrations';
    writeFileSync(
      path.join(root, 'apps/web/void.lock.json'),
      JSON.stringify({ version: 1, source: consumer, resolved, text: JSON.stringify(resolved) }),
    );
    assert.doesNotThrow(() => planDelivery(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
