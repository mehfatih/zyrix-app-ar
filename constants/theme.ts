/**
 * Zyrix App — Theme Constants
 * Spacing, typography, radius, shadows, and layout tokens.
 */

import { Platform } from 'react-native';

// ─── Spacing Scale ───────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

// ─── Border Radius ───────────────────────────────
export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
} as const;

// ─── Typography ──────────────────────────────────
export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 26,
  '3xl': 32,
  '4xl': 40,
} as const;

export const FONT_WEIGHT = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const LINE_HEIGHT = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
};

// ─── Shadows ─────────────────────────────────────
export const SHADOWS = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    android: {
      elevation: 8,
    },
  }),
};

// ─── Layout ──────────────────────────────────────
export const LAYOUT = {
  screenPaddingH: SPACING.lg,
  cardPadding: SPACING.lg,
  tabBarHeight: 64,
  headerHeight: 56,
  inputHeight: 50,
  buttonHeight: 50,
  otpCellSize: 52,
};

// ─── Animation ───────────────────────────────────
export const ANIMATION = {
  fast: 150,
  normal: 250,
  slow: 400,
};

// ─── Convenience ─────────────────────────────────
export const THEME = {
  spacing: SPACING,
  radius: RADIUS,
  fontSize: FONT_SIZE,
  fontWeight: FONT_WEIGHT,
  lineHeight: LINE_HEIGHT,
  shadows: SHADOWS,
  layout: LAYOUT,
  animation: ANIMATION,
} as const;

export default THEME;
