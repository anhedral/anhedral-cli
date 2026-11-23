import type { CapabilityEditor } from './editor.js';

export const CAPABILITIES = {
  web: {
    name: 'TanStack Start web app',
    requires: [],
    targets: ['apps/web/package.json', 'apps/web/src/server.ts', 'apps/web/src/routes/index.tsx'],
    configuration: [],
  },
  db: {
    name: 'Drizzle ORM and Neon Postgres',
    requires: ['hono'],
    targets: ['packages/db/package.json', 'packages/db/src/index.ts', 'packages/db/src/schema.ts'],
    configuration: [
      'DATABASE_URL (pooled Neon URL) and DATABASE_URL_UNPOOLED for reviewed migrations',
    ],
  },
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
    configuration: [],
  },
  'database-auth': {
    name: 'Better Auth',
    requires: ['db'],
    targets: [
      'apps/api/src/auth.ts',
      'apps/api/src/auth-features.ts',
      'apps/api/src/security.ts',
      'apps/api/src/auth-platform.ts',
      'apps/api/src/features/auth.ts',
    ],
    configuration: [
      'DATABASE_URL',
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
  'in-app-purchases': {
    name: 'RevenueCat native subscriptions',
    requires: ['mobile', 'database-auth'],
    targets: ['apps/mobile/src/purchases.ts', 'apps/api/src/features/revenuecat.ts'],
    configuration: ['RevenueCat SDK key, private API key and entitlement ID'],
  },
  rtc: {
    name: 'Cloudflare RealtimeKit rooms',
    requires: ['database-auth'],
    targets: ['apps/api/src/features/rtc.ts'],
    configuration: ['RealtimeKit account, app, participant preset and API token'],
  },
  'client-sync': {
    name: 'Per-account realtime events',
    requires: ['database-auth'],
    targets: ['apps/api/src/features/client-sync.ts', 'apps/api/src/sync-worker.ts'],
    configuration: [
      'CLIENT_SYNC Durable Object binding, hibernating WebSockets and public SYNC_API_ORIGIN',
    ],
  },
  cli: {
    name: 'TypeScript Commander CLI',
    requires: [],
    targets: ['apps/cli/package.json', 'apps/cli/src/index.ts', 'apps/cli/tsconfig.json'],
    configuration: [],
  },
  'web-extension': {
    name: 'WXT browser extension',
    requires: [],
    targets: ['apps/web-extension/package.json', 'apps/web-extension/entrypoints/popup/index.html'],
    configuration: [],
  },
  desktop: {
    name: 'Electron desktop app',
    requires: [],
    targets: [
      'apps/desktop/package.json',
      'apps/desktop/src/main/index.ts',
      'apps/desktop/ui/index.html',
      'apps/desktop/ui/main.tsx',
      'apps/desktop/electron.vite.config.mjs',
      'apps/desktop/package.mjs',
      'apps/desktop/tsconfig.json',
    ],
    configuration: [],
  },
  mobile: {
    name: 'Expo mobile app',
    requires: [],
    targets: [
      'apps/mobile/package.json',
      'apps/mobile/App.tsx',
      'apps/mobile/index.js',
      'apps/mobile/app.json',
    ],
    configuration: [],
  },
} as const;
export type Capability = keyof typeof CAPABILITIES;
const tauriDesktop = {
  name: 'Tauri desktop app',
  requires: [],
  targets: [
    'apps/desktop/package.json',
    'apps/desktop/src-tauri/tauri.conf.json',
    'apps/desktop/src-tauri/Cargo.toml',
    'apps/desktop/src-tauri/src/main.rs',
    'apps/desktop/ui/index.html',
  ],
  configuration: ['Rust and platform build tools'],
} as const;
export function usesTauriDesktop(editor: CapabilityEditor) {
  const file = 'apps/desktop/package.json';
  const pkg = editor.read(file) === null ? {} : editor.json(file);
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  return (
    !deps.electron &&
    (Object.hasOwn(deps, '@tauri-apps/cli') ||
      editor.read('apps/desktop/src-tauri/tauri.conf.json') !== null)
  );
}
export function usesD1(editor: CapabilityEditor) {
  const manifest = 'anhedral.json';
  const composition = editor.read(manifest) && editor.json(manifest).composition;
  if (composition?.identity === 'better-auth-neon-v1') return false;
  if (composition?.contractVersion === 2 || composition?.identity === 'better-auth-d1-v1')
    return true;
  const source = editor.read('packages/db/src/index.ts');
  if (source?.includes('drizzle-orm/d1')) return true;
  if (source?.includes('drizzle-orm/postgres-js')) return false;
  return Boolean(
    editor.read('apps/api/wrangler.jsonc') &&
    editor
      .json('apps/api/wrangler.jsonc')
      .d1_databases?.some((binding: { binding: string }) => binding.binding === 'DB'),
  );
}
export function installedCapability(editor: CapabilityEditor, id: Capability) {
  if (id === 'db' && usesD1(editor))
    return {
      ...CAPABILITIES.db,
      name: 'Drizzle and D1',
      configuration: ['D1 binding and reviewed migrations'],
    };
  if (id === 'database-auth' && usesD1(editor))
    return {
      ...CAPABILITIES[id],
      configuration: CAPABILITIES[id].configuration.map((value) =>
        value === 'DATABASE_URL' ? 'D1 resource ID' : value,
      ),
    };
  return id === 'desktop' && usesTauriDesktop(editor) ? tauriDesktop : CAPABILITIES[id];
}
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
          `${publicId(id)} requires ${publicId(parent)}. Add it first or explicitly use --with-dependencies.`,
        );
      visit(parent);
    }
    selected.add(id);
  }
  for (const id of requested) visit(id);
  return [...selected];
}

export const publicGroups = {
  web: ['web'],
  mobile: ['mobile'],
  desktop: ['desktop'],
  'web-extension': ['web-extension'],
  cli: ['cli'],
  api: ['hono'],
  db: ['db'],
  auth: ['database-auth'],
  backend: ['hono', 'db', 'database-auth'],
  storage: ['r2'],
  payment: ['stripe'],
  'in-app-purchases': ['in-app-purchases'],
  'client-sync': ['client-sync'],
  rtc: ['rtc'],
} as const satisfies Record<string, readonly Capability[]>;
export type PublicStackAddition = keyof typeof publicGroups;
export const PUBLIC_STACK_ADDITIONS = Object.keys(publicGroups) as PublicStackAddition[];
export function publicId(id: Capability): PublicStackAddition {
  return PUBLIC_STACK_ADDITIONS.find(
    (key) => key !== 'backend' && (publicGroups[key] as readonly Capability[]).includes(id),
  )!;
}
export const ANHEDRAL_STACK = {
  schemaVersion: 2,
  id: 'anhedral-stack',
  name: 'Anhedral Stack',
  foundation: {
    id: 'turborepo',
    name: 'pnpm + Turborepo',
    targets: ['package.json', 'turbo.json', 'pnpm-workspace.yaml'],
  },
  additions: Object.fromEntries(
    PUBLIC_STACK_ADDITIONS.map((id) => {
      const ids: readonly Capability[] = publicGroups[id];
      const item = CAPABILITIES[ids[0]];
      return [
        id,
        {
          name: id === 'backend' ? 'API, DB and auth' : item.name,
          requires: ids
            .flatMap((key) => CAPABILITIES[key].requires)
            .filter((key) => !ids.includes(key))
            .map(publicId),
          targets: ids.flatMap((key) => [...CAPABILITIES[key].targets]),
        },
      ];
    }),
  ) as Record<
    PublicStackAddition,
    { name: string; requires: PublicStackAddition[]; targets: string[] }
  >,
};
