import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOfficialRegistry, sha256 } from '../scripts/shadcn-registry.mjs';
import { nativeKbdPresets, reviewedKbdSources } from '../scripts/native-kbd-presets.mjs';
test('keyboard source review retains six host implementations and all sixteen newer CSS slots', () => {
  const output = nativeKbdPresets(loadOfficialRegistry());
  assert.equal(Object.keys(output.sources).length, 6);
  assert.equal(
    Object.values(output.presets).reduce((n, p) => n + Object.keys(p.rules).length, 0),
    16,
  );
  assert.match(output.sources.default.classes.Kbd, /tooltip-content/);
  assert.match(output.presets.luma.rules.kbd, /h-5.5/);
  assert.match(output.presets.mira.rules.kbd, /text-\[0\.625rem\]/);
  assert.match(output.presets.rhea.rules.kbd, /input-group/);
});
test('changed keyboard source, stylesheet bytes and new unreviewed selectors invalidate native evidence', () => {
  const inventory = loadOfficialRegistry();
  for (const input of Object.values(reviewedKbdSources)) {
    const changed = structuredClone(inventory);
    changed.sources[input.origin].sha256 = 'changed';
    assert.throws(() => nativeKbdPresets(changed), /source changed/);
  }
  const corrupt = structuredClone(inventory);
  corrupt.styleSheets['style-nova.css'].content += '/* drift */';
  assert.throws(() => nativeKbdPresets(corrupt), /integrity/);
  const expanded = structuredClone(inventory),
    sheet = expanded.styleSheets['style-nova.css'];
  sheet.content += '\n.cn-kbd-action { @apply p-4; }';
  sheet.sha256 = sha256(sheet.content);
  assert.throws(() => nativeKbdPresets(expanded), /selectors/);
});

test('new descendant keyboard rules cannot bypass the reviewed selector inventory', () => {
  const inventory = loadOfficialRegistry(),
    sheet = inventory.styleSheets['style-nova.css'];
  sheet.content += '\n.cn-kbd > svg { @apply size-6; }';
  sheet.sha256 = sha256(sheet.content);
  assert.throws(() => nativeKbdPresets(inventory), /selectors/);
});
