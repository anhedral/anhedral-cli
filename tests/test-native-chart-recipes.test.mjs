import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import {
  loadNativeChartRecipes,
  portChartRecipe,
  validateNativeChartRecipes,
  assertChartLiteralInputs,
  chartLiteralInputs,
} from '../scripts/native-chart-recipes.mjs';
import { loadOfficialRegistry } from '../scripts/shadcn-registry.mjs';
const hash = (v) => createHash('sha256').update(v).digest('hex');
test('all 231 chart blocks/examples retain pinned official provenance and executable native-only source', () => {
  const catalog = loadNativeChartRecipes(),
    inventory = loadOfficialRegistry();
  assert.equal(catalog.recipes.length, 231);
  assert.deepEqual(catalog.upstream, inventory.source);
  const names = new Set();
  for (const r of catalog.recipes) {
    assert.equal(inventory.sources[r.origin].sha256, r.upstreamSha256);
    assert.equal(hash(r.source), r.nativeSha256);
    assert.ok(!names.has(r.kind + '/' + r.style + '/' + r.name));
    names.add(r.kind + '/' + r.style + '/' + r.name);
    const f = ts.createSourceFile(
      r.name + '.tsx',
      r.source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    assert.deepEqual(f.parseDiagnostics, []);
    function visit(n) {
      if (ts.isImportDeclaration(n))
        assert.ok(!/^(recharts|lucide-react$|@\/)/.test(n.moduleSpecifier.text), r.origin);
      if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n))
        assert.ok(!/^[a-z]/.test(n.tagName.getText(f)), r.origin);
      if (ts.isJsxAttribute(n))
        assert.ok(
          !['onClick', 'dangerouslySetInnerHTML', 'dominantBaseline'].includes(n.name.getText(f)),
          r.origin,
        );
      ts.forEachChild(n, visit);
    }
    visit(f);
    assert.match(r.source, /chartData|ChartData|desktopData|TooltipDemo/);
  }
  for (const style of ['default', 'new-york', 'new-york-v4'])
    assert.equal(catalog.recipes.filter((r) => r.kind === 'block' && r.style === style).length, 70);
});
test('recipe translator preserves data, interactive state and handlers and explicitly adapts browser-only color injection', () => {
  const source = `import * as React from 'react';
 import {ChartContainer, ChartStyle} from '@/registry/new-york-v4/ui/chart';
 const chartData=[{date:'2024-01-01',desktop:123}];
 export default function Demo(){const [active,setActive]=React.useState('desktop');return <div><ChartStyle id="id" config={{}}/><button aria-label="Switch series" onClick={()=>setActive('mobile')}>{active}</button><ChartContainer config={{}}><span>{chartData[0].desktop}</span></ChartContainer></div>}`;
  const native = portChartRecipe(source, 'fixture.tsx');
  assert.match(native, /desktop: 123/);
  assert.match(native, /setActive\('mobile'\)/);
  assert.match(native, /onPress/);
  assert.match(native, /accessibilityLabel="Switch series"/);
  assert.doesNotMatch(native, /<ChartStyle/);
  assert.match(native, /<RegistryView>/);
  assert.match(native, /ChartContainer/);
  assert.throws(
    () => portChartRecipe('export default () => <iframe />', 'bad.tsx'),
    /Unreviewed browser host/,
  );
  assert.throws(
    () => portChartRecipe("import fs from 'node:fs';export default()=>null", 'bad.tsx'),
    /Unreviewed chart import/,
  );
});

test('native chart review fails on changed source, style/dependency input or translated output', () => {
  const inventory = loadOfficialRegistry(),
    catalog = loadNativeChartRecipes();
  validateNativeChartRecipes(inventory, catalog);
  const staleSource = structuredClone(inventory);
  staleSource.sources[catalog.recipes[0].origin].sha256 = '0'.repeat(64);
  assert.throws(
    () => validateNativeChartRecipes(staleSource, catalog),
    /Stale native chart source/,
  );
  const changedOutput = structuredClone(catalog);
  changedOutput.recipes[0].source += '\n// Changed after review';
  assert.throws(
    () => validateNativeChartRecipes(inventory, changedOutput),
    /Changed native chart output/,
  );
  const staleDependency = structuredClone(inventory);
  const source = staleDependency.registries['new-york-v4'].items.find(
    (item) => item.name === 'chart' && item.type === 'registry:ui',
  ).files[0].source;
  staleDependency.sources[source].sha256 = '1'.repeat(64);
  assert.throws(() => validateNativeChartRecipes(staleDependency, catalog), /style\/dependency/);
});

test('chart translation refuses changed, reordered or omitted data/config literals and preserves scoped duplicate datasets', () => {
  const source = `const chartData=[{month:"January",visits:10},{month:"February",visits:20}];const chartConfig={visits:{label:"Visits",color:"var(--chart-1)"}} satisfies ChartConfig;function Other(){const chartData=[{value:30}];return null}`;
  const native = portChartRecipe(source, 'fixture.tsx');
  assert.equal(chartLiteralInputs(source).length, 3);
  const review = assertChartLiteralInputs(source, native, 'fixture.tsx');
  assert.equal(review.count, 3);
  for (const changed of [
    native.replace('visits: 10', 'visits: 11'),
    native.replace('var(--chart-1)', 'var(--chart-2)'),
    native.replace('value: 30', 'value: 0'),
  ])
    assert.throws(
      () => assertChartLiteralInputs(source, changed, 'fixture.tsx'),
      /literals changed/,
    );
  assert.throws(
    () => assertChartLiteralInputs('const chartData=[1,2];', 'const chartData=[2,1];', 'order.tsx'),
    /literals changed/,
  );
  assert.throws(
    () => assertChartLiteralInputs('const chartData=[1];', 'const renamed=[];', 'omitted.tsx'),
    /literals changed/,
  );
  const catalog = loadNativeChartRecipes();
  assert.equal(catalog.recipes.length, 231);
  assert.ok(catalog.recipes.every((recipe) => recipe.dataInputs.count > 0));
  const changed = structuredClone(catalog);
  changed.recipes[0].dataInputs.sha256 = 'changed';
  assert.throws(
    () => validateNativeChartRecipes(loadOfficialRegistry(), changed),
    /data\/config review/,
  );
});
