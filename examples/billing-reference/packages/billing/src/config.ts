import { z } from 'zod';

export interface BillingEnv {
  BILLING_ORIGIN: string;
  BILLING_ENVIRONMENT: string;
  BILLING_PLANS_JSON?: string;
  BILLING_ENTITLEMENTS_JSON: string;
  BILLING_PREMIUM_ENTITLEMENT?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  REVENUECAT_SECRET_KEY?: string;
  REVENUECAT_WEBHOOK_AUTHORIZATION?: string;
  REVENUECAT_WEBHOOK_SIGNING_SECRET?: string;
  REVENUECAT_APP_IDS_JSON?: string;
  REVENUECAT_PROJECT_ID?: string;
}
const key = z.string().regex(/^[a-zA-Z0-9_.-]{1,100}$/);
const planSchema = z.object({ label: z.string().min(1).max(100), stripePriceId: z.string().regex(/^price_[a-zA-Z0-9]+$/), entitlement: key }).strict();
const plansSchema = z.record(key, planSchema);
export type Plan = z.infer<typeof planSchema>;
export interface Config {
  origin: string;
  environment: 'sandbox' | 'production';
  plans: Record<string, Plan>;
  entitlements: string[];
  appIds: string[];
  projectId: string;
  demoEntitlement: string;
}
function json(value: string | undefined, fallback: string): unknown {
  return JSON.parse(value ?? fallback);
}
function protocolAllowed(url: URL, environment: 'sandbox' | 'production'): boolean {
  if (url.protocol === 'https:') return true;
  if (environment !== 'sandbox') return false;
  return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}
function origin(value: string, environment: 'sandbox' | 'production'): string {
  const url = new URL(value);
  if (!protocolAllowed(url, environment)) throw new Error('Billing requires HTTPS; sandbox HTTP is loopback-only.');
  if ([url.username, url.password, url.pathname !== '/', url.search, url.hash].some(Boolean)) throw new Error('Billing requires an origin without credentials or a path.');
  return url.origin;
}
export function billingConfig(env: BillingEnv): Config {
  const environment = z.enum(['sandbox', 'production']).parse(env.BILLING_ENVIRONMENT);
  const plans = plansSchema.parse(json(env.BILLING_PLANS_JSON, '{}'));
  const entitlements = z.array(key).min(1).max(100).parse(json(env.BILLING_ENTITLEMENTS_JSON, '[]'));
  if (Object.values(plans).some((plan) => !entitlements.includes(plan.entitlement))) throw new Error('Every billing plan needs an allowed entitlement.');
  return {
    origin: origin(env.BILLING_ORIGIN, environment),
    environment,
    plans, entitlements,
    appIds: z.array(z.string().regex(/^app[a-zA-Z0-9_]+$/)).max(50).parse(json(env.REVENUECAT_APP_IDS_JSON, '[]')),
    projectId: env.REVENUECAT_PROJECT_ID ?? '',
    demoEntitlement: key.parse(env.BILLING_PREMIUM_ENTITLEMENT ?? 'premium'),
  };
}
export function requireValue(value: string | undefined): string {
  if (!value?.trim()) throw new Error('Billing provider configuration is incomplete.');
  return value;
}
export async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
export async function equalSecret(actual: string, expected: string): Promise<boolean> {
  // Fixed-length digests make comparison independent of secret length.
  const values = await Promise.all([digest(actual), digest(expected)]);
  let difference = 0;
  for (let index = 0; index < values[0].length; index++) difference |= values[0].charCodeAt(index) ^ values[1].charCodeAt(index);
  return difference === 0;
}
