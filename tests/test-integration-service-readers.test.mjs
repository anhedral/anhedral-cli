import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  observeIntegrationService,
  posthogServiceMetrics,
} from '../dist/integration-service-readers.js';
import { neonReadConnection, listNeonTables, browseNeonData } from '../dist/neon-service-data.js';
const fixtures = [
  [
    'neon',
    { projectId: 'proj', organizationId: 'org' },
    { project: { id: 'proj', org_id: 'org', name: 'database', api_key: 'secret' } },
  ],
  [
    'clerk',
    { applicationId: 'app', workspaceId: 'workspace' },
    { application_id: 'app', name: 'identity', secret_key: 'secret' },
  ],
  [
    'resend',
    { domainId: 'domain', domain: 'example.com' },
    { id: 'domain', name: 'example.com', api_key: 'secret' },
  ],
  [
    'stripe',
    { accountId: 'acct', mode: 'test', webhookUrl: 'https://example.com/webhook' },
    { id: 'hook', livemode: false, url: 'https://example.com/webhook', secret: 'secret' },
  ],
  ['revenuecat', { projectId: 'project' }, { id: 'project', name: 'billing', api_key: 'secret' }],
  [
    'sentry',
    { organization: 'org', project: 'slug' },
    { id: '123', slug: 'slug', organization: { slug: 'org' }, name: 'errors', dsn: 'secret' },
  ],
  [
    'posthog',
    { projectId: '123', organizationId: 'org' },
    { id: 123, organization: 'org', name: 'analytics', api_token: 'secret' },
  ],
  ['openai', { projectId: 'proj' }, { id: 'proj', name: 'inference', key: 'secret' }],
];
for (const [provider, settings, response] of fixtures) {
  test(`${provider} status checks selected identity without returning credentials`, async () => {
    const service = {
      provider,
      settings,
      resources: provider === 'stripe' ? { webhook: 'hook' } : {},
    };
    const routes = [];
    const api = async (route) => {
      routes.push(route);
      if (route === '/v1/platform/me') return { subject: 'workspace' };
      if (route === '/v1/account') return { id: 'acct' };
      return response;
    };
    const value = await observeIntegrationService(service, api);
    assert.equal(value.state, 'available');
    assert.doesNotMatch(JSON.stringify(value), /secret|api_token|dsn/);
    assert.ok(routes.every((route) => route.startsWith('/') && !route.includes('..')));
  });
}
test('foreign account identity remains unavailable and returns no raw provider output', async () => {
  const result = await observeIntegrationService(
    { provider: 'neon', settings: { projectId: 'project', organizationId: 'org' }, resources: {} },
    async () => ({ project: { id: 'other', org_id: 'org', api_key: 'private-key' } }),
  );
  assert.equal(result.state, 'unavailable');
  assert.doesNotMatch(JSON.stringify(result), /private-key/);
});
test('PostHog analytics is a bounded read query against the verified project', async () => {
  const calls = [];
  const metrics = await posthogServiceMetrics(
    { provider: 'posthog', settings: { projectId: '123', organizationId: 'org' }, resources: {} },
    async (route, method, body) => {
      calls.push({ route, method, body });
      if (!method) return { id: 123, organization: 'org' };
      return { results: [[new Date().toISOString().slice(0, 13) + ':00:00Z', 5, 3]] };
    },
  );
  assert.equal(metrics.points[0].values.events, 5);
  assert.equal(calls[1].route, '/api/projects/123/query/');
  assert.match(calls[1].body.query.query, /LIMIT 1000/);
  assert.equal(calls[1].body.query.kind, 'HogQLQuery');
});
test('Neon requires a matching endpoint and a read-only restricted role for every transaction', async () => {
  const service = {
    provider: 'neon',
    settings: { projectId: 'project', organizationId: 'org', database: 'neondb' },
    resources: {},
  };
  const api = async (route) =>
    route.endsWith('/endpoints')
      ? { endpoints: [{ host: 'ep-safe.us.aws.neon.tech' }] }
      : { project: { id: 'project', org_id: 'org' } };
  let options;
  const client = () => ({
    query: (sql, params) => ({ sql, params }),
    transaction: async (queries, opts) => {
      options = opts;
      return [[], [{ read_only: true, privileged: false, writable: false }], [{ name: 'notes' }]];
    },
  });
  const read = await neonReadConnection(
    service,
    api,
    {
      ANHEDRAL_NEON_READONLY_URL: [
        'postgresql://reader:',
        'password',
        '@ep-safe.us.aws.neon.tech/neondb',
      ].join(''),
    },
    client,
  );
  assert.deepEqual(await listNeonTables(read), ['notes']);
  assert.equal(options.readOnly, true);
  assert.equal(options.isolationLevel, 'RepeatableRead');
  assert.ok(options.fetchOptions.signal instanceof AbortSignal);
  await assert.rejects(
    neonReadConnection(
      service,
      api,
      {
        ANHEDRAL_NEON_READONLY_URL: [
          'postgresql://reader:',
          'password',
          '@ep-foreign.us.aws.neon.tech/neondb',
        ].join(''),
      },
      client,
    ),
    /belong/,
  );
  const privileged = () => ({
    query: (sql) => ({ sql }),
    transaction: async () => [
      [],
      [{ read_only: true, privileged: false, writable: true }],
      [{ name: 'notes' }],
    ],
  });
  const denied = await neonReadConnection(
    service,
    api,
    {
      ANHEDRAL_NEON_READONLY_URL: [
        'postgresql://reader:',
        'password',
        '@ep-safe.us.aws.neon.tech/neondb',
      ].join(''),
    },
    privileged,
  );
  await assert.rejects(denied('SELECT 1'), /Neon read failed/);
});
test('Neon row browsing masks sensitive columns in SQL before fetching them', async () => {
  const calls = [];
  const read = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('information_schema.tables')) return [{ name: 'notes' }];
    if (sql.includes('information_schema.columns')) return [{ name: 'title' }, { name: 'email' }];
    return [{ title: 'fixture', email: '[masked]' }];
  };
  const data = await browseNeonData(read, 'notes');
  assert.equal(data.masked, true);
  assert.deepEqual(data.rows, [['fixture', '[masked]']]);
  assert.match(calls.at(-1).sql, /'\[masked\]'::text AS "email"/);
  assert.deepEqual(calls.at(-1).params, [26, 0]);
  await assert.rejects(browseNeonData(read, 'notes;delete'), /identifier/);
});
