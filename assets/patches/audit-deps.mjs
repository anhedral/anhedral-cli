import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Exact local mitigations; pnpm's frozen install applies and checks the patches.
// Runtime regression probes belong in the CLI repository's test:patch suite.
const patches = [
  {
    name: 'braces',
    version: '3.0.3',
    advisory: 'GHSA-vfj7-8cjw-p6xm',
    sha256: '69bd65a37da4569ba0be8a044aa732ad7c2ebd5494d6076f966eb6df8a12756e',
  },
  {
    name: 'node-forge',
    version: '1.4.0',
    advisory: 'GHSA-86w9-cpqp-85rv',
    sha256: '2cbbff9183d2896f13da8c8655b8f598b0f24c9b7477e8230f9a313f806c239f',
  },
];
const severities = ['info', 'low', 'moderate', 'high', 'critical'];
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fail = (message) => {
  throw new Error(message);
};
const readRegular = (file, maximum = 2 * 1024 * 1024) => {
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximum)
    fail('Expected a bounded regular file.');
  return readFileSync(file);
};

/** Accept only exact advisory/version pairs whose reviewed patches are configured. */
export function verifyAuditReport(report, { status, patchedCoordinates = [] } = {}) {
  if (
    !object(report) ||
    report.error ||
    !object(report.advisories) ||
    !object(report.metadata?.vulnerabilities)
  )
    fail('Incomplete pnpm audit report; no advisory exception was applied.');
  const findings = Object.values(report.advisories);
  const counts = Object.fromEntries(severities.map((severity) => [severity, 0]));
  for (const finding of findings) {
    if (
      !object(finding) ||
      !severities.includes(finding.severity) ||
      typeof finding.module_name !== 'string' ||
      !/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(finding.github_advisory_id ?? '') ||
      !Array.isArray(finding.findings) ||
      !finding.findings.length ||
      finding.findings.some(
        (item) =>
          !object(item) ||
          typeof item.version !== 'string' ||
          !item.version ||
          !Array.isArray(item.paths) ||
          !item.paths.length ||
          item.paths.some((entry) => typeof entry !== 'string' || !entry),
      )
    )
      fail('Incomplete advisory details; no advisory exception was applied.');
    if (new Set(finding.findings.map((item) => item.version)).size !== finding.findings.length)
      fail('Duplicate affected versions in advisory details.');
    counts[finding.severity] += finding.findings.length;
  }
  for (const severity of severities) {
    const count = report.metadata.vulnerabilities[severity];
    if (!Number.isSafeInteger(count) || count < 0 || count !== counts[severity])
      fail('Audit severity counts do not match its advisory details.');
  }
  if (status !== (findings.some((finding) => finding.severity !== 'info') ? 1 : 0))
    fail('Unexpected pnpm audit exit status; inspect the raw report.');
  const high = findings.filter((finding) => ['high', 'critical'].includes(finding.severity));
  for (const finding of high) {
    const patch = patches.find(
      ({ name, version, advisory }) =>
        finding.module_name === name &&
        finding.github_advisory_id === advisory &&
        finding.findings.every((item) => item.version === version),
    );
    if (finding.severity !== 'high' || !patch)
      fail(
        `Unaccepted high/critical advisory: ${finding.github_advisory_id} (${finding.module_name}).`,
      );
  }
  for (const finding of high) {
    const coordinate = `${finding.module_name}@${finding.findings[0].version}`;
    if (!patchedCoordinates.includes(coordinate))
      fail(`The ${finding.module_name} advisory requires its reviewed configured patch.`);
  }
  return {
    exceptionApplied: high.length > 0,
    acceptedAdvisories: high.map((finding) => finding.github_advisory_id),
    vulnerabilities: counts,
  };
}

export function runAuditGate(root = process.cwd()) {
  root = realpathSync(root);
  const executable = process.env.npm_execpath;
  if (!executable) fail('Run this gate with pnpm run audit:deps.');
  const run = (args) => {
    const result = spawnSync(process.execPath, [executable, ...args], {
      cwd: root,
      env: process.env,
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.error || result.signal || !Number.isInteger(result.status))
      fail('pnpm audit command did not complete.');
    return result;
  };
  const audit = run(['audit', '--json', '--audit-level', 'low']);
  const reportFile = path.join(root, '.anhedral-audit-report.json');
  const existingReport = lstatSync(reportFile, { throwIfNoEntry: false });
  if (existingReport && (!existingReport.isFile() || existingReport.isSymbolicLink()))
    fail('The raw audit report target must be a regular file.');
  writeFileSync(reportFile, audit.stdout, { mode: 0o600 });
  let report;
  try {
    report = JSON.parse(audit.stdout);
  } catch {
    fail('pnpm returned invalid audit JSON; inspect .anhedral-audit-report.json.');
  }
  // Validate the entire report before considering any exception.
  const candidate = verifyAuditReport(report, {
    status: audit.status,
    patchedCoordinates: patches.map(({ name, version }) => `${name}@${version}`),
  });
  if (!candidate.exceptionApplied) return candidate;
  const config = run(['config', 'get', 'patchedDependencies', '--json']);
  if (config.status !== 0) fail('pnpm could not read the configured dependency patches.');
  const configured = JSON.parse(config.stdout);
  const patchedCoordinates = [];
  for (const patch of patches) {
    if (!candidate.acceptedAdvisories.includes(patch.advisory)) continue;
    const coordinate = `${patch.name}@${patch.version}`;
    const relative = `patches/${coordinate}.patch`;
    if (
      !object(configured) ||
      typeof configured[coordinate] !== 'string' ||
      path.resolve(root, configured[coordinate]) !== path.join(root, relative) ||
      hash(readRegular(path.join(root, relative))) !== patch.sha256
    )
      fail(`The reviewed ${patch.name} patch is missing or changed or is not configured.`);
    patchedCoordinates.push(coordinate);
  }
  const result = verifyAuditReport(report, { status: audit.status, patchedCoordinates });
  console.log(
    `Accepted only ${result.acceptedAdvisories.join('; ')} for configured local patches. Raw audit remains in .anhedral-audit-report.json.`,
  );
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runAuditGate();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
