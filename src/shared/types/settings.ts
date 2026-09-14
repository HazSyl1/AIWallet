// Settings types — DB shape comes from Drizzle schema

export type { AppSettings, NewAppSettings, ModelPackage, NewModelPackage } from '../../services/database/schema';

import type { AppSettings } from '../../services/database/schema';
import type { DeviceTier, ISOTimestamp } from './common';

export interface BenchmarkResult {
  deviceModel: string;
  osVersion: string;
  availableMemory: number;
  availableStorage: number;
  inferenceLatencyMs: number | null;
  tier: DeviceTier;
  runAt: ISOTimestamp;
}

export interface BYOKProviderConfig {
  provider: 'openai' | 'anthropic';
  models: { id: string; name: string; supportsVision: boolean }[];
  selectedModel: string;
  isKeyConfigured: boolean;
}

export const DEFAULT_SETTINGS: Omit<AppSettings, 'id'> = {
  isOnboarded: false,
  deviceTier: 'core',
  selectedModelId: null,
  byokEnabled: false,
  byokProvider: null,
  byokModel: null,
  theme: 'system',
  defaultAccountId: null,
  syncEnabled: false,
  supabaseUserId: null,
  lastSyncedAt: null,
  updatedAt: new Date().toISOString(),
};
