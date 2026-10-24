// Explicit generated-app integration: local checks and workerd only; no provider writes.
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { STACK_PROFILES } from './support/stack-profiles.mjs';
import { execFile } from '../dist/util.js';
import { inspectProject } from '../dist/readiness.js';
import { verifyUniversalDevelopment } from './support/universal-dev-smoke.mjs';
const selected = process.argv[2] ? [process.argv[2]] : Object.keys(STACK_PROFILES);
const cli = path.resolve(import.meta.dirname, '../dist/bin.js');
process.env.WRANGLER_SEND_METRICS = 'false';
for (const profile of selected) {
  assert.ok(Object.hasOwn(STACK_PROFILES, profile), 'Unknown supported profile: ' + profile);
  const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-generated-'));
  const root = path.join(temporary, profile);
  const previousCatalog = process.env.ANHEDRAL_PLUGIN_DATA;
  process.env.ANHEDRAL_PLUGIN_DATA = path.join(temporary, 'catalog');
  try {
    execFile(
      process.execPath,
      [cli, 'init', root, ...STACK_PROFILES[profile], '--no-git'],
      temporary,
    );
    assert.equal(inspectProject(root).localReady, true);
    execFile('pnpm', ['db:generate'], root);
    execFile('pnpm', ['check'], root);
    assert.ok(existsSync(path.join(root, 'apps/api/dist/index.js')));
    assert.ok(existsSync(path.join(root, 'apps/web/.open-next/worker.js')));
    const assets = path.join(root, 'apps/web/.open-next/assets');
    for (const file of readdirSync(assets, { recursive: true }).filter((file) =>
      file.endsWith('.js'),
    )) {
      assert.doesNotMatch(
        readFileSync(path.join(assets, file), 'utf8'),
        /react-native|expo-router|react-native-purchases|NativeWind/,
        'Native modules must not enter a browser bundle: ' + file,
      );
    }
    execFile(
      process.execPath,
      [path.resolve(import.meta.dirname, 'test-generated-expo-schema.mjs'), root],
      temporary,
    );
    await verifyUniversalDevelopment(root);
    execFile(
      process.execPath,
      [path.resolve(import.meta.dirname, 'test-generated-auth.mjs'), root],
      temporary,
    );
    if (profile === 'billing')
      execFile(
        process.execPath,
        [path.resolve(import.meta.dirname, 'test-generated-billing.mjs'), root],
        temporary,
      );
    console.log(
      'PASS generated ' +
        profile +
        ': checks, local runtime and source contracts; live/device acceptance separate.',
    );
  } finally {
    if (previousCatalog === undefined) delete process.env.ANHEDRAL_PLUGIN_DATA;
    else process.env.ANHEDRAL_PLUGIN_DATA = previousCatalog;
    if (process.env.ANHEDRAL_KEEP_GENERATED === '1')
      console.log('Retained generated fixture: ' + root);
    else rmSync(temporary, { recursive: true, force: true });
  }
}
