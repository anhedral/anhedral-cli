import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOfficialRegistry, sha256 } from '../scripts/shadcn-registry.mjs';
import { nativeExampleLayout, reviewedExampleLayouts } from '../scripts/native-example-layout.mjs';
test('example gallery keeps every reviewed source slot, breakpoint, container rule and child-selector boundary', () => {
  const result = nativeExampleLayout(loadOfficialRegistry());
  assert.equal(Object.keys(result.sources).length, 3);
  assert.match(result.slots.wrapper, /md:grid-cols-2 md:gap-8 lg:p-12 2xl:max-w-6xl/);
  assert.match(result.slots.content, /p-12/);
  assert.match(result.slots.content, /\*:\[div:not\(\[class\*='w-'\]\)\]:w-full/);
  assert.match(result.slots.example, /lg:max-w-none/);
  assert.equal(result.globals.radius.xl, 1.4);
});
test('gallery layout cannot inherit its old review after a source or native metric formula changes', () => {
  for (const input of Object.values(reviewedExampleLayouts)) {
    const inventory = loadOfficialRegistry();
    inventory.sources[input.origin].sha256 = 'changed';
    assert.throws(() => nativeExampleLayout(inventory), /source changed/);
  }
  const inventory = loadOfficialRegistry(),
    sheet = inventory.styleGlobals['apps/v4/app/globals.css'];
  sheet.content = sheet.content.replace(
    '--radius-xl: calc(var(--radius) * 1.4);',
    '--radius-xl: unsupported;',
  );
  sheet.sha256 = sha256(sheet.content);
  assert.throws(() => nativeExampleLayout(inventory), /radius formulas/);
});
