// Settings Redux Slice

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { AppSettings } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/types';
import type { DeviceTier } from '../../shared/types';
import { db, appSettings } from '../../services/database';
import { eq } from 'drizzle-orm';
import { secureStorage } from '../../services/security/SecureStorageService';

interface SettingsState extends Omit<AppSettings, 'id'> {
  loading: boolean;
  error: string | null;
  hasOpenAIKey: boolean;
  hasAnthropicKey: boolean;
}

const initialState: SettingsState = {
  ...DEFAULT_SETTINGS,
  loading: false,
  error: null,
  hasOpenAIKey: false,
  hasAnthropicKey: false,
};

export const fetchSettings = createAsyncThunk('settings/fetch', async () => {
  const result = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
  const byokStatus = await secureStorage.hasBYOKKey();

  return {
    settings: result[0] ?? { id: 1, ...DEFAULT_SETTINGS },
    hasOpenAIKey: byokStatus.openai,
    hasAnthropicKey: byokStatus.anthropic,
  };
});

export const updateSettings = createAsyncThunk(
  'settings/update',
  async (updates: Partial<Omit<AppSettings, 'id'>>) => {
    const now = new Date().toISOString();
    await db
      .update(appSettings)
      .set({ ...updates, updatedAt: now })
      .where(eq(appSettings.id, 1));

    const result = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
    return result[0] ?? { id: 1, ...DEFAULT_SETTINGS };
  }
);

export const setDeviceTier = createAsyncThunk(
  'settings/setDeviceTier',
  async (tier: DeviceTier, { dispatch }) => {
    await dispatch(updateSettings({ deviceTier: tier }));
    return tier;
  }
);

export const completeOnboarding = createAsyncThunk(
  'settings/completeOnboarding',
  async (_, { dispatch }) => {
    await dispatch(updateSettings({ isOnboarded: true }));
    return true;
  }
);

export const saveOpenAIKey = createAsyncThunk('settings/saveOpenAIKey', async (key: string) => {
  await secureStorage.setOpenAIKey(key);
  return true;
});

export const saveAnthropicKey = createAsyncThunk(
  'settings/saveAnthropicKey',
  async (key: string) => {
    await secureStorage.setAnthropicKey(key);
    return true;
  }
);

export const deleteOpenAIKey = createAsyncThunk('settings/deleteOpenAIKey', async () => {
  await secureStorage.deleteOpenAIKey();
  return false;
});

export const deleteAnthropicKey = createAsyncThunk('settings/deleteAnthropicKey', async () => {
  await secureStorage.deleteAnthropicKey();
  return false;
});

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        const { id: _id, ...rest } = action.payload.settings;
        Object.assign(state, rest);
        state.hasOpenAIKey = action.payload.hasOpenAIKey;
        state.hasAnthropicKey = action.payload.hasAnthropicKey;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to fetch settings';
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        const { id: _id, ...rest } = action.payload;
        Object.assign(state, rest);
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to update settings';
      })
      .addCase(saveOpenAIKey.fulfilled, (state) => {
        state.hasOpenAIKey = true;
      })
      .addCase(saveAnthropicKey.fulfilled, (state) => {
        state.hasAnthropicKey = true;
      })
      .addCase(deleteOpenAIKey.fulfilled, (state) => {
        state.hasOpenAIKey = false;
      })
      .addCase(deleteAnthropicKey.fulfilled, (state) => {
        state.hasAnthropicKey = false;
      });
  },
});

export const { clearError } = settingsSlice.actions;

export default settingsSlice.reducer;
