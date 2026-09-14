// Transaction Repository using Drizzle ORM
// Type-safe database operations for transactions

import { v4 as uuid } from 'uuid';
import {
  db,
  transactions,
  accounts,
  aiLearningEvents,
  eq,
  and,
  or,
  gte,
  lte,
  like,
  isNull,
  desc,
  sql,
  sum,
  type Transaction,
  type NewTransaction,
  type NewAiLearningEvent,
} from '../drizzle';
import type { TransactionFilters, TransactionProposal } from '../../../shared/types/transaction';

class TransactionRepositoryDrizzle {
  /**
   * Create a transaction from a confirmed proposal
   * This is the ONLY way to commit a transaction to the ledger
   */
  async createFromProposal(proposal: TransactionProposal): Promise<Transaction> {
    const now = new Date().toISOString();
    const id = uuid();

    // Validate required fields
    if (!proposal.paymentAccountId) {
      throw new Error('Account is required');
    }
    if (!proposal.occurredAt) {
      throw new Error('Date is required');
    }
    if (proposal.amountPaise <= 0) {
      throw new Error('Amount must be positive');
    }

    // Insert transaction
    const newTransaction: NewTransaction = {
      id,
      schemaVersion: '1.0',
      transactionType: proposal.transactionType,
      amountPaise: proposal.amountPaise,
      currency: proposal.currency ?? 'INR',
      merchant: proposal.merchant ?? null,
      categoryId: proposal.categoryId ?? null,
      occurredAt: proposal.occurredAt,
      paymentAccountId: proposal.paymentAccountId,
      transferToAccountId: proposal.transferToAccountId ?? null,
      note: proposal.note ?? null,
      confidence: proposal.confidence ?? 1.0,
      source: proposal.source,
      isAiGenerated: proposal.isAiGenerated ?? false,
      wasUserEdited: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(transactions).values(newTransaction);

    // Update account balance
    await this.updateAccountBalance(
      proposal.paymentAccountId,
      proposal.amountPaise,
      proposal.transactionType
    );

    // Handle transfer (debit from one, credit to another)
    if (proposal.transactionType === 'transfer' && proposal.transferToAccountId) {
      await this.updateAccountBalance(
        proposal.transferToAccountId,
        proposal.amountPaise,
        'income' // Credit the receiving account
      );
    }

    return this.getById(id) as Promise<Transaction>;
  }

  /**
   * Get transaction by ID
   */
  async getById(id: string): Promise<Transaction | null> {
    const result = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Get all transactions with optional filters
   */
  async getAll(filters?: TransactionFilters): Promise<Transaction[]> {
    const conditions = [];

    // By default, exclude deleted transactions
    if (!filters?.includeDeleted) {
      conditions.push(isNull(transactions.deletedAt));
    }

    if (filters?.startDate) {
      conditions.push(gte(transactions.occurredAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(transactions.occurredAt, filters.endDate));
    }
    if (filters?.minAmountPaise) {
      conditions.push(gte(transactions.amountPaise, filters.minAmountPaise));
    }
    if (filters?.maxAmountPaise) {
      conditions.push(lte(transactions.amountPaise, filters.maxAmountPaise));
    }
    if (filters?.merchant) {
      conditions.push(like(transactions.merchant, `%${filters.merchant}%`));
    }
    if (filters?.accountId) {
      conditions.push(eq(transactions.paymentAccountId, filters.accountId));
    }
    if (filters?.categoryId) {
      conditions.push(eq(transactions.categoryId, filters.categoryId));
    }
    if (filters?.source) {
      conditions.push(eq(transactions.source, filters.source));
    }
    if (filters?.transactionType) {
      conditions.push(eq(transactions.transactionType, filters.transactionType));
    }
    if (filters?.searchQuery) {
      conditions.push(
        or(
          like(transactions.merchant, `%${filters.searchQuery}%`),
          like(transactions.note, `%${filters.searchQuery}%`)
        )
      );
    }

    const query = db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt));

    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }

    return query;
  }

  /**
   * Get recent transactions (for dashboard)
   */
  async getRecent(limit: number = 10): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(isNull(transactions.deletedAt))
      .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
      .limit(limit);
  }

  /**
   * Update a transaction
   */
  async update(
    id: string,
    updates: Partial<Pick<Transaction, 'merchant' | 'categoryId' | 'note' | 'amountPaise' | 'occurredAt'>>
  ): Promise<Transaction | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();

    // Handle amount changes (need to update balance)
    if (updates.amountPaise !== undefined && updates.amountPaise !== existing.amountPaise) {
      // Reverse old amount
      await this.updateAccountBalance(
        existing.paymentAccountId,
        -existing.amountPaise,
        existing.transactionType
      );
      // Apply new amount
      await this.updateAccountBalance(
        existing.paymentAccountId,
        updates.amountPaise,
        existing.transactionType
      );
    }

    // Track if AI transaction was edited
    let wasUserEdited = existing.wasUserEdited;
    let originalAiCategoryId = existing.originalAiCategoryId;

    if (existing.isAiGenerated && updates.categoryId && updates.categoryId !== existing.categoryId) {
      wasUserEdited = true;
      originalAiCategoryId = originalAiCategoryId ?? existing.categoryId;

      // Log the learning event
      await this.logLearningEvent(existing, 'categoryId', existing.categoryId, updates.categoryId);
    }

    await db
      .update(transactions)
      .set({
        ...updates,
        wasUserEdited,
        originalAiCategoryId,
        updatedAt: now,
      })
      .where(eq(transactions.id, id));

    return this.getById(id);
  }

  /**
   * Soft delete a transaction
   */
  async softDelete(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing || existing.deletedAt) {
      return false;
    }

    // Reverse the balance impact
    await this.updateAccountBalance(
      existing.paymentAccountId,
      -existing.amountPaise,
      existing.transactionType
    );

    // Handle transfer
    if (existing.transactionType === 'transfer' && existing.transferToAccountId) {
      await this.updateAccountBalance(
        existing.transferToAccountId,
        -existing.amountPaise,
        'income'
      );
    }

    // Soft delete
    await db
      .update(transactions)
      .set({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(transactions.id, id));

    return true;
  }

  /**
   * Restore a soft-deleted transaction
   */
  async restore(id: string): Promise<boolean> {
    const result = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);

    const existing = result[0];
    if (!existing || !existing.deletedAt) {
      return false;
    }

    // Re-apply the balance impact
    await this.updateAccountBalance(
      existing.paymentAccountId,
      existing.amountPaise,
      existing.transactionType
    );

    // Handle transfer
    if (existing.transactionType === 'transfer' && existing.transferToAccountId) {
      await this.updateAccountBalance(
        existing.transferToAccountId,
        existing.amountPaise,
        'income'
      );
    }

    // Restore
    await db
      .update(transactions)
      .set({
        deletedAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(transactions.id, id));

    return true;
  }

  /**
   * Permanently delete a transaction
   */
  async hardDelete(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) {
      return false;
    }

    // Only reverse balance if not already soft-deleted
    if (!existing.deletedAt) {
      await this.updateAccountBalance(
        existing.paymentAccountId,
        -existing.amountPaise,
        existing.transactionType
      );
    }

    const result = await db
      .delete(transactions)
      .where(eq(transactions.id, id));

    return true;
  }

  /**
   * Get total spending by category for a month
   */
  async getSpendingByCategory(month: string): Promise<{ categoryId: string; total: number }[]> {
    const result = await db
      .select({
        categoryId: transactions.categoryId,
        total: sum(transactions.amountPaise),
      })
      .from(transactions)
      .where(
        and(
          sql`strftime('%Y-%m', ${transactions.occurredAt}) = ${month}`,
          eq(transactions.transactionType, 'expense'),
          isNull(transactions.deletedAt)
        )
      )
      .groupBy(transactions.categoryId);

    return result
      .filter(r => r.categoryId !== null)
      .map(r => ({
        categoryId: r.categoryId!,
        total: Number(r.total) || 0,
      }));
  }

  /**
   * Count transactions (for stats)
   */
  async count(filters?: TransactionFilters): Promise<number> {
    const conditions = [isNull(transactions.deletedAt)];

    if (filters?.startDate) {
      conditions.push(gte(transactions.occurredAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(transactions.occurredAt, filters.endDate));
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(...conditions));

    return result[0]?.count ?? 0;
  }

  /**
   * Update account balance based on transaction
   */
  private async updateAccountBalance(
    accountId: string,
    amountPaise: number,
    transactionType: string
  ): Promise<void> {
    // Expense/Refund decreases balance, income increases
    const delta = transactionType === 'expense' || transactionType === 'adjustment'
      ? -amountPaise
      : amountPaise;

    await db
      .update(accounts)
      .set({
        balancePaise: sql`${accounts.balancePaise} + ${delta}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(accounts.id, accountId));
  }

  /**
   * Log a learning event when user corrects AI
   */
  private async logLearningEvent(
    transaction: Transaction,
    field: string,
    fromValue: string | number | null,
    toValue: string | number | null
  ): Promise<void> {
    const event: NewAiLearningEvent = {
      id: uuid(),
      transactionId: transaction.id,
      changes: [{ field, from: fromValue, to: toValue }],
      inputSource: (transaction.source === 'text' || transaction.source === 'voice' || transaction.source === 'image') ? transaction.source : null,
      merchantNormalized: transaction.merchant?.toLowerCase().trim() ?? null,
      createdAt: new Date().toISOString(),
    };

    await db.insert(aiLearningEvents).values(event);
  }
}

// Export singleton
export const transactionRepository = new TransactionRepositoryDrizzle();
