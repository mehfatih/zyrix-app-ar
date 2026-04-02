/**
 * Zyrix App — Color System v2
 * Premium fintech identity: Deep space + electric cyan accents
 * Designed for WCAG AA contrast compliance on dark backgrounds.
 * All colors must be referenced from this file.
 * NEVER use hardcoded hex values in components.
 */

export const COLORS = {
  // ─── Brand ───────────────────────────────────
  // Signature: Electric Cyan — distinguishes Zyrix from PayPal (blue),
  // Stripe (purple), Wise (green). Unique in MENA fintech.
  primary: '#00D4AA',
  primaryLight: '#33DFBE',
  primaryDark: '#00A888',
  primaryMuted: 'rgba(0, 212, 170, 0.15)',

  // ─── Backgrounds ─────────────────────────────
  darkBg: '#0B0F1A',
  deepBg: '#060A12',
  cardBg: '#111827',
  cardBgLight: '#1A2332',
  surfaceBg: '#1F2937',

  // ─── Glass Effect ────────────────────────────
  glassBg: 'rgba(17, 24, 39, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassHighlight: 'rgba(255, 255, 255, 0.04)',

  // ─── Text ────────────────────────────────────
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textInverse: '#0B0F1A',
  textAccent: '#00D4AA',

  // ─── Status ──────────────────────────────────
  success: '#10B981',
  successLight: '#34D399',
  successBg: 'rgba(16, 185, 129, 0.12)',

  warning: '#F59E0B',
  warningLight: '#FBBF24',
  warningBg: 'rgba(245, 158, 11, 0.12)',

  danger: '#EF4444',
  dangerLight: '#F87171',
  dangerBg: 'rgba(239, 68, 68, 0.12)',

  pending: '#F59E0B',
  pendingBg: 'rgba(245, 158, 11, 0.12)',

  info: '#06B6D4',
  infoBg: 'rgba(6, 182, 212, 0.12)',

  // ─── Borders & Dividers ──────────────────────
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  borderAccent: 'rgba(0, 212, 170, 0.25)',
  divider: 'rgba(255, 255, 255, 0.06)',

  // ─── Overlay ─────────────────────────────────
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',

  // ─── Product Colors ──────────────────────────
  products: {
    paymentGateway: '#00D4AA',
    crypto: '#8B5CF6',
    cod: '#F59E0B',
    dashboard: '#10B981',
    plugins: '#EC4899',
    api: '#06B6D4',
    risk: '#EF4444',
    recurring: '#F59E0B',
    reports: '#14B8A6',
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
    cyan: '#00D4AA',
    blue: '#3B82F6',
    green: '#10B981',
    orange: '#F59E0B',
    purple: '#8B5CF6',
    red: '#EF4444',
    pink: '#EC4899',
  },

  // ─── Tab Bar ─────────────────────────────────
  tabActive: '#00D4AA',
  tabInactive: '#4B5563',
  tabBarBg: '#060A12',

  // ─── Input ───────────────────────────────────
  inputBg: '#1A2332',
  inputBorder: 'rgba(255, 255, 255, 0.10)',
  inputFocusBorder: '#00D4AA',
  inputPlaceholder: '#6B7280',

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
  TRY: '🇹🇷',
  SAR: '🇸🇦',
  AED: '🇦🇪',
  KWD: '🇰🇼',
  QAR: '🇶🇦',
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
