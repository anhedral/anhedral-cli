import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyAuditReport, runAuditGate } from '../assets/patches/audit-deps.mjs';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  realpathSync,
  copyFileSync,
  symlinkSync,
} from 'node:fs';
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
const check = (value, patched = false, status = 1) =>
  verifyAuditReport(value, { status, patchedCoordinates: patched ? ['braces@3.0.3'] : [] });

test('only exact braces advisory/version can pass with a configured reviewed patch without changing raw findings', () => {
  const value = report([advisory()]);
  const original = JSON.stringify(value);
  assert.throws(() => check(value), /requires its reviewed configured patch/);
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

test('missing details, duplicate version/path entries, network errors and inconsistent statuses fail closed', () => {
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
          { version: '3.0.3', paths: ['app>braces'] },
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
    () => verifyAuditReport(report([advisory()]), { patchedCoordinates: ['braces@3.0.3'] }),
    /exit status/,
  );
  assert.throws(() => check(report(), false, 1), /exit status/);
});

test('pnpm workspace instances retain counts and advisory enforcement for the same version', () => {
  // pnpm 10 reports the same Vite version separately for these two workspace paths.
  const instances = [
    { version: '7.3.6', paths: ['apps__extension>wxt>vite'] },
    { version: '7.3.6', paths: ['apps__desktop>vite'] },
  ];
  const vite = advisory({
    module_name: 'vite',
    severity: 'moderate',
    github_advisory_id: 'GHSA-698v-4r3x-3vcv',
    findings: instances,
  });
  const raw = report([vite]);
  const before = JSON.stringify(raw);
  assert.equal(check(raw).vulnerabilities.moderate, 2);
  assert.equal(JSON.stringify(raw), before, 'retain the raw pnpm evidence');
  const wrongCount = structuredClone(raw);
  wrongCount.metadata.vulnerabilities.moderate = 1;
  assert.throws(() => check(wrongCount), /severity counts/);
  assert.throws(
    () =>
      check(
        report([
          {
            ...vite,
            severity: 'high',
            github_advisory_id: 'GHSA-587h-7wmj-h5pm',
          },
        ]),
      ),
    /Unaccepted high\/critical.*GHSA-587h-7wmj-h5pm/,
  );
  const patched = report([
    advisory({ findings: instances.map((item) => ({ ...item, version: '3.0.3' })) }),
  ]);
  assert.throws(() => check(patched), /requires its reviewed configured patch/);
  assert.equal(check(patched, true).vulnerabilities.high, 2);
  assert.throws(
    () =>
      check(
        report([
          advisory({
            findings: [{ version: '3.0.3', paths: ['app>braces', 'app>braces'] }],
          }),
        ]),
        true,
      ),
    /Duplicate affected version\/path/,
  );
});

const forgeAdvisory = (changes = {}) =>
  advisory({
    module_name: 'node-forge',
    github_advisory_id: 'GHSA-86w9-cpqp-85rv',
    findings: [{ version: '1.4.0', paths: ['app>expo>node-forge'] }],
    ...changes,
  });

test('forge acceptance is exact and requires its own configured patch independently of braces', () => {
  const raw = report([advisory(), forgeAdvisory()]);
  const unchanged = JSON.stringify(raw);
  assert.throws(
    () => verifyAuditReport(raw, { status: 1, patchedCoordinates: ['braces@3.0.3'] }),
    /node-forge.*requires its reviewed configured patch/,
  );
  assert.throws(
    () => verifyAuditReport(raw, { status: 1, patchedCoordinates: ['node-forge@1.4.0'] }),
    /braces.*requires its reviewed configured patch/,
  );
  const result = verifyAuditReport(raw, {
    status: 1,
    patchedCoordinates: ['braces@3.0.3', 'node-forge@1.4.0'],
  });
  assert.deepEqual(result.acceptedAdvisories, ['GHSA-vfj7-8cjw-p6xm', 'GHSA-86w9-cpqp-85rv']);
  assert.equal(JSON.stringify(raw), unchanged);
  for (const changes of [
    { severity: 'critical' },
    { github_advisory_id: 'GHSA-aaaa-bbbb-cccc' },
    { findings: [{ version: '1.3.3', paths: ['app>node-forge'] }] },
  ]) {
    assert.throws(
      () =>
        verifyAuditReport(report([forgeAdvisory(changes)]), {
          status: 1,
          patchedCoordinates: ['node-forge@1.4.0'],
        }),
      /Unaccepted high\/critical/,
    );
  }
});

test('audit gate checks effective pnpm patch config and checksum, preserves raw reports and fails on command errors', () => {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'anhedral-audit-policy-')));
  const executable = process.env.npm_execpath;
  const raw = report([advisory(), forgeAdvisory()]);
  try {
    mkdirSync(path.join(root, 'patches'));
    const configured = {};
    for (const coordinate of ['braces@3.0.3', 'node-forge@1.4.0']) {
      configured[coordinate] = `patches/${coordinate}.patch`;
      copyFileSync(
        new URL(`../assets/patches/${coordinate}.patch`, import.meta.url),
        path.join(root, configured[coordinate]),
      );
    }
    const runner = path.join(root, 'pnpm-fixture.mjs');
    process.env.npm_execpath = runner;
    const fixture = (config = configured, audit = raw, status = 1) =>
      writeFileSync(
        runner,
        `if(process.argv[2]==='audit'){console.log(${JSON.stringify(JSON.stringify(audit))});process.exitCode=${status};}else if(process.argv.slice(2).join(' ')==='config get patchedDependencies --json'){console.log(${JSON.stringify(JSON.stringify(config))});}else process.exitCode=2;`,
      );
    fixture();
    assert.equal(runAuditGate(root).exceptionApplied, true);
    fixture(
      Object.fromEntries(
        Object.entries(configured).map(([coordinate, relative]) => [
          coordinate,
          path.join(root, relative),
        ]),
      ),
    );
    assert.equal(runAuditGate(root).exceptionApplied, true);
    assert.deepEqual(
      JSON.parse(readFileSync(path.join(root, '.anhedral-audit-report.json'), 'utf8')),
      raw,
    );
    for (const config of [{}, { ...configured, 'braces@3.0.3': 'patches/customer.patch' }, null]) {
      fixture(config);
      assert.throws(() => runAuditGate(root), /not configured/);
    }
    fixture();
    const patch = path.join(root, configured['node-forge@1.4.0']);
    writeFileSync(patch, 'changed');
    assert.throws(() => runAuditGate(root), /node-forge patch.*changed/);
    rmSync(patch);
    symlinkSync(path.join(root, configured['braces@3.0.3']), patch);
    assert.throws(() => runAuditGate(root), /regular file/);
    fixture({}, report(), 0);
    assert.equal(runAuditGate(root).exceptionApplied, false);
    fixture({}, { error: 'network unavailable' }, 1);
    assert.throws(() => runAuditGate(root), /Incomplete pnpm audit/);
    writeFileSync(runner, "console.log('not JSON');process.exitCode=1;");
    assert.throws(() => runAuditGate(root), /invalid audit JSON/);
    assert.equal(
      readFileSync(path.join(root, '.anhedral-audit-report.json'), 'utf8'),
      'not JSON\n',
    );
  } finally {
    if (executable === undefined) delete process.env.npm_execpath;
    else process.env.npm_execpath = executable;
    rmSync(root, { recursive: true, force: true });
  }
});
