import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { DefaultTheme, DarkTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import { lightColors, darkColors, type ThemeColors } from './palette';

interface ThemeContextValue {
  colors: ThemeColors;
  dark: boolean;
  navigationTheme: NavigationTheme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();

  const value = useMemo<ThemeContextValue>(() => {
    const dark = scheme === 'dark';
    const colors = dark ? darkColors : lightColors;
    const base = dark ? DarkTheme : DefaultTheme;
    const navigationTheme: NavigationTheme = {
      ...base,
      dark,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border,
      },
    };
    return { colors, dark, navigationTheme };
  }, [scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
