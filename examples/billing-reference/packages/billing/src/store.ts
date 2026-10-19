import { and, eq, lt, gt, sql } from 'drizzle-orm';
import type { createDatabase } from '@workspace/db';
import { billingAccounts, billingEvents } from '@workspace/db/schema';

export type Database = ReturnType<typeof createDatabase>;
export type Account = typeof billingAccounts.$inferSelect;
export type InboxEvent = typeof billingEvents.$inferSelect;
const leaseDuration = 90_000;

export function createStore(db: Database) {
  async function account(userId: string): Promise<Account | undefined> {
    return (await db.select().from(billingAccounts).where(eq(billingAccounts.userId, userId)).limit(1))[0];
  }
  async function ensure(userId: string): Promise<Account> {
    await db.insert(billingAccounts).values({ userId }).onConflictDoNothing();
    const value = await account(userId);
    if (!value) throw new Error('Billing account unavailable.');
    return value;
  }
  async function acquire(userId: string): Promise<Account | undefined> {
    await ensure(userId);
    return (await db.update(billingAccounts).set({ leaseToken: crypto.randomUUID(), leaseUntil: Date.now() + leaseDuration })
      .where(and(eq(billingAccounts.userId, userId), lt(billingAccounts.leaseUntil, Date.now())))
      .returning())[0];
  }
  function owned(value: Account) {
    if (!value.leaseToken) throw new Error('Billing lease required.');
    return and(eq(billingAccounts.userId, value.userId), eq(billingAccounts.leaseToken, value.leaseToken), gt(billingAccounts.leaseUntil, Date.now()));
  }
  async function customer(value: Account, customerId: string): Promise<void> {
    const saved = await db.update(billingAccounts).set({ stripeCustomerId: customerId }).where(owned(value)).returning();
    if (!saved.length) throw new Error('Billing lease expired.');
  }
  async function commit(value: Account, snapshot: string, checkedAt: number): Promise<void> {
    const saved = await db.update(billingAccounts).set({ snapshot, checkedAt, leaseToken: null, leaseUntil: 0 }).where(owned(value)).returning();
    if (!saved.length) throw new Error('Billing lease expired.');
  }
  async function release(value: Account): Promise<void> {
    if (!value.leaseToken) return;
    await db.update(billingAccounts).set({ leaseToken: null, leaseUntil: 0 })
      .where(and(eq(billingAccounts.userId, value.userId), eq(billingAccounts.leaseToken, value.leaseToken)));
  }
  async function known(userIds: string[]): Promise<string[]> {
    const result: string[] = [];
    for (const userId of [...new Set(userIds)].slice(0, 50)) {
      if (await account(userId)) result.push(userId);
    }
    return result;
  }
  async function customerOwner(customerId: string): Promise<Account | undefined> {
    return (await db.select().from(billingAccounts).where(eq(billingAccounts.stripeCustomerId, customerId)).limit(1))[0];
  }
  async function inbox(provider: string, eventId: string, userIds: string[]): Promise<InboxEvent> {
    const id = provider + ':' + eventId;
    await db.insert(billingEvents).values({ id, provider, users: JSON.stringify(userIds), createdAt: Date.now() }).onConflictDoNothing();
    const result = (await db.select().from(billingEvents).where(eq(billingEvents.id, id)).limit(1))[0];
    if (!result) throw new Error('Billing inbox unavailable.');
    return result;
  }
  async function complete(id: string): Promise<void> {
    await db.update(billingEvents).set({ state: 'done' }).where(eq(billingEvents.id, id));
  }
  async function failed(id: string): Promise<void> {
    await db.update(billingEvents).set({ attempts: sql`${billingEvents.attempts} + 1`, nextAttemptAt: Date.now() + 60_000 }).where(eq(billingEvents.id, id));
  }
  async function pending(): Promise<InboxEvent[]> {
    return db.select().from(billingEvents).where(and(eq(billingEvents.state, 'pending'), lt(billingEvents.nextAttemptAt, Date.now()))).limit(10);
  }
  return { account, ensure, acquire, customer, commit, release, known, customerOwner, inbox, complete, failed, pending };
}
export type Store = ReturnType<typeof createStore>;
