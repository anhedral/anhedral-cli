import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { completionScript } from '../dist/completion.js';

const root = mkdtempSync(path.join(tmpdir(), 'anhedral-completion-'));
const bash = path.join(root, 'completion.bash'),
  zsh = path.join(root, 'completion.zsh');
writeFileSync(bash, completionScript('bash'));
writeFileSync(zsh, completionScript('zsh'));
const quote = (value) => "'" + value.replaceAll("'", "'\"'\"'") + "'";
const available = (shell) => spawnSync(shell, ['-c', ':']).status === 0;
const hasBash = available('bash'),
  hasZsh = available('zsh');
function run(shell, args, body = '') {
  const source = shell === 'bash' ? bash : zsh;
  const setup =
    shell === 'bash'
      ? `COMP_WORDS=(${args.map(quote).join(' ')}); COMP_CWORD=$((${args.length}-1)); _anhedral; printf '%s\\n' "\${COMPREPLY[@]}"`
      : `compdef() { :; }; compadd() { print -rl -- "\${matches[@]}"; }; _files() { print -r -- "files:$*"; }; source "$1"; words=(${args.map(quote).join(' ')}); CURRENT=${args.length}; _anhedral`;
  const result = spawnSync(
    shell,
    ['-c', `${shell === 'bash' ? 'source "$1"; ' : ''}${body}${setup}`, '--', source],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 5000,
      env: { ...process.env, HOME: root, CI: '1' },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trimEnd().split('\n').filter(Boolean);
}

test.after(() => rmSync(root, { recursive: true, force: true }));
test('scripts are static shell source with deterministic output', () => {
  assert.equal(completionScript('bash'), completionScript('bash'));
  for (const shell of ['bash', 'zsh']) {
    const script = completionScript(shell);
    assert.doesNotMatch(script, /\beval\b|\bcurl\b|\bwget\b|\banhedral (?:whoami|login|source)\b/);
  }
});
test('generated scripts pass native syntax validation', () => {
  for (const [shell, file, installed] of [
    ['bash', bash, hasBash],
    ['zsh', zsh, hasZsh],
  ]) {
    if (!installed) continue;
    const result = spawnSync(shell, ['-n', file], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
});
test(
  'Bash completes commands and nested verbs through preceding options',
  { skip: !hasBash },
  () => {
    assert.ok(run('bash', ['anhedral', '']).includes('init'));
    assert.ok(run('bash', ['anhedral', '--quiet', 'source', 'u']).includes('upload'));
    assert.ok(
      run('bash', ['anhedral', 'deploy', '--api-url', 'https://example.test', 'p']).includes(
        'plan',
      ),
    );
    assert.deepEqual(run('bash', ['anhedral', 'help', 'source', 'u']), ['upload']);
  },
);
test(
  'Bash completes capabilities and components and avoids consumed names',
  { skip: !hasBash },
  () => {
    assert.deepEqual(run('bash', ['anhedral', 'add', 'database']), ['database-auth']);
    assert.deepEqual(run('bash', ['anhedral', 'add', 'hono', 'h']), []);
    assert.ok(run('bash', ['anhedral', 'ui', 'add', 'but']).includes('button'));
    assert.deepEqual(run('bash', ['anhedral', 'completion', 'z']), ['zsh']);
  },
);
test(
  'Bash exposes contextual flags, aliases and excludes used/conflicting flags',
  { skip: !hasBash },
  () => {
    const prepare = run('bash', ['anhedral', 'deploy', 'prepare', '--']);
    assert.ok(prepare.includes('--api-url'));
    assert.ok(!prepare.includes('--manifest'));
    const flags = run('bash', ['anhedral', 'ui', 'add', 'button', '--web', '--']);
    for (const invalid of ['--web', '--native', '--all']) assert.ok(!flags.includes(invalid));
    assert.ok(!run('bash', ['anhedral', 'init', '--git', '--']).includes('--no-git'));
    assert.ok(run('bash', ['anhedral', 'init', '-']).includes('-c'));
  },
);
test(
  'Bash completes file/directory values preserving spaces and inline prefixes',
  { skip: !hasBash },
  () => {
    mkdirSync(path.join(root, 'project directory'));
    writeFileSync(path.join(root, 'manifest file.json'), '{}');
    assert.deepEqual(run('bash', ['anhedral', '--cwd', 'project']), ['project directory']);
    assert.deepEqual(run('bash', ['anhedral', '-c', 'project']), ['project directory']);
    assert.deepEqual(run('bash', ['anhedral', 'init', 'project']), ['project directory']);
    assert.deepEqual(run('bash', ['anhedral', 'deploy', 'plan', '--manifest', 'manifest']), [
      'manifest file.json',
    ]);
    assert.deepEqual(run('bash', ['anhedral', 'whoami', '--credential-file=manifest']), [
      '--credential-file=manifest file.json',
    ]);
    assert.deepEqual(run('bash', ['anhedral', 'deploy', 'plan', '--manifest', '=', 'manifest']), [
      'manifest file.json',
    ]);
  },
);
test(
  'Bash does not complete options after separator or execute command-shaped input',
  { skip: !hasBash },
  () => {
    assert.deepEqual(run('bash', ['anhedral', 'init', '--', '--j']), []);
    assert.deepEqual(
      run('bash', ['anhedral', 'source', '--api-url', '$(touch completion-executed)', 'u']),
      ['upload'],
    );
    assert.equal(existsSync(path.join(root, 'completion-executed')), false);
  },
);
test('zsh completes nested verbs, values and contextual flags', { skip: !hasZsh }, () => {
  assert.deepEqual(run('zsh', ['anhedral', '--quiet', 'source', 'u']), ['upload']);
  assert.deepEqual(run('zsh', ['anhedral', 'add', 'data']), ['database-auth']);
  assert.ok(run('zsh', ['anhedral', 'ui', 'add', 'but']).includes('button'));
  const prepare = run('zsh', ['anhedral', 'deploy', 'prepare', '--']);
  assert.ok(prepare.includes('--api-url'));
  assert.ok(!prepare.includes('--manifest'));
  assert.ok(
    run('zsh', ['anhedral', '--cwd', 'project']).some((value) => value.startsWith('files:-/')),
  );
});
