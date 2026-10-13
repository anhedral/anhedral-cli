import { scaffoldStyling } from './scaffold/styling.js';
import { resourceName } from './render.js';
import { STACK_DEPENDENCIES } from './dependencies.js';
import { dependencyOrder } from './dependency-order.js';
import { GENERATOR_VERSION } from './version.js';
import { scaffoldWeb } from './scaffold/web.js';
import { scaffoldApi } from './scaffold/api.js';
import { scaffoldDatabase } from './scaffold/database.js';
import { scaffoldBetterAuth, scaffoldClerk } from './scaffold/auth.js';
import {
  scaffoldRealtime,
  scaffoldQueues,
  scaffoldCron,
  scaffoldWorkflows,
} from './scaffold/services.js';
import { scaffoldExpo } from './platforms/mobile.js';
import { scaffoldElectron } from './platforms/desktop.js';
import { scaffoldWxt } from './platforms/extension.js';
import { scaffoldPrivateFiles, scaffoldRevenueCat } from './scaffold/integrations.js';
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
  vinext: {
    type: 'application',
    description: 'Vinext web application on Cloudflare Workers',
    targets: ['apps/web'],
    selection: { conflicts: ['next'] },
    registryDependencies: ['ui'],
    setup: requirements(
      'Web application on Cloudflare',
      ['Browser control', 'Wrangler'],
      [],
      [],
      ['Vinext React application and Cloudflare Worker'],
      ['Web flows, accessibility, production Worker build and deployed preview'],
    ),
    install: scaffoldWeb,
  },
  next: {
    type: 'application',
    description: 'Next.js web application on Vercel or OpenNext on Workers',
    targets: ['apps/web'],
    selection: { conflicts: ['vinext'] },
    registryDependencies: ['ui'],
    setup: requirements(
      'Web application',
      ['Browser control'],
      [],
      [],
      ['Next.js app; configure the selected hosting provider'],
      ['Web flows, accessibility, production hosting build and deployed preview'],
    ),
    install: scaffoldWeb,
  },
  expo: {
    type: 'application',
    description: 'Expo mobile application with native UI',
    targets: ['apps/mobile'],
    registryDependencies: ['workspace', 'typescript', 'eslint', 'styling'],
    setup: requirements(
      'Mobile application',
      ['Expo/EAS CLI', 'Xcode or Android SDK'],
      ['Client-owned Apple/Google developer accounts for store delivery'],
      ['Platform signing credentials; EAS access when used'],
      ['Expo app; native adapters, signing, store configuration'],
      ['Native simulator/device flows and signed native build; web export alone is insufficient'],
    ),
    install: scaffoldExpo,
  },
  electron: {
    type: 'application',
    description: 'Electron desktop application with its own web UI',
    targets: ['apps/desktop'],
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Desktop application',
      ['Electron tooling', 'Platform packaging tools'],
      ['Signing/notarization account for the target platform'],
      ['Signing credentials; notarization credentials when required'],
      ['Electron app; packaging and distribution configuration'],
      ['Packaged desktop app, permissions, update/recovery behavior'],
    ),
    install: scaffoldElectron,
  },
  wxt: {
    type: 'application',
    description: 'WXT browser side-panel extension',
    targets: ['apps/extension'],
    registryDependencies: ['workspace', 'typescript', 'eslint', 'styling'],
    setup: requirements(
      'Chrome side-panel extension',
      ['Chrome', 'WXT'],
      ['Extension store publisher access for distribution'],
      ['Store publishing credentials when required'],
      ['Extension app; minimal browser permissions and store package'],
      ['Installed side panel, background/content messaging and permission behavior'],
    ),
    install: scaffoldWxt,
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
  neon: {
    type: 'package',
    description: 'Direct Neon HTTP and Drizzle PostgreSQL starter',
    targets: ['packages/db'],
    selection: { conflicts: ['d1'] },
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'PostgreSQL persistence through direct Neon HTTP and Drizzle',
      ['Neon integration or API'],
      ['Client-owned Neon project/branch access'],
      ['Server-side DATABASE_URL; separate environment roles'],
      ['Neon project/branches, database roles and reviewed migrations'],
      ['Migration, runtime connectivity and authorization; HTTP has no interactive transactions'],
    ),
    install: scaffoldDatabase,
    environment: ['DATABASE_URL'],
    runtime: 'server',
  },
  d1: {
    type: 'package',
    description: 'Drizzle D1 database and migration tooling',
    targets: ['packages/db'],
    selection: { conflicts: ['neon'] },
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
          migrations_dir: '../../packages/db/migrations',
        },
      ],
    }),
    runtime: 'worker',
  },
  'local-data': {
    type: 'package',
    description: 'Interface for platform-specific local persistence adapters',
    targets: ['packages/local-data'],
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Device-local SQLite and files',
      ['Selected platform database/filesystem tooling'],
      [],
      [],
      ['Integration boundary; implement platform adapters and explicit synchronization if needed'],
      ['Persistence, offline writes and recovery on the selected device'],
    ),
    package: packageSource(
      'local-data',
      `// Device-local SQLite and filesystem need platform-specific adapters.
export interface LocalDataStore {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
}
`,
      {},
    ),
  },
  clerk: {
    type: 'integration',
    description: 'Managed identity starter and runtime integration',
    targets: ['apps/web', 'packages/auth'],
    selection: { conflicts: ['better-auth'], requiresAny: ['vinext', 'next', 'hono'] },
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Managed identity',
      ['Clerk integration or dashboard'],
      ['Client-owned Clerk project access'],
      ['Clerk publishable key; server secret key; webhook secret when used'],
      ['Identity project, allowed URLs, SDK setup and protected routes'],
      ['Sign-in/out, session expiry, resource authorization and selected native client flows'],
    ),
    install: scaffoldClerk,
    environment: [
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_PUBLISHABLE_KEY',
      'CLERK_SECRET_KEY',
    ],
    resolveEnvironment: ({ has }) => [
      'CLERK_SECRET_KEY',
      ...(has('vinext') || has('next') ? ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] : []),
      ...(has('hono') ? ['CLERK_PUBLISHABLE_KEY'] : []),
    ],
    runtime: 'server',
    resolveDependencies: ({ has }) => ['vinext', 'next', 'hono'].filter((id) => has(id)),
    resolveTargets: ({ has }) => [
      ...(has('vinext') || has('next') ? ['apps/web'] : []),
      ...(has('hono') ? ['packages/auth'] : []),
    ],
  },
  'better-auth': {
    type: 'integration',
    description: 'Database-backed identity schema and runtime routes',
    targets: ['packages/auth', 'packages/db', 'apps/web', 'apps/api'],
    selection: { conflicts: ['clerk'], requiresAny: ['neon', 'd1'] },
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Application-managed identity',
      ['Selected database tooling'],
      ['Selected database migration/runtime access'],
      ['BETTER_AUTH_SECRET; BETTER_AUTH_URL'],
      ['Selected Neon or D1 database, auth schema, trusted origins and application routes'],
      ['Sign-in/out, session expiry, sign-up policy and resource authorization'],
    ),
    install: scaffoldBetterAuth,
    fallbackDependency: 'd1',
    environment: ['BETTER_AUTH_SECRET', 'BETTER_AUTH_URL'],
    runtime: 'server',
    resolveDependencies: ({ has }) => [has('neon') ? 'neon' : 'd1'],
    resolveTargets: ({ runtimeApp }) => ['packages/auth', 'packages/db', `apps/${runtimeApp}`],
  },
  r2: {
    type: 'integration',
    description: 'Private file binding and authorization guidance',
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
    resolveTargets: ({ runtimeApp }) => [`apps/${runtimeApp}/private-files.md`],
  },
  kv: {
    type: 'integration',
    description: 'Eventually consistent cache binding',
    targets: ['apps/web', 'apps/api'],
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Eventually consistent cache/configuration',
      ['Wrangler'],
      ['Cloudflare KV namespace access'],
      [],
      ['KV namespace and CONFIG binding'],
      ['TTL and propagation behavior; never use KV as transactional authority'],
    ),
    configure: () => ({ kv_namespaces: [{ binding: 'CONFIG', id: 'REPLACE_WITH_KV_ID' }] }),
    installer: 'configuration',
    runtime: 'worker',
    resolveTargets: ({ runtimeApp }) => [`apps/${runtimeApp}/wrangler.jsonc`],
  },
  realtime: {
    type: 'service',
    description: 'Durable Object room Worker with authorization boundary',
    targets: ['apps/realtime'],
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Rooms and collaboration',
      ['Wrangler', 'Browser control'],
      ['Cloudflare Durable Objects deployment access'],
      [],
      ['Realtime Worker, Durable Object namespace/migration and WebSocket authorization'],
      ['Authorized room isolation, disconnect/reconnect and deployed WebSockets'],
    ),
    install: scaffoldRealtime,
  },
  queues: {
    type: 'service',
    description: 'Queue producer binding, consumer and dead-letter handling',
    targets: ['apps/jobs', 'apps/web', 'apps/api'],
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Deferred jobs',
      ['Wrangler'],
      ['Cloudflare Queues configuration access'],
      [],
      ['Queue, producer/consumer bindings and failure handling'],
      ['Retries, idempotency, concurrency and dead-letter recovery'],
    ),
    install: scaffoldQueues,
    configure: ({ options }) => ({
      queues: { producers: [{ binding: 'JOBS', queue: resourceName(options.name, 'jobs') }] },
    }),
    runtime: 'optional-worker',
    resolveTargets: ({ runtimeApp, has }) => [
      'apps/jobs',
      ...(has('hono') || has('vinext') || has('next') ? [`apps/${runtimeApp}/wrangler.jsonc`] : []),
    ],
  },
  cron: {
    type: 'service',
    description: 'Scheduled Worker',
    targets: ['apps/scheduled'],
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Scheduled work',
      ['Wrangler'],
      ['Cloudflare Worker deployment access'],
      [],
      ['Scheduled Worker and environment-specific Cron Triggers'],
      ['Schedule, idempotency, failure visibility and overlapping runs'],
    ),
    install: scaffoldCron,
  },
  workflows: {
    type: 'service',
    description: 'Durable multi-step Worker',
    targets: ['apps/workflows'],
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Durable multi-step processing',
      ['Wrangler'],
      ['Cloudflare Workflows deployment access'],
      [],
      ['Workflow Worker/binding and resumable steps'],
      ['Retry/resume, idempotency, cancellation and failure recovery'],
    ),
    install: scaffoldWorkflows,
  },
  openai: {
    type: 'package',
    description: 'Server-side OpenAI SDK factory',
    targets: ['packages/ai'],
    selection: { conflicts: ['ai-sdk'] },
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Direct OpenAI integration',
      ['OpenAI integration or API'],
      ['Client-owned OpenAI project and model access'],
      ['OPENAI_API_KEY'],
      ['Server SDK factory; implement application behavior and spending limits'],
      ['Selected model, failure handling, private inputs and cost controls'],
    ),
    package: packageSource(
      'ai',
      "import OpenAI from 'openai';\nexport function createAI(apiKey: string) { return new OpenAI({ apiKey }); }\n",
      { openai: STACK_DEPENDENCIES['openai'] },
    ),
    environment: ['OPENAI_API_KEY'],
  },
  'ai-sdk': {
    type: 'package',
    description: 'Server-side AI SDK and provider exports',
    targets: ['packages/ai'],
    selection: { conflicts: ['openai'] },
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Streaming AI and provider abstraction',
      ['Selected AI provider integration or API'],
      ['Selected provider project/model access'],
      ['OPENAI_API_KEY for the generated default; selected provider credentials otherwise'],
      ['Server SDK factory; implement streaming, tools and application behavior'],
      ['Streaming, tool authorization, interruption and spending limits'],
    ),
    package: packageSource(
      'ai',
      "export { generateText, streamText } from 'ai';\nexport { createOpenAI } from '@ai-sdk/openai';\n",
      { ai: STACK_DEPENDENCIES['ai'], '@ai-sdk/openai': STACK_DEPENDENCIES['@ai-sdk/openai'] },
    ),
    environment: ['OPENAI_API_KEY'],
  },
  'workers-ai': {
    type: 'integration',
    description: 'Workers AI runtime binding',
    targets: ['apps/web', 'apps/api'],
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Cloudflare-hosted inference',
      ['Wrangler'],
      ['Cloudflare Workers AI model access'],
      [],
      ['AI binding and selected model invocation'],
      ['Supported model behavior, authorization and usage limits'],
    ),
    configure: () => ({ ai: { binding: 'AI' } }),
    installer: 'configuration',
    runtime: 'worker',
    resolveTargets: ({ runtimeApp }) => [`apps/${runtimeApp}/wrangler.jsonc`],
  },
  resend: {
    type: 'package',
    description: 'Server-side email SDK factory',
    targets: ['packages/email'],
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Outbound application email',
      ['Resend integration or API'],
      ['Client-owned Resend project; sending-domain DNS access'],
      ['RESEND_API_KEY; webhook secret when used'],
      ['Verified sending domain, sender and server integration'],
      [
        'Delivery, suppression/bounce handling and webhook verification; inbound routing is separate',
      ],
    ),
    package: packageSource(
      'email',
      "import { Resend } from 'resend';\nexport function createEmail(apiKey: string) { return new Resend(apiKey); }\n",
      { resend: STACK_DEPENDENCIES['resend'] },
    ),
    environment: ['RESEND_API_KEY'],
  },
  stripe: {
    type: 'package',
    description: 'Server-side billing SDK factory',
    targets: ['packages/billing'],
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Web payments and subscriptions',
      ['Stripe integration or CLI'],
      ['Client-owned Stripe account; test/live access as required'],
      ['STRIPE_SECRET_KEY; STRIPE_WEBHOOK_SECRET'],
      ['Products/prices, signed webhooks and entitlement implementation'],
      ['Test purchase/cancellation, webhook replay and transactional idempotency'],
    ),
    package: packageSource(
      'billing',
      "import Stripe from 'stripe';\nexport function createBilling(apiKey: string) { return new Stripe(apiKey); }\n",
      { stripe: STACK_DEPENDENCIES['stripe'] },
    ),
    environment: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  },
  revenuecat: {
    type: 'integration',
    description: 'Cross-store entitlement integration guidance',
    targets: ['packages/billing/revenuecat.md'],
    selection: { requiresAll: ['stripe'] },
    registryDependencies: ['stripe'],
    setup: requirements(
      'Cross-store subscription entitlements alongside Stripe',
      ['RevenueCat integration or API', 'Selected mobile store tooling'],
      ['RevenueCat project; App Store/Play Store product access'],
      ['Platform public SDK keys; server API/webhook credentials as required'],
      ['Integration guidance only; install platform SDKs and configure offerings/store products'],
      ['Sandbox purchase/restore, verified webhooks and entitlement reconciliation'],
    ),
    install: scaffoldRevenueCat,
    environment: ['EXPO_PUBLIC_REVENUECAT_IOS_API_KEY', 'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY'],
  },
  sentry: {
    type: 'package',
    description: 'Platform-specific monitoring integration boundary',
    targets: ['packages/observability'],
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Additional runtime/crash diagnostics',
      ['Sentry integration or API'],
      ['Client-owned Sentry project access'],
      ['SENTRY_DSN; source-map upload token when required'],
      ['Integration boundary; install/init runtime SDKs and configure private source-map uploads'],
      ['Captured runtime errors, source maps, privacy filtering and alert delivery'],
    ),
    package: packageSource(
      'observability',
      "// Initialize the platform-specific Sentry SDK in each application's runtime entrypoint.\nexport const redactFields = ['authorization', 'cookie', 'password', 'token'];\n",
      {},
    ),
    environment: ['SENTRY_DSN'],
  },
  basin: {
    type: 'package',
    description: 'Cloudflare analytical stream binding and event helper',
    targets: ['packages/analytics', 'packages/basin'],
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Cloudflare analytical events',
      ['Wrangler', 'Cloudflare integration or API'],
      [
        'Cloudflare analytics/Pipelines access; plan supporting selected services; Pipelines Setup grant for managed R2 sink setup',
      ],
      [],
      [
        'Basin dataset/stream, ANALYTICS binding, optional private R2 sink and authorized sink writes',
      ],
      ['Private ingestion, event delivery, query results and archive retrieval when selected'],
    ),
    package: packageSource(
      'analytics',
      `export interface EventStream { send(events: Record<string, unknown>[]): Promise<void> }
export async function recordEvents(stream: EventStream, events: Record<string, unknown>[]) {
  await stream.send(events);
}
`,
      {},
    ),
    resolvePackage: ({ has }, recipe) => ({
      ...recipe,
      name: has('posthog') ? 'basin' : 'analytics',
    }),
    resolveDependencies: ({ has }) => (has('posthog') ? ['posthog'] : []),
    resolveTargets: ({ has }) => [has('posthog') ? 'packages/basin' : 'packages/analytics'],
    configure: () => ({
      pipelines: [{ binding: 'ANALYTICS', stream: 'REPLACE_WITH_BASIN_STREAM_ID' }],
    }),
    runtime: 'worker',
  },
  posthog: {
    type: 'package',
    description: 'Server-side product analytics factory',
    targets: ['packages/analytics'],
    registryDependencies: ['workspace', 'typescript', 'eslint'],
    setup: requirements(
      'Specialized product analytics',
      ['PostHog integration or API'],
      ['Client-owned PostHog project access'],
      ['POSTHOG_API_KEY; POSTHOG_HOST; separate privileged key if needed'],
      ['Analytics client factory; implement consent, event schema and privacy filtering'],
      ['Event receipt, consent behavior and redaction of private data'],
    ),
    package: packageSource(
      'analytics',
      "import { PostHog } from 'posthog-node';\nexport function createAnalytics(apiKey: string, host: string) { return new PostHog(apiKey, { host }); }\n",
      { 'posthog-node': STACK_DEPENDENCIES['posthog-node'] },
    ),
    environment: ['POSTHOG_API_KEY', 'POSTHOG_HOST'],
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
        'Shared light/dark tokens and Tailwind v3 preset for Expo/WXT; adapt platform typography and components',
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
    description: 'pnpm and Turborepo workspace, task graph and shared checks',
    targets: ['package.json', 'pnpm-workspace.yaml', 'turbo.json', 'scripts/security'],
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
  ui: {
    type: 'foundation',
    description: 'Shared shadcn/ui, React, Tailwind and Lucide foundation for web apps',
    targets: ['packages/ui'],
    registryDependencies: ['workspace', 'typescript', 'eslint'],
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
