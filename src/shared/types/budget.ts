// Budget types — DB shape comes from Drizzle schema

export type { Budget, NewBudget } from '../../services/database/schema';

import type { Budget } from '../../services/database/schema';

export interface BudgetWithUtilization extends Budget {
  spentPaise: number;
  utilizationPercent: number;
  remainingPaise: number;
  categoryName: string;
  categoryColor: string | null;
}

export interface CreateBudgetInput {
  categoryId: string;
  limitPaise: number;
  month: string; // YYYY-MM
}

export const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
