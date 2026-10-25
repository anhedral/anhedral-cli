import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadOfficialRegistry, sha256 } from '../scripts/shadcn-registry.mjs';
import {
  reviewedItemSources,
  nativeItemPresets,
  nativeItemPresetSource,
} from '../scripts/native-item-presets.mjs';
test('Item retains sixty class slots, both CVA recipes, source-specific sizes and all 152 modern style rules', async () => {
  const inventory = loadOfficialRegistry(),
    result = nativeItemPresets(inventory);
  assert.equal(Object.keys(result.sources).length, 6);
  assert.equal(
    Object.values(result.sources).flatMap((x) => Object.values(x.slots).flat()).length,
    60,
  );
  for (const [family, definition] of Object.entries(result.sources)) {
    assert.deepEqual(Object.keys(definition.recipes).sort(), ['itemMediaVariants', 'itemVariants']);
    assert.deepEqual(Object.keys(definition.recipes.itemVariants.variants.variant), [
      'default',
      'outline',
      'muted',
    ]);
    assert.deepEqual(
      Object.keys(definition.recipes.itemVariants.variants.size),
      ['default', 'new-york', 'new-york-v4'].includes(family)
        ? ['default', 'sm']
        : ['default', 'sm', 'xs'],
    );
    assert.deepEqual(Object.keys(definition.recipes.itemMediaVariants.variants.variant), [
      'default',
      'icon',
      'image',
    ]);
  }
  assert.equal(
    Object.values(result.presets).reduce((sum, x) => sum + Object.keys(x.rules).length, 0),
    152,
  );
  assert.equal(
    readFileSync('assets/ui/native/_item-presets.tsx', 'utf8'),
    await nativeItemPresetSource(inventory),
  );
});
test('Item source/class changes, extra selectors and corrupted style inputs require renewed review', () => {
  for (const definition of Object.values(reviewedItemSources)) {
    const i = loadOfficialRegistry();
    i.sources[definition.origin].sha256 = 'changed';
    assert.throws(() => nativeItemPresets(i), /source changed/);
  }
  for (const selector of ['.cn-item-extra', '.cn-item-title:hover', '.cn-item > div']) {
    const i = loadOfficialRegistry(),
      sheet = i.styleSheets['style-nova.css'];
    sheet.content += '\n' + selector + ' { @apply p-4; }';
    sheet.sha256 = sha256(sheet.content);
    assert.throws(() => nativeItemPresets(i), /selectors/);
  }
  const i = loadOfficialRegistry();
  i.styleSheets['style-nova.css'].content += '/* drift */';
  assert.throws(() => nativeItemPresets(i), /integrity/);
});
