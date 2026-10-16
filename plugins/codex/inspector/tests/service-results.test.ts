import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serviceToolResult } from '../server/service-results.ts';
test('private table values and deletion tokens stay out of model text and structured output', () => {
  const data = {
    fetchedAt: new Date().toISOString(),
    columns: ['name'],
    rows: [['private-customer-name']],
    offset: 0,
    hasMore: false,
    masked: false,
  };
  const result = serviceToolResult('browse_service_data', { data });
  assert.doesNotMatch(
    JSON.stringify({ content: result.content, structured: result.structuredContent }),
    /private-customer-name/,
  );
  assert.equal(result._meta.serviceResponse.data?.rows[0][0], 'private-customer-name');
  const plan = {
    token: 'a'.repeat(43),
    name: 'private-database-name',
    accountId: 'a'.repeat(32),
    resourceId: 'private-resource-id',
    kind: 'd1',
    applications: [],
    expiresAt: new Date().toISOString(),
    impact: 'data deletion',
  };
  const planned = serviceToolResult('plan_service_deletion', { plan });
  assert.doesNotMatch(
    JSON.stringify({ content: planned.content, structured: planned.structuredContent }),
    /private-database-name|private-resource-id|a{43}/,
  );
});
test('live status and aggregate analytics remain useful without rendering UI', () => {
  const status = {
    state: 'available' as const,
    fetchedAt: new Date().toISOString(),
    message: 'Exists; health unverified.',
  };
  const result = serviceToolResult('refresh_service', { status });
  assert.deepEqual(result.structuredContent.response?.status, status);
});
