// On-device inference via llama.rn — loads whichever model the user selected in Model Manager.

import { initLlama, releaseAllLlama, type LlamaContext } from 'llama.rn';
import { eq } from 'drizzle-orm';
import { db, appSettings, modelPackages } from '../../database';
import type { AIProvider, ProposalContext } from '../types';
import { AIProviderError } from '../types';
import { buildProposalPrompt } from '../promptBuilder';
import { parseProposalResponse } from '../responseParser';
import type { TransactionProposal } from '../../../shared/types/transaction';

let loadedContext: LlamaContext | null = null;
let loadedModelId: string | null = null;

async function getSelectedInstalledModel() {
  const [settings] = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
  if (!settings?.selectedModelId) return null;

  const [model] = await db
    .select()
    .from(modelPackages)
    .where(eq(modelPackages.id, settings.selectedModelId))
    .limit(1);

  if (!model?.isInstalled || !model.localPath) return null;
  return model;
}

async function getContextFor(modelId: string, localPath: string): Promise<LlamaContext> {
  if (loadedContext && loadedModelId === modelId) return loadedContext;

  if (loadedContext) {
    await releaseAllLlama();
    loadedContext = null;
    loadedModelId = null;
  }

  loadedContext = await initLlama({ model: localPath, n_ctx: 4096 });
  loadedModelId = modelId;
  return loadedContext;
}

class LocalLlamaProvider implements AIProvider {
  readonly id = 'local' as const;

  async isReady(): Promise<boolean> {
    return (await getSelectedInstalledModel()) !== null;
  }

  async generateProposal(
    input: { text: string },
    context: ProposalContext
  ): Promise<TransactionProposal> {
    const model = await getSelectedInstalledModel();
    if (!model || !model.localPath) {
      throw new AIProviderError('not_installed', 'local', 'No local model is selected and installed');
    }

    let llamaContext: LlamaContext;
    try {
      llamaContext = await getContextFor(model.id, model.localPath);
    } catch (err) {
      throw new AIProviderError(
        'unknown',
        'local',
        err instanceof Error ? err.message : 'Failed to load local model'
      );
    }

    const prompt = buildProposalPrompt(input.text, context);

    let resultText: string;
    try {
      const result = await llamaContext.completion({
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        n_predict: 256,
        temperature: 0.2,
      });
      resultText = result.content || result.text;
    } catch (err) {
      throw new AIProviderError(
        'unknown',
        'local',
        err instanceof Error ? err.message : 'Local completion failed'
      );
    }

    return parseProposalResponse(
      resultText,
      context,
      { provider: 'local', modelName: model.name, modelVersion: model.version, runtime: 'llama.rn' },
      'text'
    );
  }
}

export const localLlamaProvider = new LocalLlamaProvider();
