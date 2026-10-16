import assert from 'node:assert/strict';
import { test } from 'node:test';
import { installedBraces, verifyAuditReport } from '../assets/patches/audit-deps.mjs';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const advisory = (changes = {}) => ({
  module_name: 'braces',
  severity: 'high',
  github_advisory_id: 'GHSA-vfj7-8cjw-p6xm',
  findings: [{ version: '3.0.3', paths: ['app>micromatch>braces'] }],
  ...changes,
});
function report(findings = []) {
  const vulnerabilities = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
  for (const finding of findings) vulnerabilities[finding.severity] += finding.findings.length;
  return {
    advisories: Object.fromEntries(findings.map((finding, index) => [index, finding])),
    metadata: { vulnerabilities },
  };
}
const check = (value, verifiedBraces = false, status = 1) =>
  verifyAuditReport(value, { status, verifiedBraces });

test('platform-skipped optional packages do not hide missing required dependency copies', () => {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'anhedral-audit-optional-')));
  try {
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'fixture' }));
    const braces = path.join(root, 'node_modules/braces');
    mkdirSync(braces, { recursive: true });
    writeFileSync(
      path.join(braces, 'package.json'),
      JSON.stringify({ name: 'braces', version: '3.0.3' }),
    );
    const missing = { path: path.join(root, 'node_modules/fsevents') };
    const fixture = {
      path: root,
      dependencies: { braces: { path: braces } },
      optionalDependencies: { fsevents: missing },
    };
    assert.deepEqual(installedBraces([fixture], root), [braces]);
    writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 'fixture', optionalDependencies: { fsevents: '^2.3.3' } }),
    );
    assert.deepEqual(
      installedBraces(
        [{ path: root, dependencies: { ...fixture.dependencies, fsevents: missing } }],
        root,
      ),
      [braces],
    );
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'fixture' }));
    if (process.platform !== 'win32') {
      symlinkSync(path.join(root, 'missing-target'), missing.path);
      assert.throws(() => installedBraces([fixture], root), /ENOENT/);
      rmSync(missing.path);
    }
    assert.throws(
      () =>
        installedBraces(
          [{ ...fixture, dependencies: { ...fixture.dependencies, required: missing } }],
          root,
        ),
      /Required installed dependency is missing/,
    );
    rmSync(braces, { recursive: true });
    assert.throws(
      () => installedBraces([fixture], root),
      /Required installed dependency is missing/,
    );
    assert.throws(
      () =>
        installedBraces([{ path: root, optionalDependencies: { braces: { path: braces } } }], root),
      /Affected braces copies are missing/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('only exact braces advisory/version can pass after installed verification without changing raw findings', () => {
  const value = report([advisory()]);
  const original = JSON.stringify(value);
  assert.throws(() => check(value), /requires exact patch/);
  assert.equal(check(value, true).exceptionApplied, true);
  assert.equal(JSON.stringify(value), original);
  for (const replacement of [
    { severity: 'critical' },
    { module_name: 'other' },
    { github_advisory_id: 'GHSA-aaaa-bbbb-cccc' },
    { findings: [{ version: '2.3.2', paths: ['app>braces'] }] },
    {
      findings: [
        { version: '3.0.3', paths: ['app>braces'] },
        { version: '2.3.2', paths: ['app>other>braces'] },
      ],
    },
  ])
    assert.throws(() => check(report([advisory(replacement)]), true), /Unaccepted high\/critical/);
  assert.throws(
    () =>
      check(
        report([
          advisory(),
          advisory({ module_name: 'unrelated', github_advisory_id: 'GHSA-aaaa-bbbb-cccc' }),
        ]),
        true,
      ),
    /Unaccepted high\/critical/,
  );
});

test('audit counts track affected versions and preserve lower-severity findings', () => {
  const moderate = advisory({
    module_name: 'other',
    severity: 'moderate',
    github_advisory_id: 'GHSA-aaaa-bbbb-cccc',
    findings: [
      { version: '1.0.0', paths: ['app>other'] },
      { version: '2.0.0', paths: ['app>dependency>other'] },
    ],
  });
  const result = check(report([advisory(), moderate]), true);
  assert.equal(result.vulnerabilities.moderate, 2);
  assert.equal(result.vulnerabilities.high, 1);
  assert.equal(check(report(), false, 0).exceptionApplied, false);
  assert.equal(check(report([moderate])).exceptionApplied, false);
});

test('missing details, duplicate affected versions, network errors and inconsistent statuses fail closed', () => {
  for (const value of [
    {},
    { advisories: [], metadata: {} },
    { ...report(), error: { code: 'NETWORK' } },
    report([advisory({ findings: [] })]),
    report([advisory({ findings: [{ version: '3.0.3', paths: [] }] })]),
    report([advisory({ github_advisory_id: undefined })]),
    report([
      advisory({
        findings: [
          { version: '3.0.3', paths: ['app>braces'] },
          { version: '3.0.3', paths: ['app>alias'] },
        ],
      }),
    ]),
  ])
    assert.throws(() => check(value, true));
  const wrongCount = report([advisory()]);
  wrongCount.metadata.vulnerabilities.high = 0;
  assert.throws(() => check(wrongCount, true), /severity counts/);
  for (const status of [null, 2, -1, 0])
    assert.throws(() => check(report([advisory()]), true, status), /exit status/);
  assert.throws(
    () => verifyAuditReport(report([advisory()]), { verifiedBraces: true }),
    /exit status/,
  );
  assert.throws(() => check(report(), false, 1), /exit status/);
});
