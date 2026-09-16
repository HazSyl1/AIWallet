// Main App Component

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, AppState, Appearance } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { store } from './store';
import { useAppSelector } from './hooks';
import Navigation from './Navigation';
import ErrorBoundary from './ErrorBoundary';
import { ThemeProvider, useTheme } from '../shared/theme/ThemeContext';
import { expoDb, runMigrations, seedDatabase, useDrizzleStudio } from '../services/database';
import { fetchSettings, setDeviceTier } from '../features/settings/settingsSlice';
import { fetchAccounts } from '../features/accounts/accountsSlice';
import { fetchCategories } from '../features/categories/categoriesSlice';
import { restoreSession, syncNow } from '../features/auth/authSlice';
import { detectDeviceCapability } from '../services/ai/deviceCapability';
import { setDeviceCapability } from '../features/ai/aiSlice';

function ThemeSync() {
  const theme = useAppSelector((state) => state.settings.theme);
  useEffect(() => {
    Appearance.setColorScheme(theme === 'light' || theme === 'dark' ? theme : 'unspecified');
  }, [theme]);
  return null;
}

function DrizzleStudio() {
  useDrizzleStudio(expoDb);
  return null;
}

function AppContent() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
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

      const capability = detectDeviceCapability();
      store.dispatch(setDeviceCapability(capability));

      // 'connected' is set when BYOK is active — don't stomp it with the hardware tier.
      if (!store.getState().settings.byokEnabled) {
        store.dispatch(setDeviceTier(capability.tier) as any);
        console.log('Device tier detected:', capability.tier);
      }

      setIsInitializing(false);
    } catch (err) {
      console.error('Failed to initialize app:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize');
      setIsInitializing(false);
    }
  };

  let content: React.ReactNode;
  if (isInitializing) {
    content = (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading AI Wallet...</Text>
      </View>
    );
  } else if (error) {
    content = (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Initialization Error</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  } else {
    content = (
      <ErrorBoundary>
        {__DEV__ && <DrizzleStudio />}
        <Navigation />
      </ErrorBoundary>
    );
  }

  return (
    <>
      <ThemeSync />
      {content}
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <AppContent />
        </SafeAreaProvider>
      </ThemeProvider>
    </Provider>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: 32,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.danger,
      marginBottom: 12,
    },
    errorText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
}
