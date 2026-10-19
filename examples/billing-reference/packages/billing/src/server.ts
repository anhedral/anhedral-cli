import { z } from 'zod';
import Stripe from 'stripe';
import { billingEntitlementsSchema } from '@workspace/contracts';
import { billingConfig, requireValue, type BillingEnv } from './config';
import { createStore, type Account, type Database, type InboxEvent } from './store';
import { BillingConflict, createCheckout, createPortal, revenueCatGrants, stripeClient, stripeEventCustomer, stripeGrants, verifyMode, type Grant } from './providers';
import { rcEventSchema, revenueCatUsers, stripeEventTypes, verifyRevenueCat, verifyRevenueCatScope } from './security';

export class BillingError extends Error {
  constructor(public status: 400 | 401 | 403 | 409 | 503, message: string) { super(message); }
}
const freshFor = 60_000;
const grantsSchema = z.array(z.object({ key: z.string(), expiresAt: z.number().nullable(), source: z.enum(['stripe', 'revenuecat']) })).max(1000);
function future(grant: Grant): boolean { return grant.expiresAt === null || grant.expiresAt > Date.now(); }
function longest(grants: Grant[]): number | null {
  if (grants.some((grant) => grant.expiresAt === null)) return null;
  return Math.max(...grants.map((grant) => grant.expiresAt!));
}
function summary(key: string, grants: Grant[]) {
  const matches = grants.filter((grant) => grant.key === key).filter(future);
  return { key, active: matches.length > 0, expiresAt: matches.length ? date(longest(matches)) : null, sources: [...new Set(matches.map((grant) => grant.source))] };
}
function date(value: number | null): string | null { return value === null ? null : new Date(value).toISOString(); }
function fresh(account: Account): boolean {
  const age = Date.now() - account.checkedAt;
  return account.checkedAt > 0 && age >= 0 && age < freshFor;
}
function idempotency(value: string): string {
  const result = z.uuid().safeParse(value);
  if (!result.success) throw new BillingError(400, 'A UUID Idempotency-Key is required.');
  return result.data;
}

export function createBilling(options: { database: Database; env: BillingEnv; stripeEnabled: boolean; revenueCatEnabled: boolean }) {
  const { env, stripeEnabled, revenueCatEnabled } = options;
  const config = billingConfig(env);
  const store = createStore(options.database);
  const stripe = stripeEnabled ? stripeClient(env) : undefined;

  function report(account: Account) {
    const grants = grantsSchema.parse(JSON.parse(account.snapshot));
    return billingEntitlementsSchema.parse({ entitlements: config.entitlements.map((key) => summary(key, grants)), checkedAt: new Date(account.checkedAt).toISOString() });
  }
  async function canonical(account: Account): Promise<Grant[]> {
    const web = stripe ? await stripeGrants(stripe, account, config) : [];
    const native = revenueCatEnabled ? await revenueCatGrants(account.userId, env, config, stripeEnabled) : [];
    return [...web, ...native];
  }
  async function withLease<T>(userId: string, action: (account: Account) => Promise<T>): Promise<T> {
    const account = await store.acquire(userId);
    if (!account) throw new BillingError(409, 'Billing reconciliation is already running. Retry shortly.');
    try { return await action(account); }
    finally { await store.release(account); }
  }
  async function reconcile(userId: string) {
    return withLease(userId, async (account) => {
      const grants = await canonical(account);
      const checkedAt = Date.now();
      await store.commit(account, JSON.stringify(grants), checkedAt);
      return report({ ...account, snapshot: JSON.stringify(grants), checkedAt });
    });
  }
  async function entitlements(userId: string, force = false) {
    const account = await store.ensure(userId);
    if (!force && fresh(account)) return report(account);
    // No provider response means no new grant; expired projections fail closed.
    return reconcile(userId);
  }
  async function identity(userId: string) {
    await store.ensure(userId);
    return { appUserId: userId, providers: { stripe: stripeEnabled, revenuecat: revenueCatEnabled }, plans: Object.entries(config.plans).map(([id, plan]) => ({ id, label: plan.label })) };
  }
  async function checkout(userId: string, plan: string, requestId: string) {
    if (!stripe) throw new BillingError(400, 'Web checkout is unavailable.');
    if (!Object.hasOwn(config.plans, plan)) throw new BillingError(400, 'Unknown billing plan.');
    const key = idempotency(requestId);
    return withLease(userId, async (account) => {
      try { return { url: await createCheckout(stripe, account, plan, key, store, config) }; }
      catch (error) {
        if (error instanceof BillingConflict) throw new BillingError(409, error.message);
        throw error;
      }
    });
  }
  async function portal(userId: string) {
    if (!stripe) throw new BillingError(400, 'Web billing portal is unavailable.');
    return withLease(userId, async (account) => ({ url: await createPortal(stripe, account, config) }));
  }
  async function assertEntitled(userId: string, key: string): Promise<void> {
    const state = await entitlements(userId);
    if (!state.entitlements.some((value) => value.key === key && value.active)) throw new BillingError(403, 'An active entitlement is required.');
  }
  async function process(event: InboxEvent): Promise<void> {
    if (event.state === 'done') return;
    const users = z.array(z.string()).max(50).parse(JSON.parse(event.users));
    try {
      for (const user of users) await reconcile(user);
      await store.complete(event.id);
    } catch {
      await store.failed(event.id);
      throw new BillingError(503, 'Billing reconciliation pending.');
    }
  }
  async function stripeEvent(raw: string, headers: Headers) {
    if (!stripe) throw new BillingError(400, 'Stripe is not selected.');
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(raw, headers.get('stripe-signature') ?? '', requireValue(env.STRIPE_WEBHOOK_SECRET), 300, Stripe.createSubtleCryptoProvider());
    } catch { throw new BillingError(401, 'Invalid Stripe webhook.'); }
    verifyMode(event.livemode, config);
    return event;
  }
  async function stripeWebhook(raw: string, headers: Headers): Promise<void> {
    const event = await stripeEvent(raw, headers);
    if (!stripeEventTypes.has(event.type)) return;
    const customerId = await stripeEventCustomer(stripe!, event);
    const owner = customerId ? await store.customerOwner(customerId) : undefined;
    const users = owner ? [owner.userId] : [];
    await process(await store.inbox('stripe:' + config.environment, event.id, users));
  }
  async function revenueCatWebhook(raw: string, headers: Headers): Promise<void> {
    if (!revenueCatEnabled) throw new BillingError(400, 'RevenueCat is not selected.');
    try { await verifyRevenueCat(raw, headers, env); }
    catch { throw new BillingError(401, 'Invalid RevenueCat webhook.'); }
    const { event } = rcEventSchema.parse(JSON.parse(raw));
    verifyRevenueCatScope(event, config);
    const users = await store.known(revenueCatUsers(event));
    await process(await store.inbox('revenuecat:' + config.environment, event.id, users));
  }
  async function drainPending(): Promise<void> {
    for (const event of await store.pending()) {
      try { await process(event); }
      catch { /* Persisted retry remains pending; never log provider bodies or secrets. */ }
    }
  }
  return { identity, entitlements, checkout, portal, assertEntitled, stripeWebhook, revenueCatWebhook, drainPending, config };
}
export type Billing = ReturnType<typeof createBilling>;
