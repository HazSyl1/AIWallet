// Generic AI provider abstraction — local llama.rn and BYOK providers implement this.

import type { Account, Category } from '../../shared/types';
import type { TransactionProposal } from '../../shared/types/transaction';
import type { ISOTimestamp } from '../../shared/types/common';

export interface ProposalContext {
  accounts: Account[];
  categories: Category[];
  now: ISOTimestamp;
}

export type AIProviderErrorCode =
  | 'not_installed'
  | 'network'
  | 'auth'
  | 'rate_limit'
  | 'timeout'
  | 'invalid_response'
  | 'unknown';

export class AIProviderError extends Error {
  code: AIProviderErrorCode;
  provider: 'local' | 'openai' | 'anthropic';

  constructor(code: AIProviderErrorCode, provider: 'local' | 'openai' | 'anthropic', message: string) {
    super(message);
    this.name = 'AIProviderError';
    this.code = code;
    this.provider = provider;
  }
}

export interface AIProvider {
  readonly id: 'local' | 'openai' | 'anthropic';
  isReady(): Promise<boolean>;
  generateProposal(input: { text: string }, context: ProposalContext): Promise<TransactionProposal>;
}
