import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOfficialRegistry, sha256 } from '../scripts/shadcn-registry.mjs';
import {
  nativeInputGroupPresets,
  reviewedInputGroupSources,
} from '../scripts/native-input-group-presets.mjs';
test('input-group review retains six implementations, full frozen root states, two CVA recipes and all theme slots', () => {
  const result = nativeInputGroupPresets(loadOfficialRegistry());
  assert.equal(Object.keys(result.sources).length, 6);
  assert.equal(Object.keys(result.presets).length, 8);
  for (const input of Object.values(result.sources)) {
    assert.deepEqual(Object.keys(input.recipes.inputGroupAddonVariants.variants.align).sort(), [
      'block-end',
      'block-start',
      'inline-end',
      'inline-start',
    ]);
    assert.deepEqual(Object.keys(input.recipes.inputGroupButtonVariants.variants.size).sort(), [
      'icon-sm',
      'icon-xs',
      'sm',
      'xs',
    ]);
  }
  assert.match(result.sources.default.slots.InputGroup, /h-9 has-\[>textarea\]:h-auto/);
  assert.match(result.sources.default.slots.InputGroup, /focus-visible\]:ring-1/);
  assert.match(result.sources['new-york-v4'].slots.InputGroup, /focus-visible\]:ring-\[3px\]/);
  assert.equal(result.presets.nova.rules['button-size-sm'], '');
  assert.equal(result.presets.sera.rules['addon-align-inline-start'], '');
  assert.equal(result.presets.sera.rules['addon-align-inline-end'], '');
  assert.match(result.presets.sera.rules.input, /inline-start/);
  for (const p of Object.values(result.presets)) assert.equal(Object.keys(p.rules).length, 14);
});
test('changed source, altered CVA metadata, new selectors and corrupt input-group styles require renewed review', () => {
  for (const input of Object.values(reviewedInputGroupSources)) {
    const i = loadOfficialRegistry();
    i.sources[input.origin].sha256 = 'changed';
    assert.throws(() => nativeInputGroupPresets(i), /source changed/);
  }
  const recipe = loadOfficialRegistry();
  recipe.sources[
    reviewedInputGroupSources.base.origin
  ].classRecipes.inputGroupButtonVariants.defaultVariants.size = 'sm';
  assert.throws(() => nativeInputGroupPresets(recipe), /class recipes changed/);
  for (const selector of ['.cn-input-group-extra', '.cn-input-group > button']) {
    const i = loadOfficialRegistry(),
      sheet = i.styleSheets['style-nova.css'];
    sheet.content += '\n' + selector + ' { @apply p-4; }';
    sheet.sha256 = sha256(sheet.content);
    assert.throws(() => nativeInputGroupPresets(i), /selectors/);
  }
  const corrupt = loadOfficialRegistry();
  corrupt.styleSheets['style-nova.css'].content += '/* drift */';
  assert.throws(() => nativeInputGroupPresets(corrupt), /integrity/);
});
test('commented input-group selectors stay inactive instead of adding Sera inline offsets', () => {
  const i = loadOfficialRegistry(),
    sheet = i.styleSheets['style-nova.css'];
  sheet.content += '\n/* .cn-input-group-unreviewed { @apply p-4; } */';
  sheet.sha256 = sha256(sheet.content);
  const result = nativeInputGroupPresets(i);
  assert.equal(result.presets.sera.rules['addon-align-inline-end'], '');
  assert.equal(result.presets.nova.rules.unreviewed, undefined);
});
