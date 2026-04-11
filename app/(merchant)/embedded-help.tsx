import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Animated, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { uxApi } from "../../services/api";

// ─── قاعدة بيانات المقالات ───────────────────────────────────

const HELP_ARTICLES = [
  // Payment Links
  { id: "pl-1", category: "payment_links", icon: "🔗", titleAr: "كيف أنشئ رابط دفع؟", titleEn: "How to create a payment link?", bodyAr: "اذهب إلى روابط الدفع ← اضغط + ← أدخل المبلغ والوصف ← شارك الرابط مع عميلك.", bodyEn: "Go to Payment Links → Press + → Enter amount and description → Share the link.", tags: ["دفع", "رابط", "payment"] },
  { id: "pl-2", category: "payment_links", icon: "🔗", titleAr: "كيف أوقف رابط دفع مؤقتاً؟", titleEn: "How to pause a payment link?", bodyAr: "افتح الرابط ← اضغط على زر التبديل (Toggle) لإيقافه أو تفعيله.", bodyEn: "Open the link → Press the toggle button to pause or activate.", tags: ["إيقاف", "toggle"] },
  // Invoices
  { id: "inv-1", category: "invoices", icon: "🧾", titleAr: "كيف أرسل فاتورة؟", titleEn: "How to send an invoice?", bodyAr: "روابط الفواتير ← أنشئ فاتورة ← أدخل بيانات العميل والمبلغ ← اضغط إرسال.", bodyEn: "Invoices → Create → Enter client details and amount → Send.", tags: ["فاتورة", "إرسال"] },
  { id: "inv-2", category: "invoices", icon: "🧾", titleAr: "ما هو ZATCA e-Invoice؟", titleEn: "What is ZATCA e-Invoice?", bodyAr: "فاتورة إلكترونية متوافقة مع هيئة الزكاة والضريبة السعودية، مطلوبة للأعمال في السعودية.", bodyEn: "Electronic invoice compliant with Saudi Tax Authority, required for businesses in KSA.", tags: ["ZATCA", "ضريبة", "السعودية"] },
  // Settlements
  { id: "set-1", category: "settlements", icon: "🏦", titleAr: "متى أستلم تسويتي؟", titleEn: "When do I receive my settlement?", bodyAr: "التسويات تُحوَّل عادةً خلال 3-5 أيام عمل بعد اكتمال المعاملة.", bodyEn: "Settlements are usually transferred within 3-5 business days after transaction completion.", tags: ["تسوية", "موعد"] },
  // Transactions
  { id: "tx-1", category: "transactions", icon: "💳", titleAr: "كيف أصدّر المعاملات؟", titleEn: "How to export transactions?", bodyAr: "المعاملات ← اضغط على أيقونة التصدير في الأعلى ← اختر CSV أو PDF.", bodyEn: "Transactions → Press the export icon at the top → Choose CSV or PDF.", tags: ["تصدير", "export"] },
  { id: "tx-2", category: "transactions", icon: "💳", titleAr: "لماذا فشلت معاملة؟", titleEn: "Why did a transaction fail?", bodyAr: "الأسباب الشائعة: رصيد غير كافٍ، بطاقة منتهية الصلاحية، حد يومي تجاوز، أو مشكلة في الشبكة.", bodyEn: "Common reasons: insufficient funds, expired card, daily limit exceeded, or network issue.", tags: ["فشل", "خطأ", "failed"] },
  // API
  { id: "api-1", category: "api", icon: "🔑", titleAr: "كيف أحصل على API Key؟", titleEn: "How to get an API Key?", bodyAr: "الإعدادات ← مفاتيح API ← إنشاء مفتاح جديد ← انسخ المفتاح واحفظه بأمان.", bodyEn: "Settings → API Keys → Create new key → Copy and save it securely.", tags: ["API", "مفتاح"] },
  // Disputes
  { id: "dis-1", category: "disputes", icon: "⚠️", titleAr: "كيف أرد على نزاع؟", titleEn: "How to respond to a dispute?", bodyAr: "النزاعات ← اختر النزاع ← اكتب ردك مع الأدلة ← أرسل خلال 7 أيام.", bodyEn: "Disputes → Select the dispute → Write your response with evidence → Submit within 7 days.", tags: ["نزاع", "رد"] },
  // Subscriptions
  { id: "sub-1", category: "subscriptions", icon: "🔄", titleAr: "كيف أنشئ اشتراكاً متكرراً؟", titleEn: "How to create a recurring subscription?", bodyAr: "الاشتراكات ← + ← حدد الدورة (شهري/سنوي) والمبلغ ← أضف العميل.", bodyEn: "Subscriptions → + → Set cycle (monthly/annual) and amount → Add client.", tags: ["اشتراك", "متكرر"] },
];

// ─── Hook: البحث ─────────────────────────────────────────────

export function useHelpSearch(isAr: boolean = true) {
  const search = useCallback((query: string) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return HELP_ARTICLES.filter(a =>
      a.titleAr.toLowerCase().includes(q) ||
      a.titleEn.toLowerCase().includes(q) ||
      a.bodyAr.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    );
  }, []);

  const logSearch = useCallback(async (query: string, resultsCount: number, clickedId?: string) => {
    try {
      await uxApi.logHelpSearch(query, resultsCount, clickedId);
    } catch (_) {}
  }, []);

  return { search, logSearch, articles: HELP_ARTICLES };
}

// ─── Tooltip Component ───────────────────────────────────────

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  isAr?: boolean;
}

export function Tooltip({ text, children, isAr = true }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  const show = () => {
    setVisible(true);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    setTimeout(hide, 3000);
  };

  const hide = () => {
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setVisible(false));
  };

  return (
    <View style={{ position: "relative" }}>
      <TouchableOpacity
        onPress={show}
        accessibilityRole="button"
        accessibilityLabel={isAr ? `تلميح: ${text}` : `Hint: ${text}`}
      >
        {children}
      </TouchableOpacity>
      {visible && (
        <Animated.View style={[tt.bubble, { opacity }, isAr ? tt.bubbleRTL : tt.bubbleLTR]}>
          <Text style={tt.text}>{text}</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ─── HelpIcon: أيقونة ؟ صغيرة ────────────────────────────────

export function HelpIcon({ tip, isAr = true }: { tip: string; isAr?: boolean }) {
  return (
    <Tooltip text={tip} isAr={isAr}>
      <View
        style={hi.icon}
        accessibilityRole="button"
        accessibilityLabel={isAr ? `مساعدة: ${tip}` : `Help: ${tip}`}
      >
        <Text style={hi.text}>?</Text>
      </View>
    </Tooltip>
  );
}

// ─── شاشة المساعدة الكاملة ───────────────────────────────────

export default function EmbeddedHelpScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(HELP_ARTICLES.slice(0, 5));
  const [selectedArticle, setSelectedArticle] = useState<typeof HELP_ARTICLES[0] | null>(null);
  const [isAr, setIsAr] = useState(true);
  const { search, logSearch } = useHelpSearch(isAr);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      const res = q.trim() ? search(q) : HELP_ARTICLES.slice(0, 5);
      setResults(res);
      if (q.trim()) await logSearch(q, res.length);
    }, 300);
  };

  const handleArticlePress = async (article: typeof HELP_ARTICLES[0]) => {
    setSelectedArticle(article);
    if (query) await logSearch(query, results.length, article.id);
  };

  const CATEGORIES = [
    { key: "all", labelAr: "الكل", labelEn: "All" },
    { key: "payment_links", labelAr: "روابط الدفع", labelEn: "Payment Links" },
    { key: "invoices", labelAr: "الفواتير", labelEn: "Invoices" },
    { key: "transactions", labelAr: "المعاملات", labelEn: "Transactions" },
    { key: "api", labelAr: "API", labelEn: "API" },
  ];
  const [activeCat, setActiveCat] = useState("all");

  const filtered = activeCat === "all"
    ? results
    : results.filter(a => a.category === activeCat);

  return (
    <SafeAreaView style={hs.container}>
      <View style={hs.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={isAr ? "رجوع" : "Back"}>
          <Text style={hs.back}>{isAr ? "→" : "←"}</Text>
        </TouchableOpacity>
        <Text style={hs.title}>{isAr ? "مركز المساعدة" : "Help Center"}</Text>
        <TouchableOpacity onPress={() => setIsAr(!isAr)} accessibilityRole="button" accessibilityLabel="Switch language">
          <Text style={hs.langToggle}>{isAr ? "EN" : "عر"}</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={hs.searchBox}>
        <Text style={hs.searchIcon}>🔍</Text>
        <TextInput
          style={hs.searchInput}
          value={query}
          onChangeText={handleSearch}
          placeholder={isAr ? "ابحث عن مساعدة..." : "Search for help..."}
          placeholderTextColor="#444"
          textAlign={isAr ? "right" : "left"}
          accessibilityLabel={isAr ? "بحث في المساعدة" : "Search help"}
          accessibilityRole="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch("")} accessibilityLabel={isAr ? "مسح البحث" : "Clear search"}>
            <Text style={hs.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={hs.catScroll} contentContainerStyle={hs.catContent}>
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c.key}
            style={[hs.catBtn, activeCat === c.key && hs.catBtnActive]}
            onPress={() => setActiveCat(c.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeCat === c.key }}
          >
            <Text style={[hs.catText, activeCat === c.key && hs.catTextActive]}>
              {isAr ? c.labelAr : c.labelEn}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results */}
      <ScrollView contentContainerStyle={hs.list}>
        {filtered.length === 0 ? (
          <View style={hs.noResults}>
            <Text style={hs.noResultsIcon}>🤷</Text>
            <Text style={hs.noResultsText}>
              {isAr ? "لا توجد نتائج — جرّب كلمة مختلفة" : "No results — try a different word"}
            </Text>
          </View>
        ) : (
          filtered.map((article, i) => (
            <TouchableOpacity
              key={article.id}
              style={hs.articleCard}
              onPress={() => handleArticlePress(article)}
              accessibilityRole="button"
              accessibilityLabel={isAr ? article.titleAr : article.titleEn}
            >
              <Text style={hs.articleIcon}>{article.icon}</Text>
              <View style={hs.articleText}>
                <Text style={hs.articleTitle}>{isAr ? article.titleAr : article.titleEn}</Text>
                <Text style={hs.articlePreview} numberOfLines={1}>
                  {isAr ? article.bodyAr : article.bodyEn}
                </Text>
              </View>
              <Text style={hs.articleArrow}>{isAr ? "←" : "→"}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Article Modal */}
      <Modal visible={!!selectedArticle} animationType="slide" transparent>
        <View style={hs.modalOverlay}>
          <View style={hs.modalCard}>
            <View style={hs.modalHeader}>
              <Text style={hs.modalIcon}>{selectedArticle?.icon}</Text>
              <Text style={hs.modalTitle}>
                {isAr ? selectedArticle?.titleAr : selectedArticle?.titleEn}
              </Text>
            </View>
            <ScrollView style={hs.modalBody}>
              <Text style={hs.modalBodyText}>
                {isAr ? selectedArticle?.bodyAr : selectedArticle?.bodyEn}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={hs.modalClose}
              onPress={() => setSelectedArticle(null)}
              accessibilityRole="button"
              accessibilityLabel={isAr ? "إغلاق" : "Close"}
            >
              <Text style={hs.modalCloseText}>{isAr ? "إغلاق" : "Close"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const tt = StyleSheet.create({
  bubble:    { position: "absolute", backgroundColor: "#1a1a2e", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#7C3AED", maxWidth: 200, zIndex: 999 },
  bubbleRTL: { right: 0, bottom: 30 },
  bubbleLTR: { left: 0,  bottom: 30 },
  text:      { color: "#ccc", fontSize: 12, lineHeight: 18 },
});

const hi = StyleSheet.create({
  icon: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#1a0a2e", borderWidth: 1, borderColor: "#7C3AED", justifyContent: "center", alignItems: "center" },
  text: { color: "#7C3AED", fontSize: 11, fontWeight: "700" },
});

const hs = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#0a0a0a" },
  header:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#111" },
  back:           { color: "#7C3AED", fontSize: 20 },
  title:          { fontSize: 18, fontWeight: "700", color: "#fff" },
  langToggle:     { color: "#7C3AED", fontSize: 14, fontWeight: "700", borderWidth: 1, borderColor: "#7C3AED", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  searchBox:      { flexDirection: "row", alignItems: "center", backgroundColor: "#111", margin: 16, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: "#1a1a1a", gap: 10 },
  searchIcon:     { fontSize: 16 },
  searchInput:    { flex: 1, color: "#fff", fontSize: 15, paddingVertical: 14 },
  clearBtn:       { color: "#444", fontSize: 16, paddingHorizontal: 4 },
  catScroll:      { maxHeight: 48, marginBottom: 8 },
  catContent:     { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  catBtn:         { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#111", borderRadius: 20, borderWidth: 1, borderColor: "#1a1a1a" },
  catBtnActive:   { backgroundColor: "#1a0a2e", borderColor: "#7C3AED" },
  catText:        { color: "#666", fontSize: 13 },
  catTextActive:  { color: "#7C3AED", fontWeight: "600" },
  list:           { padding: 16, gap: 10, paddingBottom: 40 },
  noResults:      { alignItems: "center", paddingTop: 60 },
  noResultsIcon:  { fontSize: 48, marginBottom: 16 },
  noResultsText:  { color: "#444", fontSize: 14 },
  articleCard:    { flexDirection: "row", alignItems: "center", backgroundColor: "#111", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#1a1a1a", gap: 12 },
  articleIcon:    { fontSize: 24 },
  articleText:    { flex: 1 },
  articleTitle:   { color: "#fff", fontSize: 14, fontWeight: "600", textAlign: "right" },
  articlePreview: { color: "#555", fontSize: 12, textAlign: "right", marginTop: 3 },
  articleArrow:   { color: "#444", fontSize: 16 },
  modalOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modalCard:      { backgroundColor: "#111", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "70%", borderWidth: 1, borderColor: "#1a1a1a" },
  modalHeader:    { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  modalIcon:      { fontSize: 28 },
  modalTitle:     { flex: 1, color: "#fff", fontSize: 16, fontWeight: "700", textAlign: "right" },
  modalBody:      { marginBottom: 20 },
  modalBodyText:  { color: "#ccc", fontSize: 15, lineHeight: 24, textAlign: "right" },
  modalClose:     { backgroundColor: "#7C3AED", borderRadius: 14, padding: 16, alignItems: "center" },
  modalCloseText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});