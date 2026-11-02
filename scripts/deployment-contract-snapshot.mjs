import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const contractTargets = Object.freeze({
  'cli-transport.ts': 'src/contracts/cli-transport.ts',
  'source-profile.ts': 'src/contracts/source-profile.ts',
  'source-bundle.ts': 'src/contracts/source-bundle.ts',
  'deployment.ts': 'src/contracts/deployment.ts',
  'fixtures.json': 'tests/fixtures/deployment-contract/fixtures.json',
  'acceptance.mjs': 'tests/fixtures/deployment-contract/acceptance.mjs',
  LICENSE: 'assets/contracts/LICENSE',
});
export function readContractSnapshot(directory, local = false) {
  const manifestPath = local ? 'assets/contracts/deployment-provenance.json' : 'manifest.json';
  const manifest = JSON.parse(readFileSync(path.join(directory, manifestPath), 'utf8'));
  assert.deepEqual(Object.keys(manifest).sort(), [
    'contractVersion',
    'files',
    'license',
    'owner',
    'sourceRevision',
  ]);
  assert.equal(manifest.contractVersion, 1);
  assert.equal(manifest.license, 'Apache-2.0');
  assert.equal(manifest.owner, 'anhedral/platform-contracts/deployment');
  assert.match(manifest.sourceRevision, /^[a-f0-9]{40}$/);
  assert.deepEqual(Object.keys(manifest.files).sort(), Object.keys(contractTargets).sort());
  const files = Object.entries(contractTargets).map(([name, target]) => {
    const bytes = readFileSync(path.join(directory, local ? target : name));
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      manifest.files[name],
      `${name} drifted`,
    );
    if (name === 'LICENSE') assert.match(bytes.toString(), /Apache License\s+Version 2\.0/);
    return [target, bytes];
  });
  return { manifest, files };
}
