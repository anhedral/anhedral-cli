import assert from 'node:assert/strict';
import test from 'node:test';
import app from '../src/index.ts';

test('health is public and account data requires configured authentication', async () => {
  const health = await app.request('/api/health', {}, {});
  assert.deepEqual(await health.json(), { ok: true });
  const session = await app.request('/api/session', {}, {});
  assert.equal(session.status, 503);
});
