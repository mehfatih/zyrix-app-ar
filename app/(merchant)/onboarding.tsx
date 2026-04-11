import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Animated, Dimensions, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "../../hooks/useTranslation";
import { getOnboardingStatus, updateOnboardingStep, completeOnboarding, autoFillKYC } from "../../services/api";

const { width } = Dimensions.get("window");

const STEPS = [
  { id: 1, key: "business_name",   icon: "🏪", fieldType: "text" },
  { id: 2, key: "phone",           icon: "📱", fieldType: "phone" },
  { id: 3, key: "business_type",   icon: "🏷️", fieldType: "select" },
  { id: 4, key: "country",         icon: "🌍", fieldType: "select" },
  { id: 5, key: "done",            icon: "🎉", fieldType: "done" },
];

const BUSINESS_TYPES = ["متجر إلكتروني", "خدمات", "مطعم", "تطبيق", "أخرى"];
const COUNTRIES = ["السعودية", "الإمارات", "الكويت", "قطر", "العراق", "تركيا"];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentStep - 1) / (STEPS.length - 1),
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  const loadStatus = async () => {
    try {
      const res = await getOnboardingStatus();
      if (res?.data?.current_step) {
        setCurrentStep(res.data.current_step);
      }
      if (res?.data?.kyc_data) {
        setFormData(res.data.kyc_data);
      }
    } catch (_) {}
  };

  const handleAutoFill = async () => {
    setLoading(true);
    try {
      const res = await autoFillKYC();
      if (res?.autoData) {
        setFormData(res.autoData);
        setAutoFilled(true);
      }
    } catch (_) {}
    setLoading(false);
  };

  const handleNext = async () => {
    if (currentStep === STEPS.length) {
      setLoading(true);
      await completeOnboarding();
      setLoading(false);
      router.push("/(merchant)/dashboard" as any);
      return;
    }
    setLoading(true);
    await updateOnboardingStep({ step: currentStep, data: formData });
    setLoading(false);

    // Slide animation
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -width, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: width, duration: 0, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    setCurrentStep((s) => s + 1);
  };

  const step = STEPS[currentStep - 1];
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.progressText}>{currentStep}/{STEPS.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          {/* Icon */}
          <Text style={styles.stepIcon}>{step.icon}</Text>

          {/* Title */}
          <Text style={styles.stepTitle}>
            {getDefaultTitle(step.id)}
          </Text>
          <Text style={styles.stepSubtitle}>
            {getDefaultSub(step.id)}
          </Text>

          {/* Auto-fill badge */}
          {currentStep === 1 && !autoFilled && (
            <TouchableOpacity style={styles.autoFillBtn} onPress={handleAutoFill}>
              <Text style={styles.autoFillText}>⚡ تعبئة تلقائية من حسابك</Text>
            </TouchableOpacity>
          )}
          {autoFilled && (
            <View style={styles.autoFilledBadge}>
              <Text style={styles.autoFilledText}>✅ تم التعبئة التلقائية</Text>
            </View>
          )}

          {/* Input */}
          {step.fieldType === "text" || step.fieldType === "phone" ? (
            <TextInput
              style={styles.input}
              value={formData[step.key] || ""}
              onChangeText={(v) => setFormData((d) => ({ ...d, [step.key]: v }))}
              placeholder={getPlaceholder(step.key)}
              placeholderTextColor="#555"
              keyboardType={step.fieldType === "phone" ? "phone-pad" : "default"}
              textAlign="right"
            />
          ) : step.fieldType === "select" ? (
            <View style={styles.optionsGrid}>
              {(step.key === "business_type" ? BUSINESS_TYPES : COUNTRIES).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionBtn, formData[step.key] === opt && styles.optionSelected]}
                  onPress={() => setFormData((d) => ({ ...d, [step.key]: opt }))}
                >
                  <Text style={[styles.optionText, formData[step.key] === opt && styles.optionTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            // Done step
            <View style={styles.doneContainer}>
              <Text style={styles.doneTitle}>🚀 أنت جاهز!</Text>
              <Text style={styles.doneSub}>تم إعداد حسابك في أقل من دقيقة</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* CTA Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, loading && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={styles.nextBtnText}>
            {loading ? "..." : currentStep === STEPS.length ? "ابدأ الآن 🚀" : "التالي ←"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function getDefaultTitle(id: number) {
  return ["اسم متجرك", "رقم جوالك", "نوع النشاط", "بلدك", "جاهز!"][id - 1];
}
function getDefaultSub(id: number) {
  return ["سيظهر للعملاء", "للتحقق والإشعارات", "لتخصيص تجربتك", "للعملة والضرائب", "حساب Zyrix جاهز"][id - 1];
}
function getPlaceholder(key: string) {
  return key === "business_name" ? "مثال: متجر الأناقة" : "+966 5XX XXX XXXX";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  progressContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingTop: 16, gap: 12 },
  progressTrack: { flex: 1, height: 4, backgroundColor: "#1a1a1a", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#7C3AED", borderRadius: 2 },
  progressText: { color: "#666", fontSize: 12 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 24 },
  stepIcon: { fontSize: 56, textAlign: "center", marginBottom: 24 },
  stepTitle: { fontSize: 28, fontWeight: "700", color: "#fff", textAlign: "right", marginBottom: 8 },
  stepSubtitle: { fontSize: 15, color: "#888", textAlign: "right", marginBottom: 32 },
  autoFillBtn: { backgroundColor: "#1a0a2e", borderWidth: 1, borderColor: "#7C3AED", borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 20 },
  autoFillText: { color: "#7C3AED", fontWeight: "600", fontSize: 14 },
  autoFilledBadge: { backgroundColor: "#0a1f0a", borderWidth: 1, borderColor: "#22c55e", borderRadius: 12, padding: 12, alignItems: "center", marginBottom: 20 },
  autoFilledText: { color: "#22c55e", fontSize: 14 },
  input: { backgroundColor: "#111", borderWidth: 1, borderColor: "#222", borderRadius: 14, padding: 16, color: "#fff", fontSize: 16, marginBottom: 16 },
  optionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  optionBtn: { paddingHorizontal: 18, paddingVertical: 12, backgroundColor: "#111", borderWidth: 1, borderColor: "#222", borderRadius: 10 },
  optionSelected: { backgroundColor: "#1a0a2e", borderColor: "#7C3AED" },
  optionText: { color: "#aaa", fontSize: 14 },
  optionTextSelected: { color: "#7C3AED", fontWeight: "600" },
  doneContainer: { alignItems: "center", paddingTop: 24 },
  doneTitle: { fontSize: 32, fontWeight: "700", color: "#fff", marginBottom: 12 },
  doneSub: { fontSize: 16, color: "#888" },
  footer: { padding: 24 },
  nextBtn: { backgroundColor: "#7C3AED", borderRadius: 16, padding: 18, alignItems: "center" },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});