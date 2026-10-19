import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import type { createDatabase } from '@workspace/db';
export function createAuth(db: ReturnType<typeof createDatabase>, secret: string, baseURL: string, trustedOrigins: string[] = [new URL(baseURL).origin, "billing-reference://"]) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite', transaction: false }),
    secret,
    baseURL,
    trustedOrigins,
    plugins: [expo()],
    emailAndPassword: { enabled: true },
  });
}
