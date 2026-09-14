// Import/Export types — DB shape comes from Drizzle schema

export type { ImportJob, NewImportJob } from '../../services/database/schema';

import type { ImportJobStatus, ISOTimestamp } from './common';

export interface ImportRowError {
  rowNumber: number;
  field: string;
  value: string | null;
  reason: string;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: 'amount' | 'debit' | 'credit' | 'date' | 'merchant' | 'category' | 'account' | 'note';
  transform?: string;
}

export interface ImportPreviewRow {
  rowNumber: number;
  data: {
    amountPaise: number | null;
    transactionType: 'expense' | 'income' | null;
    occurredAt: string | null;
    merchant: string | null;
    categoryName: string | null;
    accountName: string | null;
    note: string | null;
  };
  validationErrors: string[];
  isDuplicate: boolean;
}

export interface ExportOptions {
  startDate?: ISOTimestamp;
  endDate?: ISOTimestamp;
  includeTransactions: boolean;
  includeAccounts: boolean;
  includeCategories: boolean;
  includeSummary: boolean;
  includeModelMetadata?: boolean;
}
