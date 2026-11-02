// Only the caller's disposable generated consumer; no configured provider or database.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { launchPreview } from '../tests/support/preview-process.mjs';
import path from 'node:path';
export async function generatedAuthRuntimeProof(root, output, run) {
  const feature = path.join(root, 'apps/api/src/auth-features.ts'),
    original = readFileSync(feature, 'utf8');
  const entry = path.join(root, 'apps/api/src/index.ts'),
    entryOriginal = readFileSync(entry, 'utf8');
  writeFileSync(
    entry,
    entryOriginal.replace(
      'app.onError(',
      `app.get('/api/proof-unexpected', () => { throw new Error('secret-unexpected-details'); });\napp.get('/api/proof-server', () => { throw new HTTPException(500, { message: 'secret-typed-details' }); });\napp.get('/api/proof-client', () => { throw new HTTPException(409, { message: 'Reviewed client conflict' }); });\napp.onError(`,
    ),
  );
  let worker, origin;
  const checks = [];
  const state = path.join(root, '.isolated-auth-state');
  const variables = path.join(root, 'apps/api/.dev.vars');
  writeFileSync(
    variables,
    'PUBLIC_APP_URL=http://localhost:3000\nBETTER_AUTH_SECRET=' +
      randomBytes(32).toString('hex') +
      '\n',
    { mode: 0o600, flag: 'wx' },
  );
  async function start() {
    run('pnpm', [
      '--filter',
      '@workspace/api',
      'exec',
      'wrangler',
      'd1',
      'migrations',
      'apply',
      'DB',
      '--local',
      '--persist-to',
      state,
    ]);
    const next = launchPreview(
      process.execPath,
      [
        path.join(root, 'apps/api/node_modules/wrangler/bin/wrangler.js'),
        'dev',
        '--local',
        '--ip',
        '127.0.0.1',
        '--port',
        '0',
        '--inspector-port',
        '0',
        '--persist-to',
        state,
      ],
      {
        cwd: path.join(root, 'apps/api'),
        env: {
          ...process.env,
          CLOUDFLARE_API_TOKEN: '',
          CLOUDFLARE_ACCOUNT_ID: '',
          WRANGLER_SEND_METRICS: 'false',
          MINIFLARE_REGISTRY_PATH: path.join(state, 'registry'),
        },
      },
    );
    try {
      origin = await next.address();
      return next;
    } catch (error) {
      await next.stop();
      throw error;
    }
  }
  const request = (route, init = {}) =>
    fetch(new URL('/api' + route, origin), { ...init, signal: AbortSignal.timeout(30000) });
  const signup = () =>
    request('/auth/sign-up/email', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Isolated proof',
        email: 'proof@example.com',
        password: 'Fixture-password-' + randomBytes(12).toString('hex'),
      }),
    });
  try {
    run('pnpm', ['--filter', '@workspace/api', 'build']);
    worker = await start();
    assert.equal((await request('/health')).status, 200);
    assert.ok((await signup()).status >= 400);
    checks.push('generated health and disabled-by-default password auth');
    assert.equal(
      (await request('/oversized', { method: 'POST', body: 'x'.repeat(1024 * 1024 + 1) })).status,
      413,
    );
    checks.push('shared request-body bound');
    for (const route of ['/proof-unexpected', '/proof-server']) {
      const response = await request(route);
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), { error: 'Application request failed' });
    }
    assert.equal((await request('/proof-client')).status, 409);
    checks.push('typed client status retained and all server details sanitized');
    await worker.stop();
    worker = undefined;
    writeFileSync(feature, original.replace('emailPassword: false', 'emailPassword: true'));
    run('pnpm', ['--filter', '@workspace/api', 'build']);
    worker = await start();
    const signed = await signup();
    assert.equal(signed.status, 200, await signed.clone().text());
    const cookie = signed.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ');
    assert.ok(cookie);
    assert.equal((await request('/session', { headers: { cookie } })).status, 200);
    assert.equal((await request('/session')).status, 401);
    checks.push('explicit local auth opt-in and verified D1-backed session');
    const rejected = await request('/auth/sign-out', {
      method: 'POST',
      headers: { cookie, origin: 'https://untrusted.example', 'content-type': 'application/json' },
      body: '{}',
    });
    assert.equal(rejected.status, 403);
    checks.push('untrusted browser mutation rejected');
    writeFileSync(
      path.join(output, 'smoke.json'),
      JSON.stringify(
        {
          passed: true,
          runtime: 'compiled generated Hono/Better Auth/workerd',
          checks,
          providerActivation: false,
          limits: [
            'Local Wrangler/D1 only; no provider credentials or configured remote auth methods',
          ],
          isolatedD1: true,
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await worker?.stop();
    writeFileSync(feature, original);
    writeFileSync(entry, entryOriginal);
    rmSync(variables, { force: true });
    rmSync(state, { recursive: true, force: true });
  }
}
