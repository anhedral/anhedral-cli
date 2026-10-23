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

/** Full Next.js/OpenNext workerd frontend, local D1 and bound Hono API. */
export async function verifyUniversalDevelopment(
  root,
  { browser = false, development = false } = {},
) {
  const api = path.join(root, 'apps/api');
  const client = path.join(root, 'apps/web');
  for (const app of [api, client])
    for (const file of ['.env', '.env.local', '.dev.vars'])
      assert.equal(existsSync(path.join(app, file)), false, 'Refuse configured runtime files');
  const scratch = mkdtempSync(path.join(tmpdir(), 'anhedral-universal-'));
  const port = await unusedPort();
  const apiPort = await unusedPort();
  const origin = `http://127.0.0.1:${port}`;
  const nativeOrigin =
    JSON.parse(readFileSync(path.join(root, 'apps/mobile/app.json'))).expo.scheme + '://';
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
  const pageFile = path.join(client, 'app/page.tsx');
  const originalPage = readFileSync(pageFile, 'utf8');
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
    webServer = development
      ? launchPreview(
          process.execPath,
          [
            path.join(client, 'node_modules/next/dist/bin/next'),
            'dev',
            '--turbopack',
            '--hostname',
            '127.0.0.1',
            '--port',
            String(port),
          ],
          {
            cwd: client,
            env: {
              ...env,
              API_INTERNAL_URL: `http://127.0.0.1:${apiPort}`,
              NEXT_TELEMETRY_DISABLED: '1',
            },
          },
        )
      : launchPreview(
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
    for (const route of ['/', '/sign-in']) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get('content-type'), /text\/html/);
    }
    const html = await (await fetch(origin)).text();
    assert.match(html, /data-rendering="server"/);
    assert.ok(html.includes('127.0.0.1:' + port), 'HTML reflects request headers from SSR');
    const account = await fetch(origin + '/account', { redirect: 'manual' });
    assert.ok([200, 307].includes(account.status));
    if (account.status === 307) assert.match(account.headers.get('location'), /sign-in/);
    else assert.match(await account.text(), /NEXT_REDIRECT.*sign-in/);
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
    const authenticated = await fetch(origin + '/account', { headers: { cookie } });
    assert.equal(authenticated.status, 200);
    assert.match(await authenticated.text(), /native-.*@example.invalid/);
    const flight = await fetch(origin + '/', { headers: { RSC: '1' } });
    assert.equal(flight.status, 200);
    assert.match(flight.headers.get('content-type'), /text\/x-component/);
    assert.match(await flight.text(), /data-rendering/);
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
      if (process.env.ANHEDRAL_BENCHMARK_FILE) {
        const results = [];
        for (let run = 1; run <= 3; run++) {
          const context = await chromium.newContext();
          const sample = await context.newPage();
          const started = performance.now();
          await sample.goto(origin, { waitUntil: 'load' });
          await sample.getByRole('link', { name: 'Account', exact: true }).waitFor();
          const readyMs = Math.round(performance.now() - started);
          await sample.waitForFunction(() =>
            performance
              .getEntriesByType('paint')
              .some((entry) => entry.name === 'first-contentful-paint'),
          );
          const measured = await sample.evaluate(() => {
            const entries = [
              ...performance.getEntriesByType('navigation'),
              ...performance.getEntriesByType('resource'),
            ];
            return {
              transferBytes: entries.reduce((total, entry) => total + entry.transferSize, 0),
              fcp: performance.getEntriesByName('first-contentful-paint')[0].startTime,
              resources: performance.getEntriesByType('resource').length,
            };
          });
          results.push({ run, readyMs, ...measured });
          await context.close();
        }
        writeFileSync(
          process.env.ANHEDRAL_BENCHMARK_FILE,
          JSON.stringify({ framework: 'Next16.4.2 OpenNext1.20.12 workerd', results }, null, 2) +
            '\n',
        );
      }
      const page = await chromium.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const email = `browser-${randomUUID()}@example.invalid`;
      await page.goto(origin + '/sign-in');
      await page.getByRole('button', { name: 'Create an account', exact: true }).click();
      await page.getByLabel('Name', { exact: true }).fill('Browser verification');
      await page.getByLabel('Email', { exact: true }).fill(email);
      await page.getByLabel('Password', { exact: true }).fill('synthetic-browser-password-12345');
      await page.getByRole('button', { name: 'Create account', exact: true }).click();
      await page.waitForURL('**/account');
      await page.getByText(/browser-.*@example.invalid/).waitFor();
      await page.reload();
      await page.getByText(/browser-.*@example.invalid/).waitFor();
      await page.getByRole('button', { name: 'Sign out', exact: true }).click();
      await page.waitForURL('**/sign-in');
      await page.getByLabel('Email', { exact: true }).fill(email);
      await page.getByLabel('Password', { exact: true }).fill('synthetic-browser-password-12345');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForURL('**/account');
      await page.getByText(email, { exact: true }).waitFor();
      await page.reload();
      await page.getByText(email, { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Sign out', exact: true }).click();
      await page.waitForURL('**/sign-in');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(origin);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      if (development) {
        const marker = 'HMR verified ' + randomUUID();
        writeFileSync(
          pageFile,
          originalPage.replace('</section>', '<p>' + marker + '</p></section>'),
        );
        await page.getByText(marker, { exact: true }).waitFor({ timeout: 30000 });
        console.log(
          'PASS Nextdev: source change updates the already-open page without export or reload.',
        );
      }
      assert.deepEqual(errors, [], 'Browser runtime must not raise uncaught errors');
      await page.screenshot({
        path: process.env.ANHEDRAL_BROWSER_SCREENSHOT ?? path.join(scratch, 'mobile.png'),
      });
      console.log(
        'PASS browser: signup, protected account, reload, sign-out/sign-in, mobile viewport.',
      );
    }
    console.log(
      'PASS Next: dynamic SSR/RSC, protected account, workerd service binding, D1 auth, protected contracts, revocation, native scheme transport and origin rejection.',
    );
  } catch (error) {
    throw new Error(
      `${error.message}\nAPI: ${apiServer?.diagnostics()}\nWeb: ${webServer?.diagnostics()}`,
      { cause: error },
    );
  } finally {
    await chromium?.close();
    await webServer?.stop();
    if (development) writeFileSync(pageFile, originalPage);
    await apiServer?.stop();
    rmSync(environment, { force: true });
    rmSync(scratch, { recursive: true, force: true });
  }
}
