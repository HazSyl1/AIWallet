// Transactions Redux Slice

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Transaction, TransactionFilters, TransactionProposal } from '../../shared/types';
import { transactionRepository } from '../../services/database';
import { enqueueSync } from '../../services/supabase/sync';

interface TransactionsState {
  items: Transaction[];
  loading: boolean;
  error: string | null;
  filters: TransactionFilters;
  selectedId: string | null;
}

const initialState: TransactionsState = {
  items: [],
  loading: false,
  error: null,
  filters: {},
  selectedId: null,
};

export const fetchTransactions = createAsyncThunk(
  'transactions/fetchAll',
  async (filters?: TransactionFilters) => {
    return transactionRepository.getAll(filters);
  }
);

export const fetchRecentTransactions = createAsyncThunk(
  'transactions/fetchRecent',
  async (limit: number = 10) => {
    return transactionRepository.getRecent(limit);
  }
);

export const createTransaction = createAsyncThunk(
  'transactions/create',
  async (proposal: TransactionProposal) => {
    const tx = await transactionRepository.createFromProposal(proposal);
    await enqueueSync('transaction', tx.id, 'create', tx as unknown as Record<string, unknown>);
    return tx;
  }
);

export const updateTransaction = createAsyncThunk(
  'transactions/update',
  async ({
    id,
    updates,
  }: {
    id: string;
    updates: Partial<Pick<Transaction, 'merchant' | 'categoryId' | 'note' | 'amountPaise' | 'occurredAt'>>;
  }) => {
    const result = await transactionRepository.update(id, updates);
    if (!result) throw new Error('Transaction not found');
    await enqueueSync('transaction', result.id, 'update', result as unknown as Record<string, unknown>);
    return result;
  }
);

export const deleteTransaction = createAsyncThunk(
  'transactions/delete',
  async (id: string) => {
    const success = await transactionRepository.softDelete(id);
    if (!success) throw new Error('Failed to delete transaction');
    await enqueueSync('transaction', id, 'delete', { id });
    return id;
  }
);

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<TransactionFilters>) {
      state.filters = action.payload;
    },
    clearFilters(state) {
      state.filters = {};
    },
    selectTransaction(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to fetch transactions';
      })
      .addCase(fetchRecentTransactions.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(createTransaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to create transaction';
      })
      .addCase(updateTransaction.fulfilled, (state, action) => {
        const index = state.items.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t.id !== action.payload);
        if (state.selectedId === action.payload) state.selectedId = null;
      });
  },
});

export const { setFilters, clearFilters, selectTransaction, clearError } =
  transactionsSlice.actions;

export default transactionsSlice.reducer;
