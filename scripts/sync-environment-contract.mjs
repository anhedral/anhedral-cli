import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const [directory, mode] = process.argv.slice(2);
if (!directory || (mode && mode !== '--check'))
  throw Error('Usage: node scripts/sync-environment-contract.mjs <export-directory> [--check]');
const manifest = JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
assert.equal(manifest.contractVersion, 1);
assert.equal(manifest.owner, 'anhedral/platform-contracts/environment');
assert.equal(manifest.license, 'Apache-2.0');
assert.match(manifest.sourceRevision, /^[a-f0-9]{40}$/);
const targets = {
  'environment-transport.ts': 'src/contracts/environment-transport.ts',
  'environment-file.ts': 'src/contracts/environment-file.ts',
  LICENSE: 'assets/contracts/LICENSE.environment',
};
assert.deepEqual(Object.keys(manifest.files).sort(), Object.keys(targets).sort());
const files = Object.entries(targets).map(([name, target]) => {
  const bytes = readFileSync(path.join(directory, name));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.files[name]);
  if (name.endsWith('.ts')) {
    assert.match(bytes.toString(), /^\/\/ SPDX-License-Identifier: Apache-2\.0/);
    const imports = [...bytes.toString().matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    assert.ok(
      imports.every((specifier) => ['zod', './environment-transport.ts'].includes(specifier)),
      'Only reviewed portable transport dependencies are allowed.',
    );
    assert.doesNotMatch(
      bytes.toString(),
      /@anhedral\/db|drizzle-orm|process\.env|cloudflare:workers/,
    );
  } else assert.match(bytes.toString(), /Apache License\s+Version 2\.0/);
  return [target, bytes];
});
files.push([
  'assets/contracts/environment-provenance.json',
  Buffer.from(JSON.stringify(manifest, null, 2) + '\n'),
]);
for (const [target, bytes] of files) {
  if (mode) assert.deepEqual(readFileSync(target), bytes, `${target} drifted`);
  else {
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  }
}
console.log(
  `Environment transport v1 ${mode ? 'verified' : 'imported'}; no runtime admission changed.`,
);
