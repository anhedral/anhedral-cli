import { verifyWorkerDevelopment } from './support/worker-dev-smoke.mjs';
import { STACK_PROFILES as profiles } from './support/stack-profiles.mjs';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { execFile } from '../dist/util.js';
import { inspectProject } from '../dist/readiness.js';

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
    // Synthetic public key: builds only; it grants no access and never tests live identity.
    if (profiles[profile].includes('--clerk'))
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY =
        'pk_test_' + Buffer.from('example.clerk.accounts.dev$').toString('base64');
    execFile(
      process.execPath,
      [cli, 'new', root, ...profiles[profile], '--no-git', '--verbose'],
      temporary,
    );
    assert.equal(inspectProject(root).localReady, true);
    execFile('pnpm', ['check'], root);
    if (profile === 'api-neon') {
      execFile(process.execPath, [cli, 'add', root, 'r2', '--json'], temporary);
      execFile(process.execPath, [cli, 'add', root, 'wxt', '--json'], temporary);
      assert.ok(existsSync(path.join(root, 'apps/extension/.wxt/tsconfig.json')));
      assert.equal(inspectProject(root).localReady, true);
      execFile('pnpm', ['check'], root);
    }

    if (profile === 'worker-services') await verifyWorkerDevelopment(root);
    const setup = JSON.parse(readFileSync(path.join(root, 'anhedral.setup.json'), 'utf8'));
    if (setup.products.includes('vinext')) {
      assert.ok(existsSync(path.join(root, 'apps/web/dist/server/wrangler.json')));
      assert.ok(
        existsSync(path.join(root, 'apps/web/.vinext/fonts')),
        'Real build generates its font cache',
      );
      execFile('git', ['init', '--quiet'], root);
      const cachedFonts = spawnSync(
        'git',
        ['ls-files', '--others', '--exclude-standard', '--', 'apps/web/.vinext/'],
        { cwd: root, encoding: 'utf8' },
      );
      assert.equal(cachedFonts.status, 0, cachedFonts.stderr);
      assert.equal(
        cachedFonts.stdout.trim(),
        '',
        'Generated Vinext font cache must not enter source control after a real build',
      );
    }
    if (setup.products.includes('next')) {
      assert.ok(existsSync(path.join(root, 'apps/web/.next/BUILD_ID')));
      if (setup.hosting === 'cloudflare')
        assert.ok(existsSync(path.join(root, 'apps/web/.open-next/worker.js')));
    }
    for (const app of ['api', 'realtime', 'jobs', 'scheduled', 'workflows'])
      if (existsSync(path.join(root, 'apps', app, 'package.json')))
        assert.ok(
          existsSync(path.join(root, 'apps', app, 'dist/index.js')),
          `${app} build artifact`,
        );
    if (setup.products.includes('wxt'))
      assert.ok(existsSync(path.join(root, 'apps/extension/.output/chrome-mv3/manifest.json')));
    if (setup.products.includes('expo'))
      assert.ok(existsSync(path.join(root, 'apps/mobile/dist/index.html')));
    if (setup.products.includes('electron')) {
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
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (process.env.ANHEDRAL_KEEP_GENERATED === '1') console.log(`Kept audit fixture: ${root}`);
    else rmSync(temporary, { recursive: true, force: true });
  }
}
