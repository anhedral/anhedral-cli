import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { launchPreview } from './preview-process.mjs';
async function unusedPort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
export async function verifyFoundationDevelopment(root) {
  const scratch = mkdtempSync(path.join(tmpdir(), 'anhedral-foundation-runtime-'));
  const apiPort = await unusedPort(),
    webPort = await unusedPort();
  const env = {
    ...process.env,
    WRANGLER_SEND_METRICS: 'false',
    MINIFLARE_REGISTRY_PATH: path.join(scratch, 'registry'),
    WRANGLER_LOG_PATH: path.join(scratch, 'wrangler.log'),
  };
  let api, web;
  try {
    const apiRoot = path.join(root, 'apps/api'),
      webRoot = path.join(root, 'apps/web');
    api = launchPreview(
      process.execPath,
      [
        path.join(apiRoot, 'node_modules/wrangler/bin/wrangler.js'),
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
      { cwd: apiRoot, env },
    );
    await api.address();
    web = launchPreview(
      process.execPath,
      [
        path.join(webRoot, 'node_modules/next/dist/bin/next'),
        'dev',
        '--turbopack',
        '--hostname',
        '127.0.0.1',
        '--port',
        String(webPort),
      ],
      { cwd: webRoot, env: { ...env, API_INTERNAL_URL: `http://127.0.0.1:${apiPort}` } },
    );
    await web.address();
    const origin = `http://127.0.0.1:${webPort}`;
    const page = await fetch(origin, { signal: AbortSignal.timeout(60000) });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Next.js on Cloudflare/);
    const health = await fetch(origin + '/api/health', { signal: AbortSignal.timeout(30000) });
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true });
    for (const route of ['/api/auth/sign-up/email', '/api/files', '/api/payments/checkout']) {
      const response = await fetch(`http://127.0.0.1:${apiPort}` + route, {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
      });
      assert.equal(response.status, 404, route);
      await response.body?.cancel();
    }
  } finally {
    await web?.stop();
    await api?.stop();
    rmSync(scratch, { recursive: true, force: true });
  }
}
