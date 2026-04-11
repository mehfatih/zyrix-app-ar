import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, ScrollView,
} from "react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "./dark-premium-ui";
import { uxApi } from "../../services/api";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── Elite Feature 48: Smart Tooltips ───────────────────────
// تظهر تلقائياً للمستخدم الجديد في أول زيارة للشاشة

// ── Tooltip Registry — كل الـ tooltips في مكان واحد ─────────

export const TOOLTIP_REGISTRY: Record<string, { ar: string; en: string; screen: string; priority: number }> = {
  // Dashboard
  "dashboard.revenue_kpi":     { ar: "إجمالي إيرادك في آخر 30 يوماً — اضغط للتفاصيل", en: "Your total revenue in the last 30 days — tap for details", screen: "dashboard", priority: 1 },
  "dashboard.success_rate":    { ar: "نسبة المعاملات الناجحة — الهدف 95%+", en: "Successful transaction rate — target is 95%+", screen: "dashboard", priority: 2 },
  "dashboard.balance_card":    { ar: "رصيدك المتاح للسحب الآن", en: "Your balance available for withdrawal now", screen: "dashboard", priority: 3 },

  // Payment Links
  "payment_links.create_btn":  { ar: "أنشئ رابط دفع وشاركه مع عميلك في ثوانٍ", en: "Create a payment link and share it with your client in seconds", screen: "payment_links", priority: 1 },
  "payment_links.qr_btn":      { ar: "اعرض QR Code للدفع الحضوري", en: "Show QR Code for in-person payments", screen: "payment_links", priority: 2 },
  "payment_links.toggle":      { ar: "أوقف الرابط مؤقتاً بدون حذفه", en: "Pause the link without deleting it", screen: "payment_links", priority: 3 },

  // Invoices
  "invoices.zatca_btn":        { ar: "أنشئ فاتورة إلكترونية متوافقة مع ZATCA للسعودية", en: "Generate ZATCA-compliant e-invoice for KSA", screen: "invoices", priority: 1 },
  "invoices.reminder_btn":     { ar: "تذكير تلقائي للعميل عند تأخر الدفع", en: "Automatic reminder for the client when payment is late", screen: "invoices", priority: 2 },

  // Analytics
  "analytics.range_picker":    { ar: "غيّر الفترة الزمنية لتحليل بياناتك", en: "Change the time range to analyze your data", screen: "analytics", priority: 1 },
  "analytics.export_btn":      { ar: "صدّر التقرير بصيغة CSV أو PDF", en: "Export the report as CSV or PDF", screen: "analytics", priority: 2 },

  // Feature Flags
  "feature_flags.elite_badge": { ar: "ميزة Elite — مطلوب ترقية الباقة", en: "Elite feature — package upgrade required", screen: "feature_flags", priority: 1 },

  // Transactions
  "transactions.filter_btn":   { ar: "صفّح معاملاتك حسب الحالة أو التاريخ أو المبلغ", en: "Filter your transactions by status, date, or amount", screen: "transactions", priority: 1 },
  "transactions.export_btn":   { ar: "صدّر معاملاتك لأغراض المحاسبة", en: "Export your transactions for accounting purposes", screen: "transactions", priority: 2 },

  // Wallets
  "wallets.convert_btn":       { ar: "حوّل بين العملات بسعر صرف لحظي", en: "Convert between currencies at live exchange rates", screen: "wallets", priority: 1 },
  "wallets.sub_wallet_btn":    { ar: "أنشئ محفظة فرعية لكل مشروع أو قسم", en: "Create a sub-wallet for each project or department", screen: "wallets", priority: 2 },
};

// ── Seen Tooltips Store (in-memory — يُستبدل بـ AsyncStorage) ─

const seenTooltips = new Set<string>();

export function markTooltipSeen(key: string) {
  seenTooltips.add(key);
}

export function isTooltipSeen(key: string) {
  return seenTooltips.has(key);
}

// ─── SmartTooltip Component ──────────────────────────────────

interface SmartTooltipProps {
  tooltipKey: string;
  isAr?: boolean;
  children: React.ReactNode;
  forceShow?: boolean;
  placement?: "top" | "bottom" | "left" | "right";
}

export function SmartTooltip({
  tooltipKey, isAr = true, children,
  forceShow = false, placement = "bottom",
}: SmartTooltipProps) {
  const [visible, setVisible] = useState(false);
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(placement === "bottom" ? -6 : 6)).current;
  const ref = useRef<View>(null);

  const tooltip = TOOLTIP_REGISTRY[tooltipKey];
  if (!tooltip) return <>{children}</>;

  const shouldShow = forceShow || !isTooltipSeen(tooltipKey);

  const show = useCallback(() => {
    if (!shouldShow) return;
    setVisible(true);
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [shouldShow]);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: placement === "bottom" ? -6 : 6, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      markTooltipSeen(tooltipKey);
      try { uxApi.logHelpSearch(tooltipKey, 1, tooltipKey); } catch (_) {}
    });
  }, [tooltipKey, placement]);

  return (
    <View ref={ref}>
      <TouchableOpacity
        onPress={show}
        onLongPress={show}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={isAr ? tooltip.ar : tooltip.en}
        accessibilityHint={isAr ? "اضغط لعرض التلميح" : "Tap to show tooltip"}
      >
        {children}
      </TouchableOpacity>

      {visible && (
        <Animated.View
          style={[
            st.bubble,
            placement === "top"    && st.top,
            placement === "bottom" && st.bottom,
            placement === "left"   && st.left,
            placement === "right"  && st.right,
            { opacity, transform: [{ translateY }] },
          ]}
          accessibilityLiveRegion="polite"
        >
          <Text style={[st.text, { textAlign: isAr ? "right" : "left" }]}>
            {isAr ? tooltip.ar : tooltip.en}
          </Text>
          <TouchableOpacity
            onPress={hide}
            style={st.closeBtn}
            accessibilityRole="button"
            accessibilityLabel={isAr ? "إغلاق التلميح" : "Close tooltip"}
          >
            <Text style={st.closeText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ─── OnboardingSpotlight — تعريف بالشاشة في أول زيارة ───────

interface SpotlightStep {
  key: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  icon: string;
}

interface OnboardingSpotlightProps {
  screen: string;
  steps: SpotlightStep[];
  isAr?: boolean;
  onComplete?: () => void;
}

export function OnboardingSpotlight({ screen, steps, isAr = true, onComplete }: OnboardingSpotlightProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(!isTooltipSeen(`spotlight_${screen}`));
  const opacity    = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity,   { toValue: 1,  duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0,  duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, currentStep]);

  const next = () => {
    if (currentStep < steps.length - 1) {
      Animated.timing(slideAnim, { toValue: -20, duration: 200, useNativeDriver: true }).start(() => {
        slideAnim.setValue(20);
        setCurrentStep(s => s + 1);
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      });
    } else {
      dismiss();
    }
  };

  const dismiss = () => {
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setVisible(false);
      markTooltipSeen(`spotlight_${screen}`);
      onComplete?.();
    });
  };

  if (!visible || steps.length === 0) return null;

  const step = steps[currentStep];

  return (
    <Animated.View style={[os.overlay, { opacity }]}>
      <Animated.View style={[os.card, { transform: [{ translateY: slideAnim }] }]}>
        {/* Progress dots */}
        <View style={os.dots}>
          {steps.map((_, i) => (
            <View key={i} style={[os.dot, i === currentStep && os.dotActive]} />
          ))}
        </View>

        <Text style={os.icon}>{step.icon}</Text>
        <Text style={[os.title, { textAlign: isAr ? "right" : "left" }]}>
          {isAr ? step.titleAr : step.titleEn}
        </Text>
        <Text style={[os.desc, { textAlign: isAr ? "right" : "left" }]}>
          {isAr ? step.descAr : step.descEn}
        </Text>

        <View style={os.actions}>
          <TouchableOpacity onPress={dismiss} style={os.skipBtn} accessibilityRole="button" accessibilityLabel={isAr ? "تخطي" : "Skip"}>
            <Text style={os.skipText}>{isAr ? "تخطي" : "Skip"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={next} style={os.nextBtn} accessibilityRole="button" accessibilityLabel={isAr ? (currentStep === steps.length - 1 ? "بدء" : "التالي") : (currentStep === steps.length - 1 ? "Start" : "Next")}>
            <Text style={os.nextText}>
              {isAr
                ? (currentStep === steps.length - 1 ? "ابدأ 🚀" : "التالي ←")
                : (currentStep === steps.length - 1 ? "Start 🚀" : "Next →")}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Spotlight configs جاهزة لكل شاشة ──────────────────────

export const SCREEN_SPOTLIGHTS: Record<string, SpotlightStep[]> = {
  dashboard: [
    { key: "s1", icon: "📊", titleAr: "لوحة التحكم",   titleEn: "Dashboard",      descAr: "هنا تتابع كل شيء — إيرادك، معاملاتك، ورصيدك لحظة بلحظة",       descEn: "Track everything here — your revenue, transactions, and balance in real time" },
    { key: "s2", icon: "💳", titleAr: "المعاملات",      titleEn: "Transactions",   descAr: "اضغط على أي معاملة لتفاصيلها الكاملة",                          descEn: "Tap any transaction for full details" },
    { key: "s3", icon: "🔗", titleAr: "روابط الدفع",   titleEn: "Payment Links",  descAr: "أنشئ روابط دفع وشاركها فوراً مع عملائك",                        descEn: "Create payment links and share them instantly with your clients" },
  ],
  payment_links: [
    { key: "s1", icon: "🔗", titleAr: "روابط الدفع",   titleEn: "Payment Links",  descAr: "أنشئ رابطاً مخصصاً لكل منتج أو خدمة",                           descEn: "Create a custom link for each product or service" },
    { key: "s2", icon: "📱", titleAr: "QR Code",        titleEn: "QR Code",        descAr: "اعرض QR للدفع الحضوري — العميل يمسحه بكاميرا جواله",            descEn: "Show QR for in-person payment — client scans with phone camera" },
  ],
  transactions: [
    { key: "s1", icon: "💳", titleAr: "المعاملات",      titleEn: "Transactions",   descAr: "كل مدفوعاتك في مكان واحد — فلتر وابحث بسهولة",                  descEn: "All your payments in one place — filter and search easily" },
    { key: "s2", icon: "📤", titleAr: "التصدير",         titleEn: "Export",         descAr: "صدّر للمحاسب بضغطة واحدة",                                      descEn: "Export to your accountant with one tap" },
  ],
};

// ─── Styles ──────────────────────────────────────────────────

const st = StyleSheet.create({
  bubble:   { position: "absolute", backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.brand, maxWidth: 260, zIndex: 999, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  top:      { bottom: "110%", right: 0 },
  bottom:   { top: "110%",   right: 0 },
  left:     { right: "110%", top: 0 },
  right:    { left: "110%",  top: 0 },
  text:     { flex: 1, color: COLORS.textSecondary, fontSize: TYPOGRAPHY.xs, lineHeight: 18 },
  closeBtn: { padding: 2 },
  closeText: { color: COLORS.textMuted, fontSize: 12 },
});

const os = StyleSheet.create({
  overlay: { position: "absolute", bottom: 0, left: 0, right: 0, top: 0, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end", zIndex: 9998 },
  card:    { backgroundColor: COLORS.bgCard, borderTopLeftRadius: RADIUS.xxl, borderTopRightRadius: RADIUS.xxl, padding: SPACING.xxl, borderWidth: 1, borderColor: COLORS.border },
  dots:    { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: SPACING.lg },
  dot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.bgElevated },
  dotActive: { backgroundColor: COLORS.brand, width: 18 },
  icon:    { fontSize: 48, textAlign: "center", marginBottom: SPACING.md },
  title:   { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  desc:    { fontSize: TYPOGRAPHY.md, color: COLORS.textSecondary, lineHeight: 24, marginBottom: SPACING.xl },
  actions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  skipBtn: { padding: SPACING.md },
  skipText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sm },
  nextBtn: { backgroundColor: COLORS.brand, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.xxl, paddingVertical: SPACING.md },
  nextText: { color: "#fff", fontWeight: TYPOGRAPHY.bold, fontSize: TYPOGRAPHY.md },
});