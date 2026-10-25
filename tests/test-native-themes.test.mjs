import test from 'node:test';
import assert from 'node:assert/strict';
import Color from 'colorjs.io';
import { nativeRegistryThemes, loadNativeRegistryThemes } from '../scripts/shadcn-themes.mjs';
import { loadOfficialRegistry } from '../scripts/shadcn-registry.mjs';
const inventory = loadOfficialRegistry(),
  themes = loadNativeRegistryThemes();
test('all eight official themes retain complete upstream tokens and deterministic native/CSS colors', () => {
  assert.deepEqual(themes, nativeRegistryThemes(inventory));
  assert.equal(Object.keys(themes).length, 8);
  for (const theme of Object.values(themes))
    for (const mode of ['light', 'dark'])
      for (const [key, raw] of Object.entries(theme.upstream[mode])) {
        if (key === 'radius') {
          assert.equal(theme.css[mode]['--radius'], raw);
          assert.equal(theme.metrics[mode].radius, parseFloat(raw) * 16);
          continue;
        }
        assert.match(theme.native[mode][key], /^(?:#[a-f0-9]{3,8}|rgba\([0-9., ]+\))$/i);
        const native = new Color(theme.native[mode][key]),
          css = new Color('hsl(' + theme.css[mode]['--' + key] + ')');
        assert.ok(native.deltaE(css, 'OK') < 0.005, key + ' color parity');
        assert.equal(native.alpha, css.alpha);
      }
});
test('OKLCH alpha and HSL colors preserve transparency through the native boundary', () => {
  const neutral = themes['theme-neutral'];
  assert.equal(new Color(neutral.native.dark.border).alpha, 0.1);
  assert.equal(new Color(neutral.native.light.background).toString({ format: 'hex' }), '#fff');
  assert.equal(
    themes['theme-daylight'].native.light.background,
    themes['theme-daylight'].native.dark.background,
  );
});
