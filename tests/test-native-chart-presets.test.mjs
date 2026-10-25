import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOfficialRegistry, sha256 } from '../scripts/shadcn-registry.mjs';
import { nativeChartPresets, reviewedChartSources } from '../scripts/native-chart-presets.mjs';
test('chart review retains six source implementations and all eight tooltip presets', () => {
  const result = nativeChartPresets(loadOfficialRegistry());
  assert.equal(Object.keys(result.sources).length, 6);
  assert.equal(Object.keys(result.presets).length, 8);
  assert.match(result.frozenTooltip, /border-border\/50/);
  assert.match(result.presets.lyra.tooltip, /rounded-none/);
  assert.match(result.presets.mira.tooltip, /text-xs\/relaxed/);
  assert.match(result.presets.luma.tooltip, /dark:ring-foreground\/10/);
  assert.match(result.presets.sera.tooltip, /ring-foreground\/10/);
  assert.doesNotMatch(result.presets.sera.tooltip, /rounded-/);
});
test('changed chart source and new chart selectors invalidate the source review', () => {
  for (const input of Object.values(reviewedChartSources)) {
    const inventory = loadOfficialRegistry();
    inventory.sources[input.origin].sha256 = 'changed';
    assert.throws(() => nativeChartPresets(inventory), /source changed/);
  }
  for (const selector of ['.cn-chart', '.cn-chart-tooltip > svg', '.cn-chart-extra']) {
    const inventory = loadOfficialRegistry(),
      sheet = inventory.styleSheets['style-nova.css'];
    sheet.content += '\n' + selector + ' { @apply p-4; }';
    sheet.sha256 = sha256(sheet.content);
    assert.throws(() => nativeChartPresets(inventory), /selectors/);
  }
  const inventory = loadOfficialRegistry();
  inventory.styleSheets['style-nova.css'].content += '/* drift */';
  assert.throws(() => nativeChartPresets(inventory), /integrity/);
});
