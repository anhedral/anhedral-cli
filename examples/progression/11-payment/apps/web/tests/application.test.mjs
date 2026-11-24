import assert from 'node:assert/strict';
import test from 'node:test';
import { readApplicationStatus } from '../src/lib/application.server.ts';

test('the starter renders when no API binding is available', async () => {
  const status = await readApplicationStatus({});
  assert.ok(status.api === null || status.api === false);
});
