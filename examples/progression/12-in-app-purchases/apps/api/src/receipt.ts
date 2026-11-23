import { withDatabase } from '@workspace/db';
import { billingReceipt } from '@workspace/db/schema';
import type { AppEnv } from './environment';
export function recordReceipt(env: AppEnv['Bindings'], eventId: string) {
  return withDatabase(env.DATABASE_URL, (db) =>
    db
      .insert(billingReceipt)
      .values({ provider: 'stripe', eventId, receivedAt: Date.now() })
      .onConflictDoNothing(),
  );
}
