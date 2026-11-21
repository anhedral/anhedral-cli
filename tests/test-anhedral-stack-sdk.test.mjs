import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

test('SDK-supplied app titles survive rendering into source and documentation', async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), 'anhedral-sdk-title-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, 'project');
  const name = "Today's app";
  await scaffoldAnhedralStack({ ...parseInitOptions([root, '--skip-install', '--no-git']), name });
  const source = readFileSync(path.join(root, 'apps/web/src/starter.ts'), 'utf8');
  const { starterTitle } = await import('data:text/javascript,' + encodeURIComponent(source));
  assert.equal(starterTitle, name);
  const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.equal(readme.split('\n')[0], '# ' + name);
  assert.doesNotMatch(readme, /__APP_NAME__|__CLI_VERSION__/);
});
