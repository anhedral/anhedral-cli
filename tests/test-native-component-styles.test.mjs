import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadOfficialRegistry, sha256 } from '../scripts/shadcn-registry.mjs';
import {
  nativeButtonPresets,
  nativeButtonPresetSource,
} from '../scripts/native-component-styles.mjs';
const inventory = loadOfficialRegistry();
test('eight button presets retain all 120 source rules and the actual pinned global radius formulas', async () => {
  const data = nativeButtonPresets(inventory);
  assert.equal(Object.keys(data.presets).length, 8);
  assert.equal(
    Object.values(data.presets).reduce(
      (count, preset) => count + Object.keys(preset.rules).length,
      0,
    ),
    120,
  );
  assert.deepEqual(data.globals.radius, {
    sm: 0.6,
    md: 0.8,
    lg: 1,
    xl: 1.4,
    '2xl': 1.8,
    '3xl': 2.2,
    '4xl': 2.6,
  });
  assert.equal(
    readFileSync('assets/ui/native/_button-presets.tsx', 'utf8'),
    await nativeButtonPresetSource(inventory),
  );
});
test('new button rules, removed radius definitions and corrupt preset CSS require renewed native review', () => {
  const changed = structuredClone(inventory);
  changed.styleSheets['style-nova.css'].sha256 = '0'.repeat(64);
  assert.throws(() => nativeButtonPresets(changed), /preset integrity/);
  const formula = structuredClone(inventory);
  formula.styleGlobals['apps/v4/app/globals.css'].content = formula.styleGlobals[
    'apps/v4/app/globals.css'
  ].content.replace('--radius-md: calc(var(--radius) * 0.8);', '--radius-md: unsupported;');
  // A matching hash alone never makes an unported formula supported.
  formula.styleGlobals['apps/v4/app/globals.css'].sha256 = sha256(
    formula.styleGlobals['apps/v4/app/globals.css'].content,
  );
  assert.throws(() => nativeButtonPresets(formula), /radius formulas/);
  const slot = structuredClone(inventory);
  slot.styleSheets['style-nova.css'].content += '\n.cn-button-size-new { @apply h-10; }';
  slot.styleSheets['style-nova.css'].sha256 = sha256(slot.styleSheets['style-nova.css'].content);
  assert.throws(() => nativeButtonPresets(slot), /button (?:rules|selectors)/);
  const selector = structuredClone(inventory);
  selector.styleSheets['style-nova.css'].content +=
    '\n.cn-button-new-feature { @apply bg-primary; }';
  selector.styleSheets['style-nova.css'].sha256 = sha256(
    selector.styleSheets['style-nova.css'].content,
  );
  assert.throws(() => nativeButtonPresets(selector), /button selectors/);
});
