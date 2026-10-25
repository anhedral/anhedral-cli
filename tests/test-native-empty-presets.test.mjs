import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadOfficialRegistry, sha256 } from '../scripts/shadcn-registry.mjs';
import {
  reviewedEmptySources,
  nativeEmptyPresets,
  nativeEmptyPresetSource,
} from '../scripts/native-empty-presets.mjs';
test('Empty retains thirty-six class slots, both media variants and all eight style sheets across six publications', async () => {
  const inventory = loadOfficialRegistry(),
    result = nativeEmptyPresets(inventory);
  assert.equal(Object.keys(result.sources).length, 6);
  assert.equal(
    Object.values(result.sources).flatMap((source) => Object.values(source.slots).flat()).length,
    36,
  );
  assert.equal(Object.keys(result.presets).length, 8);
  for (const source of Object.values(result.sources))
    assert.deepEqual(Object.keys(source.recipes.emptyMediaVariants.variants.variant), [
      'default',
      'icon',
    ]);
  for (const preset of Object.values(result.presets))
    assert.deepEqual(Object.keys(preset.rules).sort(), [
      'empty',
      'empty-content',
      'empty-description',
      'empty-header',
      'empty-media',
      'empty-media-default',
      'empty-media-icon',
      'empty-title',
    ]);
  assert.equal(
    readFileSync(new URL('../assets/ui/native/_empty-presets.tsx', import.meta.url), 'utf8'),
    await nativeEmptyPresetSource(inventory),
  );
});
test('Empty source/recipe changes, extra selectors and corrupt style bytes require renewed review', () => {
  for (const definition of Object.values(reviewedEmptySources)) {
    const inventory = loadOfficialRegistry();
    inventory.sources[definition.origin].sha256 = 'changed';
    assert.throws(() => nativeEmptyPresets(inventory), /source changed/);
  }
  for (const selector of ['.cn-empty-extra', '.cn-empty-media:hover', '.cn-empty > div']) {
    const inventory = loadOfficialRegistry(),
      sheet = inventory.styleSheets['style-nova.css'];
    sheet.content += '\n' + selector + ' { @apply p-4; }';
    sheet.sha256 = sha256(sheet.content);
    assert.throws(() => nativeEmptyPresets(inventory), /selectors/);
  }
  const inventory = loadOfficialRegistry();
  inventory.styleSheets['style-nova.css'].content += '/* drift */';
  assert.throws(() => nativeEmptyPresets(inventory), /integrity/);
});
