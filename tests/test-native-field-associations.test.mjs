import test from 'node:test';
import assert from 'node:assert/strict';
import {
  portNativeRegistryRecipe,
  validateNativeRecipeSyntax,
} from '../scripts/native-chart-recipes.mjs';
const imports =
  "import {Label} from '@/registry/new-york-v4/ui/label';import {Input}from '@/registry/new-york-v4/ui/input';";
const port = (source) =>
  portNativeRegistryRecipe(source, 'apps/v4/registry/new-york-v4/examples/fixture.tsx', {
    nativeForms: true,
  });
test('authored label targets become isolated native field scopes without visual wrapper views', () => {
  const result = port(
    imports +
      'export default function Demo(){return <div><Label htmlFor="one">One</Label><Input id="one"/><Label htmlFor="two">Two</Label><Input id="two"/></div>}',
  );
  validateNativeRecipeSyntax(result, 'fixture.tsx');
  assert.match(result, /controlID="one"/);
  assert.match(result, /controlID="two"/);
  assert.equal((result.match(/invalid=\{false\}/g) ?? []).length, 2);
  assert.doesNotMatch(result, /htmlFor=/);
  assert.match(result, /NativeFieldProvider as NativeRegistryFieldScope/);
  assert.throws(
    () =>
      port(
        imports +
          'export default function Demo(){return <div><Label htmlFor="missing">Missing</Label><Input id="other"/></div>}',
      ),
    /Unresolved or ambiguous/,
  );
});
test('native association scopes preserve existing native fields, aliases, fragments and lexical identity', () => {
  const field = port(
    imports +
      "import {Field}from '@/registry/new-york-v4/ui/field';export default function Demo(){return <Field><Label htmlFor='one'>One</Label><Input id='one'/></Field>}",
  );
  assert.doesNotMatch(field, /NativeFieldProvider as/);
  const alias = port(
    "import {Label as Caption}from '@/registry/new-york-v4/ui/label';import {Input}from '@/registry/new-york-v4/ui/input';export default function Demo(){const id='one';return <><Caption htmlFor={id}>One</Caption><Input id={id}/></>}",
  );
  validateNativeRecipeSyntax(alias, 'alias.tsx');
  assert.match(alias, /controlID=\{id\}/);
  assert.match(alias, /NativeRegistryPalette generation="modern"/);
  assert.throws(
    () =>
      port(
        imports +
          "export default function Demo(){return <div><Label htmlFor='one'>One</Label><Field><Input id='one'/></Field></div>}",
      ),
    /Cross-field/,
  );
  assert.throws(
    () =>
      port(
        imports +
          'function Inner(){return <Input id="one"/>}export default function Demo(){return <div><Label htmlFor="one">One</Label><Inner/></div>}',
      ),
    /Unresolved or ambiguous/,
  );
});
