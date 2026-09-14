CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`balance_paise` integer DEFAULT 0,
	`currency` text DEFAULT 'INR',
	`icon` text,
	`color` text,
	`is_active` integer DEFAULT true,
	`sort_order` integer DEFAULT 0,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_accounts_active` ON `accounts` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_accounts_deleted` ON `accounts` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `ai_learning_events` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text,
	`changes` text NOT NULL,
	`input_text` text,
	`input_source` text,
	`merchant_normalized` text,
	`is_useful_for_learning` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_learning_merchant` ON `ai_learning_events` (`merchant_normalized`);--> statement-breakpoint
CREATE INDEX `idx_learning_transaction` ON `ai_learning_events` (`transaction_id`);--> statement-breakpoint
CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`is_onboarded` integer DEFAULT false,
	`device_tier` text DEFAULT 'core',
	`selected_model_id` text,
	`byok_enabled` integer DEFAULT false,
	`byok_provider` text,
	`byok_model` text,
	`theme` text DEFAULT 'system',
	`default_account_id` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`default_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`limit_paise` integer NOT NULL,
	`month` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_budget_category_month` ON `budgets` (`category_id`,`month`);--> statement-breakpoint
CREATE INDEX `idx_budget_month` ON `budgets` (`month`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`parent_id` text,
	`icon` text,
	`color` text,
	`is_system` integer DEFAULT false,
	`is_active` integer DEFAULT true,
	`sort_order` integer DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_categories_type` ON `categories` (`type`);--> statement-breakpoint
CREATE INDEX `idx_categories_parent` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE TABLE `import_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`total_rows` integer DEFAULT 0,
	`imported_rows` integer DEFAULT 0,
	`failed_rows` integer DEFAULT 0,
	`status` text DEFAULT 'pending',
	`error_details` text,
	`created_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE TABLE `merchant_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_pattern` text NOT NULL,
	`category_id` text NOT NULL,
	`confidence` real DEFAULT 1,
	`match_count` integer DEFAULT 0,
	`last_matched_at` text,
	`is_user_created` integer DEFAULT false,
	`learned_from_event_id` text,
	`is_enabled` integer DEFAULT true,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`learned_from_event_id`) REFERENCES `ai_learning_events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_merchant_pattern_unique` ON `merchant_rules` (`merchant_pattern`);--> statement-breakpoint
CREATE TABLE `model_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`model_id` text NOT NULL,
	`version` text NOT NULL,
	`download_size_bytes` integer NOT NULL,
	`storage_size_bytes` integer NOT NULL,
	`supports_text` integer DEFAULT true,
	`supports_vision` integer DEFAULT false,
	`min_tier` text DEFAULT 'ai_lite',
	`download_url` text NOT NULL,
	`checksum` text NOT NULL,
	`is_installed` integer DEFAULT false,
	`local_path` text,
	`installed_at` text
);
--> statement-breakpoint
CREATE TABLE `recurring_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_type` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`currency` text DEFAULT 'INR',
	`merchant` text,
	`category_id` text,
	`payment_account_id` text NOT NULL,
	`transfer_to_account_id` text,
	`note` text,
	`frequency` text NOT NULL,
	`day_of_week` integer,
	`day_of_month` integer,
	`month_of_year` integer,
	`start_date` text NOT NULL,
	`end_date` text,
	`next_occurrence` text NOT NULL,
	`last_created_at` text,
	`is_active` integer DEFAULT true,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transfer_to_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_recurring_next` ON `recurring_rules` (`next_occurrence`,`is_active`);--> statement-breakpoint
CREATE TABLE `schema_migrations` (
	`version` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`applied_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transaction_splits` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`category_id` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_splits_transaction` ON `transaction_splits` (`transaction_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`schema_version` text DEFAULT '1.0',
	`transaction_type` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`currency` text DEFAULT 'INR',
	`merchant` text,
	`category_id` text,
	`occurred_at` text NOT NULL,
	`payment_account_id` text NOT NULL,
	`transfer_to_account_id` text,
	`refund_of_transaction_id` text,
	`note` text,
	`confidence` real DEFAULT 1,
	`source` text DEFAULT 'manual',
	`is_ai_generated` integer DEFAULT false,
	`was_user_edited` integer DEFAULT false,
	`original_ai_category_id` text,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transfer_to_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_transactions_occurred` ON `transactions` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_transactions_category` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_account` ON `transactions` (`payment_account_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_deleted` ON `transactions` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_transactions_ai` ON `transactions` (`is_ai_generated`,`was_user_edited`);