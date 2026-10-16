import assert from 'node:assert/strict';
import { test } from 'node:test';
import { supportsVoidRuntime } from '../dist/void.js';

test('Void runtime floor does not accept older Node lines or prereleases', () => {
  for (const version of ['22.99.0', '24.20.9', '24.21.0-rc.1', 'garbage'])
    assert.equal(supportsVoidRuntime(version), false);
  for (const version of ['24.21.0', '24.22.0', '25.0.0'])
    assert.equal(supportsVoidRuntime(version), true);
});
