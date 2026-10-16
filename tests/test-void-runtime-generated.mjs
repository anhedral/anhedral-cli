// Run against an installed, generated workspace. Builds and exercises real workerd previews.
// node tests/test-void-runtime-generated.mjs /absolute/workspace [node_modules] [--local-auth]
// --local-auth applies local D1 migrations and creates synthetic credentials. Use an isolated fixture.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { launchPreview } from './support/preview-process.mjs';
import { verifyLocalAuth } from './support/verify-local-auth.mjs';

assert.ok(process.argv[2], 'Specify an installed generated workspace');
const root = path.resolve(process.argv[2]);
const arguments_ = process.argv.slice(3);
const localAuth = arguments_.includes('--local-auth');
const modulePaths = arguments_.filter((value) => value !== '--local-auth');
assert.ok(modulePaths.length <= 1 && modulePaths.every((value) => !value.startsWith('--')));
const sharedModules = modulePaths[0] ? path.resolve(modulePaths[0]) : undefined;
const scratch = mkdtempSync(path.join(tmpdir(), 'anhedral-void-preview-'));
const ownedEnvironmentFiles = [];
const env = {
  ...process.env,
  MINIFLARE_REGISTRY_PATH: path.join(scratch, 'registry'),
  WRANGLER_LOG_PATH: path.join(scratch, 'wrangler.log'),
};
try {
  let tested = 0;
  let authTested = false;
  for (const name of readdirSync(path.join(root, 'apps'))) {
    const cwd = path.join(root, 'apps', name);
    if (!existsSync(path.join(cwd, 'void.config.ts'))) continue;
    const modules = sharedModules ?? path.join(cwd, 'node_modules');
    const pkg = JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8'));
    const auth = localAuth && name === 'api';
    const appEnv = { ...env };
    if (auth) {
      assert.ok(
        pkg.dependencies?.['@workspace/auth'],
        'Local auth requires the generated auth consumer',
      );
      const config = JSON.parse(readFileSync(path.join(cwd, 'anhedral.cloudflare.json'), 'utf8'));
      assert.ok(config.d1_databases?.some((database) => database.binding === 'DB'));
      assert.ok(existsSync(path.join(root, 'packages/db/drizzle/0000_better_auth.sql')));
      for (const filename of ['.env', '.env.local', '.dev.vars'])
        assert.equal(
          existsSync(path.join(cwd, filename)),
          false,
          `Refuse existing ${filename} during local auth acceptance`,
        );
      const environmentFile = path.join(cwd, '.env');
      appEnv.BETTER_AUTH_SECRET = randomBytes(32).toString('base64url');
      appEnv.BETTER_AUTH_URL = 'http://127.0.0.1:8787';
      appEnv.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV = 'true';
      writeFileSync(
        environmentFile,
        `BETTER_AUTH_SECRET=${appEnv.BETTER_AUTH_SECRET}\nBETTER_AUTH_URL=${appEnv.BETTER_AUTH_URL}\n`,
        { flag: 'wx' },
      );
      ownedEnvironmentFiles.push(environmentFile);
      execFileSync(
        process.execPath,
        [
          path.join(modules, 'wrangler/bin/wrangler.js'),
          'd1',
          'migrations',
          'apply',
          'DB',
          '--local',
          '--persist-to',
          path.join(cwd, '.wrangler/state'),
          '--config',
          path.join(cwd, 'anhedral.cloudflare.json'),
        ],
        {
          cwd,
          env: { ...appEnv, CI: 'true' },
          stdio: 'pipe',
          maxBuffer: 16 * 1024 * 1024,
          timeout: 120000,
          killSignal: 'SIGKILL',
        },
      );
    }
    assert.equal(pkg.devDependencies.void, '0.27.0');
    for (const dependency of [
      'void',
      'vinext',
      'vite',
      '@cloudflare/vite-plugin',
      '@vitejs/plugin-rsc',
      'react',
      'react-dom',
      'hono',
      '@hono/zod-openapi',
    ]) {
      const pinned = pkg.dependencies?.[dependency] ?? pkg.devDependencies?.[dependency];
      if (!pinned) continue;
      const installed = JSON.parse(
        readFileSync(path.join(modules, dependency, 'package.json'), 'utf8'),
      );
      assert.equal(installed.version, pinned, `${dependency} must match the generated exact pin`);
    }
    execFileSync(process.execPath, [path.join(modules, 'vite/bin/vite.js'), 'build'], {
      cwd,
      env: appEnv,
      stdio: 'pipe',
      maxBuffer: 16 * 1024 * 1024,
      timeout: 10 * 60 * 1000,
      killSignal: 'SIGKILL',
    });
    const preview = launchPreview(
      process.execPath,
      [
        path.join(modules, 'vite/bin/vite.js'),
        'preview',
        '--host',
        '127.0.0.1',
        '--port',
        auth ? '8787' : '0',
        ...(auth ? ['--strictPort'] : []),
      ],
      { cwd, env: appEnv, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    try {
      const address = await preview.address();
      if (auth) {
        assert.equal(new URL(address).origin, appEnv.BETTER_AUTH_URL);
        await verifyLocalAuth(address);
        authTested = true;
        console.log(
          'PASS: generated Better Auth/D1 signup, login, session and revocation in workerd.',
        );
      }
      const route = name === 'api' ? '/health' : name === 'web' ? '/' : '/__void/ready';
      const response = await fetch(new URL(route, address), {
        signal: AbortSignal.timeout(30000),
      });
      assert.equal(response.status, 200, `${name}: ${await response.clone().text()}`);
      if (name === 'api') {
        assert.deepEqual(await response.json(), { ok: true });
        const openapi = await fetch(new URL('/openapi.json', address), {
          signal: AbortSignal.timeout(30000),
        });
        assert.equal(openapi.status, 200);
        assert.ok((await openapi.json()).paths['/health']);
      } else if (name === 'web') {
        const html = await response.text();
        assert.match(html, /<html/);
        const script = html.match(/src="([^"]+\.js)"/);
        assert.ok(script, 'Rendered page includes a client script');
        assert.equal(
          (await fetch(new URL(script[1], address), { signal: AbortSignal.timeout(30000) })).status,
          200,
        );
      } else {
        const readiness = await response.json();
        assert.equal(readiness.ready, true);
        assert.match(readiness.versionId, /^[a-f0-9-]{36}$/i);
      }
      console.log(`PASS: generated ${name} fresh build and workerd preview response.`);
      tested++;
    } finally {
      await preview.stop();
    }
  }
  assert.ok(tested, 'No Void applications found');
  if (localAuth) assert.ok(authTested, 'No generated D1 API auth application found');
  console.log(
    'Provider provisioning, remote secrets, protected access and rollback require live acceptance.',
  );
} finally {
  for (const file of ownedEnvironmentFiles) rmSync(file);
  rmSync(scratch, { recursive: true, force: true });
}
