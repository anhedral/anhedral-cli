import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  rmSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';

const cli = path.resolve('dist/bin.js');
const scratch = mkdtempSync(path.join(tmpdir(), 'anhedral-public-stack-'));
const run = (args, cwd = scratch) =>
  spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, CI: '1' },
  });
const read = (root, file) => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
function generate(name) {
  const root = path.join(scratch, name);
  const result = run(['init', root, '--skip-install', '--no-git', '--json']);
  assert.equal(result.status, 0, result.stderr);
  return root;
}
function fingerprint(root) {
  const hash = createHash('sha256');
  function walk(directory) {
    for (const name of readdirSync(directory).sort()) {
      const file = path.join(directory, name);
      hash.update(path.relative(root, file));
      if (statSync(file).isDirectory()) walk(file);
      else hash.update(readFileSync(file));
    }
  }
  walk(root);
  return hash.digest('hex');
}
test.after(() => rmSync(scratch, { recursive: true, force: true }));

test('public discovery exposes one Anhedral Stack with only three additions', () => {
  const result = run(['stack', 'list', '--json']);
  assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.stack.name, 'Anhedral Stack');
  assert.equal(value.stack.id, 'anhedral-stack');
  assert.deepEqual(Object.keys(value.stack.additions), ['backend', 'r2', 'stripe']);
  assert.equal(value.capabilities, undefined);
  assert.doesNotMatch(result.stdout, /expo|revenuecat|native-ui|next-opennext|side-panel|gpui/);
  const human = run(['stack', 'list']);
  assert.equal(human.status, 0, human.stderr);
  assert.match(human.stdout, /Anhedral Stack/);
  assert.doesNotMatch(human.stdout, /undefined/);
});

test('unsupported executable add commands fail before reading or recovering transaction state', () => {
  const root = generate('reject');
  writeFileSync(path.join(root, '.anhedral-journal.json'), 'preserve pending user material');
  const before = fingerprint(root);
  for (const addition of [
    'hono',
    'database-auth',
    'expo',
    'native-ui',
    'revenuecat',
    'realtime',
    'rtc',
    'ai',
    'wxt',
    'side-panel',
    'gpui',
    'next',
  ]) {
    const result = run(['add', addition, '--skip-install', '--json'], root);
    assert.equal(result.status, 1, addition);
    assert.match(JSON.parse(result.stderr).error, /Anhedral Stack/);
    assert.equal(fingerprint(root), before, addition);
  }
});

test('public add refuses legacy Next source before recovering pending transactions', async () => {
  const root = generate('legacy-source');
  const fresh = root;
  const rootManifest = read(fresh, 'apps/web/package.json');
  rootManifest.dependencies = { next: '16.4.2' };
  writeFileSync(path.join(fresh, 'apps/web/package.json'), JSON.stringify(rootManifest));
  writeFileSync(path.join(root, '.anhedral-journal.json'), 'preserve pending legacy material');
  const before = fingerprint(root);
  const result = run(['add', 'backend', '--skip-install', '--json'], root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(JSON.parse(result.stderr).error, /Anhedral Stack/);
  assert.equal(fingerprint(root), before);
});

test('public state reports backend as one atomic addition and R2/Stripe as independent choices', () => {
  const root = generate('progressive');
  let result = run(['stack', 'status', '--json'], root);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    JSON.parse(result.stdout).additions.map((item) => [item.id, item.sourceState]),
    [
      ['backend', 'available'],
      ['r2', 'locked'],
      ['stripe', 'locked'],
    ],
  );
  const before = fingerprint(root);
  result = run(['add', 'r2', '--skip-install', '--json'], root);
  assert.equal(result.status, 1);
  assert.equal(fingerprint(root), before);
  result = run(['add', 'backend', '--skip-install', '--json'], root);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).added, ['backend']);
  assert.deepEqual(read(root, 'anhedral.json').capabilities.installed, ['hono', 'database-auth']);
  result = run(['stack', 'doctor', '--json'], root);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    JSON.parse(result.stdout).additions.map((item) => [item.id, item.sourceState]),
    [
      ['backend', 'installed'],
      ['r2', 'available'],
      ['stripe', 'available'],
    ],
  );
  assert.equal(existsSync(path.join(root, 'apps/api/src/features/storage.ts')), false);
  result = run(['add', 'r2', 'stripe', '--skip-install', '--json'], root);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).added, ['r2', 'stripe']);
  assert.equal(run(['stack', 'doctor'], root).status, 0);
});

test('public dependency expansion is explicit and completion/help expose no retired source choices', () => {
  const root = generate('dependencies');
  const result = run(['add', 'stripe', '--with-dependencies', '--skip-install', '--json'], root);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).added, ['backend', 'stripe']);
  assert.deepEqual(read(root, 'anhedral.json').capabilities.installed, [
    'hono',
    'database-auth',
    'stripe',
  ]);
  for (const args of [
    ['add', '--help'],
    ['completion', 'bash'],
  ]) {
    const output = run(args);
    assert.equal(output.status, 0, output.stderr);
    assert.doesNotMatch(
      output.stdout,
      /--native|--all|add expo|add database-auth|native-ui|revenuecat|side-panel/,
    );
  }
});

test('public dry-run plans all three additions without recovering or writing source', () => {
  const root = generate('dry-run');
  writeFileSync(path.join(root, '.anhedral-journal.json'), 'preserve pending user material');
  const before = fingerprint(root);
  const result = run(['add', 'backend', 'r2', 'stripe', '--dry-run', '--json'], root);
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.deepEqual(plan.added, ['backend', 'r2', 'stripe']);
  assert.ok(plan.files.includes('apps/api/src/features/auth.ts'));
  assert.ok(plan.files.includes('apps/api/src/features/storage.ts'));
  assert.ok(plan.files.includes('apps/api/src/features/stripe.ts'));
  assert.equal(plan.resourcesProvisionedByCli, false);
  assert.equal(plan.sourceInstalled, false);
  assert.equal(plan.dependenciesInstalled, false);
  assert.equal(plan.dryRun, true);
  assert.equal(fingerprint(root), before);
});
