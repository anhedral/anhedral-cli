import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyAuditReport } from '../assets/patches/audit-deps.mjs';

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
