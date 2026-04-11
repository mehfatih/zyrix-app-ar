import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { uxApi } from "../../services/api";

// ─── Design Tokens — النظام الموحد ──────────────────────────

export const COLORS = {
  // Backgrounds
  bg:           "#0a0a0a",
  bgCard:       "#111111",
  bgElevated:   "#161616",
  bgOverlay:    "rgba(0,0,0,0.85)",

  // Brand
  brand:        "#7C3AED",
  brandLight:   "#9461fb",
  brandDark:    "#5b21b6",
  brandMuted:   "#1a0a2e",

  // Semantic
  success:      "#22c55e",
  successMuted: "#0a1f0a",
  warning:      "#f59e0b",
  warningMuted: "#1f1200",
  error:        "#ef4444",
  errorMuted:   "#1f0a0a",
  info:         "#3b82f6",
  infoMuted:    "#0a0f1f",

  // Text
  textPrimary:   "#ffffff",
  textSecondary: "#aaaaaa",
  textMuted:     "#666666",
  textDisabled:  "#333333",

  // Borders
  border:        "#1a1a1a",
  borderHover:   "#2a2a2a",
  borderFocus:   "#7C3AED",

  // KPI Colors
  kpiBlue:      "#3b82f6",
  kpiGreen:     "#22c55e",
  kpiPurple:    "#7C3AED",
  kpiOrange:    "#f59e0b",
  kpiRed:       "#ef4444",
  kpiCyan:      "#06b6d4",
} as const;

export const TYPOGRAPHY = {
  // Sizes
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  h1:   32,

  // Weights
  regular:   "400" as const,
  medium:    "500" as const,
  semibold:  "600" as const,
  bold:      "700" as const,
  extrabold: "800" as const,
} as const;

export const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
} as const;

export const RADIUS = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   18,
  xxl:  24,
  full: 999,
} as const;

// ─── Accent Presets ──────────────────────────────────────────

export const ACCENT_PRESETS = [
  { name: "بنفسجي",  nameEn: "Purple",  value: "#7C3AED", muted: "#1a0a2e" },
  { name: "أزرق",    nameEn: "Blue",    value: "#3b82f6", muted: "#0a0f1f" },
  { name: "أخضر",    nameEn: "Green",   value: "#22c55e", muted: "#0a1f0a" },
  { name: "برتقالي", nameEn: "Orange",  value: "#f59e0b", muted: "#1f1200" },
  { name: "وردي",    nameEn: "Pink",    value: "#ec4899", muted: "#1f0a14" },
  { name: "سماوي",   nameEn: "Cyan",    value: "#06b6d4", muted: "#021219" },
];

// ─── Design Tokens Context (بدون Context لتفادي التعقيد) ─────

let _accentColor = COLORS.brand;
export function getAccent() { return _accentColor; }
export function setAccent(color: string) { _accentColor = color; }

// ─── Reusable Styled Components ─────────────────────────────

export function ZCard({ children, style, accent }: { children: React.ReactNode; style?: any; accent?: boolean }) {
  return (
    <View style={[zc.card, accent && { borderColor: _accentColor, borderWidth: 1 }, style]}>
      {children}
    </View>
  );
}

export function ZBadge({ label, type = "default" }: { label: string; type?: "default" | "success" | "warning" | "error" | "info" }) {
  const colors = {
    default: { bg: COLORS.bgElevated,   text: COLORS.textSecondary, border: COLORS.border },
    success: { bg: COLORS.successMuted, text: COLORS.success,       border: COLORS.success },
    warning: { bg: COLORS.warningMuted, text: COLORS.warning,       border: COLORS.warning },
    error:   { bg: COLORS.errorMuted,   text: COLORS.error,         border: COLORS.error },
    info:    { bg: COLORS.infoMuted,    text: COLORS.info,          border: COLORS.info },
  };
  const c = colors[type];
  return (
    <View style={[zb.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[zb.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}

export function ZKPICard({
  icon, label, value, change, color = COLORS.brand,
}: {
  icon: string; label: string; value: string; change?: string; color?: string;
}) {
  const isPositive = change?.startsWith("+");
  return (
    <View style={[zk.card, { borderColor: color + "33" }]}>
      <View style={[zk.iconBox, { backgroundColor: color + "22" }]}>
        <Text style={zk.icon}>{icon}</Text>
      </View>
      <Text style={zk.label}>{label}</Text>
      <Text style={[zk.value, { color }]}>{value}</Text>
      {change && (
        <Text style={[zk.change, { color: isPositive ? COLORS.success : COLORS.error }]}>
          {change}
        </Text>
      )}
    </View>
  );
}

export function ZDivider({ label }: { label?: string }) {
  if (!label) return <View style={zd.line} />;
  return (
    <View style={zd.container}>
      <View style={zd.line} />
      <Text style={zd.text}>{label}</Text>
      <View style={zd.line} />
    </View>
  );
}

// ─── شاشة إعدادات الـ Design System ────────────────────────

export default function DarkPremiumUIScreen() {
  const router = useRouter();
  const [accent, setAccentState] = useState(COLORS.brand);
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");
  const [borderRadius, setBorderRadius] = useState<"sm" | "md" | "lg">("lg");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isAr = true;

  useEffect(() => { loadPrefs(); }, []);

  const loadPrefs = async () => {
    try {
      const res = await uxApi.getDesignPrefs();
      if (res?.data) {
        setAccentState(res.data.accent_color || COLORS.brand);
        setFontSize(res.data.font_size || "md");
        setBorderRadius(res.data.border_radius || "lg");
        setAccent(res.data.accent_color || COLORS.brand);
      }
    } catch (_) {}
  };

  const save = async () => {
    setSaving(true);
    try {
      await uxApi.updateDesignPrefs({ accent_color: accent, font_size: fontSize, border_radius: borderRadius });
      setAccent(accent);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (_) {}
    setSaving(false);
  };

  return (
    <SafeAreaView style={dp.container}>
      <View style={dp.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={isAr ? "رجوع" : "Back"}>
          <Text style={dp.back}>→</Text>
        </TouchableOpacity>
        <Text style={dp.title}>🎨 النظام البصري</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={dp.content}>

        {/* Accent Color */}
        <Text style={dp.sectionTitle}>لون التمييز</Text>
        <View style={dp.accentGrid}>
          {ACCENT_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.value}
              style={[dp.accentBtn, accent === preset.value && dp.accentBtnActive]}
              onPress={() => setAccentState(preset.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: accent === preset.value }}
              accessibilityLabel={isAr ? preset.name : preset.nameEn}
            >
              <View style={[dp.accentCircle, { backgroundColor: preset.value }]} />
              <Text style={[dp.accentLabel, accent === preset.value && { color: preset.value }]}>
                {isAr ? preset.name : preset.nameEn}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Font Size */}
        <Text style={dp.sectionTitle}>حجم النص</Text>
        <View style={dp.segmentRow}>
          {([["sm", "صغير"], ["md", "متوسط"], ["lg", "كبير"]] as [string, string][]).map(([val, label]) => (
            <TouchableOpacity
              key={val}
              style={[dp.segBtn, fontSize === val && { ...dp.segBtnActive, borderColor: accent, backgroundColor: accent + "22" }]}
              onPress={() => setFontSize(val as any)}
              accessibilityRole="radio"
              accessibilityState={{ checked: fontSize === val }}
            >
              <Text style={[dp.segText, fontSize === val && { color: accent }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Border Radius */}
        <Text style={dp.sectionTitle}>شكل الزوايا</Text>
        <View style={dp.segmentRow}>
          {([["sm", "حاد"], ["md", "متوسط"], ["lg", "ناعم"]] as [string, string][]).map(([val, label]) => (
            <TouchableOpacity
              key={val}
              style={[dp.segBtn, { borderRadius: val === "sm" ? 4 : val === "md" ? 8 : 14 }, borderRadius === val && { ...dp.segBtnActive, borderColor: accent, backgroundColor: accent + "22" }]}
              onPress={() => setBorderRadius(val as any)}
              accessibilityRole="radio"
              accessibilityState={{ checked: borderRadius === val }}
            >
              <Text style={[dp.segText, borderRadius === val && { color: accent }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* معاينة مباشرة */}
        <Text style={dp.sectionTitle}>معاينة مباشرة</Text>
        <ZCard>
          <View style={dp.previewHeader}>
            <Text style={[dp.previewTitle, { fontSize: fontSize === "sm" ? 13 : fontSize === "md" ? 15 : 18 }]}>
              بطاقة المعاينة
            </Text>
            <ZBadge label="نشط" type="success" />
          </View>
          <View style={dp.kpiRow}>
            <ZKPICard icon="💳" label="المعاملات" value="١٢٥" change="+١٨٪" color={accent} />
            <ZKPICard icon="💰" label="الإيراد"    value="٥٠K" change="+٧٪"  color={COLORS.kpiGreen} />
          </View>
          <TouchableOpacity style={[dp.previewBtn, { backgroundColor: accent, borderRadius: borderRadius === "sm" ? 6 : borderRadius === "md" ? 10 : 14 }]}>
            <Text style={dp.previewBtnText}>زر التأكيد</Text>
          </TouchableOpacity>
        </ZCard>

        {/* Save */}
        <TouchableOpacity
          style={[dp.saveBtn, { backgroundColor: accent }, saving && dp.saveBtnDisabled]}
          onPress={save}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={isAr ? "حفظ الإعدادات" : "Save settings"}
        >
          <Text style={dp.saveBtnText}>{saving ? "..." : saved ? "✅ تم الحفظ" : "حفظ التصميم"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const zc = StyleSheet.create({
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
});
const zb = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1 },
  text:  { fontSize: TYPOGRAPHY.xs, fontWeight: TYPOGRAPHY.semibold },
});
const zk = StyleSheet.create({
  card:    { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, alignItems: "center" },
  iconBox: { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  icon:    { fontSize: 18 },
  label:   { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, marginBottom: 4, textAlign: "center" },
  value:   { fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.bold },
  change:  { fontSize: TYPOGRAPHY.xs, marginTop: 2 },
});
const zd = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 },
  line:      { flex: 1, height: 1, backgroundColor: COLORS.border },
  text:      { color: COLORS.textMuted, fontSize: TYPOGRAPHY.xs },
});
const dp = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.bg },
  header:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: SPACING.xl, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:            { color: COLORS.brand, fontSize: 20 },
  title:           { fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary },
  content:         { padding: SPACING.xl, gap: SPACING.md, paddingBottom: 40 },
  sectionTitle:    { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textMuted, textAlign: "right", marginTop: SPACING.md },
  accentGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  accentBtn:       { alignItems: "center", padding: SPACING.sm, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, width: "30%" },
  accentBtnActive: { borderColor: COLORS.brand },
  accentCircle:    { width: 28, height: 28, borderRadius: 14, marginBottom: 6 },
  accentLabel:     { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  segmentRow:      { flexDirection: "row", gap: 8 },
  segBtn:          { flex: 1, alignItems: "center", padding: SPACING.md, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  segBtnActive:    {},
  segText:         { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, fontWeight: TYPOGRAPHY.medium },
  previewHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.md },
  previewTitle:    { color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.semibold },
  kpiRow:          { flexDirection: "row", gap: 10, marginBottom: SPACING.md },
  previewBtn:      { padding: SPACING.md, alignItems: "center" },
  previewBtnText:  { color: "#fff", fontWeight: TYPOGRAPHY.bold },
  saveBtn:         { borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: "center", marginTop: SPACING.md },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText:     { color: "#fff", fontWeight: TYPOGRAPHY.bold, fontSize: TYPOGRAPHY.md },
});