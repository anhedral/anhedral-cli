import { existsSync, readFileSync } from 'node:fs';
import { scaffoldContracts } from './backend.js';
import path from 'node:path';
import { put } from './files.js';

/** Public billing transport exposes verified identity and entitlements, never provider secrets. */
export function scaffoldBillingContracts(root: string): void {
  if (!existsSync(path.join(root, 'packages/contracts/src/http.ts'))) scaffoldContracts(root);
  put(
    root,
    'packages/contracts/src/billing.ts',
    `import { z } from 'zod';
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
`,
  );
  const file = 'packages/contracts/src/index.ts';
  const source = readFileSync(path.join(root, file), 'utf8');
  if (!source.includes("export * from './billing'"))
    put(root, file, source + "\nexport * from './billing';\n");
}
