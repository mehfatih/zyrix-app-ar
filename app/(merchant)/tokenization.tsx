import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { FONT_WEIGHT } from '../../constants/theme';
import { tokenizationApi } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────
interface Token {
  id: string;
  alias: string;
  cardLast4?: string;
  cardBrand?: string;
  cardExpiry?: string;
  cardholderName?: string;
  country?: string;
  currency?: string;
  gatewayCode: string;
  isDefault: boolean;
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

interface Stats {
  total: number;
  active: number;
  expired: number;
  totalUsage: number;
  brandBreakdown: Record<string, number>;
}

// ─── Constants ────────────────────────────────────────────────
const BRAND_ICON: Record<string, string> = {
  VISA: '💳', MASTERCARD: '💳', MADA: '🇸🇦', TROY: '🇹🇷', AMEX: '💎', OTHER: '💳',
};
const BRAND_COLOR: Record<string, string> = {
  VISA: '#1A56DB', MASTERCARD: '#E3374B', MADA: '#006AB2', TROY: '#C0392B', AMEX: '#2E86C1', OTHER: '#6B7280',
};
const GW_LABEL: Record<string, string> = {
  tap: 'Tap Payments', stripe: 'Stripe', iyzico: 'iyzico', payfort: 'PayFort',
};

// ─── Main Screen ──────────────────────────────────────────────
export default function TokenizationScreen() {
  const [tokens, setTokens]     = useState<Token[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab]   = useState<'vault' | 'add'>('vault');
  const [chargeModal, setChargeModal] = useState<{ visible: boolean; token: Token | null }>({ visible: false, token: null });
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeCurrency, setChargeCurrency] = useState('SAR');

  // Add form
  const [form, setForm] = useState({
    alias: '', cardLast4: '', cardBrand: 'VISA', cardExpiry: '',
    cardholderName: '', country: 'SA', currency: 'SAR',
    gatewayToken: '', gatewayCode: 'tap', isDefault: false,
  });

  const load = useCallback(async () => {
    try {
      const [tokensRes, statsRes] = await Promise.all([
        tokenizationApi.list(),
        tokenizationApi.stats(),
      ]);
      setTokens(tokensRes.tokens || []);
      setStats(statsRes || null);
    } catch (_e) {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleSetDefault = async (id: string) => {
    try {
      await tokenizationApi.update(id, { isDefault: true });
      load();
    } catch (_e) {}
  };

  const handleDelete = async (id: string) => {
    try {
      await tokenizationApi.delete(id);
      load();
    } catch (_e) {}
  };

  const handleCharge = async () => {
    if (!chargeModal.token || !chargeAmount) return;
    try {
      await tokenizationApi.charge(chargeModal.token.id, { amount: parseFloat(chargeAmount), currency: chargeCurrency });
      setChargeModal({ visible: false, token: null });
      setChargeAmount('');
      load();
    } catch (_e) {}
  };

  const handleAddToken = async () => {
    if (!form.alias || !form.gatewayToken || !form.gatewayCode) return;
    try {
      await tokenizationApi.create(form);
      setForm({ alias: '', cardLast4: '', cardBrand: 'VISA', cardExpiry: '', cardholderName: '', country: 'SA', currency: 'SAR', gatewayToken: '', gatewayCode: 'tap', isDefault: false });
      setActiveTab('vault');
      load();
    } catch (_e) {}
  };

  // ─── Render Token Card ──────────────────────────────────────
  const renderToken = (token: Token) => (
    <View key={token.id} style={[s.card, token.isDefault && s.cardDefault]}>
      <View style={s.cardTop}>
        <View style={[s.brandBadge, { backgroundColor: BRAND_COLOR[token.cardBrand || 'OTHER'] + '22' }]}>
          <Text style={s.brandIcon}>{BRAND_ICON[token.cardBrand || 'OTHER']}</Text>
          <Text style={[s.brandLabel, { color: BRAND_COLOR[token.cardBrand || 'OTHER'] }]}>{token.cardBrand || 'CARD'}</Text>
        </View>
        {token.isDefault && (
          <View style={s.defaultBadge}><Text style={s.defaultBadgeText}>⭐ افتراضي</Text></View>
        )}
        {!token.isActive && (
          <View style={s.inactiveBadge}><Text style={s.inactiveBadgeText}>غير نشط</Text></View>
        )}
      </View>

      <Text style={s.alias}>{token.alias}</Text>

      <View style={s.cardDetails}>
        {token.cardLast4 && (
          <Text style={s.cardNum}>•••• •••• •••• {token.cardLast4}</Text>
        )}
        {token.cardholderName && <Text style={s.cardHolder}>{token.cardholderName}</Text>}
        <View style={s.cardMeta}>
          {token.cardExpiry && <Text style={s.metaText}>انتهاء: {token.cardExpiry}</Text>}
          <Text style={s.metaText}>{GW_LABEL[token.gatewayCode] || token.gatewayCode}</Text>
          <Text style={s.metaText}>استخدام: {token.usageCount}x</Text>
        </View>
      </View>

      {token.expiresAt && new Date(token.expiresAt) < new Date() && (
        <View style={s.expiredBanner}>
          <Text style={s.expiredText}>⚠️ منتهي الصلاحية</Text>
        </View>
      )}

      <View style={s.tokenActions}>
        <TouchableOpacity
          style={[s.actionBtn, s.chargeBtn]}
          onPress={() => { setChargeModal({ visible: true, token }); setChargeCurrency(token.currency || 'SAR'); }}
        >
          <Text style={s.chargeBtnText}>⚡ تحصيل</Text>
        </TouchableOpacity>
        {!token.isDefault && (
          <TouchableOpacity style={[s.actionBtn, s.defaultBtn]} onPress={() => handleSetDefault(token.id)}>
            <Text style={s.defaultBtnText}>⭐ افتراضي</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s.actionBtn, s.deleteBtn]} onPress={() => handleDelete(token.id)}>
          <Text style={s.deleteBtnText}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={s.title}>Token Vault</Text>
          <Text style={s.subtitle}>One-Click & Tokenization</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['vault', 'add'] as const).map(tab => (
          <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'vault' ? '🔐 الخزينة' : '➕ إضافة Token'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'vault' ? (
          <>
            {/* Stats */}
            {stats && (
              <View style={s.statsRow}>
                <View style={s.statBox}>
                  <Text style={s.statVal}>{stats.total}</Text>
                  <Text style={s.statLabel}>إجمالي</Text>
                </View>
                <View style={s.statBox}>
                  <Text style={[s.statVal, { color: COLORS.success }]}>{stats.active}</Text>
                  <Text style={s.statLabel}>نشط</Text>
                </View>
                <View style={s.statBox}>
                  <Text style={[s.statVal, { color: COLORS.warning }]}>{stats.expired}</Text>
                  <Text style={s.statLabel}>منتهي</Text>
                </View>
                <View style={s.statBox}>
                  <Text style={[s.statVal, { color: COLORS.primary }]}>{stats.totalUsage}</Text>
                  <Text style={s.statLabel}>استخدام</Text>
                </View>
              </View>
            )}

            {/* SCA Compliance Badge */}
            <View style={s.scaBadge}>
              <Text style={s.scaIcon}>🔒</Text>
              <View>
                <Text style={s.scaTitle}>SCA Compliant Vault</Text>
                <Text style={s.scaDesc}>بيانات محمية — لا تُخزَّن بيانات البطاقة الكاملة أبداً</Text>
              </View>
            </View>

            {/* Tokens */}
            {tokens.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>🔐</Text>
                <Text style={s.emptyTitle}>لا توجد tokens</Text>
                <Text style={s.emptyDesc}>أضف أول token لتفعيل الدفع بضغطة واحدة</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => setActiveTab('add')}>
                  <Text style={s.emptyBtnText}>➕ إضافة Token</Text>
                </TouchableOpacity>
              </View>
            ) : (
              tokens.map(renderToken)
            )}
          </>
        ) : (
          /* Add Token Form */
          <View style={s.form}>
            <Text style={s.formTitle}>🆕 إضافة Token جديد</Text>
            <Text style={s.formNote}>يتم حفظ gateway token فقط — لا تُخزَّن بيانات البطاقة الكاملة</Text>

            {[
              { label: 'اسم مميز (Alias) *', key: 'alias', placeholder: 'مثل: بطاقتي الرئيسية' },
              { label: 'آخر 4 أرقام', key: 'cardLast4', placeholder: '4242' },
              { label: 'تاريخ الانتهاء', key: 'cardExpiry', placeholder: '12/26' },
              { label: 'اسم حامل البطاقة', key: 'cardholderName', placeholder: 'Ahmed Al-Rashid' },
              { label: 'Gateway Token *', key: 'gatewayToken', placeholder: 'tok_live_xxxxx' },
            ].map(({ label, key, placeholder }) => (
              <View key={key} style={s.field}>
                <Text style={s.fieldLabel}>{label}</Text>
                <TextInput
                  style={s.input}
                  placeholder={placeholder}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={(form as any)[key]}
                  onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
                />
              </View>
            ))}

            {/* Card Brand */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>نوع البطاقة</Text>
              <View style={s.optionRow}>
                {['VISA', 'MASTERCARD', 'MADA', 'TROY', 'AMEX'].map(brand => (
                  <TouchableOpacity
                    key={brand}
                    style={[s.optionChip, form.cardBrand === brand && s.optionChipActive]}
                    onPress={() => setForm(f => ({ ...f, cardBrand: brand }))}
                  >
                    <Text style={[s.optionChipText, form.cardBrand === brand && s.optionChipTextActive]}>{brand}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Gateway */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>Gateway *</Text>
              <View style={s.optionRow}>
                {['tap', 'stripe', 'iyzico', 'payfort'].map(gw => (
                  <TouchableOpacity
                    key={gw}
                    style={[s.optionChip, form.gatewayCode === gw && s.optionChipActive]}
                    onPress={() => setForm(f => ({ ...f, gatewayCode: gw }))}
                  >
                    <Text style={[s.optionChipText, form.gatewayCode === gw && s.optionChipTextActive]}>{GW_LABEL[gw]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Country & Currency */}
            <View style={s.row2}>
              <View style={[s.field, { flex: 1, marginLeft: 8 }]}>
                <Text style={s.fieldLabel}>الدولة</Text>
                <View style={s.optionRowSmall}>
                  {['SA', 'AE', 'TR', 'KW', 'QA'].map(c => (
                    <TouchableOpacity key={c} style={[s.optionChipSm, form.country === c && s.optionChipActive]} onPress={() => setForm(f => ({ ...f, country: c }))}>
                      <Text style={[s.optionChipTextSm, form.country === c && s.optionChipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.fieldLabel}>العملة</Text>
                <View style={s.optionRowSmall}>
                  {['SAR', 'AED', 'TRY', 'KWD', 'USD'].map(c => (
                    <TouchableOpacity key={c} style={[s.optionChipSm, form.currency === c && s.optionChipActive]} onPress={() => setForm(f => ({ ...f, currency: c }))}>
                      <Text style={[s.optionChipTextSm, form.currency === c && s.optionChipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Default toggle */}
            <TouchableOpacity style={s.toggleRow} onPress={() => setForm(f => ({ ...f, isDefault: !f.isDefault }))}>
              <View style={[s.toggle, form.isDefault && s.toggleOn]}>
                <View style={[s.toggleThumb, form.isDefault && s.toggleThumbOn]} />
              </View>
              <Text style={s.toggleLabel}>تعيين كـ Token افتراضي</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.submitBtn, (!form.alias || !form.gatewayToken) && s.submitBtnDisabled]}
              onPress={handleAddToken}
              disabled={!form.alias || !form.gatewayToken}
            >
              <Text style={s.submitBtnText}>✅ حفظ Token</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Charge Modal */}
      <Modal visible={chargeModal.visible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>⚡ تحصيل سريع</Text>
            {chargeModal.token && (
              <Text style={s.modalSubtitle}>{chargeModal.token.alias} — •••• {chargeModal.token.cardLast4 || '****'}</Text>
            )}
            <TextInput
              style={s.modalInput}
              placeholder="المبلغ"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="numeric"
              value={chargeAmount}
              onChangeText={setChargeAmount}
            />
            <View style={s.currencyRow}>
              {['SAR', 'AED', 'TRY', 'USD'].map(c => (
                <TouchableOpacity key={c} style={[s.currencyChip, chargeCurrency === c && s.currencyChipActive]} onPress={() => setChargeCurrency(c)}>
                  <Text style={[s.currencyChipText, chargeCurrency === c && s.currencyChipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setChargeModal({ visible: false, token: null })}>
                <Text style={s.modalCancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalConfirm, !chargeAmount && s.submitBtnDisabled]} onPress={handleCharge} disabled={!chargeAmount}>
                <Text style={s.modalConfirmText}>⚡ تحصيل</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const BG = '#0A1228';
const CARD_BG = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.08)';

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BG },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: CARD_BG, justifyContent: 'center', alignItems: 'center' },
  backIcon:    { color: '#fff', fontSize: 22, lineHeight: 26 },
  title:       { color: '#fff', fontSize: 18, fontWeight: FONT_WEIGHT.bold },
  subtitle:    { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  tabs:        { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, backgroundColor: CARD_BG, borderRadius: 12, padding: 4 },
  tab:         { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive:   { backgroundColor: COLORS.primary },
  tabText:     { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: FONT_WEIGHT.medium },
  tabTextActive: { color: '#fff', fontWeight: FONT_WEIGHT.semibold },
  scroll:      { flex: 1 },
  scrollContent: { padding: 20 },
  statsRow:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox:     { flex: 1, backgroundColor: CARD_BG, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  statVal:     { color: '#fff', fontSize: 20, fontWeight: FONT_WEIGHT.bold },
  statLabel:   { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  scaBadge:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', borderRadius: 12, padding: 14, marginBottom: 16 },
  scaIcon:     { fontSize: 24 },
  scaTitle:    { color: '#10B981', fontSize: 14, fontWeight: FONT_WEIGHT.semibold },
  scaDesc:     { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  card:        { backgroundColor: CARD_BG, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  cardDefault: { borderColor: 'rgba(251,191,36,0.5)' },
  cardTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  brandBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  brandIcon:   { fontSize: 16 },
  brandLabel:  { fontSize: 12, fontWeight: FONT_WEIGHT.bold },
  defaultBadge:  { backgroundColor: 'rgba(251,191,36,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  defaultBadgeText: { color: '#FBBF24', fontSize: 11, fontWeight: FONT_WEIGHT.semibold },
  inactiveBadge: { backgroundColor: 'rgba(107,114,128,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  inactiveBadgeText: { color: '#9CA3AF', fontSize: 11 },
  alias:       { color: '#fff', fontSize: 16, fontWeight: FONT_WEIGHT.semibold, marginBottom: 8 },
  cardDetails: { gap: 4 },
  cardNum:     { color: 'rgba(255,255,255,0.7)', fontSize: 14, letterSpacing: 2, fontFamily: 'monospace' },
  cardHolder:  { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  cardMeta:    { flexDirection: 'row', gap: 12, marginTop: 4 },
  metaText:    { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  expiredBanner: { marginTop: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: 8 },
  expiredText: { color: '#EF4444', fontSize: 12, textAlign: 'center' },
  tokenActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  actionBtn:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  chargeBtn:   { backgroundColor: 'rgba(59,130,246,0.2)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.4)' },
  chargeBtnText: { color: '#93C5FD', fontSize: 13, fontWeight: FONT_WEIGHT.semibold },
  defaultBtn:  { backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  defaultBtnText: { color: '#FBBF24', fontSize: 13 },
  deleteBtn:   { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  deleteBtnText: { color: '#EF4444', fontSize: 13 },
  empty:       { alignItems: 'center', paddingVertical: 48 },
  emptyIcon:   { fontSize: 48, marginBottom: 16 },
  emptyTitle:  { color: '#fff', fontSize: 18, fontWeight: FONT_WEIGHT.semibold, marginBottom: 8 },
  emptyDesc:   { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  emptyBtn:    { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: FONT_WEIGHT.semibold },
  form:        { gap: 16 },
  formTitle:   { color: '#fff', fontSize: 18, fontWeight: FONT_WEIGHT.bold },
  formNote:    { color: 'rgba(16,185,129,0.8)', fontSize: 13, lineHeight: 18 },
  field:       { gap: 8 },
  fieldLabel:  { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: FONT_WEIGHT.medium },
  input:       { backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 14 },
  optionRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionRowSmall: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  optionChip:  { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER },
  optionChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionChipText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  optionChipTextActive: { color: '#fff', fontWeight: FONT_WEIGHT.semibold },
  optionChipSm: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 16, backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER },
  optionChipTextSm: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  row2:        { flexDirection: 'row', gap: 12 },
  toggleRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggle:      { width: 44, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn:    { backgroundColor: COLORS.primary },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.5)' },
  toggleThumbOn: { backgroundColor: '#fff', transform: [{ translateX: 20 }] },
  toggleLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  submitBtn:   { backgroundColor: COLORS.primary, paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: FONT_WEIGHT.bold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox:    { backgroundColor: '#0F1A35', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  modalTitle:  { color: '#fff', fontSize: 18, fontWeight: FONT_WEIGHT.bold, textAlign: 'center' },
  modalSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' },
  modalInput:  { backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 16, textAlign: 'center' },
  currencyRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  currencyChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER },
  currencyChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  currencyChipText: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  currencyChipTextActive: { color: '#fff', fontWeight: FONT_WEIGHT.semibold },
  modalBtns:   { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancel: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: CARD_BG, alignItems: 'center' },
  modalCancelText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: FONT_WEIGHT.medium },
  modalConfirm: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontSize: 14, fontWeight: FONT_WEIGHT.bold },
});