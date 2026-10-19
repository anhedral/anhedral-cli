export const BILLING_PROVIDERS = `import Stripe from 'stripe';
import { z } from 'zod';
import { digest, requireValue, type BillingEnv, type Config, type Plan } from './config';
import type { Account, Store } from './store';

export interface Grant { key: string; expiresAt: number | null; source: 'stripe' | 'revenuecat' }
export class BillingConflict extends Error {}
const timeout = 15_000;
export function stripeClient(env: BillingEnv) {
  return new Stripe(requireValue(env.STRIPE_SECRET_KEY), { httpClient: Stripe.createFetchHttpClient(), maxNetworkRetries: 1, timeout });
}
export function verifyMode(livemode: boolean, config: Config): void {
  if (livemode !== (config.environment === 'production')) throw new Error('Unexpected billing environment.');
}
function objectId(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  return z.object({ id: z.string() }).safeParse(value).data?.id;
}
async function verifyCustomer(stripe: Stripe, customerId: string, userId: string, config: Config) {
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) throw new Error('Billing customer no longer exists.');
  verifyMode(customer.livemode, config);
  if (customer.metadata.app_user_id !== userId) throw new Error('Billing customer ownership mismatch.');
  return customer;
}
async function stripeCustomer(stripe: Stripe, account: Account, store: Store, config: Config): Promise<string> {
  if (account.stripeCustomerId) {
    await verifyCustomer(stripe, account.stripeCustomerId, account.userId, config);
    return account.stripeCustomerId;
  }
  const idempotencyKey = 'anhedral-customer-' + await digest(account.userId);
  const customer = await stripe.customers.create({ metadata: { app_user_id: account.userId } }, { idempotencyKey });
  verifyMode(customer.livemode, config);
  await store.customer(account, customer.id);
  return customer.id;
}
function activeSubscription(subscription: Stripe.Subscription): boolean {
  return ['active', 'trialing'].includes(subscription.status);
}
function planForPrice(price: string, config: Config): Plan | undefined {
  return Object.values(config.plans).find((plan) => plan.stripePriceId === price);
}
async function soundCharge(stripe: Stripe, payment: Stripe.InvoicePayment, customerId: string, config: Config): Promise<boolean> {
  const intentId = objectId(payment.payment.payment_intent);
  if (!intentId) return false;
  const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ['latest_charge'] });
  verifyMode(intent.livemode, config);
  if (objectId(intent.customer) !== customerId) throw new Error('Payment ownership mismatch.');
  const charge = intent.latest_charge;
  if (!expandedCharge(charge)) return false;
  return validCharge(charge, customerId, config);
}
function expandedCharge(value: Stripe.Charge | string | null): value is Stripe.Charge {
  return value !== null && typeof value !== 'string';
}
function validCharge(charge: Stripe.Charge, customerId: string, config: Config): boolean {
  verifyMode(charge.livemode, config);
  if (objectId(charge.customer) !== customerId) throw new Error('Charge ownership mismatch.');
  return [charge.paid, !charge.disputed, charge.amount_refunded === 0].every(Boolean);
}
async function paidInvoice(stripe: Stripe, subscription: Stripe.Subscription, customerId: string, config: Config): Promise<boolean> {
  if (subscription.status === 'trialing') return true;
  const invoiceId = objectId(subscription.latest_invoice);
  if (!invoiceId) return false;
  const invoice = await stripe.invoices.retrieve(invoiceId);
  verifyMode(invoice.livemode, config);
  if (objectId(invoice.customer) !== customerId) throw new Error('Invoice ownership mismatch.');
  return invoicePayment(stripe, invoice, customerId, config);
}
async function invoicePayment(stripe: Stripe, invoice: Stripe.Invoice, customerId: string, config: Config): Promise<boolean> {
  if (invoice.status !== 'paid') return false;
  if (invoice.amount_paid === 0) return true;
  const payments = await stripe.invoicePayments.list({ invoice: invoice.id, status: 'paid', limit: 100 });
  requireCompletePayments(payments);
  if (!payments.data.length) return false;
  const sound = await Promise.all(payments.data.map((payment) => soundCharge(stripe, payment, customerId, config)));
  return sound.every(Boolean);
}
function requireCompletePayments(payments: Stripe.ApiList<Stripe.InvoicePayment>): void {
  if (payments.has_more) throw new Error('Billing payment pagination requires reconciliation.');
}
function subscriptionGrants(subscription: Stripe.Subscription, config: Config): Grant[] {
  return subscription.items.data.flatMap((item): Grant[] => {
    const plan = planForPrice(item.price.id, config);
    if (!plan || item.current_period_end * 1000 <= Date.now()) return [];
    return [{ key: plan.entitlement, expiresAt: item.current_period_end * 1000, source: 'stripe' }];
  });
}
async function grantsForSubscription(stripe: Stripe, subscription: Stripe.Subscription, account: Account, config: Config): Promise<Grant[]> {
  verifyMode(subscription.livemode, config);
  if (objectId(subscription.customer) !== account.stripeCustomerId) throw new Error('Subscription ownership mismatch.');
  if (!ownedActiveSubscription(subscription, account.userId)) return [];
  if (!await paidInvoice(stripe, subscription, account.stripeCustomerId!, config)) return [];
  return subscriptionGrants(subscription, config);
}
function ownedActiveSubscription(subscription: Stripe.Subscription, userId: string): boolean {
  return subscription.metadata.app_user_id === userId && activeSubscription(subscription);
}
async function customerSubscriptions(stripe: Stripe, account: Account, config: Config): Promise<Stripe.Subscription[]> {
  if (!account.stripeCustomerId) return [];
  await verifyCustomer(stripe, account.stripeCustomerId, account.userId, config);
  const subscriptions = await stripe.subscriptions.list({ customer: account.stripeCustomerId, status: 'all', limit: 100 });
  if (subscriptions.has_more) throw new Error('Billing subscription pagination requires reconciliation.');
  return subscriptions.data;
}
export async function stripeGrants(stripe: Stripe, account: Account, config: Config): Promise<Grant[]> {
  const subscriptions = await customerSubscriptions(stripe, account, config);
  const values = await Promise.all(subscriptions.map((subscription) => grantsForSubscription(stripe, subscription, account, config)));
  return values.flat();
}
function configuredSubscription(subscription: Stripe.Subscription, account: Account, config: Config): boolean {
  verifyMode(subscription.livemode, config);
  if (objectId(subscription.customer) !== account.stripeCustomerId) throw new Error('Subscription ownership mismatch.');
  if (['canceled', 'incomplete_expired'].includes(subscription.status)) return false;
  // A nonterminal configured subscription still needs management when its payment
  // failed or was refunded. Absence of an access grant never authorizes another sale.
  return subscription.items.data.some((item) => Boolean(planForPrice(item.price.id, config)));
}
async function requireNewSubscription(stripe: Stripe, account: Account, config: Config): Promise<void> {
  const subscriptions = await customerSubscriptions(stripe, account, config);
  if (subscriptions.some((subscription) => configuredSubscription(subscription, account, config))) throw new BillingConflict('Manage the existing subscription in its billing portal.');
}
function verifyOpenSession(session: Stripe.Checkout.Session, account: Account, config: Config): string {
  verifyMode(session.livemode, config);
  if (objectId(session.customer) !== account.stripeCustomerId) throw new Error('Checkout ownership mismatch.');
  if (session.metadata?.app_user_id !== account.userId) throw new Error('Checkout identity mismatch.');
  return configuredSessionPlan(session, config);
}
function configuredSessionPlan(session: Stripe.Checkout.Session, config: Config): string {
  verifySessionKind(session);
  const plan = sessionPlanId(session);
  if (!plan) throw new Error('Checkout plan is missing.');
  if (!Object.hasOwn(config.plans, plan)) throw new Error('Unexpected checkout plan.');
  return plan;
}
function verifySessionKind(session: Stripe.Checkout.Session): void {
  if (session.mode !== 'subscription') throw new Error('Unexpected checkout mode.');
  if (session.status !== 'open') throw new Error('Unexpected checkout state.');
}
function sessionPlanId(session: Stripe.Checkout.Session): string | undefined { return session.metadata?.plan_id; }
async function pendingCheckout(stripe: Stripe, account: Account, planId: string, config: Config): Promise<string | undefined> {
  const sessions = await stripe.checkout.sessions.list({ customer: account.stripeCustomerId!, status: 'open', limit: 100 });
  if (sessions.has_more) throw new Error('Checkout pagination requires reconciliation.');
  const plans = sessions.data.map((session) => verifyOpenSession(session, account, config));
  if (plans.some((plan) => plan !== planId)) throw new BillingConflict('Finish the existing checkout before choosing another plan.');
  return openSessionURL(sessions.data);
}
function openSessionURL(sessions: Stripe.Checkout.Session[]): string | undefined {
  if (!sessions.length) return undefined;
  const session = sessions[0];
  verifySessionExpiration(session);
  return providerURL(requireValue(session.url ?? undefined), 'checkout.stripe.com');
}
function verifySessionExpiration(session: Stripe.Checkout.Session): void {
  if (!Number.isSafeInteger(session.expires_at)) throw new Error('Invalid checkout expiration.');
  if (session.expires_at * 1000 <= Date.now()) throw new BillingConflict('The existing checkout is expiring. Try again shortly.');
}
export async function createCheckout(stripe: Stripe, account: Account, planId: string, idempotencyKey: string, store: Store, config: Config): Promise<string> {
  const plan = config.plans[planId];
  if (!plan) throw new Error('Unknown billing plan.');
  const customer = await stripeCustomer(stripe, account, store, config);
  const owner = { ...account, stripeCustomerId: customer };
  await requireNewSubscription(stripe, owner, config);
  const pending = await pendingCheckout(stripe, owner, planId, config);
  if (pending) return pending;
  const operation = await digest(account.userId + ':' + idempotencyKey);
  const result = await stripe.checkout.sessions.create({
    mode: 'subscription', customer,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    client_reference_id: account.userId,
    metadata: { app_user_id: account.userId, plan_id: planId },
    subscription_data: { metadata: { app_user_id: account.userId, plan_id: planId } },
    success_url: config.origin + '/billing?result=success',
    cancel_url: config.origin + '/billing?result=cancelled',
    integration_identifier: 'anhedral_' + operation.slice(0, 8).split('').map((character) => String.fromCharCode(97 + Number.parseInt(character, 16))).join(''),
  }, { idempotencyKey: 'anhedral-checkout-' + operation });
  return providerURL(requireValue(result.url ?? undefined), 'checkout.stripe.com');
}
function providerURL(value: string, hostname: string): string {
  const url = new URL(value);
  if ([url.protocol !== 'https:', url.hostname !== hostname, url.username, url.password].some(Boolean)) throw new Error('Unexpected billing provider URL.');
  return url.href;
}
export async function createPortal(stripe: Stripe, account: Account, config: Config): Promise<string> {
  if (!account.stripeCustomerId) throw new Error('No web billing subscription for this account.');
  await verifyCustomer(stripe, account.stripeCustomerId, account.userId, config);
  const portal = await stripe.billingPortal.sessions.create({ customer: account.stripeCustomerId, return_url: config.origin + '/billing' });
  return providerURL(portal.url, 'billing.stripe.com');
}
export async function stripeEventCustomer(stripe: Stripe, event: Stripe.Event): Promise<string | undefined> {
  const object = event.data.object as unknown as Record<string, unknown>;
  const customer = objectId(object.customer);
  if (customer) return customer;
  const charge = objectId(object.charge);
  if (!charge) return undefined;
  return objectId((await stripe.charges.retrieve(charge)).customer);
}

const purchase = z.object({ is_sandbox: z.boolean(), store: z.string(), expires_date: z.string().nullable().optional(), grace_period_expires_date: z.string().nullable().optional() });
const rcSchema = z.object({ subscriber: z.object({
  entitlements: z.record(z.string(), z.object({ product_identifier: z.string(), expires_date: z.string().nullable(), grace_period_expires_date: z.string().nullable().optional() })),
  subscriptions: z.record(z.string(), purchase),
  non_subscriptions: z.record(z.string(), z.array(purchase)).optional(),
}) });
type Subscriber = z.infer<typeof rcSchema>['subscriber'];
type Purchase = z.infer<typeof purchase>;
function matchesPurchase(value: Purchase, config: Config, stripeEnabled: boolean): boolean {
  if (value.is_sandbox !== (config.environment === 'sandbox')) return false;
  return !(stripeEnabled && value.store === 'stripe');
}
function receiptForProduct(subscriber: Subscriber, productId: string, config: Config, stripeEnabled: boolean): Purchase | undefined {
  const candidates = [subscriber.subscriptions[productId], ...(subscriber.non_subscriptions?.[productId] ?? [])].filter((value): value is Purchase => Boolean(value));
  return candidates.find((value) => matchesPurchase(value, config, stripeEnabled));
}
function expires(value: string | null | undefined): number | null {
  if (value === null) return null;
  const parsed = Date.parse(value ?? '');
  if (!Number.isFinite(parsed)) throw new Error('Invalid provider entitlement expiry.');
  return parsed;
}
function revenueCatGrant(key: string, subscriber: Subscriber, config: Config, stripeEnabled: boolean): Grant[] {
  const entitlement = subscriber.entitlements[key];
  if (!entitlement) return [];
  const receipt = receiptForProduct(subscriber, entitlement.product_identifier, config, stripeEnabled);
  if (!receipt) return [];
  const expiry = entitlementExpiry(entitlement);
  if (!validExpiry(expiry)) return [];
  return [{ key, expiresAt: expiry, source: 'revenuecat' }];
}
function entitlementExpiry(entitlement: { expires_date: string | null; grace_period_expires_date?: string | null }): number | null {
  return expires(entitlement.grace_period_expires_date ?? entitlement.expires_date);
}
function validExpiry(expiry: number | null): boolean { return expiry === null || expiry > Date.now(); }
function requireRevenueCatScope(config: Config): void {
  if (!config.projectId) throw new Error('Configure the RevenueCat project.');
  if (!config.appIds.length) throw new Error('Configure the RevenueCat app allowlist.');
}
export async function revenueCatGrants(userId: string, env: BillingEnv, config: Config, stripeEnabled: boolean): Promise<Grant[]> {
  requireRevenueCatScope(config);
  const response = await fetch('https://api.revenuecat.com/v1/subscribers/' + encodeURIComponent(userId), {
    headers: { authorization: 'Bearer ' + requireValue(env.REVENUECAT_SECRET_KEY), accept: 'application/json' },
    signal: AbortSignal.timeout(timeout), redirect: 'error',
  });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error('RevenueCat reconciliation failed.');
  const { subscriber } = rcSchema.parse(await response.json());
  return config.entitlements.flatMap((key) => revenueCatGrant(key, subscriber, config, stripeEnabled));
}
`;
