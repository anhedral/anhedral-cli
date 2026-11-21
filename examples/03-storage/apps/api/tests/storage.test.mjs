import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { getPlatformProxy } from 'wrangler';
import { betterAuth } from 'better-auth/minimal';
import { createAuth } from '../src/auth.ts';
import app from '../src/index.ts';

test('private file round trip and upload size boundary', async (t) => {
  const proxy = await getPlatformProxy({ persist: false, remoteBindings: false, envFiles: [] });
  t.after(() => proxy.dispose());
  const origin = 'http://localhost';
  const env = { ...proxy.env, PUBLIC_APP_URL: origin, BETTER_AUTH_SECRET: randomUUID() };
  const sql = await readFile(
    new URL('../../../packages/db/drizzle/0000_better_auth.sql', import.meta.url),
    'utf8',
  );
  for (const statement of sql.split('--> statement-breakpoint'))
    await env.DB.prepare(statement.trim()).run();
  const auth = betterAuth({ ...createAuth(env).options, emailAndPassword: { enabled: true } });
  const signup = await auth.api.signUpEmail({
    body: { name: 'Example', email: 'example@example.com', password: randomUUID() },
    asResponse: true,
  });
  assert.equal(signup.status, 200);
  const cookie = signup.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
  const file = '/api/files/sample.bin';
  const limit = 1024 * 1024;
  const bytes = new Uint8Array(limit).fill(42);
  for (const size of [limit, limit + 1]) {
    const body = new Blob([size === limit ? bytes : new Uint8Array(size)]).stream();
    const result = await app.request(
      file,
      { method: 'PUT', headers: { cookie, origin }, body, duplex: 'half' },
      env,
    );
    assert.equal(result.status, size === limit ? 201 : 413);
  }
  const download = await app.request(file, { headers: { cookie } }, env);
  assert.equal(download.status, 200);
  assert.deepEqual(new Uint8Array(await download.arrayBuffer()), bytes);
  assert.equal((await app.request(file, {}, env)).status, 401);
});
