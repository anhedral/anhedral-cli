import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const root = mkdtempSync(path.join(tmpdir(), 'anhedral-cli-validation-'));
const cli = path.resolve('dist/bin.js');
const run = (...args) =>
  spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
assert.match(readme, /\]\(docs\/stack-standard\.md\)/);

try {
  for (const args of [
    ...[
      'inspect',
      'integrations',
      'services',
      'repository',
      'register',
      'provision',
      'status',
      'manage',
      'verify',
      'rollback',
    ].map((command) => [command]),
    ['add', 'expo'],
    ['auth', '--unknown'],
    ['auth', '--provider'],
    ['ship', '--platform', 'ios'],
    ['ship', '--platform', 'android', '--profile', 'preview', '--provider', 'cloudflare'],
    ['doctor', '--unknown'],
    ['adopt', '--unknown'],
    ['recover', '--unknown'],
    ['recover', '--lock', '--provider', 'cloudflare'],
    ['recover', '--lock', '--refresh'],
    ['adopt', '--provider', 'cloudflare'],
    ['setup-vps'],
    ['init', '--legacy'],
    ['new', '--json'],
    ['init', '--fastify'],
    ['init', '--all'],
    ['init', '--neon', '--d1'],
    ['init', '--next'],
    ['init', '--hosting', 'vercel'],
    ['cloud', 'register'],
    ['cloud', 'stage'],
    ['cloud', 'deploy'],
  ]) {
    const result = run(...args, '--json');
    assert.equal(result.status, 1, `${args} must fail`);
    const failure = JSON.parse(result.stderr);
    assert.ok(failure.error);
    if (args[0] === 'cloud') assert.equal(failure.code, 'UNKNOWN_COMMAND');
    assert.deepEqual(readdirSync(root), [], 'invalid commands must not create files');
  }
  const target = path.join(root, 'planned');
  const result = run('init', target, '--dry-run', '--json');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).products, [
    'd1',
    'expo',
    'hono',
    'next',
    'r2',
    'styling',
  ]);
  assert.equal(existsSync(target), false);
  assert.match(run('--help').stdout, /Expo/);
  assert.doesNotMatch(run('--help').stdout, /--legacy|setup-vps|Fastify|anhedral cloud/);
  assert.match(run('--version').stdout, /^\d+\.\d+\.\d+\n$/);
} finally {
  rmSync(root, { recursive: true, force: true });
}
console.log('Current CLI validation passed');
