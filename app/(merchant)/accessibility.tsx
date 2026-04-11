import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, Switch, TouchableOpacity,
  StyleSheet, ScrollView, AccessibilityInfo,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { uxApi } from "../../services/api";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "./dark-premium-ui";

// ─── Hook: Accessibility State ───────────────────────────────

export function useA11y() {
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReaderEnabled);
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled);

    const srSub = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReaderEnabled);
    const rmSub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotionEnabled);

    return () => {
      srSub.remove();
      rmSub.remove();
    };
  }, []);

  return { screenReaderEnabled, reduceMotionEnabled };
}

// ─── AccessibleText: نص مع دعم حجم ديناميكي ─────────────────

export function AccessibleText({
  children, style, large, muted, isAr = true,
  accessibilityLabel, accessibilityRole,
}: {
  children: React.ReactNode;
  style?: any;
  large?: boolean;
  muted?: boolean;
  isAr?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: any;
}) {
  return (
    <Text
      style={[
        {
          fontSize: large ? TYPOGRAPHY.xl : TYPOGRAPHY.md,
          color: muted ? COLORS.textMuted : COLORS.textPrimary,
          textAlign: isAr ? "right" : "left",
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      allowFontScaling={true}
      maxFontSizeMultiplier={1.5}
    >
      {children}
    </Text>
  );
}

// ─── AccessibleCard: بطاقة قابلة للضغط مع دعم screen reader ──

export function AccessibleCard({
  children, onPress, style,
  accessibilityLabel, accessibilityHint, accessibilityRole = "button",
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole?: any;
}) {
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () =>
    Animated.timing(focusAnim, { toValue: 1, duration: 150, useNativeDriver: false }).start();
  const handleBlur = () =>
    Animated.timing(focusAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start();

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, COLORS.brand],
  });

  if (!onPress) {
    return (
      <Animated.View style={[ac.card, { borderColor }, style]}>
        {children}
      </Animated.View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      style={style}
    >
      <Animated.View style={[ac.card, { borderColor }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── SkipNavigation: تخطي للمحتوى الرئيسي ───────────────────

export function SkipToContent({ label = "تخطي للمحتوى", onSkip }: { label?: string; onSkip: () => void }) {
  return (
    <TouchableOpacity
      onPress={onSkip}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={sn.btn}
    >
      <Text style={sn.text}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── شاشة إعدادات إمكانية الوصول ───────────────────────────

export default function AccessibilityScreen() {
  const router = useRouter();
  const { screenReaderEnabled, reduceMotionEnabled } = useA11y();
  const [prefs, setPrefs] = useState({
    high_contrast: false,
    large_text: false,
    reduce_motion: false,
    screen_reader_hints: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isAr = true;

  useEffect(() => { loadPrefs(); }, []);
  useEffect(() => {
    if (reduceMotionEnabled) setPrefs(p => ({ ...p, reduce_motion: true }));
  }, [reduceMotionEnabled]);

  const loadPrefs = async () => {
    try {
      const res = await uxApi.getA11yPrefs();
      if (res?.data) setPrefs({ ...prefs, ...res.data });
    } catch (_) {}
  };

  const toggle = (key: keyof typeof prefs) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await uxApi.updateA11yPrefs(prefs);
      setSaved(true);
      // إعلام الـ screen reader بالتغيير
      AccessibilityInfo.announceForAccessibility(
        isAr ? "تم حفظ إعدادات إمكانية الوصول" : "Accessibility settings saved"
      );
      setTimeout(() => setSaved(false), 2000);
    } catch (_) {}
    setSaving(false);
  };

  const SETTINGS = [
    {
      key: "high_contrast" as const,
      icon: "🌗",
      titleAr: "التباين العالي",
      titleEn: "High Contrast",
      descAr:  "يزيد وضوح النصوص والحدود",
      descEn:  "Increases text and border clarity",
    },
    {
      key: "large_text" as const,
      icon: "🔤",
      titleAr: "النص الكبير",
      titleEn: "Large Text",
      descAr:  "يكبّر حجم النصوص في كل الشاشات",
      descEn:  "Enlarges text across all screens",
    },
    {
      key: "reduce_motion" as const,
      icon: "🎞️",
      titleAr: "تقليل الحركة",
      titleEn: "Reduce Motion",
      descAr:  "يقلل الرسوم المتحركة والانتقالات",
      descEn:  "Reduces animations and transitions",
    },
    {
      key: "screen_reader_hints" as const,
      icon: "🔊",
      titleAr: "تلميحات قارئ الشاشة",
      titleEn: "Screen Reader Hints",
      descAr:  "وصف إضافي للعناصر التفاعلية",
      descEn:  "Extra description for interactive elements",
    },
  ];

  return (
    <SafeAreaView style={as.container}>
      {/* Skip Navigation للـ screen reader */}
      <SkipToContent
        label={isAr ? "تخطي للإعدادات" : "Skip to settings"}
        onSkip={() => {}}
      />

      <View style={as.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={isAr ? "رجوع" : "Go back"}
        >
          <Text style={as.back}>→</Text>
        </TouchableOpacity>
        <Text
          style={as.title}
          accessibilityRole="header"
          accessibilityLabel={isAr ? "إمكانية الوصول" : "Accessibility"}
        >
          ♿ {isAr ? "إمكانية الوصول" : "Accessibility"}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={as.content}
        accessibilityLabel={isAr ? "إعدادات إمكانية الوصول" : "Accessibility settings"}
      >
        {/* حالة النظام */}
        <View style={as.systemStatus}>
          <Text style={as.sectionTitle}>{isAr ? "⚙️ حالة النظام" : "⚙️ System Status"}</Text>
          <View style={as.statusRow}>
            <View style={[as.statusDot, { backgroundColor: screenReaderEnabled ? COLORS.success : COLORS.error }]} />
            <Text style={as.statusText}>
              {isAr
                ? `قارئ الشاشة: ${screenReaderEnabled ? "مفعّل" : "معطّل"}`
                : `Screen Reader: ${screenReaderEnabled ? "On" : "Off"}`}
            </Text>
          </View>
          <View style={as.statusRow}>
            <View style={[as.statusDot, { backgroundColor: reduceMotionEnabled ? COLORS.success : COLORS.textMuted }]} />
            <Text style={as.statusText}>
              {isAr
                ? `تقليل الحركة (النظام): ${reduceMotionEnabled ? "مفعّل" : "معطّل"}`
                : `Reduce Motion (System): ${reduceMotionEnabled ? "On" : "Off"}`}
            </Text>
          </View>
        </View>

        {/* الإعدادات */}
        <Text style={as.sectionTitle}>{isAr ? "🎛️ الإعدادات" : "🎛️ Settings"}</Text>
        {SETTINGS.map((setting) => (
          <AccessibleCard
            key={setting.key}
            accessibilityLabel={`${isAr ? setting.titleAr : setting.titleEn} — ${prefs[setting.key] ? (isAr ? "مفعّل" : "On") : (isAr ? "معطّل" : "Off")}`}
            accessibilityHint={isAr ? setting.descAr : setting.descEn}
            accessibilityRole="switch"
            style={{ marginBottom: 10 }}
          >
            <View style={as.settingRow}>
              <View style={as.settingLeft}>
                <Text style={as.settingIcon}>{setting.icon}</Text>
                <View>
                  <Text style={as.settingTitle}>
                    {isAr ? setting.titleAr : setting.titleEn}
                  </Text>
                  <Text style={as.settingDesc}>
                    {isAr ? setting.descAr : setting.descEn}
                  </Text>
                </View>
              </View>
              <Switch
                value={prefs[setting.key]}
                onValueChange={() => toggle(setting.key)}
                trackColor={{ false: COLORS.bgElevated, true: COLORS.brandMuted }}
                thumbColor={prefs[setting.key] ? COLORS.brand : COLORS.textDisabled}
                accessibilityLabel={isAr ? setting.titleAr : setting.titleEn}
                accessibilityRole="switch"
                accessibilityState={{ checked: prefs[setting.key] }}
              />
            </View>
          </AccessibleCard>
        ))}

        {/* معاينة */}
        <Text style={as.sectionTitle}>{isAr ? "👁️ معاينة" : "👁️ Preview"}</Text>
        <View style={[as.previewCard, prefs.high_contrast && as.previewCardHC]}>
          <Text style={[as.previewText, prefs.large_text && { fontSize: 20 }, prefs.high_contrast && { color: "#fff" }]}>
            {isAr ? "نص تجريبي — هذا مثال على النص في التطبيق" : "Sample text — this is how text appears in the app"}
          </Text>
          <TouchableOpacity
            style={[as.previewBtn, prefs.high_contrast && { borderWidth: 2, borderColor: "#fff" }]}
            accessibilityRole="button"
            accessibilityLabel={isAr ? "زر تجريبي" : "Sample button"}
          >
            <Text style={[as.previewBtnText, prefs.large_text && { fontSize: 18 }]}>
              {isAr ? "زر تجريبي" : "Sample Button"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[as.saveBtn, saving && as.saveBtnDisabled]}
          onPress={save}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={isAr ? "حفظ إعدادات إمكانية الوصول" : "Save accessibility settings"}
          accessibilityState={{ disabled: saving }}
        >
          <Text style={as.saveBtnText}>
            {saving ? "..." : saved ? "✅ " + (isAr ? "تم الحفظ" : "Saved") : (isAr ? "حفظ الإعدادات" : "Save Settings")}
          </Text>
        </TouchableOpacity>

        {/* WCAG Note */}
        <View style={as.wcagNote}>
          <Text style={as.wcagText}>
            {isAr
              ? "♿ هذا التطبيق يتبع معايير WCAG 2.1 AA لإمكانية الوصول"
              : "♿ This app follows WCAG 2.1 AA accessibility standards"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ac = StyleSheet.create({
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1 },
});
const sn = StyleSheet.create({
  btn:  { position: "absolute", top: -100, left: 0, zIndex: 999, backgroundColor: COLORS.brand, padding: SPACING.md, borderRadius: RADIUS.md },
  text: { color: "#fff", fontWeight: TYPOGRAPHY.bold },
});
const as = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.bg },
  header:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: SPACING.xl, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:             { color: COLORS.brand, fontSize: 20 },
  title:            { fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary },
  content:          { padding: SPACING.xl, gap: SPACING.md, paddingBottom: 40 },
  systemStatus:     { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  sectionTitle:     { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textMuted, textAlign: "right", marginTop: SPACING.sm },
  statusRow:        { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot:        { width: 8, height: 8, borderRadius: 4 },
  statusText:       { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sm },
  settingRow:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  settingLeft:      { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  settingIcon:      { fontSize: 22 },
  settingTitle:     { fontSize: TYPOGRAPHY.md, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.medium, textAlign: "right" },
  settingDesc:      { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, textAlign: "right", marginTop: 2 },
  previewCard:      { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  previewCardHC:    { backgroundColor: "#000", borderColor: "#fff" },
  previewText:      { fontSize: TYPOGRAPHY.md, color: COLORS.textSecondary, textAlign: "right", lineHeight: 24 },
  previewBtn:       { backgroundColor: COLORS.brand, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: "center" },
  previewBtnText:   { color: "#fff", fontWeight: TYPOGRAPHY.bold, fontSize: TYPOGRAPHY.md },
  saveBtn:          { backgroundColor: COLORS.brand, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: "center", marginTop: SPACING.md },
  saveBtnDisabled:  { opacity: 0.5 },
  saveBtnText:      { color: "#fff", fontWeight: TYPOGRAPHY.bold, fontSize: TYPOGRAPHY.md },
  wcagNote:         { backgroundColor: COLORS.infoMuted, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.info, marginTop: SPACING.sm },
  wcagText:         { color: COLORS.info, fontSize: TYPOGRAPHY.xs, textAlign: "center" },
});