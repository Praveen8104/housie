import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'housie_theme';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  text: string;
  textSecondary: string;
  marked: string;
  empty: string;
  number: string;
  calledNumber: string;
  border: string;
}

const DARK_COLORS: ThemeColors = {
  background: '#0a0e14',
  surface: '#1a1f2e',
  card: '#242b3d',
  primary: '#e94560',
  secondary: '#7c3aed',
  accent: '#f5c542',
  success: '#00d68f',
  warning: '#ff9f43',
  text: '#f0f6fc',
  textSecondary: '#a8b2be',
  marked: '#e94560',
  empty: '#151a26',
  number: '#f0f6fc',
  calledNumber: '#f5c542',
  border: '#2d3548',
};

const LIGHT_COLORS: ThemeColors = {
  background: '#f5f5f5',
  surface: '#ffffff',
  card: '#e8edf2',
  primary: '#d63851',
  secondary: '#6d28d9',
  accent: '#d4a017',
  success: '#059669',
  warning: '#ea8a2e',
  text: '#1a1a2e',
  textSecondary: '#6b7280',
  marked: '#d63851',
  empty: '#e5e7eb',
  number: '#1a1a2e',
  calledNumber: '#d4a017',
  border: '#d1d5db',
};

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  colors: DARK_COLORS,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(val => {
      if (val === 'light' || val === 'dark') setMode(val);
    });
  }, []);

  const toggleTheme = () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    AsyncStorage.setItem(THEME_KEY, next);
  };

  const colors = mode === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ mode, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
