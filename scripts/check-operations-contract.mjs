import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const manifest = JSON.parse(
  readFileSync(new URL('assets/contracts/operations-provenance.json', root), 'utf8'),
);
assert.equal(manifest.contractVersion, 1);
assert.equal(manifest.owner, 'anhedral/platform-contracts/operations');
assert.equal(manifest.license, 'Apache-2.0');
assert.match(manifest.sourceRevision, /^[a-f0-9]{40}$/);
const files = {
  'staging-transport.ts': 'src/contracts/staging-transport.ts',
  'runtime-logs-transport.ts': 'src/contracts/runtime-logs-transport.ts',
  LICENSE: 'assets/contracts/LICENSE.operations',
};
assert.deepEqual(Object.keys(manifest.files).sort(), Object.keys(files).sort());
for (const [name, path] of Object.entries(files)) {
  const bytes = readFileSync(new URL(path, root));
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    manifest.files[name],
    `${path} drifted from the reviewed owner snapshot`,
  );
  if (name.endsWith('.ts')) {
    const source = bytes.toString();
    assert.match(source, /^\/\/ SPDX-License-Identifier: Apache-2\.0/);
    assert.doesNotMatch(source, /@anhedral\/db|drizzle-orm|process\.env|cloudflare:workers/);
    for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) assert.equal(match[1], 'zod');
  }
}
console.log('Reviewed portable project operations snapshot and boundary verified.');
