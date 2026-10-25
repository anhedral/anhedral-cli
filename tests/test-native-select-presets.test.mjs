import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOfficialRegistry, sha256 } from '../scripts/shadcn-registry.mjs';
import {
  nativeSelectPresets,
  nativeSelectSlotPolicy,
  reviewedSelectSources,
} from '../scripts/native-select-presets.mjs';
test('Select review retains all six source families, source slots and eight theme rules', () => {
  const result = nativeSelectPresets(loadOfficialRegistry());
  assert.equal(Object.keys(result.sources).length, 6);
  assert.equal(Object.keys(result.presets).length, 8);
  for (const p of Object.values(result.presets)) assert.equal(Object.keys(p.rules).length, 20);
  assert.match(result.sources.default.slots.SelectTrigger[0].base, /h-10/);
  assert.match(result.sources['new-york'].slots.SelectTrigger[0].base, /h-9/);
  assert.match(result.sources.aria.slots.SelectTrigger[0].base, /w-full/);
  assert.match(result.sources.base.slots.SelectTrigger[0].base, /w-fit/);
  assert.equal(
    result.sources['new-york'].slots.SelectContent[0].when[0].expression,
    'position === "popper"',
  );
  // Lyra omits a trailing semicolon; its following selector must remain independent.
  assert.match(result.presets.lyra.rules['menu-translucent'], /bg-popover\/70/);
  assert.doesNotMatch(result.presets.lyra.rules['menu-translucent'], /cn-menu-translucent-aria/);
  assert.equal(
    result.presets.lyra.rules['menu-translucent-aria'],
    '**:data-[slot$=-item]:data-focused:bg-foreground/10',
  );
});
test('Select source changes, new selector shapes and corrupt styles require renewed review', () => {
  for (const source of Object.values(reviewedSelectSources)) {
    const i = loadOfficialRegistry();
    i.sources[source.origin].sha256 = 'changed';
    assert.throws(() => nativeSelectPresets(i), /source changed/);
  }
  for (const selector of [
    '.cn-select-extra',
    '.cn-select-trigger > button',
    '.cn-menu-translucent > div',
  ]) {
    const i = loadOfficialRegistry(),
      s = i.styleSheets['style-nova.css'];
    s.content += '\n' + selector + ' { @apply p-4; }';
    s.sha256 = sha256(s.content);
    assert.throws(() => nativeSelectPresets(i), /selector/i);
  }
  const i = loadOfficialRegistry();
  i.styleSheets['style-nova.css'].content += '/* drift */';
  assert.throws(() => nativeSelectPresets(i), /integrity/);
});

test('every Select class slot has a native, delegated or explicit browser-only policy', () => {
  const policy = nativeSelectSlotPolicy();
  const counts = Object.values(policy).reduce(
    (result, item) => (
      (result[item.classification] = (result[item.classification] ?? 0) + 1),
      result
    ),
    {},
  );
  assert.deepEqual(counts, { 'native-slot': 64, 'delegated-slot': 1, 'web-specific-slot': 18 });
  assert.equal(policy['aria/SelectContent/0'].classification, 'delegated-slot');
  assert.equal(policy['aria/SelectInput/1'].classification, 'web-specific-slot');
  assert.equal(policy['base/SelectContent/0'].classification, 'web-specific-slot');
  assert.equal(policy['base/SelectItem/1'].classification, 'native-slot');
});
