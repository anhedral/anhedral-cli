import { scaffoldContracts, scaffoldWebAuth } from './backend.js';
import { expoAuthScheme, scaffoldExpoAuth } from './expo-auth.js';
import { jsString } from '../render.js';
import { writeEnvironmentFile } from './environment.js';
import { STACK_DEPENDENCIES } from '../dependencies.js';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { writeBetterAuthSchema } from '../auth-schema.js';
import type { RecipeContext } from '../registry/types.js';
import { put, patchPackage, sharedPackage } from './files.js';
export function scaffoldBetterAuth({ root, options, runtimeApp, has }: RecipeContext): void {
  const scheme = has('expo') ? expoAuthScheme(root) : undefined;
  writeBetterAuthSchema(root, has('neon'));
  sharedPackage(
    root,
    'auth',
    `${scheme ? "import { expo } from '@better-auth/expo';\n" : ''}import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import type { createDatabase } from '@workspace/db';
export function createAuth(db: ReturnType<typeof createDatabase>, secret: string, baseURL: string, trustedOrigins: string[] = [new URL(baseURL).origin${scheme ? `, ${jsString(scheme + '://')}` : ''}]) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: '${has('neon') ? 'pg' : 'sqlite'}', transaction: false }),
    secret,
    baseURL,
    trustedOrigins,
    ${scheme ? 'plugins: [expo()],' : ''}
    emailAndPassword: { enabled: true },
  });
}
`,
    {
      'better-auth': STACK_DEPENDENCIES['better-auth'],
      ...(scheme ? { '@better-auth/expo': STACK_DEPENDENCIES['@better-auth/expo'] } : {}),
      '@better-auth/drizzle-adapter': STACK_DEPENDENCIES['@better-auth/drizzle-adapter'],
      '@workspace/db': 'workspace:*',
    },
  );
  patchPackage(root, `apps/${runtimeApp}/package.json`, {
    dependencies: { '@workspace/auth': 'workspace:*', '@workspace/db': 'workspace:*' },
  });
  const connection = has('neon') ? 'createDatabase(env.DATABASE_URL)' : 'createDatabase(env.DB)';
  if (has('hono')) {
    if (!existsSync(path.join(root, 'packages/contracts/package.json'))) scaffoldContracts(root);
    patchPackage(root, 'apps/api/package.json', {
      dependencies: { '@workspace/contracts': 'workspace:*' },
    });
    const source = readFileSync(path.join(root, 'apps/api/src/index.ts'), 'utf8');
    put(
      root,
      'apps/api/src/index.ts',
      `import { createAuth } from '@workspace/auth';\n${source.includes("import { createDatabase } from '@workspace/db'") ? '' : "import { createDatabase } from '@workspace/db';\n"}import { sessionSchema } from '@workspace/contracts';\n` +
        source.replace(
          'export default app;',
          `app.get('/api/session', async (c) => {\n  const env = c.env;\n  const session = await createAuth(${connection}, env.BETTER_AUTH_SECRET, env.BETTER_AUTH_URL).api.getSession({ headers: c.req.raw.headers });\n  c.header('cache-control', 'private, no-store');\n  if (!session) return c.json({ error: 'Unauthorized' }, 401);\n  return c.json(sessionSchema.parse({ user: session.user }));\n});\napp.on(['GET', 'POST'], '/api/auth/*', async (c) => {\n  const env = c.env;\n  const database = ${connection};\n  return await createAuth(database, env.BETTER_AUTH_SECRET, env.BETTER_AUTH_URL).handler(c.req.raw);\n});\nexport default app;`,
        ),
    );
  } else {
    put(
      root,
      'apps/web/app/api/auth/[...all]/route.ts',
      `${has('vinext') ? "import { env } from 'cloudflare:workers';" : options.hosting === 'cloudflare' ? "import { getCloudflareContext } from '@opennextjs/cloudflare';" : ''}
import { createAuth } from '@workspace/auth';
import { createDatabase } from '@workspace/db';
async function handler(request: Request) {
  ${options.hosting === 'cloudflare' && !has('vinext') ? 'const { env } = await getCloudflareContext({ async: true });' : ''}
  const database = ${options.hosting === 'vercel' ? 'createDatabase(process.env.DATABASE_URL!)' : connection};
  return await createAuth(database, ${options.hosting === 'cloudflare' ? 'env.BETTER_AUTH_SECRET, env.BETTER_AUTH_URL' : 'process.env.BETTER_AUTH_SECRET!, process.env.BETTER_AUTH_URL!'}).handler(request);
}
export { handler as GET, handler as POST };
`,
    );
    if (options.hosting === 'cloudflare' && !has('vinext'))
      put(
        root,
        'apps/web/cloudflare-env.d.ts',
        `interface CloudflareEnv { BETTER_AUTH_SECRET: string; BETTER_AUTH_URL: string; ${has('neon') ? 'DATABASE_URL: string;' : "DB: Parameters<typeof import('drizzle-orm/d1').drizzle>[0];"} }\n`,
      );
    if (has('vinext')) {
      put(
        root,
        'apps/web/secrets.d.ts',
        'declare namespace Cloudflare { interface Env { BETTER_AUTH_SECRET: string; BETTER_AUTH_URL: string } }\n',
      );
    }
    patchPackage(root, 'apps/web/package.json', {
      dependencies: { 'drizzle-orm': STACK_DEPENDENCIES['drizzle-orm'] },
    });
  }
  writeEnvironmentFile(
    root,
    `apps/${runtimeApp}/${runtimeApp === 'web' && options.hosting === 'vercel' ? '.env.example' : '.dev.vars.example'}`,
    {
      ...(has('neon') ? { DATABASE_URL: '' } : {}),
      BETTER_AUTH_SECRET: '',
      BETTER_AUTH_URL: `http://localhost:${has('vinext') || has('next') || has('expo') ? '3000' : '8787'}`,
    },
  );
  if (has('hono') && (has('vinext') || has('next'))) scaffoldWebAuth(root);
  if (scheme) scaffoldExpoAuth(root, scheme);
  if (has('hono'))
    put(
      root,
      'apps/api/src/secrets.d.ts',
      'interface Env { BETTER_AUTH_SECRET: string; BETTER_AUTH_URL: string }\n',
    );
}

export function scaffoldClerk({ root, has }: RecipeContext): void {
  if (has('next') || has('vinext')) {
    patchPackage(root, 'apps/web/package.json', {
      dependencies: { '@clerk/nextjs': STACK_DEPENDENCIES['@clerk/nextjs'] },
    });
    const layoutPath = path.join(root, 'apps/web/app/layout.tsx');
    if (existsSync(layoutPath)) {
      const layout = readFileSync(layoutPath, 'utf8');
      if (!layout.includes('ClerkProvider')) {
        const wrapped = layout.replace(
          /(<body\b[^>]*>)([\s\S]*?)(<\/body>)/,
          '$1<ClerkProvider>$2</ClerkProvider>$3',
        );
        if (wrapped === layout)
          throw new Error(
            'Cannot configure ClerkProvider: the web layout must contain a body element.',
          );
        put(
          root,
          'apps/web/app/layout.tsx',
          'import { ClerkProvider } from "@clerk/nextjs";\n' + wrapped,
        );
      }
    }
    put(
      root,
      'apps/web/app/sign-in/[[...sign-in]]/page.tsx',
      `import { Suspense } from 'react';
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <Suspense fallback={<p role="status">Loading sign in…</p>}>
      <SignIn />
    </Suspense>
  );
}
`,
    );
    put(
      root,
      'apps/web/app/sign-up/[[...sign-up]]/page.tsx',
      `import { Suspense } from 'react';
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <Suspense fallback={<p role="status">Loading sign up…</p>}>
      <SignUp />
    </Suspense>
  );
}
`,
    );
    put(
      root,
      'apps/web/proxy.ts',
      `import { clerkMiddleware } from '@clerk/nextjs/server';
import type { NextMiddleware } from 'next/server';

const proxy: NextMiddleware = clerkMiddleware();
export default proxy;
export const config = { matcher: ['/((?!_next|[^?]*\\\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)', '/(api|trpc)(.*)'] };
`,
    );
    // Middleware makes auth available; product routes must explicitly require identity and authorization.
  }
  if (has('hono')) {
    sharedPackage(
      root,
      'auth',
      `import { createClerkClient } from '@clerk/backend';

export async function authenticate(
  request: Request,
  secretKey: string,
  publishableKey: string,
  authorizedParties: string[],
) {
  if (!secretKey || !publishableKey || authorizedParties.length === 0) {
    throw new Error('Configure Clerk keys and explicit authorized origins before authenticating.');
  }
  return createClerkClient({ secretKey, publishableKey }).authenticateRequest(request, {
    authorizedParties,
  });
}
`,
      { '@clerk/backend': STACK_DEPENDENCIES['@clerk/backend'] },
    );
    writeEnvironmentFile(root, 'apps/api/.dev.vars.example', {
      CLERK_SECRET_KEY: '',
      CLERK_PUBLISHABLE_KEY: '',
    });
  }
  if (has('next') || has('vinext'))
    writeEnvironmentFile(root, 'apps/web/.env.example', {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: '',
      CLERK_SECRET_KEY: '',
    });
}
