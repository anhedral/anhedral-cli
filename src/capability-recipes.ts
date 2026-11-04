import { readFileSync } from 'node:fs';
import { CapabilityEditor } from './capability-editor.js';
import { CAPABILITY_DEPENDENCIES as P } from './dependencies.js';
import { STACK_DEPENDENCIES as D } from './dependencies.js';
import { resourceName } from './render.js';
import { composeTanstack, addTanstackAuth } from './platforms/tanstack.js';
import { WEB_API_PROXY } from './api-proxy.js';
import type { Capability } from './capability-catalog.js';

const template = (name: string) =>
  readFileSync(new URL(`../assets/stack/${name}`, import.meta.url), 'utf8');
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
      devDependencies: { typescript: D.typescript, ...dev },
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
  switch (id) {
    case 'hono': {
      project(
        e,
        'apps/api',
        '@workspace/api',
        {
          dev: 'wrangler dev --port 8787 --inspector-port 9231',
          build: 'wrangler deploy --dry-run --outdir dist',
          deploy: 'wrangler deploy',
          typecheck: 'wrangler types && tsc --noEmit',
          lint: 'eslint . --max-warnings 0',
        },
        { hono: D.hono },
        {
          wrangler: D.wrangler,
          '@types/node': D['@types/node'],
          eslint: D.eslint,
          '@workspace/eslint-config': 'workspace:*',
        },
      );
      e.create(
        'apps/api/wrangler.jsonc',
        json({
          $schema: 'node_modules/wrangler/config-schema.json',
          name: resourceName(name, 'api'),
          main: 'src/index.ts',
          compatibility_date: '2026-10-05',
          compatibility_flags: ['nodejs_compat'],
          observability: { enabled: true },
        }),
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
      e.create(
        'apps/api/eslint.config.mjs',
        "import { config } from '@workspace/eslint-config/base';\nexport default [...config, {ignores:['dist/**','.wrangler/**','worker-configuration.d.ts']}];\n",
      );
      e.create('apps/api/src/index.ts', template('api-index.ts.txt'));
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
      e.create(
        'apps/web/src/lib/api-proxy.ts',
        WEB_API_PROXY.replace(
          "'idempotency-key'",
          "'idempotency-key', 'stripe-signature', 'last-event-id'",
        ).replace(
          'AbortSignal.timeout(15000)',
          "AbortSignal.timeout(request.headers.get('accept')?.includes('text/event-stream') ? 35000 : 15000)",
        ),
      );
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
        { 'drizzle-orm': D['drizzle-orm'] },
        {
          'drizzle-kit': D['drizzle-kit'],
          '@types/node': D['@types/node'],
          eslint: D.eslint,
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
      e.create(
        'packages/db/src/index.ts',
        "import { drizzle } from 'drizzle-orm/d1';\nimport * as schema from './schema';\nexport function createDatabase(binding: Parameters<typeof drizzle>[0]) { return drizzle(binding, { schema }); }\n",
      );
      e.create('packages/db/src/schema.ts', template('auth-schema.ts.txt'));
      e.create('packages/db/drizzle/0000_better_auth.sql', template('auth-migration.sql.txt'));
      e.create('packages/db/drizzle/meta/0000_snapshot.json', template('auth-snapshot.json.txt'));
      e.create('packages/db/drizzle/meta/_journal.json', template('auth-journal.json.txt'));
      e.create(
        'packages/db/drizzle.config.ts',
        "import { defineConfig } from 'drizzle-kit';\nexport default defineConfig({dialect:'sqlite', schema:'./src/schema.ts', out:'./drizzle'});\n",
      );
      e.create(
        'packages/db/src/migrate.mjs',
        "import { spawnSync } from 'node:child_process';\nimport { fileURLToPath } from 'node:url';\nconst args = process.argv.slice(2);\nif(args.length > 1 || args.some((v)=> !['--local','--remote'].includes(v))) throw Error('Use --local or explicitly --remote.');\nif(!process.env.npm_execpath) throw Error('Run through pnpm db:migrate.');\nconst cwd=fileURLToPath(new URL('../../../apps/api/',import.meta.url));\nconst result=spawnSync(process.execPath,[process.env.npm_execpath,'exec','wrangler','d1','migrations','apply','DB',args[0] ?? '--local'],{cwd,stdio:'inherit',shell:false});\nif(result.error)throw result.error;\nprocess.exitCode=result.status ?? 1;\n",
      );
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
        zod: D.zod,
        'better-auth': P['better-auth'],
        '@better-auth/drizzle-adapter': P['@better-auth/drizzle-adapter'],
      });
      dependency(e, 'apps/web', { 'better-auth': P['better-auth'] });
      e.create('apps/api/src/auth.ts', template('auth.ts.txt'));
      e.create('apps/api/src/auth-features.ts', template('auth-features.ts.txt'));
      e.create('apps/api/src/security.ts', template('security.ts.txt'));
      e.create('apps/api/src/features/auth.ts', template('auth-routes.ts.txt'));
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
      apiConfig(e, 'r2_buckets', [{ binding: 'FILES', bucket_name: resourceName(name, 'files') }]);
      e.create('apps/api/src/features/storage.ts', template('storage.ts.txt'));
      break;
    case 'stripe':
      dependency(e, 'apps/api', { stripe: P.stripe });
      e.create('apps/api/src/features/stripe.ts', template('stripe.ts.txt'));
      e.create('apps/api/src/billing-mode.ts', template('billing-mode.ts.txt'));
      e.create('apps/api/src/features/entitlements.ts', template('entitlements.ts.txt'));
      e.create('apps/api/src/entitlement-guard.ts', template('entitlement-guard.ts.txt'));
      e.create('packages/db/src/billing-schema.ts', template('billing-schema.ts.txt'));
      schemaExport(e, 'billing-schema');
      break;
  }
}

export function composeCapabilities(e: CapabilityEditor, installed: Capability[]) {
  composeTanstack(e, installed);
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
    e.owned(
      'apps/api/src/billing-providers.ts',
      "import type {AppEnv} from './environment';\nimport {stripeEntitled} from './features/stripe';\nexport const billingProviders:Record<string,(env:AppEnv['Bindings'],userId:string)=>Promise<boolean>>={stripe:stripeEntitled};\n",
    );

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
    `import type { CustomBindings, CustomVariables } from './custom-environment';\nexport type AppEnv = { Bindings: CustomBindings & {${bindings.join(';\n')}}; Variables: CustomVariables & {userId:string;fileKey:string} };\n`,
  );
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
