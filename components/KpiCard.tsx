/**
 * Zyrix App — KPI Card Component v2
 * Glass-style card with SVG icons and premium feel.
 */

import React from 'react';
import { View, Text, StyleSheet, I18nManager } from 'react-native';
import { COLORS } from '../constants/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../constants/theme';
import { Icon } from './Icon';

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: string;
  color?: string;
  valueColor?: string;
  compact?: boolean;
  style?: import('react-native').ViewStyle;
}

export function KpiCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  color = COLORS.primary,
  valueColor,
  compact = false,
  style,
}: KpiCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const changeColor = isPositive ? COLORS.success : COLORS.danger;

  // Map old emoji icons to SVG icon names
  const iconNameMap: Record<string, string> = {
    '💳': 'credit-card',
    '✅': 'check-circle',
    '📋': 'clipboard',
    '⚠️': 'alert-triangle',
    '💰': 'wallet',
    '📊': 'bar-chart',
  };

  const iconName = icon ? (iconNameMap[icon] || 'target') : undefined;

  return (
    <View style={[styles.card, compact && styles.cardCompact, style]}>
      {/* Header row: icon + label */}
      <View style={styles.headerRow}>
        {iconName ? (
          <View style={[styles.iconCircle, { backgroundColor: `${color}18` }]}>
            <Icon name={iconName} size={16} color={color} strokeWidth={2} />
          </View>
        ) : (
          <View style={[styles.accentBar, { backgroundColor: color }]} />
        )}
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
      </View>

      {/* Value */}
      <Text
        style={[
          styles.value,
          compact && styles.valueCompact,
          valueColor ? { color: valueColor } : null,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Text>

      {/* Change indicator */}
      {change !== undefined && (
        <View style={styles.changeRow}>
          <View style={[styles.changePill, { backgroundColor: isPositive ? COLORS.successBg : COLORS.dangerBg }]}>
            <Icon
              name={isPositive ? 'trending-up' : 'trending-up'}
              size={11}
              color={changeColor}
              strokeWidth={2.5}
            />
            <Text style={[styles.changeText, { color: changeColor }]}>
              {Math.abs(change)}%
            </Text>
          </View>
          {changeLabel && (
            <Text style={styles.changePeriod}>{changeLabel}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const isRTL = I18nManager.isRTL;

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
  },
  cardCompact: {
    padding: SPACING.md,
  },
  headerRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentBar: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    flex: 1,
    textAlign: isRTL ? 'right' : 'left',
  },
  value: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: isRTL ? 'right' : 'left',
  },
  valueCompact: {
    fontSize: FONT_SIZE.xl,
  },
  changeRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  changeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  changePeriod: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
});

export default KpiCard;
