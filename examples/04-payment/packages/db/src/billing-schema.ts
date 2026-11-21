import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
// Durable receipts deduplicate delivery; they are not proof of an entitlement.
export const billingReceipt = sqliteTable(
  'billing_receipt',
  {
    provider: text('provider').notNull(),
    eventId: text('event_id').notNull(),
    receivedAt: integer('received_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.eventId] })],
);
