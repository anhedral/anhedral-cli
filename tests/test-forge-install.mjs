// Real frozen pnpm installation and exact package gate, including browser bundles.
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSyncPortable } from '../scripts/spawn-command.mjs';
import { configureDependencyPatches, writeDependencyAudit } from '../dist/braces-patch.js';

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
      scripts: { 'audit:deps': 'node scripts/audit-deps.mjs' },
      dependencies: { 'node-forge': '1.4.0', forgeAlias: 'npm:node-forge@1.4.0' },
    }),
  );
  writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages: []\n');
  writeDependencyAudit(root);
  run(['install', '--lockfile-only', '--no-frozen-lockfile', '--ignore-scripts']);
  assert.equal(configureDependencyPatches(root), true);
  run(['install', '--lockfile-only', '--no-frozen-lockfile', '--ignore-scripts']);
  assert.match(readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8'), /patch_hash=/);
  run(['install', '--frozen-lockfile', '--ignore-scripts']);
  assert.equal(configureDependencyPatches(root), false);
  const require = createRequire(path.join(root, 'package.json'));
  assert.equal(require.resolve('forgeAlias'), require.resolve('node-forge'));
  const packageRoot = path.dirname(require.resolve('node-forge/package.json'));
  const raw = run(['audit', '--json', '--audit-level=high'], 1);
  const report = JSON.parse(raw);
  assert.ok(
    Object.values(report.advisories).some(
      (item) =>
        item.module_name === 'node-forge' && item.github_advisory_id === 'GHSA-86w9-cpqp-85rv',
    ),
  );
  assert.match(run(['run', 'audit:deps']), /Accepted only GHSA-86w9-cpqp-85rv/);
  const retained = JSON.parse(readFileSync(path.join(root, '.anhedral-audit-report.json'), 'utf8'));
  assert.deepEqual(retained.metadata.vulnerabilities, report.metadata.vulnerabilities);
  assert.ok(
    Object.values(retained.advisories).some(
      (item) => item.github_advisory_id === 'GHSA-86w9-cpqp-85rv',
    ),
  );
  const patch = path.join(root, 'patches/node-forge@1.4.0.patch');
  const bytes = readFileSync(patch);
  writeFileSync(patch, Buffer.concat([bytes, Buffer.from('\n')]));
  try {
    run(['install', '--frozen-lockfile', '--ignore-scripts', '--offline'], 1);
    assert.match(run(['run', 'audit:deps'], 1), /reviewed node-forge patch.*changed/);
  } finally {
    writeFileSync(patch, bytes);
  }
  for (const entry of ['lib/rsa.js', 'dist/forge.min.js', 'dist/forge.all.min.js']) {
    const target = path.join(packageRoot, entry);
    const original = readFileSync(target);
    const replacement = path.join(root, 'tampered-entry');
    writeFileSync(replacement, Buffer.concat([original, Buffer.from('\n')]));
    // Replace an inode instead of modifying pnpm's shared hardlinked store.
    renameSync(replacement, target);
    try {
      assert.match(run(['run', 'audit:deps'], 1), /Installed node-forge bytes/);
    } finally {
      writeFileSync(replacement, original);
      renameSync(replacement, target);
    }
  }
  assert.match(run(['run', 'audit:deps']), /Accepted only GHSA-86w9-cpqp-85rv/);
  const evidence = path.resolve('.artifacts/forge-patch');
  mkdirSync(evidence, { recursive: true });
  writeFileSync(path.join(evidence, 'audit.json'), raw);
  console.log(
    'Frozen exact node-forge install and Node/browser runtime gate passed; raw advisory retained and patch/source/bundle tampering rejected.',
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
