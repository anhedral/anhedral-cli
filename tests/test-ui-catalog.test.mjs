import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inspectUiCatalog, parseUiSelector } from '../dist/index.js';
import { commandArguments } from '../dist/cli-arguments.js';

test('only ui/button is exposed and never claims available source or installation', () => {
  assert.equal(parseUiSelector('ui/button'), 'ui/button');
  for (const selector of ['button', 'ui/input', '../button', 'ui/button/extra'])
    assert.throws(() => parseUiSelector(selector));
  const result = inspectUiCatalog('/does-not-exist');
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].installable, false);
  assert.equal(result.items[0].sourceAvailability, 'candidate-unavailable');
  assert.equal(result.resolution.state, 'invalid');
});

test('schema parser shares UI inspection grammar and rejects duplicate selectors', () => {
  const parsed = commandArguments('registry', [
    'view',
    'ui/button',
    '--kind=ui',
    '--app',
    'apps/mobile',
    '--platform',
    'web',
  ]);
  assert.deepEqual(parsed.positional, ['view', 'ui/button']);
  assert.equal(parsed.value('--app'), 'apps/mobile');
  assert.equal(parsed.value('--platform'), 'web');
  assert.throws(() => commandArguments('registry', ['--kind', 'ui', '--app', 'a', '--app', 'b']));
});

test('CLI catalog grammar preserves existing routes, quiet output and a read-only directory', async () => {
  const { mkdtempSync, readdirSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-ui-cli-'));
  const cli = path.resolve('dist/bin.js');
  const run = (...args) =>
    spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
  try {
    const view = run('registry', 'view', 'ui/button', '--kind=ui', '--platform=web', '--json');
    assert.equal(view.status, 0, view.stderr);
    assert.equal(JSON.parse(view.stdout).items[0].installable, false);
    assert.equal(JSON.parse(view.stdout).resolution.state, 'invalid');
    assert.equal(run('registry', 'list', '--kind', 'ui', '--quiet').stdout, '');
    assert.match(run('registry', '--help').stdout, /--app.*workspace/);
    for (const args of [
      ['view', 'ui/input', '--kind', 'ui'],
      ['list', '--app', 'apps/mobile'],
      ['list', '--kind', 'ui', '--platform', 'native'],
      ['capabilities', '--kind', 'ui'],
      ['view', 'ui/button', '--kind', 'ui', '--app', 'a', '--app', 'b'],
    ])
      assert.equal(run('registry', ...args, '--json').status, 1, args.join(' '));
    assert.equal(run('registry', 'list', '--json').status, 0);
    assert.equal(run('registry', 'view', 'expo', '--json').status, 0);
    assert.equal(run('registry', 'capabilities', '--json').status, 0);
    assert.deepEqual(readdirSync(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
