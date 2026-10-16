import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  addStackItems,
  parseStandardOptions,
  scaffoldStandardProject,
  inspectProject,
} from '../dist/index.js';
import { sourceFiles } from '../dist/registry/receipt.js';
import { bootstrap } from './support/workspace-bootstrap.mjs';

const runner = (_command, args, cwd) => {
  if (args[0] === 'dlx')
    bootstrap(path.join(args[args.indexOf('--cwd') + 1], args[args.indexOf('--name') + 1]));
  else if (args.includes('--lockfile-only'))
    writeFileSync(path.join(cwd, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n');
  else throw new Error(`Unexpected command: ${args}`);
};

test('add source previews show staged changes without installing, printing private files or replacing edited source', async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-add-source-preview-'));
  const root = path.join(temporary, 'project');
  try {
    await project(root);
    const before = sourceFiles(root);
    const file = 'packages/email/src/index.ts';
    const cli = spawnSync(
      process.execPath,
      [path.resolve('dist/bin.js'), '--cwd', root, 'add', 'resend', '--diff', file, '--json'],
      { encoding: 'utf8', env: { ...process.env, CI: '1' } },
    );
    assert.equal(cli.status, 0, cli.stderr);
    assert.match(JSON.parse(cli.stdout).previews[0].diff, /createEmail/);
    assert.equal(cli.stderr, '');
    assert.deepEqual(sourceFiles(root), before);
    const diff = await addStackItems(
      root,
      { items: ['resend'], dryRun: true, preview: { mode: 'diff', path: file } },
      runner,
    );
    assert.equal(diff.previews.length, 1);
    assert.match(diff.previews[0].diff, /new file mode|createEmail/);
    assert.equal(existsSync(path.join(root, file)), false);
    assert.deepEqual(sourceFiles(root), before);
    const view = await addStackItems(
      root,
      { items: ['resend'], dryRun: true, preview: { mode: 'view', path: file } },
      runner,
    );
    assert.match(view.previews[0].content, /createEmail/);
    const all = await addStackItems(
      root,
      { items: ['resend'], dryRun: true, preview: { mode: 'view' } },
      runner,
    );
    assert.ok(all.previews.some((preview) => preview.path === '.env.example'));
    assert.ok(all.previews.every((preview) => !preview.path.includes('.anhedral/')));
    await assert.rejects(
      addStackItems(
        root,
        {
          items: ['resend'],
          dryRun: true,
          preview: { mode: 'view', path: '.anhedral/providers.json' },
        },
        runner,
      ),
      /private environment/,
    );
    await assert.rejects(
      addStackItems(
        root,
        { items: ['resend'], dryRun: true, preview: { mode: 'view', path: 'unrelated.ts' } },
        runner,
      ),
      /not a changed generated/,
    );
    await assert.rejects(
      addStackItems(root, { items: ['resend'], preview: { mode: 'diff' } }, runner),
      /require dry-run/,
    );
    await addStackItems(root, { items: ['resend'], skipInstall: true }, runner);
    writeFileSync(path.join(root, file), '// User-owned implementation.\n');
    const edited = sourceFiles(root);
    const conflicted = await addStackItems(
      root,
      { items: ['stripe'], dryRun: true, preview: { mode: 'diff' } },
      runner,
    );
    assert.ok(conflicted.previews.length);
    assert.deepEqual(sourceFiles(root), edited);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
async function project(root, flags = ['--hono']) {
  const log = console.log;
  console.log = () => {};
  try {
    await scaffoldStandardProject(
      parseStandardOptions('new', [root, ...flags, '--skip-install', '--no-git']),
      runner,
    );
  } finally {
    console.log = log;
  }
}
test('add composes bundled bindings while preserving product code', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-add-'));
  const root = path.join(temp, 'app');
  try {
    await project(root);
    const file = path.join(root, 'apps/api/src/index.ts');
    writeFileSync(file, readFileSync(file, 'utf8') + '// Customer implementation stays intact.\n');
    const source = readFileSync(file, 'utf8');
    const before = sourceFiles(root);
    const preview = await addStackItems(
      root,
      { items: ['r2'], dryRun: true, skipInstall: true },
      runner,
    );
    assert.deepEqual(preview.conflicts, []);
    assert.deepEqual(sourceFiles(root), before);
    await addStackItems(root, { items: ['r2'], skipInstall: true }, runner);
    assert.equal(readFileSync(file, 'utf8'), source);
    assert.ok(
      JSON.parse(readFileSync(path.join(root, 'apps/api/anhedral.cloudflare.json'), 'utf8'))
        .r2_buckets,
    );
    assert.equal(inspectProject(root).localReady, true);
    const again = await addStackItems(root, { items: ['r2'], skipInstall: true }, runner);
    assert.deepEqual(again.conflicts, []);
    assert.equal(readFileSync(file, 'utf8'), source);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('Void additions refuse unsupported provisioning contracts without mixing delivery engines', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-add-void-boundary-'));
  const root = path.join(temp, 'app');
  try {
    await project(root);
    const before = sourceFiles(root);
    for (const item of ['queues', 'basin'])
      await assert.rejects(
        addStackItems(root, { items: [item], dryRun: true, skipInstall: true }, runner),
        /explicit engine migration/,
      );
    assert.deepEqual(sourceFiles(root), before);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('add refuses edited source and symlink targets and rolls back failed dependency resolution', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-add-conflict-'));
  const root = path.join(temp, 'app');
  try {
    await project(root, ['--hono', '--styling']);
    const before = sourceFiles(root);
    await assert.rejects(
      addStackItems(root, { items: ['resend'], skipInstall: true }, () => {
        throw new Error('Dependency resolution failed');
      }),
      /Dependency resolution failed/,
    );
    assert.deepEqual(sourceFiles(root), before);
    const turbo = path.join(root, 'turbo.json');
    writeFileSync(
      turbo,
      readFileSync(turbo, 'utf8').replace('"tasks":', '"globalEnv": ["CUSTOM"], "tasks":'),
    );
    const edited = sourceFiles(root);
    const preview = await addStackItems(root, { items: ['resend'], dryRun: true }, runner);
    assert.ok(preview.conflicts.includes('turbo.json'));
    await assert.rejects(
      addStackItems(root, { items: ['resend'], skipInstall: true }, runner),
      /conflicts/,
    );
    assert.deepEqual(sourceFiles(root), edited);
    if (process.platform !== 'win32') {
      symlinkSync(temp, path.join(root, 'packages/unsafe'));
      await assert.rejects(
        addStackItems(root, { items: ['resend'], dryRun: true }, runner),
        /symlink|doctor/,
      );
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('add introduces native and web applications using the shared shadcn foundation', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-add-apps-'));
  const root = path.join(temp, 'app');
  try {
    await project(root, ['--expo']);
    await addStackItems(root, { items: ['vinext'], skipInstall: true }, runner);
    assert.ok(existsSync(path.join(root, 'apps/mobile/package.json')));
    assert.ok(existsSync(path.join(root, 'packages/ui/package.json')));
    assert.equal(inspectProject(root).localReady, true);
    const manifestFile = path.join(root, 'anhedral.project.json');
    const connected = JSON.parse(readFileSync(manifestFile, 'utf8'));
    connected.accountId = 'a'.repeat(32);
    connected.audience = 'public';
    writeFileSync(manifestFile, JSON.stringify(connected, null, 2) + '\n');
    await addStackItems(root, { items: ['electron', 'hono'], skipInstall: true }, runner);
    const delivery = JSON.parse(readFileSync(path.join(root, 'anhedral.project.json'), 'utf8'));
    assert.equal(delivery.accountId, 'a'.repeat(32));
    assert.deepEqual(
      delivery.targets.map((target) => target.id),
      ['api', 'web'],
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('external registry entry points are absent and removed CLI flags fail clearly', async () => {
  const api = await import('../dist/index.js');
  for (const name of [
    'buildSourceRegistry',
    'loadSourceRegistry',
    'validateSourceRegistry',
    'resolveSourceItems',
  ])
    assert.equal(name in api, false);
  assert.equal(existsSync('dist/registry/remote.js'), false);
  for (const args of [
    ['add', '.', 'r2', '--registry', 'https://example.com/registry.json'],
    ['add', '.', 'r2', '--integrity', 'sha256-invalid'],
    ['registry', 'list', '--registry', 'catalog.json'],
    ['registry', 'build', 'manifest.json', '--output', 'catalog.json'],
  ]) {
    const result = spawnSync(process.execPath, ['dist/bin.js', ...args, '--json'], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    const error = JSON.parse(result.stderr);
    assert.notEqual(error.code, 'UNKNOWN_COMMAND');
    assert.match(error.error, /Unknown .* option|Use registry/);
  }
  await assert.rejects(
    addStackItems('.', { items: ['r2'], registry: 'catalog.json' }),
    /Only bundled/,
  );
});

test('doctor rejects receipts with external content instead of accepting it as bundled', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-external-receipt-'));
  const root = path.join(temp, 'app');
  try {
    await project(root);
    const file = path.join(root, 'anhedral.registry.json');
    const receipt = JSON.parse(readFileSync(file, 'utf8'));
    receipt.remoteItems = [{ name: 'external' }];
    writeFileSync(file, JSON.stringify(receipt));
    assert.equal(inspectProject(root).localReady, false);
    await assert.rejects(addStackItems(root, { items: ['r2'] }, runner), /doctor/);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('web additions preview without running the upstream generator or changing source', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-preview-'));
  const root = path.join(temp, 'app');
  try {
    await project(root, ['--expo']);
    const before = sourceFiles(root);
    const receipt = readFileSync(path.join(root, 'anhedral.registry.json'), 'utf8');
    const preview = await addStackItems(root, { items: ['vinext'], dryRun: true }, () => {
      assert.fail('A dry run must not execute a command');
    });
    assert.equal(preview.bootstrapRequired, true);
    assert.equal(preview.filesChecked, false);
    assert.ok(preview.targets.includes('apps/web'));
    assert.deepEqual(sourceFiles(root), before);
    assert.equal(readFileSync(path.join(root, 'anhedral.registry.json'), 'utf8'), receipt);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('bundled addition prepares dependencies after script-free staged lock resolution', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-add-hooks-'));
  const root = path.join(temp, 'app');
  try {
    await project(root);
    mkdirSync(path.join(root, 'node_modules'));
    writeFileSync(path.join(root, 'node_modules/.modules.yaml'), 'skipped: [tslib@2.8.1]\n');
    mkdirSync(path.join(root, '.pnpm-store'));
    writeFileSync(path.join(root, '.pnpm-store/retained'), 'package store');
    const commands = [];
    await addStackItems(root, { items: ['wxt'] }, (command, args, cwd) => {
      commands.push({ command, args, cwd });
      if (args.includes('--lockfile-only')) runner(command, args, cwd);
      if (args.includes('--frozen-lockfile')) {
        assert.equal(existsSync(path.join(root, 'node_modules')), false);
        assert.equal(
          readFileSync(path.join(root, '.pnpm-store/retained'), 'utf8'),
          'package store',
        );
      }
    });
    assert.ok(commands.slice(0, -1).every(({ args }) => args.includes('--ignore-scripts')));
    assert.deepEqual(commands.at(-1), {
      command: 'pnpm',
      args: ['install', '--frozen-lockfile'],
      cwd: realpathSync(root),
    });
    assert.equal(inspectProject(root).localReady, true);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('addition refuses a linked dependency cache without touching its target', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-add-linked-cache-'));
  const root = path.join(temp, 'app');
  try {
    await project(root);
    const outside = path.join(temp, 'outside');
    mkdirSync(outside);
    writeFileSync(path.join(outside, 'retained'), 'customer content');
    symlinkSync(
      outside,
      path.join(root, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    await assert.rejects(
      addStackItems(root, { items: ['r2'] }, runner),
      /real project node_modules/,
    );
    assert.equal(readFileSync(path.join(outside, 'retained'), 'utf8'), 'customer content');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('addition rejects lockfile changes during the frozen dependency installation', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-add-lock-drift-'));
  const root = path.join(temp, 'app');
  try {
    await project(root);
    await assert.rejects(
      addStackItems(root, { items: ['r2'] }, (command, args, cwd) => {
        if (args.includes('--frozen-lockfile'))
          writeFileSync(path.join(cwd, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n# changed\n');
        else runner(command, args, cwd);
      }),
      /changed the reviewed lockfile/,
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('the shared bootstrap blocks native Windows for the default runner', async () => {
  const { assertBootstrapPlatform } = await import('../dist/scaffold/bootstrap.js');
  const { execFile } = await import('../dist/util.js');
  assert.throws(() => assertBootstrapPlatform(execFile, 'win32'), /inside WSL/);
  assert.doesNotThrow(() => assertBootstrapPlatform(execFile, 'linux'));
});
