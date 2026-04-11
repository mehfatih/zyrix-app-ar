import React, { useRef, useCallback, useEffect, useState } from "react";
import {
  Animated, View, Text, StyleSheet,
  Vibration, TouchableOpacity, Easing,
} from "react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "./dark-premium-ui";

// ─── Elite Feature 47: Instant Feedback ─────────────────────
// كل action له feedback فوري مرئي + لمسي + صوتي

// ── أنواع الـ Feedback ──────────────────────────────────────

type FeedbackType = "success" | "error" | "warning" | "info" | "loading";

interface FeedbackConfig {
  icon: string;
  color: string;
  bg: string;
  border: string;
  vibration: number[];
  duration: number;
}

const FEEDBACK_CONFIG: Record<FeedbackType, FeedbackConfig> = {
  success: { icon: "✅", color: COLORS.success,  bg: COLORS.successMuted, border: COLORS.success,  vibration: [0, 40, 60, 40],  duration: 2500 },
  error:   { icon: "❌", color: COLORS.error,    bg: COLORS.errorMuted,   border: COLORS.error,    vibration: [0, 80, 40, 80],  duration: 3000 },
  warning: { icon: "⚠️", color: COLORS.warning,  bg: COLORS.warningMuted, border: COLORS.warning,  vibration: [0, 60],          duration: 2500 },
  info:    { icon: "ℹ️", color: COLORS.info,     bg: COLORS.infoMuted,    border: COLORS.info,     vibration: [0, 30],          duration: 2000 },
  loading: { icon: "⏳", color: COLORS.brand,    bg: COLORS.brandMuted,   border: COLORS.brand,    vibration: [],               duration: 99999 },
};

// ─── Toast Queue Manager ─────────────────────────────────────

interface ToastItem {
  id: string;
  type: FeedbackType;
  message: string;
  isAr: boolean;
}

let toastQueue: ToastItem[] = [];
let toastListeners: ((items: ToastItem[]) => void)[] = [];

function notifyListeners() {
  toastListeners.forEach(fn => fn([...toastQueue]));
}

export function showFeedback(type: FeedbackType, message: string, isAr = true) {
  const id = Date.now().toString();
  const item: ToastItem = { id, type, message, isAr };
  toastQueue = [...toastQueue, item];
  notifyListeners();

  const config = FEEDBACK_CONFIG[type];
  if (config.vibration.length > 0) Vibration.vibrate(config.vibration);

  if (type !== "loading") {
    setTimeout(() => {
      toastQueue = toastQueue.filter(t => t.id !== id);
      notifyListeners();
    }, config.duration);
  }

  return id;
}

export function hideFeedback(id: string) {
  toastQueue = toastQueue.filter(t => t.id !== id);
  notifyListeners();
}

// ─── Toast Provider — يُضاف مرة واحدة في _layout.tsx ────────

export function FeedbackProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener = (items: ToastItem[]) => setToasts(items);
    toastListeners.push(listener);
    return () => { toastListeners = toastListeners.filter(l => l !== listener); };
  }, []);

  return (
    <View style={fp.container} pointerEvents="none">
      {toasts.map((toast, i) => (
        <ToastItem key={toast.id} toast={toast} index={i} />
      ))}
    </View>
  );
}

function ToastItem({ toast, index }: { toast: ToastItem; index: number }) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const config     = FEEDBACK_CONFIG[toast.type];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }),
      Animated.timing(opacity,    { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        fp.toast,
        { backgroundColor: config.bg, borderColor: config.border, transform: [{ translateY }], opacity, top: 16 + index * 64 },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={toast.message}
    >
      <Text style={fp.toastIcon}>{config.icon}</Text>
      <Text style={[fp.toastText, { color: config.color, textAlign: toast.isAr ? "right" : "left" }]}>
        {toast.message}
      </Text>
      {toast.type === "loading" && <LoadingDotsInline color={config.color} />}
    </Animated.View>
  );
}

function LoadingDotsInline({ color }: { color: string }) {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];
  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(d, { toValue: 1,   duration: 300, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0.3, duration: 300, useNativeDriver: true }),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={{ flexDirection: "row", gap: 4, marginRight: 8 }}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color, opacity: d }} />
      ))}
    </View>
  );
}

// ─── InstantButton — زر مع feedback فوري مدمج ───────────────

interface InstantButtonProps {
  onPress: () => Promise<void> | void;
  label: string;
  labelEn?: string;
  isAr?: boolean;
  successMsg?: string;
  errorMsg?: string;
  loadingMsg?: string;
  style?: any;
  textStyle?: any;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function InstantButton({
  onPress, label, labelEn, isAr = true,
  successMsg, errorMsg, loadingMsg,
  style, textStyle, variant = "primary",
  disabled, accessibilityLabel,
}: InstantButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const scale  = useRef(new Animated.Value(1)).current;
  const loadId = useRef<string | null>(null);

  const bgColors = {
    primary:   COLORS.brand,
    secondary: COLORS.bgElevated,
    danger:    COLORS.error,
  };

  const handlePress = async () => {
    if (state === "loading" || disabled) return;

    // Press animation
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80,  useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();

    setState("loading");
    const msg = loadingMsg ?? (isAr ? "جاري التنفيذ..." : "Processing...");
    loadId.current = showFeedback("loading", msg, isAr);

    try {
      await onPress();
      if (loadId.current) hideFeedback(loadId.current);
      setState("success");
      Vibration.vibrate([0, 40, 60, 40]);
      const sMsg = successMsg ?? (isAr ? "تمت العملية بنجاح" : "Done successfully");
      showFeedback("success", sMsg, isAr);
      setTimeout(() => setState("idle"), 2000);
    } catch (e: any) {
      if (loadId.current) hideFeedback(loadId.current);
      setState("error");
      Vibration.vibrate([0, 80, 40, 80]);
      const eMsg = errorMsg ?? (isAr ? "حدث خطأ، حاول مجدداً" : "Error, please try again");
      showFeedback("error", eMsg, isAr);
      setTimeout(() => setState("idle"), 2000);
    }
  };

  const displayLabel = state === "loading"
    ? (isAr ? "جاري..." : "Loading...")
    : state === "success"
    ? (isAr ? "تم ✓" : "Done ✓")
    : state === "error"
    ? (isAr ? "خطأ ✗" : "Error ✗")
    : (isAr ? label : (labelEn ?? label));

  const bgColor = state === "success" ? COLORS.success
    : state === "error" ? COLORS.error
    : bgColors[variant];

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || state === "loading"}
        style={[ib.btn, { backgroundColor: bgColor }, disabled && { opacity: 0.5 }, style]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? (isAr ? label : (labelEn ?? label))}
        accessibilityState={{ disabled: disabled || state === "loading", busy: state === "loading" }}
      >
        <Text style={[ib.text, textStyle]}>{displayLabel}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── ActionRipple — تأثير موجة عند الضغط ────────────────────

export function ActionRipple({ children, onPress, style, accessibilityLabel }: {
  children: React.ReactNode; onPress: () => void; style?: any; accessibilityLabel?: string;
}) {
  const rippleScale   = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;

  const trigger = () => {
    rippleScale.setValue(0);
    rippleOpacity.setValue(0.4);
    Animated.parallel([
      Animated.timing(rippleScale,   { toValue: 3, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(rippleOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
    Vibration.vibrate([0, 25]);
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={trigger}
      style={[ar.container, style]}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[ar.ripple, { transform: [{ scale: rippleScale }], opacity: rippleOpacity }]} />
      {children}
    </TouchableOpacity>
  );
}

// ─── ProgressFeedback — شريط تقدم مع رسائل ──────────────────

export function ProgressFeedback({
  steps, currentStep, isAr = true,
}: {
  steps: string[]; currentStep: number; isAr?: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: currentStep / (steps.length - 1),
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    if (currentStep > 0) Vibration.vibrate([0, 30]);
  }, [currentStep]);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={pf.container} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: steps.length - 1, now: currentStep }}>
      <View style={pf.track}>
        <Animated.View style={[pf.fill, { width }]} />
      </View>
      <Text style={[pf.label, { textAlign: isAr ? "right" : "left" }]}>
        {steps[currentStep]}
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const fp = StyleSheet.create({
  container: { position: "absolute", top: 0, left: 16, right: 16, zIndex: 9999 },
  toast:     { flexDirection: "row", alignItems: "center", borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, gap: 10, position: "absolute", left: 0, right: 0, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  toastIcon: { fontSize: 18 },
  toastText: { flex: 1, fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.semibold, lineHeight: 20 },
});

const ib = StyleSheet.create({
  btn:  { borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: "center", justifyContent: "center" },
  text: { color: "#fff", fontWeight: TYPOGRAPHY.bold, fontSize: TYPOGRAPHY.md },
});

const ar = StyleSheet.create({
  container: { overflow: "hidden", borderRadius: RADIUS.lg },
  ripple:    { position: "absolute", width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.brand, alignSelf: "center", top: "50%" },
});

const pf = StyleSheet.create({
  container: { gap: SPACING.sm },
  track:     { height: 4, backgroundColor: COLORS.bgElevated, borderRadius: 2, overflow: "hidden" },
  fill:      { height: "100%", backgroundColor: COLORS.brand, borderRadius: 2 },
  label:     { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted },
});