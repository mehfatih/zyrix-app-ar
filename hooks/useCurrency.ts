/**
 * Zyrix App — Currency Hook
 * Handles currency selection, formatting, and display.
 */
import { useState, useCallback, useMemo } from 'react';
import type { CurrencyCode, CurrencyInfo } from '../types';

// ─── Static currency data ────────────────────────
const CURRENCIES: CurrencyInfo[] = [
  { code: 'SAR', symbol: '﷼', flag: '🇸🇦', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'د.إ', flag: '🇦🇪', name: 'UAE Dirham' },
  { code: 'KWD', symbol: 'د.ك', flag: '🇰🇼', name: 'Kuwaiti Dinar' },
  { code: 'QAR', symbol: '﷼', flag: '🇶🇦', name: 'Qatari Riyal' },
  { code: 'IQD', symbol: 'ع.د', flag: '🇮🇶', name: 'Iraqi Dinar' },
  { code: 'USD', symbol: '$', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', flag: '🇪🇺', name: 'Euro' },
];

// ─── Demo exchange rates (vs USD base) ──────────
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  SAR: 3.75,
  AED: 3.67,
  KWD: 0.307,
  QAR: 3.64,
  IQD: 1310.0,
  USD: 1,
  EUR: 0.92,
};

// ─── Hook ────────────────────────────────────────
export function useCurrency(defaultCurrency: CurrencyCode = 'SAR') {
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
      return `${info.symbol}${formatted}`;
    },
    [currency],
  );

  const convert = useCallback(
    (amount: number, from: CurrencyCode, to?: CurrencyCode): number => {
      const target = to ?? currency;
      if (from === target) return amount;
      // Convert: from → USD → target
      const inUSD = amount / EXCHANGE_RATES[from];
      return inUSD * EXCHANGE_RATES[target];
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