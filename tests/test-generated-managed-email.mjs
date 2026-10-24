// Isolated compiled generated Worker + real Better Auth/Drizzle SQL. No external mail or database.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

assert.ok(process.argv[2], 'Specify a built generated workspace');
const root = path.resolve(process.argv[2]);
const worker = (await import(pathToFileURL(path.join(root, 'apps/api/dist/index.js')))).default;
const db = new DatabaseSync(':memory:');
try {
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
        const q = db.prepare(sql);
        q.setReturnArrays(true);
        return q.all(...params);
      },
      async run() {
        const r = db.prepare(sql).run(...params);
        return {
          success: true,
          results: [],
          meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) },
        };
      },
    };
  }
  const mail = [];
  const origin = 'https://product.example.test';
  const env = {
    DB: { prepare },
    BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
    BETTER_AUTH_URL: origin,
    ANHEDRAL_EMAIL_SCOPE: randomUUID(),
    ANHEDRAL_EMAIL_CAPABILITY: randomBytes(36).toString('hex'),
    ANHEDRAL_EMAIL: {
      async fetch(request) {
        assert.equal(new URL(request.url).pathname, `/scopes/${env.ANHEDRAL_EMAIL_SCOPE}/send`);
        assert.equal(
          request.headers.get('authorization'),
          'Bearer ' + env.ANHEDRAL_EMAIL_CAPABILITY,
        );
        const input = await request.json();
        assert.equal(new URL(input.url).origin, origin);
        assert.match(input.id, /^[a-f0-9]{64}$/);
        mail.push(input);
        return new Response(null, { status: 202 });
      },
    },
  };
  const request = (route, body, cookie, requestOrigin = origin) =>
    worker.fetch(
      new Request(new URL(route, origin), {
        method: body ? 'POST' : 'GET',
        headers: {
          origin: requestOrigin,
          'content-type': 'application/json',
          ...(cookie ? { cookie } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      env,
      {},
    );
  const cookieOf = (response) =>
    response.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ');
  const email = ['synthetic', 'example.invalid'].join('@');
  const password = 'synthetic-password-123456';
  const signup = await request('/api/auth/sign-up/email', {
    email,
    password,
    name: 'Synthetic',
    callbackURL: '/sign-in',
  });
  assert.equal(signup.status, 200, await signup.clone().text());
  assert.equal((await signup.json()).token, null);
  assert.equal(mail.length, 1);
  assert.equal(mail[0].template, 'verify-email');
  assert.equal((await request('/api/session')).status, 401);
  assert.equal((await request('/api/auth/sign-in/email', { email, password })).status, 403);
  assert.equal((await request(mail[0].url)).status, 302);
  const login = await request('/api/auth/sign-in/email', { email, password });
  assert.equal(login.status, 200);
  const cookie = cookieOf(login);
  assert.equal((await request('/api/session', undefined, cookie)).status, 200);
  const foreign = await request('/api/auth/request-password-reset', {
    email,
    redirectTo: 'https://foreign.example/reset-password',
  });
  assert.equal(foreign.status, 403);
  const reset = await request('/api/auth/request-password-reset', {
    email,
    redirectTo: origin + '/reset-password',
  });
  assert.equal(reset.status, 200);
  const resetMail = mail.at(-1);
  assert.equal(resetMail.template, 'reset-password');
  const redirect = await request(resetMail.url);
  assert.equal(redirect.status, 302);
  const token = new URL(redirect.headers.get('location')).searchParams.get('token');
  assert.ok(token);
  const newPassword = 'replacement-synthetic-123456';
  assert.equal(
    (
      await request(
        '/api/auth/reset-password',
        { token, newPassword },
        cookie,
        'https://foreign.example',
      )
    ).status,
    403,
  );
  assert.equal((await request('/api/auth/reset-password', { token, newPassword })).status, 200);
  assert.equal(
    (await request('/api/session', undefined, cookie)).status,
    401,
    'reset revokes existing sessions',
  );
  assert.equal(
    (await request('/api/auth/reset-password', { token, newPassword })).status,
    400,
    'token is single-use',
  );
  assert.equal((await request('/api/auth/sign-in/email', { email, password })).status, 401);
  assert.equal(
    (await request('/api/auth/sign-in/email', { email, password: newPassword })).status,
    200,
  );
  const beforeUnknown = mail.length;
  assert.equal(
    (
      await request('/api/auth/request-password-reset', {
        email: ['unknown', 'example.invalid'].join('@'),
        redirectTo: origin + '/reset-password',
      })
    ).status,
    200,
  );
  assert.equal(mail.length, beforeUnknown, 'unknown accounts do not send mail');
  const scheme = JSON.parse(readFileSync(path.join(root, 'apps/mobile/app.json'), 'utf8')).expo
    .scheme;
  assert.equal(
    (
      await request('/api/auth/request-password-reset', {
        email,
        redirectTo: scheme + '://reset-password',
      })
    ).status,
    200,
  );
  const native = await request(mail.at(-1).url);
  assert.equal(native.status, 302);
  assert.equal(new URL(native.headers.get('location')).protocol, scheme + ':');
  assert.equal(
    (
      await request('/api/auth/request-password-reset', {
        email,
        redirectTo: 'foreign-app://reset-password',
      })
    ).status,
    403,
  );
  db.exec('update verification set expires_at = 0');
  const expiredToken = new URL(native.headers.get('location')).searchParams.get('token');
  assert.equal(
    (await request('/api/auth/reset-password', { token: expiredToken, newPassword })).status,
    400,
    'expired reset tokens are rejected',
  );
  console.log(
    'PASS managed signup/verification, web/native reset callbacks, CSRF, single-use tokens, session revocation and unknown-user privacy with synthetic mail only.',
  );
} finally {
  db.close();
}
