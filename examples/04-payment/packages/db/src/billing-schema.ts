import { pgTable, text, bigint, primaryKey } from 'drizzle-orm/pg-core';
// Durable receipts deduplicate delivery; they are not proof of an entitlement.
export const billingReceipt = pgTable(
  'billing_receipt',
  {
    provider: text('provider').notNull(),
    eventId: text('event_id').notNull(),
    receivedAt: bigint('received_at', { mode: 'number' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.eventId] })],
);
