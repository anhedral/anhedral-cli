import assert from 'node:assert/strict';
import test from 'node:test';
import { readApplicationStatus } from '../src/lib/application.server.ts';

test('the starter renders when no API binding is available', async () => {
  const status = await readApplicationStatus({});
  assert.equal(status.api, status.authentication ? false : null);
});
