/**
 * Zyrix App — Currency Picker Component
 * Compact row of currency tabs — all visible without scrolling.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../constants/theme';
import type { CurrencyCode } from '../types';
import { CURRENCIES } from '../hooks/useCurrency';

interface CurrencyPickerProps {
  selected: CurrencyCode;
  onSelect: (code: CurrencyCode) => void;
  /** Subset of currencies to show. Default: all */
  codes?: CurrencyCode[];
}

export function CurrencyPicker({
  selected,
  onSelect,
  codes,
}: CurrencyPickerProps) {
  // Preserve the order from `codes` array
  const items = codes
    ? codes.map((code) => CURRENCIES.find((c) => c.code === code)).filter(Boolean)
    : CURRENCIES;

  return (
    <View style={styles.container}>
      {items.map((item) => {
        if (!item) return null;
        const isActive = item.code === selected;
        return (
          <TouchableOpacity
            key={item.code}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onSelect(item.code)}
            activeOpacity={0.7}
          >
            <Text style={styles.flag}>{item.flag}</Text>
            <Text
              style={[styles.code, isActive && styles.codeActive]}
              numberOfLines={1}
            >
              {item.code}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    gap: 6,
    paddingVertical: SPACING.sm,
  },
  pill: {
    flex: 1,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.full,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 3,
  },
  pillActive: {
    backgroundColor: `${COLORS.primary}20`,
    borderColor: COLORS.primary,
  },
  flag: {
    fontSize: 14,
  },
  code: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
  codeActive: {
    color: COLORS.primaryLight,
    fontWeight: FONT_WEIGHT.semibold,
  },
});

export default CurrencyPicker;