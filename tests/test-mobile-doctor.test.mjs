import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { inspectMobileProject } from '../src/mobile/doctor.ts';

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-mobile-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = path.join(root, 'apps/mobile');
  mkdirSync(app, { recursive: true });
  const put = (file, value) => writeFileSync(path.join(app, file), JSON.stringify(value));
  put('package.json', {
    dependencies: { expo: '~58.0.25', 'expo-router': '~58.0.0', 'expo-dev-client': '~58.0.0' },
  });
  put('app.json', {
    expo: {
      ios: { bundleIdentifier: 'com.example.app' },
      android: { package: 'com.example.app' },
      extra: { eas: { projectId: '11111111-1111-4111-8111-111111111111' } },
    },
  });
  put('eas.json', {
    build: {
      development: { developmentClient: true, ios: { simulator: true } },
      review: { ios: { simulator: true }, android: { buildType: 'apk' } },
    },
  });
  return { root, app, put };
}

test('valid static declarations are source evidence, never runtime or hosting acceptance', (t) => {
  const { root, app } = fixture(t);
  const before = readdirSync(app);
  const report = inspectMobileProject(root);
  assert.equal(report.status, 'source-ready');
  assert.equal(report.hostedAdmission, false);
  assert.equal(report.runtimeAcceptance, 'not-evaluated');
  assert.deepEqual(readdirSync(app), before);
  assert.equal(inspectMobileProject(app, '.').status, 'source-ready');
});

test('dynamic config overrides static evidence without being executed', (t) => {
  const { root, app } = fixture(t);
  writeFileSync(path.join(app, 'app.config.ts'), 'throw new Error("must not run")');
  const report = inspectMobileProject(root);
  assert.equal(report.status, 'incomplete');
  assert.equal(report.checks.find((c) => c.id === 'app-config').status, 'unknown');
  assert.equal(
    report.checks.some((c) => c.id === 'expo-project'),
    false,
  );
});

test('missing and unsafe source fails without leaking file contents', (t) => {
  const { root, app } = fixture(t);
  writeFileSync(path.join(app, 'app.json'), '{"secret":"DO_NOT_PRINT"');
  const report = inspectMobileProject(root);
  assert.equal(report.status, 'blocked');
  assert.doesNotMatch(JSON.stringify(report), /DO_NOT_PRINT/);
  rmSync(path.join(app, 'package.json'));
  symlinkSync(path.join(app, 'app.json'), path.join(app, 'package.json'));
  assert.equal(
    inspectMobileProject(root).checks.find((c) => c.id === 'package.json').status,
    'blocked',
  );
  assert.throws(() => inspectMobileProject(root, '../outside'), /inside/);
  symlinkSync(app, path.join(root, 'linked'));
  assert.throws(() => inspectMobileProject(root, 'linked'), /links/);
});

test('inherited profiles and unsupported SDK remain unverified', (t) => {
  const { root, put } = fixture(t);
  put('eas.json', { build: { review: { extends: 'shared' } } });
  assert.equal(inspectMobileProject(root).status, 'incomplete');
  put('package.json', { dependencies: { expo: 'latest' } });
  assert.equal(inspectMobileProject(root).status, 'blocked');
});

test('a development client is not a fixed review binary', (t) => {
  const { root, put } = fixture(t);
  put('eas.json', {
    build: {
      development: {
        developmentClient: true,
        ios: { simulator: true },
        android: { buildType: 'apk' },
      },
    },
  });
  const report = inspectMobileProject(root);
  assert.equal(report.checks.find((c) => c.id === 'android-review-build').status, 'blocked');
  assert.equal(report.checks.find((c) => c.id === 'ios-review-build').status, 'blocked');
});

test('custom native build commands cannot prove fixed review binaries', (t) => {
  const { root, put } = fixture(t);
  put('eas.json', {
    build: {
      development: { developmentClient: true, ios: { simulator: true } },
      review: {
        ios: { simulator: true, buildConfiguration: 'Debug' },
        android: { buildType: 'apk', gradleCommand: ':app:assembleDebug' },
      },
    },
  });
  const report = inspectMobileProject(root);
  for (const id of ['android-review-build', 'ios-review-build'])
    assert.equal(report.checks.find((c) => c.id === id).status, 'unknown');
});

test('iOS and Android identities use their own allowed characters', (t) => {
  const { root, put } = fixture(t);
  const check = (ios, android) => {
    put('app.json', { expo: { ios: { bundleIdentifier: ios }, android: { package: android } } });
    return inspectMobileProject(root).checks;
  };
  const valid = check('com.example.my-app', 'com.example.my_app');
  for (const id of ['ios-identity', 'android-identity'])
    assert.equal(valid.find((c) => c.id === id).status, 'pass');
  const invalid = check('com.example.my_app', 'com.example.my-app');
  for (const id of ['ios-identity', 'android-identity'])
    assert.equal(invalid.find((c) => c.id === id).status, 'blocked');
});

test('malformed and compound dependency declarations cannot pass preflight', (t) => {
  const { root, put } = fixture(t);
  for (const expo of ['58.invalid', '58.0.25 || 59.0.0']) {
    put('package.json', { dependencies: { expo, 'expo-dev-client': '' } });
    const checks = inspectMobileProject(root).checks;
    for (const id of ['expo-sdk', 'development-client'])
      assert.equal(checks.find((c) => c.id === id).status, 'blocked');
  }
});

test('platform client overrides and custom workflows require runtime resolution', (t) => {
  const { root, put } = fixture(t);
  for (const review of [
    {
      ios: { simulator: true, developmentClient: true },
      android: { buildType: 'apk', developmentClient: true },
    },
    { developmentClient: true, ios: { simulator: true, developmentClient: false } },
    { config: 'custom.yml', ios: { simulator: true }, android: { buildType: 'apk' } },
    {
      ios: { simulator: true, config: 'custom.yml' },
      android: { buildType: 'apk', config: 'custom.yml' },
    },
  ]) {
    put('eas.json', { build: { review } });
    const report = inspectMobileProject(root);
    assert.equal(report.status, 'incomplete');
    for (const id of ['ios-development-build', 'android-review-build', 'ios-review-build'])
      assert.equal(report.checks.find((c) => c.id === id).status, 'unknown');
  }
});
