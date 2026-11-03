import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  realpathSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  rmSync,
  existsSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const bin = fileURLToPath(new URL('../dist/bin.js', import.meta.url));
const crashImport = fileURLToPath(new URL('./support/command-recovery-hook.mjs', import.meta.url));
const recoveryProcess = fileURLToPath(
  new URL('./support/command-recovery-process.mjs', import.meta.url),
);
const command = (args, extra = {}) =>
  spawnSync(process.execPath, [...(extra.imports ?? []), bin, ...args], {
    encoding: 'utf8',
    timeout: 15000,
    env: extra.env ?? process.env,
  });
const fixture = () => realpathSync(mkdtempSync(path.join(tmpdir(), 'anhedral-command-recovery-')));
function crashHook(root, point) {
  return {
    imports: ['--import', crashImport],
    env: { ...process.env, ANHEDRAL_TEST_FAULT_CONFIG: JSON.stringify({ root, point }) },
  };
}
function recoveryChild(mode, root, point) {
  const hook = point ? crashHook(root, point) : {};
  return spawnSync(process.execPath, [...(hook.imports ?? []), recoveryProcess, mode, root], {
    encoding: 'utf8',
    timeout: 15000,
    env: hook.env ?? process.env,
  });
}
function inventory(directory) {
  return readdirSync(directory, { recursive: true, withFileTypes: true }).map((entry) => {
    const file = path.join(entry.parentPath, entry.name);
    return [
      path.relative(directory, file),
      entry.isDirectory() ? 'directory' : readFileSync(file).toString('base64'),
    ];
  });
}
for (const point of ['staging', 'journal', 'installed'])
  test(`actual interrupted init recovers after ${point}; dry run changes no bytes`, () => {
    const scratch = fixture(),
      root = path.join(scratch, 'app');
    try {
      const args = ['init', root, '--skip-install', '--no-git', '--json'];
      assert.equal(command(args, crashHook(root, point)).status, 79);
      const before = inventory(root);
      assert.equal(command([...args, '--dry-run']).status, 1);
      assert.deepEqual(inventory(root), before);
      const result = command(args);
      assert.equal(result.status, 0, result.stderr);
      assert.ok(JSON.parse(readFileSync(path.join(root, 'anhedral.json'), 'utf8')).identity.id);
      assert.equal(existsSync(path.join(root, '.anhedral-journal.json')), false);
      assert.equal(existsSync(path.join(root, '.anhedral.lock')), false);
      assert.equal(existsSync(path.join(root, '.anhedral-txn')), false);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
for (const recreate of [false, true])
  test(`actual add crash after backup rename ${recreate ? 'preserves recreated source' : 'recovers normally'}`, () => {
    const scratch = fixture(),
      root = path.join(scratch, 'app');
    try {
      assert.equal(command(['init', root, '--skip-install', '--no-git']).status, 0);
      const original = JSON.parse(readFileSync(path.join(root, 'anhedral.json'), 'utf8'));
      const args = [
        'add',
        'stripe',
        '--with-dependencies',
        '--skip-install',
        '--cwd',
        root,
        '--json',
      ];
      assert.equal(command(args, crashHook(root, 'after-backup')).status, 79);
      if (recreate)
        writeFileSync(
          path.join(root, 'anhedral.json'),
          JSON.stringify({ ...original, consumerNote: 'preserve post-crash work' }),
        );
      const result = command(args);
      if (recreate) {
        assert.equal(result.status, 1);
        assert.match(result.stderr, /recreated/);
        assert.equal(
          JSON.parse(readFileSync(path.join(root, 'anhedral.json'), 'utf8')).consumerNote,
          'preserve post-crash work',
        );
        const journal = JSON.parse(readFileSync(path.join(root, '.anhedral-journal.json'), 'utf8'));
        assert.ok(
          existsSync(
            journal.entries.find((entry) => entry.relativePath === 'anhedral.json').backupPath,
          ),
        );
        assert.equal(existsSync(path.join(root, '.anhedral.lock')), false);
      } else {
        assert.equal(result.status, 0, result.stderr);
        assert.ok(
          JSON.parse(
            readFileSync(path.join(root, 'anhedral.json'), 'utf8'),
          ).capabilities.installed.includes('stripe'),
        );
        assert.equal(existsSync(path.join(root, '.anhedral-journal.json')), false);
      }
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
for (const point of ['before-backup', 'after-restore', 'after-restore-edited'])
  test(`rollback replay after abrupt ${point} preserves verified original`, () => {
    const scratch = fixture(),
      root = path.join(scratch, 'root');
    try {
      const result = recoveryChild(
        'rollback',
        root,
        point === 'before-backup' ? point : 'after-restore',
      );
      assert.equal(result.status, 79, result.stderr);
      if (point === 'after-restore-edited')
        writeFileSync(root + '/value', 'consumer-after-restore');
      const recover = recoveryChild('recover', root);
      if (point === 'after-restore-edited') {
        assert.equal(recover.status, 1);
        assert.match(recover.stderr, /unverified target/);
        assert.equal(readFileSync(root + '/value', 'utf8'), 'consumer-after-restore');
        assert.equal(existsSync(root + '/.anhedral-journal.json'), true);
        return;
      }
      assert.equal(recover.status, 0, recover.stderr);
      assert.equal(readFileSync(root + '/value', 'utf8'), 'original');
      assert.equal(existsSync(root + '/.anhedral-journal.json'), false);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

test('legacy missing-backup journal cannot authorize an occupied target', () => {
  const scratch = fixture(),
    root = path.join(scratch, 'root');
  try {
    const result = recoveryChild('legacy', root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /missing transaction backup or unverified target/);
    assert.equal(readFileSync(root + '/value', 'utf8'), 'consumer-recreated');
    assert.equal(existsSync(root + '/.anhedral-journal.json'), true);
    assert.equal(existsSync(root + '/.anhedral-txn'), true);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test('real init refuses malformed recovery metadata and preserves consumer files', () => {
  const scratch = fixture(),
    root = path.join(scratch, 'app');
  try {
    mkdirSync(root);
    writeFileSync(path.join(root, '.anhedral-journal.json'), '{invalid');
    writeFileSync(path.join(root, 'consumer.txt'), 'preserve');
    const before = inventory(root);
    assert.equal(command(['init', root, '--skip-install', '--no-git', '--json']).status, 1);
    assert.deepEqual(inventory(root), before);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
