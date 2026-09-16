// AI Redux Slice — model catalog, downloads, and device capability

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { eq } from 'drizzle-orm';
import { Directory, File, Paths } from 'expo-file-system';
import { db, modelPackages } from '../../services/database';
import { supabase } from '../../services/supabase/client';
import type { ModelPackage } from '../../shared/types';
import { updateSettings } from '../settings/settingsSlice';
import type { DeviceCapability } from '../../services/ai/deviceCapability';

interface AiState {
  catalog: ModelPackage[];
  catalogLoading: boolean;
  catalogError: string | null;
  deviceCapability: DeviceCapability | null;
  downloadProgress: Record<string, number>;
}

const initialState: AiState = {
  catalog: [],
  catalogLoading: false,
  catalogError: null,
  deviceCapability: null,
  downloadProgress: {},
};

function modelsDirectory(): Directory {
  const dir = new Directory(Paths.document, 'models');
  if (!dir.exists) dir.create();
  return dir;
}

// In-progress download AbortControllers, keyed by model id. Not part of Redux
// state since AbortController isn't serializable — cancelDownload looks up
// the controller here and aborts it; the resulting AbortError is handled by
// downloadModel's own rejected case.
const downloadControllers = new Map<string, AbortController>();

// Fetches the remote catalog and upserts it into the local `model_packages`
// cache (leaving isInstalled/localPath/installedAt untouched on conflict —
// those are local install state, not catalog metadata). Falls back to
// whatever's already cached locally if the network call fails, so the
// catalog stays readable fully offline after the first successful fetch.
export const fetchModelCatalog = createAsyncThunk('ai/fetchCatalog', async () => {
  try {
    const { data, error } = await supabase
      .from('model_catalog')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    for (const row of data ?? []) {
      const catalogFields = {
        name: row.name,
        modelId: row.model_id,
        version: row.version,
        paramsBillions: row.params_billions,
        contextLength: row.context_length,
        downloadSizeBytes: row.download_size_bytes,
        storageSizeBytes: row.storage_size_bytes,
        supportsText: row.supports_text,
        supportsVision: row.supports_vision,
        supportsVoice: row.supports_voice,
        minTier: row.min_tier,
        downloadUrl: row.download_url,
        checksum: row.checksum,
      };

      await db
        .insert(modelPackages)
        .values({ id: row.id, ...catalogFields, isInstalled: false })
        .onConflictDoUpdate({ target: modelPackages.id, set: catalogFields });
    }
  } catch (err) {
    console.warn('Model catalog fetch failed, using local cache:', err);
  }

  return db.select().from(modelPackages);
});

export const downloadModel = createAsyncThunk(
  'ai/downloadModel',
  async (modelId: string, { dispatch, getState }) => {
    const state = getState() as { ai: AiState };
    const model = state.ai.catalog.find((m) => m.id === modelId);
    if (!model) throw new Error('Model not found in catalog');

    const destination = new File(modelsDirectory(), `${model.id}.gguf`);
    const controller = new AbortController();
    downloadControllers.set(modelId, controller);

    try {
      const file = await File.downloadFileAsync(model.downloadUrl, destination, {
        idempotent: true,
        signal: controller.signal,
        onProgress: ({ bytesWritten, totalBytes }) => {
          if (totalBytes > 0) {
            dispatch(setDownloadProgress({ id: modelId, progress: bytesWritten / totalBytes }));
          }
        },
      });

      // NOTE: checksum verification against model.checksum is not implemented yet —
      // expo-crypto has no streaming file-hash API, and no catalog row ships a
      // verified checksum yet (see supabase_schema.sql). Revisit once both exist.

      const installedAt = new Date().toISOString();
      await db
        .update(modelPackages)
        .set({ isInstalled: true, localPath: file.uri, installedAt })
        .where(eq(modelPackages.id, modelId));

      return { id: modelId, localPath: file.uri, installedAt };
    } catch (err) {
      try {
        if (destination.exists) destination.delete();
      } catch {
        // best-effort cleanup of a partial file; safe to ignore
      }
      throw err;
    } finally {
      downloadControllers.delete(modelId);
    }
  }
);

export const cancelDownload = createAsyncThunk('ai/cancelDownload', async (modelId: string) => {
  downloadControllers.get(modelId)?.abort();
  return modelId;
});

export const deleteModel = createAsyncThunk(
  'ai/deleteModel',
  async (modelId: string, { getState }) => {
    const state = getState() as { ai: AiState };
    const model = state.ai.catalog.find((m) => m.id === modelId);
    if (model?.localPath) {
      try {
        const file = new File(model.localPath);
        if (file.exists) file.delete();
      } catch (err) {
        console.warn('Failed to delete model file:', err);
      }
    }

    await db
      .update(modelPackages)
      .set({ isInstalled: false, localPath: null, installedAt: null })
      .where(eq(modelPackages.id, modelId));

    return modelId;
  }
);

export const selectLocalModel = createAsyncThunk(
  'ai/selectLocalModel',
  async (modelId: string, { dispatch }) => {
    await dispatch(updateSettings({ selectedModelId: modelId, byokEnabled: false }) as any);
    return modelId;
  }
);

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    setDeviceCapability(state, action: PayloadAction<DeviceCapability>) {
      state.deviceCapability = action.payload;
    },
    setDownloadProgress(state, action: PayloadAction<{ id: string; progress: number }>) {
      state.downloadProgress[action.payload.id] = action.payload.progress;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchModelCatalog.pending, (state) => {
        state.catalogLoading = true;
        state.catalogError = null;
      })
      .addCase(fetchModelCatalog.fulfilled, (state, action) => {
        state.catalogLoading = false;
        state.catalog = action.payload;
      })
      .addCase(fetchModelCatalog.rejected, (state, action) => {
        state.catalogLoading = false;
        state.catalogError = action.error.message ?? 'Failed to load model catalog';
      })
      .addCase(downloadModel.fulfilled, (state, action) => {
        delete state.downloadProgress[action.payload.id];
        const model = state.catalog.find((m) => m.id === action.payload.id);
        if (model) {
          model.isInstalled = true;
          model.localPath = action.payload.localPath;
          model.installedAt = action.payload.installedAt;
        }
      })
      .addCase(downloadModel.rejected, (state, action) => {
        delete state.downloadProgress[action.meta.arg];
        if (action.error.name !== 'AbortError') {
          state.catalogError = action.error.message ?? 'Failed to download model';
        }
      })
      .addCase(deleteModel.fulfilled, (state, action) => {
        const model = state.catalog.find((m) => m.id === action.payload);
        if (model) {
          model.isInstalled = false;
          model.localPath = null;
          model.installedAt = null;
        }
      });
  },
});

export const { setDeviceCapability, setDownloadProgress } = aiSlice.actions;
export default aiSlice.reducer;
