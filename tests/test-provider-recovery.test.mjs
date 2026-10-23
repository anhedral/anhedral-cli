import { writeProjectSection } from '../dist/project-config.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  readdirSync,
  realpathSync,
  mkdirSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { verifyRecoveredResource } from '../dist/providers/recovery-verification.js';
import { integrationStatus, recoverIntegrationResource } from '../dist/providers/recovery.js';
import { ProvisioningState, readProviderStateStatus } from '../dist/providers/state.js';
import { digest } from '../dist/providers/api.js';
import { atomicJson } from '../dist/project-state.js';
import { createSetupPlan } from '../dist/capabilities.js';
import { parseStandardOptions } from '../dist/standard.js';
const scenarios = {
  revenuecat: {
    descriptor: { key: 'ios-app', route: '/v2/projects/proj1/apps' },
    settings: { projectId: 'proj1', bundleId: 'com.customer.app' },
    id: 'app1',
    responses: {
      '/v2/projects/proj1/apps/app1': {
        id: 'app1',
        type: 'app_store',
        app_store: { bundle_id: 'com.customer.app' },
      },
    },
    receipt: { id: 'app1' },
  },
};
for (const [provider, scenario] of Object.entries(scenarios)) {
  test(`${provider}: recovery verifies explicit identity using GET only`, async () => {
    const calls = [];
    const receipt = await verifyRecoveredResource(
      provider,
      scenario.descriptor,
      scenario.id,
      scenario.settings,
      async (route, method = 'GET') => {
        calls.push({ route, method });
        assert.ok(route in scenario.responses);
        return scenario.responses[route];
      },
    );
    assert.deepEqual(receipt, scenario.receipt);
    assert.ok(calls.length > 0 && calls.every(({ method }) => method === 'GET'));
    assert.equal(JSON.stringify(receipt).includes('must-not-return'), false);
    await assert.rejects(
      verifyRecoveredResource(
        provider,
        { ...scenario.descriptor, route: '/foreign' },
        scenario.id,
        scenario.settings,
        async () => {
          throw new Error('must not call');
        },
      ),
      /recovery route/,
    );
  });
  test(`${provider}: recovery refuses foreign identities or ownership`, async () => {
    const responses = structuredClone(scenario.responses);
    const resource = responses[Object.keys(responses).at(-1)];
    if (provider === 'neon') resource.project.org_id = 'foreign';
    else if (provider === 'clerk') resource.application_id = 'foreign';
    else resource.id = 'foreign';
    await assert.rejects(
      verifyRecoveredResource(
        provider,
        scenario.descriptor,
        scenario.id,
        scenario.settings,
        async (route) => responses[route],
      ),
      /does not match/,
    );
  });
}
for (const [provider, key] of [['stripe', 'webhook']]) {
  test(`${provider}: resource ID alone cannot recover one-time credentials`, async () => {
    await assert.rejects(
      verifyRecoveredResource(provider, { key, route: '/pending' }, 'id_1', {}, async () => {
        throw new Error('must not call');
      }),
      /one-time credential/,
    );
  });
}
test('status rejects unsupported receipt schemas without rewriting files', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-recovery-status-'));
  try {
    assert.deepEqual(integrationStatus(root), { schemaVersion: 2, providers: [], mutation: false });
    assert.equal(readdirSync(root).length, 0);
    // Use root as state directory to exercise projection without creating another directory.
    const file = path.join(root, 'providers.json');
    atomicJson(file, {
      schemaVersion: 1,
      providers: {},
    });
    const before = readFileSync(file, 'utf8');
    assert.throws(() => readProviderStateStatus(root), /Invalid provider state/);
    assert.equal(readFileSync(file, 'utf8'), before);
    assert.deepEqual(readdirSync(root), ['providers.json']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

async function pendingFixture() {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'anhedral-recovery-flow-')));
  const settings = { name: 'customer-app' };
  writeProjectSection(
    root,
    'setup',
    createSetupPlan(parseStandardOptions([root, '--revenuecat', '--skip-install'])),
  );
  writeProjectSection(root, 'providers', { schemaVersion: 1, providers: { revenuecat: settings } });
  const directory = path.join(root, '.anhedral');
  mkdirSync(directory);
  const state = new ProvisioningState(directory);
  state.context('revenuecat', settings);
  const body = { name: settings.name };
  await assert.rejects(
    state.create(
      'revenuecat',
      'project',
      async () => {
        throw new Error('unknown outcome');
      },
      '/v2/projects',
      body,
    ),
    /unknown outcome/,
  );
  const operation = digest({ key: 'project', route: '/v2/projects', body });
  const run = async (_command, args) =>
    args.includes('rev-parse') ? root : args.includes('check-ignore') ? args.at(-1) : '';
  return { root, directory, operation, run, settings, body };
}
test('recovery completes a verified pending receipt without replaying remote mutation', async () => {
  const { root, directory, operation, run, settings, body } = await pendingFixture();
  try {
    const before = integrationStatus(root);
    assert.equal(before.providers[0].operations[0].status, 'pending');
    assert.equal(before.providers[0].operations[0].descriptor.key, 'project');
    const calls = [];
    const result = await recoverIntegrationResource(
      root,
      { provider: 'revenuecat', operation, resourceId: 'domain_1' },
      run,
      async (url, options) => {
        calls.push(options.method);
        assert.equal(new URL(url).pathname, '/v2/projects/domain_1');
        return new Response(
          JSON.stringify({ id: 'domain_1', name: 'customer-app', diagnostics: 'must-not-save' }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      },
      { RC_API_KEY: 'management-key' },
    );
    assert.equal(result.status, 'complete');
    assert.deepEqual(calls, ['GET']);
    const state = new ProvisioningState(directory);
    state.context('revenuecat', settings);
    assert.deepEqual(
      await state.create(
        'revenuecat',
        'project',
        async () => {
          throw new Error('must not replay');
        },
        '/v2/projects',
        body,
      ),
      { id: 'domain_1' },
    );
    assert.equal(
      readFileSync(path.join(directory, 'providers.json'), 'utf8').includes('must-not-save'),
      false,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('configuration changed during verification keeps operation pending', async () => {
  const { root, operation, run } = await pendingFixture();
  try {
    await assert.rejects(
      recoverIntegrationResource(
        root,
        { provider: 'revenuecat', operation, resourceId: 'domain_1' },
        run,
        async () => {
          writeProjectSection(root, 'providers', {
            schemaVersion: 1,
            providers: {},
          });
          return new Response(JSON.stringify({ id: 'domain_1', name: 'customer-app' }));
        },
        { RC_API_KEY: 'management-key' },
      ),
      /changed during recovery/,
    );
    assert.equal(integrationStatus(root).providers[0].operations[0].status, 'pending');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('pending operations without a trusted descriptor are rejected without replay', async () => {
  const { root, directory, operation, run, settings } = await pendingFixture();
  try {
    atomicJson(path.join(directory, 'providers.json'), {
      schemaVersion: 2,
      providers: {
        revenuecat: {
          config: digest(settings),
          operations: { [operation]: { status: 'pending', value: {} } },
        },
      },
    });
    assert.throws(() => integrationStatus(root), /Invalid provider state/);
    await assert.rejects(
      recoverIntegrationResource(
        root,
        { provider: 'revenuecat', operation, resourceId: 'domain_1' },
        run,
        async () => {
          throw new Error('must not call');
        },
        { RC_API_KEY: 'management-key' },
      ),
      /Invalid provider state/,
    );
    assert.equal(
      JSON.parse(readFileSync(path.join(directory, 'providers.json'))).providers.revenuecat
        .operations[operation].status,
      'pending',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
