import { useCallback } from "react";
import { useTranslation } from "react-i18next";

// ─── الترجمة السياقية — Elite Feature 46 ───────────────────
// بدل ما تستخدم t("save") في كل مكان بنفس الشكل،
// الـ hook ده يرجع نص مختلف حسب السياق (screen + action)

type Screen =
  | "payment_link"
  | "invoice"
  | "transaction"
  | "dashboard"
  | "onboarding"
  | "subscription"
  | "expense"
  | "customer"
  | "settlement"
  | "dispute";

type ErrorType = "network" | "server" | "auth" | "not_found" | "validation" | "limit";

export function useCtx(screen?: Screen) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  // ── ترجمة سياقية للشاشة الحالية ──
  const ctx = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      if (screen) {
        const ctxKey = `ctx.${screen}.${key}`;
        const ctxVal = t(ctxKey, { defaultValue: "", ...vars });
        if (ctxVal && ctxVal !== ctxKey) return ctxVal;
      }
      // fallback للـ common
      const commonKey = `ctx.common.${key}`;
      const commonVal = t(commonKey, { defaultValue: "", ...vars });
      if (commonVal && commonVal !== commonKey) return commonVal;
      // fallback نهائي
      return t(key, { defaultValue: key, ...vars });
    },
    [t, screen]
  );

  // ── رسائل الخطأ السياقية ──
  const err = useCallback(
    (type: ErrorType) => t(`ctx.errors.${type}`, {
      defaultValue: isAr ? "حدث خطأ، حاول مجدداً" : "An error occurred, please try again",
    }),
    [t, isAr]
  );

  // ── تحية حسب الوقت ──
  const greeting = useCallback(
    (name?: string) => {
      const hour = new Date().getHours();
      let key: string;
      if (hour < 12)      key = "ctx.dashboard.greeting_morning";
      else if (hour < 17) key = "ctx.dashboard.greeting_afternoon";
      else                key = "ctx.dashboard.greeting_evening";
      const base = t(key, { defaultValue: isAr ? "مرحباً" : "Hello" });
      return name ? `${base}، ${name}` : base;
    },
    [t, isAr]
  );

  // ── حالة Empty State السياقية ──
  const emptyState = useCallback(() => {
    if (!screen) return { title: "", desc: "", cta: "" };
    return {
      title: t(`ctx.${screen}.empty_title`, { defaultValue: isAr ? "لا توجد بيانات" : "No data yet" }),
      desc:  t(`ctx.${screen}.empty_desc`,  { defaultValue: isAr ? "ابدأ بإضافة عنصر جديد" : "Start by adding a new item" }),
      cta:   t(`ctx.${screen}.empty_cta`,   { defaultValue: isAr ? "إضافة" : "Add" }),
    };
  }, [t, screen, isAr]);

  // ── رسالة نجاح سياقية ──
  const success = useCallback(
    (action: string) => {
      if (screen) {
        const key = `ctx.${screen}.success_${action}`;
        const val = t(key, { defaultValue: "" });
        if (val && val !== key) return val;
      }
      return isAr ? "تمت العملية بنجاح" : "Operation completed successfully";
    },
    [t, screen, isAr]
  );

  // ── تلميح سياقي ──
  const hint = useCallback(
    (field: string) => {
      if (!screen) return "";
      const key = `ctx.${screen}.hint_${field}`;
      return t(key, { defaultValue: "" });
    },
    [t, screen]
  );

  // ── ترجمة الـ status ──
  const status = useCallback(
    (statusKey: string) => {
      if (screen) {
        const key = `ctx.${screen}.status_${statusKey}`;
        const val = t(key, { defaultValue: "" });
        if (val && val !== key) return val;
      }
      return statusKey;
    },
    [t, screen]
  );

  return { ctx, err, greeting, emptyState, success, hint, status, isAr, t };
}

// ─── مثال الاستخدام في شاشة ─────────────────────────────────
//
// import { useCtx } from "../../hooks/useContextualTranslation";
//
// export default function PaymentLinksScreen() {
//   const { ctx, err, emptyState, success, hint } = useCtx("payment_link");
//
//   // Empty state
//   const empty = emptyState();
//   // empty.title → "لا توجد روابط دفع بعد"
//   // empty.cta   → "أنشئ رابط دفع"
//
//   // Hint
//   const amountHint = hint("amount");
//   // → "أدخل المبلغ بالعملة المحلية"
//
//   // Success
//   const successMsg = success("create");
//   // → "تم إنشاء الرابط بنجاح"
//
//   // Error
//   const networkErr = err("network");
//   // → "تحقق من اتصالك بالإنترنت"
// }