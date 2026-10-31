import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Explicit local import of a reviewable transport snapshot, never a runtime/scaffold pin.
const [directory, mode] = process.argv.slice(2);
if (!directory || (mode && mode !== '--check'))
  throw Error('Usage: node scripts/sync-deployment-contract.mjs <export-directory> [--check]');
const manifest = JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
assert.equal(manifest.contractVersion, 1);
assert.equal(manifest.owner, 'anhedral/platform-contracts/deployment');
assert.match(manifest.sourceRevision, /^[a-f0-9]{40}$/);
const targets = {
  'cli-transport.ts': 'src/contracts/cli-transport.ts',
  'source-profile.ts': 'src/contracts/source-profile.ts',
  'source-bundle.ts': 'src/contracts/source-bundle.ts',
  'deployment.ts': 'src/contracts/deployment.ts',
  'fixtures.json': 'tests/fixtures/deployment-contract/fixtures.json',
  'acceptance.mjs': 'tests/fixtures/deployment-contract/acceptance.mjs',
};
assert.deepEqual(Object.keys(manifest.files).sort(), Object.keys(targets).sort());
// Read and verify everything before changing any destination.
const files = Object.entries(targets).map(([name, target]) => {
  const bytes = readFileSync(path.join(directory, name));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.files[name], name);
  return [target, bytes];
});
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
