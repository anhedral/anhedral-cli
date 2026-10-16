// Run against the fresh installed/built generated API fixture, without a listening socket.
// node tests/test-generated-auth.mjs /absolute/workspace
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifyLocalAuth } from './support/verify-local-auth.mjs';

assert.ok(process.argv[2], 'Specify a built generated D1/Better Auth API workspace');
const root = path.resolve(process.argv[2]);
const output = path.join(root, 'apps/api/dist/ssr');
const config = JSON.parse(readFileSync(path.join(output, 'wrangler.json'), 'utf8'));
assert.equal(typeof config.main, 'string');
const entry = path.resolve(output, config.main);
assert.ok(entry.startsWith(output + path.sep), 'Compiled Worker stays in build output');
const worker = (await import(pathToFileURL(entry))).default;
const db = new DatabaseSync(':memory:');
try {
  // This adapter exercises real generated SQL and Drizzle queries. It does not
  // emulate workerd or certify Cloudflare's D1 implementation.
  db.exec(readFileSync(path.join(root, 'packages/db/drizzle/0000_better_auth.sql'), 'utf8'));
  function prepare(sql, params = []) {
    return {
      bind(...values) {
        return prepare(sql, values);
      },
      async all() {
        return { success: true, results: db.prepare(sql).all(...params), meta: {} };
      },
      async raw() {
        const query = db.prepare(sql);
        query.setReturnArrays(true);
        return query.all(...params);
      },
      async run() {
        const result = db.prepare(sql).run(...params);
        return {
          success: true,
          results: [],
          meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) },
        };
      },
    };
  }
  const env = {
    DB: { prepare },
    BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
    BETTER_AUTH_URL: 'http://127.0.0.1:8787',
    __VOID_VERSION_METADATA: { id: '00000000-0000-4000-8000-000000000001' },
  };
  const send = (url, options) => worker.fetch(new Request(url, options), env, {});
  const response = await send(new URL('/health', env.BETTER_AUTH_URL));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  const openapi = await send(new URL('/openapi.json', env.BETTER_AUTH_URL));
  assert.equal(openapi.status, 200);
  assert.ok((await openapi.json()).paths['/health']);
  await verifyLocalAuth(env.BETTER_AUTH_URL, send);
  assert.equal(db.prepare('select count(*) as count from user').get().count, 1);
  // Signup creates a separate session. Logout revokes only the later login cookie.
  assert.equal(db.prepare('select count(*) as count from session').get().count, 1);
  console.log(
    'PASS: compiled generated health/OpenAPI and Better Auth/Drizzle signup, login, session, incorrect password and revocation against in-memory SQLite. Workerd and provider acceptance are separate.',
  );
} finally {
  db.close();
}
