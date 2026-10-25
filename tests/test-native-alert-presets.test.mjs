import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadOfficialRegistry, sha256 } from '../scripts/shadcn-registry.mjs';
import {
  reviewedAlertSources,
  nativeAlertPresets,
  nativeAlertPresetSource,
} from '../scripts/native-alert-presets.mjs';
test('Alert retains twenty-one slots across six reviewed source publications and every stylesheet rule', async () => {
  const result = nativeAlertPresets(loadOfficialRegistry());
  assert.equal(Object.keys(result.sources).length, 6);
  assert.equal(
    Object.values(result.sources).flatMap((s) => Object.values(s.slots).flat()).length,
    21,
  );
  assert.equal(Object.keys(result.presets).length, 8);
  for (const preset of Object.values(result.presets))
    assert.deepEqual(Object.keys(preset.rules).sort(), [
      'alert',
      'alert-action',
      'alert-description',
      'alert-title',
      'alert-variant-default',
      'alert-variant-destructive',
    ]);
  for (const definition of Object.values(result.sources))
    assert.deepEqual(Object.keys(definition.recipes.alertVariants.variants.variant), [
      'default',
      'destructive',
    ]);
  assert.match(result.sources.default.slots.AlertTitle[0].classes, /leading-none/);
  assert.match(result.sources['new-york-v4'].slots.AlertTitle[0].classes, /line-clamp-1/);
  assert.equal(
    readFileSync(new URL('../assets/ui/native/_alert-presets.tsx', import.meta.url), 'utf8'),
    await nativeAlertPresetSource(loadOfficialRegistry()),
  );
});
test('Alert source changes, new stylesheet selectors and corrupt style bytes require renewed review', () => {
  for (const source of Object.values(reviewedAlertSources)) {
    const inventory = loadOfficialRegistry();
    inventory.sources[source.origin].sha256 = 'changed';
    assert.throws(() => nativeAlertPresets(inventory), /source changed/);
  }
  for (const selector of ['.cn-alert-extra', '.cn-alert > div', '.cn-alert-title:hover']) {
    const inventory = loadOfficialRegistry(),
      sheet = inventory.styleSheets['style-nova.css'];
    sheet.content += '\n' + selector + ' { @apply p-4; }';
    sheet.sha256 = sha256(sheet.content);
    assert.throws(() => nativeAlertPresets(inventory), /selectors/);
  }
  const inventory = loadOfficialRegistry();
  inventory.styleSheets['style-nova.css'].content += '/* drift */';
  assert.throws(() => nativeAlertPresets(inventory), /integrity/);
});
