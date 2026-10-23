import { test } from 'node:test';
import assert from 'node:assert/strict';
import { observeIntegrationService } from '../dist/integration-service-readers.js';
const fixtures = [
  [
    'stripe',
    { accountId: 'acct', mode: 'test', webhookUrl: 'https://example.com/webhook' },
    { id: 'hook', livemode: false, url: 'https://example.com/webhook', secret: 'secret' },
  ],
  ['revenuecat', { projectId: 'project' }, { id: 'project', name: 'billing', api_key: 'secret' }],
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
