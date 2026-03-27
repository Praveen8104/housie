import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme, ThemeColors } from '../store/ThemeContext';

export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ThemeColors) => T
): T {
  const { colors } = useTheme();
  return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
}
