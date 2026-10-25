import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOfficialRegistry } from '../scripts/shadcn-registry.mjs';
import {
  loadNativeFontCatalog,
  officialFonts,
  validateFontCatalog,
  inspectNativeFont,
  verifyFontAsset,
} from '../scripts/shadcn-fonts.mjs';
const inventory = loadOfficialRegistry(),
  catalog = loadNativeFontCatalog();
test('every official registry font and heading mapping has native TrueType cuts and a retained license', () => {
  const official = officialFonts(inventory);
  assert.equal(Object.keys(official).length, 52);
  assert.equal(Object.keys(catalog.families).length, 26);
  assert.equal(Object.values(catalog.families).flatMap((family) => family.variants).length, 347);
  validateFontCatalog(inventory, catalog);
  for (const [id, item] of Object.entries(catalog.items)) {
    assert.deepEqual(item.upstream, official[id]);
    assert.match(
      catalog.families[item.family].license.text,
      /(?:SIL OPEN FONT LICENSE|Apache License)/i,
    );
    const body = id.replace('font-heading-', 'font-');
    assert.equal(catalog.items[body].family, item.family);
    if (id.startsWith('font-heading-')) assert.equal(item.upstream.variable, '--font-heading');
  }
});
test('upstream membership and weight changes cannot inherit old native font evidence', () => {
  const updated = structuredClone(inventory);
  for (const registry of Object.values(updated.registries)) {
    const item = registry.items.find((item) => item.name === 'font-inter');
    if (item) item.font.weight = ['950'];
  }
  assert.throws(() => validateFontCatalog(updated, catalog), /configuration changed/);
  const missing = structuredClone(catalog);
  delete missing.items['font-inter'];
  assert.throws(() => validateFontCatalog(inventory, missing), /membership changed/);
  const license = structuredClone(catalog);
  license.families.inter.license.text += 'mutated';
  assert.throws(() => validateFontCatalog(inventory, license), /license/);
  const browser = structuredClone(catalog);
  browser.families.inter.variants[0].file = 'inter.woff2';
  assert.throws(() => validateFontCatalog(inventory, browser), /Invalid native font asset/);
});
test('native asset verification rejects CSS/web fonts, truncated sfnt tables and changed bytes', () => {
  assert.throws(
    () => inspectNativeFont(Buffer.from('wOF2 not a native font')),
    /OpenType or TrueType/,
  );
  const invalid = Buffer.alloc(12);
  invalid.writeUInt32BE(0x10000);
  invalid.writeUInt16BE(20, 4);
  assert.throws(() => inspectNativeFont(invalid), /directory/);
  assert.throws(
    () => verifyFontAsset(catalog.families.inter.variants[0], Buffer.from('changed')),
    /bytes changed/,
  );
});
