CREATE TABLE `billing_accounts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`stripe_customer_id` text,
	`lease_token` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`snapshot` text DEFAULT '{}' NOT NULL,
	`checked_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_accounts_stripe_customer_id_unique` ON `billing_accounts` (`stripe_customer_id`);--> statement-breakpoint
CREATE TABLE `billing_events` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`users` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `billing_events_pending_idx` ON `billing_events` (`state`,`next_attempt_at`);