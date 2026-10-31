import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Fingerprint reviewed public files only. Never import a raw private-server export.
const [mode, ...extra] = process.argv.slice(2);
if ((mode && mode !== '--check') || extra.length)
  throw Error('Usage: node scripts/sync-deployment-contract.mjs [--check]');
const files = {
  'cli-transport.ts': 'src/contracts/cli-transport.ts',
  'source-profile.ts': 'src/contracts/source-profile.ts',
  'source-bundle.ts': 'src/contracts/source-bundle.ts',
  'deployment.ts': 'src/contracts/deployment.ts',
  'fixtures.json': 'tests/fixtures/deployment-contract/fixtures.json',
  'acceptance.mjs': 'tests/fixtures/deployment-contract/acceptance.mjs',
};
const manifest = {
  contractVersion: 1,
  files: Object.fromEntries(
    Object.entries(files).map(([name, file]) => [
      name,
      createHash('sha256').update(readFileSync(file)).digest('hex'),
    ]),
  ),
};
const target = path.resolve('assets/contracts/deployment-provenance.json');
const contents = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
if (mode === '--check') assert.deepEqual(readFileSync(target), contents, 'Public contract drifted');
else writeFileSync(target, contents);
console.log(`Public deployment contract content manifest ${mode ? 'verified' : 'updated'}.`);
