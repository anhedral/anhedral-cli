import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { inspectApplication } from '../dist/index.js';
const cli = path.resolve('dist/bin.js');
test('inspect is useful headlessly and preserves unknown setup without writes', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-inspect-command-'));
  try {
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'source-only' }));
    const original = readFileSync(path.join(root, 'package.json'));
    const run = (...args) =>
      spawnSync(process.execPath, [cli, 'inspect', root, ...args], { encoding: 'utf8' });
    const json = run('--json');
    assert.equal(json.status, 0, json.stderr);
    const result = JSON.parse(json.stdout);
    assert.equal(result.schemaVersion, 1);
    assert.equal(result.name, 'source-only');
    assert.deepEqual(result.authentication, { state: 'not-checked' });
    assert.deepEqual(result.liveStatus, { state: 'unknown' });
    assert.equal(result.selection.state, 'unavailable');
    const direct = inspectApplication(root);
    delete result.inspectedAt;
    delete direct.inspectedAt;
    assert.deepEqual(result, direct);
    const human = run();
    assert.equal(human.status, 0, human.stderr);
    assert.match(human.stdout, /source-only/);
    assert.match(human.stdout, /not checked/);
    const quiet = run('--quiet');
    assert.equal(quiet.stdout, '');
    assert.equal(quiet.status, 0);
    for (const args of [['--unknown'], ['extra-directory']])
      assert.notEqual(run(...args).status, 0);
    assert.equal(existsSync(path.join(root, '.anhedral')), false);
    assert.deepEqual(readFileSync(path.join(root, 'package.json')), original);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
