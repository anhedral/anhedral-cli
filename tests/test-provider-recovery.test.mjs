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
  neon: {
    descriptor: { key: 'project', route: '/api/v2/projects' },
    settings: { name: 'example', organizationId: 'org_1', region: 'aws-us-east-1' },
    id: 'proj_1',
    responses: {
      '/api/v2/projects/proj_1': {
        project: { id: 'proj_1', name: 'example', org_id: 'org_1', region_id: 'aws-us-east-1' },
      },
    },
    receipt: { project: { id: 'proj_1' } },
  },
  clerk: {
    descriptor: { key: 'application', route: '/v1/platform/applications' },
    settings: { workspaceId: 'workspace_1', name: 'example', environment: 'development' },
    id: 'app_1',
    responses: {
      '/v1/platform/me': { subject: 'workspace_1' },
      '/v1/platform/applications/app_1': {
        application_id: 'app_1',
        name: 'example',
        instances: [{ environment_type: 'development' }],
      },
    },
    receipt: { application_id: 'app_1' },
  },
  resend: {
    descriptor: { key: 'domain', route: '/domains' },
    settings: { domain: 'customer.com' },
    id: 'domain_1',
    responses: {
      '/domains/domain_1': { id: 'domain_1', name: 'customer.com', token: 'must-not-return' },
    },
    receipt: { id: 'domain_1' },
  },
  posthog: {
    descriptor: { key: 'project', route: '/api/organizations/org_1/projects/' },
    settings: { organizationId: 'org_1', name: 'example', region: 'eu' },
    id: '42',
    responses: {
      '/api/organizations/org_1/projects/42/': {
        id: 42,
        name: 'example',
        organization: 'org_1',
        api_token: 'must-not-return',
      },
    },
    receipt: { id: '42' },
  },
  openai: {
    descriptor: { key: 'project', route: '/v1/organization/projects' },
    settings: { name: 'example' },
    id: 'proj_1',
    responses: {
      '/v1/organization/projects/proj_1': { id: 'proj_1', name: 'example', status: 'active' },
    },
    receipt: { id: 'proj_1' },
  },
  sentry: {
    descriptor: { key: 'project', route: '/api/0/teams/org_1/team_1/projects/' },
    settings: { organization: 'org_1', team: 'team_1', project: 'example', platform: 'node' },
    id: '12',
    responses: {
      '/api/0/projects/org_1/example/': {
        id: 12,
        slug: 'example',
        organization: { slug: 'org_1' },
        teams: [{ slug: 'team_1' }],
        platform: 'node',
      },
    },
    receipt: { id: '12' },
  },
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
for (const [provider, key] of [
  ['openai', 'service-account'],
  ['resend', 'sending-key'],
  ['stripe', 'webhook'],
]) {
  test(`${provider}: resource ID alone cannot recover one-time credentials`, async () => {
    await assert.rejects(
      verifyRecoveredResource(provider, { key, route: '/pending' }, 'id_1', {}, async () => {
        throw new Error('must not call');
      }),
      /one-time credential/,
    );
  });
}
test('status redacts legacy responses and never creates or migrates files', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-recovery-status-'));
  try {
    assert.deepEqual(integrationStatus(root), { schemaVersion: 2, providers: [], mutation: false });
    assert.equal(readdirSync(root).length, 0);
    // Use root as state directory to exercise projection without creating another directory.
    const file = path.join(root, 'providers.json');
    atomicJson(file, {
      schemaVersion: 1,
      providers: {
        resend: {
          config: digest({}),
          operations: {
            [digest('operation')]: {
              status: 'complete',
              value: { id: 'key1', token: 'private-token', metadata: 'private-token' },
            },
          },
        },
      },
    });
    const before = readFileSync(file, 'utf8');
    const result = readProviderStateStatus(root);
    assert.equal(JSON.stringify(result).includes('private-token'), false);
    assert.equal(readFileSync(file, 'utf8'), before);
    assert.deepEqual(readdirSync(root), ['providers.json']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

async function pendingFixture() {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'anhedral-recovery-flow-')));
  const settings = { domain: 'customer.com' };
  writeFileSync(
    path.join(root, 'anhedral.setup.json'),
    JSON.stringify(
      createSetupPlan(parseStandardOptions('new', [root, '--hono', '--resend', '--skip-install'])),
    ),
  );
  writeFileSync(
    path.join(root, 'anhedral.providers.json'),
    JSON.stringify({ schemaVersion: 1, providers: { resend: settings } }),
  );
  const directory = path.join(root, '.anhedral');
  mkdirSync(directory);
  const state = new ProvisioningState(directory);
  state.context('resend', settings);
  const body = { name: settings.domain };
  await assert.rejects(
    state.create(
      'resend',
      'domain',
      async () => {
        throw new Error('unknown outcome');
      },
      '/domains',
      body,
    ),
    /unknown outcome/,
  );
  const operation = digest({ key: 'domain', route: '/domains', body });
  const run = async (_command, args) =>
    args.includes('rev-parse') ? root : args.includes('check-ignore') ? args.at(-1) : '';
  return { root, directory, operation, run, settings, body };
}
test('recovery completes a verified pending receipt without replaying remote mutation', async () => {
  const { root, directory, operation, run, settings, body } = await pendingFixture();
  try {
    const before = integrationStatus(root);
    assert.equal(before.providers[0].operations[0].status, 'pending');
    assert.equal(before.providers[0].operations[0].descriptor.key, 'domain');
    const calls = [];
    const result = await recoverIntegrationResource(
      root,
      { provider: 'resend', operation, resourceId: 'domain_1' },
      run,
      async (url, options) => {
        calls.push(options.method);
        assert.equal(new URL(url).pathname, '/domains/domain_1');
        return new Response(
          JSON.stringify({ id: 'domain_1', name: 'customer.com', diagnostics: 'must-not-save' }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      },
      { RESEND_API_KEY: 'management-key' },
    );
    assert.equal(result.status, 'complete');
    assert.deepEqual(calls, ['GET']);
    const state = new ProvisioningState(directory);
    state.context('resend', settings);
    assert.deepEqual(
      await state.create(
        'resend',
        'domain',
        async () => {
          throw new Error('must not replay');
        },
        '/domains',
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
        { provider: 'resend', operation, resourceId: 'domain_1' },
        run,
        async () => {
          writeFileSync(
            path.join(root, 'anhedral.providers.json'),
            JSON.stringify({ schemaVersion: 1, providers: { resend: { domain: 'foreign.com' } } }),
          );
          return new Response(JSON.stringify({ id: 'domain_1', name: 'customer.com' }));
        },
        { RESEND_API_KEY: 'management-key' },
      ),
      /changed during recovery/,
    );
    assert.equal(integrationStatus(root).providers[0].operations[0].status, 'pending');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('legacy pending descriptor cannot be guessed or automatically replayed', async () => {
  const { root, directory, operation, run, settings } = await pendingFixture();
  try {
    atomicJson(path.join(directory, 'providers.json'), {
      schemaVersion: 1,
      providers: {
        resend: { config: digest(settings), operations: { [operation]: { status: 'pending' } } },
      },
    });
    assert.equal(integrationStatus(root).providers[0].operations[0].recovery, 'unknown-descriptor');
    await assert.rejects(
      recoverIntegrationResource(
        root,
        { provider: 'resend', operation, resourceId: 'domain_1' },
        run,
        async () => {
          throw new Error('must not call');
        },
        { RESEND_API_KEY: 'management-key' },
      ),
      /no trusted descriptor/,
    );
    assert.equal(integrationStatus(root).providers[0].operations[0].status, 'pending');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
