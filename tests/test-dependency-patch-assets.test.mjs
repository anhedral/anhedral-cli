import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';
test('the shipped dependency patch expands to every byte of its editable reviewed source', () => {
  const canonical = readFileSync('assets/patches/node-forge@1.4.0.patch'),
    packed = readFileSync('assets/patches/node-forge@1.4.0.patch.br');
  const expanded = brotliDecompressSync(packed, { maxOutputLength: 2 * 1024 * 1024 });
  assert.deepEqual(expanded, canonical);
  assert.equal(
    createHash('sha256').update(expanded).digest('hex'),
    createHash('sha256').update(canonical).digest('hex'),
  );
  assert.ok(
    packed.length < canonical.length / 3,
    'Preserve useful source headroom for the complete registry',
  );
  assert.throws(() => brotliDecompressSync(packed, { maxOutputLength: 1024 }));
});
