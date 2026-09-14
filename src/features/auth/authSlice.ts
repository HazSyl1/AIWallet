import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { User } from '@supabase/supabase-js';
import { authService } from '../../services/supabase/auth';
import { db } from '../../services/database/drizzle';
import { appSettings, accounts, categories, transactions } from '../../services/database/schema';
import { eq, isNull } from 'drizzle-orm';
import { backupToSupabase, restoreFromSupabase, processSyncQueue } from '../../services/supabase/sync';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  syncStatus: 'idle' | 'syncing' | 'done' | 'error';
  lastSyncedAt: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  syncStatus: 'idle',
  lastSyncedAt: null,
};

export const restoreSession = createAsyncThunk('auth/restoreSession', async () => {
  const { user } = await authService.getSession();
  return user;
});

export const signUp = createAsyncThunk(
  'auth/signUp',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    const result = await authService.signUp(email, password);
    if (result.error) return rejectWithValue(result.error);
    return result.user;
  }
);

export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    const result = await authService.signIn(email, password);
    if (result.error) return rejectWithValue(result.error);

    if (result.user) {
      const userId = result.user.id;
      const now = new Date().toISOString();
      // Stamp userId on all pre-existing local rows that don't have one yet
      await Promise.all([
        db.update(accounts).set({ userId }).where(isNull(accounts.userId)),
        db.update(categories).set({ userId }).where(isNull(categories.userId)),
        db.update(transactions).set({ userId }).where(isNull(transactions.userId)),
        db.update(appSettings)
          .set({ supabaseUserId: userId, syncEnabled: true, updatedAt: now })
          .where(eq(appSettings.id, 1)),
      ]);
    }

    return result.user;
  }
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  await authService.signOut();
  await db.update(appSettings)
    .set({ supabaseUserId: null, syncEnabled: false, updatedAt: new Date().toISOString() })
    .where(eq(appSettings.id, 1));
});

export const syncNow = createAsyncThunk(
  'auth/syncNow',
  async (userId: string, { rejectWithValue }) => {
    try {
      await processSyncQueue(userId);
      const now = new Date().toISOString();
      await db.update(appSettings)
        .set({ lastSyncedAt: now, updatedAt: now })
        .where(eq(appSettings.id, 1));
      return now;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Sync failed');
    }
  }
);

export const runBackup = createAsyncThunk(
  'auth/runBackup',
  async (userId: string, { rejectWithValue }) => {
    try {
      await backupToSupabase(userId);
      const now = new Date().toISOString();
      await db.update(appSettings)
        .set({ lastSyncedAt: now, updatedAt: now })
        .where(eq(appSettings.id, 1));
      return now;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Backup failed');
    }
  }
);

export const runRestore = createAsyncThunk(
  'auth/runRestore',
  async (userId: string, { rejectWithValue }) => {
    try {
      await restoreFromSupabase(userId);
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Restore failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      // restoreSession
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload;
      })

      // signUp / signIn
      .addCase(signUp.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(signUp.fulfilled, (state, action) => { state.loading = false; state.user = action.payload; })
      .addCase(signUp.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

      .addCase(signIn.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(signIn.fulfilled, (state, action) => { state.loading = false; state.user = action.payload; })
      .addCase(signIn.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

      // signOut
      .addCase(signOut.fulfilled, (state) => { state.user = null; })

      // sync
      .addCase(syncNow.pending, (state) => { state.syncStatus = 'syncing'; })
      .addCase(syncNow.fulfilled, (state, action) => { state.syncStatus = 'done'; state.lastSyncedAt = action.payload; })
      .addCase(syncNow.rejected, (state) => { state.syncStatus = 'error'; })

      // backup
      .addCase(runBackup.pending, (state) => { state.syncStatus = 'syncing'; })
      .addCase(runBackup.fulfilled, (state, action) => { state.syncStatus = 'done'; state.lastSyncedAt = action.payload; })
      .addCase(runBackup.rejected, (state, action) => { state.syncStatus = 'error'; state.error = action.payload as string; })

      // restore
      .addCase(runRestore.pending, (state) => { state.syncStatus = 'syncing'; })
      .addCase(runRestore.fulfilled, (state) => { state.syncStatus = 'done'; })
      .addCase(runRestore.rejected, (state, action) => { state.syncStatus = 'error'; state.error = action.payload as string; });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
