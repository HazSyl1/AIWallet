import { eq, asc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { db } from '../database/drizzle';
import { syncQueue, accounts, categories, transactions, aiLearningEvents } from '../database/schema';
import type { SyncEntityType, SyncOperation, NewAccount, NewCategory, NewTransaction, NewAiLearningEvent } from '../database/schema';
import { supabase } from './client';

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 50;

// ─── Case conversion ─────────────────────────────────────────────────────────
// Drizzle uses camelCase TS field names. Supabase PostgREST uses the actual
// snake_case column names. These two helpers bridge the gap.

function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/([A-Z])/g, '_$1').toLowerCase(),
      v,
    ])
  );
}

function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
      v,
    ])
  );
}

// ─── Outbox ──────────────────────────────────────────────────────────────────

export async function enqueueSync(
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperation,
  payload: Record<string, unknown>
): Promise<void> {
  await db.insert(syncQueue).values({
    id: uuid(),
    entityType,
    entityId,
    operation,
    payload,
    status: 'pending',
    attempts: 0,
    createdAt: new Date().toISOString(),
  });
}

// ─── Worker ──────────────────────────────────────────────────────────────────

export async function processSyncQueue(userId: string): Promise<{ synced: number; failed: number }> {
  const pending = await db
    .select()
    .from(syncQueue)
    .where(eq(syncQueue.status, 'pending'))
    .orderBy(asc(syncQueue.createdAt))
    .limit(BATCH_SIZE);

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    await db.update(syncQueue)
      .set({ status: 'syncing' })
      .where(eq(syncQueue.id, item.id));

    try {
      if (item.operation === 'delete') {
        const { error } = await supabase
          .from(entityTypeToTable(item.entityType))
          .delete()
          .eq('id', item.entityId)
          .eq('user_id', userId);
        if (error) throw new Error(error.message);
      } else {
        // Payload is camelCase from Drizzle — convert to snake_case for Supabase
        const payload = toSnakeCase({
          ...(item.payload as Record<string, unknown>),
          userId,
        });
        const { error } = await supabase
          .from(entityTypeToTable(item.entityType))
          .upsert(payload, { onConflict: 'id' });
        if (error) throw new Error(error.message);
      }

      await db.update(syncQueue)
        .set({ status: 'synced', syncedAt: new Date().toISOString() })
        .where(eq(syncQueue.id, item.id));

      synced++;
    } catch (err) {
      const attempts = (item.attempts ?? 0) + 1;
      await db.update(syncQueue)
        .set({
          status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
          attempts,
          lastError: err instanceof Error ? err.message : String(err),
        })
        .where(eq(syncQueue.id, item.id));

      failed++;
    }
  }

  return { synced, failed };
}

// ─── Full Backup ──────────────────────────────────────────────────────────────
// Drizzle fetches camelCase → toSnakeCase before sending to Supabase.

export async function backupToSupabase(userId: string): Promise<void> {
  const [allAccounts, allCategories, allTransactions, allLearning] = await Promise.all([
    db.select().from(accounts),
    db.select().from(categories),
    db.select().from(transactions),
    db.select().from(aiLearningEvents),
  ]);

  const prepare = (rows: Record<string, unknown>[]) =>
    rows.map((r) => toSnakeCase({ ...r, userId }));

  const steps: [string, Record<string, unknown>[]][] = [
    ['accounts',           prepare(allAccounts as unknown as Record<string, unknown>[])],
    ['categories',         prepare(allCategories as unknown as Record<string, unknown>[])],
    ['transactions',       prepare(allTransactions as unknown as Record<string, unknown>[])],
    ['ai_learning_events', prepare(allLearning as unknown as Record<string, unknown>[])],
  ];

  for (const [table, rows] of steps) {
    if (rows.length === 0) continue;
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(`Backup failed on ${table}: ${error.message}`);
  }
}

// ─── Restore ─────────────────────────────────────────────────────────────────
// Supabase returns snake_case → toCamelCase so Drizzle maps to the right columns.

export async function restoreFromSupabase(userId: string): Promise<void> {
  const [{ data: remoteAccounts }, { data: remoteCategories }, { data: remoteTransactions }] =
    await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', userId),
      supabase.from('categories').select('*').eq('user_id', userId),
      supabase.from('transactions').select('*').eq('user_id', userId),
    ]);

  if (remoteAccounts?.length) {
    await db.delete(accounts);
    for (const row of remoteAccounts) {
      await db.insert(accounts)
        .values(toCamelCase(row as Record<string, unknown>) as unknown as NewAccount)
        .onConflictDoNothing();
    }
  }

  if (remoteCategories?.length) {
    await db.delete(categories);
    for (const row of remoteCategories) {
      await db.insert(categories)
        .values(toCamelCase(row as Record<string, unknown>) as unknown as NewCategory)
        .onConflictDoNothing();
    }
  }

  if (remoteTransactions?.length) {
    await db.delete(transactions);
    for (const row of remoteTransactions) {
      await db.insert(transactions)
        .values(toCamelCase(row as Record<string, unknown>) as unknown as NewTransaction)
        .onConflictDoNothing();
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function entityTypeToTable(entityType: SyncEntityType): string {
  const map: Record<SyncEntityType, string> = {
    account: 'accounts',
    category: 'categories',
    transaction: 'transactions',
    ai_learning_event: 'ai_learning_events',
  };
  return map[entityType];
}
