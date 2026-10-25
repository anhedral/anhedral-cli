import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNativeFormRecipes } from '../scripts/native-form-recipes.mjs';
import {
  validateNativeChartRecipes,
  portNativeRegistryRecipe,
} from '../scripts/native-chart-recipes.mjs';
import { loadOfficialRegistry } from '../scripts/shadcn-registry.mjs';
test('every official RHF example retains reviewed source, schemas, event bindings and scoped native form association', () => {
  const catalog = loadNativeFormRecipes(),
    inventory = loadOfficialRegistry();
  validateNativeChartRecipes(inventory, catalog);
  assert.equal(catalog.recipes.length, 34);
  assert.equal(catalog.recipes.filter((recipe) => recipe.kind === 'support').length, 4);
  const rhf = catalog.recipes.filter((recipe) => recipe.name.startsWith('form-rhf-'));
  assert.equal(rhf.length, 10);
  for (const recipe of rhf) {
    assert.match(recipe.source, /<NativeFormScope>/);
    assert.match(recipe.source, /<NativeForm\b/);
    assert.match(recipe.source, /formSchema/);
    assert.match(recipe.source, /name=/, 'Controller field names must survive translation');
    assert.doesNotMatch(recipe.source, /<form\b|<input\b|<pre\b|<code\b|e\.target\.value|onClick=/);
  }
  const drift = structuredClone(inventory);
  drift.sources[rhf[0].origin].sha256 = '0'.repeat(64);
  assert.throws(() => validateNativeChartRecipes(drift, catalog), /Stale native chart source/);
});
test('unknown DOM hosts and toast presentation fail instead of silently dropping behavior', () => {
  assert.throws(
    () =>
      portNativeRegistryRecipe('export default()=> <input />', 'unknown.tsx', {
        nativeForms: true,
      }),
    /Unreviewed browser host/,
  );
  assert.throws(
    () =>
      portNativeRegistryRecipe('toast("x", {style:{color:"red"}})', 'unknown.tsx', {
        nativeForms: true,
      }),
    /Unreviewed native form toast style/,
  );
});
