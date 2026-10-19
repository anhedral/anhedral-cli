import type { StandardProduct } from './types.js';

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
  if (!['minimal', 'full-product'].includes(name))
    throw new Error('preset must be minimal or full-product.');
  if (name === 'minimal') return;
  // Explicit provider/frontend choices replace the preset's corresponding default.
  for (const id of FULL_PRODUCT) {
    if (id === 'expo' && (selected.has('next') || selected.has('vinext'))) continue;
    if (id === 'd1' && (selected.has('neon') || selected.has('neon-realtime'))) continue;
    if (id === 'better-auth' && selected.has('clerk')) continue;
    selected.add(id);
  }
}
