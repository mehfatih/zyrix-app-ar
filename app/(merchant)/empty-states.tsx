import React, { useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, useAnimatedValue,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { setupApi } from "../../services/api";

// ── الـ component الرئيسي للاستخدام في كل شاشة ──
interface SmartEmptyStateProps {
  screenKey: string;
  icon: string;
  titleAr: string;
  descAr: string;
  ctaLabelAr: string;
  ctaScreen: string;
  secondaryLabelAr?: string;
  onSecondary?: () => void;
}

export function SmartEmptyState({
  screenKey, icon, titleAr, descAr,
  ctaLabelAr, ctaScreen,
  secondaryLabelAr, onSecondary,
}: SmartEmptyStateProps) {
  const router = useRouter();
  const scaleAnim = useAnimatedValue(0.9);
  const opacityAnim = useAnimatedValue(0);

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleCTA = useCallback(async () => {
    try { await setupApi.logEmptyAction(screenKey, "primary_cta"); } catch (_) {}
    router.push(ctaScreen as any);
  }, [screenKey, ctaScreen]);

  const handleSecondary = useCallback(async () => {
    try { await setupApi.logEmptyAction(screenKey, "secondary_cta"); } catch (_) {}
    onSecondary?.();
  }, [screenKey, onSecondary]);

  return (
    <Animated.View style={[es.container, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
      <Text style={es.icon}>{icon}</Text>
      <Text style={es.title}>{titleAr}</Text>
      <Text style={es.desc}>{descAr}</Text>
      <TouchableOpacity style={es.ctaBtn} onPress={handleCTA} activeOpacity={0.85}>
        <Text style={es.ctaText}>{ctaLabelAr}</Text>
      </TouchableOpacity>
      {secondaryLabelAr && (
        <TouchableOpacity style={es.secondaryBtn} onPress={handleSecondary}>
          <Text style={es.secondaryText}>{secondaryLabelAr}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ── Empty States جاهزة لكل شاشة ──
export const EMPTY_STATES = {
  transactions: {
    icon: "💳", screenKey: "transactions",
    titleAr: "لا توجد معاملات بعد",
    descAr: "أنشئ رابط دفع وشاركه مع عملائك لتبدأ التحصيل",
    ctaLabelAr: "أنشئ رابط دفع →",
    ctaScreen: "/(merchant)/payment-links",
    secondaryLabelAr: "استعرض الأمثلة",
  },
  invoices: {
    icon: "🧾", screenKey: "invoices",
    titleAr: "لا توجد فواتير",
    descAr: "أرسل فواتير احترافية لعملائك في ثوانٍ",
    ctaLabelAr: "أنشئ فاتورة →",
    ctaScreen: "/(merchant)/invoices",
  },
  subscriptions: {
    icon: "🔄", screenKey: "subscriptions",
    titleAr: "لا توجد اشتراكات",
    descAr: "حوّل عملاءك لمدفوعات متكررة شهرية",
    ctaLabelAr: "أنشئ اشتراكاً →",
    ctaScreen: "/(merchant)/subscriptions",
  },
  customers: {
    icon: "👥", screenKey: "customers",
    titleAr: "لا يوجد عملاء بعد",
    descAr: "سيظهر عملاؤك هنا بعد أول معاملة ناجحة",
    ctaLabelAr: "أنشئ رابط دفع →",
    ctaScreen: "/(merchant)/payment-links",
  },
  expenses: {
    icon: "💰", screenKey: "expenses",
    titleAr: "لا توجد مصاريف مسجلة",
    descAr: "تابع مصاريف نشاطك التجاري بدقة",
    ctaLabelAr: "سجّل مصروفاً →",
    ctaScreen: "/(merchant)/expenses",
  },
  settlements: {
    icon: "🏦", screenKey: "settlements",
    titleAr: "لا توجد تسويات بعد",
    descAr: "التسويات ستظهر بعد اكتمال أول دورة دفع",
    ctaLabelAr: "اعرف أكثر →",
    ctaScreen: "/(merchant)/help",
  },
  disputes: {
    icon: "✅", screenKey: "disputes",
    titleAr: "لا توجد نزاعات",
    descAr: "حسابك نظيف — استمر بتقديم خدمة ممتازة",
    ctaLabelAr: "عرض المعاملات →",
    ctaScreen: "/(merchant)/transactions",
  },
  payment_links: {
    icon: "🔗", screenKey: "payment_links",
    titleAr: "لا توجد روابط دفع",
    descAr: "أنشئ رابطك الأول وابدأ التحصيل الآن",
    ctaLabelAr: "أنشئ رابط دفع →",
    ctaScreen: "/(merchant)/payment-links",
  },
};

// ── شاشة Demo للمعاينة ──
export default function EmptyStatesDemo() {
  const router = useRouter();
  const screens = Object.keys(EMPTY_STATES) as (keyof typeof EMPTY_STATES)[];
  const [current, setCurrent] = React.useState(0);
  const state = EMPTY_STATES[screens[current]];

  return (
    <SafeAreaView style={es.screen}>
      <Text style={es.demoTitle}>Smart Empty States — Demo</Text>
      <View style={es.demoTabs}>
        {screens.map((k, i) => (
          <TouchableOpacity key={k} style={[es.tab, i === current && es.tabActive]} onPress={() => setCurrent(i)}>
            <Text style={[es.tabText, i === current && es.tabTextActive]}>{EMPTY_STATES[k].icon}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <SmartEmptyState key={current} {...state} onSecondary={() => router.push("/(merchant)/help" as any)} />
    </SafeAreaView>
  );
}

const es = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: "#0a0a0a" },
  demoTitle:       { color: "#555", fontSize: 12, textAlign: "center", marginTop: 16 },
  demoTabs:        { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, padding: 16 },
  tab:             { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#111", borderRadius: 8, borderWidth: 1, borderColor: "#1a1a1a" },
  tabActive:       { borderColor: "#7C3AED", backgroundColor: "#1a0a2e" },
  tabText:         { fontSize: 18 },
  tabTextActive:   { color: "#7C3AED" },
  container:       { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  icon:            { fontSize: 72, marginBottom: 24 },
  title:           { fontSize: 22, fontWeight: "700", color: "#fff", textAlign: "center", marginBottom: 10 },
  desc:            { fontSize: 15, color: "#666", textAlign: "center", lineHeight: 22, marginBottom: 32 },
  ctaBtn:          { backgroundColor: "#7C3AED", borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, marginBottom: 12 },
  ctaText:         { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryBtn:    { paddingVertical: 8 },
  secondaryText:   { color: "#555", fontSize: 13 },
});