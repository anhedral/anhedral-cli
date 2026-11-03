export const CAPABILITIES = {
  hono: {
    name: 'Hono backend API',
    requires: [],
    targets: [
      'apps/api/package.json',
      'apps/api/wrangler.jsonc',
      'apps/api/src/index.ts',
      'apps/api/src/environment.ts',
      'apps/api/src/capabilities.ts',
      'apps/api/src/custom-environment.ts',
    ],
    configuration: ['ANHEDRAL_API service binding'],
  },
  'database-auth': {
    name: 'Drizzle / D1 / Better Auth',
    requires: ['hono'],
    targets: [
      'packages/db/package.json',
      'packages/db/src/index.ts',
      'packages/db/src/schema.ts',
      'apps/api/src/auth.ts',
      'apps/api/src/auth-features.ts',
      'apps/api/src/security.ts',
      'apps/api/src/auth-platform.ts',
      'apps/api/src/features/auth.ts',
      'apps/web/lib/auth-client.ts',
    ],
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
    targets: [
      'apps/api/src/features/stripe.ts',
      'apps/api/src/features/entitlements.ts',
      'apps/api/src/entitlement-guard.ts',
      'apps/api/src/billing-mode.ts',
      'apps/api/src/billing-providers.ts',
      'packages/db/src/billing-schema.ts',
    ],
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
    targets: ['apps/api/src/features/events.ts', 'packages/db/src/events-schema.ts'],
    configuration: ['event schema migration'],
  },
  rtc: {
    name: 'Realtime RTC',
    requires: ['database-auth'],
    targets: ['apps/api/src/features/rtc.ts', 'packages/db/src/rtc-schema.ts'],
    configuration: ['Cloudflare Realtime SFU app ID and secret'],
  },
  ai: {
    name: 'Workers AI',
    requires: ['database-auth'],
    targets: ['apps/api/src/features/ai.ts', 'packages/db/src/ai-schema.ts'],
    configuration: ['Workers AI binding', 'explicit model selection and daily quota'],
  },
  expo: {
    name: 'Expo mobile app',
    requires: ['database-auth'],
    targets: [
      'apps/mobile/package.json',
      'apps/mobile/App.tsx',
      'apps/mobile/anhedral-entry.tsx',
      'apps/mobile/lib/auth-client.ts',
      'apps/mobile/components/session-controls.tsx',
    ],
    configuration: [
      'device-reachable API URL',
      'trusted native origin',
      'native development build',
    ],
  },
  'native-ui': {
    name: 'Anhedral UI for Expo',
    requires: ['expo'],
    targets: [
      'apps/mobile/components.json',
      'apps/mobile/global.css',
      'apps/mobile/metro.config.js',
      'apps/mobile/components/ui/button.tsx',
      'apps/mobile/components/ui/text.tsx',
    ],
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
    targets: [
      'apps/extension/package.json',
      'apps/extension/wxt.config.ts',
      'apps/extension/anhedral-background.ts',
      'apps/extension/entrypoints/background.ts',
    ],
    configuration: ['API origin and host permissions', 'extension authentication flow'],
  },
  'side-panel': {
    name: 'Side Panel API',
    requires: ['wxt'],
    targets: [
      'apps/extension/entrypoints/sidepanel/index.html',
      'apps/extension/entrypoints/sidepanel/main.tsx',
    ],
    configuration: ['Chromium side panel validation'],
  },
  gpui: {
    name: 'GPUI native desktop app',
    requires: ['database-auth'],
    targets: ['apps/desktop/package.json', 'apps/desktop/Cargo.toml', 'apps/desktop/src/main.rs'],
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

/** The sole active public source composition. Legacy recipes above remain library compatibility. */
export const ANHEDRAL_STACK = {
  schemaVersion: 1,
  id: 'anhedral-stack',
  name: 'Anhedral Stack',
  foundation: {
    id: 'tanstack-start',
    name: 'TanStack Start + Anhedral UI',
    targets: [
      'apps/web/package.json',
      'apps/web/src/router.tsx',
      'apps/web/src/server.ts',
      'apps/web/src/routes/__root.tsx',
      'apps/web/src/routes/index.tsx',
    ],
  },
  additions: {
    backend: {
      name: 'Backend',
      description: 'API, database and authentication together.',
      requires: [] as string[],
      targets: [
        ...CAPABILITIES.hono.targets,
        ...CAPABILITIES['database-auth'].targets.map((target) =>
          target === 'apps/web/lib/auth-client.ts' ? 'apps/web/src/lib/auth-client.ts' : target,
        ),
      ],
    },
    r2: {
      name: 'Private storage',
      description: 'Authenticated, owner-scoped object storage.',
      requires: ['backend'],
      targets: [...CAPABILITIES.r2.targets],
    },
    stripe: {
      name: 'Payments and subscriptions',
      description: 'Stripe subscription and entitlement source.',
      requires: ['backend'],
      targets: [...CAPABILITIES.stripe.targets],
    },
  },
} as const;
export type PublicStackAddition = keyof typeof ANHEDRAL_STACK.additions;
export const PUBLIC_STACK_ADDITIONS = Object.keys(
  ANHEDRAL_STACK.additions,
) as PublicStackAddition[];
