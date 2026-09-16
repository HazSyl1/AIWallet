// Device capability detection — classifies the device into a DeviceTier
// so the app can recommend AI models the device can realistically run.

import * as Device from 'expo-device';
import { Paths } from 'expo-file-system';
import type { DeviceTier } from '../../shared/types/common';
import type { ModelPackage } from '../../shared/types/settings';

const GB = 1024 * 1024 * 1024;

export interface DeviceCapability {
  tier: DeviceTier;
  totalMemoryBytes: number | null;
  availableStorageBytes: number | null;
}

export function classifyTier(totalMemoryBytes: number | null): DeviceTier {
  if (totalMemoryBytes === null) return 'core';
  if (totalMemoryBytes < 3 * GB) return 'core';
  if (totalMemoryBytes < 6 * GB) return 'ai_lite';
  return 'ai_standard';
}

export function detectDeviceCapability(): DeviceCapability {
  const totalMemoryBytes = Device.totalMemory ?? null;
  let availableStorageBytes: number | null = null;
  try {
    availableStorageBytes = Paths.availableDiskSpace;
  } catch {
    availableStorageBytes = null;
  }

  return {
    tier: classifyTier(totalMemoryBytes),
    totalMemoryBytes,
    availableStorageBytes,
  };
}

export const TIER_RANK: Record<DeviceTier, number> = {
  core: 0,
  ai_lite: 1,
  ai_standard: 2,
  connected: 3,
};

// Models the device tier can run, sorted best-fit-for-tier first.
export function getRecommendedModels(catalog: ModelPackage[], tier: DeviceTier): ModelPackage[] {
  const deviceRank = TIER_RANK[tier];
  return [...catalog]
    .filter((model) => TIER_RANK[model.minTier ?? 'ai_lite'] <= deviceRank)
    .sort((a, b) => TIER_RANK[b.minTier ?? 'ai_lite'] - TIER_RANK[a.minTier ?? 'ai_lite']);
}

// Whether a device on the given tier has enough headroom to run this model at all.
export function isModelCompatible(model: ModelPackage, tier: DeviceTier): boolean {
  return TIER_RANK[model.minTier ?? 'ai_lite'] <= TIER_RANK[tier];
}

export interface ActiveModelCapabilities {
  supportsVoice: boolean;
  supportsVision: boolean;
}

// What the currently active inference source (local model or BYOK) can handle.
// BYOK is treated as fully capable since we have no capability metadata for
// free-typed BYOK models, and BYOK is the escape hatch this gate points users to.
export function getActiveModelCapabilities(
  catalog: ModelPackage[],
  selectedModelId: string | null,
  byokEnabled: boolean
): ActiveModelCapabilities {
  if (byokEnabled) return { supportsVoice: true, supportsVision: true };
  const model = catalog.find((m) => m.id === selectedModelId && m.isInstalled);
  if (!model) return { supportsVoice: false, supportsVision: false };
  return { supportsVoice: model.supportsVoice === true, supportsVision: model.supportsVision === true };
}
