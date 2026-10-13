import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { spawnSync, spawn } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  lstatSync,
  chmodSync,
  symlinkSync,
  renameSync,
} from 'node:fs';
import { tmpdir, hostname } from 'node:os';
import path from 'node:path';
import { withApplicationLock, recoverDeliveryLock } from '../dist/project-state.js';

const LOCK_MODULE = new URL('../dist/project-state.js', import.meta.url).href;
const fixture = () => mkdtempSync(path.join(tmpdir(), 'anhedral-delivery-lock-'));
const owner = (overrides = {}) => ({
  schemaVersion: 1,
  pid: process.pid,
  host: hostname(),
  token: randomUUID(),
  createdAt: new Date().toISOString(),
  ...overrides,
});
const lockPath = (root) => path.join(root, '.anhedral/ship.lock');
const ownerPath = (root) => path.join(lockPath(root), 'owner.json');
function writeOwner(root, value) {
  mkdirSync(lockPath(root), { recursive: true, mode: 0o700 });
  writeFileSync(ownerPath(root), JSON.stringify(value), { mode: 0o600 });
}
function deadOwner() {
  const child = spawnSync(process.execPath, ['-e', '']);
  assert.ok(child.pid);
  return owner({ pid: child.pid });
}

test('delivery lock has private owner evidence and nested phases preserve one owner', async () => {
  const root = fixture();
  try {
    let original;
    const result = await withApplicationLock(root, async () => {
      original = JSON.parse(readFileSync(ownerPath(root)));
      assert.equal(original.pid, process.pid);
      assert.equal(original.host, hostname());
      assert.equal(existsSync(path.join(root, '.anhedral/ship.guard')), false);
      if (process.platform !== 'win32') {
        assert.equal(lstatSync(lockPath(root)).mode & 0o777, 0o700);
        assert.equal(lstatSync(ownerPath(root)).mode & 0o777, 0o600);
      }
      return withApplicationLock(root, async () => {
        assert.deepEqual(JSON.parse(readFileSync(ownerPath(root))), original);
        return 'complete';
      });
    });
    assert.equal(result, 'complete');
    assert.equal(existsSync(lockPath(root)), false);
    assert.equal(existsSync(path.join(root, '.anhedral/ship.guard')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('delivery failure releases only its own lock and preserves provider receipts', async () => {
  const root = fixture();
  try {
    mkdirSync(path.join(root, '.anhedral'));
    const file = path.join(root, '.anhedral/providers.json');
    writeFileSync(file, 'provider receipt evidence');
    await assert.rejects(
      withApplicationLock(root, async () => {
        throw new Error('operation failure');
      }),
      /operation failure/,
    );
    assert.equal(existsSync(lockPath(root)), false);
    assert.equal(readFileSync(file, 'utf8'), 'provider receipt evidence');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('independent deliveries and explicit recovery cannot interrupt an active owner', async () => {
  const root = fixture();
  let finish;
  let started;
  const pause = new Promise((resolve) => {
    finish = resolve;
  });
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  const first = withApplicationLock(root, async () => {
    started();
    await pause;
  });
  try {
    await ready;
    await assert.rejects(
      withApplicationLock(root, async () => assert.fail('second delivery ran')),
      /Another delivery/,
    );
    assert.throws(() => recoverDeliveryLock(root), /still running/);
    assert.equal(existsSync(ownerPath(root)), true);
    finish();
    await first;
  } finally {
    finish();
    await first.catch(() => undefined);
    rmSync(root, { recursive: true, force: true });
  }
});

test('explicit dead-owner recovery removes the lock without provider replay or state erasure', () => {
  const root = fixture();
  try {
    writeOwner(root, deadOwner());
    const receipt = path.join(root, '.anhedral/operation.json');
    writeFileSync(receipt, 'interrupted operation evidence');
    const result = recoverDeliveryLock(root);
    assert.equal(result.recovered, true);
    assert.equal(result.providerReplay, false);
    assert.equal(result.mutation, 'local-lock-only');
    assert.equal(existsSync(lockPath(root)), false);
    assert.equal(readFileSync(receipt, 'utf8'), 'interrupted operation evidence');
    assert.equal(recoverDeliveryLock(root).recovered, false);
    assert.doesNotMatch(
      JSON.stringify(result),
      new RegExp(`${hostname().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${process.pid}`),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const invalid of [
  null,
  [],
  {},
  owner({ schemaVersion: 2 }),
  owner({ pid: -1 }),
  owner({ pid: 2147483648 }),
  owner({ token: 'invalid' }),
  owner({ createdAt: 'invalid' }),
  owner({ unexpected: 'provider-secret' }),
])
  test('malformed lock evidence is preserved without echoing its data', () => {
    const root = fixture();
    try {
      writeOwner(root, invalid);
      const original = readFileSync(ownerPath(root));
      assert.throws(
        () => recoverDeliveryLock(root),
        (error) => {
          assert.match(error.message, /ownership changed or is invalid/);
          assert.doesNotMatch(error.message, /provider-secret/);
          return true;
        },
      );
      assert.deepEqual(readFileSync(ownerPath(root)), original);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

test('legacy directory-only locks remain intact and block delivery', async () => {
  const root = fixture();
  try {
    mkdirSync(lockPath(root), { recursive: true, mode: 0o700 });
    assert.throws(() => recoverDeliveryLock(root), /ownership changed or is invalid/);
    await assert.rejects(
      withApplicationLock(root, async () => assert.fail('legacy lock bypassed')),
      /Another delivery/,
    );
    assert.equal(existsSync(lockPath(root)), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a foreign-host lock remains intact even when its PID is dead locally', () => {
  const root = fixture();
  try {
    writeOwner(root, { ...deadOwner(), host: 'foreign-host.invalid' });
    assert.throws(() => recoverDeliveryLock(root), /another host/);
    assert.equal(existsSync(ownerPath(root)), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('permission-denied owner probes cannot establish stale ownership', () => {
  const root = fixture();
  const originalKill = process.kill;
  try {
    writeOwner(root, owner());
    process.kill = () => {
      throw Object.assign(new Error('private process diagnostic'), { code: 'EPERM' });
    };
    assert.throws(() => recoverDeliveryLock(root), /Cannot prove/);
    assert.equal(existsSync(ownerPath(root)), true);
  } finally {
    process.kill = originalKill;
    rmSync(root, { recursive: true, force: true });
  }
});

for (const mode of ['owner', 'lock', 'state'])
  test(
    `shared ${mode} permissions are rejected before recovery`,
    { skip: process.platform === 'win32' },
    () => {
      const root = fixture();
      try {
        writeOwner(root, deadOwner());
        chmodSync(
          mode === 'owner'
            ? ownerPath(root)
            : mode === 'lock'
              ? lockPath(root)
              : path.join(root, '.anhedral'),
          mode === 'owner' ? 0o644 : 0o777,
        );
        assert.throws(
          () => recoverDeliveryLock(root),
          /ownership changed or is invalid|shared write permissions/,
        );
        assert.equal(existsSync(ownerPath(root)), true);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

for (const kind of ['state', 'lock', 'owner'])
  test(
    `symbolic ${kind} paths are rejected without altering their targets`,
    { skip: process.platform === 'win32' },
    () => {
      const root = fixture(),
        external = fixture();
      try {
        writeOwner(root, deadOwner());
        const marker = path.join(external, 'preserve');
        writeFileSync(marker, 'external evidence');
        const file =
          kind === 'state'
            ? path.join(root, '.anhedral')
            : kind === 'lock'
              ? lockPath(root)
              : ownerPath(root);
        rmSync(file, { recursive: true });
        symlinkSync(kind === 'owner' ? marker : external, file, kind === 'owner' ? 'file' : 'dir');
        assert.throws(
          () => recoverDeliveryLock(root),
          /regular directory|ownership changed or is invalid/,
        );
        assert.equal(readFileSync(marker, 'utf8'), 'external evidence');
        assert.equal(existsSync(path.join(external, 'ship.guard')), false);
      } finally {
        rmSync(root, { recursive: true, force: true });
        rmSync(external, { recursive: true, force: true });
      }
    },
  );

for (const kind of ['foreign token', 'replaced owner file', 'changed owner PID', 'extra evidence'])
  test(`finally preserves a lock with ${kind}`, async () => {
    const root = fixture();
    try {
      await assert.rejects(
        withApplicationLock(root, async () => {
          const original = JSON.parse(readFileSync(ownerPath(root)));
          if (kind === 'foreign token')
            writeFileSync(ownerPath(root), JSON.stringify({ ...original, token: randomUUID() }));
          if (kind === 'changed owner PID')
            writeFileSync(ownerPath(root), JSON.stringify({ ...original, pid: original.pid + 1 }));
          if (kind === 'replaced owner file') {
            const replacement = path.join(root, '.anhedral/replacement');
            writeFileSync(replacement, JSON.stringify(original), { mode: 0o600 });
            renameSync(replacement, ownerPath(root));
          }
          if (kind === 'extra evidence')
            writeFileSync(path.join(lockPath(root), 'preserve'), 'operation evidence');
        }),
        /ownership changed or is invalid/,
      );
      assert.equal(existsSync(ownerPath(root)), true);
      if (kind === 'extra evidence')
        assert.equal(
          readFileSync(path.join(lockPath(root), 'preserve'), 'utf8'),
          'operation evidence',
        );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

test('nested phases stop if the original ownership was replaced', async () => {
  const root = fixture();
  let mutations = 0;
  try {
    await assert.rejects(
      withApplicationLock(root, async () => {
        const original = JSON.parse(readFileSync(ownerPath(root)));
        writeFileSync(ownerPath(root), JSON.stringify({ ...original, token: randomUUID() }));
        await withApplicationLock(root, async () => {
          mutations++;
        });
      }),
      /ownership changed or is invalid/,
    );
    assert.equal(mutations, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('an occupied recovery guard blocks writers and recovery without removing either record', async () => {
  const root = fixture();
  try {
    writeOwner(root, deadOwner());
    const guard = path.join(root, '.anhedral/ship.guard');
    writeFileSync(guard, 'uncertain guard evidence', { mode: 0o600 });
    assert.throws(() => recoverDeliveryLock(root), /acquisition or recovery is busy/);
    await assert.rejects(
      withApplicationLock(root, async () => assert.fail('guard bypassed')),
      /acquisition or recovery is busy/,
    );
    assert.equal(readFileSync(guard, 'utf8'), 'uncertain guard evidence');
    assert.equal(existsSync(ownerPath(root)), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test(
  'state-directory replacement cannot make finally write outside the application',
  { skip: process.platform === 'win32' },
  async () => {
    const root = fixture(),
      external = fixture();
    try {
      await assert.rejects(
        withApplicationLock(root, async () => {
          renameSync(path.join(root, '.anhedral'), path.join(root, '.anhedral-original'));
          symlinkSync(external, path.join(root, '.anhedral'), 'dir');
        }),
        /ownership changed or is invalid/,
      );
      assert.equal(existsSync(path.join(external, 'ship.guard')), false);
      assert.equal(existsSync(path.join(root, '.anhedral-original/ship.lock/owner.json')), true);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(external, { recursive: true, force: true });
    }
  },
);

test('a real terminated delivery can be recovered only after its process exits', async () => {
  const root = fixture();
  const script = `import { withApplicationLock } from ${JSON.stringify(LOCK_MODULE)}; await withApplicationLock(${JSON.stringify(root)}, async () => { process.stdout.write('ready\\n'); await new Promise(() => { setInterval(() => {}, 1000); }); });`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', script], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const exited = new Promise((resolve) => child.once('exit', resolve));
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Delivery child did not start.')), 5000);
      child.stdout.once('data', (bytes) => {
        clearTimeout(timer);
        if (bytes.toString().trim() === 'ready') resolve();
        else reject(new Error('Unexpected child state.'));
      });
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
    assert.throws(() => recoverDeliveryLock(root), /still running/);
    child.kill('SIGKILL');
    await exited;
    assert.equal(recoverDeliveryLock(root).recovered, true);
    assert.equal(existsSync(lockPath(root)), false);
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await exited;
    rmSync(root, { recursive: true, force: true });
  }
});

test('asynchronous descendants cannot reuse a released lock context', async () => {
  const root = fixture();
  let initialToken, later;
  try {
    await withApplicationLock(root, async () => {
      initialToken = JSON.parse(readFileSync(ownerPath(root))).token;
      later = new Promise((resolve, reject) =>
        setTimeout(() => {
          withApplicationLock(
            root,
            async () => JSON.parse(readFileSync(ownerPath(root))).token,
          ).then(resolve, reject);
        }, 10),
      );
    });
    assert.notEqual(await later, initialToken);
    assert.equal(existsSync(lockPath(root)), false);
  } finally {
    await later?.catch(() => undefined);
    rmSync(root, { recursive: true, force: true });
  }
});

test('delivery cleanup waits briefly for a simultaneous guard owner without replaying work', async () => {
  const root = fixture();
  let runs = 0;
  try {
    const result = await withApplicationLock(root, async () => {
      runs++;
      const guard = path.join(root, '.anhedral/ship.guard');
      writeFileSync(guard, 'another short transition', { mode: 0o600 });
      setTimeout(() => rmSync(guard), 20);
      return 'delivered';
    });
    assert.equal(result, 'delivered');
    assert.equal(runs, 1);
    assert.equal(existsSync(lockPath(root)), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
