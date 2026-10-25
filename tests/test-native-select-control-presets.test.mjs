import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOfficialRegistry, sha256 } from '../scripts/shadcn-registry.mjs';
import {
  reviewedNativeSelectSources,
  nativeSelectControlPresets,
  nativeSelectControlPresetSource,
} from '../scripts/native-select-control-presets.mjs';
import { readFileSync } from 'node:fs';
test('Native Select retains four actual upstream publications, twenty source slots and eight style definitions', async () => {
  const result = nativeSelectControlPresets(loadOfficialRegistry());
  assert.equal(Object.keys(result.sources).length, 4);
  assert.equal(
    Object.values(result.sources).flatMap((s) => Object.values(s.slots).flat()).length,
    20,
  );
  assert.equal(Object.keys(result.presets).length, 8);
  for (const preset of Object.values(result.presets))
    assert.deepEqual(Object.keys(preset.rules).sort(), ['native-select', 'native-select-icon']);
  assert.equal(result.sources.default, undefined);
  assert.equal(result.sources['new-york'], undefined);
  assert.equal(
    readFileSync(
      new URL('../assets/ui/native/_native-select-presets.tsx', import.meta.url),
      'utf8',
    ),
    await nativeSelectControlPresetSource(loadOfficialRegistry()),
  );
});
test('source and stylesheet drift cannot silently inherit Native Select review', () => {
  for (const source of Object.values(reviewedNativeSelectSources)) {
    const inventory = loadOfficialRegistry();
    inventory.sources[source.origin].sha256 = 'changed';
    assert.throws(() => nativeSelectControlPresets(inventory), /source changed/);
  }
  for (const selector of [
    '.cn-native-select-extra',
    '.cn-native-select > select',
    '.cn-native-select-icon:hover',
  ]) {
    const inventory = loadOfficialRegistry(),
      sheet = inventory.styleSheets['style-nova.css'];
    sheet.content += '\n' + selector + ' { @apply p-4; }';
    sheet.sha256 = sha256(sheet.content);
    assert.throws(() => nativeSelectControlPresets(inventory), /selectors/);
  }
  const inventory = loadOfficialRegistry();
  inventory.styleSheets['style-nova.css'].content += '/* drift */';
  assert.throws(() => nativeSelectControlPresets(inventory), /integrity/);
});
