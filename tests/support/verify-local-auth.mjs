// Verify an isolated local Better Auth/D1 preview or an injected compiled Worker transport.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function verifyLocalAuth(origin, send = fetch) {
  const base = new URL(origin);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Local preview only');
  assert.equal(base.protocol, 'http:');
  const email = `acceptance-${randomUUID()}@example.invalid`;
  const password = 'local-synthetic-password-123456';
  const request = (route, input, cookie) =>
    send(new URL(route, base), {
      method: input ? 'POST' : 'GET',
      headers: {
        'content-type': 'application/json',
        origin: base.origin,
        ...(cookie ? { cookie } : {}),
      },
      ...(input ? { body: JSON.stringify(input) } : {}),
      signal: AbortSignal.timeout(15000),
    });
  assert.equal((await request('/api/session')).status, 401);
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
  const protectedSession = await request('/api/session', undefined, cookie);
  assert.equal(protectedSession.status, 200);
  assert.equal(protectedSession.headers.get('cache-control'), 'private, no-store');
  assert.equal((await protectedSession.json()).user.email, email);
  const invalid = await request('/api/auth/sign-in/email', {
    email,
    password: 'incorrect-local-password',
  });
  assert.equal(invalid.status, 401);
  const logout = await request('/api/auth/sign-out', {}, cookie);
  assert.equal(logout.status, 200);
  const expired = await request('/api/auth/get-session', undefined, cookie);
  assert.equal(expired.status, 200);
  assert.equal(await expired.json(), null);
  assert.equal((await request('/api/session', undefined, cookie)).status, 401);
  return { signup: true, login: true, session: true, incorrectPassword: true, revocation: true };
}
