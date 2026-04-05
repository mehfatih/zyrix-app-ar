/**
 * Zyrix App — Color System
 * All colors must be referenced from this file.
 * NEVER use hardcoded hex values in components.
 */

export const COLORS = {
  // ─── Brand ───────────────────────────────────
  primary: '#1A56DB',
  primaryLight: '#3B82F6',
  primaryDark: '#1E40AF',

  // ─── Backgrounds ─────────────────────────────
  darkBg: '#112044',
  deepBg: '#0A1628',
  cardBg: '#0D1E3A',
  cardBgLight: '#132D5E',
  surfaceBg: '#162A4A',

  // ─── Text ────────────────────────────────────
  textPrimary: '#FFFFFF',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textInverse: '#0F172A',

  // ─── Status ──────────────────────────────────
  success: '#059669',
  successLight: '#10B981',
  successBg: 'rgba(5, 150, 105, 0.15)',

  warning: '#D97706',
  warningLight: '#F59E0B',
  warningBg: 'rgba(217, 119, 6, 0.15)',

  danger: '#DC2626',
  dangerLight: '#EF4444',
  dangerBg: 'rgba(220, 38, 38, 0.15)',

  pending: '#D97706',
  pendingBg: 'rgba(217, 119, 6, 0.15)',

  info: '#0891B2',
  infoBg: 'rgba(8, 145, 178, 0.15)',

  // ─── Borders & Dividers ──────────────────────
  border: '#1E3A5F',
  borderLight: '#2A4A6B',
  divider: 'rgba(255, 255, 255, 0.08)',

  // ─── Overlay ─────────────────────────────────
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // ─── Product Colors ──────────────────────────
  products: {
    paymentGateway: '#1A56DB',
    crypto: '#7C3AED',
    cod: '#EA580C',
    dashboard: '#059669',
    plugins: '#DB2777',
    api: '#0891B2',
    risk: '#DC2626',
    recurring: '#D97706',
    reports: '#0D9488',
  },

  // ─── Solution Colors ─────────────────────────
  solutions: {
    ecommerce: '#F59E0B',
    marketplaces: '#8B5CF6',
    saas: '#06B6D4',
    retailRemote: '#10B981',
    digital: '#6366F1',
    gaming: '#A855F7',
    ngo: '#34D399',
    psp: '#F43F5E',
  },

  // ─── Chart Palette ───────────────────────────
  chart: {
    blue: '#3B82F6',
    green: '#10B981',
    orange: '#F59E0B',
    purple: '#8B5CF6',
    red: '#EF4444',
    cyan: '#06B6D4',
    pink: '#EC4899',
  },

  // ─── KPI Card Colors ──────────────────────────
  kpiBlue: '#2563EB',
  kpiBlueBg: 'rgba(37, 99, 235, 0.18)',
  kpiGreen: '#059669',
  kpiGreenBg: 'rgba(5, 150, 105, 0.18)',
  kpiPurple: '#7C3AED',
  kpiPurpleBg: 'rgba(124, 58, 237, 0.18)',
  kpiOrange: '#EA580C',
  kpiOrangeBg: 'rgba(234, 88, 12, 0.18)',

  // ─── Settlement Card ────────────────────────
  settlementTeal: '#0D9488',
  settlementTealBg: 'rgba(13, 148, 136, 0.15)',
  settlementTealBorder: 'rgba(13, 148, 136, 0.35)',

  // ─── Tab Bar ─────────────────────────────────
  tabActive: '#1A56DB',
  tabInactive: '#94A3B8',
  tabBarBg: '#0A1628',

  // ─── Input ───────────────────────────────────
  inputBg: '#0D1E3A',
  inputBorder: '#1E3A5F',
  inputFocusBorder: '#1A56DB',
  inputPlaceholder: '#94A3B8',

  // ─── Misc ────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ─── Status Color Helpers ────────────────────────
export const getStatusColor = (status: 'success' | 'pending' | 'failed') => {
  switch (status) {
    case 'success':
      return { text: COLORS.success, bg: COLORS.successBg };
    case 'pending':
      return { text: COLORS.pending, bg: COLORS.pendingBg };
    case 'failed':
      return { text: COLORS.danger, bg: COLORS.dangerBg };
  }
};

// ─── Currency Flag Map ───────────────────────────
export const CURRENCY_FLAGS: Record<string, string> = {
  SAR: '🇸🇦',
  AED: '🇦🇪',
  KWD: '🇰🇼',
  QAR: '🇶🇦',
  IQD: '🇮🇶',
  USD: '🇺🇸',
  EUR: '🇪🇺',
};

export type ColorKey = keyof typeof COLORS;

// ─── Hex to RGBA helper (for chart-kit) ─────────
export function hexToRgba(hex: string, opacity: number = 1): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ─── Chart color function factory ────────────────
export function chartColorFn(hex: string) {
  return (opacity: number = 1) => hexToRgba(hex, opacity);
}