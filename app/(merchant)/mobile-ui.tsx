import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, Switch, TouchableOpacity,
  StyleSheet, ScrollView, Animated, PanResponder,
  Vibration, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { setupApi } from "../../services/api";

const { width } = Dimensions.get("window");

interface Prefs {
  haptics_enabled: boolean;
  gesture_nav: boolean;
  offline_cache: boolean;
  compact_mode: boolean;
  theme: string;
}

const DEFAULTS: Prefs = {
  haptics_enabled: true,
  gesture_nav: true,
  offline_cache: true,
  compact_mode: false,
  theme: "dark",
};

// ── Hook: Haptic Feedback ──
export function useHaptic() {
  return useCallback((type: "light" | "medium" | "heavy" = "light") => {
    const patterns = { light: [0, 30], medium: [0, 60], heavy: [0, 100] };
    Vibration.vibrate(patterns[type]);
  }, []);
}

// ── Hook: Swipe Gesture ──
export function useSwipeBack(onSwipe: () => void) {
  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dx > 20 && Math.abs(g.dy) < 30,
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > width * 0.35) {
          Animated.timing(pan.x, { toValue: width, duration: 200, useNativeDriver: false }).start(onSwipe);
        } else {
          Animated.spring(pan.x, { toValue: 0, useNativeDriver: false }).start();
        }
      },
    })
  ).current;
  return { pan, panResponder };
}

export default function MobileUIScreen() {
  const router = useRouter();
  const haptic = useHaptic();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadPrefs(); }, []);

  const loadPrefs = async () => {
    try {
      const res = await setupApi.getUiPrefs();
      if (res?.data) setPrefs({ ...DEFAULTS, ...res.data });
    } catch (_) {}
  };

  const toggle = (key: keyof Prefs) => {
    haptic("light");
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  const save = async () => {
    setSaving(true);
    haptic("medium");
    try {
      await setupApi.updateUiPrefs(prefs);
      setSaved(true);
      Animated.sequence([
        Animated.timing(saveAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(saveAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setSaved(false));
    } catch (_) {}
    setSaving(false);
  };

  const rows: { key: keyof Prefs; icon: string; label: string; desc: string }[] = [
    { key: "haptics_enabled", icon: "📳", label: "اهتزاز التفاعل",     desc: "ردود فعل لمسية عند الضغط"      },
    { key: "gesture_nav",     icon: "👆", label: "التنقل بالإيماءات",  desc: "سحب للرجوع وإيماءات سريعة"    },
    { key: "offline_cache",   icon: "📦", label: "التخزين المؤقت",      desc: "تشغيل بدون إنترنت (قراءة فقط)" },
    { key: "compact_mode",    icon: "🗜️", label: "العرض المضغوط",      desc: "بيانات أكثر في مساحة أصغر"     },
  ];

  const savedOpacity = saveAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <SafeAreaView style={mu.container}>
      <View style={mu.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={mu.back}>→</Text>
        </TouchableOpacity>
        <Text style={mu.title}>تجربة الاستخدام</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={mu.content}>
        {/* تفضيلات التطبيق */}
        <Text style={mu.sectionTitle}>⚙️ تفضيلات التطبيق</Text>
        {rows.map(row => (
          <View key={row.key} style={mu.row}>
            <View style={mu.rowLeft}>
              <Text style={mu.rowIcon}>{row.icon}</Text>
              <View>
                <Text style={mu.rowLabel}>{row.label}</Text>
                <Text style={mu.rowDesc}>{row.desc}</Text>
              </View>
            </View>
            <Switch
              value={prefs[row.key] as boolean}
              onValueChange={() => toggle(row.key)}
              trackColor={{ false: "#1a1a1a", true: "#4c1d95" }}
              thumbColor={prefs[row.key] ? "#7C3AED" : "#333"}
            />
          </View>
        ))}

        {/* الثيم */}
        <Text style={mu.sectionTitle}>🎨 الثيم</Text>
        <View style={mu.themeRow}>
          {["dark", "darker", "midnight"].map(t => (
            <TouchableOpacity
              key={t}
              style={[mu.themeBtn, prefs.theme === t && mu.themeBtnActive]}
              onPress={() => { haptic("light"); setPrefs(p => ({ ...p, theme: t })); }}
            >
              <View style={[mu.themeCircle, { backgroundColor: t === "dark" ? "#111" : t === "darker" ? "#060606" : "#000033" }]} />
              <Text style={[mu.themeLabel, prefs.theme === t && mu.themeLabelActive]}>
                {t === "dark" ? "داكن" : t === "darker" ? "أدكن" : "منتصف الليل"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Gesture Demo */}
        <Text style={mu.sectionTitle}>👆 تجربة الإيماءات</Text>
        <GestureDemo />

        {/* زر الحفظ */}
        <TouchableOpacity style={[mu.saveBtn, saving && mu.saveBtnDisabled]} onPress={save} disabled={saving}>
          <Text style={mu.saveBtnText}>{saving ? "جاري الحفظ..." : "حفظ التفضيلات"}</Text>
        </TouchableOpacity>
        <Animated.View style={[mu.savedBadge, { opacity: savedOpacity }]}>
          <Text style={mu.savedText}>✅ تم الحفظ</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function GestureDemo() {
  const haptic = useHaptic();
  const pan = useRef(new Animated.ValueXY()).current;
  const [hint, setHint] = useState("اسحب الدائرة ←");

  const pr = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderGrant: () => { haptic("light"); setHint("رائع! استمر..."); },
    onPanResponderRelease: () => {
      haptic("medium");
      setHint("ممتاز! 🎉");
      Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(() => setHint("اسحب الدائرة ←"));
    },
  })).current;

  return (
    <View style={gd.container}>
      <Text style={gd.hint}>{hint}</Text>
      <Animated.View style={[gd.circle, { transform: pan.getTranslateTransform() }]} {...pr.panHandlers}>
        <Text style={gd.circleText}>⚡</Text>
      </Animated.View>
    </View>
  );
}

const mu = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#0a0a0a" },
  header:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#111" },
  back:           { color: "#7C3AED", fontSize: 20 },
  title:          { fontSize: 18, fontWeight: "700", color: "#fff" },
  content:        { padding: 20, gap: 8, paddingBottom: 40 },
  sectionTitle:   { fontSize: 14, fontWeight: "600", color: "#666", marginTop: 16, marginBottom: 8, textAlign: "right" },
  row:            { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#111", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#1a1a1a" },
  rowLeft:        { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  rowIcon:        { fontSize: 22 },
  rowLabel:       { fontSize: 15, color: "#fff", fontWeight: "500", textAlign: "right" },
  rowDesc:        { fontSize: 12, color: "#555", textAlign: "right" },
  themeRow:       { flexDirection: "row", gap: 10 },
  themeBtn:       { flex: 1, alignItems: "center", padding: 12, backgroundColor: "#111", borderRadius: 12, borderWidth: 1, borderColor: "#1a1a1a" },
  themeBtnActive: { borderColor: "#7C3AED", backgroundColor: "#1a0a2e" },
  themeCircle:    { width: 32, height: 32, borderRadius: 16, marginBottom: 6, borderWidth: 1, borderColor: "#333" },
  themeLabel:     { fontSize: 12, color: "#666" },
  themeLabelActive: { color: "#7C3AED" },
  saveBtn:        { backgroundColor: "#7C3AED", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 24 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText:    { color: "#fff", fontWeight: "700", fontSize: 15 },
  savedBadge:     { alignItems: "center", marginTop: 8 },
  savedText:      { color: "#22c55e", fontSize: 13 },
});

const gd = StyleSheet.create({
  container: { backgroundColor: "#111", borderRadius: 14, padding: 24, alignItems: "center", height: 140, justifyContent: "center", borderWidth: 1, borderColor: "#1a1a1a" },
  hint:      { color: "#666", fontSize: 13, marginBottom: 12 },
  circle:    { width: 56, height: 56, borderRadius: 28, backgroundColor: "#7C3AED", justifyContent: "center", alignItems: "center" },
  circleText: { fontSize: 24 },
});