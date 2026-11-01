import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const manifest = JSON.parse(
  readFileSync(new URL('assets/contracts/environment-provenance.json', root), 'utf8'),
);
assert.equal(manifest.contractVersion, 1);
assert.equal(manifest.owner, 'anhedral/platform-contracts/environment');
assert.equal(manifest.license, 'Apache-2.0');
assert.match(manifest.sourceRevision, /^[a-f0-9]{40}$/);
const files = {
  'environment-transport.ts': 'src/contracts/environment-transport.ts',
  'environment-file.ts': 'src/contracts/environment-file.ts',
  LICENSE: 'assets/contracts/LICENSE.environment',
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
    for (const match of source.matchAll(/from\s+["']([^"']+)["']/g))
      assert.ok(['zod', './environment-transport.ts'].includes(match[1]));
  }
}
console.log('Reviewed portable environment snapshot and boundary verified.');
