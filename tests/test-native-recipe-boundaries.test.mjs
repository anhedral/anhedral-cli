import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { portNativeRegistryRecipe } from '../scripts/native-chart-recipes.mjs';
function native(source, name = 'apps/v4/registry/default/examples/boundary.tsx') {
  const output = portNativeRegistryRecipe(source, name, { nativeForms: true });
  const tree = ts.createSourceFile(
    'native.tsx',
    output,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const boundaries = [],
    text = [];
  function visit(node) {
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(tree) === 'NativeRegistryPalette')
      boundaries.push(node);
    if (ts.isJsxText(node) && node.text.trim()) text.push(node.text.trim());
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return { output, tree, boundaries, text };
}
test('named exports and default aliases keep their actual registry context without introducing text around parenthesized JSX', () => {
  for (const source of [
    'export function Named(){return (<div>Label</div>)}',
    'function lower(){return (<div>Label</div>)} export default lower;',
    'const Named=()=> (<div>Label</div>); export {Named as default};',
  ]) {
    const result = native(source);
    assert.equal(result.boundaries.length, 1);
    assert.deepEqual(result.text, ['Label']);
    assert.match(result.output, /generation="legacy" source="default"/);
  }
});
test('conditional arrow roots stay executable JSX expressions and nested callbacks do not create extra field or palette scopes', () => {
  const conditional = native(
    'const enabled=true; export default()=>enabled?<div>One</div>:<div>Two</div>;',
  );
  let found = false;
  function visit(node) {
    if (ts.isJsxExpression(node) && node.expression && ts.isConditionalExpression(node.expression))
      found = true;
    ts.forEachChild(node, visit);
  }
  visit(conditional.tree);
  assert.ok(found);
  assert.deepEqual(conditional.text, ['One', 'Two']);
  const nested = native(
    'export default function Main(){return <div>{[1].map(item=>{return <span>{item}</span>})}</div>;}',
  );
  assert.equal(nested.boundaries.length, 1);
  assert.equal((nested.output.match(/<NativeFormScope>/g) ?? []).length, 1);
});
test('Base, Radix, Aria and frozen source generations retain distinct scope metadata', () => {
  for (const source of ['base', 'radix', 'aria'])
    assert.match(
      native('export const Demo=()=> <div/>;', `apps/v4/registry/bases/${source}/examples/demo.tsx`)
        .output,
      new RegExp(`generation="modern" source="${source}"`),
    );
  assert.match(
    native(
      'export default function Main(){return <div/>;}',
      'apps/v4/registry/new-york-v4/examples/demo.tsx',
    ).output,
    /generation="modern" source="new-york-v4"/,
  );
});
