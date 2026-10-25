import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  openSync,
  closeSync,
  copyFileSync,
} from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  prepareNativeQAApp,
  nativeQASourceManifest,
  seedNativeQADocument,
  nativeQADocumentName,
  nativeQADocumentContent,
  nativeQAStoryCountSource,
} from './native-ui-device.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
export const nativeAndroidTestCount = 18;
const start = '// BEGIN ANHEDRAL NATIVE REGISTRY QA',
  end = '// END ANHEDRAL NATIVE REGISTRY QA';
export function nativeAndroidTestGradle(source) {
  const block = `${start}
android {
    defaultConfig { testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner" }
    testBuildType "release"
}
dependencies {
    androidTestImplementation "androidx.test:runner:1.7.0"
    androidTestImplementation "androidx.test.ext:junit:1.3.0"
    androidTestImplementation "androidx.test.uiautomator:uiautomator:2.4.0"
}
${end}`;
  const beginnings = source.split(start).length - 1,
    endings = source.split(end).length - 1;
  if (
    beginnings !== endings ||
    beginnings > 1 ||
    (beginnings === 1 && source.indexOf(end) < source.indexOf(start))
  )
    throw Error('Ambiguous native Android QA Gradle markers.');
  return beginnings
    ? source.slice(0, source.indexOf(start)) +
        block +
        source.slice(source.indexOf(end) + end.length)
    : source + '\n' + block + '\n';
}
export function assertNativeAndroidResult(output, expected = nativeAndroidTestCount) {
  const match = /^OK \((\d+) tests?\)/m.exec(output);
  const statuses = [...output.matchAll(/^INSTRUMENTATION_STATUS_CODE: (-?\d+)/gm)].map((match) =>
    Number(match[1]),
  );
  const finalCodes = [...output.matchAll(/^INSTRUMENTATION_CODE: (-?\d+)\s*$/gm)].map((match) =>
    Number(match[1]),
  );
  if (
    !Number.isSafeInteger(expected) ||
    expected <= 0 ||
    !match ||
    Number(match[1]) !== expected ||
    finalCodes.length !== 1 ||
    finalCodes[0] !== -1 ||
    statuses.filter((code) => code === 1).length !== expected ||
    statuses.filter((code) => code === 0).length !== expected ||
    statuses.some((code) => code < 0) ||
    /FAILURES!!!|INSTRUMENTATION_FAILED|Process crashed/.test(output)
  )
    throw Error('Native Android instrumentation did not pass every expected test.');
  return { tests: Number(match[1]), failures: 0 };
}
export function nativeAndroidTestSelection(source, requested) {
  const available = [...source.matchAll(/@Test fun ([A-Za-z0-9]+)\(/g)].map((match) => match[1]);
  if (available.length !== nativeAndroidTestCount || new Set(available).size !== available.length)
    throw Error('Native instrumentation source count changed without review.');
  if (requested === undefined) return available;
  const selected = requested.split(',').map((value) => value.trim());
  if (
    selected.some((name) => !available.includes(name)) ||
    new Set(selected).size !== selected.length
  )
    throw Error('Unknown or duplicate focused native instrumentation selection.');
  return selected;
}
export function nativeAndroidRunResult(output, selected, focused = false) {
  if (
    !Array.isArray(selected) ||
    !selected.length ||
    new Set(selected).size !== selected.length ||
    (!focused && selected.length !== nativeAndroidTestCount)
  )
    throw Error('Native instrumentation selection requires review.');
  return {
    ...assertNativeAndroidResult(output, selected.length),
    phase: focused ? 'focused-passed' : 'passed',
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const value = (flag) => {
    const index = process.argv.indexOf(flag);
    return index < 0 ? undefined : process.argv[index + 1];
  };
  const qa = path.join(root, '.artifacts/native-ui-android/app');
  const { require, run } = await prepareNativeQAApp(qa);
  if (process.argv.includes('--prepare-only')) process.exit(0);
  const device = value('--device'),
    sdk = value('--sdk') ?? process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (!device || !/^emulator-\d+$/.test(device))
    throw Error('Pass --device emulator-<port> for a dedicated native QA emulator.');
  if (!sdk || !existsSync(path.join(sdk, 'platform-tools/adb')))
    throw Error('Set ANDROID_HOME or pass --sdk for an installed Android SDK.');
  if (!process.env.JAVA_HOME || !existsSync(path.join(process.env.JAVA_HOME, 'bin/java')))
    throw Error('Set JAVA_HOME to a supported JDK before building native Android QA.');
  const adb = path.join(sdk, 'platform-tools/adb'),
    stamp = new Date().toISOString().replace(/[:.]/g, '-'),
    evidence = path.join(root, '.artifacts/native-ui-android', stamp);
  mkdirSync(evidence, { recursive: true });
  copyFileSync(path.join(qa, 'QA-SOURCE.json'), path.join(evidence, 'source-manifest.json'));
  copyFileSync(fileURLToPath(import.meta.url), path.join(evidence, 'runner-source.mjs'));
  const testSource = nativeQAStoryCountSource(
    readFileSync(path.join(root, 'tests/native-ui/device/RegistryAndroidTests.kt'), 'utf8'),
    JSON.parse(readFileSync(path.join(qa, '.generated/NATIVE_RECIPES.json'))),
  );
  const focused = process.argv.includes('--tests');
  if (focused && value('--tests') === undefined)
    throw Error('Pass native instrumentation method names after --tests.');
  const selected = nativeAndroidTestSelection(testSource, focused ? value('--tests') : undefined);
  writeFileSync(path.join(evidence, 'test-source.kt'), testSource);
  const state = {
    schemaVersion: 1,
    device,
    source: JSON.parse(readFileSync(path.join(qa, '.generated/NATIVE_RECIPES.json'))).upstream,
    phase: 'prebuild',
    cases: selected,
    startedAt: new Date().toISOString(),
  };
  const save = () =>
    writeFileSync(path.join(evidence, 'result.json'), JSON.stringify(state, null, 2) + '\n');
  save();
  const capture = (command, args, file, cwd = qa) => {
    const descriptor = openSync(path.join(evidence, file), 'w');
    let result;
    try {
      result = spawnSync(command, args, {
        cwd,
        stdio: ['ignore', descriptor, descriptor],
        env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1', EXPO_NO_DOTENV: '1' },
      });
    } finally {
      closeSync(descriptor);
    }
    if (result.error) throw result.error;
    if (result.status !== 0)
      throw Error(command + ' exited ' + result.status + '; inspect ' + file);
    return readFileSync(path.join(evidence, file), 'utf8');
  };
  try {
    const connected = execFileSync(adb, ['devices'], { encoding: 'utf8' });
    if (!connected.split('\n').some((line) => line.startsWith(device + '\tdevice')))
      throw Error('The dedicated emulator is not connected and ready.');
    run(process.execPath, [
      require.resolve('expo/bin/cli'),
      'prebuild',
      '--no-install',
      '--platform',
      'android',
      qa,
    ]);
    writeFileSync(
      path.join(evidence, 'source-manifest.json'),
      JSON.stringify(nativeQASourceManifest(qa), null, 2) + '\n',
    );
    const gradle = path.join(qa, 'android/app/build.gradle');
    writeFileSync(gradle, nativeAndroidTestGradle(readFileSync(gradle, 'utf8')));
    const testDirectory = path.join(qa, 'android/app/src/androidTest/java/dev/anhedral/registryqa');
    mkdirSync(testDirectory, { recursive: true });
    writeFileSync(path.join(testDirectory, 'RegistryAndroidTests.kt'), testSource);
    state.phase = 'build';
    save();
    capture(
      path.join(qa, 'android/gradlew'),
      [
        ':app:assembleRelease',
        ':app:assembleReleaseAndroidTest',
        '-PreactNativeArchitectures=arm64-v8a',
        '--no-daemon',
        '--console=plain',
      ],
      'gradle.log',
      path.join(qa, 'android'),
    );
    const apk = path.join(qa, 'android/app/build/outputs/apk/release/app-release.apk'),
      testApk = path.join(
        qa,
        'android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk',
      );
    state.apkSha256 = createHash('sha256').update(readFileSync(apk)).digest('hex');
    state.testApkSha256 = createHash('sha256').update(readFileSync(testApk)).digest('hex');
    copyFileSync(apk, path.join(evidence, 'registry-qa.apk'));
    copyFileSync(testApk, path.join(evidence, 'registry-qa-tests.apk'));
    state.phase = 'install';
    save();
    capture(adb, ['-s', device, 'install', '-r', apk], 'install-app.log');
    capture(adb, ['-s', device, 'install', '-r', testApk], 'install-tests.log');
    const fixture = seedNativeQADocument(evidence),
      remoteDocument = '/sdcard/Download/' + nativeQADocumentName;
    const existingDocument = spawnSync(adb, ['-s', device, 'shell', 'cat', remoteDocument], {
      encoding: 'utf8',
    });
    if (existingDocument.status === 0 && existingDocument.stdout !== nativeQADocumentContent)
      throw Error('Refusing to overwrite an unrelated emulator document.');
    if (existingDocument.status !== 0)
      capture(adb, ['-s', device, 'push', fixture, remoteDocument], 'seed-document.log');
    capture(
      adb,
      [
        '-s',
        device,
        'shell',
        'am',
        'broadcast',
        '-a',
        'android.intent.action.MEDIA_SCANNER_SCAN_FILE',
        '-d',
        'file://' + remoteDocument,
      ],
      'scan-document.log',
    );
    state.phase = 'instrumentation';
    save();
    const output = capture(
      adb,
      [
        '-s',
        device,
        'shell',
        'am',
        'instrument',
        '-w',
        '-r',
        '-e',
        'class',
        focused
          ? selected.map((name) => 'dev.anhedral.registryqa.RegistryAndroidTests#' + name).join(',')
          : 'dev.anhedral.registryqa.RegistryAndroidTests',
        '-e',
        'evidenceRun',
        stamp,
        'dev.anhedral.registryqa.test/androidx.test.runner.AndroidJUnitRunner',
      ],
      'instrumentation.log',
    );
    Object.assign(state, nativeAndroidRunResult(output, selected, focused));
  } catch (error) {
    Object.assign(state, { phase: 'failed', error: error.message });
    throw error;
  } finally {
    const remote = '/sdcard/Android/data/dev.anhedral.registryqa/files/native-qa/' + stamp;
    const pulled = spawnSync(adb, ['-s', device, 'pull', remote, path.join(evidence, 'device')], {
      encoding: 'utf8',
    });
    writeFileSync(
      path.join(evidence, 'pull.log'),
      String(pulled.stdout ?? '') + String(pulled.stderr ?? ''),
    );
    state.artifactsCollected = pulled.status === 0;
    const logs = spawnSync(
      adb,
      [
        '-s',
        device,
        'logcat',
        '-d',
        '-t',
        '2000',
        'AndroidRuntime:V',
        'ReactNativeJS:V',
        'ReactNative:V',
        '*:S',
      ],
      { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 },
    );
    writeFileSync(
      path.join(evidence, 'logcat.log'),
      String(logs.stdout ?? '') + String(logs.stderr ?? ''),
    );
    state.finishedAt = new Date().toISOString();
    save();
    console.log('Native Android evidence: ' + evidence);
  }
}
