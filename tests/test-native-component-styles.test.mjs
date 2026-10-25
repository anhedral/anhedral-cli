import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadOfficialRegistry, sha256 } from '../scripts/shadcn-registry.mjs';
import {
  nativePresetMetricsSource,
  nativeGlobalMetrics,
  nativeBadgePresets,
  nativeBadgePresetSource,
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

test('native Button definitions retain all three component bases and all three frozen CVA generations', () => {
  const data = nativeButtonPresets(inventory);
  assert.deepEqual(Object.keys(data.classRecipes), [
    'base',
    'radix',
    'aria',
    'default',
    'new-york',
    'new-york-v4',
  ]);
  assert.deepEqual(data.classRecipes.base.recipe, data.classRecipes.aria.recipe);
  assert.deepEqual(data.classRecipes.base.recipe, data.classRecipes.radix.recipe);
  assert.equal(data.classRecipes.default.recipe.variants.size.default, 'h-10 px-4 py-2');
  assert.equal(data.classRecipes['new-york'].recipe.variants.size.default, 'h-9 px-4 py-2');
  assert.match(data.classRecipes['new-york-v4'].recipe.variants.variant.destructive, /text-white/);
  const changed = structuredClone(inventory);
  const origin = data.classRecipes.aria.origin;
  changed.sources[origin].classRecipes.buttonVariants.base += ' extra-unsupported-class';
  assert.throws(() => nativeButtonPresets(changed), /diverged across component bases/);
  const unsupported = structuredClone(inventory);
  unsupported.sources[origin].classRecipes.buttonVariants.unsupported = [
    { field: 'base', expression: 'dynamic()' },
  ];
  assert.throws(() => nativeButtonPresets(unsupported), /class recipe needs native review/);
});

test('eight Badge presets retain every source rule and all six component definitions', async () => {
  const data = nativeBadgePresets(inventory);
  assert.equal(Object.keys(data.presets).length, 8);
  assert.equal(
    Object.values(data.presets).reduce((count, item) => count + Object.keys(item.rules).length, 0),
    56,
  );
  assert.deepEqual(Object.keys(data.classRecipes), [
    'base',
    'radix',
    'aria',
    'default',
    'new-york',
    'new-york-v4',
  ]);
  assert.equal(
    readFileSync('assets/ui/native/_badge-presets.tsx', 'utf8'),
    await nativeBadgePresetSource(inventory),
  );
  const changed = structuredClone(inventory);
  changed.styleSheets['style-sera.css'].content += '\n.cn-badge-new { @apply h-10; }';
  changed.styleSheets['style-sera.css'].sha256 = sha256(
    changed.styleSheets['style-sera.css'].content,
  );
  assert.throws(() => nativeBadgePresets(changed), /badge selectors/);
  const recipe = structuredClone(inventory);
  const file = recipe.registries['base-nova'].items.find(
    (item) => item.type === 'registry:ui' && item.name === 'badge',
  ).files[0].source;
  recipe.sources[file].classRecipes.badgeVariants.variants.variant.future = 'bg-primary';
  assert.throws(() => nativeBadgePresets(recipe), /badge class recipe slot values/);
});

test('global native metrics retain the pinned source fingerprint independently of component slots', async () => {
  assert.deepEqual(nativeGlobalMetrics(inventory).globals, nativeButtonPresets(inventory).globals);
  assert.equal(
    readFileSync('assets/ui/native/_preset-metrics.ts', 'utf8'),
    await nativePresetMetricsSource(inventory),
  );
});
