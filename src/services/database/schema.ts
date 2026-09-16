// Drizzle ORM Schema for AI Wallet
// All tables defined with TypeScript-first approach

import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ACCOUNTS
// ============================================================================
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(),
  type: text('type', { enum: ['cash', 'bank', 'card', 'wallet'] }).notNull(),

  // Money stored as INTEGER in paise (100 paise = ₹1)
  balancePaise: integer('balance_paise').default(0),
  currency: text('currency').default('INR'),

  icon: text('icon'),
  color: text('color'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  sortOrder: integer('sort_order').default(0),

  // Soft delete - NULL means active, ISO timestamp means deleted
  deletedAt: text('deleted_at'),

  // Cloud sync — null means local-only (user not signed in)
  userId: text('user_id'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_accounts_active').on(table.isActive),
  index('idx_accounts_deleted').on(table.deletedAt),
  index('idx_accounts_user').on(table.userId),
]);

// ============================================================================
// CATEGORIES
// ============================================================================
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(),
  type: text('type', { enum: ['expense', 'income'] }).notNull(),

  // Self-referencing for hierarchy (subcategories)
  parentId: text('parent_id'),

  icon: text('icon'),
  color: text('color'),
  isSystem: integer('is_system', { mode: 'boolean' }).default(false), // System categories can't be deleted
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  sortOrder: integer('sort_order').default(0),

  userId: text('user_id'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_categories_type').on(table.type),
  index('idx_categories_parent').on(table.parentId),
  index('idx_categories_user').on(table.userId),
]);

// ============================================================================
// TRANSACTIONS
// ============================================================================
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(), // UUID
  schemaVersion: text('schema_version').default('1.0'),

  // Transaction type - includes 'adjustment' for misc/settling
  transactionType: text('transaction_type', {
    enum: ['expense', 'income', 'transfer', 'refund', 'adjustment']
  }).notNull(),

  // Money stored as INTEGER in paise
  amountPaise: integer('amount_paise').notNull(),
  currency: text('currency').default('INR'),

  // Core transaction data
  merchant: text('merchant'),
  categoryId: text('category_id').references(() => categories.id),
  occurredAt: text('occurred_at').notNull(), // ISO timestamp
  paymentAccountId: text('payment_account_id').references(() => accounts.id).notNull(),

  // For transfers
  transferToAccountId: text('transfer_to_account_id').references(() => accounts.id),

  // For refunds - links to original transaction
  refundOfTransactionId: text('refund_of_transaction_id'),

  note: text('note'),

  // AI confidence score (0.0 - 1.0)
  confidence: real('confidence').default(1.0),

  // How was this transaction created
  source: text('source', {
    enum: ['manual', 'text', 'voice', 'image', 'connected_byok']
  }).default('manual'),

  // AI tracking for analytics and learning
  isAiGenerated: integer('is_ai_generated', { mode: 'boolean' }).default(false),
  wasUserEdited: integer('was_user_edited', { mode: 'boolean' }).default(false),
  originalAiCategoryId: text('original_ai_category_id'), // Store AI's original guess

  // Soft delete
  deletedAt: text('deleted_at'),

  userId: text('user_id'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_transactions_occurred').on(table.occurredAt),
  index('idx_transactions_category').on(table.categoryId),
  index('idx_transactions_account').on(table.paymentAccountId),
  index('idx_transactions_deleted').on(table.deletedAt),
  index('idx_transactions_ai').on(table.isAiGenerated, table.wasUserEdited),
  index('idx_transactions_user').on(table.userId),
]);

// ============================================================================
// TRANSACTION SPLITS (for splitting across categories)
// ============================================================================
export const transactionSplits = sqliteTable('transaction_splits', {
  id: text('id').primaryKey(), // UUID
  transactionId: text('transaction_id').references(() => transactions.id, { onDelete: 'cascade' }).notNull(),
  categoryId: text('category_id').references(() => categories.id).notNull(),
  amountPaise: integer('amount_paise').notNull(),
  note: text('note'),

  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_splits_transaction').on(table.transactionId),
]);

// ============================================================================
// RECURRING RULES
// ============================================================================
export const recurringRules = sqliteTable('recurring_rules', {
  id: text('id').primaryKey(), // UUID

  // Transaction template
  transactionType: text('transaction_type', {
    enum: ['expense', 'income', 'transfer']
  }).notNull(),
  amountPaise: integer('amount_paise').notNull(),
  currency: text('currency').default('INR'),
  merchant: text('merchant'),
  categoryId: text('category_id').references(() => categories.id),
  paymentAccountId: text('payment_account_id').references(() => accounts.id).notNull(),
  transferToAccountId: text('transfer_to_account_id').references(() => accounts.id),
  note: text('note'),

  // Schedule
  frequency: text('frequency', {
    enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']
  }).notNull(),
  dayOfWeek: integer('day_of_week'), // 0-6 for weekly (0 = Sunday)
  dayOfMonth: integer('day_of_month'), // 1-31 for monthly
  monthOfYear: integer('month_of_year'), // 1-12 for yearly

  // Scheduling dates
  startDate: text('start_date').notNull(),
  endDate: text('end_date'), // NULL = no end
  nextOccurrence: text('next_occurrence').notNull(),
  lastCreatedAt: text('last_created_at'),

  isActive: integer('is_active', { mode: 'boolean' }).default(true),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_recurring_next').on(table.nextOccurrence, table.isActive),
]);

// ============================================================================
// AI LEARNING EVENTS
// ============================================================================
export const aiLearningEvents = sqliteTable('ai_learning_events', {
  id: text('id').primaryKey(), // UUID
  transactionId: text('transaction_id').references(() => transactions.id),

  // JSON array: [{"field": "category_id", "from": "x", "to": "y"}, ...]
  changes: text('changes', { mode: 'json' }).$type<Array<{
    field: string;
    from: string | number | null;
    to: string | number | null;
  }>>().notNull(),

  // Context for learning
  inputText: text('input_text'), // Original user input
  inputSource: text('input_source', { enum: ['text', 'voice', 'image'] }),
  merchantNormalized: text('merchant_normalized'), // Lowercase, trimmed

  // Learning evaluation
  isUsefulForLearning: integer('is_useful_for_learning', { mode: 'boolean' }), // NULL = not evaluated

  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_learning_merchant').on(table.merchantNormalized),
  index('idx_learning_transaction').on(table.transactionId),
]);

// ============================================================================
// MERCHANT RULES (learned mappings)
// ============================================================================
export const merchantRules = sqliteTable('merchant_rules', {
  id: text('id').primaryKey(), // UUID

  merchantPattern: text('merchant_pattern').notNull(), // Normalized (lowercase, trimmed)
  categoryId: text('category_id').references(() => categories.id).notNull(),

  confidence: real('confidence').default(1.0),
  matchCount: integer('match_count').default(0),
  lastMatchedAt: text('last_matched_at'),

  isUserCreated: integer('is_user_created', { mode: 'boolean' }).default(false),
  learnedFromEventId: text('learned_from_event_id').references(() => aiLearningEvents.id),

  isEnabled: integer('is_enabled', { mode: 'boolean' }).default(true),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  uniqueIndex('idx_merchant_pattern_unique').on(table.merchantPattern),
]);

// ============================================================================
// BUDGETS
// ============================================================================
export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(), // UUID
  categoryId: text('category_id').references(() => categories.id).notNull(),

  limitPaise: integer('limit_paise').notNull(), // Monthly budget limit
  month: text('month').notNull(), // Format: YYYY-MM

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  uniqueIndex('idx_budget_category_month').on(table.categoryId, table.month),
  index('idx_budget_month').on(table.month),
]);

// ============================================================================
// APP SETTINGS (single row table)
// ============================================================================
export const appSettings = sqliteTable('app_settings', {
  id: integer('id').primaryKey(), // Always 1

  isOnboarded: integer('is_onboarded', { mode: 'boolean' }).default(false),
  deviceTier: text('device_tier', {
    enum: ['core', 'ai_lite', 'ai_standard', 'connected']
  }).default('core'),
  selectedModelId: text('selected_model_id'),

  // BYOK settings
  byokEnabled: integer('byok_enabled', { mode: 'boolean' }).default(false),
  byokProvider: text('byok_provider', { enum: ['openai', 'anthropic'] }),
  byokModel: text('byok_model'),

  // Preferences
  theme: text('theme', { enum: ['light', 'dark', 'system'] }).default('system'),
  defaultAccountId: text('default_account_id').references(() => accounts.id),

  // Sync / cloud backup
  syncEnabled: integer('sync_enabled', { mode: 'boolean' }).default(false),
  supabaseUserId: text('supabase_user_id'),
  lastSyncedAt: text('last_synced_at'),

  updatedAt: text('updated_at').notNull(),
});

// ============================================================================
// SYNC QUEUE (outbox for pending cloud sync operations)
// ============================================================================
export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(), // UUID
  entityType: text('entity_type', {
    enum: ['account', 'category', 'transaction', 'ai_learning_event']
  }).notNull(),
  entityId: text('entity_id').notNull(),
  operation: text('operation', { enum: ['create', 'update', 'delete'] }).notNull(),
  // Full entity snapshot at the time of the operation
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  status: text('status', {
    enum: ['pending', 'syncing', 'synced', 'failed']
  }).default('pending').notNull(),
  attempts: integer('attempts').default(0),
  lastError: text('last_error'),
  createdAt: text('created_at').notNull(),
  syncedAt: text('synced_at'),
}, (table) => [
  index('idx_sync_queue_status').on(table.status),
  index('idx_sync_queue_entity').on(table.entityType, table.entityId),
]);

// ============================================================================
// MODEL PACKAGES (AI model registry)
// ============================================================================
export const modelPackages = sqliteTable('model_packages', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(),
  modelId: text('model_id').notNull(),
  version: text('version').notNull(),

  downloadSizeBytes: integer('download_size_bytes').notNull(),
  storageSizeBytes: integer('storage_size_bytes').notNull(),
  paramsBillions: real('params_billions'),
  contextLength: integer('context_length'),

  supportsText: integer('supports_text', { mode: 'boolean' }).default(true),
  supportsVision: integer('supports_vision', { mode: 'boolean' }).default(false),
  supportsVoice: integer('supports_voice', { mode: 'boolean' }).default(false),

  minTier: text('min_tier', {
    enum: ['core', 'ai_lite', 'ai_standard', 'connected']
  }).default('ai_lite'),

  downloadUrl: text('download_url').notNull(),
  checksum: text('checksum').notNull(),

  isInstalled: integer('is_installed', { mode: 'boolean' }).default(false),
  localPath: text('local_path'),
  installedAt: text('installed_at'),
});

// ============================================================================
// IMPORT JOBS
// ============================================================================
export const importJobs = sqliteTable('import_jobs', {
  id: text('id').primaryKey(), // UUID
  filename: text('filename').notNull(),

  totalRows: integer('total_rows').default(0),
  importedRows: integer('imported_rows').default(0),
  failedRows: integer('failed_rows').default(0),

  status: text('status', {
    enum: ['pending', 'processing', 'completed', 'failed']
  }).default('pending'),
  errorDetails: text('error_details'),

  createdAt: text('created_at').notNull(),
  completedAt: text('completed_at'),
});

// ============================================================================
// SCHEMA MIGRATIONS (tracks applied migrations)
// ============================================================================
export const schemaMigrations = sqliteTable('schema_migrations', {
  version: integer('version').primaryKey(),
  name: text('name').notNull(),
  appliedAt: text('applied_at').notNull(),
});

// ============================================================================
// RELATIONS (for Drizzle query builder)
// ============================================================================

export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions),
  recurringRules: many(recurringRules),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  children: many(categories),
  transactions: many(transactions),
  budgets: many(budgets),
  merchantRules: many(merchantRules),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  paymentAccount: one(accounts, {
    fields: [transactions.paymentAccountId],
    references: [accounts.id],
  }),
  transferToAccount: one(accounts, {
    fields: [transactions.transferToAccountId],
    references: [accounts.id],
  }),
  splits: many(transactionSplits),
  learningEvents: many(aiLearningEvents),
}));

export const transactionSplitsRelations = relations(transactionSplits, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionSplits.transactionId],
    references: [transactions.id],
  }),
  category: one(categories, {
    fields: [transactionSplits.categoryId],
    references: [categories.id],
  }),
}));

export const recurringRulesRelations = relations(recurringRules, ({ one }) => ({
  category: one(categories, {
    fields: [recurringRules.categoryId],
    references: [categories.id],
  }),
  paymentAccount: one(accounts, {
    fields: [recurringRules.paymentAccountId],
    references: [accounts.id],
  }),
  transferToAccount: one(accounts, {
    fields: [recurringRules.transferToAccountId],
    references: [accounts.id],
  }),
}));

export const aiLearningEventsRelations = relations(aiLearningEvents, ({ one }) => ({
  transaction: one(transactions, {
    fields: [aiLearningEvents.transactionId],
    references: [transactions.id],
  }),
}));

export const merchantRulesRelations = relations(merchantRules, ({ one }) => ({
  category: one(categories, {
    fields: [merchantRules.categoryId],
    references: [categories.id],
  }),
  learnedFromEvent: one(aiLearningEvents, {
    fields: [merchantRules.learnedFromEventId],
    references: [aiLearningEvents.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export const appSettingsRelations = relations(appSettings, ({ one }) => ({
  defaultAccount: one(accounts, {
    fields: [appSettings.defaultAccountId],
    references: [accounts.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Infer types from schema for use throughout the app
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type TransactionSplit = typeof transactionSplits.$inferSelect;
export type NewTransactionSplit = typeof transactionSplits.$inferInsert;

export type RecurringRule = typeof recurringRules.$inferSelect;
export type NewRecurringRule = typeof recurringRules.$inferInsert;

export type AiLearningEvent = typeof aiLearningEvents.$inferSelect;
export type NewAiLearningEvent = typeof aiLearningEvents.$inferInsert;

export type MerchantRule = typeof merchantRules.$inferSelect;
export type NewMerchantRule = typeof merchantRules.$inferInsert;

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;

export type AppSettings = typeof appSettings.$inferSelect;
export type NewAppSettings = typeof appSettings.$inferInsert;

export type ModelPackage = typeof modelPackages.$inferSelect;
export type NewModelPackage = typeof modelPackages.$inferInsert;

export type ImportJob = typeof importJobs.$inferSelect;
export type NewImportJob = typeof importJobs.$inferInsert;

export type SyncQueue = typeof syncQueue.$inferSelect;
export type NewSyncQueue = typeof syncQueue.$inferInsert;
export type SyncEntityType = SyncQueue['entityType'];
export type SyncOperation = SyncQueue['operation'];
export type SyncStatus = SyncQueue['status'];
