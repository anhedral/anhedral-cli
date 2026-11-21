import { CAPABILITY_DEPENDENCIES, STACK_DEPENDENCIES } from '../dependencies.js';
import { resourceName } from '../render.js';
import { launchTemplate, stackTemplate, workerConfig } from '../scaffold/files.js';
import { composeTanstack, addTanstackAuth } from '../scaffold/tanstack.js';
import type { Capability } from './catalog.js';
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
  if (id === 'r2' || id === 'stripe') {
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
      const web = 'apps/web/wrangler.jsonc';
      const services = e.json(web).services ?? [];
      if (!Array.isArray(services) || services.some((s) => s.binding === 'ANHEDRAL_API'))
        throw Error('Existing ANHEDRAL_API binding must be reconciled first.');
      if (e.json(web).services)
        e.set(web, ['services', -1], {
          binding: 'ANHEDRAL_API',
          service: resourceName(name, 'api'),
        });
      else
        e.set(web, ['services'], [{ binding: 'ANHEDRAL_API', service: resourceName(name, 'api') }]);
      e.set(
        'apps/api/package.json',
        ['devDependencies', 'wrangler'],
        e.json('apps/web/package.json').devDependencies.wrangler,
      );
      e.create('apps/web/src/lib/api-proxy.ts', stackTemplate('api-proxy.ts.txt'));
      break;
    }
    case 'database-auth': {
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
        { 'drizzle-orm': STACK_DEPENDENCIES['drizzle-orm'] },
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
      e.create('packages/db/src/index.ts', stackTemplate('db-index.ts.txt'));
      e.create('packages/db/src/schema.ts', stackTemplate('auth-schema.ts.txt'));
      e.create('packages/db/drizzle/0000_better_auth.sql', stackTemplate('auth-migration.sql.txt'));
      e.create(
        'packages/db/drizzle/meta/0000_snapshot.json',
        stackTemplate('auth-snapshot.json.txt'),
      );
      e.create('packages/db/drizzle/meta/_journal.json', stackTemplate('auth-journal.json.txt'));
      e.create('packages/db/drizzle.config.ts', stackTemplate('drizzle.config.ts.txt'));
      e.create('packages/db/src/migrate.mjs', stackTemplate('db-migrate.mjs.txt'));
      apiConfig(e, 'd1_databases', [
        {
          binding: 'DB',
          database_name: resourceName(name, 'db'),
          database_id: '00000000-0000-0000-0000-000000000000',
          migrations_dir: '../../packages/db/drizzle',
        },
      ]);
      dependency(e, 'apps/api', {
        '@workspace/db': 'workspace:*',
        zod: STACK_DEPENDENCIES.zod,
        'better-auth': CAPABILITY_DEPENDENCIES['better-auth'],
        '@better-auth/drizzle-adapter': CAPABILITY_DEPENDENCIES['@better-auth/drizzle-adapter'],
      });
      dependency(e, 'apps/web', { 'better-auth': CAPABILITY_DEPENDENCIES['better-auth'] });
      e.create('apps/api/src/auth.ts', stackTemplate('auth.ts.txt'));
      e.create('apps/api/src/auth-features.ts', stackTemplate('auth-features.ts.txt'));
      e.create('apps/api/src/security.ts', stackTemplate('security.ts.txt'));
      e.create('apps/api/src/features/auth.ts', stackTemplate('auth-routes.ts.txt'));
      addTanstackAuth(e);
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
    case 'r2':
      e.create('apps/api/tests/storage.test.mjs', stackTemplate('storage.test.mjs.txt'));
      e.create('apps/web/src/routes/storage.tsx', launchTemplate('storage-page.tsx.txt'));
      apiConfig(e, 'r2_buckets', [{ binding: 'FILES', bucket_name: resourceName(name, 'files') }]);
      e.create('apps/api/src/features/storage.ts', stackTemplate('storage.ts.txt'));
      break;
    case 'stripe':
      e.create('apps/api/tests/payment.test.mjs', stackTemplate('payment.test.mjs.txt'));
      dependency(e, 'apps/api', { stripe: CAPABILITY_DEPENDENCIES.stripe });
      e.create('apps/api/src/features/stripe.ts', stackTemplate('stripe.ts.txt'));
      e.create('apps/api/src/billing-mode.ts', stackTemplate('billing-mode.ts.txt'));
      e.create('apps/api/src/features/entitlements.ts', stackTemplate('entitlements.ts.txt'));
      e.create('apps/api/src/entitlement-guard.ts', stackTemplate('entitlement-guard.ts.txt'));
      e.create('packages/db/src/billing-schema.ts', stackTemplate('billing-schema.ts.txt'));
      schemaExport(e, 'billing-schema');
      break;
  }
}

export function composeCapabilities(
  e: CapabilityEditor,
  installed: Capability[],
  operation: 'compose' | 'update' = 'compose',
) {
  composeTanstack(e, installed, operation === 'update');
  if (!installed.includes('hono')) return;
  const features: [Capability, string, string][] = [
    ['database-auth', 'authRoutes', 'auth'],
    ['r2', 'storageRoutes', 'storage'],
    ['stripe', 'stripeRoutes', 'stripe'],
    ['stripe', 'entitlementRoutes', 'entitlements'],
  ];
  const chosen = features.filter(([id]) => installed.includes(id));
  e.owned(
    'apps/api/src/capabilities.ts',
    "// CLI-owned composition. Add custom routes in index.ts; edited composition is never overwritten.\nimport { Hono } from 'hono';\nimport type { AppEnv } from './environment';\n" +
      chosen
        .map(([, symbol, file]) => `import { ${symbol} } from './features/${file}';\n`)
        .join('') +
      'export const capabilities = new Hono<AppEnv>();\n' +
      chosen.map(([, symbol]) => `capabilities.route('/', ${symbol});\n`).join(''),
  );
  if (installed.includes('database-auth'))
    e.owned('apps/api/src/auth-platform.ts', 'export const platformAuthPlugins = () => [];\n');
  if (installed.includes('stripe'))
    e.owned('apps/api/src/billing-providers.ts', stackTemplate('billing-providers.ts.txt'));

  const bindings = [
    'PUBLIC_APP_URL?: string',
    'BETTER_AUTH_SECRET?: string',
    'AUTH_TRUSTED_ORIGINS?: string',
  ];
  if (installed.includes('database-auth')) bindings.push('DB: D1Database');
  if (installed.includes('r2')) bindings.push('FILES: R2Bucket');
  if (installed.includes('stripe'))
    bindings.push(
      'STRIPE_SECRET_KEY?: string',
      'STRIPE_WEBHOOK_SECRET?: string',
      'STRIPE_PRICE_ID?: string',
      'BILLING_ENVIRONMENT?: string',
      'BILLING_PROVIDER?: string',
    );
  e.owned(
    'apps/api/src/environment.ts',
    `import type { CustomBindings, CustomVariables } from './custom-environment';\nexport type AppEnv = {
  Bindings: CustomBindings & {
${bindings.map((binding) => `    ${binding};`).join('\n')}
  };
  Variables: CustomVariables & { userId: string; fileKey: string };
};\n`,
  );
  if (operation === 'update') return;
  appendExample(
    e,
    'apps/api/.dev.vars.example',
    bindings
      .filter((binding) => binding.includes('string'))
      .map((binding) => binding.split('?')[0]),
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
