import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import type { createDatabase } from '@workspace/db';
export function createAuth(db: ReturnType<typeof createDatabase>, secret: string, baseURL: string) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite', transaction: false }),
    secret,
    baseURL,
    emailAndPassword: { enabled: true },
  });
}
