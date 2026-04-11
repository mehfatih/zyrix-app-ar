import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, I18nManager, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { uxApi } from "../../services/api";

// ── الـ hook الرئيسي للاستخدام في أي شاشة ──
export function useAppLanguage() {
  const { t, i18n: i18nInstance } = useTranslation();
  const isAr = i18nInstance.language === "ar";
  const isRTL = isAr;

  const switchLanguage = useCallback(async (lang: "ar" | "en") => {
    await i18nInstance.changeLanguage(lang);
    try {
      await uxApi.updateLang({
        language: lang,
        rtl: lang === "ar",
        date_format: lang === "ar" ? "DD/MM/YYYY" : "MM/DD/YYYY",
        currency_format: lang === "ar" ? "ar-SA" : "en-US",
      });
    } catch (_) {}
  }, [i18nInstance]);

  const formatAmount = useCallback((amount: number, currency: string = "SAR") => {
    const locale = isAr ? "ar-SA" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }, [isAr]);

  const formatDate = useCallback((date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const locale = isAr ? "ar-SA" : "en-US";
    return new Intl.DateTimeFormat(locale, {
      year: "numeric", month: "short", day: "numeric",
    }).format(d);
  }, [isAr]);

  const formatNumber = useCallback((num: number) => {
    const locale = isAr ? "ar-SA" : "en-US";
    return new Intl.NumberFormat(locale).format(num);
  }, [isAr]);

  return { t, isAr, isRTL, switchLanguage, formatAmount, formatDate, formatNumber, lang: i18nInstance.language };
}

// ── شاشة إعدادات اللغة ──
export default function MultiLanguageScreen() {
  const router = useRouter();
  const { t, isAr, switchLanguage, lang } = useAppLanguage();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSwitch = async (newLang: "ar" | "en") => {
    if (newLang === lang) return;
    setLoading(true);
    await switchLanguage(newLang);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setLoading(false);
  };

  const LANGS = [
    {
      code: "ar" as const,
      nameAr: "العربية",
      nameEn: "Arabic",
      flag: "🇸🇦",
      dir: "RTL",
      desc: "الاتجاه: يمين لشمال",
    },
    {
      code: "en" as const,
      nameAr: "الإنجليزية",
      nameEn: "English",
      flag: "🇬🇧",
      dir: "LTR",
      desc: "Direction: Left to Right",
    },
  ];

  const FORMATS = [
    {
      label: isAr ? "تنسيق المبلغ" : "Amount Format",
      value: isAr
        ? new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR" }).format(12500)
        : new Intl.NumberFormat("en-US", { style: "currency", currency: "SAR" }).format(12500),
    },
    {
      label: isAr ? "تنسيق التاريخ" : "Date Format",
      value: isAr
        ? new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "short", day: "numeric" }).format(new Date())
        : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date()),
    },
    {
      label: isAr ? "الأرقام" : "Numbers",
      value: isAr
        ? new Intl.NumberFormat("ar-SA").format(1234567)
        : new Intl.NumberFormat("en-US").format(1234567),
    },
  ];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>{isAr ? "→" : "←"}</Text>
        </TouchableOpacity>
        <Text style={s.title}>{isAr ? "إعدادات اللغة" : "Language Settings"}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* اختيار اللغة */}
        <Text style={s.sectionTitle}>{isAr ? "🌐 اختر اللغة" : "🌐 Choose Language"}</Text>
        {LANGS.map((l) => (
          <TouchableOpacity
            key={l.code}
            style={[s.langCard, lang === l.code && s.langCardActive]}
            onPress={() => handleSwitch(l.code)}
            disabled={loading}
            accessibilityRole="radio"
            accessibilityState={{ checked: lang === l.code }}
            accessibilityLabel={`${l.nameAr} / ${l.nameEn}`}
          >
            <Text style={s.flag}>{l.flag}</Text>
            <View style={s.langText}>
              <Text style={[s.langName, lang === l.code && s.langNameActive]}>
                {l.nameAr} / {l.nameEn}
              </Text>
              <Text style={s.langDesc}>{l.desc} · {l.dir}</Text>
            </View>
            {loading && lang !== l.code ? null : (
              <View style={[s.radio, lang === l.code && s.radioActive]}>
                {lang === l.code && <View style={s.radioDot} />}
              </View>
            )}
          </TouchableOpacity>
        ))}

        {loading && (
          <View style={s.loadingRow}>
            <ActivityIndicator color="#7C3AED" size="small" />
            <Text style={s.loadingText}>{isAr ? "جاري التغيير..." : "Switching..."}</Text>
          </View>
        )}

        {saved && (
          <View style={s.savedBadge}>
            <Text style={s.savedText}>{isAr ? "✅ تم حفظ اللغة" : "✅ Language saved"}</Text>
          </View>
        )}

        {/* معاينة التنسيقات */}
        <Text style={[s.sectionTitle, { marginTop: 24 }]}>
          {isAr ? "👁️ معاينة التنسيقات" : "👁️ Format Preview"}
        </Text>
        {FORMATS.map((f, i) => (
          <View key={i} style={s.formatRow}>
            <Text style={s.formatLabel}>{f.label}</Text>
            <Text style={s.formatValue}>{f.value}</Text>
          </View>
        ))}

        {/* مفاتيح الترجمة الموجودة */}
        <Text style={[s.sectionTitle, { marginTop: 24 }]}>
          {isAr ? "🔑 نماذج من الترجمة" : "🔑 Translation Samples"}
        </Text>
        {[
          "dashboard.title",
          "transactions.title",
          "balance.title",
          "settings.title",
          "common.save",
          "common.cancel",
        ].map((key) => (
          <View key={key} style={s.keyRow}>
            <Text style={s.keyName}>{key}</Text>
            <Text style={s.keyValue}>{t(key, { defaultValue: key })}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#0a0a0a" },
  header:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#111" },
  back:           { color: "#7C3AED", fontSize: 20 },
  title:          { fontSize: 18, fontWeight: "700", color: "#fff" },
  content:        { padding: 20, paddingBottom: 40 },
  sectionTitle:   { fontSize: 13, fontWeight: "600", color: "#666", marginBottom: 12, textAlign: "right" },
  langCard:       { flexDirection: "row", alignItems: "center", backgroundColor: "#111", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#1a1a1a", gap: 12 },
  langCardActive: { borderColor: "#7C3AED", backgroundColor: "#1a0a2e" },
  flag:           { fontSize: 32 },
  langText:       { flex: 1 },
  langName:       { fontSize: 15, fontWeight: "600", color: "#aaa", textAlign: "right" },
  langNameActive: { color: "#fff" },
  langDesc:       { fontSize: 12, color: "#555", textAlign: "right", marginTop: 2 },
  radio:          { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#333", justifyContent: "center", alignItems: "center" },
  radioActive:    { borderColor: "#7C3AED" },
  radioDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: "#7C3AED" },
  loadingRow:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12 },
  loadingText:    { color: "#666", fontSize: 13 },
  savedBadge:     { alignItems: "center", padding: 10, backgroundColor: "#0a1f0a", borderRadius: 10, borderWidth: 1, borderColor: "#22c55e", marginBottom: 8 },
  savedText:      { color: "#22c55e", fontSize: 13 },
  formatRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#111", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#1a1a1a" },
  formatLabel:    { color: "#666", fontSize: 13 },
  formatValue:    { color: "#fff", fontSize: 14, fontWeight: "600" },
  keyRow:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#111" },
  keyName:        { color: "#444", fontSize: 11, fontFamily: "monospace" },
  keyValue:       { color: "#7C3AED", fontSize: 13, fontWeight: "500" },
});