/**
 * Zyrix App — KPI Card Component
 * Displays a metric with optional change indicator.
 */

import React from 'react';
import { View, Text, StyleSheet, I18nManager } from 'react-native';
import { COLORS } from '../constants/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../constants/theme';

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
  const changeArrow = isPositive ? '▲' : '▼';

  return (
    <View style={[styles.card, compact && styles.cardCompact, style]}>
      {/* Header row: icon + label */}
      <View style={styles.headerRow}>
        {icon ? (
          <View style={[styles.iconCircle, { backgroundColor: `${color}20` }]}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
        ) : (
          <View style={[styles.accentDot, { backgroundColor: color }]} />
        )}
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>

      {/* Value */}
      <Text style={[styles.value, compact && styles.valueCompact, valueColor ? { color: valueColor } : null]} numberOfLines={1}>
        {value}
      </Text>

      {/* Change indicator */}
      {change !== undefined && (
        <View style={styles.changeRow}>
          <Text style={[styles.changeText, { color: changeColor }]}>
            {changeArrow} {Math.abs(change)}%
          </Text>
          {changeLabel && (
            <Text style={styles.changePeriod}> {changeLabel}</Text>
          )}
        </View>
      )}
    </View>
  );
}

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
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: SPACING.sm,
  },
  iconText: {
    fontSize: 14,
  },
  accentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginEnd: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  valueCompact: {
    fontSize: FONT_SIZE.xl,
  },
  changeRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
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
