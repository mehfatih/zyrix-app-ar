import React, { useRef, useCallback, useEffect } from "react";
import {
  Animated, TouchableOpacity, View, Text,
  StyleSheet, Vibration, Easing,
} from "react-native";
import { uxApi } from "../../services/api";

// ─── Hook: كل أنواع الـ micro-interactions ──────────────────

export function useMicroInteractions(screenKey?: string) {
  const logEvent = useCallback(async (eventType: string, metadata?: any) => {
    try {
      await uxApi.logInteraction(eventType, screenKey, metadata);
    } catch (_) {}
  }, [screenKey]);

  // Haptic
  const haptic = useCallback((type: "light" | "medium" | "heavy" | "success" | "error" = "light") => {
    const patterns = {
      light:   [0, 25],
      medium:  [0, 50],
      heavy:   [0, 100],
      success: [0, 40, 60, 40],
      error:   [0, 80, 40, 80],
    };
    Vibration.vibrate(patterns[type]);
    logEvent(`haptic_${type}`);
  }, [logEvent]);

  return { haptic, logEvent };
}

// ─── PressButton: bounce + haptic ───────────────────────────

interface PressButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: any;
  hapticType?: "light" | "medium" | "heavy";
  screenKey?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
}

export function PressButton({
  onPress, children, style,
  hapticType = "light", screenKey,
  accessibilityLabel, accessibilityHint, disabled,
}: PressButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const { haptic } = useMicroInteractions(screenKey);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();
  };

  const handlePress = () => {
    haptic(hapticType);
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[style, disabled && { opacity: 0.5 }]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── SuccessAnimation: checkmark بعد العملية ────────────────

interface SuccessAnimationProps {
  visible: boolean;
  label?: string;
  labelEn?: string;
  isAr?: boolean;
}

export function SuccessAnimation({ visible, label, labelEn, isAr = true }: SuccessAnimationProps) {
  const scale  = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 150, friction: 6 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale,   { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[sa.container, { transform: [{ scale }], opacity }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={isAr ? (label ?? "تم بنجاح") : (labelEn ?? "Success")}
    >
      <Text style={sa.icon}>✅</Text>
      <Text style={sa.text}>{isAr ? (label ?? "تم بنجاح") : (labelEn ?? "Success")}</Text>
    </Animated.View>
  );
}

// ─── LoadingDots: ثلاث نقاط متحركة ──────────────────────────

export function LoadingDots({ color = "#7C3AED", size = 8 }: { color?: string; size?: number }) {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,  duration: 300, useNativeDriver: true }),
          Animated.delay(300),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={ld.container} accessibilityLabel="جاري التحميل" accessibilityRole="progressbar">
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            ld.dot,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
            { transform: [{ translateY: dot }] },
          ]}
        />
      ))}
    </View>
  );
}

// ─── ShakeAnimation: للأخطاء ────────────────────────────────

export function useShake() {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    Vibration.vibrate([0, 80, 40, 80]);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 60,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6,  duration: 60,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60,  useNativeDriver: true }),
    ]).start();
  }, []);

  return { shakeAnim, shake };
}

// ─── FadeInView: دخول سلس ───────────────────────────────────

export function FadeInView({
  children, delay = 0, duration = 400, style,
}: {
  children: React.ReactNode; delay?: number; duration?: number; style?: any;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration, delay, useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration, delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// ─── CounterAnimation: أرقام متحركة ─────────────────────────

export function AnimatedCounter({
  value, duration = 1000, prefix = "", suffix = "", style,
}: {
  value: number; duration?: number; prefix?: string; suffix?: string; style?: any;
}) {
  const animValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = React.useState("0");

  useEffect(() => {
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: value, duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const listener = animValue.addListener(({ value: v }) => {
      setDisplayValue(Math.round(v).toLocaleString());
    });
    return () => animValue.removeListener(listener);
  }, [value]);

  return (
    <Text style={style} accessibilityLabel={`${prefix}${value}${suffix}`}>
      {prefix}{displayValue}{suffix}
    </Text>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const sa = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#0a1f0a", borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: "#22c55e" },
  icon:      { fontSize: 18 },
  text:      { color: "#22c55e", fontWeight: "600", fontSize: 14 },
});

const ld = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  dot:       {},
});