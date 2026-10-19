import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { createDatabase } from '@workspace/db';
import { createAuth } from '@workspace/auth';
import { createBilling, BillingError, type Billing } from '@workspace/billing/server';

type BillingContext = Context<{ Bindings: Env }>;
function billing(env: Env): Billing {
  return createBilling({ database: createDatabase(env.DB), env, stripeEnabled: true, revenueCatEnabled: true });
}
async function subject(request: Request, env: Env): Promise<string> {
  const session = await createAuth(createDatabase(env.DB), env.BETTER_AUTH_SECRET, env.BETTER_AUTH_URL).api.getSession({ headers: request.headers });
  if (!session) throw new BillingError(401, 'Sign in to access billing.');
  return session.user.id;
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
