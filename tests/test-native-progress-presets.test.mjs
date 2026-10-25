import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadOfficialRegistry, sha256 } from '../scripts/shadcn-registry.mjs';
import {
  reviewedProgressSources,
  nativeProgressPresets,
  nativeProgressPresetSource,
} from '../scripts/native-progress-presets.mjs';
test('Progress retains eighteen slots across six reviewed source publications and every stylesheet rule', async () => {
  const result = nativeProgressPresets(loadOfficialRegistry());
  assert.equal(Object.keys(result.sources).length, 6);
  assert.equal(
    Object.values(result.sources).flatMap((s) => Object.values(s.slots).flat()).length,
    18,
  );
  assert.equal(Object.keys(result.presets).length, 8);
  for (const preset of Object.values(result.presets))
    assert.deepEqual(Object.keys(preset.rules).sort(), [
      'progress',
      'progress-indicator',
      'progress-label',
      'progress-track',
      'progress-value',
    ]);
  assert.match(result.sources.default.slots.Progress[0].classes, /h-4/);
  assert.match(result.sources['new-york'].slots.Progress[0].classes, /bg-primary\/20/);
  assert.match(result.sources.aria.slots.Progress[0].classes, /flex-wrap gap-3/);
  assert.equal(
    readFileSync(new URL('../assets/ui/native/_progress-presets.tsx', import.meta.url), 'utf8'),
    await nativeProgressPresetSource(loadOfficialRegistry()),
  );
});
test('Progress source changes, new stylesheet selectors and corrupt style bytes require renewed review', () => {
  for (const source of Object.values(reviewedProgressSources)) {
    const inventory = loadOfficialRegistry();
    inventory.sources[source.origin].sha256 = 'changed';
    assert.throws(() => nativeProgressPresets(inventory), /source changed/);
  }
  for (const selector of [
    '.cn-progress-extra',
    '.cn-progress > div',
    '.cn-progress-indicator:hover',
  ]) {
    const inventory = loadOfficialRegistry(),
      sheet = inventory.styleSheets['style-nova.css'];
    sheet.content += '\n' + selector + ' { @apply p-4; }';
    sheet.sha256 = sha256(sheet.content);
    assert.throws(() => nativeProgressPresets(inventory), /selectors/);
  }
  const inventory = loadOfficialRegistry();
  inventory.styleSheets['style-nova.css'].content += '/* drift */';
  assert.throws(() => nativeProgressPresets(inventory), /integrity/);
});
