import assert from 'node:assert/strict';
import test from 'node:test';
import app from '../src/index.ts';

test('health is public', async () => {
  const health = await app.request('/api/health', {}, {});
  assert.deepEqual(await health.json(), { ok: true });
});
