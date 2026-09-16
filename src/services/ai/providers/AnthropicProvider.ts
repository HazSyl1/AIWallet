// BYOK provider — Anthropic Messages API with a forced tool_use call so the
// model must return arguments matching our schema, instead of prose+JSON mixed in.

import { eq } from 'drizzle-orm';
import { db, appSettings } from '../../database';
import { secureStorage } from '../../security/SecureStorageService';
import type { AIProvider, ProposalContext } from '../types';
import { AIProviderError } from '../types';
import { buildProposalPrompt } from '../promptBuilder';
import { parseProposalResponse } from '../responseParser';
import type { TransactionProposal } from '../../../shared/types/transaction';

const DEFAULT_MODEL = 'claude-3-5-haiku-20241022';
const REQUEST_TIMEOUT_MS = 30000;
const ANTHROPIC_VERSION = '2023-06-01';

const EXTRACT_TOOL = {
  name: 'extract_transaction',
  description: 'Record the extracted transaction fields.',
  input_schema: {
    type: 'object',
    properties: {
      transactionType: {
        type: 'string',
        enum: ['expense', 'income', 'transfer', 'refund', 'adjustment'],
      },
      amount: { type: 'number' },
      merchant: { type: ['string', 'null'] },
      category: { type: ['string', 'null'] },
      account: { type: ['string', 'null'] },
      date: { type: ['string', 'null'] },
      note: { type: ['string', 'null'] },
    },
    required: ['transactionType', 'amount', 'merchant', 'category', 'account', 'date', 'note'],
  },
};

class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic' as const;

  async isReady(): Promise<boolean> {
    return (await secureStorage.getAnthropicKey()) !== null;
  }

  async generateProposal(
    input: { text: string },
    context: ProposalContext
  ): Promise<TransactionProposal> {
    const apiKey = await secureStorage.getAnthropicKey();
    if (!apiKey) {
      throw new AIProviderError('auth', 'anthropic', 'No Anthropic API key configured');
    }

    const [settings] = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
    const model = settings?.byokModel || DEFAULT_MODEL;
    const prompt = buildProposalPrompt(input.text, context);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model,
          max_tokens: 512,
          messages: [{ role: 'user', content: prompt }],
          tools: [EXTRACT_TOOL],
          tool_choice: { type: 'tool', name: 'extract_transaction' },
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AIProviderError('timeout', 'anthropic', 'Anthropic request timed out');
      }
      throw new AIProviderError('network', 'anthropic', 'Failed to reach Anthropic');
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new AIProviderError('auth', 'anthropic', 'Anthropic rejected the API key');
      }
      if (response.status === 429) {
        throw new AIProviderError('rate_limit', 'anthropic', 'Anthropic rate limit exceeded');
      }
      throw new AIProviderError('unknown', 'anthropic', `Anthropic request failed (${response.status})`);
    }

    const data = await response.json();
    const toolUse = (data?.content ?? []).find((block: { type: string }) => block.type === 'tool_use');
    if (!toolUse?.input) {
      throw new AIProviderError('invalid_response', 'anthropic', 'Anthropic response had no tool call');
    }

    return parseProposalResponse(
      JSON.stringify(toolUse.input),
      context,
      { provider: 'anthropic', modelName: model, modelVersion: model, runtime: 'anthropic-api' },
      'text'
    );
  }
}

export const anthropicProvider = new AnthropicProvider();

// Lightweight key validation for the BYOK setup screen's "Test Connection" button —
// checked before the key is saved, so it takes the key as a param rather than reading secure storage.
export async function testAnthropicKey(apiKey: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION },
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AIProviderError('timeout', 'anthropic', 'Anthropic request timed out');
    }
    throw new AIProviderError('network', 'anthropic', 'Failed to reach Anthropic');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new AIProviderError('auth', 'anthropic', 'Anthropic rejected the API key');
    }
    throw new AIProviderError('unknown', 'anthropic', `Anthropic request failed (${response.status})`);
  }
}
