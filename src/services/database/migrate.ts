// Database Migration Runner for Expo SQLite + Drizzle
// Runs migrations on app startup

import { db } from './drizzle';
import { sql } from 'drizzle-orm';

interface Migration {
  version: number;
  name: string;
  statements: string[];
}

// Register all migrations here with SQL embedded as strings
// When adding new migrations, copy the SQL from drizzle-migrations/*.sql
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: '0000_initial_schema',
    statements: [
      // Accounts
      `CREATE TABLE IF NOT EXISTS \`accounts\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`name\` text NOT NULL,
        \`type\` text NOT NULL,
        \`balance_paise\` integer DEFAULT 0,
        \`currency\` text DEFAULT 'INR',
        \`icon\` text,
        \`color\` text,
        \`is_active\` integer DEFAULT 1,
        \`sort_order\` integer DEFAULT 0,
        \`deleted_at\` text,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS \`idx_accounts_active\` ON \`accounts\` (\`is_active\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_accounts_deleted\` ON \`accounts\` (\`deleted_at\`)`,

      // Categories
      `CREATE TABLE IF NOT EXISTS \`categories\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`name\` text NOT NULL,
        \`type\` text NOT NULL,
        \`parent_id\` text,
        \`icon\` text,
        \`color\` text,
        \`is_system\` integer DEFAULT 0,
        \`is_active\` integer DEFAULT 1,
        \`sort_order\` integer DEFAULT 0,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS \`idx_categories_type\` ON \`categories\` (\`type\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_categories_parent\` ON \`categories\` (\`parent_id\`)`,

      // Transactions
      `CREATE TABLE IF NOT EXISTS \`transactions\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`schema_version\` text DEFAULT '1.0',
        \`transaction_type\` text NOT NULL,
        \`amount_paise\` integer NOT NULL,
        \`currency\` text DEFAULT 'INR',
        \`merchant\` text,
        \`category_id\` text REFERENCES \`categories\`(\`id\`),
        \`occurred_at\` text NOT NULL,
        \`payment_account_id\` text NOT NULL REFERENCES \`accounts\`(\`id\`),
        \`transfer_to_account_id\` text REFERENCES \`accounts\`(\`id\`),
        \`refund_of_transaction_id\` text,
        \`note\` text,
        \`confidence\` real DEFAULT 1,
        \`source\` text DEFAULT 'manual',
        \`is_ai_generated\` integer DEFAULT 0,
        \`was_user_edited\` integer DEFAULT 0,
        \`original_ai_category_id\` text,
        \`deleted_at\` text,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS \`idx_transactions_occurred\` ON \`transactions\` (\`occurred_at\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_transactions_category\` ON \`transactions\` (\`category_id\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_transactions_account\` ON \`transactions\` (\`payment_account_id\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_transactions_deleted\` ON \`transactions\` (\`deleted_at\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_transactions_ai\` ON \`transactions\` (\`is_ai_generated\`, \`was_user_edited\`)`,

      // Transaction Splits
      `CREATE TABLE IF NOT EXISTS \`transaction_splits\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`transaction_id\` text NOT NULL REFERENCES \`transactions\`(\`id\`) ON DELETE CASCADE,
        \`category_id\` text NOT NULL REFERENCES \`categories\`(\`id\`),
        \`amount_paise\` integer NOT NULL,
        \`note\` text,
        \`created_at\` text NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS \`idx_splits_transaction\` ON \`transaction_splits\` (\`transaction_id\`)`,

      // Recurring Rules
      `CREATE TABLE IF NOT EXISTS \`recurring_rules\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`transaction_type\` text NOT NULL,
        \`amount_paise\` integer NOT NULL,
        \`currency\` text DEFAULT 'INR',
        \`merchant\` text,
        \`category_id\` text REFERENCES \`categories\`(\`id\`),
        \`payment_account_id\` text NOT NULL REFERENCES \`accounts\`(\`id\`),
        \`transfer_to_account_id\` text REFERENCES \`accounts\`(\`id\`),
        \`note\` text,
        \`frequency\` text NOT NULL,
        \`day_of_week\` integer,
        \`day_of_month\` integer,
        \`month_of_year\` integer,
        \`start_date\` text NOT NULL,
        \`end_date\` text,
        \`next_occurrence\` text NOT NULL,
        \`last_created_at\` text,
        \`is_active\` integer DEFAULT 1,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS \`idx_recurring_next\` ON \`recurring_rules\` (\`next_occurrence\`, \`is_active\`)`,

      // AI Learning Events
      `CREATE TABLE IF NOT EXISTS \`ai_learning_events\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`transaction_id\` text REFERENCES \`transactions\`(\`id\`),
        \`changes\` text NOT NULL,
        \`input_text\` text,
        \`input_source\` text,
        \`merchant_normalized\` text,
        \`is_useful_for_learning\` integer,
        \`created_at\` text NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS \`idx_learning_merchant\` ON \`ai_learning_events\` (\`merchant_normalized\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_learning_transaction\` ON \`ai_learning_events\` (\`transaction_id\`)`,

      // Merchant Rules
      `CREATE TABLE IF NOT EXISTS \`merchant_rules\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`merchant_pattern\` text NOT NULL,
        \`category_id\` text NOT NULL REFERENCES \`categories\`(\`id\`),
        \`confidence\` real DEFAULT 1,
        \`match_count\` integer DEFAULT 0,
        \`last_matched_at\` text,
        \`is_user_created\` integer DEFAULT 0,
        \`learned_from_event_id\` text REFERENCES \`ai_learning_events\`(\`id\`),
        \`is_enabled\` integer DEFAULT 1,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS \`idx_merchant_pattern_unique\` ON \`merchant_rules\` (\`merchant_pattern\`)`,

      // Budgets
      `CREATE TABLE IF NOT EXISTS \`budgets\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`category_id\` text NOT NULL REFERENCES \`categories\`(\`id\`),
        \`limit_paise\` integer NOT NULL,
        \`month\` text NOT NULL,
        \`created_at\` text NOT NULL,
        \`updated_at\` text NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS \`idx_budget_category_month\` ON \`budgets\` (\`category_id\`, \`month\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_budget_month\` ON \`budgets\` (\`month\`)`,

      // App Settings
      `CREATE TABLE IF NOT EXISTS \`app_settings\` (
        \`id\` integer PRIMARY KEY NOT NULL,
        \`is_onboarded\` integer DEFAULT 0,
        \`device_tier\` text DEFAULT 'core',
        \`selected_model_id\` text,
        \`byok_enabled\` integer DEFAULT 0,
        \`byok_provider\` text,
        \`byok_model\` text,
        \`theme\` text DEFAULT 'system',
        \`default_account_id\` text REFERENCES \`accounts\`(\`id\`),
        \`updated_at\` text NOT NULL
      )`,
      `INSERT OR IGNORE INTO app_settings (id, updated_at) VALUES (1, datetime('now'))`,

      // Model Packages
      `CREATE TABLE IF NOT EXISTS \`model_packages\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`name\` text NOT NULL,
        \`model_id\` text NOT NULL,
        \`version\` text NOT NULL,
        \`download_size_bytes\` integer NOT NULL,
        \`storage_size_bytes\` integer NOT NULL,
        \`supports_text\` integer DEFAULT 1,
        \`supports_vision\` integer DEFAULT 0,
        \`min_tier\` text DEFAULT 'ai_lite',
        \`download_url\` text NOT NULL,
        \`checksum\` text NOT NULL,
        \`is_installed\` integer DEFAULT 0,
        \`local_path\` text,
        \`installed_at\` text
      )`,

      // Import Jobs
      `CREATE TABLE IF NOT EXISTS \`import_jobs\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`filename\` text NOT NULL,
        \`total_rows\` integer DEFAULT 0,
        \`imported_rows\` integer DEFAULT 0,
        \`failed_rows\` integer DEFAULT 0,
        \`status\` text DEFAULT 'pending',
        \`error_details\` text,
        \`created_at\` text NOT NULL,
        \`completed_at\` text
      )`,
    ],
  },
  {
    version: 2,
    name: '0001_sync_and_user_id',
    statements: [
      // Add userId to core tables (nullable — null = local-only)
      `ALTER TABLE \`accounts\` ADD COLUMN \`user_id\` text`,
      `ALTER TABLE \`categories\` ADD COLUMN \`user_id\` text`,
      `ALTER TABLE \`transactions\` ADD COLUMN \`user_id\` text`,

      // Add sync settings to app_settings
      `ALTER TABLE \`app_settings\` ADD COLUMN \`sync_enabled\` integer DEFAULT 0`,
      `ALTER TABLE \`app_settings\` ADD COLUMN \`supabase_user_id\` text`,
      `ALTER TABLE \`app_settings\` ADD COLUMN \`last_synced_at\` text`,

      // Sync queue — outbox for pending cloud operations
      `CREATE TABLE IF NOT EXISTS \`sync_queue\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`entity_type\` text NOT NULL,
        \`entity_id\` text NOT NULL,
        \`operation\` text NOT NULL,
        \`payload\` text NOT NULL,
        \`status\` text DEFAULT 'pending' NOT NULL,
        \`attempts\` integer DEFAULT 0,
        \`last_error\` text,
        \`created_at\` text NOT NULL,
        \`synced_at\` text
      )`,

      // Indexes
      `CREATE INDEX IF NOT EXISTS \`idx_accounts_user\` ON \`accounts\` (\`user_id\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_categories_user\` ON \`categories\` (\`user_id\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_transactions_user\` ON \`transactions\` (\`user_id\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_sync_queue_status\` ON \`sync_queue\` (\`status\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_sync_queue_entity\` ON \`sync_queue\` (\`entity_type\`, \`entity_id\`)`,
    ],
  },
];

/**
 * Run pending database migrations
 * Uses expo-sqlite directly for migration execution
 */
export async function runMigrations(expoDb: any): Promise<void> {
  console.log('Running database migrations...');

  // Enable foreign keys
  await expoDb.execAsync('PRAGMA foreign_keys = ON;');

  // Create migrations tracking table if not exists
  await expoDb.execAsync(`
    CREATE TABLE IF NOT EXISTS _drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  // Get applied migrations
  const applied = (await expoDb.getAllAsync(
    'SELECT version FROM _drizzle_migrations ORDER BY version'
  )) as { version: number }[];
  const appliedVersions = new Set(applied.map((m) => m.version));

  // Run pending migrations
  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) {
      console.log(`Migration ${migration.version} already applied, skipping`);
      continue;
    }

    console.log(`Applying migration ${migration.version}: ${migration.name}`);

    try {
      // Execute each statement
      for (const statement of migration.statements) {
        await expoDb.execAsync(statement);
      }

      // Record migration
      await expoDb.runAsync(
        'INSERT INTO _drizzle_migrations (version, name, applied_at) VALUES (?, ?, ?)',
        [migration.version, migration.name, new Date().toISOString()]
      );

      console.log(`Migration ${migration.version} applied successfully`);
    } catch (error) {
      console.error(`Migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  console.log('All migrations complete');
}

/**
 * Get current schema version
 */
export async function getSchemaVersion(expoDb: any): Promise<number> {
  try {
    const result = (await expoDb.getFirstAsync(
      'SELECT COALESCE(MAX(version), 0) as version FROM _drizzle_migrations'
    )) as { version: number } | null;
    return result?.version ?? 0;
  } catch {
    return 0;
  }
}
