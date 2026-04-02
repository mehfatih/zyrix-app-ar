/**
 * Zyrix App — Status Badge Component
 * Visual indicator for transaction/settlement status.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, getStatusColor } from '../constants/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../constants/theme';
import type { TransactionStatus, SettlementStatus, RefundStatus } from '../types';

type BadgeStatus = TransactionStatus | SettlementStatus | RefundStatus;

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<BadgeStatus, { color: string; bg: string }> = {
  success: { color: COLORS.success, bg: COLORS.successBg },
  pending: { color: COLORS.pending, bg: COLORS.pendingBg },
  failed: { color: COLORS.danger, bg: COLORS.dangerBg },
  settled: { color: COLORS.success, bg: COLORS.successBg },
  processing: { color: COLORS.info, bg: COLORS.infoBg },
  completed: { color: COLORS.success, bg: COLORS.successBg },
  rejected: { color: COLORS.danger, bg: COLORS.dangerBg },
};

export function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const isMd = size === 'md';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        isMd && styles.badgeMd,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text
        style={[
          styles.text,
          { color: config.color },
          isMd && styles.textMd,
        ]}
      >
        {label ?? status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginEnd: SPACING.xs,
  },
  text: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    textTransform: 'capitalize',
  },
  textMd: {
    fontSize: FONT_SIZE.sm,
  },
});

export default StatusBadge;
