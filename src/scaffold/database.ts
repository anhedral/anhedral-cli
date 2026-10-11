import { STACK_DEPENDENCIES } from '../dependencies.js';
import type { RecipeContext } from '../registry/types.js';
import { put, patchPackage, sharedPackage } from './files.js';
export function scaffoldDatabase({ root, options, runtimeApp, has }: RecipeContext): void {
  sharedPackage(
    root,
    'db',
    has('neon')
      ? `import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
export function createDatabase(connectionString: string) {
  // HTTP supports independent queries and batches; choose a reviewed WebSocket adapter for interactive transactions.
  return drizzle(neon(connectionString), { schema });
}
`
      : `import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
export function createDatabase(binding: Parameters<typeof drizzle>[0]) { return drizzle(binding, { schema }); }
`,
    {
      'drizzle-orm': STACK_DEPENDENCIES['drizzle-orm'],
      ...(has('neon') ? { '@neondatabase/serverless': '1.2.0' } : {}),
    },
  );
  if (has('neon')) {
    const native = runtimeApp === 'web' && options.hosting === 'vercel';
    put(
      root,
      `apps/${runtimeApp}/${native ? '.env.example' : '.dev.vars.example'}`,
      'DATABASE_URL=\n',
    );
    if (!native)
      put(
        root,
        `apps/${runtimeApp}/${runtimeApp === 'api' ? 'src/' : ''}database-secrets.d.ts`,
        runtimeApp === 'api'
          ? 'interface Env { DATABASE_URL: string }\n'
          : 'declare namespace Cloudflare { interface Env { DATABASE_URL: string } }\n',
      );
  }
  put(
    root,
    'packages/db/src/schema.ts',
    '// Define product tables here; generate and review SQL before migration.\nexport {};\n',
  );
  put(
    root,
    'packages/db/drizzle.config.ts',
    has('neon')
      ? `import { defineConfig } from 'drizzle-kit';
export default defineConfig({ dialect: 'postgresql', schema: './src/schema.ts', out: './migrations', dbCredentials: { url: process.env.DATABASE_URL! } });
`
      : `import { defineConfig } from 'drizzle-kit';
export default defineConfig({ dialect: 'sqlite', schema: './src/schema.ts', out: './migrations' });
`,
  );
  patchPackage(root, 'packages/db/package.json', {
    devDependencies: { 'drizzle-kit': STACK_DEPENDENCIES['drizzle-kit'] },
    scripts: { 'db:generate': 'drizzle-kit generate' },
  });
  patchPackage(root, `apps/${runtimeApp}/package.json`, {
    dependencies: { '@workspace/db': 'workspace:*' },
  });
}
