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
  chmodSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { CAPABILITY_IDS } from '../dist/capability-catalog.js';
import { runCapabilityCommand } from '../dist/capability-command.js';
import { parseStandardOptions, scaffoldStandardProject } from '../dist/standard.js';

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
    await assert.rejects(add(app, ['stripe']), /requires database-auth/);
    assert.deepEqual(snapshot(app), before);
    await add(app, ['stripe', '--with-dependencies']);
    const state = JSON.parse(readFileSync(path.join(app, 'anhedral.json'))).capabilities;
    assert.deepEqual(state.installed, ['hono', 'database-auth', 'stripe']);
    assert.equal(existsSync(path.join(app, 'apps/mobile')), false);
    assert.match(
      readFileSync(path.join(app, 'apps/web/lib/api-proxy.ts'), 'utf8'),
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

test('all capability branches compose offline and repeat additions preserve edited source', async () => {
  const { root, app } = await fixture();
  try {
    await add(app, [...CAPABILITY_IDS]);
    const state = JSON.parse(readFileSync(path.join(app, 'anhedral.json'))).capabilities;
    assert.deepEqual(new Set(state.installed), new Set(CAPABILITY_IDS));
    assert.match(readFileSync(path.join(app, 'apps/mobile/package.json'), 'utf8'), /nativewind/);
    assert.equal(existsSync(path.join(app, 'packages/native-ui')), false);
    assert.match(
      readFileSync(path.join(app, 'apps/extension/anhedral-background.ts'), 'utf8'),
      /sidePanel/,
    );
    assert.match(
      readFileSync(path.join(app, 'apps/desktop/Cargo.toml'), 'utf8'),
      /gpui = \{ version = "=0.2.2"/,
    );
    const file = path.join(app, 'apps/api/src/index.ts');
    writeFileSync(file, readFileSync(file, 'utf8') + '\n// Consumer routes\n');
    const before = snapshot(app);
    await add(app, [...CAPABILITY_IDS]);
    assert.deepEqual(snapshot(app), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('JSONC comments, custom scripts and application source survive sequential additions', async () => {
  const { root, app } = await fixture();
  try {
    await add(app, ['hono']);
    const index = path.join(app, 'apps/api/src/index.ts');
    writeFileSync(index, readFileSync(index, 'utf8') + '\n// owned application behavior\n');
    const config = path.join(app, 'apps/api/wrangler.jsonc');
    writeFileSync(config, '// custom operational note\n' + readFileSync(config, 'utf8'));
    const pkg = path.join(app, 'package.json');
    const value = JSON.parse(readFileSync(pkg));
    value.scripts.custom = 'echo custom';
    writeFileSync(pkg, JSON.stringify(value, null, 2) + '\n');
    await add(app, ['database-auth']);
    assert.match(readFileSync(index, 'utf8'), /owned application behavior/);
    assert.match(readFileSync(config, 'utf8'), /custom operational note/);
    assert.equal(JSON.parse(readFileSync(pkg)).scripts.custom, 'echo custom');
    const owned = path.join(app, 'apps/api/src/capabilities.ts');
    writeFileSync(owned, readFileSync(owned, 'utf8') + '// edited composition\n');
    const before = snapshot(app);
    await assert.rejects(add(app, ['r2']), /Preserve edited generated source/);
    assert.deepEqual(snapshot(app), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a late source collision rejects the whole batch; no earlier API capability is installed', async () => {
  const { root, app } = await fixture();
  try {
    mkdirSync(path.join(app, 'apps/desktop'), { recursive: true });
    writeFileSync(path.join(app, 'apps/desktop/package.json'), '{}\n');
    const before = snapshot(app);
    await assert.rejects(
      add(app, ['gpui', '--with-dependencies']),
      /conflicts with existing source/,
    );
    assert.deepEqual(snapshot(app), before);
    assert.equal(existsSync(path.join(app, 'apps/api')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI dry-run is network-free, includes all files and does not create transaction metadata', async () => {
  const { root, app } = await fixture();
  try {
    const before = snapshot(app);
    const result = spawnSync(
      process.execPath,
      [
        path.resolve('dist/bin.js'),
        'add',
        'revenuecat',
        'side-panel',
        'native-ui',
        '--with-dependencies',
        '--dry-run',
        '--json',
        '--cwd',
        app,
      ],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr);
    const plan = JSON.parse(result.stdout);
    assert.equal(plan.sourceInstalled, false);
    assert.ok(plan.added.includes('hono'));
    assert.ok(plan.files.includes('apps/mobile/components.json'));
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
    await assert.rejects(add(app, ['hono']), /symlink/);
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
        runCapabilityCommand('add', ['hono'], { quiet: true }, () => {
          throw Error('fixture install failure');
        }),
      ),
      /committed|fixture install failure/,
    );
    assert.ok(existsSync(path.join(app, 'apps/api/src/index.ts')));
    assert.deepEqual(
      JSON.parse(readFileSync(path.join(app, 'anhedral.json'))).capabilities.installed,
      ['hono'],
    );
    const source = snapshot(path.join(app, 'apps/api'));
    const calls = [];
    await inside(app, () =>
      runCapabilityCommand('add', ['hono'], { quiet: true }, (_cmd, args) => {
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

test('sequential clients preserve product source, background behavior and configuration permissions', async () => {
  const { root, app } = await fixture();
  try {
    await add(app, ['expo', 'wxt', '--with-dependencies']);
    const background = path.join(app, 'apps/extension/entrypoints/background.ts');
    const mobile = path.join(app, 'apps/mobile/App.tsx');
    for (const file of [background, mobile])
      writeFileSync(file, readFileSync(file, 'utf8') + '\n// Product customization\n');
    const originalBackground = readFileSync(background, 'utf8');
    const originalMobile = readFileSync(mobile, 'utf8');
    const manifest = path.join(app, 'apps/mobile/package.json');
    chmodSync(manifest, 0o600);
    await add(app, ['native-ui', 'side-panel']);
    assert.equal(readFileSync(background, 'utf8'), originalBackground);
    assert.equal(readFileSync(mobile, 'utf8'), originalMobile);
    if (process.platform !== 'win32') assert.equal(statSync(manifest).mode & 0o777, 0o600);
    assert.ok(existsSync(path.join(app, 'apps/mobile/UPSTREAM.json')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
