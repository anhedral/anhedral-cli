import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [directory, mode] = process.argv.slice(2);
if (!directory || (mode && mode !== '--check'))
  throw Error('Usage: node scripts/sync-operations-contract.mjs <export-directory> [--check]');
const manifest = JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
assert.equal(manifest.contractVersion, 1);
assert.equal(manifest.owner, 'anhedral/platform-contracts/operations');
assert.equal(manifest.license, 'Apache-2.0');
assert.match(manifest.sourceRevision, /^[a-f0-9]{40}$/);
const targets = {
  'staging-transport.ts': 'src/contracts/staging-transport.ts',
  'runtime-logs-transport.ts': 'src/contracts/runtime-logs-transport.ts',
  LICENSE: 'assets/contracts/LICENSE.operations',
};
assert.deepEqual(Object.keys(manifest.files).sort(), Object.keys(targets).sort());
const files = Object.entries(targets).map(([name, target]) => {
  const bytes = readFileSync(path.join(directory, name));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.files[name]);
  if (name.endsWith('.ts')) {
    assert.match(bytes.toString(), /^\/\/ SPDX-License-Identifier: Apache-2\.0/);
    assert.doesNotMatch(
      bytes.toString(),
      /@anhedral\/db|drizzle-orm|process\.env|cloudflare:workers/,
    );
    assert.ok(
      [...bytes.toString().matchAll(/from\s+["']([^"']+)["']/g)].every(
        (match) => match[1] === 'zod',
      ),
      'Only the reviewed public zod transport is allowed.',
    );
  } else assert.match(bytes.toString(), /Apache License\s+Version 2\.0/);
  return [target, bytes];
});
files.push([
  'assets/contracts/operations-provenance.json',
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
  `Project operations transport v1 ${mode ? 'verified' : 'imported'}; no runtime policy changed.`,
);
