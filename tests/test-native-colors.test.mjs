import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNativeRegistryColors, validateRegistryColors } from '../scripts/shadcn-colors.mjs';
import { loadOfficialRegistry } from '../scripts/shadcn-registry.mjs';
test('all 244 official named registry colors retain pinned upstream palette evidence', () => {
  const catalog = loadNativeRegistryColors(),
    inventory = loadOfficialRegistry();
  validateRegistryColors(inventory, catalog);
  assert.equal(Object.keys(catalog.colors).length, 244);
  assert.equal(catalog.colors['red-500'], '#ef4444');
  assert.equal(catalog.source.commit, inventory.source.commit);
  const stale = structuredClone(catalog);
  stale.source.sha256 = '0'.repeat(64);
  assert.throws(() => validateRegistryColors(inventory, stale), /Stale/);
  const invalid = structuredClone(catalog);
  invalid.colors['red-500'] = 'var(--red)';
  assert.throws(() => validateRegistryColors(inventory, invalid), /Stale/);
  invalid.sha256 = createHash('sha256').update(JSON.stringify(invalid.colors)).digest('hex');
  assert.throws(() => validateRegistryColors(inventory, invalid), /Invalid/);
  const incomplete = structuredClone(catalog);
  incomplete.colors = {};
  incomplete.sha256 = createHash('sha256').update(JSON.stringify(incomplete.colors)).digest('hex');
  assert.throws(() => validateRegistryColors(inventory, incomplete), /Incomplete/);
});

test('Tailwind 4 utilities retain their independent immutable source and 288 modern colors', async () => {
  const { loadUtilityColors, validateUtilityColors } =
    await import('../scripts/native-utility-colors.mjs');
  const catalog = loadUtilityColors();
  validateUtilityColors(catalog);
  assert.equal(Object.keys(catalog.colors).length, 288);
  assert.notEqual(catalog.colors['red-500'], loadNativeRegistryColors().colors['red-500']);
  assert.equal(catalog.source.version, '4.3.0');
  for (const family of ['mauve', 'olive', 'mist', 'taupe'])
    assert.ok(catalog.colors[family + '-500']);
  const changed = structuredClone(catalog);
  changed.source.css += ' ';
  assert.throws(() => validateUtilityColors(changed), /source/);
  const wrong = structuredClone(catalog);
  wrong.colors['red-500'] = '#ef4444';
  wrong.sha256 = createHash('sha256').update(JSON.stringify(wrong.colors)).digest('hex');
  assert.throws(() => validateUtilityColors(wrong), /conversion drift/);
});
