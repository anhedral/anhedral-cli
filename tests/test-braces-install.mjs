import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSyncPortable } from '../scripts/spawn-command.mjs';
import { configureDependencyPatches } from '../dist/dependency-patches.js';
import { verifyBraces } from './support/braces-regressions.mjs';

const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'anhedral-braces-install-')));
// Public test packages must not inherit a developer's registry credentials.
const userconfig = path.join(root, '.npmrc');
writeFileSync(userconfig, 'registry=https://registry.npmjs.org/\n');
const environment = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) =>
      !/^(?:NPM_TOKEN|NODE_AUTH_TOKEN|COREPACK_NPM_TOKEN)$|^npm_config_.*(?:auth|token|password)/i.test(
        key,
      ),
  ),
);
environment.npm_config_userconfig = userconfig;
function run(args, expected = 0) {
  const result = spawnSyncPortable('pnpm', args, {
    cwd: root,
    env: environment,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, expected, `${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
try {
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      private: true,
      packageManager: 'pnpm@10.34.5',
      dependencies: {
        braces: '3.0.3',
        braceAlias: 'npm:braces@3.0.3',
        micromatch: '4.0.8',
        'fast-glob': '3.3.3',
        chokidar: '3.6.0',
      },
    }),
  );
  writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages: []\n');
  run(['install', '--lockfile-only', '--no-frozen-lockfile', '--ignore-scripts']);
  assert.equal(configureDependencyPatches(root), true);
  assert.equal(
    JSON.parse(run(['config', 'get', 'patchedDependencies', '--json']))['braces@3.0.3'],
    path.join(root, 'patches/braces@3.0.3.patch'),
  );
  run(['install', '--lockfile-only', '--no-frozen-lockfile', '--ignore-scripts']);
  const lock = readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8');
  assert.match(lock, /patchedDependencies:/);
  assert.match(lock, /patch_hash=/);
  run(['install', '--frozen-lockfile', '--ignore-scripts']);
  assert.equal(configureDependencyPatches(root), false);
  const patchFile = path.join(root, 'patches/braces@3.0.3.patch');
  const patchBytes = readFileSync(patchFile);
  for (const args of [
    ['init', '--quiet'],
    ['add', '.gitattributes', 'patches'],
  ]) {
    const result = spawnSyncPortable('git', ['-c', 'core.autocrlf=true', ...args], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
  }
  rmSync(patchFile);
  const checkout = spawnSyncPortable(
    'git',
    ['-c', 'core.autocrlf=true', 'checkout', '--', 'patches'],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(checkout.status, 0, checkout.stderr);
  assert.deepEqual(
    readFileSync(patchFile),
    patchBytes,
    'Git checkout preserves exact LF patch bytes',
  );
  writeFileSync(patchFile, Buffer.concat([patchBytes, Buffer.from('\n')]));
  run(['install', '--frozen-lockfile', '--ignore-scripts', '--offline'], 1);
  writeFileSync(patchFile, patchBytes);
  run(['install', '--frozen-lockfile', '--ignore-scripts', '--offline']);
  const require = createRequire(path.join(root, 'package.json'));
  assert.equal(require.resolve('braceAlias'), require.resolve('braces'));
  verifyBraces(path.dirname(require.resolve('braces/package.json')));

  // Real filesystem/glob/watch consumers retain ordinary behavior.
  mkdirSync(path.join(root, 'fixtures'));
  for (const name of ['one.ts', 'two.tsx', 'ignored.txt'])
    writeFileSync(path.join(root, 'fixtures', name), '');
  const glob = require('fast-glob');
  assert.deepEqual(glob.sync('fixtures/*.{ts,tsx}', { cwd: root }).sort(), [
    'fixtures/one.ts',
    'fixtures/two.tsx',
  ]);
  assert.deepEqual(require('micromatch')(['a.ts', 'b.js'], '*.{ts,tsx}'), ['a.ts']);
  const watcher = require('chokidar').watch('fixtures/*.{ts,tsx}', {
    cwd: root,
    persistent: false,
  });
  const seen = [];
  watcher.on('add', (name) => seen.push(name));
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('chokidar readiness timed out')), 10_000);
      watcher.once('ready', () => {
        clearTimeout(timer);
        resolve();
      });
      watcher.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
    assert.deepEqual(seen.sort(), ['fixtures/one.ts', 'fixtures/two.tsx']);
  } finally {
    await watcher.close();
  }

  console.log(
    'Frozen pnpm patch installation, depth regressions, glob/watch compatibility passed.',
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
