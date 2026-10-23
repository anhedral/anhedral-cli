import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
test('maintained documentation describes one stack and only payment additions', () => {
  for (const file of ['README.md', 'docs/stack-standard.md', 'docs/software-factory.md']) {
    const source = read(file);
    for (const term of ['Expo', 'Hono', 'D1', 'R2', 'Stripe', 'RevenueCat'])
      assert.ok(source.includes(term), file + ': ' + term);
    assert.doesNotMatch(source, /--preset full-product|--next|--vinext|--neon|anhedral add resend/);
  }
  assert.match(read('docs/stack-standard.md'), /supporting core infrastructure/);
  assert.match(read('docs/software-factory.md'), /not.*live provider|not live provider/);
});
