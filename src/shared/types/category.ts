// Category types — DB shape comes from Drizzle schema

export type { Category, NewCategory } from '../../services/database/schema';
export type {
  CreateCategoryInput,
  CategoryWithChildren,
} from '../../services/database/repositories/CategoryRepositoryDrizzle';

import type { CreateCategoryInput } from '../../services/database/repositories/CategoryRepositoryDrizzle';

export const DEFAULT_EXPENSE_CATEGORIES: CreateCategoryInput[] = [
  { name: 'Food & Dining', type: 'expense', icon: 'food', color: '#FF5722' },
  { name: 'Groceries', type: 'expense', icon: 'cart', color: '#4CAF50' },
  { name: 'Transportation', type: 'expense', icon: 'car', color: '#2196F3' },
  { name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#9C27B0' },
  { name: 'Entertainment', type: 'expense', icon: 'movie', color: '#E91E63' },
  { name: 'Bills & Utilities', type: 'expense', icon: 'file-text', color: '#607D8B' },
  { name: 'Health & Medical', type: 'expense', icon: 'heart', color: '#F44336' },
  { name: 'Education', type: 'expense', icon: 'book', color: '#3F51B5' },
  { name: 'Personal Care', type: 'expense', icon: 'user', color: '#00BCD4' },
  { name: 'Home & Rent', type: 'expense', icon: 'home', color: '#795548' },
  { name: 'Travel', type: 'expense', icon: 'plane', color: '#009688' },
  { name: 'Gifts & Donations', type: 'expense', icon: 'gift', color: '#FF9800' },
  { name: 'Other Expense', type: 'expense', icon: 'more-horizontal', color: '#9E9E9E' },
];

export const DEFAULT_INCOME_CATEGORIES: CreateCategoryInput[] = [
  { name: 'Salary', type: 'income', icon: 'briefcase', color: '#4CAF50' },
  { name: 'Freelance', type: 'income', icon: 'code', color: '#2196F3' },
  { name: 'Business', type: 'income', icon: 'trending-up', color: '#FF9800' },
  { name: 'Investments', type: 'income', icon: 'bar-chart-2', color: '#9C27B0' },
  { name: 'Refund', type: 'income', icon: 'refresh-cw', color: '#00BCD4' },
  { name: 'Gift Received', type: 'income', icon: 'gift', color: '#E91E63' },
  { name: 'Other Income', type: 'income', icon: 'more-horizontal', color: '#9E9E9E' },
];
