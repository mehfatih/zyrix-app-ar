/**
 * Zyrix App — Currency Hook
 * Handles currency selection, formatting, and display.
 */

import { useState, useCallback, useMemo } from 'react';
import type { CurrencyCode, CurrencyInfo } from '../types';

// ─── Static currency data ────────────────────────
const CURRENCIES: CurrencyInfo[] = [
  { code: 'TRY', symbol: '₺', flag: '🇹🇷', name: 'Turkish Lira' },
  { code: 'SAR', symbol: '﷼', flag: '🇸🇦', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'د.إ', flag: '🇦🇪', name: 'UAE Dirham' },
  { code: 'KWD', symbol: 'د.ك', flag: '🇰🇼', name: 'Kuwaiti Dinar' },
  { code: 'QAR', symbol: '﷼', flag: '🇶🇦', name: 'Qatari Riyal' },
  { code: 'USD', symbol: '$', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', flag: '🇪🇺', name: 'Euro' },
];

// ─── Demo exchange rates (vs TRY base) ──────────
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  TRY: 1,
  SAR: 0.104,
  AED: 0.102,
  KWD: 0.0085,
  QAR: 0.101,
  USD: 0.0278,
  EUR: 0.0256,
};

// ─── Hook ────────────────────────────────────────
export function useCurrency(defaultCurrency: CurrencyCode = 'TRY') {
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);

  const currencyInfo = useMemo(
    () => CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0],
    [currency],
  );

  const format = useCallback(
    (amount: number, code?: CurrencyCode): string => {
      const target = code ?? currency;
      const info = CURRENCIES.find((c) => c.code === target) ?? CURRENCIES[0];
      const formatted = amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${info!.symbol}${formatted}`;
    },
    [currency],
  );

  const convert = useCallback(
    (amount: number, from: CurrencyCode, to?: CurrencyCode): number => {
      const target: CurrencyCode = (to ?? currency) as CurrencyCode;
      if (from === target) return amount;
      // Convert: from → TRY → target
      const inTRY = amount / EXCHANGE_RATES[from];
      return inTRY * EXCHANGE_RATES[target];
    },
    [currency],
  );

  const formatConverted = useCallback(
    (amount: number, from: CurrencyCode, to?: CurrencyCode): string => {
      const converted = convert(amount, from, to);
      return format(converted, to ?? currency);
    },
    [convert, format, currency],
  );

  return {
    currency,
    setCurrency,
    currencyInfo,
    currencies: CURRENCIES,
    format,
    convert,
    formatConverted,
    rates: EXCHANGE_RATES,
  };
}

export { CURRENCIES, EXCHANGE_RATES };
export default useCurrency;
