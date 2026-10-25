import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNativeExampleRecipes } from '../scripts/native-example-recipes.mjs';
import { validateNativeChartRecipes } from '../scripts/native-chart-recipes.mjs';
import { loadOfficialRegistry } from '../scripts/shadcn-registry.mjs';
test('215 authored component examples retain native source and complete source/style/dependency provenance', () => {
  const catalog = loadNativeExampleRecipes();
  validateNativeChartRecipes(loadOfficialRegistry(), catalog);
  assert.equal(catalog.recipes.length, 215);
  for (const recipe of catalog.recipes)
    assert.doesNotMatch(recipe.source, /<(?:div|span|button|input|form|svg)\b|onClick=/);
  const pagination = catalog.recipes.find((recipe) => recipe.name === 'pagination-demo');
  assert.match(pagination.source, /setPage/);
  assert.doesNotMatch(pagination.source, /href="#"/);
  const otp = catalog.recipes.find((recipe) => recipe.name === 'input-otp-controlled');
  assert.match(otp.source, /onChange=/);
  assert.doesNotMatch(otp.source, /onChangeText=/);
});

test('recipe generation preserves typed render callbacks, lowercase APIs and unique component aliases', async () => {
  const { portNativeRegistryRecipe, validateNativeRecipeSyntax } =
    await import('../scripts/native-chart-recipes.mjs');
  const source = `import {Select,SelectValue} from '@/registry/bases/base/ui/select';
  import {NativeSelect} from '@/registry/bases/base/ui/native-select';
  import {toast} from '@/registry/bases/base/ui/toast';
  const people=[{value:'one',label:'One'}];
  export default function Example(){toast.add({title:'Hello'});return <Select items={people} itemToStringValue={item=>item.value}><SelectValue/><NativeSelect/></Select>}`;
  const output = portNativeRegistryRecipe(
    source,
    'apps/v4/registry/bases/base/examples/fixture.tsx',
    { nativeForms: true },
  );
  validateNativeRecipeSyntax(output, 'fixture.tsx');
  assert.match(output, /itemToStringValue=\{/);
  assert.match(output, /toast\.add/);
  assert.doesNotMatch(output, /const toast = withRegistryStyles/);
  assert.throws(
    () => validateNativeRecipeSyntax('export default()=> <Select value=>', 'broken.tsx'),
    /Invalid translated/,
  );
});
