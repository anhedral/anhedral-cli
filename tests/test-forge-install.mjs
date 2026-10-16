// Real frozen pnpm installation and signature regressions, including browser bundles.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSyncPortable } from '../scripts/spawn-command.mjs';
import { configureDependencyPatches } from '../dist/dependency-patches.js';
import { verifyForge } from './support/forge-regressions.mjs';

const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'anhedral-forge-install-')));
const environment = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) =>
      !/^(?:NPM_TOKEN|NODE_AUTH_TOKEN|COREPACK_NPM_TOKEN)$|^npm_config_.*(?:auth|token|password)/i.test(
        key,
      ),
  ),
);
environment.npm_config_userconfig = path.join(root, '.npmrc');
writeFileSync(environment.npm_config_userconfig, 'registry=https://registry.npmjs.org/\n');
function run(args, expected = 0) {
  const result = spawnSyncPortable('pnpm', args, {
    cwd: root,
    env: environment,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.ifError(result.error);
  assert.equal(result.status, expected, `${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout + result.stderr;
}
try {
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      private: true,
      packageManager: 'pnpm@10.34.5',
      dependencies: { 'node-forge': '1.4.0', forgeAlias: 'npm:node-forge@1.4.0' },
    }),
  );
  writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages: []\n');
  run(['install', '--lockfile-only', '--no-frozen-lockfile', '--ignore-scripts']);
  assert.equal(configureDependencyPatches(root), true);
  assert.equal(
    JSON.parse(run(['config', 'get', 'patchedDependencies', '--json']))['node-forge@1.4.0'],
    path.join(root, 'patches/node-forge@1.4.0.patch'),
  );
  run(['install', '--lockfile-only', '--no-frozen-lockfile', '--ignore-scripts']);
  assert.match(readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8'), /patch_hash=/);
  run(['install', '--frozen-lockfile', '--ignore-scripts']);
  assert.equal(configureDependencyPatches(root), false);
  const require = createRequire(path.join(root, 'package.json'));
  assert.equal(require.resolve('forgeAlias'), require.resolve('node-forge'));
  const packageRoot = path.dirname(require.resolve('node-forge/package.json'));
  verifyForge(packageRoot);
  const patch = path.join(root, 'patches/node-forge@1.4.0.patch');
  const bytes = readFileSync(patch);
  writeFileSync(patch, Buffer.concat([bytes, Buffer.from('\n')]));
  run(['install', '--frozen-lockfile', '--ignore-scripts', '--offline'], 1);
  writeFileSync(patch, bytes);
  run(['install', '--frozen-lockfile', '--ignore-scripts', '--offline']);
  verifyForge(packageRoot);
  console.log('Frozen node-forge installation and Node/browser signature regressions passed.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
