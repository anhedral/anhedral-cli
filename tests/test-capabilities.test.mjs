import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CAPABILITY_IDS } from '../dist/capability-catalog.js';
import { runCapabilityCommand } from '../dist/capability-command.js';
import {
  parseInitOptions as parseStandardOptions,
  scaffoldAnhedralStack as scaffoldStandardProject,
} from '../dist/index.js';

const offline = () => {
  throw Error('No external commands in source tests');
};
async function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-add-'));
  const app = path.join(root, 'app');
  await scaffoldStandardProject(
    parseStandardOptions([app, '--skip-install', '--no-git']),
    offline,
    { quiet: true },
  );
  return { root, app };
}
function snapshot(root) {
  return Object.fromEntries(
    readdirSync(root, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const file = path.join(entry.parentPath, entry.name);
        return [path.relative(root, file), readFileSync(file, 'utf8')];
      })
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}
async function inside(root, fn) {
  const before = process.cwd();
  process.chdir(root);
  try {
    return await fn();
  } finally {
    process.chdir(before);
  }
}
const add = (app, args, runner = offline) =>
  inside(app, () =>
    runCapabilityCommand('add', [...args, '--skip-install'], { quiet: true }, runner),
  );

test('prerequisites fail before writes; explicitly requested dependency expansion follows the core order', async () => {
  const { root, app } = await fixture();
  try {
    const before = snapshot(app);
    await assert.rejects(add(app, ['stripe']), /require backend/);
    assert.deepEqual(snapshot(app), before);
    await add(app, ['stripe', '--with-dependencies']);
    const state = JSON.parse(readFileSync(path.join(app, 'anhedral.json'))).capabilities;
    assert.deepEqual(state.installed, ['hono', 'database-auth', 'stripe']);
    assert.equal(existsSync(path.join(app, 'apps/mobile')), false);
    assert.match(
      readFileSync(path.join(app, 'apps/web/src/lib/api-proxy.ts'), 'utf8'),
      /stripe-signature/,
    );
    assert.match(
      readFileSync(path.join(app, 'apps/api/src/auth-features.ts'), 'utf8'),
      /emailPassword: false/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('all three additions compose offline and repeat additions preserve customer source', async () => {
  const { root, app } = await fixture();
  try {
    await add(app, ['backend', 'r2', 'stripe']);
    const installed = JSON.parse(readFileSync(path.join(app, 'anhedral.json'))).capabilities
      .installed;
    assert.deepEqual(new Set(installed), new Set(CAPABILITY_IDS));
    for (const name of ['mobile', 'extension', 'desktop'])
      assert.equal(existsSync(path.join(app, 'apps', name)), false);
    const file = path.join(app, 'apps/api/src/index.ts');
    writeFileSync(file, readFileSync(file, 'utf8') + '\n// Customer routes\n');
    const before = snapshot(app);
    await add(app, ['backend', 'r2', 'stripe']);
    assert.deepEqual(snapshot(app), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('JSONC comments, custom scripts and application source survive sequential additions', async () => {
  const { root, app } = await fixture();
  try {
    await add(app, ['backend']);
    const index = path.join(app, 'apps/api/src/index.ts');
    writeFileSync(index, readFileSync(index, 'utf8') + '\n// owned application behavior\n');
    const config = path.join(app, 'apps/api/wrangler.jsonc');
    writeFileSync(config, '// custom operational note\n' + readFileSync(config, 'utf8'));
    const pkg = path.join(app, 'package.json');
    const value = JSON.parse(readFileSync(pkg));
    value.scripts.custom = 'echo custom';
    writeFileSync(pkg, JSON.stringify(value, null, 2) + '\n');
    await add(app, ['r2']);
    assert.match(readFileSync(index, 'utf8'), /owned application behavior/);
    assert.match(readFileSync(config, 'utf8'), /custom operational note/);
    assert.equal(JSON.parse(readFileSync(pkg)).scripts.custom, 'echo custom');
    const owned = path.join(app, 'apps/api/src/capabilities.ts');
    writeFileSync(owned, readFileSync(owned, 'utf8') + '// edited composition\n');
    const before = snapshot(app);
    await assert.rejects(add(app, ['stripe']), /Preserve edited generated source/);
    assert.deepEqual(snapshot(app), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a late source collision rejects the entire atomic backend addition', async () => {
  const { root, app } = await fixture();
  try {
    mkdirSync(path.join(app, 'apps/api/src'), { recursive: true });
    writeFileSync(path.join(app, 'apps/api/src/auth-features.ts'), '// Customer source');
    const before = snapshot(app);
    await assert.rejects(add(app, ['backend']), /conflicts with existing source/);
    assert.deepEqual(snapshot(app), before);
    assert.equal(existsSync(path.join(app, 'apps/api/src/index.ts')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('single-stack recipe dry-run is network-free, includes all files and does not create transaction metadata', async () => {
  const { root, app } = await fixture();
  try {
    const before = snapshot(app);
    let stdout = '';
    await inside(app, () =>
      runCapabilityCommand(
        'add',
        ['backend', 'r2', 'stripe', '--with-dependencies', '--dry-run'],
        {
          json: true,
          io: {
            out: {
              write: (text) => {
                stdout += text;
              },
            },
            err: { write: () => {} },
            stdinTTY: false,
            stdoutTTY: false,
            stderrTTY: false,
          },
        },
        offline,
      ),
    );
    const plan = JSON.parse(stdout);
    assert.equal(plan.sourceInstalled, false);
    assert.ok(plan.added.includes('backend'));
    assert.ok(plan.files.includes('apps/api/src/auth.ts'));
    assert.equal(plan.activation, 'not verified');
    assert.deepEqual(snapshot(app), before);
    assert.equal(existsSync(path.join(app, '.anhedral-txn')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('symlinked targets are rejected without touching the linked tree', async () => {
  const { root, app } = await fixture();
  try {
    const external = path.join(root, 'external');
    mkdirSync(external);
    symlinkSync(
      external,
      path.join(app, 'apps/api'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    await assert.rejects(add(app, ['backend']), /symlink/);
    assert.deepEqual(readdirSync(external), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('dependency install failure retains the committed source with a recoverable post-commit error', async () => {
  const { root, app } = await fixture();
  try {
    await assert.rejects(
      inside(app, () =>
        runCapabilityCommand('add', ['backend'], { quiet: true }, () => {
          throw Error('fixture install failure');
        }),
      ),
      /committed|fixture install failure/,
    );
    assert.ok(existsSync(path.join(app, 'apps/api/src/index.ts')));
    assert.deepEqual(
      JSON.parse(readFileSync(path.join(app, 'anhedral.json'))).capabilities.installed,
      ['hono', 'database-auth'],
    );
    const source = snapshot(path.join(app, 'apps/api'));
    const calls = [];
    await inside(app, () =>
      runCapabilityCommand('add', ['backend'], { quiet: true }, (_cmd, args) => {
        calls.push(args);
        writeFileSync(path.join(app, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
      }),
    );
    assert.deepEqual(calls, [
      ['install', '--lockfile-only', '--no-frozen-lockfile'],
      ['install', '--frozen-lockfile'],
    ]);
    assert.deepEqual(snapshot(path.join(app, 'apps/api')), source);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
