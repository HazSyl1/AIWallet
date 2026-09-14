// Transaction types — DB shape comes from Drizzle schema

export type { Transaction, NewTransaction, TransactionSplit } from '../../services/database/schema';

import type { Transaction } from '../../services/database/schema';
import type { CaptureSource, Currency, ISOTimestamp, EntityId } from './common';

export interface ModelRuntime {
  provider: 'local' | 'openai' | 'anthropic';
  modelName: string;
  modelVersion: string;
  runtime: string;
}

/**
 * AI Proposal — editable transaction suggestion before user confirms.
 * Not a ledger entry until committed via TransactionRepositoryDrizzle.
 */
export interface TransactionProposal {
  schemaVersion: string;
  transactionType: Transaction['transactionType'];
  amountPaise: number;
  currency: Currency;
  merchant: string | null;
  categoryId: EntityId | null;
  occurredAt: ISOTimestamp | null;
  paymentAccountId: EntityId | null;
  transferToAccountId?: EntityId | null;
  note: string | null;
  confidence: number;
  uncertainFields: string[];
  source: CaptureSource;
  isAiGenerated?: boolean;
  modelRuntime: ModelRuntime | null;
}

export interface TransactionFilters {
  startDate?: ISOTimestamp;
  endDate?: ISOTimestamp;
  minAmountPaise?: number;
  maxAmountPaise?: number;
  merchant?: string;
  accountId?: EntityId;
  categoryId?: EntityId;
  source?: CaptureSource;
  transactionType?: Transaction['transactionType'];
  searchQuery?: string;
  includeDeleted?: boolean;
}

export const createDefaultProposal = (): TransactionProposal => ({
  schemaVersion: '1.0',
  transactionType: 'expense',
  amountPaise: 0,
  currency: 'INR',
  merchant: null,
  categoryId: null,
  occurredAt: new Date().toISOString(),
  paymentAccountId: null,
  note: null,
  confidence: 1.0,
  uncertainFields: [],
  source: 'manual',
  modelRuntime: null,
});
