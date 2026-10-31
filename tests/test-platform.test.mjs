import assert from 'node:assert/strict';
import test from 'node:test';
import { realpath, mkdtemp, writeFile, mkdir, symlink, stat, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runPlatformCommand } from '../dist/platform-command.js';
import { platformOrigin, readPrivate, writePrivate } from '../dist/platform-state.js';
import { packageSource } from '../dist/platform-source.js';
import { unpackSource } from '../dist/contracts/source-bundle.js';
test('CLI login stores device and access secrets without output and rejects redirects/origin changes', async () => {
  let state = null;
  const store = {
    read: async () => state,
    write: async (v) => {
      state = v;
    },
    clear: async () => {
      state = null;
    },
  };
  const log = console.log,
    err = console.error,
    output = [];
  console.log = (v) => output.push(v);
  console.error = () => {};
  const device = {
    device_code: 'private-device-code-123456789',
    user_code: 'ABCD-EFGH',
    verification_uri: 'https://platform-staging.anhedral.com/desktop/connect?client=cli',
    verification_uri_complete:
      'https://platform-staging.anhedral.com/desktop/connect?client=cli&user_code=ABCD-EFGH',
    expires_in: 300,
    interval: 1,
  };
  const token = 'acl_' + 'a'.repeat(64);
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    assert.equal(init.redirect, 'error');
    return Response.json(
      url.endsWith('/code')
        ? device
        : { protocol: 1, token, expiresAt: new Date(Date.now() + 3600000).toISOString() },
    );
  };
  const run = (args) =>
    runPlatformCommand(
      'login',
      [...args, '--api-url', 'https://platform-staging.anhedral.com'],
      { json: true },
      { store, fetch, sleep: async () => {} },
    );
  try {
    await run(['--start']);
    assert.equal(state.device.device_code, device.device_code);
    assert.ok(!output.join('').includes(device.device_code));
    await run(['--resume']);
    assert.equal(state.token, token);
    assert.ok(!output.join('').includes(token));
    assert.equal(calls.length, 2);
    await assert.rejects(
      runPlatformCommand(
        'whoami',
        ['--api-url', 'https://different.example'],
        { json: true },
        { store, fetch },
      ),
      /selected API/,
    );
    assert.equal(calls.length, 2);
    assert.throws(() => platformOrigin('http://example.com'));
    assert.throws(() => platformOrigin('https://user:secret@example.com'));
    assert.throws(() => platformOrigin('https://example.com/path'));
  } finally {
    console.log = log;
    console.error = err;
  }
});
test('private state rejects insecure files and symlinks; source excludes secrets, generated files and nested gitignored files', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'anhedral-source-client-')));
  try {
    const path = join(root, 'private', 'state.json');
    await writePrivate(path, { value: 1 });
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    assert.deepEqual(await readPrivate(path), { value: 1 });
    await symlink(path, join(root, 'alias'));
    await assert.rejects(readPrivate(join(root, 'alias')), /0600/);
    await writeFile(
      join(root, 'anhedral.json'),
      JSON.stringify({ setup: { cliVersion: '0.17.0' } }),
    );
    await writeFile(join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
    await writeFile(join(root, '.env.production'), 'SECRET=hidden');
    await writeFile(join(root, '.gitignore'), 'private/\nalias\nignored.txt\n*.local\n');
    await writeFile(join(root, 'ignored.txt'), 'skip');
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src', '.gitignore'), '*.local\n!keep.local\n');
    await writeFile(join(root, 'src', 'kept.ts'), 'export const value=1;');
    await writeFile(join(root, 'src', 'skip.local'), 'skip');
    await writeFile(join(root, 'src', 'keep.local'), 'kept');
    let source = await packageSource(root),
      files = await unpackSource(source.archive, true);
    assert.ok(files.has('src/kept.ts'));
    assert.ok(files.has('src/keep.local'));
    for (const path of ['.env.production', 'ignored.txt', 'src/skip.local', 'private/state.json'])
      assert.equal(files.has(path), false);
    await symlink(join(root, 'anhedral.json'), join(root, 'unsafe'));
    await assert.rejects(packageSource(root), /symbolic/);
    await rm(join(root, 'unsafe'));
    await writeFile(join(root, 'source-secret.txt'), '-----BEGIN ' + 'PRIVATE KEY-----\nfixture');
    await assert.rejects(packageSource(root), /credential/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
