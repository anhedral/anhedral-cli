import { z } from 'zod';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { platformAuthPlugins } from './auth-platform';
import { bearer } from 'better-auth/plugins/bearer';
import { createDatabase } from '@workspace/db';
import * as schema from '@workspace/db/schema';
import { authFeatures } from './auth-features';
import type { AppEnv } from './environment';

export const authConfiguration = z.object({
  PUBLIC_APP_URL: z.url().regex(/^https?:\/\//),
  BETTER_AUTH_SECRET: z.string().min(32),
});
export function createAuth(env: AppEnv['Bindings']) {
  const configuration = authConfiguration.parse(env);
  const origin = new URL(configuration.PUBLIC_APP_URL).origin;
  return betterAuth({
    secret: configuration.BETTER_AUTH_SECRET,
    baseURL: origin,
    basePath: '/api/auth',
    database: drizzleAdapter(createDatabase(env.DB), { provider: 'sqlite', schema }),
    emailAndPassword: { enabled: authFeatures.emailPassword },
    trustedOrigins: [
      origin,
      ...(env.AUTH_TRUSTED_ORIGINS?.split(',')
        .map((v) => v.trim())
        .filter(Boolean) ?? []),
    ],
    plugins: [bearer(), ...platformAuthPlugins()],
  });
}
