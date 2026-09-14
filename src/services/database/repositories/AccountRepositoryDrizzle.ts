import { v4 as uuid } from 'uuid';
import { db, accounts, transactions, eq, isNull, sql, sum } from '../drizzle';
import type { Account, NewAccount } from '../schema';

export interface CreateAccountInput {
  name: string;
  type: Account['type'];
  initialBalancePaise?: number;
  icon?: string;
  color?: string;
}

export interface UpdateAccountInput {
  name?: string;
  type?: Account['type'];
  icon?: string | null;
  color?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

class AccountRepositoryDrizzle {
  async create(input: CreateAccountInput): Promise<Account> {
    const now = new Date().toISOString();
    const id = uuid();

    const lastAccount = await db
      .select({ sortOrder: accounts.sortOrder })
      .from(accounts)
      .orderBy(sql`${accounts.sortOrder} DESC`)
      .limit(1);
    const sortOrder = (lastAccount[0]?.sortOrder ?? -1) + 1;

    const newAccount: NewAccount = {
      id,
      name: input.name,
      type: input.type,
      balancePaise: input.initialBalancePaise ?? 0,
      currency: 'INR',
      icon: input.icon ?? null,
      color: input.color ?? null,
      isActive: true,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(accounts).values(newAccount);
    return this.getById(id) as Promise<Account>;
  }

  async getById(id: string): Promise<Account | null> {
    const result = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    return result[0] ?? null;
  }

  async getAll(includeInactive = false): Promise<Account[]> {
    if (includeInactive) {
      return db.select().from(accounts).orderBy(accounts.sortOrder);
    }
    return db
      .select()
      .from(accounts)
      .where(eq(accounts.isActive, true))
      .orderBy(accounts.sortOrder);
  }

  async getByType(type: Account['type']): Promise<Account[]> {
    return db
      .select()
      .from(accounts)
      .where(eq(accounts.type, type))
      .orderBy(accounts.sortOrder);
  }

  async update(id: string, updates: UpdateAccountInput): Promise<Account | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    await db
      .update(accounts)
      .set({ ...updates, updatedAt: now })
      .where(eq(accounts.id, id));

    return this.getById(id);
  }

  async archive(id: string): Promise<boolean> {
    const result = await db
      .update(accounts)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(accounts.id, id));
    return (result.changes ?? 0) > 0;
  }

  async delete(id: string): Promise<boolean> {
    const txCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.paymentAccountId, id));

    if ((txCount[0]?.count ?? 0) > 0) {
      throw new Error('Cannot delete account with transactions. Archive it instead.');
    }

    const result = await db.delete(accounts).where(eq(accounts.id, id));
    return (result.changes ?? 0) > 0;
  }

  async getTotalBalance(): Promise<number> {
    const result = await db
      .select({ total: sum(accounts.balancePaise) })
      .from(accounts)
      .where(eq(accounts.isActive, true));
    return Number(result[0]?.total ?? 0);
  }

  async recalculateBalance(id: string): Promise<number> {
    const account = await this.getById(id);
    if (!account) throw new Error('Account not found');

    const result = await db
      .select({
        balance: sql<number>`COALESCE(SUM(CASE
          WHEN ${transactions.transactionType} = 'expense' THEN -${transactions.amountPaise}
          WHEN ${transactions.transactionType} = 'income' THEN ${transactions.amountPaise}
          WHEN ${transactions.transactionType} = 'transfer' AND ${transactions.paymentAccountId} = ${id} THEN -${transactions.amountPaise}
          WHEN ${transactions.transactionType} = 'transfer' AND ${transactions.transferToAccountId} = ${id} THEN ${transactions.amountPaise}
          ELSE 0
        END), 0)`,
      })
      .from(transactions)
      .where(isNull(transactions.deletedAt));

    const calculated = result[0]?.balance ?? 0;

    if (calculated !== account.balancePaise) {
      await db
        .update(accounts)
        .set({ balancePaise: calculated, updatedAt: new Date().toISOString() })
        .where(eq(accounts.id, id));
    }

    return calculated;
  }
}

export const accountRepository = new AccountRepositoryDrizzle();
