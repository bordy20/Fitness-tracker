export const colors = {
  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceElevated: '#242438',
  primary: '#6C63FF',
  primaryLight: '#8B85FF',
  primaryDark: '#4A42CC',
  secondary: '#FF6584',
  accent: '#43E97B',
  accentOrange: '#FF9A3C',
  accentBlue: '#38B2F8',
  text: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textMuted: '#606080',
  border: '#2A2A3E',
  success: '#43E97B',
  warning: '#FFD166',
  error: '#FF6584',
  protein: '#FF6584',
  carbs: '#FFD166',
  fat: '#38B2F8',
  calories: '#6C63FF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  hero: { fontSize: 36, fontWeight: '800' as const, letterSpacing: -1 },
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  captionBold: { fontSize: 12, fontWeight: '600' as const },
};
