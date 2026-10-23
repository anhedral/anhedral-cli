import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

/** Real workerd, local D1, exported Expo assets and a Cloudflare service binding. */
export async function verifyUniversalDevelopment(root, { browser = false } = {}) {
  const api = path.join(root, 'apps/api');
  const client = path.join(root, 'apps/mobile');
  for (const app of [api, client])
    for (const file of ['.env', '.env.local', '.dev.vars'])
      assert.equal(existsSync(path.join(app, file)), false, 'Refuse configured runtime files');
  const scratch = mkdtempSync(path.join(tmpdir(), 'anhedral-universal-'));
  const port = await unusedPort();
  const apiPort = await unusedPort();
  const origin = `http://127.0.0.1:${port}`;
  const nativeOrigin = JSON.parse(readFileSync(path.join(client, 'app.json'))).expo.scheme + '://';
  const environment = path.join(api, '.dev.vars');
  const env = {
    ...process.env,
    MINIFLARE_REGISTRY_PATH: path.join(scratch, 'registry'),
    WRANGLER_LOG_PATH: path.join(scratch, 'wrangler.log'),
    WRANGLER_SEND_METRICS: 'false',
  };
  const wrangler = (app) => path.join(app, 'node_modules/wrangler/bin/wrangler.js');
  let apiServer;
  let webServer;
  let chromium;
  try {
    writeFileSync(
      environment,
      `BETTER_AUTH_SECRET=${randomBytes(32).toString('hex')}\nBETTER_AUTH_URL=${origin}\n`,
      { flag: 'wx', mode: 0o600 },
    );
    execFileSync(
      process.execPath,
      [
        wrangler(api),
        'd1',
        'migrations',
        'apply',
        'DB',
        '--local',
        '--persist-to',
        path.join(scratch, 'state'),
      ],
      { cwd: api, env: { ...env, CI: 'true' }, stdio: 'pipe', timeout: 60000 },
    );
    apiServer = launchPreview(
      process.execPath,
      [
        wrangler(api),
        'dev',
        '--ip',
        '127.0.0.1',
        '--port',
        String(apiPort),
        '--inspector-port',
        '0',
        '--persist-to',
        path.join(scratch, 'state'),
      ],
      { cwd: api, env },
    );
    await apiServer.address();
    webServer = launchPreview(
      process.execPath,
      [
        wrangler(client),
        'dev',
        '--ip',
        '127.0.0.1',
        '--port',
        String(port),
        '--inspector-port',
        '0',
        '--persist-to',
        path.join(scratch, 'client-state'),
      ],
      { cwd: client, env },
    );
    await webServer.address();
    const health = await fetch(`${origin}/api/health`);
    assert.equal(health.status, 200, await health.clone().text());
    assert.deepEqual(await health.json(), { ok: true });
    for (const route of ['/', '/account', '/sign-in']) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get('content-type'), /text\/html/);
    }
    assert.equal((await fetch(origin + '/api/absent')).status, 404);
    assert.equal(
      (
        await fetch(origin + '/api/session', {
          headers: {
            'x-user-id': 'forged',
            'cf-access-authenticated-user-email': 'forged@example.com',
          },
        })
      ).status,
      401,
    );
    await verifyLocalAuth(origin, fetch);
    const nativeSignup = await fetch(origin + '/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'expo-origin': nativeOrigin },
      body: JSON.stringify({
        email: `native-${randomUUID()}@example.invalid`,
        name: 'Native transport',
        password: 'synthetic-native-password-12345',
      }),
    });
    assert.equal(nativeSignup.status, 200, await nativeSignup.clone().text());
    const cookie = nativeSignup.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ');
    assert.ok(cookie);
    assert.equal(
      (await fetch(origin + '/api/session', { headers: { cookie, 'expo-origin': nativeOrigin } }))
        .status,
      200,
    );
    const rejected = await fetch(origin + '/api/auth/sign-out', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'expo-origin': 'untrusted-app://', cookie },
      body: '{}',
    });
    assert.equal(rejected.status, 403);
    if (browser) {
      const module = await import(process.env.ANHEDRAL_PLAYWRIGHT_MODULE ?? 'playwright');
      chromium = await (module.chromium ?? module.default.chromium).launch({
        headless: true,
        ...(process.env.ANHEDRAL_BROWSER_CHANNEL
          ? { channel: process.env.ANHEDRAL_BROWSER_CHANNEL }
          : {}),
      });
      const page = await chromium.newPage();
      await page.goto(origin + '/sign-in');
      await page.getByRole('button', { name: 'Create an account', exact: true }).click();
      await page.getByPlaceholder('Name').fill('Browser verification');
      await page.getByPlaceholder('Email').fill(`browser-${randomUUID()}@example.invalid`);
      await page.getByPlaceholder('Password').fill('synthetic-browser-password-12345');
      await page.getByRole('button', { name: 'Create account', exact: true }).click();
      await page.waitForURL('**/account');
      await page.getByText(/browser-.*@example.invalid/).waitFor();
      await page.reload();
      await page.getByText(/browser-.*@example.invalid/).waitFor();
      await page.getByRole('button', { name: 'Sign out', exact: true }).click();
      await page.waitForURL('**/sign-in');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(origin);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      await page.screenshot({ path: path.join(scratch, 'mobile.png') });
      console.log('PASS browser: signup, protected account, reload, sign-out, mobile viewport.');
    }
    console.log(
      'PASS universal: exported routes, workerd service binding, D1 auth, protected contracts, revocation, native scheme transport and origin rejection.',
    );
  } catch (error) {
    throw new Error(
      `${error.message}\nAPI: ${apiServer?.diagnostics()}\nWeb: ${webServer?.diagnostics()}`,
      { cause: error },
    );
  } finally {
    await chromium?.close();
    await webServer?.stop();
    await apiServer?.stop();
    rmSync(environment, { force: true });
    rmSync(scratch, { recursive: true, force: true });
  }
}
