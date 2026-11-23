import { GENERATOR_VERSION } from '../version.js';
import { bootstrapWorkspace } from '../scaffold/bootstrap.js';
import { CAPABILITY_DEPENDENCIES, STACK_DEPENDENCIES } from '../dependencies.js';
import { addClient, connectClients, addCloudFeature, composeSync } from './clients.js';
import { scaffoldStyling } from '../scaffold/styling.js';
import { scaffoldTanstack } from '../scaffold/tanstack.js';
import { resourceName } from '../render.js';
import { launchTemplate, stackTemplate, workerConfig } from '../scaffold/files.js';
import { composeTanstack, addTanstackAuth } from '../scaffold/tanstack.js';
import { usesD1, type Capability } from './catalog.js';
import { CapabilityEditor } from './editor.js';

const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
function dependency(e: CapabilityEditor, app: string, dependencies: Record<string, string>) {
  e.merge(`${app}/package.json`, 'dependencies', dependencies);
}
function project(
  e: CapabilityEditor,
  directory: string,
  name: string,
  scripts: Record<string, string>,
  dependencies: Record<string, string>,
  dev: Record<string, string> = {},
) {
  e.create(
    `${directory}/package.json`,
    json({
      name,
      private: true,
      version: '0.1.0',
      type: 'module',
      scripts,
      dependencies,
      devDependencies: { typescript: STACK_DEPENDENCIES.typescript, ...dev },
    }),
  );
}
function apiConfig(e: CapabilityEditor, key: string, value: unknown) {
  const file = 'apps/api/wrangler.jsonc';
  const current = e.json(file)[key];
  if (Array.isArray(current) && Array.isArray(value)) {
    for (const entry of value) {
      const previous = current.find((item) => item.binding === entry.binding);
      if (previous && JSON.stringify(previous) !== JSON.stringify(entry))
        throw Error(`Preserve existing ${entry.binding} in ${file}; reconcile it first.`);
      if (!previous) e.set(file, [key, -1], entry);
    }
    return;
  }
  if (current !== undefined && JSON.stringify(current) !== JSON.stringify(value))
    throw Error(`Preserve existing ${key} in ${file}; reconcile it before adding this capability.`);
  e.set(file, [key], value);
}
function schemaExport(e: CapabilityEditor, module: string) {
  const file = 'packages/db/src/schema.ts';
  const source = e.read(file);
  if (source === null) throw Error('Database schema is missing.');
  // Appending an export preserves all consumer-owned schema declarations.
  e.writes.set(file, source + `\nexport * from './${module}';\n`);
}
export function addCapabilityRecipe(e: CapabilityEditor, id: Capability, name: string) {
  const d1 = usesD1(e);
  const dbTemplate = (file: string) => stackTemplate((d1 ? '' : 'pg-') + file);
  if (id === 'r2' || id === 'stripe') {
    if (!d1) {
      if (e.read('apps/api/tests/postgres.mjs') === null)
        e.create('apps/api/tests/postgres.mjs', stackTemplate('postgres-fixture.mjs.txt'));
      e.merge('apps/api/package.json', 'devDependencies', {
        '@electric-sql/pglite': STACK_DEPENDENCIES['@electric-sql/pglite'],
        '@electric-sql/pglite-socket': STACK_DEPENDENCIES['@electric-sql/pglite-socket'],
      });
    }
    const manifest = e.json('apps/api/package.json');
    if (!manifest.scripts?.test)
      e.set(
        'apps/api/package.json',
        ['scripts', 'test'],
        'node --import tsx --test tests/*.test.mjs',
      );
    if (!manifest.devDependencies?.tsx && !manifest.dependencies?.tsx)
      e.set('apps/api/package.json', ['devDependencies', 'tsx'], CAPABILITY_DEPENDENCIES.tsx);
  }
  switch (id) {
    case 'web':
      scaffoldStyling(e);
      scaffoldTanstack(e, name);
      for (const file of ['README.md', 'AGENTS.md']) {
        if (e.read(file) === null)
          e.create(
            file,
            launchTemplate(file + '.txt')
              .replaceAll('__APP_NAME__', name)
              .replaceAll('__CLI_VERSION__', GENERATOR_VERSION),
          );
      }
      e.merge('package.json', 'scripts', { dev: 'pnpm --filter @workspace/web dev' });
      break;
    case 'mobile':
    case 'desktop':
    case 'web-extension':
    case 'cli':
      addClient(e, id, name);
      break;
    case 'client-sync':
    case 'rtc':
    case 'in-app-purchases':
      addCloudFeature(e, id);
      break;
    case 'hono': {
      project(
        e,
        'apps/api',
        '@workspace/api',
        {
          test: 'node --import tsx --test tests/*.test.mjs',
          dev: 'wrangler dev --port 8787 --inspector-port 9231',
          build: 'wrangler deploy --dry-run --outdir dist',
          deploy: 'wrangler deploy',
          typecheck: 'wrangler types && tsc --noEmit',
          lint: 'eslint . --max-warnings 0',
        },
        { hono: STACK_DEPENDENCIES.hono },
        {
          tsx: CAPABILITY_DEPENDENCIES.tsx,
          wrangler: STACK_DEPENDENCIES.wrangler,
          '@types/node': STACK_DEPENDENCIES['@types/node'],
          eslint: STACK_DEPENDENCIES.eslint,
          '@workspace/eslint-config': 'workspace:*',
        },
      );
      e.create(
        'apps/api/wrangler.jsonc',
        json(workerConfig(resourceName(name, 'api'), 'src/index.ts', '2026-10-05')),
      );
      e.create(
        'apps/api/tsconfig.json',
        json({
          compilerOptions: {
            target: 'ES2022',
            lib: ['ES2022'],
            module: 'ESNext',
            moduleResolution: 'Bundler',
            strict: true,
            skipLibCheck: true,
            noEmit: true,
            types: ['node'],
          },
          include: ['src/**/*.ts', 'worker-configuration.d.ts'],
        }),
      );
      e.create('apps/api/eslint.config.mjs', stackTemplate('api-eslint.config.mjs.txt'));
      e.create('apps/api/tests/backend.test.mjs', stackTemplate('backend.test.mjs.txt'));
      e.create('apps/api/src/index.ts', stackTemplate('api-index.ts.txt'));
      e.create(
        'apps/api/src/custom-environment.ts',
        'export type CustomBindings = Record<never, never>;\nexport type CustomVariables = Record<never, never>;\n',
      );
      break;
    }
    case 'db': {
      project(
        e,
        'packages/db',
        '@workspace/db',
        {
          typecheck: 'tsc --noEmit',
          lint: 'eslint . --max-warnings 0',
          'db:generate': 'drizzle-kit generate',
          'db:migrate': 'node src/migrate.mjs',
        },
        {
          'drizzle-orm': STACK_DEPENDENCIES['drizzle-orm'],
          ...(!d1 && { postgres: STACK_DEPENDENCIES.postgres }),
        },
        {
          'drizzle-kit': STACK_DEPENDENCIES['drizzle-kit'],
          '@types/node': STACK_DEPENDENCIES['@types/node'],
          eslint: STACK_DEPENDENCIES.eslint,
          '@workspace/eslint-config': 'workspace:*',
        },
      );
      e.set('packages/db/package.json', ['exports'], {
        '.': './src/index.ts',
        './schema': './src/schema.ts',
      });
      e.create(
        'packages/db/tsconfig.json',
        json({
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'Bundler',
            strict: true,
            skipLibCheck: true,
            noEmit: true,
            types: ['node'],
          },
          include: ['src/**/*.ts'],
        }),
      );
      e.create(
        'packages/db/eslint.config.mjs',
        "import { config } from '@workspace/eslint-config/base';\nexport default config;\n",
      );
      e.create('packages/db/src/index.ts', dbTemplate('db-index.ts.txt'));
      e.create('packages/db/src/schema.ts', 'export {};\n');
      e.create('packages/db/drizzle.config.ts', dbTemplate('drizzle.config.ts.txt'));
      e.create('packages/db/src/migrate.mjs', dbTemplate('db-migrate.mjs.txt'));
      if (d1)
        apiConfig(e, 'd1_databases', [
          {
            binding: 'DB',
            database_name: resourceName(name, 'db'),
            database_id: '00000000-0000-0000-0000-000000000000',
            migrations_dir: '../../packages/db/drizzle',
          },
        ]);
      dependency(e, 'apps/api', { '@workspace/db': 'workspace:*' });
      e.merge('package.json', 'scripts', {
        'db:generate': 'pnpm --dir packages/db db:generate',
        'db:migrate': 'pnpm --dir packages/db db:migrate',
      });
      e.merge('turbo.json', 'tasks', {
        'db:generate': { cache: false },
        'db:migrate': { cache: false },
      });
      break;
    }
    case 'database-auth': {
      e.create('packages/db/src/auth-schema.ts', dbTemplate('auth-schema.ts.txt'));
      const pristine =
        e.read('packages/db/src/schema.ts') === 'export {};\n' &&
        e.read('packages/db/drizzle/meta/_journal.json') === null;
      schemaExport(e, 'auth-schema');
      if (pristine) {
        e.create('packages/db/drizzle/0000_better_auth.sql', dbTemplate('auth-migration.sql.txt'));
        e.create(
          'packages/db/drizzle/meta/0000_snapshot.json',
          dbTemplate('auth-snapshot.json.txt'),
        );
        e.create('packages/db/drizzle/meta/_journal.json', dbTemplate('auth-journal.json.txt'));
      }
      dependency(e, 'apps/api', {
        zod: STACK_DEPENDENCIES.zod,
        'better-auth': CAPABILITY_DEPENDENCIES['better-auth'],
        '@better-auth/drizzle-adapter': CAPABILITY_DEPENDENCIES['@better-auth/drizzle-adapter'],
      });
      e.create('apps/api/src/auth.ts', dbTemplate('auth.ts.txt'));
      e.create('apps/api/src/auth-features.ts', stackTemplate('auth-features.ts.txt'));
      e.create('apps/api/src/security.ts', dbTemplate('security.ts.txt'));
      e.create('apps/api/src/features/auth.ts', dbTemplate('auth-routes.ts.txt'));
      break;
    }
    case 'r2':
      e.create('apps/api/tests/storage.test.mjs', dbTemplate('storage.test.mjs.txt'));
      apiConfig(e, 'r2_buckets', [{ binding: 'FILES', bucket_name: resourceName(name, 'files') }]);
      e.create('apps/api/src/features/storage.ts', stackTemplate('storage.ts.txt'));
      break;
    case 'stripe':
      e.create(
        'apps/api/src/receipt.ts',
        stackTemplate(d1 ? 'receipt-d1.ts.txt' : 'receipt-pg.ts.txt'),
      );
      e.create('apps/api/tests/payment.test.mjs', dbTemplate('payment.test.mjs.txt'));
      dependency(e, 'apps/api', { stripe: CAPABILITY_DEPENDENCIES.stripe });
      e.create('apps/api/src/features/stripe.ts', stackTemplate('stripe.ts.txt'));
      e.create('apps/api/src/billing-mode.ts', stackTemplate('billing-mode.ts.txt'));
      e.create('packages/db/src/billing-schema.ts', dbTemplate('billing-schema.ts.txt'));
      schemaExport(e, 'billing-schema');
      break;
  }
}

export function composeCapabilities(
  e: CapabilityEditor,
  installed: Capability[],
  operation: 'compose' | 'update' = 'compose',
  previous: Capability[] = installed,
) {
  const joined = (...ids: Capability[]) =>
    ids.every((id) => installed.includes(id)) && ids.some((id) => !previous.includes(id));
  if (joined('web', 'hono')) {
    const web = 'apps/web/wrangler.jsonc';
    const services = e.json(web).services ?? [];
    if (!Array.isArray(services) || services.some((s) => s.binding === 'ANHEDRAL_API'))
      throw Error('Existing ANHEDRAL_API binding must be reconciled first.');
    e.set(
      web,
      ['services'],
      [...services, { binding: 'ANHEDRAL_API', service: e.json('apps/api/wrangler.jsonc').name }],
    );
    e.create('apps/web/src/lib/api-proxy.ts', stackTemplate('api-proxy.ts.txt'));
  }
  if (joined('web', 'database-auth')) {
    dependency(e, 'apps/web', { 'better-auth': CAPABILITY_DEPENDENCIES['better-auth'] });
    addTanstackAuth(e);
  }
  if (joined('web', 'r2'))
    e.create('apps/web/src/routes/storage.tsx', launchTemplate('storage-page.tsx.txt'));
  if (installed.includes('web')) composeTanstack(e, installed, operation === 'update');
  connectClients(e, installed, previous);
  if (installed.includes('client-sync')) composeSync(e, installed, operation);
  const billing = installed.includes('stripe') || installed.includes('in-app-purchases');
  if (billing && !previous.includes('stripe') && !previous.includes('in-app-purchases')) {
    e.create('apps/api/src/features/entitlements.ts', stackTemplate('entitlements.ts.txt'));
    e.create('apps/api/src/entitlement-guard.ts', stackTemplate('entitlement-guard.ts.txt'));
  }
  if (!installed.includes('hono')) return;
  const features: [Capability, string, string][] = [
    ['database-auth', 'authRoutes', 'auth'],
    ['r2', 'storageRoutes', 'storage'],
    ['stripe', 'stripeRoutes', 'stripe'],
    [
      installed.includes('stripe') ? 'stripe' : 'in-app-purchases',
      'entitlementRoutes',
      'entitlements',
    ],
    ['rtc', 'rtcRoutes', 'rtc'],
    ['client-sync', 'syncRoutes', 'client-sync'],
  ];
  const external = installed.some((id) =>
    ['cli', 'mobile', 'desktop', 'web-extension'].includes(id),
  );
  const fileSync = installed.includes('client-sync') && installed.includes('r2');
  if (fileSync)
    e.owned('apps/api/src/features/file-events.ts', stackTemplate('file-events.ts.txt'));
  const chosen = features.filter(([id]) => installed.includes(id));
  e.owned(
    'apps/api/src/capabilities.ts',
    "// CLI-owned composition. Add custom routes in index.ts; edited composition is never overwritten.\nimport { Hono } from 'hono';\nimport type { AppEnv } from './environment';\n" +
      chosen
        .map(([, symbol, file]) => `import { ${symbol} } from './features/${file}';\n`)
        .join('') +
      (external ? "import { clientOrigins } from './client-origins';\n" : '') +
      (fileSync ? "import { notifyFileChange } from './features/file-events';\n" : '') +
      'export const capabilities = new Hono<AppEnv>();\n' +
      (external ? "capabilities.use('*', clientOrigins);\n" : '') +
      (fileSync ? "capabilities.use('/files/:name', notifyFileChange);\n" : '') +
      chosen.map(([, symbol]) => `capabilities.route('/', ${symbol});\n`).join(''),
  );
  if (installed.includes('database-auth'))
    e.owned('apps/api/src/auth-platform.ts', 'export const platformAuthPlugins = () => [];\n');
  if (billing) {
    let providers = stackTemplate('billing-providers.ts.txt');
    if (!installed.includes('stripe'))
      providers = providers
        .replace("import { stripeEntitled } from './features/stripe';\n", '')
        .replace('  stripe: stripeEntitled,\n', '');
    if (installed.includes('in-app-purchases'))
      providers =
        "import { revenuecatEntitled } from './features/revenuecat';\n" +
        providers.replace('= {\n', '= {\n  revenuecat: revenuecatEntitled,\n');
    e.owned('apps/api/src/billing-providers.ts', providers);
  }

  const bindings = installed.includes('database-auth')
    ? ['PUBLIC_APP_URL?: string', 'BETTER_AUTH_SECRET?: string', 'AUTH_TRUSTED_ORIGINS?: string']
    : [];
  if (external && !installed.includes('database-auth'))
    bindings.push('AUTH_TRUSTED_ORIGINS?: string');
  if (installed.includes('db'))
    bindings.push(usesD1(e) ? 'DB: D1Database' : 'DATABASE_URL: string');
  if (installed.includes('r2')) bindings.push('FILES: R2Bucket');
  if (installed.includes('stripe'))
    bindings.push(
      'STRIPE_SECRET_KEY?: string',
      'STRIPE_WEBHOOK_SECRET?: string',
      'STRIPE_PRICE_ID?: string',
      'BILLING_ENVIRONMENT?: string',
    );
  if (billing) bindings.push('BILLING_PROVIDER?: string');
  if (installed.includes('in-app-purchases'))
    bindings.push('REVENUECAT_SECRET_KEY?: string', 'REVENUECAT_ENTITLEMENT?: string');
  if (installed.includes('rtc'))
    bindings.push(
      'RTC_ACCOUNT_ID?: string',
      'RTC_APP_ID?: string',
      'RTC_API_TOKEN?: string',
      'RTC_PRESET?: string',
    );
  if (installed.includes('client-sync'))
    bindings.push('CLIENT_SYNC: DurableObjectNamespace', 'SYNC_API_ORIGIN?: string');
  e.owned(
    'apps/api/src/environment.ts',
    `import type { CustomBindings, CustomVariables } from './custom-environment';\nexport type AppEnv = {
  Bindings: CustomBindings${bindings.length ? ' & {\n' + bindings.map((binding) => `    ${binding};`).join('\n') + '\n  }' : ''};
  Variables: CustomVariables & { userId: string; fileKey: string };
};\n`,
  );
  if (operation === 'update') {
    if (installed.includes('client-sync'))
      appendExample(e, 'apps/api/.dev.vars.example', ['SYNC_API_ORIGIN']);
    return;
  }
  appendExample(
    e,
    'apps/api/.dev.vars.example',
    bindings
      .filter((binding) => binding.includes('string'))
      .map((binding) => binding.split(/[?:]/)[0]),
  );
}

function appendExample(e: CapabilityEditor, file: string, keys: string[]) {
  const current = e.read(file);
  const source =
    current ?? '# Copy selected values to the local environment. Never commit secrets.\n';
  const existing = new Set([...source.matchAll(/^([A-Z_]+)=/gm)].map((match) => match[1]));
  const additions = keys.filter((key) => !existing.has(key));
  if (!additions.length) return;
  const value = source.trimEnd() + '\n' + additions.map((key) => key + '=').join('\n') + '\n';
  if (current === null) e.create(file, value);
  else e.writes.set(file, value);
}

export function installRecipes(
  e: CapabilityEditor,
  name: string,
  previous: Capability[],
  additions: Capability[],
  installed: Capability[],
) {
  if (
    !previous.some((id) => id === 'web' || id === 'hono') &&
    additions.some((id) => id === 'web' || id === 'hono')
  )
    bootstrapWorkspace(e);
  for (const id of additions) addCapabilityRecipe(e, id, name);
  if (additions.length) composeCapabilities(e, installed, 'compose', previous);
}
