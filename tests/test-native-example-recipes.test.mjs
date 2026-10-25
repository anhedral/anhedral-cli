import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNativeExampleRecipes } from '../scripts/native-example-recipes.mjs';
import { validateNativeChartRecipes } from '../scripts/native-chart-recipes.mjs';
import { loadOfficialRegistry } from '../scripts/shadcn-registry.mjs';
test('491 authored component examples retain native source and complete source/style/dependency provenance', () => {
  const catalog = loadNativeExampleRecipes();
  validateNativeChartRecipes(loadOfficialRegistry(), catalog);
  assert.equal(catalog.recipes.length, 491);
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

test('authored image recipes retain remote sources, aspect ratios and filter utilities without Next image imports', async () => {
  const catalog = loadNativeExampleRecipes();
  const images = catalog.recipes.filter((recipe) => recipe.name.startsWith('aspect-ratio-'));
  assert.equal(images.length, 6);
  for (const recipe of images) {
    assert.match(recipe.source, /RegistryImage/);
    assert.doesNotMatch(recipe.source, /next\/image/);
    assert.match(recipe.source, /https:\/\//);
    if (!['default', 'new-york'].includes(recipe.style)) assert.match(recipe.source, /brightness/);
    assert.match(recipe.source, /ratio=/);
  }
  const { portNativeRegistryRecipe } = await import('../scripts/native-chart-recipes.mjs');
  const output = portNativeRegistryRecipe(
    'import Photo from "next/image"; export default function Demo(){return <figure><Photo src="https://example.test/a.jpg" alt="Photo" width={100} height={80}/><figcaption>Caption</figcaption></figure>}',
    'fixture.tsx',
  );
  assert.match(output, /RegistryImage as Photo/);
  assert.match(output, /RegistryText>Caption/);
  assert.throws(
    () => portNativeRegistryRecipe('import {getImageProps} from "next/image";', 'fixture.tsx'),
    /reviewed default/,
  );
});

test('legacy published examples retain their own source hashes and scoped color generation', () => {
  const recipes = loadNativeExampleRecipes().recipes;
  for (const style of ['default', 'new-york']) {
    const legacy = recipes.filter((recipe) => recipe.style === style);
    assert.equal(legacy.length, 101);
    for (const recipe of legacy) {
      assert.match(recipe.origin, /public\/r\/styles\/[^/]+\/[^#]+#registry\//);
      assert.match(recipe.source, /generation="legacy"/);
    }
    const button = legacy.find((recipe) => recipe.name === 'button-destructive');
    assert.notEqual(
      button.upstreamSha256,
      recipes.find((recipe) => recipe.style === 'new-york-v4' && recipe.name === button.name)
        .upstreamSha256,
    );
  }
});
test('legacy Lucide type imports stay types and never become component wrappers', async () => {
  const { portNativeRegistryRecipe } = await import('../scripts/native-chart-recipes.mjs');
  const translated = portNativeRegistryRecipe(
    'import { LucideIcon as IconType, Check } from "lucide-react"; export default function Demo(){ const icon:IconType = Check; return <Check/>; }',
    'fixture.tsx',
  );
  assert.match(translated, /type RegistryIcon as IconType/);
  assert.doesNotMatch(translated, /const IconType =/);
});

test('native anchor and Next Link compilation preserve destinations and semantic Button recipes', async () => {
  const { portNativeRegistryRecipe, validateNativeRecipeSyntax } =
    await import('../scripts/native-chart-recipes.mjs');
  const source = `import Link from 'next/link'; import {buttonVariants} from '@/registry/bases/base/ui/button';
  export default function Demo(){return <div><p>Read <a href="https://example.test">this</a>.</p><a href="#" className={buttonVariants()}>Top</a><Link href="/login" className={buttonVariants({variant:'outline',size:'sm'})}>Login</Link></div>}`;
  const output = portNativeRegistryRecipe(
    source,
    'apps/v4/registry/bases/base/examples/fixture.tsx',
  );
  validateNativeRecipeSyntax(output, 'fixture.tsx');
  assert.match(output, /RegistryLink as Link/);
  assert.match(output, /RegistryLink href="https:\/\/example.test"/);
  assert.match(output, /RegistryButtonLink href="#"/);
  assert.match(output, /RegistryButtonLink href="\/login"/);
  assert.match(output, /variant: 'outline', size: 'sm'/);
  assert.doesNotMatch(output, /buttonVariants\(/);
  assert.throws(
    () => portNativeRegistryRecipe('import {bad} from "next/link";', 'fixture.tsx'),
    /reviewed default/,
  );
  assert.throws(
    () =>
      portNativeRegistryRecipe(
        `import {buttonVariants} from '@/registry/bases/base/ui/button'; export default()=> <a href="#" className={buttonVariants(dynamic)}>Top</a>`,
        'fixture.tsx',
      ),
    /Unreviewed native button variant/,
  );
});

test('native registry view click conversion retains the authored state callback and explicit role', async () => {
  const { portNativeRegistryRecipe, validateNativeRecipeSyntax } =
    await import('../scripts/native-chart-recipes.mjs');
  const source = `import {useState} from 'react';export default function Demo(){const[open,setOpen]=useState(false);return <div><div role="button" onClick={()=>setOpen(true)}>Open</div>{open&&<span>Opened</span>}</div>}`;
  const output = portNativeRegistryRecipe(
    source,
    'apps/v4/registry/bases/base/examples/fixture.tsx',
  );
  validateNativeRecipeSyntax(output, 'fixture.tsx');
  assert.match(output, /RegistryView role="button" onPress=\{\(\) => setOpen\(true\)\}/);
  assert.match(output, /RegistryText>Opened/);
  assert.doesNotMatch(output, /onClick=/);
});

test('authored description lists retain native term/definition hosts instead of dropping their semantic associations', () => {
  const source = loadNativeExampleRecipes().recipes.find(
    (recipe) => recipe.style === 'base' && recipe.name === 'separator-example',
  ).source;
  assert.match(source, /RegistryDescriptionList/);
  assert.match(source, /RegistryDescriptionTerm/);
  assert.match(source, /RegistryDescriptionDetails/);
  assert.doesNotMatch(source, /<(?:dl|dt|dd)\b/);
});

test('input-group examples retain native Tabler glyphs, actual clipboard hooks, raw autosizing and favorite state', () => {
  const recipes = loadNativeExampleRecipes().recipes;
  const button = recipes.find((r) => r.name === 'input-group-button');
  assert.match(button.source, /@tabler\/icons-react-native/);
  assert.match(button.source, /registry-copy-to-clipboard/);
  assert.match(button.source, /data-active=\{isFavorite\}/);
  assert.match(button.source, /data-\[active=true\]:fill-blue-600/);
  const custom = recipes.find((r) => r.name === 'input-group-custom');
  assert.match(custom.source, /RegistryAutosizeTextarea as NativeAutosizeTextarea/);
  assert.match(custom.source, /nativeGroupControl=\{true\}/);
  assert.match(custom.source, /field-sizing-content/);
});
test('authored anchor tab attributes remain an explicit browser boundary while native destinations survive', async () => {
  const { portNativeRegistryRecipe } = await import('../scripts/native-chart-recipes.mjs');
  const output = portNativeRegistryRecipe(
    'export default()=> <a href="https://example.com" target="_blank" rel="noopener noreferrer">Open</a>',
    'fixture.tsx',
  );
  assert.match(output, /href="https:\/\/example.com"/);
  assert.doesNotMatch(output, /target=|rel=/);
  assert.throws(
    () =>
      portNativeRegistryRecipe(
        'import {OTPInput} from "input-otp";export default()=> <OTPInput/>',
        'fixture.tsx',
      ),
    /Unreviewed native input-otp/,
  );
});
