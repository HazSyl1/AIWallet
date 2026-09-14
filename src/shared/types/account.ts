// Account types — DB shape comes from Drizzle schema

export type { Account, NewAccount } from '../../services/database/schema';
export type { CreateAccountInput, UpdateAccountInput } from '../../services/database/repositories/AccountRepositoryDrizzle';

import type { CreateAccountInput } from '../../services/database/repositories/AccountRepositoryDrizzle';

export const DEFAULT_ACCOUNTS: CreateAccountInput[] = [
  { name: 'Cash', type: 'cash', icon: 'cash', color: '#4CAF50' },
  { name: 'Bank Account', type: 'bank', icon: 'bank', color: '#2196F3' },
  { name: 'Credit Card', type: 'card', icon: 'credit-card', color: '#FF9800' },
];
