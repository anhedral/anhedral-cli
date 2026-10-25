import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertNativeAndroidResult,
  nativeAndroidTestCount,
  nativeAndroidTestGradle,
  nativeAndroidTestSelection,
  nativeAndroidRunResult,
} from '../scripts/native-ui-android.mjs';
const result = (count = 19) =>
  Array.from(
    { length: count },
    () => 'INSTRUMENTATION_STATUS_CODE: 1\nINSTRUMENTATION_STATUS_CODE: 0\n',
  ).join('') + `OK (${count} tests)\nINSTRUMENTATION_CODE: -1\n`;
test('Android native acceptance requires every expected instrumentation case and rejects skips, crashes and incomplete output', () => {
  assert.deepEqual(assertNativeAndroidResult(result()), { tests: 19, failures: 0 });
  for (const output of [
    '',
    result(0),
    result(7),
    result(8),
    result().replace('STATUS_CODE: 0', 'STATUS_CODE: -2'),
    result().replace('STATUS_CODE: 0', 'STATUS_CODE: -3'),
    result() + 'INSTRUMENTATION_CODE: 0\n',
    result().replace('INSTRUMENTATION_CODE: -1', 'Process crashed'),
    'OK (8 tests)\nINSTRUMENTATION_CODE: -1\n',
  ])
    assert.throws(() => assertNativeAndroidResult(output), /did not pass every expected test/);
  assert.throws(() => assertNativeAndroidResult(result(0), 0), /did not pass every expected test/);
});
test('Android QA instrumentation attaches idempotently to the owned release app and preserves existing Gradle content', () => {
  const source =
    'plugins { id "com.android.application" }\nandroid { namespace "dev.anhedral.registryqa" }\n';
  const patched = nativeAndroidTestGradle(source);
  assert.ok(patched.startsWith(source));
  assert.equal(nativeAndroidTestGradle(patched), patched);
  assert.match(patched, /testBuildType "release"/);
  assert.match(patched, /uiautomator:2\.4\.0/);
  const begin = '// BEGIN ANHEDRAL NATIVE REGISTRY QA',
    end = '// END ANHEDRAL NATIVE REGISTRY QA';
  for (const bad of [begin, end, begin + begin + end + end, end + begin])
    assert.throws(() => nativeAndroidTestGradle(bad), /Ambiguous/);
});
test('the native Android suite owns every required case and retains device artifacts', () => {
  const source = readFileSync('tests/native-ui/device/RegistryAndroidTests.kt', 'utf8');
  assert.equal((source.match(/@Test fun /g) ?? []).length, nativeAndroidTestCount);
  for (const name of [
    'nativeLayoutPrimitivesMeasureAuthoredGeometry',
    'nativeCardPresetsRetainMeasuredSpacing',
    'allButtonPresetsRetainGeometryAndActions',
    'inlineAndComposedLinksReachNativeDestinations',
    'composedNativeHostsDeliverExactlyOneAction',
    'authoredDescriptionsRetainTermsAndValues',
    'authoredLabelFocusesTheAssociatedNativeInput',
    'authoredPaginationRetainsSelectionAndBoundaries',
    'authoredToggleRetainsNativeSelection',
  ])
    assert.ok(source.includes('fun ' + name));
  assert.match(source, /takeScreenshot/);
  assert.match(source, /dumpWindowHierarchy/);
  assert.match(source, /evidenceRun/);
});

test('focused Android diagnostics select owned cases and cannot masquerade as complete native acceptance', () => {
  const source = readFileSync('tests/native-ui/device/RegistryAndroidTests.kt', 'utf8');
  const all = nativeAndroidTestSelection(source);
  assert.equal(all.length, nativeAndroidTestCount);
  const selected = nativeAndroidTestSelection(
    source,
    'sourceExampleLayoutsRetainPaddingFlexAndGridGeometry,authoredCardControlsAndListRetainNativeSemantics',
  );
  assert.equal(selected.length, 2);
  assert.deepEqual(nativeAndroidRunResult(result(2), selected, true), {
    tests: 2,
    failures: 0,
    phase: 'focused-passed',
  });
  assert.throws(() => nativeAndroidRunResult(result(2), selected), /selection requires review/);
  assert.throws(() => nativeAndroidTestSelection(source, 'missing'), /Unknown/);
  assert.throws(() => nativeAndroidTestSelection(source, all[0] + ',' + all[0]), /duplicate/);
  assert.throws(
    () => nativeAndroidTestSelection(source.replace('@Test fun ', 'fun ')),
    /count changed/,
  );
});
