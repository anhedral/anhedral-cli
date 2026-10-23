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
  assert.equal(run('repository', '--help').status, 0);
  assert.match(run('repository', '--help').stdout, /repository.*--owner/);
  const diagnosis = run('doctor', '--json');
  assert.equal(diagnosis.status, 1);
  assert.equal(JSON.parse(diagnosis.stdout).productionReady, false);
  assert.deepEqual(readdirSync(root), [], 'doctor must not write');
  const target = path.join(root, 'planned');
  const result = run('init', target, '--stripe', '--dry-run', '--json');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).products, [
    'better-auth',
    'd1',
    'expo',
    'hono',
    'r2',
    'stripe',
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
