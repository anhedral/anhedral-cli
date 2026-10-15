import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  syncVoidSecrets,
  deployVoidTarget,
  rollbackVoidTarget,
  voidServerSecrets,
  voidCloudflareEnvironment,
} from '../dist/void-execution.js';
import { VOID_VERSION } from '../dist/void.js';

test('Void secrets use noninteractive stdin with literal bytes and a pinned direct target', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-void-secrets-test-'));
  try {
    writeFileSync(
      path.join(directory, 'package.json'),
      JSON.stringify({ devDependencies: { void: VOID_VERSION } }),
    );
    const value = ' literal\\path"quoted$ # value\nsecond line ';
    await syncVoidSecrets(
      directory,
      { API_KEY: value },
      async (command, args, cwd, env, input) => {
        if (command === 'node') return '24.21.0';
        if (args.includes('--version')) return VOID_VERSION;
        if (args.includes('token'))
          return JSON.stringify({ type: 'oauth', token: 'test-oauth-token' });
        assert.deepEqual([command, ...args], ['pnpm', 'exec', 'void', 'secret', 'put', 'API_KEY']);
        assert.equal(input, value);
        assert.ok(!JSON.stringify(args).includes(value));
        assert.deepEqual(
          JSON.parse(readFileSync(path.join(directory, '.void/project.json'), 'utf8')),
          { platform: 'cloudflare' },
        );
        return '';
      },
      {},
    );
    writeFileSync(path.join(directory, '.void/project.json'), JSON.stringify({ platform: 'void' }));
    await assert.rejects(
      syncVoidSecrets(directory, { API_KEY: value }, async () => assert.fail(), {}),
      /customer Cloudflare/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Void refuses public keys and NUL secrets before spawning a command', async () => {
  const run = async () => assert.fail('must not execute');
  await assert.rejects(
    syncVoidSecrets('/tmp', { VITE_KEY: 'secret' }, run, {}),
    /server environment/,
  );
  await assert.rejects(syncVoidSecrets('/tmp', { API_KEY: 'value\0' }, run, {}), /NUL/);
});

test('Void rejects terminal newline secrets rather than trimming the stored value', async () => {
  await assert.rejects(
    syncVoidSecrets('/tmp', { API_KEY: 'value\n' }, async () => assert.fail(), {}),
    /terminal newlines/,
  );
});

test('Void deploy and rollback require pinned installation and supported runtime', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-void-exec-'));
  const calls = [];
  const run = async (command, args) => {
    calls.push([command, ...args]);
    return command === 'node'
      ? '24.21.0'
      : args.includes('--version')
        ? VOID_VERSION
        : args.includes('token')
          ? JSON.stringify({ type: 'oauth', token: 'test-oauth-token' })
          : 'completed';
  };
  try {
    writeFileSync(
      path.join(directory, 'package.json'),
      JSON.stringify({ devDependencies: { void: VOID_VERSION } }),
    );
    assert.equal(await deployVoidTarget(directory, run, {}), 'completed');
    assert.deepEqual(calls.at(-1), ['pnpm', 'exec', 'void', 'deploy', '--platform', 'cloudflare']);
    await rollbackVoidTarget(directory, '12345678-1234-1234-1234-123456789abc', run, {});
    assert.deepEqual(calls.at(-1), [
      'pnpm',
      'exec',
      'void',
      'project',
      'rollback',
      '12345678-1234-1234-1234-123456789abc',
    ]);
    await assert.rejects(
      deployVoidTarget(directory, async () => '22.0.0', {}),
      /Node >=24.21.0/,
    );
    writeFileSync(
      path.join(directory, 'package.json'),
      JSON.stringify({ devDependencies: { void: `^${VOID_VERSION}` } }),
    );
    await assert.rejects(deployVoidTarget(directory, run, {}), /exact local/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('default delivery runner forwards stdin without exposing it in arguments', async () => {
  const { defaultRunner } = await import('../dist/project-state.js');
  const input = 'literal\\secret\nwith lines';
  const output = await defaultRunner(
    process.execPath,
    [
      '-e',
      'let x="";process.stdin.on("data",c=>x+=c);process.stdin.on("end",()=>process.stdout.write(String(x.length)))',
    ],
    process.cwd(),
    process.env,
    input,
  );
  assert.equal(output, String(input.length));
});

test('framework public keys remain build values and never enter Void secrets', () => {
  const values = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test',
    EXPO_PUBLIC_API_URL: 'https://example.com',
    VITE_PUBLIC: 'public',
    CLERK_SECRET_KEY: 'sk_test',
  };
  assert.deepEqual(voidServerSecrets(values), { CLERK_SECRET_KEY: 'sk_test' });
  assert.equal(values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, 'pk_test');
});

test('Void deploy stages the designated shared migration set before invoking the CLI', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-void-migration-exec-'));
  const directory = path.join(root, 'apps/api');
  mkdirSync(directory, { recursive: true });
  mkdirSync(path.join(root, 'packages/db/drizzle'), { recursive: true });
  writeFileSync(
    path.join(root, 'packages/db/drizzle/0000_initial.sql'),
    'CREATE TABLE widgets (id TEXT);\n',
  );
  writeFileSync(
    path.join(directory, 'package.json'),
    JSON.stringify({ devDependencies: { void: VOID_VERSION } }),
  );
  writeFileSync(
    path.join(directory, 'anhedral.cloudflare.json'),
    JSON.stringify({
      name: 'test-api',
      d1_databases: [
        { binding: 'DB', database_name: 'test-db', migrations_dir: '../../packages/db/drizzle' },
      ],
    }),
  );
  try {
    const { realpathSync } = await import('node:fs');
    await deployVoidTarget(
      realpathSync(directory),
      async (command, args) => {
        if (command === 'node') return '24.21.0';
        if (args.includes('--version')) return VOID_VERSION;
        if (args.includes('token'))
          return JSON.stringify({ type: 'oauth', token: 'test-oauth-token' });
        assert.equal(
          readFileSync(path.join(directory, 'db/migrations/0000_initial.sql'), 'utf8'),
          'CREATE TABLE widgets (id TEXT);\n',
        );
        return '';
      },
      {},
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Void credential bridge validates structured auth and exposes credentials only to the child environment', async () => {
  const base = { CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), XDG_CONFIG_HOME: '/tmp/auth-test' };
  const calls = [];
  const child = await voidCloudflareEnvironment(
    '/tmp',
    async (command, args) => {
      calls.push([command, ...args]);
      return JSON.stringify({ type: 'oauth', token: 'private-oauth-token' });
    },
    base,
  );
  assert.equal(child.CLOUDFLARE_API_TOKEN, 'private-oauth-token');
  assert.equal(base.CLOUDFLARE_API_TOKEN, undefined);
  assert.equal(JSON.stringify(calls).includes('private-oauth-token'), false);
  assert.deepEqual(calls, [['pnpm', 'exec', 'wrangler', 'auth', 'token', '--json']]);
  for (const value of [
    'not json',
    JSON.stringify({ type: 'global_key', token: 'credential' }),
    JSON.stringify({ type: 'oauth', token: 'bad\nvalue' }),
  ])
    await assert.rejects(
      voidCloudflareEnvironment('/tmp', async () => value, base),
      /credentials|OAuth access/,
    );
});

test('Void consumer lock defaults never promote it into the shared migration owner', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-void-consumer-exec-'));
  const directory = path.join(root, 'apps/web');
  mkdirSync(directory, { recursive: true });
  const source = { name: 'test-web', d1_databases: [{ binding: 'DB', database_name: 'shared' }] };
  writeFileSync(
    path.join(directory, 'package.json'),
    JSON.stringify({ devDependencies: { void: VOID_VERSION } }),
  );
  writeFileSync(path.join(directory, 'anhedral.cloudflare.json'), JSON.stringify(source));
  writeFileSync(
    path.join(directory, 'void.lock.json'),
    JSON.stringify({
      version: 1,
      source,
      resolved: {
        ...source,
        d1_databases: [
          {
            ...source.d1_databases[0],
            database_id: 'recorded-id',
            migrations_dir: './db/migrations',
          },
        ],
      },
      text: JSON.stringify(source),
    }),
  );
  try {
    const { realpathSync, existsSync } = await import('node:fs');
    await deployVoidTarget(
      realpathSync(directory),
      async (command, args) => {
        if (command === 'node') return '24.21.0';
        if (args.includes('--version')) return VOID_VERSION;
        if (args.includes('token'))
          return JSON.stringify({ type: 'oauth', token: 'test-oauth-token' });
        assert.equal(existsSync(path.join(directory, 'db/migrations')), false);
        return '';
      },
      {},
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
