import { readFileSync } from 'node:fs';
import path from 'node:path';
import { STACK_DEPENDENCIES } from '../dependencies.js';
import type { RecipeContext } from '../registry/types.js';
import { scaffoldBillingContracts } from './billing-contracts.js';
import { scaffoldExpoBilling } from './expo-billing.js';
import { scaffoldBillingSchema } from './billing-schema.js';
import { BILLING_CONFIG } from './billing-config.js';
import { BILLING_SECURITY } from './billing-security.js';
import { BILLING_STORE } from './billing-store.js';
import { BILLING_PROVIDERS } from './billing-providers.js';
import { BILLING_SERVER } from './billing-server.js';
import { writeEnvironmentFile } from './environment.js';
import { json, patchPackage, put, readJson, sharedPackage } from './files.js';

function applicationBilling(context: RecipeContext): string {
  const { has } = context;
  const database = 'env.DB';
  const authenticate = `const session = await createAuth(createDatabase(env.DB), env.BETTER_AUTH_SECRET, env.BETTER_AUTH_URL).api.getSession({ headers: request.headers });
  if (!session) throw new BillingError(401, 'Sign in to access billing.');
  return session.user.id;`;
  return `import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { createDatabase } from '@workspace/db';
import { createAuth } from '@workspace/auth';
import { createBilling, BillingError, type Billing } from '@workspace/billing/server';

type BillingContext = Context<{ Bindings: Env }>;
function billing(env: Env): Billing {
  return createBilling({ database: createDatabase(${database}), env, stripeEnabled: ${has('stripe')}, revenueCatEnabled: ${has('revenuecat')} });
}
async function subject(request: Request, env: Env): Promise<string> {
  ${authenticate}
}
function originAllowed(request: Request, env: Env): void {
  if (!trustedOrigin(request, env)) throw new BillingError(403, 'Unexpected billing request origin.');
  if (request.headers.get('sec-fetch-site') === 'cross-site') throw new BillingError(403, 'Cross-site billing requests are denied.');
  if (!jsonRequest(request)) throw new BillingError(400, 'A JSON request is required.');
}
function jsonRequest(request: Request): boolean {
  const contentType = request.headers.get('content-type') ?? '';
  return contentType.split(';')[0].trim() === 'application/json';
}
function trustedOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(env.BILLING_ORIGIN).origin;
}
function handle(action: (context: BillingContext) => Promise<unknown>) {
  return async (context: BillingContext) => {
    context.header('cache-control', 'private, no-store');
    try { return context.body(JSON.stringify(await action(context)), 200, { 'content-type': 'application/json' }); }
    catch (error) {
      if (error instanceof BillingError) return context.json({ error: error.message }, error.status);
      if (error instanceof z.ZodError) return context.json({ error: 'Invalid billing request or configuration.' }, 400);
      return context.json({ error: 'Billing is temporarily unavailable.' }, 503);
    }
  };
}
async function signedIn(context: BillingContext) {
  const userId = await subject(context.req.raw, context.env);
  return { userId, service: billing(context.env) };
}
async function mutation(context: BillingContext) {
  originAllowed(context.req.raw, context.env);
  return signedIn(context);
}
export const billingRoutes = new Hono<{ Bindings: Env }>();
billingRoutes.get('/billing/identity', handle(async (context) => {
  const { service, userId } = await signedIn(context);
  return service.identity(userId);
}));
billingRoutes.get('/billing/entitlements', handle(async (context) => {
  const { service, userId } = await signedIn(context);
  return service.entitlements(userId);
}));
billingRoutes.post('/billing/refresh', handle(async (context) => {
  const { service, userId } = await mutation(context);
  z.object({}).strict().parse(await context.req.json());
  return service.entitlements(userId, true);
}));
billingRoutes.post('/billing/checkout', handle(async (context) => {
  const { service, userId } = await mutation(context);
  const { plan } = z.object({ plan: z.string().min(1).max(100) }).strict().parse(await context.req.json());
  return service.checkout(userId, plan, context.req.header('idempotency-key') ?? '');
}));
billingRoutes.post('/billing/portal', handle(async (context) => {
  const { service, userId } = await mutation(context);
  z.object({}).strict().parse(await context.req.json());
  return service.portal(userId);
}));
billingRoutes.get('/billing/premium', handle(async (context) => {
  const { service, userId } = await signedIn(context);
  await service.assertEntitled(userId, service.config.demoEntitlement);
  return { ok: true, entitlement: service.config.demoEntitlement };
}));
billingRoutes.post('/webhooks/stripe', handle(async (context) => {
  await billing(context.env).stripeWebhook(await context.req.text(), context.req.raw.headers);
  return { received: true };
}));
billingRoutes.post('/webhooks/revenuecat', handle(async (context) => {
  await billing(context.env).revenueCatWebhook(await context.req.text(), context.req.raw.headers);
  return { received: true };
}));
export async function drainBilling(env: Env): Promise<void> {
  try { await billing(env).drainPending(); }
  catch { /* Missing configuration or provider outage grants nothing; inbox stays durable. */ }
}
`;
}

function connectApi(context: RecipeContext): void {
  const { root } = context;
  put(root, 'apps/api/src/billing.ts', applicationBilling(context));
  put(
    root,
    'apps/api/src/billing-env.d.ts',
    `import type { BillingEnv } from '@workspace/billing/config';
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Merge billing bindings with Wrangler's generated Env.
declare global { interface Env extends BillingEnv {} }
export {};
`,
  );
  patchPackage(root, 'apps/api/package.json', {
    dependencies: { '@workspace/billing': 'workspace:*', zod: STACK_DEPENDENCIES.zod },
  });
  const file = 'apps/api/src/index.ts';
  const source = readFileSync(path.join(root, file), 'utf8');
  if (!source.includes('import { billingRoutes, drainBilling }'))
    put(
      root,
      file,
      "import { billingRoutes, drainBilling } from './billing';\n" +
        source.replace(
          'export default app;',
          `app.route('/api', billingRoutes);
// Retry a bounded batch of durable webhook records independently of client activity.
export default {
  fetch: app.fetch,
  scheduled(_event: ScheduledController, env: Env, context: ExecutionContext) {
    context.waitUntil(drainBilling(env));
  },
};`,
        ),
    );
  const configuration = 'apps/api/wrangler.jsonc';
  const config = readJson(root, configuration);
  const triggers = (config.triggers ?? {}) as { crons?: string[] };
  config.triggers = {
    ...triggers,
    crons: [...new Set([...(triggers.crons ?? []), '*/5 * * * *'])],
  };
  json(root, configuration, config);
}

export function scaffoldBilling(context: RecipeContext): void {
  const { root, has } = context;
  if (!has('hono')) throw new Error('Billing requires the shared Hono runtime.');
  if (!has('d1')) throw new Error('Billing requires the core D1 database.');
  scaffoldBillingContracts(root);
  scaffoldBillingSchema(root);
  sharedPackage(root, 'billing', "export { createBilling, BillingError } from './server';\n", {
    '@workspace/contracts': 'workspace:*',
    '@workspace/db': 'workspace:*',
    stripe: STACK_DEPENDENCIES.stripe,
    zod: STACK_DEPENDENCIES.zod,
    'drizzle-orm': STACK_DEPENDENCIES['drizzle-orm'],
  });
  patchPackage(root, 'packages/billing/package.json', {
    exports: {
      '.': './src/index.ts',
      './server': './src/server.ts',
      './config': './src/config.ts',
    },
  });
  for (const [name, source] of Object.entries({
    config: BILLING_CONFIG,
    security: BILLING_SECURITY,
    store: BILLING_STORE,
    providers: BILLING_PROVIDERS,
    server: BILLING_SERVER,
  }))
    put(root, `packages/billing/src/${name}.ts`, source);
  connectApi(context);
  writeEnvironmentFile(root, 'apps/api/.dev.vars.example', {
    BILLING_ORIGIN: '',
    BILLING_ENVIRONMENT: 'sandbox',
    BILLING_PLANS_JSON: '{}',
    BILLING_ENTITLEMENTS_JSON: '["premium"]',
    BILLING_PREMIUM_ENTITLEMENT: 'premium',
    ...(has('stripe') ? { STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '' } : {}),
    ...(has('revenuecat')
      ? {
          REVENUECAT_SECRET_KEY: '',
          REVENUECAT_WEBHOOK_AUTHORIZATION: '',
          REVENUECAT_WEBHOOK_SIGNING_SECRET: '',
          REVENUECAT_APP_IDS_JSON: '[]',
          REVENUECAT_PROJECT_ID: '',
        }
      : {}),
  });
  scaffoldExpoBilling(context);
  put(root, 'packages/billing/README.md', BILLING_README);
}

const BILLING_README = `# Shared billing

Hono owns authenticated Checkout, customer portal and entitlement decisions. Clients use the public contracts and never select a user/customer ID, raw Stripe price or return URL. Stripe web subscriptions and RevenueCat native subscriptions are independent provider projections; Hono unions their allowed entitlements. When both are enabled, RevenueCat Stripe receipts do not grant access, preventing stale Stripe mirrors from restoring a revoked web grant. Web purchases are not automatically imported into RevenueCat. Native clients query Hono for unified product access.

Generate and review SQL from packages/db/src/billing-schema.ts with pnpm db:generate, then migrate the selected development database explicitly. Builds and checks never migrate configured data. Billing accounts intentionally do not foreign-key a provider-specific user table. Use the verified auth subject as RevenueCat appUserID everywhere; identify through /api/billing/identity before purchasing. Account changes must switch RevenueCat identity and clear client entitlement state. Unknown webhook users are ignored; email never links accounts.

Set BILLING_ORIGIN to the exact product origin. HTTPS is required in production; sandbox development also permits HTTP on localhost, 127.0.0.1 or [::1] only. LAN HTTP is denied; physical devices require a reachable HTTPS origin. BILLING_PLANS_JSON maps a public plan ID to {label,stripePriceId,entitlement}; BILLING_ENTITLEMENTS_JSON lists allowed entitlement keys. Example: {"monthly":{"label":"Monthly","stripePriceId":"price_example","entitlement":"premium"}}. Return paths are /billing?result=success and /billing?result=cancelled; portal returns /billing. Configure the Stripe Customer Portal and required Stripe webhook event types from src/security.ts. POST Checkout requires a UUID Idempotency-Key; preserve the same UUID for retries of one intent. Under the account lease, an existing open checkout for the same configured plan is reused even for a distinct intent UUID. Another pending configured plan returns HTTP 409: finish that checkout before choosing another plan, or have the owner expire it in Stripe. Sessions use Stripe's default expiration; no retry-dependent expires_at parameter is sent. Nonterminal configured subscriptions, including payment failures and refunded active subscriptions, must be managed in the portal and cannot start a duplicate subscription. No access is granted by the return URL. Successful active or trial subscriptions grant until the verified item period ends; past_due is denied. Paid invoices with partial/full refunds or disputes deny web access. This conservative policy excludes out-of-band positive-value invoices without verified payment-intent charges.

Select BILLING_ENVIRONMENT explicitly for the intended sandbox/production backend. Keep Stripe test/live keys and webhook signing secrets isolated. Configure a dedicated RevenueCat project and allowed app IDs using REVENUECAT_PROJECT_ID and REVENUECAT_APP_IDS_JSON. RevenueCat webhook payloads normally omit project_id: the dedicated server API key and project-scoped webhook integration establish that boundary; a present mismatching project_id is rejected. REVENUECAT_SECRET_KEY is a server API v1 key, distinct from CLI management credentials. Require the configured Authorization header and enable HMAC signing with REVENUECAT_WEBHOOK_SIGNING_SECRET when available. Production never honors sandbox receipts, even when client keys or webhook payloads claim otherwise. Use separate RevenueCat projects for staging and production.

Webhook metadata is durably inserted before processing, with a unique provider/environment/event ID. Retries reconcile canonical provider state rather than replaying entitlement deltas. Per-account leases fence stale concurrent writes. Cached access lasts at most sixty seconds and never past a grant's expiry; an outage after that window fails closed. Failed records remain pending; the API's five-minute scheduled handler retries at most ten records per invocation. Inspect pending state/attempts operationally and repair configuration/provider access before retries. Code rollback does not reverse billing events or database migrations. Prune completed event records only under a reviewed retention policy long enough for provider replay windows.

GET /api/billing/premium demonstrates server enforcement through assertEntitled. It is a product example, not a substitute for placing guards on every actual paid operation. Review cross-account restore/transfer behavior and reconcile both source/destination accounts. Public SDK CustomerInfo is display state, never a server authorization claim. Digital consumables/credit balances, metered billing, tax registrations, refunds initiation and store publication are outside this subscription foundation.

Validate signup/session isolation, purchase/restore, renewal, failed payment, refund/dispute, cancellation versus expiry, duplicate/out-of-order webhooks, concurrent refresh, cross-user denial, environment isolation, invalid signatures and provider outage recovery. Local mocks/builds do not establish store purchases, configured provider acceptance or production billing. No services or payments are activated during generation.
`;
