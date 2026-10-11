import { put } from './files.js';
import type { RecipeContext } from '../registry/types.js';

export function scaffoldPrivateFiles({ root, runtimeApp }: RecipeContext): void {
  put(
    root,
    `apps/${runtimeApp}/private-files.md`,
    '# Private files\n\nFILES is a private R2 Worker binding. Authenticate the request and enforce file-level product authorization before calling get/put/delete. No public buckets, R2 keys, generic download endpoints, or client credentials are generated. Use the binding directly in Hono or import env from cloudflare:workers in Vinext; explicit OpenNext uses getCloudflareContext.\n',
  );
}
export function scaffoldRevenueCat({ root }: RecipeContext): void {
  put(
    root,
    'packages/billing/revenuecat.md',
    '# RevenueCat + Stripe\n\nConfigure web/App Store/Play Store products and offerings in client-owned accounts. Add the platform SDK to each selected app. Verify signed provider webhooks, reconcile entitlement authority, and keep transactional idempotent credits/quotas separate from subscription status. No payment activation occurs during init.\n',
  );
}
