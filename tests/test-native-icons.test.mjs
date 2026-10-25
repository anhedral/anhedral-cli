import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNativeIcons, validateNativeIcons } from '../scripts/native-icons.mjs';
import { loadOfficialRegistry } from '../scripts/shadcn-registry.mjs';
test('all 166 authored Lucide selections retain native implementations and source provenance', () => {
  const catalog = loadNativeIcons(),
    inventory = loadOfficialRegistry();
  validateNativeIcons(inventory, catalog);
  assert.equal(catalog.icons.length, 166);
  assert.equal(new Set(catalog.icons).size, 166);
  assert.ok(catalog.icons.includes('TrendingUpIcon'));
  assert.ok(catalog.icons.includes('CopyIcon'));
  const changed = structuredClone(inventory);
  changed.sources[Object.keys(catalog.inputs)[0]].sha256 = '0'.repeat(64);
  assert.throws(() => validateNativeIcons(changed, catalog), /Stale native icon caller/);
});
