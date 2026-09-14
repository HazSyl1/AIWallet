// Main App Component

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, AppState } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { store } from './store';
import Navigation from './Navigation';
import { expoDb, runMigrations, seedDatabase, useDrizzleStudio } from '../services/database';
import { fetchSettings } from '../features/settings/settingsSlice';
import { fetchAccounts } from '../features/accounts/accountsSlice';
import { fetchCategories } from '../features/categories/categoriesSlice';
import { restoreSession, syncNow } from '../features/auth/authSlice';

function DrizzleStudio() {
  useDrizzleStudio(expoDb);
  return null;
}

function AppContent() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    initializeApp();
  }, []);

  // Trigger sync queue whenever app comes back to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        const userId = store.getState().auth.user?.id;
        if (userId) store.dispatch(syncNow(userId) as any);
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Initializing app...');

      await runMigrations(expoDb);
      console.log('Database migrations complete');

      await seedDatabase();
      console.log('Database seeded');

      await Promise.all([
        store.dispatch(fetchSettings() as any),
        store.dispatch(fetchAccounts(false) as any),
        store.dispatch(fetchCategories() as any),
        store.dispatch(restoreSession() as any),
      ]);
      console.log('Initial data loaded');

      setIsInitializing(false);
    } catch (err) {
      console.error('Failed to initialize app:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize');
      setIsInitializing(false);
    }
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading AI Wallet...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Initialization Error</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <>
      {__DEV__ && <DrizzleStudio />}
      <Navigation />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
