// Accounts Redux Slice

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Account } from '../../shared/types';
import type { CreateAccountInput, UpdateAccountInput } from '../../shared/types';
import { accountRepository } from '../../services/database';
import { enqueueSync } from '../../services/supabase/sync';

interface AccountsState {
  items: Account[];
  loading: boolean;
  error: string | null;
  totalBalance: number;
  selectedId: string | null;
}

const initialState: AccountsState = {
  items: [],
  loading: false,
  error: null,
  totalBalance: 0,
  selectedId: null,
};

export const fetchAccounts = createAsyncThunk(
  'accounts/fetchAll',
  async (includeInactive: boolean = false) => {
    const accounts = await accountRepository.getAll(includeInactive);
    const totalBalance = await accountRepository.getTotalBalance();
    return { accounts, totalBalance };
  }
);

const getUserId = (getState: () => unknown) =>
  (getState() as { auth: { user: { id: string } | null } }).auth?.user?.id ?? null;

export const createAccount = createAsyncThunk(
  'accounts/create',
  async (input: CreateAccountInput, { getState }) => {
    const account = await accountRepository.create(input);
    const userId = getUserId(getState);
    if (userId) await enqueueSync('account', account.id, 'create', { ...account as unknown as Record<string, unknown>, userId });
    return account;
  }
);

export const updateAccount = createAsyncThunk(
  'accounts/update',
  async ({ id, updates }: { id: string; updates: UpdateAccountInput }, { getState }) => {
    const result = await accountRepository.update(id, updates);
    if (!result) throw new Error('Account not found');
    const userId = getUserId(getState);
    if (userId) await enqueueSync('account', result.id, 'update', { ...result as unknown as Record<string, unknown>, userId });
    return result;
  }
);

export const archiveAccount = createAsyncThunk(
  'accounts/archive',
  async (id: string, { getState }) => {
    const success = await accountRepository.archive(id);
    if (!success) throw new Error('Failed to archive account');
    const userId = getUserId(getState);
    const updated = await accountRepository.getById(id);
    if (userId && updated) await enqueueSync('account', id, 'update', { ...updated as unknown as Record<string, unknown>, userId });
    return id;
  }
);

export const deleteAccount = createAsyncThunk(
  'accounts/delete',
  async (id: string, { getState }) => {
    const success = await accountRepository.delete(id);
    if (!success) throw new Error('Failed to delete account');
    const userId = getUserId(getState);
    if (userId) await enqueueSync('account', id, 'delete', { id });
    return id;
  }
);

const accountsSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    selectAccount(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.accounts;
        state.totalBalance = action.payload.totalBalance;
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to fetch accounts';
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(createAccount.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to create account';
      })
      .addCase(updateAccount.fulfilled, (state, action) => {
        const index = state.items.findIndex((a) => a.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(archiveAccount.fulfilled, (state, action) => {
        state.items = state.items.filter((a) => a.id !== action.payload);
        if (state.selectedId === action.payload) state.selectedId = null;
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.items = state.items.filter((a) => a.id !== action.payload);
        if (state.selectedId === action.payload) state.selectedId = null;
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to delete account';
      });
  },
});

export const { selectAccount, clearError } = accountsSlice.actions;

export default accountsSlice.reducer;
