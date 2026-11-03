import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { parseInitOptions, scaffoldAnhedralStack } from '../dist/index.js';
test('canonical SDK options describe the Anhedral Stack without legacy product selectors', () => {
  const options = parseInitOptions(['sdk-app', '--skip-install', '--no-git', '--dry-run']);
  assert.deepEqual(options, {
    root: path.resolve('sdk-app'),
    name: 'sdk-app',
    skipInstall: true,
    dryRun: true,
    json: false,
    initializeGit: false,
  });
  assert.equal(typeof scaffoldAnhedralStack, 'function');
  for (const flag of ['--expo', '--stripe', '--products', '--hosting'])
    assert.throws(() => parseInitOptions(['sdk-app', flag]));
});
