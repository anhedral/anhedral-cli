import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadOfficialRegistry, sha256 } from '../scripts/shadcn-registry.mjs';
import {
  reviewedFieldSources,
  nativeFieldPresets,
  nativeFieldPresetSource,
} from '../scripts/native-field-presets.mjs';
test('Field retains all 78 source class slots, all orientation variants and 96 style rules', async () => {
  const inventory = loadOfficialRegistry(),
    result = nativeFieldPresets(inventory);
  assert.equal(Object.keys(result.sources).length, 6);
  assert.equal(
    Object.values(result.sources).flatMap((x) => Object.values(x.slots).flat()).length,
    78,
  );
  for (const source of Object.values(result.sources)) {
    assert.deepEqual(Object.keys(source.recipes), ['fieldVariants']);
    assert.deepEqual(Object.keys(source.recipes.fieldVariants.variants.orientation), [
      'vertical',
      'horizontal',
      'responsive',
    ]);
  }
  assert.equal(
    Object.values(result.presets).reduce((sum, x) => sum + Object.keys(x.rules).length, 0),
    96,
  );
  assert.equal(
    readFileSync('assets/ui/native/_field-presets.tsx', 'utf8'),
    await nativeFieldPresetSource(inventory),
  );
});
test('Field refuses changed publications, new selectors and corrupted style sheets', () => {
  for (const definition of Object.values(reviewedFieldSources)) {
    const i = loadOfficialRegistry();
    i.sources[definition.origin].sha256 = 'changed';
    assert.throws(() => nativeFieldPresets(i), /source changed/);
  }
  for (const selector of ['.cn-field-extra', '.cn-field-title:hover', '.cn-field > div']) {
    const i = loadOfficialRegistry(),
      sheet = i.styleSheets['style-nova.css'];
    sheet.content += '\n' + selector + ' { @apply p-4; }';
    sheet.sha256 = sha256(sheet.content);
    assert.throws(() => nativeFieldPresets(i), /selectors/);
  }
  const i = loadOfficialRegistry();
  i.styleSheets['style-nova.css'].content += '/* drift */';
  assert.throws(() => nativeFieldPresets(i), /integrity/);
});
