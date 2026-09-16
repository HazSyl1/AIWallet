// BYOK provider — OpenAI Chat Completions with response_format: json_object.

import { eq } from 'drizzle-orm';
import { db, appSettings } from '../../database';
import { secureStorage } from '../../security/SecureStorageService';
import type { AIProvider, ProposalContext } from '../types';
import { AIProviderError } from '../types';
import { buildProposalPrompt } from '../promptBuilder';
import { parseProposalResponse } from '../responseParser';
import type { TransactionProposal } from '../../../shared/types/transaction';

const DEFAULT_MODEL = 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = 30000;

class OpenAIProvider implements AIProvider {
  readonly id = 'openai' as const;

  async isReady(): Promise<boolean> {
    return (await secureStorage.getOpenAIKey()) !== null;
  }

  async generateProposal(
    input: { text: string },
    context: ProposalContext
  ): Promise<TransactionProposal> {
    const apiKey = await secureStorage.getOpenAIKey();
    if (!apiKey) {
      throw new AIProviderError('auth', 'openai', 'No OpenAI API key configured');
    }

    const [settings] = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
    const model = settings?.byokModel || DEFAULT_MODEL;
    const prompt = buildProposalPrompt(input.text, context);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AIProviderError('timeout', 'openai', 'OpenAI request timed out');
      }
      throw new AIProviderError('network', 'openai', 'Failed to reach OpenAI');
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new AIProviderError('auth', 'openai', 'OpenAI rejected the API key');
      }
      if (response.status === 429) {
        throw new AIProviderError('rate_limit', 'openai', 'OpenAI rate limit exceeded');
      }
      throw new AIProviderError('unknown', 'openai', `OpenAI request failed (${response.status})`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new AIProviderError('invalid_response', 'openai', 'OpenAI response had no content');
    }

    return parseProposalResponse(
      content,
      context,
      { provider: 'openai', modelName: model, modelVersion: model, runtime: 'openai-api' },
      'text'
    );
  }
}

export const openAIProvider = new OpenAIProvider();

// Lightweight key validation for the BYOK setup screen's "Test Connection" button —
// checked before the key is saved, so it takes the key as a param rather than reading secure storage.
export async function testOpenAIKey(apiKey: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AIProviderError('timeout', 'openai', 'OpenAI request timed out');
    }
    throw new AIProviderError('network', 'openai', 'Failed to reach OpenAI');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new AIProviderError('auth', 'openai', 'OpenAI rejected the API key');
    }
    throw new AIProviderError('unknown', 'openai', `OpenAI request failed (${response.status})`);
  }
}
