import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadOfficialRegistry, sha256 } from '../scripts/shadcn-registry.mjs';
import {
  reviewedAvatarSources,
  nativeAvatarPresets,
  nativeAvatarPresetSource,
} from '../scripts/native-avatar-presets.mjs';
test('Avatar retains thirty class slots, all source size variants and all eight style sheets across six publications', async () => {
  const inventory = loadOfficialRegistry(),
    result = nativeAvatarPresets(inventory);
  assert.equal(Object.keys(result.sources).length, 6);
  assert.equal(
    Object.values(result.sources).flatMap((source) => Object.values(source.slots).flat()).length,
    30,
  );
  assert.equal(Object.keys(result.presets).length, 8);
  for (const preset of Object.values(result.presets))
    assert.deepEqual(Object.keys(preset.rules).sort(), [
      'avatar',
      'avatar-badge',
      'avatar-fallback',
      'avatar-group-count',
      'avatar-image',
    ]);
  assert.equal(
    readFileSync(new URL('../assets/ui/native/_avatar-presets.tsx', import.meta.url), 'utf8'),
    await nativeAvatarPresetSource(inventory),
  );
});
test('Avatar source/recipe changes, extra selectors and corrupt style bytes require renewed review', () => {
  for (const definition of Object.values(reviewedAvatarSources)) {
    const inventory = loadOfficialRegistry();
    inventory.sources[definition.origin].sha256 = 'changed';
    assert.throws(() => nativeAvatarPresets(inventory), /source changed/);
  }
  for (const selector of ['.cn-avatar-extra', '.cn-avatar-media:hover', '.cn-avatar > div']) {
    const inventory = loadOfficialRegistry(),
      sheet = inventory.styleSheets['style-nova.css'];
    sheet.content += '\n' + selector + ' { @apply p-4; }';
    sheet.sha256 = sha256(sheet.content);
    assert.throws(() => nativeAvatarPresets(inventory), /selectors/);
  }
  const inventory = loadOfficialRegistry();
  inventory.styleSheets['style-nova.css'].content += '/* drift */';
  assert.throws(() => nativeAvatarPresets(inventory), /integrity/);
});
