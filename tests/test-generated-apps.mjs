import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { execFile } from '../dist/util.js';
import { inspectProject } from '../dist/readiness.js';
import { resolveCommand } from '../dist/command.js';

function verifyMobileSecurityGate(root) {
  const invocation = resolveCommand('pnpm', ['audit', '--prod', '--audit-level', 'high', '--json']);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  assert.equal(result.error, undefined);
  const report = JSON.parse(result.stdout);
  assert.ok(
    report.metadata?.vulnerabilities && report.advisories,
    'The audit must return a valid vulnerability report',
  );
  const blocking = Object.values(report.advisories).filter(
    ({ severity }) => severity === 'high' || severity === 'critical',
  );
  assert.equal(result.status, blocking.length ? 1 : 0);
  // This tests rejection of known upstream vulnerabilities; generated release checks still fail.
  const known = new Map([
    ['GHSA-86w9-cpqp-85rv', 'node-forge'],
    ['GHSA-vfj7-8cjw-p6xm', 'braces'],
  ]);
  for (const advisory of blocking) {
    assert.equal(advisory.severity, 'high');
    assert.equal(
      known.get(advisory.github_advisory_id),
      advisory.module_name,
      'Unexpected blocking security advisory',
    );
    assert.equal(advisory.patched_versions, '<0.0.0', 'A patched upstream version must be adopted');
    console.log(
      `Mobile production release blocked: ${advisory.github_advisory_id} (${advisory.module_name})`,
    );
  }
}

function verifyVinextSecurityGate(root) {
  const invocation = resolveCommand('pnpm', ['audit', '--prod', '--audit-level', 'high', '--json']);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  assert.equal(result.error, undefined);
  const report = JSON.parse(result.stdout);
  assert.ok(report.metadata?.vulnerabilities && report.advisories);
  const blocking = Object.values(report.advisories).filter(
    ({ severity }) => severity === 'high' || severity === 'critical',
  );
  assert.equal(result.status, blocking.length ? 1 : 0);
  for (const advisory of blocking) {
    assert.equal(
      advisory.github_advisory_id,
      'GHSA-vfj7-8cjw-p6xm',
      'Unexpected blocking security advisory',
    );
    assert.equal(advisory.module_name, 'braces');
    assert.equal(
      advisory.patched_versions,
      '<0.0.0',
      'Adopt the patched upstream dependency when available',
    );
  }
  return blocking.length > 0;
}

const profiles = {
  web: [],
  'web-auth': ['--better-auth'],
  vercel: ['--next'],
  'vercel-auth': ['--next', '--neon', '--better-auth'],
  cloudflare: ['--next', '--hosting=cloudflare'],
  api: ['--hono', '--d1', '--better-auth', '--r2'],
  'api-neon': ['--hono', '--neon', '--better-auth'],
  desktop: ['--electron'],
  extension: ['--wxt'],
  mobile: ['--expo'],
};
const selected = process.argv[2] ? [process.argv[2]] : Object.keys(profiles);
const cli = path.resolve(import.meta.dirname, '../dist/bin.js');
process.env.WRANGLER_SEND_METRICS = 'false';
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
process.env.ANHEDRAL_VERBOSE = '1';
for (const profile of selected) {
  assert.ok(Object.hasOwn(profiles, profile), `Unknown core profile: ${profile}`);
  const temporary = realpathSync(mkdtempSync(path.join(tmpdir(), 'anhedral-core-')));
  const root = path.join(temporary, profile);
  try {
    if (process.platform === 'win32') {
      const result = spawnSync(
        process.execPath,
        [cli, 'new', root, ...profiles[profile], '--no-git'],
        { cwd: temporary, encoding: 'utf8' },
      );
      assert.equal(result.error, undefined);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Native Windows initialization is blocked.*WSL/);
      assert.equal(existsSync(root), false, 'The Windows guard must run before project writes');
      console.log('Native Windows bootstrap guard passed');
      continue;
    }
    console.log(`Generating and validating real ${profile} project`);
    execFile(
      process.execPath,
      [cli, 'new', root, ...profiles[profile], '--no-git', '--verbose'],
      temporary,
    );
    assert.equal(inspectProject(root).localReady, true);
    if (profile === 'mobile') {
      for (const task of ['lint', 'typecheck', 'audit', 'test', 'build'])
        execFile('pnpm', ['run', task], root);
      verifyMobileSecurityGate(root);
    } else if (profile === 'web' || profile === 'web-auth') {
      for (const task of ['lint', 'typecheck', 'audit', 'test', 'build'])
        execFile('pnpm', ['run', task], root);
      if (verifyVinextSecurityGate(root))
        console.log(
          'Vinext production release blocked by unpatched braces advisory; security gate remains enforced',
        );
    } else {
      execFile('pnpm', ['check'], root);
    }
    if (profile === 'web' || profile === 'web-auth')
      assert.ok(existsSync(path.join(root, 'apps/web/dist/server/wrangler.json')));
    if (profile === 'vercel' || profile === 'vercel-auth')
      assert.ok(existsSync(path.join(root, 'apps/web/.next/BUILD_ID')));
    if (profile === 'cloudflare')
      assert.ok(existsSync(path.join(root, 'apps/web/.open-next/worker.js')));
    if (profile === 'api' || profile === 'api-neon')
      assert.ok(existsSync(path.join(root, 'apps/api/dist/index.js')));
    if (profile === 'extension')
      assert.ok(existsSync(path.join(root, 'apps/extension/.output/chrome-mv3/manifest.json')));
    if (profile === 'mobile') assert.ok(existsSync(path.join(root, 'apps/mobile/dist/index.html')));
    if (profile === 'desktop') {
      execFile(
        'pnpm',
        ['exec', 'electron-builder', '--dir', '--publish', 'never', '--config.mac.identity=null'],
        path.join(root, 'apps/desktop'),
      );
      assert.ok(readdirSync(path.join(root, 'apps/desktop/release')).length > 0);
    }
    console.log(
      `Real ${profile} generation and local validation finished; production acceptance is separate`,
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
