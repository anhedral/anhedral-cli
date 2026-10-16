import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ADVISORY = 'GHSA-vfj7-8cjw-p6xm';
const PATCH_SHA256 = '69bd65a37da4569ba0be8a044aa732ad7c2ebd5494d6076f966eb6df8a12756e';
const TREE_SHA256 = '6206e9fa070c3e123b6f570a72c8293f800e7515450dcb7260390085d2f3d271';
const FORGE_ADVISORY = 'GHSA-86w9-cpqp-85rv';
const FORGE_PATCH_SHA256 = '2cbbff9183d2896f13da8c8655b8f598b0f24c9b7477e8230f9a313f806c239f';
const FORGE_TREE_SHA256 = '2e3a4c3aa2e8f3235d9dd9b3f21698c7aa88983ba9623f1502029386316380e4';
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

/** Policy only; executable verification flags come exclusively from installed-byte/runtime checks. */
export function verifyAuditReport(
  report,
  { status, verifiedBraces = false, verifiedNodeForge = false } = {},
) {
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
    const braces =
      finding.module_name === 'braces' &&
      finding.github_advisory_id === ADVISORY &&
      finding.findings.every((item) => item.version === '3.0.3');
    const forge =
      finding.module_name === 'node-forge' &&
      finding.github_advisory_id === FORGE_ADVISORY &&
      finding.findings.every((item) => item.version === '1.4.0');
    if (finding.severity !== 'high' || (!braces && !forge))
      fail(
        `Unaccepted high/critical advisory: ${finding.github_advisory_id} (${finding.module_name}).`,
      );
  }
  for (const finding of high) {
    if (
      (finding.module_name === 'braces' && !verifiedBraces) ||
      (finding.module_name === 'node-forge' && !verifiedNodeForge)
    )
      fail(
        `The ${finding.module_name} advisory requires exact patch, installed-tree and runtime verification.`,
      );
  }
  return {
    exceptionApplied: high.length > 0,
    acceptedAdvisories: high.map((finding) => finding.github_advisory_id),
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
      if (stat.isSymbolicLink()) fail('Installed dependency contains a symbolic link.');
      if (stat.isDirectory()) walk(relative);
      else if (stat.isFile()) entries.push(`${relative}:${hash(readRegular(file))}`);
      else fail('Installed dependency contains a nonregular file.');
    }
  }
  walk();
  return hash(entries.join('\n'));
}

function installedCopies(list, root, packageName, version) {
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
    if (metadata.name === packageName) {
      if (metadata.version !== version)
        fail(`Only installed ${packageName} ${version} is eligible.`);
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
  if (!copies.size)
    fail(`Affected ${packageName} copies are missing from the installed dependency graph.`);
  return [...copies];
}

export function installedBraces(list, root) {
  return installedCopies(list, root, 'braces', '3.0.3');
}

export function installedNodeForge(list, root) {
  return installedCopies(list, root, 'node-forge', '1.4.0');
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

function forgeProbe(root, expectedPatched) {
  const assert = require('node:assert/strict');
  const crypto = require('node:crypto');
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicExponent: 65537 });
  const pem = keys.publicKey.export({ type: 'spki', format: 'pem' });
  const results = [];
  for (const entry of ['lib/index.js', 'dist/forge.min.js', 'dist/forge.all.min.js']) {
    let forge;
    if (entry.startsWith('dist/')) {
      const sandbox = { console, setTimeout, clearTimeout, jQuery: undefined };
      sandbox.self = sandbox;
      sandbox.window = sandbox;
      vm.runInNewContext(fs.readFileSync(path.join(root, entry), 'utf8'), sandbox, {
        timeout: 1000,
      });
      forge = sandbox.forge;
    } else forge = require(path.join(root, entry));
    forge.options.usePureJavaScript = true;
    assert.equal(forge.options.usePureJavaScript, true);
    const key = forge.pki.publicKeyFromPem(pem);
    const asn1 = forge.asn1;
    const node = (type, value, constructed = false) =>
      asn1.create(asn1.Class.UNIVERSAL, type, constructed, value);
    let valid = 0,
      rejected = 0,
      acceptedMalformed = 0;
    for (const algorithm of ['md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512']) {
      const digest = crypto.createHash(algorithm).update('Anhedral RSA fixture').digest();
      const oid = () => node(asn1.Type.OID, asn1.oidToDer(forge.oids[algorithm]).getBytes());
      const nil = (value = '') => node(asn1.Type.NULL, value);
      const garbage = () => node(asn1.Type.OCTETSTRING, 'unconsumed');
      const verify = (parameters, outer = []) => {
        const info = node(
          asn1.Type.SEQUENCE,
          [
            node(asn1.Type.SEQUENCE, parameters, true),
            node(asn1.Type.OCTETSTRING, digest.toString('binary')),
            ...outer,
          ],
          true,
        );
        const der = Buffer.from(asn1.toDer(info).getBytes(), 'binary');
        const encoded = Buffer.concat([
          Buffer.from([0, 1]),
          Buffer.alloc(256 - der.length - 3, 255),
          Buffer.from([0]),
          der,
        ]);
        const signature = crypto.privateEncrypt(
          { key: keys.privateKey, padding: crypto.constants.RSA_NO_PADDING },
          encoded,
        );
        return key.verify(digest.toString('binary'), signature.toString('binary'));
      };
      assert.equal(verify([oid(), nil()]), true, `${entry}:${algorithm}:validNULL`);
      valid++;
      if (algorithm !== 'md5') {
        assert.equal(verify([oid()]), true, `${entry}:${algorithm}:validAbsent`);
        valid++;
      }
      for (const [parameters, outer] of [
        [[oid(), nil(), garbage()], []],
        [[oid(), garbage()], []],
        [[oid(), nil('garbage')], []],
        [[oid(), nil('\0')], []],
        [[oid(), nil()], [garbage()]],
      ]) {
        try {
          const accepted = verify(parameters, outer);
          if (accepted) acceptedMalformed++;
          else rejected++;
        } catch (error) {
          assert.match(error.message, /valid RSASSA-PKCS1-v1_5 DigestInfo/);
          rejected++;
        }
      }
    }
    if (expectedPatched) {
      assert.equal(acceptedMalformed, 0, entry);
      assert.equal(rejected, 30, entry);
    } else assert.ok(acceptedMalformed > 0, `${entry}:baseline vulnerability must reproduce`);
    results.push({ entry, forcePureJavaScript: true, valid, rejected, acceptedMalformed });
  }
  console.log(JSON.stringify(results));
}

function verifyForgeRuntime(directory) {
  const result = spawnSync(
    process.execPath,
    ['-e', `(${forgeProbe.toString()})(process.argv[1],true)`, directory],
    {
      encoding: 'utf8',
      timeout: 15000,
      maxBuffer: 1024 * 1024,
    },
  );
  if (result.error || result.signal || result.status !== 0)
    fail('Installed node-forge runtime verification failed for Node or distributed bundles.');
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
  // Reject unknown findings and malformed reports before executing any dependency.
  try {
    return verifyAuditReport(report, { status: audit.status });
  } catch (error) {
    if (
      !['braces', 'node-forge'].some(
        (name) =>
          error.message ===
          `The ${name} advisory requires exact patch, installed-tree and runtime verification.`,
      )
    )
      throw error;
  }
  const high = Object.values(report.advisories).filter((finding) => finding.severity === 'high');
  const listing = run(['list', '--depth', 'Infinity', '--json', '--recursive']);
  if (listing.status !== 0) fail('pnpm could not inspect installed dependency copies.');
  let graph;
  try {
    graph = JSON.parse(listing.stdout);
  } catch {
    fail('pnpm returned an invalid installed dependency graph.');
  }
  let verifiedBraces = false,
    verifiedNodeForge = false;
  const verified = [];
  for (const [name, version, advisory, patchHash, installedHash, runtime] of [
    ['braces', '3.0.3', ADVISORY, PATCH_SHA256, TREE_SHA256, verifyRuntime],
    [
      'node-forge',
      '1.4.0',
      FORGE_ADVISORY,
      FORGE_PATCH_SHA256,
      FORGE_TREE_SHA256,
      verifyForgeRuntime,
    ],
  ]) {
    if (!high.some((finding) => finding.github_advisory_id === advisory)) continue;
    const patch = path.join(root, `patches/${name}@${version}.patch`);
    if (hash(readRegular(patch)) !== patchHash)
      fail(`The reviewed ${name} patch is missing or changed.`);
    const copies = installedCopies(graph, root, name, version);
    for (const directory of copies)
      if (treeHash(directory) !== installedHash)
        fail(`Installed ${name} bytes do not match the reviewed patched package.`);
    for (const directory of copies) runtime(directory);
    if (name === 'braces') verifiedBraces = true;
    else verifiedNodeForge = true;
    verified.push(`${advisory} for ${copies.length} verified ${name}@${version} copy/copies`);
  }
  const result = verifyAuditReport(report, {
    status: audit.status,
    verifiedBraces,
    verifiedNodeForge,
  });
  console.log(
    `Accepted only ${verified.join('; ')}. Raw audit remains in .anhedral-audit-report.json.`,
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
