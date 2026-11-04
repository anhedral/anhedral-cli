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

/** The sole source composition, extended only by backend, storage and payments. */
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
