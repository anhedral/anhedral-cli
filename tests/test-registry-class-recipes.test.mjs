import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSource } from '../scripts/shadcn-registry.mjs';
test('static class recipes retain base arrays, aliases, booleans, named defaults and every variant value', () => {
  const source = `import {cva as recipe} from 'class-variance-authority'; const common=['inline-flex','items-center']; export const button=recipe([...common,'rounded-md'],{variants:{variant:{default:'bg-primary',outline:['border','bg-background']},disabled:{true:'opacity-50',false:''}},defaultVariants:{variant:'default',disabled:false}});`;
  const result = analyzeSource(source, 'fixture.tsx').classRecipes.button;
  assert.deepEqual(result, {
    base: 'inline-flex items-center rounded-md',
    variants: {
      variant: { default: 'bg-primary', outline: 'border bg-background' },
      disabled: { true: 'opacity-50', false: '' },
    },
    defaultVariants: { variant: 'default', disabled: false },
    compoundVariants: [],
  });
});
test('dynamic style expressions and compound predicates remain unsupported data and are never executed', () => {
  const result = analyzeSource(
    `import * as CVA from 'class-variance-authority'; const example=CVA.cva(globalThis.__mustNeverRun(),{variants:{tone:{normal:computeStyle()}},compoundVariants:[{tone:dynamicPredicate(),class:'font-bold'}]});`,
    'fixture.tsx',
  ).classRecipes.example;
  assert.equal(globalThis.__mustNeverRun, undefined);
  assert.deepEqual(
    result.unsupported.map((item) => item.field),
    ['base', 'variants.tone.normal', 'compoundVariants[0].tone'],
  );
  assert.equal(result.unsupported[0].expression, 'globalThis.__mustNeverRun()');
});
test('lexically shadowed or cyclic references do not inherit an unrelated global style constant', () => {
  const result = analyzeSource(
    `import {cva} from 'class-variance-authority'; const common='global'; const cycle=cycle; function Example(common){const nested=cva(common);return null;} const cyclic=cva(cycle);`,
    'fixture.tsx',
  ).classRecipes;
  assert.equal(result.nested.base, undefined);
  assert.equal(result.cyclic.base, undefined);
  assert.equal(result.nested.unsupported[0].field, 'base');
  assert.equal(result.cyclic.unsupported[0].field, 'base');
});

test('compound class recipes retain finite predicates, choice arrays and both class fields', () => {
  const result = analyzeSource(
    `import {cva} from 'class-variance-authority'; const item=cva('',{compoundVariants:[{variant:['solid','outline'],size:'small',disabled:false,class:['px-2','py-1'],className:'font-medium'}]});`,
    'fixture.tsx',
  ).classRecipes.item;
  assert.deepEqual(result.compoundVariants, [
    {
      when: { variant: ['solid', 'outline'], size: 'small', disabled: false },
      className: 'px-2 py-1 font-medium',
    },
  ]);
  assert.equal(result.unsupported, undefined);
});
test('special variant keys remain own data properties without changing the analysis object prototype', () => {
  const result = analyzeSource(
    `import {cva} from 'class-variance-authority'; const __proto__=cva('base',{variants:{"__proto__":{"constructor":"font-bold"}},defaultVariants:{"__proto__":"constructor"}});`,
    'fixture.tsx',
  ).classRecipes;
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.ok(Object.hasOwn(result, '__proto__'));
  assert.ok(Object.hasOwn(result.__proto__.variants, '__proto__'));
  assert.equal(result.__proto__.variants.__proto__.constructor, 'font-bold');
});
