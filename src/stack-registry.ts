import { scaffoldStyling } from './scaffold/styling.js';
import { resourceName } from './render.js';
import { dependencyOrder } from './dependency-order.js';
import { GENERATOR_VERSION } from './version.js';
import { scaffoldApi } from './scaffold/api.js';
import { scaffoldDatabase } from './scaffold/database.js';
import { scaffoldBetterAuth } from './scaffold/auth.js';
import { scaffoldExpo } from './platforms/mobile.js';
import {
  scaffoldPrivateFiles,
  scaffoldStripe,
  scaffoldRevenueCat,
} from './scaffold/integrations.js';
import { sharedPackage } from './scaffold/files.js';
import type {
  ItemDefinition,
  StackRegistryItem,
  SetupRequirements,
  PackageRecipe,
  RecipeContext,
} from './registry/types.js';

function requirements(
  purpose: string,
  tools: string[],
  access: string[],
  credentials: string[],
  resources: string[],
  verify: string[],
): SetupRequirements {
  return { purpose, tools, access, credentials, resources, verify };
}

function billingDependencies({ has }: RecipeContext): string[] {
  return ['hono', 'd1', 'better-auth', ...(has('expo') ? ['expo'] : [])];
}

const BILLING_ENVIRONMENT_KEYS = [
  'BILLING_ORIGIN',
  'BILLING_ENVIRONMENT',
  'BILLING_PLANS_JSON',
  'BILLING_ENTITLEMENTS_JSON',
  'BILLING_PREMIUM_ENTITLEMENT',
];
function packageSource(
  name: string,
  source: string,
  dependencies: Record<string, string>,
): PackageRecipe {
  return { name, source, dependencies };
}
type ItemConfiguration = Pick<ItemDefinition, 'type' | 'description' | 'targets'> &
  Partial<Omit<ItemDefinition, 'name' | 'version' | 'type' | 'description' | 'targets'>>;
function defineItems<T extends Record<string, ItemConfiguration>>(
  configurations: T,
): { [Key in keyof T]: ItemDefinition } {
  return Object.fromEntries(
    Object.entries(configurations).map(([name, configuration]) => [
      name,
      {
        name,
        version: GENERATOR_VERSION,
        selection: {},
        registryDependencies: ['workspace', 'typescript', 'eslint'],
        environment: [],
        installer: configuration.type === 'foundation' ? 'bootstrap' : 'recipe',
        ...configuration,
      },
    ]),
  ) as { [Key in keyof T]: ItemDefinition };
}

/** Every product owns its source recipe, setup requirements and composition policy here. */
const PRODUCT_ITEMS = defineItems({
  expo: {
    type: 'application',
    description: 'Universal Expo web, iOS and Android client with a Cloudflare asset/API gateway',
    targets: ['apps/mobile'],
    registryDependencies: ['workspace', 'typescript', 'eslint', 'styling'],
    setup: requirements(
      'Universal web, iOS and Android application',
      ['Browser control', 'Wrangler'],
      ['For requested native distribution only: client-owned Apple/Google developer accounts'],
      ['For requested native builds only: platform signing credentials and EAS access when used'],
      [
        'Expo universal client, Cloudflare web assets/API gateway; native adapters, signing and store configuration',
      ],
      [
        'Static web export/runtime; requested native delivery additionally needs simulator/device and signed-build acceptance',
      ],
    ),
    install: scaffoldExpo,
    environment: [],
    resolveEnvironment: ({ has }) => (has('hono') ? ['EXPO_PUBLIC_API_URL'] : []),
  },
  hono: {
    type: 'application',
    description: 'Shared Hono OpenAPI Worker',
    targets: ['apps/api'],
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Shared OpenAPI backend',
      ['Wrangler'],
      ['Cloudflare Workers deployment access'],
      [],
      ['API Worker; application routes and authorization'],
      ['Contract validation, unauthenticated rejection and resource ownership'],
    ),
    install: scaffoldApi,
  },
  d1: {
    type: 'package',
    description: 'Reusable Drizzle D1 database package and explicit migration tooling',
    targets: ['packages/db'],
    selection: {},
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'SQLite-compatible hosted persistence',
      ['Wrangler'],
      ['Cloudflare D1 access'],
      [],
      ['D1 database, DB binding and reviewed migrations'],
      ['Migration, constraints, transactional behavior and runtime queries'],
    ),
    install: scaffoldDatabase,
    configure: ({ options }) => ({
      d1_databases: [
        {
          binding: 'DB',
          database_name: resourceName(options.name, 'db'),
          database_id: 'REPLACE_WITH_D1_ID',
          migrations_dir: '../../packages/db/drizzle',
        },
      ],
    }),
    runtime: 'worker',
    resolveDependencies: () => ['hono'],
    resolveTargets: ({ runtimeApp }) => ['packages/db', `apps/${runtimeApp}`],
  },
  'better-auth': {
    type: 'integration',
    description: 'Database-backed identity schema and runtime routes',
    targets: ['packages/auth', 'packages/db', 'apps/web', 'apps/api'],
    selection: { requiresAll: ['d1', 'hono', 'expo'] },
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Application-managed identity',
      ['Selected database tooling'],
      ['Selected database migration/runtime access'],
      ['BETTER_AUTH_SECRET; BETTER_AUTH_URL'],
      ['D1 database, auth schema, trusted origins and application routes'],
      ['Sign-in/out, session expiry, sign-up policy and resource authorization'],
    ),
    install: scaffoldBetterAuth,
    fallbackDependency: 'd1',
    environment: ['BETTER_AUTH_SECRET', 'BETTER_AUTH_URL'],
    runtime: 'server',
    resolveDependencies: ({ has }) => ['d1', ...(has('expo') ? ['expo'] : [])],
    resolveTargets: ({ runtimeApp, has }) => [
      'packages/auth',
      'packages/db',
      `apps/${runtimeApp}`,
      ...(has('expo') ? ['apps/mobile'] : []),
    ],
  },
  r2: {
    type: 'integration',
    description: 'Private authenticated file upload, download and deletion',
    targets: ['apps/web', 'apps/api'],
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Private remote files',
      ['Wrangler'],
      ['Cloudflare R2 bucket/binding access'],
      [],
      ['Private R2 bucket and FILES binding; authorized upload/download endpoints'],
      [
        'Public bucket access disabled; file ownership enforced; clients receive no storage credentials',
      ],
    ),
    install: scaffoldPrivateFiles,
    configure: ({ options }) => ({
      r2_buckets: [{ binding: 'FILES', bucket_name: resourceName(options.name, 'private-files') }],
    }),
    runtime: 'worker',
    resolveDependencies: () => ['better-auth', 'hono'],
    resolveTargets: () => ['apps/api/src/private-files.ts'],
  },
  stripe: {
    type: 'integration',
    description: 'Authenticated Stripe checkout, portal and server entitlement projection',
    targets: ['packages/billing', 'packages/contracts', 'apps/api'],
    selection: { requiresAll: ['hono', 'better-auth', 'd1'] },
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    resolveDependencies: billingDependencies,
    resolveTargets: ({ has }) => [
      'packages/billing',
      'packages/contracts',
      'apps/api',
      ...(has('expo') ? ['apps/mobile'] : []),
    ],
    setup: requirements(
      'Web payments and subscriptions',
      ['Stripe integration or CLI'],
      ['Client-owned Stripe account; test/live access as required'],
      ['STRIPE_SECRET_KEY; STRIPE_WEBHOOK_SECRET'],
      ['Products/prices, signed webhooks and entitlement implementation'],
      ['Test purchase/cancellation, webhook replay and transactional idempotency'],
    ),
    install: scaffoldStripe,
    environment: [...BILLING_ENVIRONMENT_KEYS, 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  },
  revenuecat: {
    type: 'integration',
    description: 'Native purchases, restore and server-enforced cross-store entitlements',
    targets: ['packages/billing', 'packages/contracts', 'apps/api'],
    selection: { requiresAll: ['hono', 'better-auth', 'd1'] },
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    resolveDependencies: billingDependencies,
    resolveTargets: ({ has }) => [
      'packages/billing',
      'packages/contracts',
      'apps/api',
      ...(has('expo') ? ['apps/mobile'] : []),
    ],
    setup: requirements(
      'Cross-store subscription entitlements; Stripe is optional',
      ['RevenueCat integration or API', 'Selected mobile store tooling'],
      ['RevenueCat project; App Store/Play Store product access'],
      ['Platform public SDK keys; server API/webhook credentials as required'],
      [
        'Native purchase SDK and authenticated entitlement APIs; configure offerings/store products before acceptance',
      ],
      ['Sandbox purchase/restore, verified webhooks and entitlement reconciliation'],
    ),
    install: scaffoldRevenueCat,
    environment: [
      ...BILLING_ENVIRONMENT_KEYS,
      'REVENUECAT_SECRET_KEY',
      'REVENUECAT_WEBHOOK_AUTHORIZATION',
      'REVENUECAT_WEBHOOK_SIGNING_SECRET',
      'REVENUECAT_APP_IDS_JSON',
      'REVENUECAT_PROJECT_ID',
      'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY',
      'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY',
    ],
  },
  styling: {
    type: 'package',
    description: 'Shared platform-independent styling tokens',
    targets: ['packages/styling'],
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Shared styling definitions',
      [],
      [],
      [],
      [
        'Shared light/dark tokens and Tailwind v3 preset for Expo; adapt platform typography and components',
      ],
      ['Consistency across selected interfaces; preserve platform-specific components'],
    ),
    package: packageSource(
      'styling',
      `import { light, dark, spacing } from './tokens.cjs';

export const styling = {
  colors: {
    foreground: 'hsl(' + light['--foreground'] + ')',
    background: 'hsl(' + light['--background'] + ')',
  },
  spacing,
  themes: { light, dark },
};
`,
      {},
    ),
    install: scaffoldStyling,
  },
});

export type StandardProduct = keyof typeof PRODUCT_ITEMS;
export const STANDARD_PRODUCTS = Object.freeze(Object.keys(PRODUCT_ITEMS) as StandardProduct[]);
const FOUNDATION_ITEMS = defineItems({
  workspace: {
    type: 'foundation',
    description: 'pnpm workspace with one root lockfile, pinned Turborepo and shared checks',
    targets: ['package.json', 'pnpm-workspace.yaml', 'turbo.json'],
    registryDependencies: [],
  },
  typescript: {
    type: 'foundation',
    description: 'Shared TypeScript configuration',
    targets: ['packages/typescript-config'],
    registryDependencies: ['workspace'],
  },
  eslint: {
    type: 'foundation',
    description: 'Shared ESLint configuration',
    targets: ['packages/eslint-config'],
    registryDependencies: ['workspace'],
  },
});
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
const DEFINITIONS = freeze({ ...FOUNDATION_ITEMS, ...PRODUCT_ITEMS });
export type StackItemId = keyof typeof DEFINITIONS;

function describe(definition: ItemDefinition): StackRegistryItem {
  const {
    install: _install,
    configure: _configure,
    resolveTargets: _targets,
    resolveEnvironment: _environment,
    resolveDependencies: _dependencies,
    resolvePackage: _package,
    fallbackDependency: _fallback,
    ...metadata
  } = definition;
  return structuredClone(metadata);
}
export function getStackDefinition(name: string): ItemDefinition {
  if (!Object.hasOwn(DEFINITIONS, name)) throw new Error(`Unknown stack registry item: ${name}.`);
  return DEFINITIONS[name as StackItemId];
}
export function getStackItem(name: string): StackRegistryItem {
  return describe(getStackDefinition(name));
}
export const STACK_ITEMS = freeze(
  Object.fromEntries(Object.keys(DEFINITIONS).map((name) => [name, getStackItem(name)])) as Record<
    StackItemId,
    StackRegistryItem
  >,
);
export const STACK_REGISTRY = freeze({
  schemaVersion: 1,
  name: 'anhedral',
  cliVersion: GENERATOR_VERSION,
  items: Object.values(STACK_ITEMS),
});

export function installStackItem(
  item: StackRegistryItem,
  context: RecipeContext,
): void | Promise<void> {
  const definition = getStackDefinition(item.name);
  if (item.package) {
    const recipe = item.package;
    sharedPackage(context.root, recipe.name, recipe.source, recipe.dependencies);
  }
  return definition.install?.(context);
}

/** Validate authored definitions during build, before shipping either catalog. */
export function validateStackCatalog(): void {
  dependencyOrder(
    new Map(Object.entries(DEFINITIONS).map(([name, item]) => [name, item.registryDependencies])),
    'Authored stack registry',
  );
  for (const [name, definition] of Object.entries(DEFINITIONS)) {
    if (definition.name !== name) throw new Error(`Registry identity mismatch: ${name}.`);
    for (const dependency of [
      ...definition.registryDependencies,
      ...(definition.selection.conflicts ?? []),
      ...(definition.selection.requiresAny ?? []),
      ...(definition.selection.requiresAll ?? []),
    ])
      getStackDefinition(dependency);
    if (
      definition.type !== 'foundation' &&
      (!definition.setup ||
        (definition.installer === 'recipe' && !definition.install && !definition.package))
    )
      throw new Error(`Incomplete registry recipe: ${name}.`);
    if (definition.installer === 'configuration' && !definition.configure)
      throw new Error(`Missing registry configuration: ${name}.`);
    for (const target of definition.targets) {
      if (
        !target ||
        target.startsWith('/') ||
        target.includes('\\') ||
        target.split('/').some((part) => part === '..')
      )
        throw new Error(`Invalid registry target: ${name}.`);
    }
    if (definition.environment.some((key) => !/^[A-Z][A-Z0-9_]*$/.test(key)))
      throw new Error(`Invalid registry environment key: ${name}.`);
  }
}
