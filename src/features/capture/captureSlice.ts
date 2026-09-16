// Capture Redux Slice - manages current capture session state

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TransactionProposal, CaptureSource, createDefaultProposal } from '../../shared/types';
import type { RootState } from '../../core/store';
import { generateProposal } from '../../services/ai/InferenceRouter';
import { AIProviderError, type ProposalContext } from '../../services/ai/types';

type CaptureStep = 'idle' | 'input' | 'processing' | 'review' | 'confirming';
export type CaptureErrorKind = 'local' | 'byok' | 'generic' | null;

interface CaptureState {
  source: CaptureSource;
  step: CaptureStep;
  rawInput: string | null;
  imageUri: string | null;
  proposal: TransactionProposal | null;
  modifiedFields: string[];
  isProcessing: boolean;
  processingMessage: string | null;
  error: string | null;
  errorKind: CaptureErrorKind;
  duplicateWarning: boolean;
  duplicateTransactionId: string | null;
}

const initialState: CaptureState = {
  source: 'manual',
  step: 'idle',
  rawInput: null,
  imageUri: null,
  proposal: null,
  modifiedFields: [],
  isProcessing: false,
  processingMessage: null,
  error: null,
  errorKind: null,
  duplicateWarning: false,
  duplicateTransactionId: null,
};

interface GenerateProposalRejection {
  message: string;
  errorKind: Exclude<CaptureErrorKind, null>;
}

export const generateProposalFromText = createAsyncThunk<
  TransactionProposal,
  string,
  { state: RootState; rejectValue: GenerateProposalRejection }
>('capture/generateProposalFromText', async (text, { getState, rejectWithValue }) => {
  const state = getState();
  const context: ProposalContext = {
    accounts: state.accounts.items,
    categories: state.categories.items,
    now: new Date().toISOString(),
  };

  try {
    return await generateProposal(
      {
        byokEnabled: state.settings.byokEnabled,
        byokProvider: state.settings.byokProvider,
        selectedModelId: state.settings.selectedModelId,
      },
      { text },
      context
    );
  } catch (err) {
    if (err instanceof AIProviderError) {
      return rejectWithValue({
        message: err.message,
        errorKind: err.provider === 'local' ? 'local' : 'byok',
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Failed to generate proposal',
      errorKind: 'generic',
    });
  }
});

const captureSlice = createSlice({
  name: 'capture',
  initialState,
  reducers: {
    startCapture(state, action: PayloadAction<CaptureSource>) {
      state.source = action.payload;
      state.step = 'input';
      state.rawInput = null;
      state.imageUri = null;
      state.proposal = action.payload === 'manual' ? createDefaultProposal() : null;
      state.modifiedFields = [];
      state.error = null;
      state.errorKind = null;
      state.duplicateWarning = false;
      state.duplicateTransactionId = null;
    },

    setRawInput(state, action: PayloadAction<string>) {
      state.rawInput = action.payload;
    },

    setImageUri(state, action: PayloadAction<string>) {
      state.imageUri = action.payload;
    },

    startProcessing(state, action: PayloadAction<string | undefined>) {
      state.step = 'processing';
      state.isProcessing = true;
      state.processingMessage = action.payload ?? 'Processing...';
      state.error = null;
    },

    setProposal(state, action: PayloadAction<TransactionProposal>) {
      state.proposal = action.payload;
      state.step = 'review';
      state.isProcessing = false;
      state.processingMessage = null;
    },

    updateProposalField<K extends keyof TransactionProposal>(
      state: CaptureState,
      action: PayloadAction<{ field: K; value: TransactionProposal[K] }>
    ) {
      if (state.proposal) {
        const { field, value } = action.payload;
        (state.proposal as Record<K, TransactionProposal[K]>)[field] = value;

        if (!state.modifiedFields.includes(field as string)) {
          state.modifiedFields.push(field as string);
        }

        if (state.proposal.uncertainFields.includes(field as string)) {
          state.proposal.uncertainFields = state.proposal.uncertainFields.filter(
            (f) => f !== field
          );
        }
      }
    },

    setDuplicateWarning(
      state,
      action: PayloadAction<{ warning: boolean; transactionId?: string }>
    ) {
      state.duplicateWarning = action.payload.warning;
      state.duplicateTransactionId = action.payload.transactionId ?? null;
    },

    startConfirming(state) {
      state.step = 'confirming';
      state.isProcessing = true;
      state.processingMessage = 'Saving...';
    },

    setError(state, action: PayloadAction<{ message: string; kind?: CaptureErrorKind }>) {
      state.error = action.payload.message;
      state.errorKind = action.payload.kind ?? 'generic';
      state.isProcessing = false;
      state.processingMessage = null;
    },

    clearError(state) {
      state.error = null;
      state.errorKind = null;
    },

    resetCapture() {
      return initialState;
    },

    backToInput(state) {
      state.step = 'input';
      state.proposal = null;
      state.error = null;
      state.errorKind = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateProposalFromText.pending, (state) => {
        state.step = 'processing';
        state.isProcessing = true;
        state.processingMessage = 'Analyzing your input...';
        state.error = null;
        state.errorKind = null;
      })
      .addCase(generateProposalFromText.fulfilled, (state, action) => {
        state.proposal = action.payload;
        state.step = 'review';
        state.isProcessing = false;
        state.processingMessage = null;
      })
      .addCase(generateProposalFromText.rejected, (state, action) => {
        state.step = 'input';
        state.isProcessing = false;
        state.processingMessage = null;
        state.error = action.payload?.message ?? action.error.message ?? 'Failed to generate proposal';
        state.errorKind = action.payload?.errorKind ?? 'generic';
      });
  },
});

export const {
  startCapture,
  setRawInput,
  setImageUri,
  startProcessing,
  setProposal,
  updateProposalField,
  setDuplicateWarning,
  startConfirming,
  setError,
  clearError,
  resetCapture,
  backToInput,
} = captureSlice.actions;

export default captureSlice.reducer;
