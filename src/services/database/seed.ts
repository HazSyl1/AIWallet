// Database seeding — creates default accounts and categories on first launch

import { v4 as uuid } from 'uuid';
import { db, accounts, categories, transactions, appSettings } from './drizzle';
import { eq, sql } from 'drizzle-orm';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from '../../shared/types';
import type { NewAccount, NewCategory, NewTransaction } from './schema';

const SAMPLE_TRANSACTIONS: Array<{
  merchant: string;
  amountPaise: number;
  type: 'expense' | 'income';
  category: string;
  daysAgo: number;
}> = [
  { merchant: 'Swiggy', amountPaise: 45000, type: 'expense', category: 'Food & Dining', daysAgo: 0 },
  { merchant: 'Amazon', amountPaise: 199900, type: 'expense', category: 'Shopping', daysAgo: 1 },
  { merchant: 'Uber', amountPaise: 15000, type: 'expense', category: 'Transportation', daysAgo: 1 },
  { merchant: 'Netflix', amountPaise: 64900, type: 'expense', category: 'Entertainment', daysAgo: 3 },
  { merchant: 'Salary Credit', amountPaise: 7500000, type: 'income', category: 'Salary', daysAgo: 5 },
  { merchant: 'Zomato', amountPaise: 32000, type: 'expense', category: 'Food & Dining', daysAgo: 5 },
  { merchant: 'Electricity Bill', amountPaise: 150000, type: 'expense', category: 'Bills & Utilities', daysAgo: 7 },
  { merchant: 'Freelance Project', amountPaise: 2500000, type: 'income', category: 'Freelance', daysAgo: 10 },
];

export async function seedDatabase(): Promise<void> {
  const now = new Date().toISOString();

  const existingAccounts = await db.select({ id: accounts.id }).from(accounts).limit(1);
  if (existingAccounts.length > 0) {
    console.log('Database already seeded, skipping');
    return;
  }

  console.log('Seeding database with default data...');

  // Seed accounts
  for (let i = 0; i < DEFAULT_ACCOUNTS.length; i++) {
    const account = DEFAULT_ACCOUNTS[i];
    const newAccount: NewAccount = {
      id: uuid(),
      name: account.name,
      type: account.type,
      balancePaise: account.initialBalancePaise ?? 0,
      currency: 'INR',
      icon: account.icon ?? null,
      color: account.color ?? null,
      isActive: true,
      sortOrder: i,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(accounts).values(newAccount);
  }
  console.log(`Seeded ${DEFAULT_ACCOUNTS.length} accounts`);

  // Seed expense categories
  for (let i = 0; i < DEFAULT_EXPENSE_CATEGORIES.length; i++) {
    const cat = DEFAULT_EXPENSE_CATEGORIES[i];
    const newCat: NewCategory = {
      id: uuid(),
      name: cat.name,
      type: cat.type,
      parentId: cat.parentId ?? null,
      icon: cat.icon ?? null,
      color: cat.color ?? null,
      isSystem: true,
      isActive: true,
      sortOrder: i,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(categories).values(newCat);
  }
  console.log(`Seeded ${DEFAULT_EXPENSE_CATEGORIES.length} expense categories`);

  // Seed income categories
  for (let i = 0; i < DEFAULT_INCOME_CATEGORIES.length; i++) {
    const cat = DEFAULT_INCOME_CATEGORIES[i];
    const newCat: NewCategory = {
      id: uuid(),
      name: cat.name,
      type: cat.type,
      parentId: cat.parentId ?? null,
      icon: cat.icon ?? null,
      color: cat.color ?? null,
      isSystem: true,
      isActive: true,
      sortOrder: i + DEFAULT_EXPENSE_CATEGORIES.length,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(categories).values(newCat);
  }
  console.log(`Seeded ${DEFAULT_INCOME_CATEGORIES.length} income categories`);

  // Seed sample transactions
  const existingTx = await db.select({ id: transactions.id }).from(transactions).limit(1);
  if (existingTx.length > 0) {
    console.log('Transactions already exist, skipping sample transactions');
    console.log('Database seeding complete');
    return;
  }

  const firstAccount = await db.select({ id: accounts.id }).from(accounts).limit(1);
  if (firstAccount.length > 0) {
    const accountId = firstAccount[0].id;

    for (const tx of SAMPLE_TRANSACTIONS) {
      const occurredAt = new Date();
      occurredAt.setDate(occurredAt.getDate() - tx.daysAgo);

      const categoryResult = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.name, tx.category))
        .limit(1);

      const newTx: NewTransaction = {
        id: uuid(),
        schemaVersion: '1.0',
        transactionType: tx.type,
        amountPaise: tx.amountPaise,
        currency: 'INR',
        merchant: tx.merchant,
        categoryId: categoryResult[0]?.id ?? null,
        occurredAt: occurredAt.toISOString(),
        paymentAccountId: accountId,
        confidence: 1.0,
        source: 'manual',
        isAiGenerated: false,
        wasUserEdited: false,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(transactions).values(newTx);

      const delta = tx.type === 'expense' ? -tx.amountPaise : tx.amountPaise;
      await db
        .update(accounts)
        .set({
          balancePaise: sql`${accounts.balancePaise} + ${delta}`,
          updatedAt: now,
        })
        .where(eq(accounts.id, accountId));
    }
    console.log(`Seeded ${SAMPLE_TRANSACTIONS.length} sample transactions`);
  }

  console.log('Database seeding complete');
}

export async function resetDatabase(): Promise<void> {
  console.log('Resetting database...');

  await db.delete(transactions);
  await db.delete(categories);
  await db.delete(accounts);

  await db
    .update(appSettings)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(appSettings.id, 1));

  await seedDatabase();
  console.log('Database reset complete');
}
