import { writeEnvironmentFile } from './environment.js';
import { STACK_DEPENDENCIES } from '../dependencies.js';
import type { RecipeContext } from '../registry/types.js';
import { put, patchPackage, readJson, json, sharedPackage } from './files.js';

export function scaffoldDatabase({ root, options, runtimeApp, has }: RecipeContext): void {
  const app = `apps/${runtimeApp}`;
  const postgres = has('neon');
  const directory = 'packages/db';
  sharedPackage(
    root,
    'db',
    postgres
      ? `import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
export function createDatabase(connectionString: string) {
  // HTTP supports independent queries and batches; migrations use a separate transactional connection.
  return drizzle(neon(connectionString), { schema });
}
`
      : `import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
export function createDatabase(binding: Parameters<typeof drizzle>[0]) { return drizzle(binding, { schema }); }
`,
    {
      'drizzle-orm': STACK_DEPENDENCIES['drizzle-orm'],
      ...(postgres
        ? { '@neondatabase/serverless': STACK_DEPENDENCIES['@neondatabase/serverless'] }
        : {}),
    },
  );
  put(
    root,
    `${directory}/src/schema.ts`,
    '// Define product tables here; generate and review SQL before migration.\nexport {};\n',
  );
  put(root, `${directory}/drizzle/.gitkeep`, '');
  const environment = `import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
const root = new URL('./', import.meta.url);
// Existing process values win; local overrides precede shared defaults.
for (const name of ['.env.local', '.env']) {
  const file = fileURLToPath(new URL(name, root));
  if (existsSync(file)) loadEnvFile(file);
}
`;
  put(
    root,
    `${directory}/drizzle.config.ts`,
    postgres
      ? `${environment}import { relative } from 'node:path';
import { defineConfig } from 'drizzle-kit';
const url = process.env.DATABASE_URL_UNPOOLED;
export default defineConfig({
  dialect: 'postgresql',
  schema: fileURLToPath(new URL('./src/schema.ts', root)),
  out: relative(process.cwd(), fileURLToPath(new URL('./drizzle/', root))),
  ...(url ? { dbCredentials: { url } } : {}),
});
`
      : `import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  dialect: 'sqlite',
  schema: fileURLToPath(new URL('./src/schema.ts', import.meta.url)),
  out: relative(process.cwd(), fileURLToPath(new URL('./drizzle/', import.meta.url))),
});
`,
  );
  put(
    root,
    `${directory}/src/migrate.ts`,
    postgres
      ? `import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
const root = new URL('../', import.meta.url);
for (const name of ['.env.local', '.env']) {
  const file = fileURLToPath(new URL(name, root));
  if (existsSync(file)) loadEnvFile(file);
}
const connectionString = process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) throw new Error('Configure DATABASE_URL_UNPOOLED for the intended migration branch and role.');
let url: URL;
try { url = new URL(connectionString); } catch { throw new Error('Configure a valid direct PostgreSQL migration URL.'); }
if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname.includes('-pooler.'))
  throw new Error('Migrations require a direct PostgreSQL connection.');
neonConfig.webSocketConstructor = WebSocket;
const pool = new Pool({ connectionString });
try {
  await migrate(drizzle(pool), { migrationsFolder: fileURLToPath(new URL('drizzle/', root)) });
} catch {
  throw new Error('Database migration failed. Inspect the selected branch and migration history before retrying.');
} finally {
  await pool.end();
}
`
      : `import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const args = process.argv.slice(2);
if (args.length > 1 || args.some((arg) => !['--local', '--remote'].includes(arg)))
  throw new Error('Usage: pnpm db:migrate [--local|--remote] (defaults to local).');
const pnpm = process.env.npm_execpath;
if (!pnpm) throw new Error('Run migrations through pnpm db:migrate.');
const root = fileURLToPath(new URL('../../../apps/${runtimeApp}/', import.meta.url));
const result = spawnSync(process.execPath, [pnpm, 'exec', 'wrangler', 'd1', 'migrations', 'apply', 'DB',
  args[0] ?? '--local', '--config', fileURLToPath(new URL('../../../apps/${runtimeApp}/wrangler.jsonc', import.meta.url)),
], { cwd: root, stdio: 'inherit', shell: false });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
`,
  );
  patchPackage(root, `${directory}/package.json`, {
    exports: { '.': './src/index.ts', './schema': './src/schema.ts' },
    dependencies: {
      'drizzle-orm': STACK_DEPENDENCIES['drizzle-orm'],
      ...(postgres
        ? { '@neondatabase/serverless': STACK_DEPENDENCIES['@neondatabase/serverless'] }
        : {}),
    },
    devDependencies: {
      'drizzle-kit': STACK_DEPENDENCIES['drizzle-kit'],
      tsx: STACK_DEPENDENCIES['tsx'],
      ...(!postgres ? { wrangler: STACK_DEPENDENCIES['wrangler'] } : {}),
    },
    scripts: { 'db:generate': 'drizzle-kit generate', 'db:migrate': 'tsx src/migrate.ts' },
  });
  const tsconfig = readJson(root, `${directory}/tsconfig.json`);
  tsconfig.include = [...new Set([...((tsconfig.include as string[]) ?? []), 'drizzle.config.ts'])];
  json(root, `${directory}/tsconfig.json`, tsconfig);
  patchPackage(root, `${app}/package.json`, { dependencies: { '@workspace/db': 'workspace:*' } });
  if (postgres) {
    const native = runtimeApp === 'web' && options.hosting === 'vercel';
    writeEnvironmentFile(root, `${app}/${native ? '.env.example' : '.dev.vars.example'}`, {
      DATABASE_URL: '',
    });
    writeEnvironmentFile(root, `${directory}/.env.example`, { DATABASE_URL_UNPOOLED: '' });
    if (!native)
      put(
        root,
        `${app}/${runtimeApp === 'api' ? 'src/' : ''}database-secrets.d.ts`,
        runtimeApp === 'api'
          ? 'interface Env { DATABASE_URL: string }\n'
          : 'declare namespace Cloudflare { interface Env { DATABASE_URL: string } }\n',
      );
  }
}
