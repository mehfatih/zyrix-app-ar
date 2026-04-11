import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Animated, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { setupApi } from "../../services/api";

const { width } = Dimensions.get("window");

const TASKS = [
  { key: "profile",       icon: "👤", screen: "/(merchant)/settings",         titleAr: "أكمل ملفك الشخصي",         descAr: "اسم المتجر والشعار"              },
  { key: "payment_link",  icon: "🔗", screen: "/(merchant)/payment-links",     titleAr: "أنشئ أول رابط دفع",         descAr: "ابدأ تحصيل المدفوعات فوراً"     },
  { key: "api_key",       icon: "🔑", screen: "/(merchant)/api-keys",          titleAr: "احصل على API Key",          descAr: "للتكامل مع متجرك"               },
  { key: "webhook",       icon: "🔔", screen: "/(merchant)/webhooks",          titleAr: "اضبط Webhook",              descAr: "إشعارات فورية للمعاملات"        },
  { key: "team",          icon: "👥", screen: "/(merchant)/multi-user",        titleAr: "أضف أعضاء الفريق",          descAr: "ادعُ موظفيك"                    },
  { key: "invoice",       icon: "🧾", screen: "/(merchant)/invoices",          titleAr: "أرسل أول فاتورة",           descAr: "احترافية وسريعة"                },
  { key: "goal",          icon: "🎯", screen: "/(merchant)/revenue-goals",     titleAr: "حدد هدف إيراد",             descAr: "تابع تقدمك يومياً"              },
  { key: "feature_flags", icon: "⚡", screen: "/(merchant)/feature-flags",     titleAr: "فعّل الميزات المناسبة",     descAr: "خصص Zyrix لنشاطك"              },
];

export default function GuidedSetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [completed, setCompleted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadProgress(); }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: completed.length / TASKS.length,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [completed]);

  const loadProgress = async () => {
    try {
      const res = await setupApi.getProgress();
      if (res?.data?.completed_tasks) {
        setCompleted(res.data.completed_tasks);
      }
    } catch (_) {}
    setLoading(false);
  };

  const handleTask = async (task: typeof TASKS[0]) => {
    if (!completed.includes(task.key)) {
      try {
        await setupApi.completeTask(task.key);
        setCompleted(prev => [...prev, task.key]);
      } catch (_) {}
    }
    router.push(task.screen as any);
  };

  const handleDismiss = async () => {
    await setupApi.dismiss();
    router.back();
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const percent = Math.round((completed.length / TASKS.length) * 100);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={s.title}>🚀 إعداد حسابك</Text>
          <TouchableOpacity onPress={handleDismiss}>
            <Text style={s.dismiss}>تخطي</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.subtitle}>{completed.length} من {TASKS.length} مهام مكتملة</Text>
        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={s.percent}>{percent}%</Text>
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {TASKS.map((task, i) => {
          const done = completed.includes(task.key);
          return (
            <TouchableOpacity
              key={task.key}
              style={[s.card, done && s.cardDone]}
              onPress={() => handleTask(task)}
              activeOpacity={0.8}
            >
              <View style={[s.iconBox, done && s.iconBoxDone]}>
                <Text style={s.icon}>{done ? "✅" : task.icon}</Text>
              </View>
              <View style={s.cardText}>
                <Text style={[s.cardTitle, done && s.cardTitleDone]}>{task.titleAr}</Text>
                <Text style={s.cardDesc}>{task.descAr}</Text>
              </View>
              <Text style={s.arrow}>{done ? "" : "←"}</Text>
            </TouchableOpacity>
          );
        })}

        {completed.length === TASKS.length && (
          <View style={s.completeBanner}>
            <Text style={s.completeIcon}>🎉</Text>
            <Text style={s.completeTitle}>أحسنت! حسابك جاهز بالكامل</Text>
            <TouchableOpacity style={s.completeBtn} onPress={() => router.push("/(merchant)/dashboard" as any)}>
              <Text style={s.completeBtnText}>انتقل للداشبورد</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#0a0a0a" },
  header:          { padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#111" },
  headerTop:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title:           { fontSize: 22, fontWeight: "700", color: "#fff" },
  dismiss:         { color: "#555", fontSize: 14 },
  subtitle:        { color: "#888", fontSize: 13, marginBottom: 12, textAlign: "right" },
  progressTrack:   { height: 6, backgroundColor: "#1a1a1a", borderRadius: 3, overflow: "hidden" },
  progressFill:    { height: "100%", backgroundColor: "#7C3AED", borderRadius: 3 },
  percent:         { color: "#7C3AED", fontSize: 12, textAlign: "right", marginTop: 4 },
  list:            { padding: 16, gap: 10 },
  card:            { flexDirection: "row", alignItems: "center", backgroundColor: "#111", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#1a1a1a", gap: 14 },
  cardDone:        { borderColor: "#1a2a1a", backgroundColor: "#0d180d" },
  iconBox:         { width: 44, height: 44, borderRadius: 12, backgroundColor: "#1a1a2e", justifyContent: "center", alignItems: "center" },
  iconBoxDone:     { backgroundColor: "#0a1f0a" },
  icon:            { fontSize: 20 },
  cardText:        { flex: 1 },
  cardTitle:       { fontSize: 15, fontWeight: "600", color: "#fff", textAlign: "right" },
  cardTitleDone:   { color: "#22c55e" },
  cardDesc:        { fontSize: 12, color: "#666", textAlign: "right", marginTop: 2 },
  arrow:           { color: "#444", fontSize: 18 },
  completeBanner:  { alignItems: "center", backgroundColor: "#0a1f0a", borderRadius: 16, padding: 24, marginTop: 8, borderWidth: 1, borderColor: "#22c55e" },
  completeIcon:    { fontSize: 48, marginBottom: 12 },
  completeTitle:   { fontSize: 18, fontWeight: "700", color: "#22c55e", marginBottom: 16 },
  completeBtn:     { backgroundColor: "#7C3AED", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  completeBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});