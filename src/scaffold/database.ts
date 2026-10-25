import { readFileSync } from 'node:fs';
import path from 'node:path';
import { STACK_DEPENDENCIES } from '../dependencies.js';
import type { RecipeContext } from '../registry/types.js';
import { put, patchPackage, sharedPackage } from './files.js';

export function scaffoldDatabase({ root }: RecipeContext): void {
  sharedPackage(
    root,
    'db',
    `import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
export function createDatabase(binding: Parameters<typeof drizzle>[0]) { return drizzle(binding, { schema }); }
`,
    { 'drizzle-orm': STACK_DEPENDENCIES['drizzle-orm'] },
  );
  put(
    root,
    'packages/db/src/schema.ts',
    '// Add application tables here. Generate and review SQL before migration.\nexport {};\n',
  );
  put(root, 'packages/db/drizzle/.gitkeep', '');
  put(
    root,
    'packages/db/drizzle.config.ts',
    `import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';
import { defineConfig } from 'drizzle-kit';
export default defineConfig({ dialect: 'sqlite', schema: fileURLToPath(new URL('./src/schema.ts', import.meta.url)), out: relative(process.cwd(), fileURLToPath(new URL('./drizzle/', import.meta.url))) });
`,
  );
  put(
    root,
    'packages/db/src/migrate.ts',
    `import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const args = process.argv.slice(2);
if (args.length > 1 || args.some((arg) => !['--local', '--remote'].includes(arg))) throw new Error('Usage: pnpm db:migrate [--local|--remote] (defaults to local).');
const pnpm = process.env.npm_execpath;
if (!pnpm) throw new Error('Run migrations through pnpm db:migrate.');
const root = fileURLToPath(new URL('../../../apps/api/', import.meta.url));
const result = spawnSync(process.execPath, [pnpm, 'exec', 'wrangler', 'd1', 'migrations', 'apply', 'DB', args[0] ?? '--local', '--config', fileURLToPath(new URL('../../../apps/api/wrangler.jsonc', import.meta.url))], { cwd: root, stdio: 'inherit', shell: false });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
`,
  );
  patchPackage(root, 'packages/db/package.json', {
    exports: { '.': './src/index.ts', './schema': './src/schema.ts' },
    devDependencies: {
      'drizzle-kit': STACK_DEPENDENCIES['drizzle-kit'],
      tsx: STACK_DEPENDENCIES.tsx,
      wrangler: STACK_DEPENDENCIES.wrangler,
    },
    scripts: { 'db:generate': 'drizzle-kit generate', 'db:migrate': 'tsx src/migrate.ts' },
  });
  patchPackage(root, 'apps/api/package.json', { dependencies: { '@workspace/db': 'workspace:*' } });
  const source = readFileSync(path.join(root, 'apps/api/src/index.ts'), 'utf8');
  put(
    root,
    'apps/api/src/index.ts',
    "import { createDatabase } from '@workspace/db';\n" +
      source.replace(
        'const app = new OpenAPIHono<{ Bindings: Env }>();',
        "const app = new OpenAPIHono<{ Bindings: Env; Variables: { database: () => ReturnType<typeof createDatabase> } }>();\napp.use('*', async (c, next) => { c.set('database', () => createDatabase(c.env.DB)); await next(); });",
      ),
  );
}
