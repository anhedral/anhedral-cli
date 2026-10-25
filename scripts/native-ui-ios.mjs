import { readFileSync, writeFileSync, mkdirSync, openSync, closeSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { prepareNativeQAApp, nativeQASourceManifest } from './native-ui-device.mjs';
export { nativeQAApp, nativeQAExport } from './native-ui-device.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
export const nativeIOSTestCount = 11;
export function assertNativeIOSResult(summary, expected = nativeIOSTestCount, device) {
  if (
    !Number.isSafeInteger(expected) ||
    expected <= 0 ||
    summary.result !== 'Passed' ||
    summary.totalTestCount !== expected ||
    summary.passedTests !== expected ||
    summary.failedTests !== 0 ||
    summary.skippedTests !== 0 ||
    summary.expectedFailures !== 0 ||
    !Array.isArray(summary.testFailures) ||
    summary.testFailures.length !== 0 ||
    !Array.isArray(summary.devicesAndConfigurations) ||
    summary.devicesAndConfigurations.length !== 1 ||
    summary.devicesAndConfigurations.some(
      (entry) =>
        entry.passedTests !== expected ||
        entry.failedTests !== 0 ||
        entry.skippedTests !== 0 ||
        entry.expectedFailures !== 0 ||
        (device && entry.device?.deviceId !== device),
    )
  )
    throw Error('Native XCTest did not pass every expected case on the requested simulator.');
  return { tests: expected, failures: 0 };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const qa = path.join(root, '.artifacts/native-ui-ios/app');
  const { require, run } = await prepareNativeQAApp(qa);
  if (process.argv.includes('--prepare-only')) process.exit(0);
  const deviceIndex = process.argv.indexOf('--device'),
    device = process.argv[deviceIndex + 1];
  if (deviceIndex < 0 || !device || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(device))
    throw Error(
      'Pass --device <dedicated simulator UUID>. Expo 57 requires a supported runtime; iOS 27 scene lifecycle remains unresolved.',
    );
  run(process.execPath, [
    require.resolve('expo/bin/cli'),
    'prebuild',
    '--no-install',
    '--platform',
    'ios',
    qa,
  ]);
  run('pod', ['install'], path.join(qa, 'ios'));
  const source = readFileSync(
    path.join(root, 'tests/native-ui/device/RegistryUITests.swift'),
    'utf8',
  );
  mkdirSync(path.join(qa, 'ios/RegistryUITests'), { recursive: true });
  writeFileSync(path.join(qa, 'ios/RegistryUITests/RegistryUITests.swift'), source);
  const ruby = `require 'xcodeproj'
p=ARGV[0];project=Xcodeproj::Project.open(p)
t=project.targets.find{|x|x.name=='RegistryUITests'}||project.new_target(:ui_test_bundle,'RegistryUITests',:ios,'16.4')
group=project.main_group.find_subpath('RegistryUITests',true)
file=group.files.find{|x|x.path=='RegistryUITests/RegistryUITests.swift'}||group.new_file('RegistryUITests/RegistryUITests.swift')
t.source_build_phase.add_file_reference(file) unless t.source_build_phase.files_references.include?(file)
app=project.targets.find{|x|x.name=='AnhedralRegistryQA'};t.add_dependency(app) unless t.dependencies.any?{|x|x.target==app}
t.build_configurations.each{|c|c.build_settings.merge!({'TEST_TARGET_NAME'=>'AnhedralRegistryQA','PRODUCT_NAME'=>'$(TARGET_NAME)','PRODUCT_MODULE_NAME'=>'RegistryUITests','PRODUCT_BUNDLE_IDENTIFIER'=>'dev.anhedral.registryqa.tests','GENERATE_INFOPLIST_FILE'=>'YES','SWIFT_VERSION'=>'5.0','CODE_SIGNING_ALLOWED'=>'NO','TARGETED_DEVICE_FAMILY'=>'1,2'})}
project.save
scheme=Xcodeproj::XCScheme.new(p+'/xcshareddata/xcschemes/AnhedralRegistryQA.xcscheme')
scheme.add_test_target(t) unless scheme.test_action.testables.any?{|x|x.buildable_references.any?{|r|r.xml_element.attributes['BlueprintIdentifier']==t.uuid}}
scheme.test_action.build_configuration='Release';scheme.save_as(p,'AnhedralRegistryQA',true)
`;
  run('ruby', ['-rxcodeproj', '-e', ruby, path.join(qa, 'ios/AnhedralRegistryQA.xcodeproj')]);
  const evidence = path.join(
    root,
    '.artifacts/native-ui-ios',
    new Date().toISOString().replace(/[:.]/g, '-'),
  );
  mkdirSync(evidence, { recursive: true });
  writeFileSync(
    path.join(evidence, 'source-manifest.json'),
    JSON.stringify(nativeQASourceManifest(qa), null, 2) + '\n',
  );
  writeFileSync(path.join(evidence, 'test-source.swift'), source);
  copyFileSync(fileURLToPath(import.meta.url), path.join(evidence, 'runner-source.mjs'));
  const log = openSync(path.join(evidence, 'xcode.log'), 'w');
  const result = spawnSync(
    'xcodebuild',
    [
      '-workspace',
      path.join(qa, 'ios/AnhedralRegistryQA.xcworkspace'),
      '-scheme',
      'AnhedralRegistryQA',
      '-configuration',
      'Release',
      '-sdk',
      'iphonesimulator',
      '-destination',
      'id=' + device,
      '-derivedDataPath',
      path.join(root, '.artifacts/native-ui-ios/derived'),
      '-resultBundlePath',
      path.join(evidence, 'results.xcresult'),
      // Keep XCTest results/screenshots; automatic full-system diagnostics can stall simulator completion.
      '-collect-test-diagnostics',
      'never',
      'ONLY_ACTIVE_ARCH=YES',
      'CODE_SIGNING_ALLOWED=NO',
      'test',
    ],
    {
      cwd: qa,
      stdio: ['ignore', log, log],
      env: { ...process.env, EXPO_NO_TELEMETRY: '1', EXPO_NO_DOTENV: '1' },
    },
  );
  closeSync(log);
  console.log('Native XCTest evidence: ' + evidence);
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error('Native XCTest failed; inspect retained evidence.');
  const report = spawnSync(
    'xcrun',
    [
      'xcresulttool',
      'get',
      'test-results',
      'summary',
      '--path',
      path.join(evidence, 'results.xcresult'),
    ],
    { encoding: 'utf8' },
  );
  if (report.error) throw report.error;
  if (report.status !== 0) throw Error('Native XCTest summary could not be read.');
  writeFileSync(path.join(evidence, 'summary.json'), report.stdout);
  const passed = assertNativeIOSResult(JSON.parse(report.stdout), nativeIOSTestCount, device);
  writeFileSync(
    path.join(evidence, 'result.json'),
    JSON.stringify({ phase: 'passed', device, ...passed }, null, 2) + '\n',
  );
}
