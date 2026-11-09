import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const workspace = new Map([
  ['packages', '[]'],
  ['linkWorkspacePackages', 'false'],
  ['preferWorkspacePackages', 'false'],
  ['sharedWorkspaceLockfile', 'false'],
  ['nodeLinker', 'isolated'],
  ['hoist', 'false'],
]);
const npmrc = new Map([
  ['registry', 'https://registry.npmjs.org/'],
  ['frozen-lockfile', 'true'],
  ['package-manager-strict', 'true'],
]);

// These intentionally small flat files require review before adding settings.
// Errors never echo configuration values, which could contain credentials.
function requireSettings(directory, file, separator, expected) {
  let text;
  try {
    text = readFileSync(path.join(directory, file), 'utf8');
  } catch {
    throw Error(`Standalone CLI requires its own ${file}.`);
  }
  const actual = new Map();
  for (const line of text.split(/\r?\n/).map((value) => value.trim())) {
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const offset = line.indexOf(separator);
    const key = line.slice(0, offset).trim();
    const value = line.slice(offset + 1).trim();
    assert.ok(
      offset > 0 && !actual.has(key) && expected.get(key) === value,
      `Review standalone CLI ${file} settings; parent configuration is not supported.`,
    );
    actual.set(key, value);
  }
  assert.ok(actual.size === expected.size, `Standalone CLI ${file} settings are incomplete.`);
}

export function assertStandaloneCheckout(directory = root, { ci = false, env = process.env } = {}) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
  } catch {
    throw Error('Standalone CLI package manifest is unavailable or invalid.');
  }
  assert.ok(manifest.name === 'anhedral', 'Commands must run in the public CLI checkout.');
  for (const group of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ])
    for (const [name, version] of Object.entries(manifest[group] ?? {}))
      assert.ok(
        !name.startsWith('@anhedral/') && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version),
        'Public CLI dependencies must be pinned registry packages, never private/local sources.',
      );
  requireSettings(directory, 'pnpm-workspace.yaml', ':', workspace);
  requireSettings(directory, '.npmrc', '=', npmrc);
  if (ci)
    assert.ok(
      env.GITHUB_WORKSPACE && realpathSync(env.GITHUB_WORKSPACE) === realpathSync(directory),
      'Public CI must check out and run only the CLI repository at its workspace root.',
    );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(
    process.argv.slice(2).every((arg) => arg === '--ci'),
    'Usage: node scripts/checks/standalone-checkout.mjs [--ci]',
  );
  assertStandaloneCheckout(root, { ci: process.argv.includes('--ci') });
  console.log('Standalone CLI checkout configuration passed.');
}
