import { readProjectSection } from '../dist/project-config.js';
import { verifyUniversalDevelopment } from './support/universal-dev-smoke.mjs';
import { verifyWebApiDevelopment } from './support/web-api-dev-smoke.mjs';
import { verifyWebLint } from './support/web-lint-check.mjs';
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
  process.env.ANHEDRAL_PLUGIN_DATA = path.join(temporary, 'catalog');
  try {
    if (
      process.platform === 'win32' &&
      profiles[profile].some((flag) => flag === '--next' || flag === '--vinext')
    ) {
      const result = spawnSync(
        process.execPath,
        [cli, 'init', root, ...profiles[profile], '--no-git'],
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
      [cli, 'init', root, ...profiles[profile], '--no-git', '--verbose'],
      temporary,
    );
    assert.equal(inspectProject(root).localReady, true);
    const appIdentity = readProjectSection(root, 'identity');
    assert.match(appIdentity.id, /^[a-f0-9-]{36}$/);
    const catalogFiles = readdirSync(path.join(temporary, 'catalog'));
    assert.ok(catalogFiles.length > 0, 'CLI init registers its generated app');
    if (existsSync(path.join(root, 'apps/web/package.json'))) await verifyWebLint(root);
    if (profile === 'universal-billing') execFile('pnpm', ['db:generate'], root);
    execFile('pnpm', ['check'], root);
    if (profile === 'api-neon') {
      execFile(process.execPath, [cli, '--cwd', root, 'add', 'r2', '--json'], temporary);
      execFile(process.execPath, [cli, '--cwd', root, 'add', 'wxt', '--json'], temporary);
      assert.ok(existsSync(path.join(root, 'apps/extension/.wxt/tsconfig.json')));
      assert.equal(inspectProject(root).localReady, true);
      execFile('pnpm', ['check'], root);
    }

    if (profile === 'web-auth') await verifyWebApiDevelopment(root);
    if (profile === 'universal-auth' || profile === 'universal-billing')
      await verifyUniversalDevelopment(root);
    if (profile === 'universal-billing')
      execFile(
        process.execPath,
        [path.resolve(import.meta.dirname, 'test-generated-billing.mjs'), root],
        temporary,
      );
    if (profile === 'worker-services') await verifyWorkerDevelopment(root);
    const setup = readProjectSection(root, 'setup');
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
    for (const app of ['api', 'realtime', 'jobs', 'scheduled', 'workflows']) {
      const directory = path.join(root, 'apps', app);
      if (!existsSync(path.join(directory, 'package.json'))) continue;
      if (existsSync(path.join(directory, 'void.config.ts'))) {
        const output = path.join(directory, 'dist/ssr');
        const configuration = JSON.parse(readFileSync(path.join(output, 'wrangler.json'), 'utf8'));
        assert.equal(typeof configuration.main, 'string', `${app} generated Worker entry`);
        const entry = path.resolve(output, configuration.main);
        assert.ok(entry.startsWith(output + path.sep), `${app} entry stays inside build output`);
        assert.ok(existsSync(entry), `${app} generated Worker entry exists`);
      } else assert.ok(existsSync(path.join(directory, 'dist/index.js')), `${app} build artifact`);
    }
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
    if (setup.products.includes('neon-realtime'))
      execFile(
        'pnpm',
        [
          'exec',
          'tsx',
          path.resolve(import.meta.dirname, 'test-generated-neon-realtime.mjs'),
          root,
        ],
        path.join(root, 'packages/db'),
      );
    if (profile === 'api' || profile === 'web-auth')
      execFile(
        process.execPath,
        [path.resolve(import.meta.dirname, 'test-generated-auth.mjs'), root],
        temporary,
      );
    if (
      readdirSync(path.join(root, 'apps')).some((app) =>
        existsSync(path.join(root, 'apps', app, 'void.config.ts')),
      )
    )
      execFile(
        process.execPath,
        [
          path.resolve(import.meta.dirname, 'test-void-runtime-generated.mjs'),
          root,
          ...(profile === 'api' ? ['--local-auth'] : []),
        ],
        temporary,
      );
    console.log(
      `Real ${profile} generation and local validation finished; production acceptance is separate`,
    );
  } finally {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (process.env.ANHEDRAL_KEEP_GENERATED === '1') console.log(`Kept audit fixture: ${root}`);
    else rmSync(temporary, { recursive: true, force: true });
  }
}
