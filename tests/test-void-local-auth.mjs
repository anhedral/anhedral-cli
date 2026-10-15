// Run against an isolated generated API workerd preview after local D1 migrations.
// node tests/test-void-local-auth.mjs http://127.0.0.1:8787
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Local preview only');
assert.equal(base.protocol, 'http:');
const email = `acceptance-${randomUUID()}@example.invalid`;
const password = 'local-synthetic-password-123456';
const request = (route, input, cookie) =>
  fetch(new URL(route, base), {
    method: input ? 'POST' : 'GET',
    headers: {
      'content-type': 'application/json',
      origin: base.origin,
      ...(cookie ? { cookie } : {}),
    },
    ...(input ? { body: JSON.stringify(input) } : {}),
    signal: AbortSignal.timeout(15000),
  });
const ready = await fetch(new URL('/__void/ready', base));
assert.equal(ready.status, 200);
const readiness = await ready.json();
assert.equal(readiness.ready, true);
assert.match(readiness.versionId, /^[a-f0-9-]{36}$/i);
const anonymous = await request('/api/auth/get-session');
assert.equal(anonymous.status, 200);
assert.equal(await anonymous.json(), null);
const signup = await request('/api/auth/sign-up/email', {
  name: 'Local acceptance',
  email,
  password,
});
assert.equal(signup.status, 200, await signup.clone().text());
assert.equal((await signup.json()).user.email, email);
const login = await request('/api/auth/sign-in/email', { email, password });
assert.equal(login.status, 200, await login.clone().text());
const cookie = login.headers
  .getSetCookie()
  .map((value) => value.split(';')[0])
  .join('; ');
assert.ok(cookie, 'Login issues a session cookie');
const session = await request('/api/auth/get-session', undefined, cookie);
assert.equal(session.status, 200);
assert.equal((await session.json()).user.email, email);
const invalid = await request('/api/auth/sign-in/email', {
  email,
  password: 'incorrect-local-password',
});
assert.equal(invalid.status, 401);
const logout = await request('/api/auth/sign-out', {}, cookie);
assert.equal(logout.status, 200);
const expired = await request('/api/auth/get-session', undefined, cookie);
assert.equal(await expired.json(), null);
console.log(
  'PASS: actual Worker readiness version, local shared Better Auth/D1 signup, login, authenticated session, incorrect password and session revocation.',
);
