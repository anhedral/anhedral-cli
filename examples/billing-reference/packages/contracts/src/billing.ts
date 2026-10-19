import { z } from 'zod';
import { createHttpClient, type HttpOptions } from './http';

export const billingIdentitySchema = z.object({
  appUserId: z.string(),
  providers: z.object({ stripe: z.boolean(), revenuecat: z.boolean() }),
  plans: z.array(z.object({ id: z.string(), label: z.string() })),
});
export const billingEntitlementsSchema = z.object({
  entitlements: z.array(z.object({ key: z.string(), active: z.boolean(), expiresAt: z.string().nullable(), sources: z.array(z.enum(['stripe', 'revenuecat'])) })),
  checkedAt: z.string(),
});
export const billingUrlSchema = z.object({ url: z.url().refine((value) => new URL(value).protocol === 'https:', 'Billing navigation requires HTTPS.') });
export type BillingIdentity = z.infer<typeof billingIdentitySchema>;
export type BillingEntitlements = z.infer<typeof billingEntitlementsSchema>;
export function createBillingClient(baseURL = '/api/billing', options: HttpOptions = {}) {
  const request = createHttpClient(baseURL, options);
  function post<T>(route: string, schema: z.ZodType<T>, body: unknown, headers: HeadersInit = {}) {
    const combined = new Headers(headers);
    combined.set('content-type', 'application/json');
    return request(route, schema, { method: 'POST', body: JSON.stringify(body), headers: combined });
  }
  return {
    identity: () => request('/identity', billingIdentitySchema),
    entitlements: () => request('/entitlements', billingEntitlementsSchema),
    refresh: () => post('/refresh', billingEntitlementsSchema, {}),
    checkout: (plan: string, idempotencyKey: string) => {
      const body = z.strictObject({ plan: z.string().min(1) }).parse({ plan });
      const key = z.uuid().parse(idempotencyKey);
      return post('/checkout', billingUrlSchema, body, { 'idempotency-key': key });
    },
    portal: () => post('/portal', billingUrlSchema, {}),
  };
}
