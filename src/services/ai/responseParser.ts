// Shared response parsing — turns a model's raw text output into a TransactionProposal.
// No runtime validation library in this codebase, so validation is hand-rolled here.

import type { TransactionProposal, ModelRuntime } from '../../shared/types/transaction';
import type { ProposalContext, AIProviderErrorCode } from './types';
import { AIProviderError } from './types';

const VALID_TRANSACTION_TYPES = ['expense', 'income', 'transfer', 'refund', 'adjustment'] as const;
type ValidTransactionType = (typeof VALID_TRANSACTION_TYPES)[number];

interface RawProposal {
  transactionType?: unknown;
  amount?: unknown;
  merchant?: unknown;
  category?: unknown;
  account?: unknown;
  date?: unknown;
  note?: unknown;
}

function extractJsonBlock(rawText: string, provider: 'local' | 'openai' | 'anthropic'): RawProposal {
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new AIProviderError('invalid_response', provider, 'No JSON object found in model output');
  }

  try {
    return JSON.parse(rawText.slice(start, end + 1));
  } catch {
    throw new AIProviderError('invalid_response', provider, 'Model output was not valid JSON');
  }
}

function findByName<T extends { id: string; name: string }>(items: T[], name: string | null): T | null {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  return items.find((item) => item.name.trim().toLowerCase() === normalized) ?? null;
}

export function parseProposalResponse(
  rawText: string,
  context: ProposalContext,
  modelRuntime: ModelRuntime,
  source: TransactionProposal['source'] = 'text'
): TransactionProposal {
  const raw = extractJsonBlock(rawText, modelRuntime.provider);
  const uncertainFields: string[] = [];

  const transactionType: ValidTransactionType = VALID_TRANSACTION_TYPES.includes(
    raw.transactionType as ValidTransactionType
  )
    ? (raw.transactionType as ValidTransactionType)
    : 'expense';
  if (transactionType === 'expense' && raw.transactionType !== 'expense') {
    uncertainFields.push('transactionType');
  }

  const amount = typeof raw.amount === 'number' && raw.amount > 0 ? raw.amount : null;
  if (amount === null) uncertainFields.push('amountPaise');
  const amountPaise = amount === null ? 0 : Math.round(amount * 100);

  const merchant = typeof raw.merchant === 'string' && raw.merchant.trim() ? raw.merchant.trim() : null;
  if (merchant === null) uncertainFields.push('merchant');

  const categoryName = typeof raw.category === 'string' ? raw.category : null;
  const category = findByName(context.categories, categoryName);
  if (!category) uncertainFields.push('categoryId');

  const accountName = typeof raw.account === 'string' ? raw.account : null;
  let account = findByName(context.accounts, accountName);
  if (!account && context.accounts.length === 1) {
    account = context.accounts[0];
  }
  if (!account) uncertainFields.push('paymentAccountId');

  const dateStr = typeof raw.date === 'string' ? raw.date : null;
  const parsedDate = dateStr ? new Date(dateStr) : null;
  const occurredAt =
    parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : context.now;
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    if (dateStr) uncertainFields.push('occurredAt');
  }

  const note = typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : null;

  const confidence = Math.max(0.3, 1 - uncertainFields.length * 0.15);

  return {
    schemaVersion: '1.0',
    transactionType,
    amountPaise,
    currency: 'INR',
    merchant,
    categoryId: category?.id ?? null,
    occurredAt,
    paymentAccountId: account?.id ?? null,
    note,
    confidence,
    uncertainFields,
    source,
    isAiGenerated: true,
    modelRuntime,
  };
}

export function mapErrorToCode(err: unknown): AIProviderErrorCode {
  if (err instanceof AIProviderError) return err.code;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('network') || msg.includes('fetch')) return 'network';
    if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('api key')) return 'auth';
    if (msg.includes('429') || msg.includes('rate limit')) return 'rate_limit';
  }
  return 'unknown';
}


