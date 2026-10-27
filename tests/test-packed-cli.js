import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSyncPortable } from '../scripts/spawn-command.mjs';
import { parseNpmPackJson } from './support/npm-pack.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const npmCache = mkdtempSync(path.join(tmpdir(), 'anhedral-npm-cache-'));

function run(command, args, cwd) {
  const result = spawnSyncPortable(command, args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      npm_config_cache: npmCache,
      ANHEDRAL_PLUGIN_DATA: path.join(npmCache, 'plugin-data'),
    },
  });
  const stdout = String(result.stdout ?? '');
  const stderr = String(result.stderr ?? '');
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(' ')} failed\nstdout:\n${stdout}\nstderr:\n${stderr}`,
  );
  return { stdout, stderr };
}

function runInstalledCli(cwd) {
  const binRoot = path.join(cwd, 'node_modules', '.bin');
  const binPath = path.join(binRoot, process.platform === 'win32' ? 'anhedral.cmd' : 'anhedral');
  assert.equal(existsSync(binPath), true, `installed CLI shim should exist at ${binPath}`);

  return run(binPath, ['--help'], cwd);
}

function runInstalledScaffold(installRoot) {
  const binRoot = path.join(installRoot, 'node_modules', '.bin');
  const binPath = path.join(binRoot, process.platform === 'win32' ? 'anhedral.cmd' : 'anhedral');
  const projectRoot = path.join(installRoot, 'packed-project');
  const plan = JSON.parse(
    run(binPath, ['init', projectRoot, '--dry-run', '--json'], installRoot).stdout,
  );
  assert.deepEqual(plan.products, ['next', 'styling']);
  assert.equal(existsSync(projectRoot), false);
  const created = JSON.parse(
    run(binPath, ['init', projectRoot, '--no-git', '--json'], installRoot).stdout,
  );
  assert.equal(created.generated, true);
  assert.ok(existsSync(path.join(projectRoot, 'pnpm-lock.yaml')));
  assert.ok(existsSync(path.join(projectRoot, 'apps/web/node_modules/next/package.json')));
  assert.equal(existsSync(path.join(projectRoot, 'apps/mobile')), false);
  assert.ok(existsSync(path.join(projectRoot, 'apps/web/.anhedral-ui.json')));
  const catalog = JSON.parse(run(binPath, ['ui', 'list', '--json'], installRoot).stdout);
  assert.ok(catalog.components.some((item) => item.name === 'button' && item.web && item.native));
  for (const name of ['auth', 'billing', 'managed-email'])
    assert.equal(existsSync(path.join(projectRoot, 'packages', name)), false);
  assert.equal(existsSync(path.join(projectRoot, '.anhedral')), false);
  const stack = JSON.parse(
    run(binPath, ['stack', 'list', '--json', '--cwd', projectRoot], installRoot).stdout,
  );
  assert.equal(stack.capabilities.length, 13);
  const addition = JSON.parse(
    run(binPath, ['add', 'hono', '--skip-install', '--json', '--cwd', projectRoot], installRoot)
      .stdout,
  );
  assert.equal(addition.sourceInstalled, true);
  assert.ok(existsSync(path.join(projectRoot, 'apps/api/src/index.ts')));
  assert.ok(existsSync(path.join(projectRoot, 'docs/anhedral/capabilities.md')));
  for (const command of ['inspect', 'ship', 'auth', 'services']) {
    const result = spawnSyncPortable(
      process.execPath,
      [path.join(installRoot, 'node_modules/anhedral/dist/bin.js'), command, '--json'],
      { cwd: installRoot, encoding: 'utf8' },
    );
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).code, 'UNKNOWN_COMMAND');
  }
}

function resolveProvidedTarball(argument) {
  const providedPath = path.resolve(argument);
  if (!providedPath.endsWith('.json')) return providedPath;

  const metadata = JSON.parse(readFileSync(providedPath, 'utf8'));
  assert.equal(
    metadata.filename,
    path.basename(metadata.filename),
    'artifact filename must be a basename',
  );
  return path.join(path.dirname(providedPath), metadata.filename);
}

let ownsTarball = false;
let tarballPath;

if (process.argv[2]) {
  tarballPath = resolveProvidedTarball(process.argv[2]);
  assert.equal(existsSync(tarballPath), true, `provided tarball should exist at ${tarballPath}`);
} else {
  const packResult = run(npmCommand, ['pack', '--json', '--ignore-scripts'], repoRoot);
  const packed = parseNpmPackJson(packResult.stdout);
  const tarballName = packed[0]?.filename;
  assert.equal(typeof tarballName, 'string', 'npm pack should report a tarball filename');
  tarballPath = path.join(repoRoot, tarballName);
  ownsTarball = true;
}

const installRoot = mkdtempSync(path.join(tmpdir(), 'anhedral-packed-cli-'));

try {
  run(
    npmCommand,
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarballPath],
    installRoot,
  );
  const packageJson = JSON.parse(
    readFileSync(path.join(installRoot, 'node_modules/anhedral/package.json'), 'utf8'),
  );
  const patch = readFileSync(
    path.join(installRoot, 'node_modules/anhedral/assets/patches/braces@3.0.3.patch'),
    'utf8',
  );
  assert.match(patch, /diff --git/);
  assert.ok(
    existsSync(path.join(installRoot, 'node_modules/anhedral/assets/patches/LICENSE.braces')),
  );
  assert.equal(packageJson.bin.anhedral, 'dist/bin.js');
  assert.equal(packageJson.types, './dist/index.d.ts');
  assert.match(runInstalledCli(installRoot).stdout, /anhedral init/);
  runInstalledScaffold(installRoot);
  assert.equal(existsSync(path.join(npmCache, 'plugin-data')), false);
  run(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import path from 'node:path';
    import { pathToFileURL } from 'node:url';
    const installed = path.resolve('node_modules/anhedral');
    const { configureDependencyPatches, writeDependencyAudit } = await import(pathToFileURL(path.join(installed, 'dist/dependency-patches.js')));
    const root = path.resolve('installed-patch-probe');
    fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, 'package.json'), '{}');
    fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages: []' + String.fromCharCode(10));
    fs.writeFileSync(path.join(root, 'pnpm-lock.yaml'), ['packages:', '  braces@3.0.3:', '  node-forge@1.4.0:', ''].join(String.fromCharCode(10)));
    writeDependencyAudit(root);
    assert.deepEqual(fs.readFileSync(path.join(root, 'scripts/audit-deps.mjs')), fs.readFileSync(path.join(installed, 'assets/patches/audit-deps.mjs')));
    assert.equal(configureDependencyPatches(root), true);
    for (const name of ['braces@3.0.3.patch', 'LICENSE.braces', 'node-forge@1.4.0.patch', 'LICENSE.node-forge'])
      assert.deepEqual(fs.readFileSync(path.join(root, 'patches', name)), fs.readFileSync(path.join(installed, 'assets/patches', name)));
    assert.equal(configureDependencyPatches(root), false);
  `,
    ],
    installRoot,
  );
  const imported = run(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      [
        "const packageApi = await import('anhedral');",
        "if (typeof packageApi.scaffoldStandardProject !== 'function') throw new Error('missing scaffoldStandardProject export');",
        "if (typeof packageApi.parseStandardOptions !== 'function') throw new Error('missing parseStandardOptions export');",
      ].join('\n'),
    ],
    installRoot,
  );
  assert.equal(imported.stdout, '');
} finally {
  rmSync(installRoot, { recursive: true, force: true });
  rmSync(npmCache, { recursive: true, force: true });
  if (ownsTarball) unlinkSync(tarballPath);
}

console.log('Packed CLI smoke test passed');
