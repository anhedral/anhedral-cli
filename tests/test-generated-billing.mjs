// Local generated Hono/Drizzle/Stripe integration. Vendor responses are fixtures; no payment API access.
import assert from 'node:assert/strict';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { sqliteD1 } from './support/sqlite-d1.mjs';

assert.ok(process.argv[2], 'Specify a generated, installed and built billing workspace');
const root = path.resolve(process.argv[2]);
const entry = path.join(root, 'apps/api/dist/index.js');
const scratch = mkdtempSync(path.join(tmpdir(), 'anhedral-billing-engine-'));
const sqlite = sqliteD1(path.join(root, 'packages/db/drizzle'));
const originalFetch = globalThis.fetch;
const origin = 'https://example.com';
const future = Math.floor(Date.now() / 1000) + 3600;
const customers = new Map();
const subscriptions = new Map();
const native = new Map();
const calls = [];
let refunded = false;
let outage = false;
let holdNative = false;
let releaseNative;
const checkoutBodies = [];
let openCheckout;
let openCheckoutVisible = false;
const headers = { 'content-type': 'application/json', 'request-id': 'req_fixture' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
const env = {
  DB: sqlite.binding,
  BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
  BETTER_AUTH_URL: origin,
  BILLING_ORIGIN: origin,
  BILLING_ENVIRONMENT: 'sandbox',
  BILLING_PLANS_JSON: JSON.stringify({
    monthly: { label: 'Monthly', stripePriceId: 'price_fixture', entitlement: 'premium' },
    annual: { label: 'Annual', stripePriceId: 'price_annual', entitlement: 'premium' },
  }),
  BILLING_ENTITLEMENTS_JSON: '["premium"]',
  BILLING_PREMIUM_ENTITLEMENT: 'premium',
  STRIPE_SECRET_KEY: ['sk', 'test', randomBytes(12).toString('hex')].join('_'),
  STRIPE_WEBHOOK_SECRET: randomBytes(32).toString('hex'),
  REVENUECAT_SECRET_KEY: randomBytes(32).toString('hex'),
  REVENUECAT_WEBHOOK_AUTHORIZATION: randomBytes(32).toString('hex'),
  REVENUECAT_WEBHOOK_SIGNING_SECRET: randomBytes(32).toString('hex'),
  REVENUECAT_PROJECT_ID: 'proj_fixture',
  REVENUECAT_APP_IDS_JSON: '["app_ios","app_android"]',
};
function stripeTransport(url, input) {
  const key = `${input.method ?? 'GET'} ${url.pathname}`;
  const body = new URLSearchParams(input.body);
  if (key === 'POST /v1/customers') {
    const customer = {
      id: `cus_fixture${customers.size + 1}`,
      livemode: false,
      metadata: { app_user_id: body.get('metadata[app_user_id]') },
    };
    customers.set(customer.id, customer);
    return json(customer);
  }
  if (key.startsWith('GET /v1/customers/'))
    return json(customers.get(url.pathname.split('/').at(-1)));
  if (key === 'GET /v1/subscriptions')
    return json({
      object: 'list',
      data: subscriptions.get(url.searchParams.get('customer')) ?? [],
      has_more: false,
    });
  if (key.startsWith('GET /v1/invoices/'))
    return json({
      id: 'in_fixture',
      customer: [...customers.keys()][0],
      status: 'paid',
      amount_paid: 1000,
      livemode: false,
    });
  if (key === 'GET /v1/invoice_payments')
    return json({
      object: 'list',
      has_more: false,
      data: [{ payment: { type: 'payment_intent', payment_intent: 'pi_fixture' } }],
    });
  if (key === 'GET /v1/payment_intents/pi_fixture')
    return json({
      id: 'pi_fixture',
      customer: [...customers.keys()][0],
      livemode: false,
      latest_charge: {
        id: 'ch_fixture',
        customer: [...customers.keys()][0],
        livemode: false,
        paid: true,
        disputed: false,
        amount_refunded: refunded ? 1000 : 0,
      },
    });
  if (key === 'GET /v1/checkout/sessions')
    return json({
      object: 'list',
      data: openCheckoutVisible && openCheckout ? [openCheckout] : [],
      has_more: false,
    });
  if (key === 'POST /v1/checkout/sessions') {
    checkoutBodies.push({
      body: input.body,
      key: new Headers(input.headers).get('idempotency-key'),
    });
    assert.equal(body.get('line_items[0][price]'), 'price_fixture');
    assert.equal(body.get('success_url'), origin + '/billing?result=success');
    openCheckout = {
      id: 'cs_fixture',
      mode: 'subscription',
      status: 'open',
      expires_at: future,
      customer: body.get('customer'),
      livemode: false,
      metadata: {
        app_user_id: body.get('metadata[app_user_id]'),
        plan_id: body.get('metadata[plan_id]'),
      },
      url: 'https://checkout.stripe.com/c/pay/fixture',
    };
    return json(openCheckout);
  }
  if (key === 'POST /v1/billing_portal/sessions')
    return json({ url: 'https://billing.stripe.com/p/session/fixture' });
  throw new Error('Unexpected fixture Stripe request: ' + key);
}
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(input instanceof Request ? input.url : input);
  const settings =
    input instanceof Request
      ? { method: input.method, headers: input.headers, body: await input.text(), ...options }
      : options;
  calls.push({ hostname: url.hostname, pathname: url.pathname });
  if (outage) throw new Error('Synthetic provider outage');
  if (url.hostname === 'api.stripe.com') return stripeTransport(url, settings);
  if (url.hostname === 'api.revenuecat.com') {
    assert.equal(
      new Headers(settings.headers).get('authorization'),
      'Bearer ' + env.REVENUECAT_SECRET_KEY,
    );
    const id = decodeURIComponent(url.pathname.split('/').at(-1));
    if (holdNative) {
      holdNative = false;
      const captured = structuredClone(native.get(id));
      return new Promise((resolve) => {
        releaseNative = () => resolve(json(captured));
      });
    }
    return json(
      native.get(id) ?? {
        subscriber: { entitlements: {}, subscriptions: {}, non_subscriptions: {} },
      },
    );
  }
  throw new Error('External networking forbidden in billing fixture: ' + url.origin);
};
const worker = (await import(pathToFileURL(entry))).default;
const requireFromApi = createRequire(path.join(root, 'apps/api/package.json'));
const requireFromWrangler = createRequire(requireFromApi.resolve('wrangler/package.json'));
const engineEntry = path.join(scratch, 'entry.mjs');
writeFileSync(
  engineEntry,
  'export { createBilling } from ' +
    JSON.stringify(path.join(root, 'packages/billing/src/server.ts')) +
    ';\nexport { createDatabase } from ' +
    JSON.stringify(path.join(root, 'packages/db/src/index.ts')) +
    ';\nexport { billingConfig } from ' +
    JSON.stringify(path.join(root, 'packages/billing/src/config.ts')) +
    ';\n',
);
await requireFromWrangler('esbuild').build({
  entryPoints: [engineEntry],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  outfile: path.join(scratch, 'engine.mjs'),
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
const { createBilling, createDatabase, billingConfig } = await import(
  pathToFileURL(path.join(scratch, 'engine.mjs'))
);
const send = (route, { cookie, body, method, extra = {} } = {}) =>
  worker.fetch(
    new Request(origin + route, {
      method: method ?? (body === undefined ? 'GET' : 'POST'),
      headers: {
        'content-type': 'application/json',
        origin,
        ...(cookie ? { cookie } : {}),
        ...extra,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    env,
    { waitUntil() {} },
  );
async function response(route, settings, status = 200) {
  const result = await send(route, settings);
  assert.equal(result.status, status, `${route}: ${await result.clone().text()}`);
  return result.json();
}
async function signup() {
  const result = await send('/api/auth/sign-up/email', {
    body: {
      name: 'Billing fixture',
      email: `billing-${randomUUID()}@example.com`,
      password: randomBytes(24).toString('hex'),
    },
  });
  assert.equal(result.status, 200, await result.clone().text());
  return {
    id: (await result.json()).user.id,
    cookie: result.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; '),
  };
}
function stripeHeaders(raw, timestamp = Math.floor(Date.now() / 1000)) {
  return {
    'stripe-signature': `t=${timestamp},v1=${createHmac('sha256', env.STRIPE_WEBHOOK_SECRET)
      .update(timestamp + '.' + raw)
      .digest('hex')}`,
  };
}
async function stripeEvent(type, customer, overrides = {}) {
  const event = {
    id: 'evt_' + randomUUID(),
    object: 'event',
    type,
    livemode: false,
    data: { object: { customer } },
    ...overrides,
  };
  const raw = JSON.stringify(event);
  const result = await worker.fetch(
    new Request(origin + '/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...stripeHeaders(raw) },
      body: raw,
    }),
    env,
    {},
  );
  return { result, event, raw };
}
async function rcEvent(userId, overrides = {}) {
  const event = {
    id: 'event_' + randomUUID(),
    app_id: 'app_ios',
    environment: 'SANDBOX',
    app_user_id: userId,
    ...overrides,
  };
  const raw = JSON.stringify({ event });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', env.REVENUECAT_WEBHOOK_SIGNING_SECRET)
    .update(timestamp + '.' + raw)
    .digest('hex');
  return worker.fetch(
    new Request(origin + '/api/webhooks/revenuecat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: env.REVENUECAT_WEBHOOK_AUTHORIZATION,
        'X-RevenueCat-Webhook-Signature': `t=${timestamp},v1=${signature}`,
      },
      body: raw,
    }),
    env,
    {},
  );
}
try {
  await response('/api/billing/identity', {}, 401);
  const alice = await signup();
  const bob = await signup();
  const identity = await response('/api/billing/identity', { cookie: alice.cookie });
  assert.equal(identity.appUserId, alice.id);
  await response('/api/billing/identity', { cookie: bob.cookie });
  await response('/api/billing/premium', { cookie: alice.cookie }, 403);
  await response(
    '/api/billing/checkout',
    { cookie: alice.cookie, body: { plan: 'monthly', userId: bob.id } },
    400,
  );
  await response(
    '/api/billing/checkout',
    {
      cookie: alice.cookie,
      body: { plan: 'unconfigured' },
      extra: { 'idempotency-key': randomUUID() },
    },
    400,
  );
  await response(
    '/api/billing/refresh',
    { cookie: alice.cookie, body: {}, extra: { origin: 'https://untrusted.example.com' } },
    403,
  );
  await response(
    '/api/billing/refresh',
    { cookie: alice.cookie, body: {}, extra: { 'sec-fetch-site': 'cross-site' } },
    403,
  );
  const intent = randomUUID();
  const checkout = {
    cookie: alice.cookie,
    body: { plan: 'monthly' },
    extra: { 'idempotency-key': intent },
  };
  await response('/api/billing/checkout', checkout);
  await response('/api/billing/checkout', checkout);
  assert.deepEqual(
    checkoutBodies[0],
    checkoutBodies[1],
    'Retries preserve identical Stripe parameters and key',
  );
  assert.equal(customers.size, 1);
  openCheckoutVisible = true;
  await response('/api/billing/checkout', {
    ...checkout,
    extra: { 'idempotency-key': randomUUID() },
  });
  assert.equal(
    checkoutBodies.length,
    2,
    'A distinct intent reuses the existing open Checkout rather than creating a duplicate',
  );
  await response(
    '/api/billing/checkout',
    { cookie: alice.cookie, body: { plan: 'annual' }, extra: { 'idempotency-key': randomUUID() } },
    409,
  );
  openCheckout = undefined;
  const customer = [...customers.keys()][0];
  subscriptions.set(customer, [
    {
      id: 'sub_fixture',
      customer,
      livemode: false,
      status: 'active',
      metadata: { app_user_id: alice.id },
      latest_invoice: 'in_fixture',
      items: { data: [{ price: { id: 'price_fixture' }, current_period_end: future }] },
    },
  ]);
  const paid = await stripeEvent('invoice.paid', customer);
  assert.equal(paid.result.status, 200, await paid.result.clone().text());
  let state = await response('/api/billing/entitlements', { cookie: alice.cookie });
  assert.deepEqual(state.entitlements[0].sources, ['stripe']);
  await response('/api/billing/premium', { cookie: alice.cookie });
  await response('/api/billing/premium', { cookie: bob.cookie }, 403);
  await response('/api/billing/portal', { cookie: alice.cookie, body: {} });
  const callsBeforeDuplicate = calls.length;
  const duplicate = await worker.fetch(
    new Request(origin + '/api/webhooks/stripe', {
      method: 'POST',
      headers: stripeHeaders(paid.raw),
      body: paid.raw,
    }),
    env,
    {},
  );
  assert.equal(duplicate.status, 200);
  assert.equal(calls.length, callsBeforeDuplicate);
  native.set(alice.id, {
    subscriber: {
      entitlements: {
        premium: {
          product_identifier: 'native_premium',
          expires_date: new Date(future * 1000).toISOString(),
        },
      },
      subscriptions: {
        native_premium: {
          is_sandbox: true,
          store: 'app_store',
          expires_date: new Date(future * 1000).toISOString(),
        },
      },
    },
  });
  assert.equal((await rcEvent(alice.id)).status, 200);
  state = await response('/api/billing/entitlements', { cookie: alice.cookie });
  assert.deepEqual(state.entitlements[0].sources.sort(), ['revenuecat', 'stripe']);
  refunded = true;
  await response(
    '/api/billing/checkout',
    { ...checkout, extra: { 'idempotency-key': randomUUID() } },
    409,
  );
  assert.equal((await stripeEvent('charge.refunded', customer)).result.status, 200);
  state = await response('/api/billing/entitlements', { cookie: alice.cookie });
  assert.deepEqual(
    state.entitlements[0].sources,
    ['revenuecat'],
    'Native entitlement survives revoked web access',
  );
  native.set(alice.id, { subscriber: { entitlements: {}, subscriptions: {} } });
  assert.equal((await rcEvent(alice.id)).status, 200);
  await response('/api/billing/premium', { cookie: alice.cookie }, 403);
  assert.equal((await stripeEvent('invoice.paid', customer, { created: 1 })).result.status, 200);
  await response('/api/billing/premium', { cookie: alice.cookie }, 403);
  const invalid = await worker.fetch(
    new Request(origin + '/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'invalid' },
      body: paid.raw,
    }),
    env,
    {},
  );
  assert.equal(invalid.status, 401);
  const stale = await worker.fetch(
    new Request(origin + '/api/webhooks/stripe', {
      method: 'POST',
      headers: stripeHeaders(paid.raw, 1),
      body: paid.raw,
    }),
    env,
    {},
  );
  assert.equal(stale.status, 401);
  assert.notEqual((await rcEvent(alice.id, { environment: 'PRODUCTION' })).status, 200);
  assert.notEqual((await rcEvent(alice.id, { app_id: 'app_other' })).status, 200);
  const subscription = subscriptions.get(customer)[0];
  refunded = false;
  subscription.cancel_at_period_end = true;
  await response('/api/billing/refresh', { cookie: alice.cookie, body: {} });
  await response('/api/billing/premium', { cookie: alice.cookie });
  subscription.items.data[0].current_period_end = 1;
  await response('/api/billing/refresh', { cookie: alice.cookie, body: {} });
  await response('/api/billing/premium', { cookie: alice.cookie }, 403);
  subscription.items.data[0].current_period_end = future;
  subscription.status = 'past_due';
  await response(
    '/api/billing/checkout',
    { ...checkout, extra: { 'idempotency-key': randomUUID() } },
    409,
  );
  await response('/api/billing/refresh', { cookie: alice.cookie, body: {} });
  await response('/api/billing/premium', { cookie: alice.cookie }, 403);
  subscription.status = 'trialing';
  await response('/api/billing/refresh', { cookie: alice.cookie, body: {} });
  await response('/api/billing/premium', { cookie: alice.cookie });
  subscriptions.set(customer, []);
  const nativeGrant = {
    subscriber: {
      entitlements: {
        premium: {
          product_identifier: 'native_premium',
          expires_date: new Date(future * 1000).toISOString(),
        },
      },
      subscriptions: {
        native_premium: {
          is_sandbox: true,
          store: 'app_store',
          expires_date: new Date(future * 1000).toISOString(),
        },
      },
    },
  };
  native.set(alice.id, nativeGrant);
  holdNative = true;
  const slow = send('/api/billing/refresh', { cookie: alice.cookie, body: {} });
  const deadline = Date.now() + 5000;
  while (!releaseNative && Date.now() < deadline)
    await new Promise((resolve) => setImmediate(resolve));
  assert.equal(typeof releaseNative, 'function');
  await response('/api/billing/refresh', { cookie: alice.cookie, body: {} }, 409);
  sqlite.database
    .prepare('update billing_accounts set lease_until=0 where user_id=?')
    .run(alice.id);
  native.set(alice.id, { subscriber: { entitlements: {}, subscriptions: {} } });
  await response('/api/billing/refresh', { cookie: alice.cookie, body: {} });
  releaseNative();
  assert.equal(
    (await slow).status,
    503,
    'Expired lease cannot overwrite a newer canonical projection',
  );
  await response('/api/billing/premium', { cookie: alice.cookie }, 403);
  native.set(bob.id, nativeGrant);
  assert.equal(
    (await rcEvent(alice.id, { transferred_from: [alice.id], transferred_to: [bob.id] })).status,
    200,
  );
  await response('/api/billing/premium', { cookie: alice.cookie }, 403);
  await response('/api/billing/premium', { cookie: bob.cookie });
  native.set(bob.id, {
    subscriber: {
      entitlements: {
        premium: {
          product_identifier: 'native_premium',
          expires_date: new Date(1000).toISOString(),
        },
      },
      subscriptions: {
        native_premium: {
          is_sandbox: true,
          store: 'app_store',
          expires_date: new Date(1000).toISOString(),
        },
      },
    },
  });
  await response('/api/billing/refresh', { cookie: bob.cookie, body: {} });
  await response('/api/billing/premium', { cookie: bob.cookie }, 403);
  const badRc = await worker.fetch(
    new Request(origin + '/api/webhooks/revenuecat', {
      method: 'POST',
      headers: {
        authorization: env.REVENUECAT_WEBHOOK_AUTHORIZATION,
        'X-RevenueCat-Webhook-Signature': 't=1,v1=' + '0'.repeat(64),
      },
      body: '{}',
    }),
    env,
    {},
  );
  assert.equal(badRc.status, 401);
  outage = true;
  const pending = await rcEvent(alice.id);
  assert.equal(pending.status, 503);
  assert.ok(
    sqlite.database
      .prepare("select count(*) as count from billing_events where state='pending'")
      .get().count > 0,
  );
  sqlite.database.prepare('update billing_accounts set checked_at=0').run();
  await response('/api/billing/entitlements', { cookie: alice.cookie }, 503);
  outage = false;
  sqlite.database.prepare('update billing_events set next_attempt_at=0').run();
  let pendingWork;
  worker.scheduled({}, env, {
    waitUntil(value) {
      pendingWork = value;
    },
  });
  await pendingWork;
  assert.equal(
    sqlite.database
      .prepare("select count(*) as count from billing_events where state='pending'")
      .get().count,
    0,
  );
  assert.equal(
    billingConfig({ ...env, BILLING_ORIGIN: 'http://127.0.0.1:3000' }).origin,
    'http://127.0.0.1:3000',
  );
  for (const badOrigin of [
    'http://example.com',
    'http://192.168.1.2',
    'https://example.com/path',
    'https://example.com?return=other',
  ])
    assert.throws(() => billingConfig({ ...env, BILLING_ORIGIN: badOrigin }));
  assert.throws(() =>
    billingConfig({
      ...env,
      BILLING_ORIGIN: 'http://localhost:3000',
      BILLING_ENVIRONMENT: 'production',
    }),
  );
  const database = createDatabase(sqlite.binding);
  native.set(alice.id, nativeGrant);
  const nativeOnly = createBilling({
    database,
    env: {
      ...env,
      STRIPE_SECRET_KEY: undefined,
      STRIPE_WEBHOOK_SECRET: undefined,
      BILLING_PLANS_JSON: '{}',
    },
    stripeEnabled: false,
    revenueCatEnabled: true,
  });
  const beforeNativeOnly = calls.length;
  assert.equal((await nativeOnly.entitlements(alice.id, true)).entitlements[0].active, true);
  assert.equal(
    calls.slice(beforeNativeOnly).some((call) => call.hostname === 'api.stripe.com'),
    false,
  );
  await assert.rejects(nativeOnly.checkout(alice.id, 'monthly', randomUUID()), /unavailable/);
  subscriptions.set(customer, [
    {
      id: 'sub_fixture',
      customer,
      livemode: false,
      status: 'trialing',
      metadata: { app_user_id: alice.id },
      latest_invoice: null,
      items: { data: [{ price: { id: 'price_fixture' }, current_period_end: future }] },
    },
  ]);
  const stripeOnly = createBilling({
    database,
    env: {
      ...env,
      REVENUECAT_SECRET_KEY: undefined,
      REVENUECAT_PROJECT_ID: undefined,
      REVENUECAT_APP_IDS_JSON: undefined,
    },
    stripeEnabled: true,
    revenueCatEnabled: false,
  });
  const beforeStripeOnly = calls.length;
  assert.deepEqual((await stripeOnly.entitlements(alice.id, true)).entitlements[0].sources, [
    'stripe',
  ]);
  assert.equal(
    calls.slice(beforeStripeOnly).some((call) => call.hostname === 'api.revenuecat.com'),
    false,
  );
  const productionNative = createBilling({
    database,
    env: { ...env, BILLING_ENVIRONMENT: 'production', STRIPE_SECRET_KEY: undefined },
    stripeEnabled: false,
    revenueCatEnabled: true,
  });
  assert.equal(
    (await productionNative.entitlements(alice.id, true)).entitlements[0].active,
    false,
    'Sandbox store data cannot grant production access',
  );
  console.log(
    'PASS generated billing: actual Hono/auth/Drizzle/Stripe SDK, checkout idempotency, provider union/revocation, ownership/CSRF, signed webhook replay/order/environment, outage and durable scheduled recovery. Vendor responses are synthetic; no provider/store acceptance.',
  );
} finally {
  globalThis.fetch = originalFetch;
  sqlite.close();
  rmSync(scratch, { recursive: true, force: true });
}
