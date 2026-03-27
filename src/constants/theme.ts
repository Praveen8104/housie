// Default dark theme colors — used as static fallback
// For dynamic theming, use useTheme().colors from ThemeContext
export const COLORS = {
  background: '#0d1117',
  surface: '#161b22',
  card: '#1c2333',
  primary: '#e94560',
  secondary: '#7c3aed',
  accent: '#f5c542',
  success: '#00d68f',
  warning: '#ff9f43',
  text: '#f0f6fc',
  textSecondary: '#8b949e',
  marked: '#e94560',
  empty: '#21262d',
  number: '#f0f6fc',
  calledNumber: '#f5c542',
  border: '#30363d',
};

export const FONTS = {
  regular: 16,
  medium: 18,
  large: 24,
  xlarge: 36,
  xxlarge: 48,
};

// Prize distribution percentages of total pool
export const PRIZE_DISTRIBUTION: Record<string, number> = {
  jaldiFive: 20,
  topLine: 10,
  middleLine: 10,
  bottomLine: 10,
  fullHouse: 50,
};
