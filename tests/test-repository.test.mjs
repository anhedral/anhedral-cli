import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setupRepository } from '../dist/repository.js';
function fixture(options = {}) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'anhedral-repository-')));
  const calls = [];
  let origin = !!options.existing;
  const sha = 'a'.repeat(40);
  const run = async (command, args) => {
    calls.push([command, ...args]);
    if (command === 'gh') {
      if (args[0] === 'api')
        return args[1] === 'user' ? JSON.stringify({ login: 'customer' }) : '123';
      if (args[1] === 'create') {
        origin = true;
        return '';
      }
      return JSON.stringify({
        nameWithOwner: options.otherOwner ? 'other/app' : 'customer/app',
        url: 'https://github.com/customer/app',
        isPrivate: !options.public,
        viewerPermission: options.readOnly ? 'READ' : 'ADMIN',
        owner: { login: 'customer' },
      });
    }
    if (args[0] === 'rev-parse')
      return args.includes('--show-toplevel') ? (options.parent ? path.dirname(root) : root) : sha;
    if (args[0] === 'status') return options.dirty ? ' M app.ts' : '';
    if (args[0] === 'remote')
      return args.length === 1
        ? origin
          ? 'origin'
          : ''
        : options.credentials
          ? ['https://token', 'github.com/customer/app.git'].join('@')
          : args.includes('--push') && options.otherPush
            ? ['git', 'github.com:other/app.git'].join('@')
            : ['git', 'github.com:customer/app.git'].join('@');
    if (args[0] === 'symbolic-ref') return 'main';
    if (args[0] === 'push') return '';
    if (args[0] === 'ls-remote')
      return `${options.wrongCommit ? 'b'.repeat(40) : sha}\trefs/heads/main`;
    throw new Error('Unexpected command');
  };
  return { root, calls, run };
}
test('repository setup creates a private customer repo and confirms the pushed commit', async () => {
  const f = fixture();
  try {
    const result = await setupRepository(
      f.root,
      { name: 'app', visibility: 'private', create: true },
      f.run,
    );
    assert.equal(result.repository.nameWithOwner, 'customer/app');
    assert.ok(f.calls.some((call) => call.includes('--private')));
    assert.ok(f.calls.some((call) => call.includes('HEAD:refs/heads/main')));
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});
test('repository setup reuses matching origins without recreating repositories', async () => {
  const f = fixture({ existing: true });
  try {
    await setupRepository(f.root, { name: 'app', visibility: 'private' }, f.run);
    assert.equal(
      f.calls.some((call) => call.includes('create')),
      false,
    );
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});
test('unsafe source, origin, ownership, visibility and permissions prevent pushing', async () => {
  for (const options of [
    { parent: true },
    { dirty: true },
    { credentials: true },
    { otherPush: true },
    { otherOwner: true },
    { public: true },
    { readOnly: true },
  ]) {
    const f = fixture({ existing: true, ...options });
    try {
      await assert.rejects(setupRepository(f.root, { name: 'app', visibility: 'private' }, f.run));
      assert.equal(
        f.calls.some((call) => call.includes('push')),
        false,
      );
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  }
});
test('repository setup requires creation intent and detects unconfirmed push', async () => {
  for (const options of [{}, { existing: true, wrongCommit: true }]) {
    const f = fixture(options);
    try {
      await assert.rejects(setupRepository(f.root, { name: 'app', visibility: 'private' }, f.run));
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  }
});
