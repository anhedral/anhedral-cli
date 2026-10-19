import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { launchPreview } from './preview-process.mjs';
import { verifyLocalAuth } from './verify-local-auth.mjs';

async function unusedPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

/** Only for disposable generated D1 fixtures: real Vite/workerd API and web together. */
export async function verifyWebApiDevelopment(root) {
  const api = path.join(root, 'apps/api');
  const web = path.join(root, 'apps/web');
  for (const app of [api, web])
    for (const file of ['.env', '.env.local', '.dev.vars'])
      assert.equal(existsSync(path.join(app, file)), false, 'Refuse configured runtime files');
  const scratch = mkdtempSync(path.join(tmpdir(), 'anhedral-web-api-dev-'));
  const webPort = await unusedPort();
  const origin = `http://127.0.0.1:${webPort}`;
  const environment = path.join(api, '.env');
  const env = {
    ...process.env,
    MINIFLARE_REGISTRY_PATH: path.join(scratch, 'registry'),
    WRANGLER_LOG_PATH: path.join(scratch, 'wrangler.log'),
    WRANGLER_SEND_METRICS: 'false',
    CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'true',
  };
  let apiServer;
  let webServer;
  try {
    writeFileSync(
      environment,
      `BETTER_AUTH_SECRET=${randomBytes(32).toString('hex')}\nBETTER_AUTH_URL=${origin}\n`,
      { flag: 'wx', mode: 0o600 },
    );
    execFileSync(process.execPath, [path.join(root, 'scripts/prepare-void-migrations.mjs')], {
      cwd: api,
      env,
    });
    execFileSync(
      process.execPath,
      [
        path.join(api, 'node_modules/wrangler/bin/wrangler.js'),
        'd1',
        'migrations',
        'apply',
        'DB',
        '--local',
        '--config',
        'anhedral.cloudflare.json',
      ],
      { cwd: api, env: { ...env, CI: 'true' }, stdio: 'pipe', timeout: 60000 },
    );
    apiServer = launchPreview(
      process.execPath,
      [path.join(api, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '0'],
      { cwd: api, env },
    );
    const apiOrigin = await apiServer.address();
    webServer = launchPreview(
      process.execPath,
      [
        path.join(web, 'node_modules/vite/bin/vite.js'),
        '--host',
        '127.0.0.1',
        '--port',
        String(webPort),
        '--strictPort',
      ],
      { cwd: web, env },
    );
    await webServer.address();
    const health = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(15000) });
    assert.equal(health.status, 200, await health.clone().text());
    assert.deepEqual(await health.json(), { ok: true });
    const screen = await fetch(`${origin}/sign-in`, { signal: AbortSignal.timeout(15000) });
    assert.equal(screen.status, 200);
    assert.match(await screen.text(), /Sign in/);
    await verifyLocalAuth(origin, (url, options) => {
      const target = new URL(url);
      if (target.pathname === '/__void/ready')
        return fetch(new URL(target.pathname, apiOrigin), options);
      return fetch(url, options);
    });
    console.log(
      'PASS: real web/API development service binding, auth screen, signup/login, protected session and revocation.',
    );
  } catch (error) {
    throw new Error(
      `${error.message}\nAPI: ${apiServer?.diagnostics()}\nWeb: ${webServer?.diagnostics()}`,
      { cause: error },
    );
  } finally {
    await webServer?.stop();
    await apiServer?.stop();
    rmSync(environment, { force: true });
    rmSync(scratch, { recursive: true, force: true });
  }
}
