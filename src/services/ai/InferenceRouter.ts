// Picks the active provider based on settings and routes generateProposal to it.

import type { AppSettings } from '../../shared/types';
import type { TransactionProposal } from '../../shared/types/transaction';
import type { AIProvider, ProposalContext } from './types';
import { AIProviderError } from './types';
import { localLlamaProvider } from './providers/LocalLlamaProvider';
import { openAIProvider } from './providers/OpenAIProvider';
import { anthropicProvider } from './providers/AnthropicProvider';

export function getActiveProvider(
  settings: Pick<AppSettings, 'byokEnabled' | 'byokProvider' | 'selectedModelId'>
): AIProvider | null {
  if (settings.byokEnabled) {
    if (settings.byokProvider === 'openai') return openAIProvider;
    if (settings.byokProvider === 'anthropic') return anthropicProvider;
    return null;
  }
  if (settings.selectedModelId) return localLlamaProvider;
  return null;
}

export async function generateProposal(
  settings: Pick<AppSettings, 'byokEnabled' | 'byokProvider' | 'selectedModelId'>,
  input: { text: string },
  context: ProposalContext
): Promise<TransactionProposal> {
  const provider = getActiveProvider(settings);
  if (!provider) {
    throw new AIProviderError(
      'not_installed',
      settings.byokEnabled ? (settings.byokProvider ?? 'openai') : 'local',
      'No AI provider is configured'
    );
  }

  return provider.generateProposal(input, context);
}
