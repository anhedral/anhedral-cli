import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { verifyBraces } from './support/braces-regressions.mjs';

test('temporary braces patch touches only nesting guards and preserves stringify traversal', () => {
  const patch = readFileSync(
    new URL('../assets/patches/braces@3.0.3.patch', import.meta.url),
    'utf8',
  );
  assert.deepEqual(
    [...patch.matchAll(/^diff --git a\/(\S+)/gm)].map((match) => match[1]),
    ['lib/compile.js', 'lib/expand.js', 'lib/limits.js', 'lib/parse.js', 'lib/stringify.js'],
  );
  assert.doesNotMatch(patch, /^[+-](?![+-]).*(?:rangeLimit\s*=|maxNodes|maxWidth|maxExpansion)/m);
  assert.doesNotMatch(patch, /^[+-].*stringify\(child,/m);
});

test(
  'actual patched braces bytes reject excessive nesting and cycles in a bounded process',
  { skip: !process.env.ANHEDRAL_BRACES_TEST_ROOT },
  () => {
    const result = verifyBraces(
      process.env.ANHEDRAL_BRACES_TEST_ROOT,
      process.env.ANHEDRAL_BRACES_ORIGINAL_ROOT,
    );
    assert.equal(result.depthLimit, 100);
  },
);
