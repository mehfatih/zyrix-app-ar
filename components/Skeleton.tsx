import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../constants/colors';

interface SkeletonProps {
  key?: number;
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: any) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View
      style={[
        { width: typeof width === 'number' ? width : undefined, height, borderRadius, backgroundColor: COLORS.border, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { key?: number; lines?: number }) {
  return (
    <View style={skStyles.card}>
      <View style={skStyles.header}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={10} />
        </View>
        <Skeleton width={80} height={20} borderRadius={10} />
      </View>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={`${100 - i * 15}%`} height={12} style={{ marginTop: 8 }} />
      ))}
    </View>
  );
}

export function SkeletonKPI() {
  return (
    <View style={skStyles.kpi}>
      <Skeleton width="50%" height={10} />
      <Skeleton width="70%" height={22} style={{ marginTop: 8 }} />
    </View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={{ gap: 10, padding: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  kpi: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    flex: 1,
  },
});
