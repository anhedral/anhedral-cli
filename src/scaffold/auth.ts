import { scaffoldPasswordReset } from './password-reset.js';
import { scaffoldManagedEmail } from './managed-email.js';
import { expoAuthScheme, scaffoldExpoAuth } from './expo-auth.js';
import { jsString } from '../render.js';
import { writeEnvironmentFile } from './environment.js';
import { STACK_DEPENDENCIES } from '../dependencies.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { writeBetterAuthSchema } from '../auth-schema.js';
import type { RecipeContext } from '../registry/types.js';
import { put, patchPackage, sharedPackage } from './files.js';

export function scaffoldBetterAuth({ root, updating }: RecipeContext): void {
  const scheme = expoAuthScheme(root);
  scaffoldManagedEmail(root);
  writeBetterAuthSchema(root, false);
  sharedPackage(
    root,
    'auth',
    `import { createManagedEmail, type EmailEnvironment } from '@workspace/managed-email';
import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import type { createDatabase } from '@workspace/db';
export function createAuth(db: ReturnType<typeof createDatabase>, secret: string, baseURL: string, email: EmailEnvironment = {}) {
  const sendEmail = createManagedEmail(email);
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite', transaction: false }),
    secret, baseURL,
    trustedOrigins: [new URL(baseURL).origin, ${jsString(scheme + '://')}],
    plugins: [expo()],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: Boolean(sendEmail),
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: sendEmail ? async ({ user, url }) => { await sendEmail('reset-password', user.email, url); } : undefined,
    },
    emailVerification: sendEmail ? {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => { await sendEmail('verify-email', user.email, url); },
    } : undefined,
  });
}
`,
    {
      'better-auth': STACK_DEPENDENCIES['better-auth'],
      '@better-auth/expo': STACK_DEPENDENCIES['@better-auth/expo'],
      '@better-auth/drizzle-adapter': STACK_DEPENDENCIES['@better-auth/drizzle-adapter'],
      '@workspace/db': 'workspace:*',
      '@workspace/managed-email': 'workspace:*',
    },
  );
  patchPackage(root, 'apps/api/package.json', {
    dependencies: {
      '@workspace/auth': 'workspace:*',
      '@workspace/managed-email': 'workspace:*',
      '@workspace/db': 'workspace:*',
      '@workspace/contracts': 'workspace:*',
    },
  });
  let source = readFileSync(path.join(root, 'apps/api/src/index.ts'), 'utf8');
  source =
    "import { createAuth } from '@workspace/auth';\nimport { sessionSchema } from '@workspace/contracts';\n" +
    source;
  source = source.replace(
    'export default app;',
    `app.get('/api/session', async (c) => {
  c.header('cache-control', 'private, no-store');
  const session = await createAuth(createDatabase(c.env.DB), c.env.BETTER_AUTH_SECRET, c.env.BETTER_AUTH_URL, c.env).api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);
  return c.json(sessionSchema.parse({ user: session.user }));
});
app.on(['GET', 'POST'], '/api/auth/*', (c) => createAuth(createDatabase(c.env.DB), c.env.BETTER_AUTH_SECRET, c.env.BETTER_AUTH_URL, c.env).handler(c.req.raw));
export default app;`,
  );
  put(root, 'apps/api/src/index.ts', source);
  writeEnvironmentFile(root, 'apps/api/.dev.vars.example', {
    BETTER_AUTH_SECRET: '',
    BETTER_AUTH_URL: 'http://localhost:3000',
    ANHEDRAL_EMAIL_SCOPE: '',
    ANHEDRAL_EMAIL_CAPABILITY: '',
  });
  scaffoldExpoAuth(root, scheme, !updating);
  scaffoldPasswordReset(root);
  put(
    root,
    'apps/api/src/secrets.d.ts',
    'import type { EmailEnvironment } from "@workspace/managed-email";\ndeclare global { interface Env extends EmailEnvironment { BETTER_AUTH_SECRET: string; BETTER_AUTH_URL: string } }\n',
  );
}
