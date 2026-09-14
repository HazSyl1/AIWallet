// Capture Redux Slice - manages current capture session state

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TransactionProposal, CaptureSource, createDefaultProposal } from '../../shared/types';

type CaptureStep = 'idle' | 'input' | 'processing' | 'review' | 'confirming';

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
  duplicateWarning: false,
  duplicateTransactionId: null,
};

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

    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isProcessing = false;
      state.processingMessage = null;
    },

    clearError(state) {
      state.error = null;
    },

    resetCapture() {
      return initialState;
    },

    backToInput(state) {
      state.step = 'input';
      state.proposal = null;
      state.error = null;
    },
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
