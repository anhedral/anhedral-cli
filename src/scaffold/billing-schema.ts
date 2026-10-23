import { readFileSync } from 'node:fs';
import path from 'node:path';
import { put } from './files.js';

export function scaffoldBillingSchema(root: string): void {
  const table = 'sqliteTable';
  const integer = 'integer(name)';
  put(
    root,
    'packages/db/src/billing-schema.ts',
    `import { ${table}, text, integer, index } from 'drizzle-orm/sqlite-core';
const number = (name: string) => ${integer};

// Billing IDs are verified auth subjects, including external identity providers.
// They are never inferred from email addresses or client purchase claims.
export const billingAccounts = ${table}('billing_accounts', {
  userId: text('user_id').primaryKey(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  leaseToken: text('lease_token'),
  leaseUntil: number('lease_until').notNull().default(0),
  snapshot: text('snapshot').notNull().default('{}'),
  checkedAt: number('checked_at').notNull().default(0),
});
export const billingEvents = ${table}('billing_events', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  users: text('users').notNull(),
  state: text('state').notNull().default('pending'),
  attempts: number('attempts').notNull().default(0),
  nextAttemptAt: number('next_attempt_at').notNull().default(0),
  createdAt: number('created_at').notNull(),
}, (table) => [index('billing_events_pending_idx').on(table.state, table.nextAttemptAt)]);
`,
  );
  const file = 'packages/db/src/schema.ts';
  const source = readFileSync(path.join(root, file), 'utf8');
  if (!source.includes("export * from './billing-schema'"))
    put(root, file, source + "\nexport * from './billing-schema';\n");
}
