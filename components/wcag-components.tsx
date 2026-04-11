import React, { useRef, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  AccessibilityInfo, findNodeHandle, Animated,
} from "react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "./dark-premium-ui";

// ─── Elite Feature 50: Full WCAG 2.1 AA Compliance ──────────

// ── 1. useFocusManager — إدارة التركيز للـ screen reader ─────

export function useFocusManager() {
  const firstFocusRef = useRef<any>(null);

  const focusFirst = useCallback(() => {
    if (firstFocusRef.current) {
      const node = findNodeHandle(firstFocusRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(focusFirst, 300);
    return () => clearTimeout(timer);
  }, []);

  return { firstFocusRef, focusFirst };
}

// ── 2. useAnnounce — إعلان للـ screen reader ─────────────────

export function useAnnounce() {
  return useCallback((message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  }, []);
}

// ── 3. AccessibleHeader — عنوان الشاشة ──────────────────────

export function AccessibleHeader({
  title, subtitle, isAr = true, onBack, backLabel,
}: {
  title: string; subtitle?: string; isAr?: boolean;
  onBack?: () => void; backLabel?: string;
}) {
  return (
    <View
      style={ah.container}
      accessibilityRole="header"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
    >
      {onBack && (
        <TouchableOpacity
          onPress={onBack}
          style={ah.backBtn}
          accessibilityRole="button"
          accessibilityLabel={backLabel ?? (isAr ? "رجوع للشاشة السابقة" : "Go back to previous screen")}
          accessibilityHint={isAr ? "يعود للشاشة السابقة" : "Returns to the previous screen"}
        >
          <Text style={ah.backIcon}>{isAr ? "→" : "←"}</Text>
        </TouchableOpacity>
      )}
      <View style={ah.titleGroup}>
        <Text style={[ah.title, { textAlign: isAr ? "right" : "left" }]}>{title}</Text>
        {subtitle && (
          <Text style={[ah.subtitle, { textAlign: isAr ? "right" : "left" }]}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
}

// ── 4. AccessibleList — قائمة مع دعم screen reader ───────────

export function AccessibleList<T>({
  data, renderItem, keyExtractor, label, isAr = true,
}: {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  label: string;
  isAr?: boolean;
}) {
  return (
    <View
      accessibilityRole="list"
      accessibilityLabel={`${label} — ${data.length} ${isAr ? "عناصر" : "items"}`}
    >
      {data.map((item, i) => (
        <View
          key={keyExtractor(item)}
          accessibilityRole="listitem"
          accessibilityLabel={`${isAr ? "عنصر" : "Item"} ${i + 1} ${isAr ? "من" : "of"} ${data.length}`}
        >
          {renderItem(item, i)}
        </View>
      ))}
    </View>
  );
}

// ── 5. AccessibleModal — Modal مع دعم كامل ───────────────────

export function AccessibleModal({
  visible, title, children, onClose,
  isAr = true, closeLabel,
}: {
  visible: boolean; title: string; children: React.ReactNode;
  onClose: () => void; isAr?: boolean; closeLabel?: string;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const { firstFocusRef, focusFirst } = useFocusManager();
  const announce = useAnnounce();

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      announce(isAr ? `تم فتح ${title}` : `${title} opened`);
      setTimeout(focusFirst, 300);
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[am.overlay, { opacity }]}
      accessibilityViewIsModal={true}
      accessibilityLiveRegion="polite"
    >
      <View
        style={am.card}
        accessibilityRole="dialog"
        accessibilityLabel={title}
      >
        <View style={am.header}>
          <Text
            ref={firstFocusRef}
            style={[am.title, { textAlign: isAr ? "right" : "left" }]}
            accessibilityRole="header"
          >
            {title}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={am.closeBtn}
            accessibilityRole="button"
            accessibilityLabel={closeLabel ?? (isAr ? `إغلاق ${title}` : `Close ${title}`)}
          >
            <Text style={am.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>
        {children}
      </View>
    </Animated.View>
  );
}

// ── 6. AccessibleForm — فورم مع دعم كامل ────────────────────

export function AccessibleForm({
  children, onSubmit, submitLabel,
  isAr = true, errorSummary,
}: {
  children: React.ReactNode; onSubmit: () => void;
  submitLabel: string; isAr?: boolean; errorSummary?: string[];
}) {
  const announce = useAnnounce();

  const handleSubmit = () => {
    if (errorSummary && errorSummary.length > 0) {
      const msg = isAr
        ? `يوجد ${errorSummary.length} أخطاء: ${errorSummary.join("، ")}`
        : `${errorSummary.length} errors: ${errorSummary.join(", ")}`;
      announce(msg);
      return;
    }
    onSubmit();
  };

  return (
    <View accessibilityRole="none">
      {errorSummary && errorSummary.length > 0 && (
        <View
          style={af.errorSummary}
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          accessibilityLabel={isAr ? `أخطاء في النموذج: ${errorSummary.join("، ")}` : `Form errors: ${errorSummary.join(", ")}`}
        >
          <Text style={af.errorTitle}>{isAr ? "يرجى تصحيح الأخطاء التالية:" : "Please fix the following errors:"}</Text>
          {errorSummary.map((err, i) => (
            <Text key={i} style={[af.errorItem, { textAlign: isAr ? "right" : "left" }]}>• {err}</Text>
          ))}
        </View>
      )}
      {children}
      <TouchableOpacity
        onPress={handleSubmit}
        style={af.submitBtn}
        accessibilityRole="button"
        accessibilityLabel={submitLabel}
        accessibilityHint={isAr ? "اضغط لإرسال النموذج" : "Tap to submit the form"}
      >
        <Text style={af.submitText}>{submitLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── 7. AccessibleStatus — حالة المعاملة مع وصف ───────────────

export function AccessibleStatus({
  status, isAr = true,
}: {
  status: "success" | "failed" | "pending" | "refunded";
  isAr?: boolean;
}) {
  const configs = {
    success:  { icon: "✅", labelAr: "ناجحة",  labelEn: "Successful", color: COLORS.success },
    failed:   { icon: "❌", labelAr: "فاشلة",  labelEn: "Failed",     color: COLORS.error   },
    pending:  { icon: "⏳", labelAr: "معلقة",  labelEn: "Pending",    color: COLORS.warning },
    refunded: { icon: "↩️", labelAr: "مستردة", labelEn: "Refunded",   color: COLORS.info    },
  };
  const c = configs[status];
  return (
    <View
      style={[ast.badge, { borderColor: c.color + "55", backgroundColor: c.color + "22" }]}
      accessibilityRole="text"
      accessibilityLabel={isAr ? c.labelAr : c.labelEn}
    >
      <Text style={ast.icon}>{c.icon}</Text>
      <Text style={[ast.label, { color: c.color }]}>{isAr ? c.labelAr : c.labelEn}</Text>
    </View>
  );
}

// ── 8. AccessibleAmount — مبلغ مع وصف للقارئ ─────────────────

export function AccessibleAmount({
  amount, currency = "SAR", isAr = true, size = "md",
}: {
  amount: number; currency?: string; isAr?: boolean; size?: "sm" | "md" | "lg";
}) {
  const locale = isAr ? "ar-SA" : "en-US";
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency", currency, minimumFractionDigits: 0,
  }).format(amount);

  const fontSizes = { sm: TYPOGRAPHY.sm, md: TYPOGRAPHY.md, lg: TYPOGRAPHY.xl };

  return (
    <Text
      style={{ fontSize: fontSizes[size], fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary }}
      accessibilityRole="text"
      accessibilityLabel={`${amount} ${currency}`}
    >
      {formatted}
    </Text>
  );
}

// ── 9. SkipLinks — روابط تخطي للمحتوى الرئيسي ───────────────

export function SkipLinks({
  links, isAr = true,
}: {
  links: { label: string; onPress: () => void }[];
  isAr?: boolean;
}) {
  return (
    <View style={sl.container} accessibilityRole="navigation" accessibilityLabel={isAr ? "روابط تخطي" : "Skip links"}>
      {links.map((link, i) => (
        <TouchableOpacity
          key={i}
          onPress={link.onPress}
          style={sl.link}
          accessibilityRole="link"
          accessibilityLabel={link.label}
          accessibilityHint={isAr ? "يتخطى للمحتوى المحدد" : "Skips to specified content"}
        >
          <Text style={sl.text}>{link.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── 10. A11yAuditBadge — شارة الامتثال ───────────────────────

export function A11yAuditBadge({ level = "AA", isAr = true }: { level?: "A" | "AA" | "AAA"; isAr?: boolean }) {
  return (
    <View
      style={ab.badge}
      accessibilityRole="text"
      accessibilityLabel={isAr ? `متوافق مع معيار WCAG 2.1 ${level}` : `WCAG 2.1 ${level} compliant`}
    >
      <Text style={ab.icon}>♿</Text>
      <Text style={ab.text}>WCAG 2.1 {level}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const ah = StyleSheet.create({
  container:  { flexDirection: "row", alignItems: "center", padding: SPACING.xl, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SPACING.md },
  backBtn:    { padding: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.bgElevated, minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" },
  backIcon:   { color: COLORS.brand, fontSize: 18 },
  titleGroup: { flex: 1 },
  title:      { fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary },
  subtitle:   { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, marginTop: 2 },
});

const am = StyleSheet.create({
  overlay:  { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end", zIndex: 9999 },
  card:     { backgroundColor: COLORS.bgCard, borderTopLeftRadius: RADIUS.xxl, borderTopRightRadius: RADIUS.xxl, padding: SPACING.xxl, borderWidth: 1, borderColor: COLORS.border },
  header:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.lg },
  title:    { fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary, flex: 1 },
  closeBtn: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md },
  closeIcon: { color: COLORS.textMuted, fontSize: 16 },
});

const af = StyleSheet.create({
  errorSummary: { backgroundColor: COLORS.errorMuted, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.error, marginBottom: SPACING.md, gap: SPACING.xs },
  errorTitle:   { color: COLORS.error, fontWeight: TYPOGRAPHY.bold, fontSize: TYPOGRAPHY.sm },
  errorItem:    { color: COLORS.error, fontSize: TYPOGRAPHY.sm },
  submitBtn:    { backgroundColor: COLORS.brand, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: "center", marginTop: SPACING.lg, minHeight: 48 },
  submitText:   { color: "#fff", fontWeight: TYPOGRAPHY.bold, fontSize: TYPOGRAPHY.md },
});

const ast = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, borderWidth: 1, gap: 4, alignSelf: "flex-start" },
  icon:  { fontSize: 12 },
  label: { fontSize: TYPOGRAPHY.xs, fontWeight: TYPOGRAPHY.semibold },
});

const sl = StyleSheet.create({
  container: { position: "absolute", top: -100, left: 0, zIndex: 9999 },
  link:      { backgroundColor: COLORS.brand, padding: SPACING.sm, margin: SPACING.xs, borderRadius: RADIUS.sm },
  text:      { color: "#fff", fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.bold },
});

const ab = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.infoMuted, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderWidth: 1, borderColor: COLORS.info, alignSelf: "center" },
  icon:  { fontSize: 14 },
  text:  { color: COLORS.info, fontSize: TYPOGRAPHY.xs, fontWeight: TYPOGRAPHY.semibold },
});