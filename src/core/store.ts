// Redux Store Configuration

import { configureStore } from '@reduxjs/toolkit';
import transactionsReducer from '../features/transactions/transactionsSlice';
import accountsReducer from '../features/accounts/accountsSlice';
import categoriesReducer from '../features/categories/categoriesSlice';
import captureReducer from '../features/capture/captureSlice';
import settingsReducer from '../features/settings/settingsSlice';
import authReducer from '../features/auth/authSlice';

export const store = configureStore({
  reducer: {
    transactions: transactionsReducer,
    accounts: accountsReducer,
    categories: categoriesReducer,
    capture: captureReducer,
    settings: settingsReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Disable serialization check for dates and complex objects
      serializableCheck: {
        ignoredActions: ['capture/setProposal'],
      },
    }),
});

// Infer types from store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
