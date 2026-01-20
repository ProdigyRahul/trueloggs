CREATE TABLE `invoices` (
	`cloud_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`local_id` integer,
	`invoice_number` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`invoice_date` text NOT NULL,
	`due_date` text NOT NULL,
	`paid_at` text,
	`company_name` text NOT NULL,
	`company_email` text NOT NULL,
	`company_phone` text NOT NULL,
	`company_address` text NOT NULL,
	`client_name` text NOT NULL,
	`client_email` text,
	`project_name` text NOT NULL,
	`project_color` text NOT NULL,
	`project_cloud_id` text,
	`line_items` text NOT NULL,
	`subtotal` real NOT NULL,
	`tax_rate` real NOT NULL,
	`tax_amount` real NOT NULL,
	`total` real NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`notes` text,
	`payment_terms` text,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_cloud_id`) REFERENCES `projects`(`cloud_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`cloud_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`local_id` integer,
	`name` text NOT NULL,
	`client_name` text,
	`hourly_rate` real NOT NULL,
	`color` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recent_tasks` (
	`cloud_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`local_id` integer,
	`project_cloud_id` text NOT NULL,
	`task_description` text NOT NULL,
	`last_used_at` text DEFAULT (datetime('now')) NOT NULL,
	`usage_count` integer DEFAULT 1 NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_cloud_id`) REFERENCES `projects`(`cloud_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`profile_full_name` text DEFAULT '',
	`profile_email` text DEFAULT '',
	`profile_company` text DEFAULT '',
	`profile_phone` text DEFAULT '',
	`profile_address` text DEFAULT '',
	`profile_bio` text DEFAULT '',
	`target_hours_per_week` integer DEFAULT 40 NOT NULL,
	`default_hourly_rate` real DEFAULT 50 NOT NULL,
	`work_days` text DEFAULT '[false,true,true,true,true,true,false]' NOT NULL,
	`invoice_counter` integer DEFAULT 0 NOT NULL,
	`invoice_prefix` text DEFAULT 'INV' NOT NULL,
	`last_invoice_year` integer NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sync_metadata` (
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`last_synced_at` text DEFAULT (datetime('now')) NOT NULL,
	`last_sync_version` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `entity_type`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `time_entries` (
	`cloud_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`local_id` integer,
	`project_cloud_id` text NOT NULL,
	`date` text NOT NULL,
	`duration` integer NOT NULL,
	`notes` text,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_cloud_id`) REFERENCES `projects`(`cloud_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `timer_states` (
	`user_id` text PRIMARY KEY NOT NULL,
	`is_running` integer DEFAULT false NOT NULL,
	`project_cloud_id` text,
	`task_description` text DEFAULT '',
	`started_at` text,
	`accumulated_seconds` integer DEFAULT 0 NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_cloud_id`) REFERENCES `projects`(`cloud_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`full_name` text,
	`avatar_url` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
