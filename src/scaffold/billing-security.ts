export const BILLING_SECURITY = `import { z } from 'zod';
import { equalSecret, requireValue, type BillingEnv, type Config } from './config';

export const stripeEventTypes = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed', 'charge.refunded', 'charge.dispute.created']);
export const rcEventSchema = z.object({ event: z.object({
  id: z.string().min(1).max(200),
  app_id: z.string(), environment: z.enum(['SANDBOX', 'PRODUCTION']),
  project_id: z.string().optional(),
  app_user_id: z.string().max(1500).optional(),
  original_app_user_id: z.string().max(1500).optional(),
  aliases: z.array(z.string().max(1500)).max(50).optional(),
  transferred_from: z.array(z.string().max(1500)).max(50).optional(),
  transferred_to: z.array(z.string().max(1500)).max(50).optional(),
}) });
export type RevenueCatEvent = z.infer<typeof rcEventSchema>['event'];

function verifyRevenueCatApp(event: RevenueCatEvent, config: Config): void {
  if (!config.projectId) throw new Error('Configure the RevenueCat project.');
  if (!config.appIds.includes(event.app_id)) throw new Error('Unexpected RevenueCat app.');
}
export function verifyRevenueCatScope(event: RevenueCatEvent, config: Config): void {
  verifyRevenueCatApp(event, config);
  if (event.project_id && event.project_id !== config.projectId) throw new Error('Unexpected RevenueCat project.');
  if (event.environment.toLowerCase() !== config.environment) throw new Error('Unexpected billing environment.');
}
export function revenueCatUsers(event: RevenueCatEvent): string[] {
  return [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? []), ...(event.transferred_from ?? []), ...(event.transferred_to ?? [])].filter((value): value is string => typeof value === 'string').slice(0, 50);
}
async function verifyHmac(raw: string, header: string, secret: string): Promise<boolean> {
  const match = /^t=([0-9]+),v1=([a-f0-9]{64})$/.exec(header);
  if (!match) return false;
  if (Math.abs(Date.now() / 1000 - Number(match[1])) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const signature = Uint8Array.from(match[2].match(/../g)!, (value) => Number.parseInt(value, 16));
  return crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(match[1] + '.' + raw));
}
async function verifyAuthorization(headers: Headers, env: BillingEnv): Promise<void> {
  const expected = requireValue(env.REVENUECAT_WEBHOOK_AUTHORIZATION);
  if (!await equalSecret(headers.get('authorization') ?? '', expected)) throw new Error('Invalid RevenueCat authorization.');
}
export async function verifyRevenueCat(raw: string, headers: Headers, env: BillingEnv): Promise<void> {
  await verifyAuthorization(headers, env);
  if (!env.REVENUECAT_WEBHOOK_SIGNING_SECRET) return;
  if (!await verifyHmac(raw, headers.get('X-RevenueCat-Webhook-Signature') ?? '', env.REVENUECAT_WEBHOOK_SIGNING_SECRET)) throw new Error('Invalid RevenueCat signature.');
}
`;
