/**
 * Zyrix App — Currency Picker Component
 * Horizontal scrollable currency selector.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
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
  const items = codes
    ? CURRENCIES.filter((c) => codes.includes(c.code))
    : CURRENCIES;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scroll}
    >
      {items.map((item) => {
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
            >
              {item.code}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  container: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  pill: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: {
    backgroundColor: `${COLORS.primary}20`,
    borderColor: COLORS.primary,
  },
  flag: {
    fontSize: 16,
    marginEnd: SPACING.xs,
  },
  code: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
  codeActive: {
    color: COLORS.primaryLight,
    fontWeight: FONT_WEIGHT.semibold,
  },
});

export default CurrencyPicker;
