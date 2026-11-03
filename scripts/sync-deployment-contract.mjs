import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readContractSnapshot } from './deployment-contract-snapshot.mjs';
import { assertPublicContractFiles } from './repository-boundaries.mjs';

// Import a reviewed public snapshot explicitly; never a runtime/scaffold pin.
const [directory, mode] = process.argv.slice(2);
if (!directory || (mode && mode !== '--check'))
  throw Error('Usage: node scripts/sync-deployment-contract.mjs <export-directory> [--check]');
const { manifest, files } = readContractSnapshot(directory);
// Validate every byte and source boundary before changing any destination.
assertPublicContractFiles(files);
files.push([
  'assets/contracts/deployment-provenance.json',
  Buffer.from(JSON.stringify(manifest, null, 2) + '\n'),
]);
for (const [target, bytes] of files) {
  if (mode === '--check') assert.deepEqual(readFileSync(target), bytes, `${target} drifted`);
  else {
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  }
}
console.log(
  `Deployment contract v1 ${mode ? 'verified' : 'imported'}; hosting authority unchanged.`,
);
