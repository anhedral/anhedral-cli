// Local generated-consumer acceptance. Never reads provider resource IDs or applies
// migrations to a configured DB: Miniflare creates fresh in-memory fixture bindings.
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, realpathSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(process.argv[2] ?? '.artifacts/capability-consumer');
assert.ok(
  root.startsWith(path.resolve('.artifacts') + path.sep),
  'Only an isolated local artifact fixture is permitted',
);
assert.equal(JSON.parse(readFileSync(path.join(root, '.anhedral-fixture.json'))).fixture, true);
const require = createRequire(
  realpathSync(path.join(root, 'apps/api/node_modules/wrangler/package.json')),
);
const { Miniflare, convertV4MiniflareOptions } = await import(
  pathToFileURL(require.resolve('miniflare')).href
);
const feature = path.join(root, 'apps/api/src/auth-features.ts');
const original = readFileSync(feature, 'utf8');
const evidence = { passed: false, checks: [], outboundRequests: 0 };
const report = () =>
  writeFileSync(path.join(root, 'runtime-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
const run = (args) =>
  execFileSync('pnpm', args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024,
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: '',
      CLOUDFLARE_ACCOUNT_ID: '',
      WRANGLER_SEND_METRICS: 'false',
    },
  });
const secret = randomBytes(32).toString('hex');
const webhookSecret = 'whsec_' + randomBytes(24).toString('hex');
const bindings = {
  BETTER_AUTH_SECRET: secret,
  PUBLIC_APP_URL: 'http://localhost:3000',
  STRIPE_SECRET_KEY: 'sk_test_fixture_not_a_real_key',
  STRIPE_WEBHOOK_SECRET: webhookSecret,
  STRIPE_PRICE_ID: 'price_fixture',
  BILLING_PROVIDER: 'stripe',
  REVENUECAT_SECRET_KEY: 'fixture-server-key',
  REVENUECAT_ENTITLEMENT: 'pro',
  REVENUECAT_WEBHOOK_AUTH: 'Bearer ' + randomBytes(20).toString('hex'),
  REVENUECAT_APP_ID: 'fixture-app',
  RTC_APP_ID: 'fixture-app',
  RTC_APP_SECRET: 'fixture-secret',
};
let billingFixture = null;
let billingSubject;
let mockedProviderRequests = 0;
async function providerFixture(request) {
  if (!billingFixture) {
    evidence.outboundRequests++;
    return new Response('Outbound requests are blocked in this fixture', { status: 503 });
  }
  mockedProviderRequests++;
  const url = new URL(request.url);
  assert.equal(request.method, 'GET', 'Provider fixtures never permit payment mutations');
  if (billingFixture === 'unavailable') return new Response('Fixture unavailable', { status: 503 });
  if (url.hostname === 'api.stripe.com') {
    const subscription = {
      id: 'sub_fixture',
      object: 'subscription',
      metadata: { userId: billingFixture === 'wrong-subject' ? 'another-user' : billingSubject },
      livemode: billingFixture === 'wrong-environment',
      status: billingFixture === 'cancelled' ? 'canceled' : 'active',
      items: {
        data: [
          {
            price: { id: 'price_fixture' },
            current_period_end: Math.floor(Date.now() / 1000) + 3600,
          },
        ],
      },
    };
    if (url.pathname === '/v1/subscriptions/search')
      return Response.json({ object: 'search_result', data: [subscription], has_more: false });
    assert.equal(url.pathname, '/v1/subscriptions/sub_fixture');
    return Response.json(subscription);
  }
  assert.equal(url.hostname, 'api.revenuecat.com');
  assert.equal(url.pathname, '/v1/subscribers/' + encodeURIComponent(billingSubject));
  return Response.json({
    subscriber: {
      entitlements: {
        pro: {
          expires_date: new Date(
            Date.now() + (billingFixture === 'expired' ? -3600000 : 3600000),
          ).toISOString(),
          product_identifier: 'monthly',
        },
      },
      subscriptions: { monthly: { is_sandbox: billingFixture !== 'wrong-environment' } },
    },
  });
}
let mf;
async function start() {
  const worker = new Miniflare(
    convertV4MiniflareOptions({
      host: '127.0.0.1',
      port: 0,
      workers: [
        {
          name: 'api',
          modules: true,
          scriptPath: path.join(root, 'apps/api/dist/index.js'),
          compatibilityDate: '2026-10-05',
          compatibilityFlags: ['nodejs_compat'],
          d1Databases: { DB: 'capability-runtime-fixture' },
          r2Buckets: ['FILES'],
          bindings,
          outboundService: providerFixture,
        },
      ],
    }),
  );
  const db = await worker.getD1Database('DB', 'api');
  for (const file of readdirSync(path.join(root, 'packages/db/drizzle'))
    .filter((file) => file.endsWith('.sql'))
    .sort()) {
    const sql = readFileSync(path.join(root, 'packages/db/drizzle', file), 'utf8');
    for (const statement of sql
      .split('--> statement-breakpoint')
      .map((value) => value.trim())
      .filter(Boolean))
      await db.prepare(statement).run();
  }
  return worker;
}
const headers = (cookie, extra = {}) => ({
  origin: 'http://localhost:3000',
  ...(cookie ? { cookie } : {}),
  ...extra,
});
const request = (route, init = {}) => mf.dispatchFetch('http://localhost:3000/api' + route, init);
async function account(email) {
  const response = await request('/auth/sign-up/email', {
    method: 'POST',
    headers: headers(null, { 'content-type': 'application/json' }),
    body: JSON.stringify({
      name: 'Fixture user',
      email,
      password: 'Fixture-password-' + randomBytes(12).toString('hex'),
    }),
  });
  assert.equal(response.status, 200, await response.clone().text());
  const data = await response.json();
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
  assert.ok(cookie);
  return { id: data.user.id, cookie };
}
try {
  run(['db:generate']);
  run(['--filter', '@workspace/api', 'build']);
  mf = await start();
  const disabled = await request('/auth/sign-up/email', {
    method: 'POST',
    headers: headers(null, { 'content-type': 'application/json' }),
    body: JSON.stringify({
      name: 'Disabled',
      email: 'disabled@example.com',
      password: 'Fixture-disabled-password-123',
    }),
  });
  assert.ok(disabled.status >= 400, 'Password registration must be disabled by default');
  evidence.checks.push('auth methods default disabled');
  await mf.dispose();
  mf = undefined;
  assert.ok(original.includes('emailPassword: false'));
  writeFileSync(feature, original.replace('emailPassword: false', 'emailPassword: true'));
  run(['--filter', '@workspace/api', 'build']);
  mf = await start();
  assert.equal((await request('/health')).status, 200);
  const alice = await account('alice@example.com');
  const bob = await account('bob@example.com');
  assert.equal((await request('/session', { headers: headers(alice.cookie) })).status, 200);
  evidence.checks.push('opt-in password registration and verified sessions on isolated D1');
  const file = '/files/fixture.txt';
  assert.equal(
    (
      await request(file, {
        method: 'PUT',
        headers: headers(alice.cookie, { origin: 'https://attacker.example' }),
        body: 'denied',
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(file, {
        method: 'PUT',
        headers: headers(alice.cookie, {
          origin: 'https://attacker.example',
          authorization: 'Bearer invalid-token',
        }),
        body: 'denied',
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request(file, {
        method: 'PUT',
        headers: headers(alice.cookie),
        body: 'private fixture',
      })
    ).status,
    201,
  );
  assert.equal(
    await (await request(file, { headers: headers(alice.cookie) })).text(),
    'private fixture',
  );
  assert.equal((await request(file, { headers: headers(bob.cookie) })).status, 404);
  assert.equal((await request(file)).status, 401);
  evidence.checks.push(
    'R2 ownership, unsigned requests, CSRF and forged bearer/cookie combinations',
  );
  const event = {
    id: 'evt_capability_fixture',
    object: 'event',
    livemode: false,
    type: 'customer.subscription.updated',
    data: { object: { id: 'sub_fixture' } },
  };
  const payload = JSON.stringify(event, null, 2) + '\n';
  const now = Math.floor(Date.now() / 1000);
  const signature = (body) =>
    't=' +
    now +
    ',v1=' +
    createHmac('sha256', webhookSecret)
      .update(now + '.' + body)
      .digest('hex');
  assert.equal((await request('/webhooks/stripe', { method: 'POST', body: payload })).status, 400);
  const compiled = ts.transpileModule(
    readFileSync(path.join(root, 'apps/web/lib/api-proxy.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const { proxyApi } = await import(
    'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64')
  );
  const binding = {
    fetch: async (req) =>
      mf.dispatchFetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: await req.arrayBuffer(),
      }),
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await proxyApi(
      new Request('https://app.example/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'stripe-signature': signature(payload) },
        body: payload,
      }),
      { binding },
    );
    assert.equal(response.status, 200, await response.text());
  }
  const invalid = await request('/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': signature(payload) },
    body: payload + ' ',
  });
  assert.equal(invalid.status, 400);
  const live = JSON.stringify({ ...event, id: 'evt_live_fixture', livemode: true });
  assert.equal(
    (
      await request('/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': signature(live) },
        body: live,
      })
    ).status,
    400,
  );
  const rc = { event: { id: 'rc_fixture', environment: 'SANDBOX', app_id: 'fixture-app' } };
  assert.equal(
    (
      await request('/webhooks/revenuecat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(rc),
      })
    ).status,
    401,
  );
  for (let attempt = 0; attempt < 2; attempt++)
    assert.equal(
      (
        await request('/webhooks/revenuecat', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: bindings.REVENUECAT_WEBHOOK_AUTH,
          },
          body: JSON.stringify(rc),
        })
      ).status,
      200,
    );
  const wrongScope = { event: { ...rc.event, app_id: 'different-app' } };
  assert.equal(
    (
      await request('/webhooks/revenuecat', {
        method: 'POST',
        headers: { authorization: bindings.REVENUECAT_WEBHOOK_AUTH },
        body: JSON.stringify(wrongScope),
      })
    ).status,
    400,
  );
  const db = await mf.getD1Database('DB', 'api');
  const receipts = await db
    .prepare('SELECT provider,COUNT(*) AS count FROM billing_receipt GROUP BY provider')
    .all();
  assert.deepEqual(receipts.results.map((row) => [row.provider, row.count]).sort(), [
    ['revenuecat', 1],
    ['stripe', 1],
  ]);
  evidence.checks.push(
    'raw Stripe signatures survive Next proxy, tampering/live events rejected, scoped RevenueCat delivery, durable replay deduplication',
  );
  const emitted = await request('/events', {
    method: 'POST',
    headers: headers(alice.cookie, { 'content-type': 'application/json' }),
    body: JSON.stringify({ topic: 'fixture', data: { message: 'private' } }),
  });
  assert.equal(emitted.status, 201);
  const row = await db.prepare('SELECT user_id FROM application_event').first();
  assert.equal(row.user_id, alice.id);
  const stream = await request('/events', {
    headers: headers(alice.cookie, { 'last-event-id': '0:00000000-0000-0000-0000-000000000000' }),
  });
  assert.equal(stream.status, 200);
  const reader = stream.body.getReader();
  let received = '';
  while (!received.includes('private')) {
    const next = await reader.read();
    assert.equal(next.done, false);
    received += new TextDecoder().decode(next.value);
  }
  await reader.cancel();
  evidence.checks.push('owner-scoped events and resumable SSE delivery');
  assert.equal(
    (
      await request('/ai/generate', {
        method: 'POST',
        headers: headers(alice.cookie, { 'content-type': 'application/json' }),
        body: JSON.stringify({ prompt: 'fixture' }),
      })
    ).status,
    503,
  );
  await db
    .prepare('INSERT INTO rtc_session(id,user_id,created_at) VALUES (?,?,?)')
    .bind('alice-session', alice.id, Date.now())
    .run();
  await db
    .prepare('INSERT INTO rtc_session(id,user_id,created_at) VALUES (?,?,?)')
    .bind('bob-session', bob.id, Date.now())
    .run();
  const remote = {
    tracks: [{ location: 'remote', sessionId: 'bob-session', trackName: 'camera' }],
  };
  assert.equal(
    (
      await request('/rtc/session/alice-session/tracks', {
        method: 'POST',
        headers: headers(alice.cookie, { 'content-type': 'application/json' }),
        body: JSON.stringify(remote),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request('/rtc/session/bob-session/tracks', {
        method: 'POST',
        headers: headers(alice.cookie, { 'content-type': 'application/json' }),
        body: JSON.stringify(remote),
      })
    ).status,
    404,
  );
  evidence.checks.push(
    'unconfigured AI fails closed and RTC session/track ownership checked before provider access',
  );
  billingSubject = alice.id;
  for (const [mode, expected] of [
    ['active', 200],
    ['cancelled', 403],
    ['wrong-subject', 403],
    ['wrong-environment', 403],
    ['unavailable', 503],
  ]) {
    billingFixture = mode;
    assert.equal(
      (await request('/billing/access', { headers: headers(alice.cookie) })).status,
      expected,
      mode,
    );
  }
  for (const [mode, expected] of [
    ['active', true],
    ['expired', false],
    ['wrong-environment', false],
  ]) {
    billingFixture = mode;
    const response = await request('/billing/mobile-status', { headers: headers(alice.cookie) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).entitled, expected, mode);
  }
  assert.ok(mockedProviderRequests > 0);
  evidence.mockedProviderRequests = mockedProviderRequests;
  evidence.checks.push(
    'local canonical billing fixtures grant active access and reject cancellation, wrong subject/environment, expiry and provider outage',
  );
  assert.equal(evidence.outboundRequests, 0);
  evidence.passed = true;
  console.log('PASS isolated capability runtime: ' + evidence.checks.join('; '));
} finally {
  writeFileSync(feature, original);
  await mf?.dispose();
  report();
}
