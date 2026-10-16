import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ADVISORY = 'GHSA-vfj7-8cjw-p6xm';
const PATCH_SHA256 = '69bd65a37da4569ba0be8a044aa732ad7c2ebd5494d6076f966eb6df8a12756e';
const TREE_SHA256 = '6206e9fa070c3e123b6f570a72c8293f800e7515450dcb7260390085d2f3d271';
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

/** Policy only; the executable obtains verifiedBraces exclusively from installed-byte checks. */
export function verifyAuditReport(report, { status, verifiedBraces = false } = {}) {
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
    if (
      finding.severity !== 'high' ||
      finding.module_name !== 'braces' ||
      finding.github_advisory_id !== ADVISORY ||
      finding.findings.some((item) => item.version !== '3.0.3')
    )
      fail(
        `Unaccepted high/critical advisory: ${finding.github_advisory_id} (${finding.module_name}).`,
      );
  }
  if (high.length && !verifiedBraces)
    fail('The braces advisory requires exact patch, installed-tree and runtime verification.');
  return {
    exceptionApplied: high.length > 0,
    acceptedAdvisories: high.map(() => ADVISORY),
    vulnerabilities: counts,
  };
}

function treeHash(root) {
  const entries = [];
  function walk(directory = '') {
    for (const name of readdirSync(path.join(root, directory)).sort()) {
      if (!directory && name === 'node_modules') continue;
      const relative = path.posix.join(directory, name);
      const file = path.join(root, relative);
      const stat = lstatSync(file);
      if (stat.isSymbolicLink()) fail('Installed braces contains a symbolic link.');
      if (stat.isDirectory()) walk(relative);
      else if (stat.isFile()) entries.push(`${relative}:${hash(readRegular(file))}`);
      else fail('Installed braces contains a nonregular file.');
    }
  }
  walk();
  return hash(entries.join('\n'));
}

export function installedBraces(list, root) {
  if (!Array.isArray(list) || !list.length) fail('Installed dependency listing is unavailable.');
  const copies = new Set();
  const stack = list.map((node) => ({ node, optional: false }));
  while (stack.length) {
    const { node, optional } = stack.pop();
    if (!object(node) || typeof node.path !== 'string' || !path.isAbsolute(node.path))
      fail('Incomplete installed dependency identity.');
    const location = path.resolve(node.path);
    if (location !== root && !location.startsWith(root + path.sep))
      fail('Installed dependency escapes the application.');
    // pnpm lists unsupported optional packages (for example macOS fsevents on
    // Linux) even when no package directory was installed. Required packages,
    // existing dangling links, and unreadable directories still fail closed.
    const entry = lstatSync(location, { throwIfNoEntry: false });
    if (!entry) {
      if (optional) continue;
      fail('Required installed dependency is missing.');
    }
    const directory = realpathSync(node.path);
    if (directory !== root && !directory.startsWith(root + path.sep))
      fail('Installed dependency escapes the application.');
    const metadataFile = path.join(directory, 'package.json');
    if (!lstatSync(metadataFile).isFile() || lstatSync(metadataFile).isSymbolicLink())
      fail('Invalid installed package metadata.');
    const metadata = JSON.parse(readRegular(metadataFile).toString('utf8'));
    if (metadata.name === 'braces') {
      if (metadata.version !== '3.0.3') fail('Only installed braces 3.0.3 is eligible.');
      copies.add(directory);
    }
    for (const group of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      if (node[group] === undefined) continue;
      if (!object(node[group])) fail('Incomplete installed dependency graph.');
      stack.push(
        ...Object.entries(node[group]).map(([name, child]) => ({
          node: child,
          // pnpm's recursive listing also puts transitive optional edges in
          // `dependencies`; the installed parent's manifest identifies them.
          optional:
            group === 'optionalDependencies' ||
            (object(metadata.optionalDependencies) &&
              Object.hasOwn(metadata.optionalDependencies, name)),
        })),
      );
    }
  }
  if (!copies.size) fail('Affected braces copies are missing from the installed dependency graph.');
  return [...copies];
}

function verifyRuntime(directory) {
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `
    const assert=require('node:assert/strict'),braces=require(process.argv[1]);
    const guarded=fn=>assert.throws(fn,e=>e instanceof RangeError&&/braces nesting exceeds maximum depth of 100/.test(e.message));
    for(const [open,close] of [['{','}'],['(',')']])for(const method of ['parse','compile','expand','stringify']){
      assert.doesNotThrow(()=>braces[method](open.repeat(100)+'x'+close.repeat(100)));
      guarded(()=>braces[method](open.repeat(101)+'x'+close.repeat(101)));
      guarded(()=>braces[method](open.repeat(2000)+'x'+close.repeat(2000)));
    }
    for(const method of ['compile','expand','stringify']){
      const node={type:'root',nodes:[]};node.nodes.push(node);guarded(()=>braces[method](node));
      let child={type:'text',value:'x'};for(let i=0;i<20000;i++)child={type:'paren',nodes:[child]};guarded(()=>braces[method]({type:'root',nodes:[child]}));
    }
    const parent={type:'paren',nodes:[]};parent.parent=parent;guarded(()=>braces.expand({type:'root',nodes:[parent]}));
    assert.deepEqual(braces.expand('{a,b}'),['a','b']);
    assert.equal(braces.stringify({type:'brace',invalid:true,nodes:[{type:'open',value:'{'},{type:'close',value:'}'}]},{escapeInvalid:true}),'{}');
  `,
      directory,
    ],
    { encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 },
  );
  if (result.error || result.signal || result.status !== 0)
    fail('Installed braces runtime depth verification failed.');
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
  // First reject unrelated findings or malformed reports without executing dependencies.
  try {
    return verifyAuditReport(report, { status: audit.status });
  } catch (error) {
    if (
      error.message !==
      'The braces advisory requires exact patch, installed-tree and runtime verification.'
    )
      throw error;
  }
  const patch = path.join(root, 'patches/braces@3.0.3.patch');
  if (
    !lstatSync(patch).isFile() ||
    lstatSync(patch).isSymbolicLink() ||
    hash(readRegular(patch)) !== PATCH_SHA256
  )
    fail('The reviewed braces patch is missing or changed.');
  const listing = run(['list', '--depth', 'Infinity', '--json', '--recursive']);
  if (listing.status !== 0) fail('pnpm could not inspect installed dependency copies.');
  const copies = installedBraces(JSON.parse(listing.stdout), root);
  for (const directory of copies)
    if (treeHash(directory) !== TREE_SHA256)
      fail('Installed braces bytes do not match the reviewed patched package.');
  for (const directory of copies) verifyRuntime(directory);
  const result = verifyAuditReport(report, { status: audit.status, verifiedBraces: true });
  console.log(
    `Accepted only ${ADVISORY} for ${copies.length} verified braces@3.0.3 copy/copies. Raw audit remains in .anhedral-audit-report.json.`,
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
