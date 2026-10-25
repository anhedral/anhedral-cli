import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { nativeOverlayFiles } from '../scripts/native-overlay.mjs';
test('published native overlay preserves every maintained source, font license and recipe byte', () => {
  const binary = readFileSync(new URL('../assets/ui/native-overlay.json.br', import.meta.url));
  const decoded = JSON.parse(brotliDecompressSync(binary, { maxOutputLength: 16 * 1024 * 1024 }));
  assert.equal(decoded.schemaVersion, 1);
  assert.deepEqual(decoded.files, nativeOverlayFiles());
  const fonts = JSON.parse(decoded.files['native-fonts.json']);
  const recipes = JSON.parse(decoded.files['native-chart-recipes.json']);
  assert.equal(recipes.recipes.filter((recipe) => recipe.kind === 'block').length, 210);
  const forms = JSON.parse(decoded.files['native-form-recipes.json']);
  assert.equal(forms.recipes.filter((recipe) => recipe.name.startsWith('form-rhf-')).length, 10);
  assert.ok(fonts);
  assert.ok(Object.keys(decoded.files).includes('native/charts.tsx'));
  // The packlist enforces the total published artifact budget. This check keeps
  // compression effective as new authored examples are added to the overlay.
  assert.ok(
    binary.length < Buffer.byteLength(JSON.stringify(decoded)) * 0.1,
    'native overlay should compress below ten percent of its source size',
  );
});
