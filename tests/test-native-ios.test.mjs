import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import {
  nativeQAApp,
  nativeQAExport,
  assertNativeIOSResult,
  nativeIOSTestCount,
  nativeIOSTestSelection,
} from '../scripts/native-ui-ios.mjs';
import { loadNativeChartRecipes } from '../scripts/native-chart-recipes.mjs';
import { loadNativeFormRecipes } from '../scripts/native-form-recipes.mjs';
import { loadNativeExampleRecipes } from '../scripts/native-example-recipes.mjs';
test('native OS gallery selects actual default/named exports and rejects missing or ambiguous stories', () => {
  assert.equal(nativeQAExport('export default function Demo(){return null}'), 'default');
  assert.equal(nativeQAExport('export function ChartDemo(){return null}'), 'ChartDemo');
  assert.equal(nativeQAExport('export function Demo(){return null}', 'Demo'), 'Demo');
  assert.throws(
    () => nativeQAExport('export function Demo(){return null}', 'default'),
    /Missing authored/,
  );
  assert.throws(
    () => nativeQAExport('export function One(){};export function Two(){}'),
    /Ambiguous/,
  );
  assert.throws(
    () => nativeQAApp({ recipes: [{ name: '../escape', style: 'base' }] }, () => ''),
    /Unsafe QA/,
  );
});
test('the maintained OS gallery renders every recipe component and uses only actual public native UI helpers', () => {
  const recipes = [
    ...loadNativeChartRecipes().recipes,
    ...loadNativeFormRecipes().recipes,
    ...loadNativeExampleRecipes().recipes,
  ];
  const source = nativeQAApp({ recipes }, (recipe) => recipe.source);
  const rendered = recipes.filter((r) => r.kind !== 'support');
  assert.equal((source.match(/import \* as Story/g) ?? []).length, rendered.length);
  const tree = ts.createSourceFile(
    'App.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  assert.equal(tree.parseDiagnostics.length, 0);
  const registry = JSON.parse(readFileSync('assets/ui/native/registry.json'));
  const exports = new Set([
    'ThemeProvider',
    'ThemeSwitcher',
    ...registry.components.flatMap((c) => c.exports),
    ...(registry.supportModules ?? []).flatMap((module) => module.exports),
  ]);
  for (const owner of ['layout', 'text', 'theme-switcher']) {
    const source = ts.createSourceFile(
      owner + '.tsx',
      readFileSync('assets/ui/native/' + owner + '.tsx', 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    for (const node of source.statements)
      if (
        ts.isFunctionDeclaration(node) &&
        node.name &&
        node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
      )
        exports.add(node.name.text);
  }
  function visit(node) {
    if (ts.isPropertyAccessExpression(node) && node.expression.getText(tree) === 'UI')
      assert.ok(exports.has(node.name.text), 'Unpublished UI helper ' + node.name.text);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.match(source, /keyboardShouldPersistTaps="handled"/);
  assert.match(source, /Component:Story\d+\.ChartAreaAxes/);
  assert.match(source, /Component:Story\d+\.Demo/);
  assert.doesNotMatch(source, /UI\.Row/);
  assert.match(source, /native\/button-preset-matrix/);
  assert.match(source, /Component:NativeButtonPresetMatrix/);
});

test('native XCTest acceptance requires every expected case on the exact requested simulator without skips or expected failures', () => {
  const entry = {
    passedTests: 17,
    failedTests: 0,
    skippedTests: 0,
    expectedFailures: 0,
    device: { deviceId: 'owned' },
  };
  const result = {
    result: 'Passed',
    totalTestCount: 17,
    passedTests: 17,
    failedTests: 0,
    skippedTests: 0,
    expectedFailures: 0,
    testFailures: [],
    devicesAndConfigurations: [entry],
  };
  assert.deepEqual(assertNativeIOSResult(result, nativeIOSTestCount, 'owned'), {
    tests: 17,
    failures: 0,
  });
  for (const change of [
    { totalTestCount: 8 },
    { passedTests: 8 },
    { failedTests: 1 },
    { skippedTests: 1 },
    { expectedFailures: 1 },
    { testFailures: [{}] },
    { devicesAndConfigurations: [] },
    { devicesAndConfigurations: [entry, entry] },
    { devicesAndConfigurations: [{ ...entry, device: { deviceId: 'other' } }] },
  ])
    assert.throws(
      () => assertNativeIOSResult({ ...result, ...change }, 17, 'owned'),
      /did not pass every expected case/,
    );
  const source = readFileSync('tests/native-ui/device/RegistryUITests.swift', 'utf8');
  assert.equal((source.match(/func test[A-Z]/g) ?? []).length, nativeIOSTestCount);
  assert.match(source, /testNativeCardPresetsRetainMeasuredSpacing/);
  const runner = readFileSync('scripts/native-ui-ios.mjs', 'utf8');
  assert.match(runner, /'-collect-test-diagnostics',\s*'never'/);
});

test('focused XCTest runs select real methods and cannot masquerade as full acceptance', () => {
  const source = readFileSync('tests/native-ui/device/RegistryUITests.swift', 'utf8');
  assert.equal(nativeIOSTestSelection(source).length, nativeIOSTestCount);
  assert.deepEqual(
    nativeIOSTestSelection(source, 'testSystemDocumentPickerSelectionAndCancellation'),
    ['testSystemDocumentPickerSelectionAndCancellation'],
  );
  for (const selection of [
    '',
    'unknown',
    'testSystemDocumentPickerSelectionAndCancellation,testSystemDocumentPickerSelectionAndCancellation',
  ])
    assert.throws(() => nativeIOSTestSelection(source, selection), /Unknown or duplicate/);
  assert.throws(() => nativeIOSTestSelection(''), /count changed/);
});
