import { scaffoldStyling } from './scaffold/styling.js';
import { resourceName } from './render.js';
import { dependencyOrder } from './dependency-order.js';
import { GENERATOR_VERSION } from './version.js';
import { scaffoldApi } from './scaffold/api.js';
import { scaffoldDatabase } from './scaffold/database.js';
import { scaffoldWeb } from './platforms/web.js';
import { scaffoldExpo } from './platforms/mobile.js';
import { scaffoldPrivateStorage } from './scaffold/storage.js';
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
  next: {
    type: 'application',
    description: 'Full Next.js App Router web application on Cloudflare OpenNext',
    targets: ['apps/web'],
    registryDependencies: ['workspace', 'typescript', 'eslint', 'styling', 'hono'],
    setup: requirements(
      'Server-rendered web application',
      ['Browser control', 'Wrangler'],
      ['Cloudflare Workers deployment access'],
      [],
      ['Next.js Worker, assets and scoped ANHEDRAL_API binding'],
      ['Request-rendered HTML, RSC, API transport'],
    ),
    install: scaffoldWeb,
    environment: ['API_INTERNAL_URL', 'ANHEDRAL_PREVIEW_ORIGIN'],
  },
  expo: {
    type: 'application',
    description: 'Native Expo iOS and Android application with Anhedral native shadcn UI',
    targets: ['apps/mobile', 'packages/native-ui'],
    registryDependencies: ['workspace', 'typescript', 'eslint', 'styling'],
    setup: requirements(
      'Native iOS and Android application',
      ['Simulator or device'],
      ['For requested native distribution only: client-owned Apple/Google developer accounts'],
      ['For requested native builds only: platform signing credentials and EAS access when used'],
      ['Expo native client; signing and store configuration'],
      ['Simulator/device and signed-build acceptance'],
    ),
    install: scaffoldExpo,
    environment: ['EXPO_PUBLIC_API_URL'],
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
      ['Health contract and application-owned authorization'],
    ),
    install: scaffoldApi,
  },
  d1: {
    type: 'package',
    description: 'Reusable Drizzle D1 database package and explicit migration tooling',
    targets: ['packages/db', 'apps/api'],
    selection: {},
    registryDependencies: ['workspace', 'typescript', 'eslint', 'hono'],
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
  },
  r2: {
    type: 'integration',
    description: 'Server-only private R2 storage foundation',
    targets: ['apps/api/src/private-storage.ts'],
    registryDependencies: ['workspace', 'typescript', 'eslint', 'hono'],
    setup: requirements(
      'Private remote files',
      ['Wrangler'],
      ['Cloudflare R2 bucket/binding access'],
      [],
      ['Private R2 bucket and FILES binding; no public object routes'],
      [
        'Keep public access disabled; implement application authorization before adding object routes',
      ],
    ),
    install: scaffoldPrivateStorage,
    configure: ({ options }) => ({
      r2_buckets: [{ binding: 'FILES', bucket_name: resourceName(options.name, 'private-files') }],
    }),
    runtime: 'worker',
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
      ['Shared light/dark tokens, web CSS and Anhedral native shadcn port'],
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
  const { install: _install, configure: _configure, ...metadata } = definition;
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
