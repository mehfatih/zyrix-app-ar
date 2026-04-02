/**
 * Zyrix App — Loading & Error State Components
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../constants/theme';

interface LoadingProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingProps) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message && <Text style={styles.loadingText}>{message}</Text>}
    </View>
  );
}

interface ErrorProps {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
}

export function ErrorScreen({ message, onRetry, retryLabel = 'Retry' }: ErrorProps) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryText}>{retryLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING['3xl'],
  },
  loadingText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: SPACING.lg,
  },
  errorText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING['3xl'],
    paddingVertical: SPACING.md,
  },
  retryText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.white,
  },
});
