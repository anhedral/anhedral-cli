import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// This suite can also prove the retained, installed tarball's entrypoint.
const cli = path.resolve(process.env.ANHEDRAL_CLI_BIN ?? 'dist/bin.js');
const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'anhedral-cli-experience-')));
const run = (...args) =>
  spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15000,
    env: { ...process.env, CI: '1', NO_COLOR: '1' },
  });

test.after(() => rmSync(root, { recursive: true, force: true }));

test('public help is compact, contextual and requires no workspace or authentication', () => {
  const help = run('--help');
  assert.equal(help.status, 0, help.stderr);
  assert.ok(help.stdout.trim().split('\n').length <= 45);
  assert.match(help.stdout, /anhedral init/);
  for (const args of [
    ['source', 'upload', '--help'],
    ['help', 'source', 'upload'],
  ]) {
    const result = run(...args);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Examples:/);
    assert.match(result.stdout, /anhedral source upload --dry-run/);
    assert.doesNotMatch(result.stdout, /undefined/);
  }
  for (const args of [
    ['help', 'deploy', 'garbage'],
    ['deploy', 'plan', 'garbage', '--help'],
    ['help', 'deploy', 'plan', 'garbage'],
  ]) {
    const result = run(...args, '--json');
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(JSON.parse(result.stderr).code, 'INVALID_ARGUMENT');
  }
  assert.equal(run('init', 'sample', '--help').status, 0);
  assert.equal(run('ui', 'add', 'button', '--help').status, 0);
});

test('init flag ordering and end-of-options preserve the same public plan shape', () => {
  const standard = run('init', 'sample', '--dry-run', '--json');
  const reordered = run('--json', 'init', '--dry-run', 'sample');
  assert.equal(standard.status, 0, standard.stderr);
  assert.equal(reordered.status, 0, reordered.stderr);
  assert.deepEqual(JSON.parse(standard.stdout), JSON.parse(reordered.stdout));
  const empty = run('init', '', '--dry-run', '--json');
  assert.equal(empty.status, 1);
  assert.equal(JSON.parse(empty.stderr).code, 'INVALID_ARGUMENT');
  const literal = run('init', '--dry-run', '--json', '--', '--help');
  assert.equal(literal.status, 0, literal.stderr);
  assert.equal(JSON.parse(literal.stdout).root, path.join(root, '--help'));
  const humanLiteral = run('init', '--dry-run', '--', '--json');
  assert.equal(humanLiteral.status, 0, humanLiteral.stderr);
  assert.match(humanLiteral.stdout, /Foundation preview/);
  assert.match(humanLiteral.stdout, /--json/);
  assert.deepEqual(readdirSync(root), [], 'help and dry runs must not write the workspace');
});

test('Platform preserves implicit JSON and honors quiet, explicit JSON and opt-in human output', () => {
  assert.equal(run('unlink').stdout, '{"status":"unlinked"}\n');
  const quiet = run('unlink', '--quiet');
  assert.equal(quiet.status, 0, quiet.stderr);
  assert.equal(quiet.stdout + quiet.stderr, '');
  assert.deepEqual(JSON.parse(run('unlink', '--quiet', '--json').stdout), { status: 'unlinked' });
  const human = run('unlink', '--human');
  assert.equal(human.status, 0, human.stderr);
  assert.match(human.stdout, /Removed the local project link/);
});

test('typed usage errors fail before credentials, preserve stderr and numeric exit status', () => {
  for (const args of [
    ['whoami', '--api-url', 'invalid'],
    ['link', '--project', 'invalid'],
    ['whoami', '--api-url'],
    ['whoami', '--credential-file'],
  ]) {
    const result = run(...args, '--json');
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout, '');
    const error = JSON.parse(result.stderr);
    assert.equal(error.code, 'INVALID_ARGUMENT');
    assert.equal(typeof error.error, 'string');
    assert.equal(typeof error.nextAction, 'string');
  }
  const unknown = run('unknown', '--json');
  assert.equal(unknown.status, 1);
  assert.equal(JSON.parse(unknown.stderr).code, 'UNKNOWN_COMMAND');
});

test('completion uses the executable output contract and never changes project files', () => {
  for (const shell of ['bash', 'zsh']) {
    const result = run('completion', shell, '--json', '--quiet');
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.shell, shell);
    assert.match(payload.script, /anhedral/);
    assert.equal(result.stderr, '');
    assert.equal(run('completion', shell, '--quiet').stdout, '');
  }
  assert.deepEqual(readdirSync(root), []);
});
