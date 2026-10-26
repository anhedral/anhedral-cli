export const CAPABILITIES = {
  hono: {
    name: 'Hono backend API',
    requires: [],
    targets: ['apps/api'],
    configuration: ['ANHEDRAL_API service binding'],
  },
  'database-auth': {
    name: 'Drizzle / D1 / Better Auth',
    requires: ['hono'],
    targets: ['packages/db', 'apps/api/src/auth.ts'],
    configuration: [
      'D1 resource ID',
      'BETTER_AUTH_SECRET',
      'PUBLIC_APP_URL',
      'explicit auth methods',
      'reviewed migrations',
    ],
  },
  r2: {
    name: 'Private R2 storage',
    requires: ['database-auth'],
    targets: ['apps/api/src/features/storage.ts'],
    configuration: ['private R2 bucket and FILES binding'],
  },
  stripe: {
    name: 'Stripe payments',
    requires: ['database-auth'],
    targets: ['apps/api/src/features/stripe.ts'],
    configuration: [
      'Stripe test credentials',
      'allowed prices',
      'webhook endpoint',
      'billing schema migration',
    ],
  },
  realtime: {
    name: 'Realtime events',
    requires: ['database-auth'],
    targets: ['apps/api/src/features/events.ts'],
    configuration: ['event schema migration'],
  },
  rtc: {
    name: 'Realtime RTC',
    requires: ['database-auth'],
    targets: ['apps/api/src/features/rtc.ts'],
    configuration: ['Cloudflare Realtime SFU app ID and secret'],
  },
  ai: {
    name: 'Workers AI',
    requires: ['database-auth'],
    targets: ['apps/api/src/features/ai.ts'],
    configuration: ['Workers AI binding', 'explicit model selection and daily quota'],
  },
  expo: {
    name: 'Expo mobile app',
    requires: ['database-auth'],
    targets: ['apps/mobile'],
    configuration: [
      'device-reachable API URL',
      'trusted native origin',
      'native development build',
    ],
  },
  'native-ui': {
    name: 'Anhedral UI for Expo',
    requires: ['expo'],
    targets: ['apps/mobile/components.json'],
    configuration: ['Android/iOS interaction validation'],
  },
  revenuecat: {
    name: 'RevenueCat mobile subscriptions',
    requires: ['expo', 'stripe'],
    targets: ['apps/mobile/lib/purchases.ts', 'apps/api/src/features/revenuecat.ts'],
    configuration: [
      'RevenueCat app/project, public SDK keys and server credentials',
      'store sandbox validation',
    ],
  },
  wxt: {
    name: 'WXT browser extension',
    requires: ['database-auth'],
    targets: ['apps/extension'],
    configuration: ['API origin and host permissions', 'extension authentication flow'],
  },
  'side-panel': {
    name: 'Side Panel API',
    requires: ['wxt'],
    targets: ['apps/extension/entrypoints/sidepanel'],
    configuration: ['Chromium side panel validation'],
  },
  gpui: {
    name: 'GPUI native desktop app',
    requires: ['database-auth'],
    targets: ['apps/desktop'],
    configuration: [
      'Rust toolchain and native platform libraries',
      'native account flow and distribution',
    ],
  },
} as const;
export type Capability = keyof typeof CAPABILITIES;
export const CAPABILITY_IDS = Object.keys(CAPABILITIES) as Capability[];
export function capabilityOrder(
  requested: readonly string[],
  installed: readonly Capability[],
  includeDependencies: boolean,
): Capability[] {
  const selected = new Set<Capability>();
  function visit(name: string) {
    if (!Object.hasOwn(CAPABILITIES, name))
      throw Error(`Unknown capability: ${name}. Run anhedral stack list.`);
    const id = name as Capability;
    if (installed.includes(id) || selected.has(id)) return;
    for (const parent of CAPABILITIES[id].requires) {
      if (!installed.includes(parent) && !requested.includes(parent) && !includeDependencies)
        throw Error(
          `${id} requires ${parent}. Add it first or explicitly use --with-dependencies.`,
        );
      visit(parent);
    }
    selected.add(id);
  }
  for (const id of requested) visit(id);
  return [...selected];
}
