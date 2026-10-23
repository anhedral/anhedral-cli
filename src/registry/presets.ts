import type { StandardProduct } from './types.js';

/** The managed portal profile deliberately excludes vendor credentials and unrelated services. */
export const PORTAL_FULL_STACK: readonly StandardProduct[] = Object.freeze([
  'anhedral-ui',
  'expo',
  'hono',
  'd1',
  'r2',
  'better-auth',
  'managed-email',
]);

/** A compatible product selection, not mutually exclusive catalog alternatives. */
export const FULL_PRODUCT: readonly StandardProduct[] = Object.freeze([
  'expo',
  'hono',
  'wxt',
  'd1',
  'better-auth',
  'r2',
  'kv',
  'stripe',
  'revenuecat',
  'workers-ai',
  'analytics-engine',
  'basin',
  'realtime',
  'realtimekit',
  'images',
  'stream',
  'video',
  'queues',
  'cron',
  'workflows',
  'resend',
  'sentry',
]);

export function applyPreset(name: string, selected: Set<StandardProduct>): void {
  if (!['minimal', 'full-product', 'portal-full-stack'].includes(name))
    throw new Error('preset must be minimal, full-product or portal-full-stack.');
  if (name === 'minimal') return;
  if (name === 'portal-full-stack') {
    if (
      ['next', 'vinext', 'neon', 'neon-realtime', 'clerk', 'resend'].some((id) =>
        selected.has(id as StandardProduct),
      )
    )
      throw new Error(
        'portal-full-stack requires Expo, Hono, D1, private R2 and Better Auth with managed email.',
      );
    for (const id of PORTAL_FULL_STACK) selected.add(id);
    return;
  }
  // Explicit provider/frontend choices replace the preset's corresponding default.
  for (const id of FULL_PRODUCT) {
    if (id === 'expo' && (selected.has('next') || selected.has('vinext'))) continue;
    if (id === 'd1' && (selected.has('neon') || selected.has('neon-realtime'))) continue;
    if (id === 'better-auth' && selected.has('clerk')) continue;
    selected.add(id);
  }
}
