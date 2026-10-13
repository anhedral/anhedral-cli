import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { withApplicationLock } from '../dist/project-state.js';
import { readLifecycleOperation, withLifecycleOperation } from '../dist/lifecycle.js';

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-lifecycle-'));
  const run = async (_command, args) => (args.includes('check-ignore') ? args.at(-1) : '');
  return { root, run };
}

test('a shipping lock covers nested phases and rejects an independent concurrent operation', async () => {
  const { root, run } = fixture();
  let release;
  const wait = new Promise((resolve) => {
    release = resolve;
  });
  let started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  try {
    const first = withLifecycleOperation(root, 'cloudflare', run, async (session) => {
      await session.phase('checks', async () =>
        withApplicationLock(root, async () => {
          started();
          await wait;
        }),
      );
      return { state: 'deployed' };
    });
    await ready;
    assert.equal(readLifecycleOperation(root).state, 'running');
    await assert.rejects(
      withApplicationLock(root, async () => {}),
      /Another delivery/,
    );
    release();
    const result = await first;
    assert.equal(result.operation.state, 'completed');
    assert.deepEqual(result.operation.phases, [{ name: 'checks', state: 'completed' }]);
    assert.equal(existsSync(path.join(root, '.anhedral/ship.lock')), false);
  } finally {
    release?.();
    rmSync(root, { recursive: true, force: true });
  }
});

test('failed phases persist sanitized progress and release the lock', async () => {
  const { root, run } = fixture();
  try {
    await assert.rejects(
      withLifecycleOperation(root, 'vercel', run, async (session) => {
        await session.phase('checks', async () => {});
        await session.phase('deployment', async () => {
          throw new Error('private-token customer-data');
        });
      }),
      /private-token/,
    );
    const operation = readLifecycleOperation(root);
    assert.equal(operation.state, 'failed');
    assert.deepEqual(operation.phases, [
      { name: 'checks', state: 'completed' },
      { name: 'deployment', state: 'failed' },
    ]);
    assert.doesNotMatch(
      readFileSync(path.join(root, '.anhedral/operation.json'), 'utf8'),
      /private-token|customer-data/,
    );
    assert.equal(existsSync(path.join(root, '.anhedral/ship.lock')), false);
    const resumed = await withLifecycleOperation(root, 'vercel', run, async () => ({
      state: 'configuration-required',
    }));
    assert.equal(resumed.operation.state, 'blocked');
    assert.notEqual(resumed.operation.id, operation.id);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const state of ['configuration-required', 'provider-configuration-required', 'building']) {
  test(`${state} is a blocked operation, never completed delivery`, async () => {
    const { root, run } = fixture();
    try {
      const result = await withLifecycleOperation(root, 'mobile', run, async () => ({ state }));
      assert.equal(result.operation.state, 'blocked');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test('tracked or unignored journals fail before any state write', async () => {
  for (const mode of ['tracked', 'unignored']) {
    const { root } = fixture();
    try {
      let actions = 0;
      await assert.rejects(
        withLifecycleOperation(
          root,
          'cloudflare',
          async (_command, args) =>
            mode === 'tracked' && args.includes('ls-files') ? args.at(-1) : '',
          async () => {
            actions++;
          },
        ),
        /Ignore/,
      );
      assert.equal(actions, 0);
      assert.equal(existsSync(path.join(root, '.anhedral')), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test('corrupt journal and arbitrary phase names fail closed', async () => {
  const { root, run } = fixture();
  try {
    await withLifecycleOperation(root, 'cloudflare', run, async () => ({}));
    const file = path.join(root, '.anhedral/operation.json');
    writeFileSync(file, '{broken');
    await assert.rejects(
      withLifecycleOperation(root, 'cloudflare', run, async () => ({})),
      /Invalid lifecycle/,
    );
    rmSync(file);
    await assert.rejects(
      withLifecycleOperation(root, 'cloudflare', run, async (session) =>
        session.phase('private\nvalue', async () => {}),
      ),
      /Invalid or duplicate/,
    );
    assert.doesNotMatch(readFileSync(file, 'utf8'), /private/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
