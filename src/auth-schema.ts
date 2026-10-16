import path from 'node:path';
import { betterAuthSqliteSnapshot } from './auth-schema-snapshot.js';
import { writeFile } from './util.js';

// Better Auth 1.7.7 core user/session/account/verification schema, without plugins.
// Product plugins/additional fields require a reviewed schema regeneration/migration.
export function writeBetterAuthSchema(root: string, postgres: boolean): void {
  const table = postgres ? 'pgTable' : 'sqliteTable';
  const date = (column: string) =>
    postgres
      ? `timestamp('${column}', { withTimezone: true })`
      : `integer('${column}', { mode: 'timestamp_ms' })`;
  const bool = postgres
    ? "boolean('email_verified')"
    : "integer('email_verified', { mode: 'boolean' })";
  const updated = `${date('updated_at')}.notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date())`;
  const created = `${date('created_at')}.notNull().$defaultFn(() => new Date())`;
  const schema = `import { ${table}, text, ${postgres ? 'timestamp, boolean' : 'integer'}, index } from 'drizzle-orm/${postgres ? 'pg-core' : 'sqlite-core'}';
export const user = ${table}('user', {
  id: text('id').primaryKey(), name: text('name').notNull(), email: text('email').notNull().unique(),
  emailVerified: ${bool}.notNull().default(false), image: text('image'), createdAt: ${created}, updatedAt: ${updated},
});
export const session = ${table}('session', {
  id: text('id').primaryKey(), expiresAt: ${date('expires_at')}.notNull(), token: text('token').notNull().unique(),
  createdAt: ${created}, updatedAt: ${updated}, ipAddress: text('ip_address'), userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
}, (table) => [index('session_user_id_idx').on(table.userId)]);
export const account = ${table}('account', {
  id: text('id').primaryKey(), accountId: text('account_id').notNull(), providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'), refreshToken: text('refresh_token'), idToken: text('id_token'),
  accessTokenExpiresAt: ${date('access_token_expires_at')}, refreshTokenExpiresAt: ${date('refresh_token_expires_at')},
  scope: text('scope'), password: text('password'), createdAt: ${created}, updatedAt: ${updated},
}, (table) => [index('account_user_id_idx').on(table.userId)]);
export const verification = ${table}('verification', {
  id: text('id').primaryKey(), identifier: text('identifier').notNull(), value: text('value').notNull(),
  expiresAt: ${date('expires_at')}.notNull(), createdAt: ${created}, updatedAt: ${updated},
}, (table) => [index('verification_identifier_idx').on(table.identifier)]);
`;
  writeFile(path.join(root, 'packages/db/src/schema.ts'), schema);
  if (!postgres) {
    writeFile(
      path.join(root, 'packages/db/drizzle/meta/0000_snapshot.json'),
      JSON.stringify(betterAuthSqliteSnapshot, null, 2) + '\n',
    );
    writeFile(
      path.join(root, 'packages/db/drizzle/meta/_journal.json'),
      JSON.stringify(
        {
          version: '7',
          dialect: 'sqlite',
          entries: [
            {
              idx: 0,
              version: '6',
              when: 1791504000000,
              tag: '0000_better_auth',
              breakpoints: true,
            },
          ],
        },
        null,
        2,
      ) + '\n',
    );
  }
  if (!postgres)
    writeFile(
      path.join(root, 'packages/db/drizzle/0000_better_auth.sql'),
      'CREATE TABLE `account` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`account_id` text NOT NULL,\n\t`provider_id` text NOT NULL,\n\t`user_id` text NOT NULL,\n\t`access_token` text,\n\t`refresh_token` text,\n\t`id_token` text,\n\t`access_token_expires_at` integer,\n\t`refresh_token_expires_at` integer,\n\t`scope` text,\n\t`password` text,\n\t`created_at` integer NOT NULL,\n\t`updated_at` integer NOT NULL,\n\tFOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade\n);\n--> statement-breakpoint\nCREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint\nCREATE TABLE `session` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`expires_at` integer NOT NULL,\n\t`token` text NOT NULL,\n\t`created_at` integer NOT NULL,\n\t`updated_at` integer NOT NULL,\n\t`ip_address` text,\n\t`user_agent` text,\n\t`user_id` text NOT NULL,\n\tFOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade\n);\n--> statement-breakpoint\nCREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint\nCREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint\nCREATE TABLE `user` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`name` text NOT NULL,\n\t`email` text NOT NULL,\n\t`email_verified` integer DEFAULT false NOT NULL,\n\t`image` text,\n\t`created_at` integer NOT NULL,\n\t`updated_at` integer NOT NULL\n);\n--> statement-breakpoint\nCREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint\nCREATE TABLE `verification` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`identifier` text NOT NULL,\n\t`value` text NOT NULL,\n\t`expires_at` integer NOT NULL,\n\t`created_at` integer NOT NULL,\n\t`updated_at` integer NOT NULL\n);\n--> statement-breakpoint\nCREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);',
    );
}
