import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
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
const transaction = new URL('../dist/transaction.js', import.meta.url).href;
const command = (args, extra = []) =>
  spawnSync(process.execPath, [...extra, bin, ...args], { encoding: 'utf8', timeout: 15000 });
const fixture = () => realpathSync(mkdtempSync(path.join(tmpdir(), 'anhedral-command-recovery-')));
function crashHook(directory, condition, before = false, method = 'renameSync') {
  const hook = path.join(directory, 'hook.mjs');
  writeFileSync(
    hook,
    `import fs from 'node:fs'; import {syncBuiltinESMExports} from 'node:module'; const rename=fs.${method}; fs.${method}=(a,b)=>{${before ? `if(${condition})process.exit(79);` : ''} rename(a,b); ${before ? '' : `if(${condition})process.exit(79);`}}; syncBuiltinESMExports();`,
  );
  return ['--import', hook];
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
      const match =
        point === 'staging'
          ? `typeof a === 'string' && a.includes('/stage-')`
          : point !== 'installed'
            ? `b===${JSON.stringify(path.join(root, '.anhedral-journal.json'))}`
            : `a.includes('/stage-') && b===${JSON.stringify(path.join(root, 'anhedral.json'))}`;
      const args = ['init', root, '--skip-install', '--no-git', '--json'];
      assert.equal(
        command(
          args,
          crashHook(scratch, match, false, point === 'staging' ? 'mkdirSync' : 'renameSync'),
        ).status,
        79,
      );
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
      const args = ['add', 'hono', '--skip-install', '--cwd', root, '--json'];
      assert.equal(
        command(
          args,
          crashHook(
            scratch,
            `a===${JSON.stringify(path.join(root, 'anhedral.json'))} && b.includes('/backup-')`,
          ),
        ).status,
        79,
      );
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
          ).capabilities.installed.includes('hono'),
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
    const setup = `import fs from 'node:fs'; import {syncBuiltinESMExports} from 'node:module'; const root=${JSON.stringify(root)}; fs.mkdirSync(root); fs.writeFileSync(root+'/value','original');`;
    try {
      const hook =
        point === 'before-backup'
          ? `const rename=fs.renameSync; fs.renameSync=(a,b)=>{if(a===root+'/value'&&b.includes('/backup-'))process.exit(79);rename(a,b)};`
          : `const rename=fs.renameSync; fs.renameSync=(a,b)=>{rename(a,b);if(a.includes('/backup-')&&b===root+'/value')process.exit(79)};`;
      const result = spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          setup +
            hook +
            `syncBuiltinESMExports();const{runStagedTransaction}=await import(${JSON.stringify(transaction)});await runStagedTransaction(root,{commitPaths:['value','z-missing'],build:async stage=>fs.writeFileSync(stage+'/value','replacement')});`,
        ],
        { encoding: 'utf8', timeout: 15000 },
      );
      assert.equal(result.status, 79, result.stderr);
      if (point === 'after-restore-edited')
        writeFileSync(root + '/value', 'consumer-after-restore');
      const recover = spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `const{recoverInterruptedTransaction}=await import(${JSON.stringify(transaction)});recoverInterruptedTransaction(${JSON.stringify(root)});`,
        ],
        { encoding: 'utf8', timeout: 15000 },
      );
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
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
      import fs from 'node:fs';import{recoverInterruptedTransaction}from ${JSON.stringify(transaction)};
      const root=${JSON.stringify(root)};fs.mkdirSync(root);const transactionId='2147483647-22222222-2222-4222-8222-222222222222';
      const backupRoot=root+'/.anhedral-txn/backup-'+transactionId,stageRoot=root+'/.anhedral-txn/stage-'+transactionId;
      fs.mkdirSync(backupRoot,{recursive:true});fs.mkdirSync(stageRoot,{recursive:true});fs.writeFileSync(root+'/value','consumer-recreated');
      fs.writeFileSync(root+'/.anhedral-journal.json',JSON.stringify({version:2,backupRoot,stageRoot,entries:[{relativePath:'value',backupPath:backupRoot+'/value',installed:false,installedFingerprint:null}],createdDirectories:[]}));
      try{recoverInterruptedTransaction(root)}catch(error){console.error(error.message);process.exitCode=1}
    `,
      ],
      { encoding: 'utf8', timeout: 15000 },
    );
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
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import fs from 'node:fs';fs.mkdirSync(${JSON.stringify(root)});fs.writeFileSync(${JSON.stringify(root + '/.anhedral-journal.json')},'{invalid');fs.writeFileSync(${JSON.stringify(root + '/consumer.txt')},'preserve');`,
      ],
      { encoding: 'utf8', timeout: 15000 },
    );
    assert.equal(result.status, 0, result.stderr);
    const before = inventory(root);
    assert.equal(command(['init', root, '--skip-install', '--no-git', '--json']).status, 1);
    assert.deepEqual(inventory(root), before);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
