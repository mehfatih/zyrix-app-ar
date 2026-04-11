import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, I18nManager, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { FONT_WEIGHT } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';
import InnerHeader from '../../components/InnerHeader';
import Toast from '../../components/Toast';
import { binApi } from '../../services/api';

const isRTL = I18nManager.isRTL;

// ─── Demo Data ────────────────────────────────────────────────
const DEMO_STATS = {
  period: '30d', total: 142,
  brandBreakdown:   { VISA: 58, MASTERCARD: 34, MADA: 28, TROY: 12, AMEX: 6, OTHER: 4 },
  typeBreakdown:    { CREDIT: 72, DEBIT: 54, PREPAID: 16 },
  countryBreakdown: { 'Saudi Arabia': 56, 'Turkey': 38, 'UAE': 28, 'Kuwait': 12, 'Qatar': 8 },
  gatewayBreakdown: { tap: 84, iyzico: 38, stripe: 20 },
};

const DEMO_HISTORY = [
  { id: 'b1', bin: '446404', cardBrand: 'MADA',       cardType: 'DEBIT',  bankName: 'Al Rajhi Bank', bankCountry: 'Saudi Arabia', gatewayHint: 'tap',    createdAt: new Date(Date.now() - 1*3600000).toISOString() },
  { id: 'b2', bin: '402365', cardBrand: 'VISA',       cardType: 'CREDIT', bankName: 'Garanti BBVA',  bankCountry: 'Turkey',       gatewayHint: 'iyzico', createdAt: new Date(Date.now() - 2*3600000).toISOString() },
  { id: 'b3', bin: '414720', cardBrand: 'VISA',       cardType: 'CREDIT', bankName: 'Emirates NBD',  bankCountry: 'UAE',          gatewayHint: 'stripe', createdAt: new Date(Date.now() - 5*3600000).toISOString() },
  { id: 'b4', bin: '539983', cardBrand: 'MASTERCARD', cardType: 'CREDIT', bankName: 'NBK',           bankCountry: 'Kuwait',       gatewayHint: 'tap',    createdAt: new Date(Date.now() - 8*3600000).toISOString() },
];

const BRAND_COLOR: Record<string, string> = {
  VISA: '#1A1F71', MASTERCARD: '#EB001B', MADA: '#00A651',
  TROY: '#E30613', MEEZA: '#00529B', AMEX: '#007BC1', OTHER: '#666',
};

const BRAND_FLAG: Record<string, string> = {
  'Saudi Arabia': '🇸🇦', 'UAE': '🇦🇪', 'Turkey': '🇹🇷',
  'Kuwait': '🇰🇼', 'Qatar': '🇶🇦', 'Egypt': '🇪🇬', 'Iraq': '🇮🇶',
};

// ─── Component ────────────────────────────────────────────────
export default function BinIntelligenceScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [tab, setTab]           = useState<'lookup' | 'stats' | 'history'>('lookup');
  const [binInput, setBinInput] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [stats, setStats]       = useState<any>(null);
  const [history, setHistory]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast]       = useState<{ msg: string; type?: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [stRes, hiRes] = await Promise.all([
        binApi.getStats(30),
        binApi.getHistory(20),
      ]);
      setStats(stRes?.data   || DEMO_STATS);
      setHistory(hiRes?.data?.lookups || DEMO_HISTORY);
    } catch {
      setStats(DEMO_STATS);
      setHistory(DEMO_HISTORY);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleLookup = async () => {
    const clean = binInput.replace(/\D/g, '').slice(0, 6);
    if (clean.length < 6) { showToast('أدخل 6 أرقام على الأقل', 'error'); return; }
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const res = await binApi.lookup(clean);
      setLookupResult(res?.data);
    } catch {
      // demo fallback
      const demo: Record<string, any> = {
        '446404': { bin: '446404', cardBrand: 'MADA', cardType: 'DEBIT',  bankName: 'Al Rajhi Bank', bankCountry: 'Saudi Arabia', bankCountryCode: 'SA', currency: 'SAR', recommendedGateway: 'tap',    successRateHint: 95.0, source: 'local' },
        '402365': { bin: '402365', cardBrand: 'VISA', cardType: 'CREDIT', bankName: 'Garanti BBVA',  bankCountry: 'Turkey',       bankCountryCode: 'TR', currency: 'TRY', recommendedGateway: 'iyzico', successRateHint: 92.5, source: 'local' },
      };
      setLookupResult(demo[clean] || { bin: clean, cardBrand: clean.startsWith('4') ? 'VISA' : 'MASTERCARD', cardType: 'UNKNOWN', bankName: null, bankCountry: null, recommendedGateway: 'stripe', successRateHint: 91.0, source: 'inferred' });
    } finally {
      setLookupLoading(false);
    }
  };

  const tabBarHeight = 92;

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <InnerHeader title="BIN Intelligence" accentColor="#8B5CF6" onBack={() => router.back()} />
        <View style={s.center}><ActivityIndicator size="large" color="#8B5CF6" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <InnerHeader title="BIN Intelligence" accentColor="#8B5CF6" onBack={() => router.back()} />

      {/* Tabs */}
      <View style={s.tabs}>
        {(['lookup', 'stats', 'history'] as const).map((t_) => (
          <TouchableOpacity key={t_} style={[s.tabBtn, tab === t_ && s.tabActive]} onPress={() => setTab(t_)}>
            <Text style={[s.tabLabel, tab === t_ && s.tabLabelActive]}>
              {t_ === 'lookup' ? '🔍 بحث' : t_ === 'stats' ? '📊 إحصائيات' : '🕐 السجل'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#8B5CF6" />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Lookup Tab ── */}
          {tab === 'lookup' && (
            <>
              <View style={s.card}>
                <Text style={s.fieldLabel}>🔍 بحث بأول 6 أرقام من البطاقة</Text>
                <View style={s.inputRow}>
                  <TextInput
                    style={s.binInput}
                    placeholder="مثال: 446404"
                    placeholderTextColor="#555"
                    value={binInput}
                    onChangeText={v => setBinInput(v.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <TouchableOpacity
                    style={[s.lookupBtn, lookupLoading && { opacity: 0.6 }]}
                    onPress={handleLookup}
                    disabled={lookupLoading}
                  >
                    {lookupLoading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={s.lookupBtnText}>بحث</Text>
                    }
                  </TouchableOpacity>
                </View>
                <Text style={s.hintText}>أدخل الأرقام الستة الأولى لمعرفة البنك، نوع البطاقة، وأفضل بوابة دفع</Text>
              </View>

              {lookupResult && (
                <View style={s.resultCard}>
                  <View style={s.resultHeader}>
                    <View style={[s.brandBadge, { backgroundColor: BRAND_COLOR[lookupResult.cardBrand] || '#666' }]}>
                      <Text style={s.brandText}>{lookupResult.cardBrand}</Text>
                    </View>
                    <View>
                      <Text style={s.resultBin}>BIN: {lookupResult.bin}</Text>
                      <Text style={s.resultSource}>مصدر: {lookupResult.source}</Text>
                    </View>
                  </View>

                  <View style={s.resultGrid}>
                    <View style={s.resultItem}>
                      <Text style={s.resultItemLabel}>نوع البطاقة</Text>
                      <Text style={s.resultItemVal}>{lookupResult.cardType || '—'}</Text>
                    </View>
                    <View style={s.resultItem}>
                      <Text style={s.resultItemLabel}>البنك</Text>
                      <Text style={s.resultItemVal}>{lookupResult.bankName || '—'}</Text>
                    </View>
                    <View style={s.resultItem}>
                      <Text style={s.resultItemLabel}>الدولة</Text>
                      <Text style={s.resultItemVal}>
                        {lookupResult.bankCountry ? `${BRAND_FLAG[lookupResult.bankCountry] || '🌍'} ${lookupResult.bankCountry}` : '—'}
                      </Text>
                    </View>
                    <View style={s.resultItem}>
                      <Text style={s.resultItemLabel}>العملة</Text>
                      <Text style={s.resultItemVal}>{lookupResult.currency || '—'}</Text>
                    </View>
                  </View>

                  {lookupResult.recommendedGateway && (
                    <View style={s.gwRec}>
                      <Text style={s.gwRecLabel}>✅ البوابة المُوصى بها</Text>
                      <View style={s.gwRecRow}>
                        <Text style={s.gwRecName}>{lookupResult.recommendedGateway}</Text>
                        {lookupResult.successRateHint && (
                          <Text style={s.gwRecRate}>{lookupResult.successRateHint}% نجاح</Text>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Quick BINs */}
              <Text style={s.sectionTitle}>🎯 بحث سريع</Text>
              <View style={s.quickGrid}>
                {[
                  { bin: '446404', label: 'مدى الراجحي' },
                  { bin: '402365', label: 'Garanti TR' },
                  { bin: '414720', label: 'Emirates NBD' },
                  { bin: '539983', label: 'NBK Kuwait' },
                  { bin: '453978', label: 'QNB Qatar' },
                  { bin: '527627', label: 'Akbank TR' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.bin}
                    style={s.quickBtn}
                    onPress={() => { setBinInput(item.bin); }}
                  >
                    <Text style={s.quickBin}>{item.bin}</Text>
                    <Text style={s.quickLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* ── Stats Tab ── */}
          {tab === 'stats' && stats && (
            <>
              <View style={s.kpiCard}>
                <Text style={s.kpiVal}>{stats.total}</Text>
                <Text style={s.kpiLabel}>إجمالي عمليات البحث ({stats.period})</Text>
              </View>

              <Text style={s.sectionTitle}>🏷️ توزيع العلامات التجارية</Text>
              <View style={s.card}>
                {Object.entries(stats.brandBreakdown).sort((a: any, b: any) => b[1] - a[1]).map(([brand, count]: any) => (
                  <View key={brand} style={s.breakdownRow}>
                    <View style={[s.brandDot, { backgroundColor: BRAND_COLOR[brand] || '#666' }]} />
                    <Text style={s.breakdownLabel}>{brand}</Text>
                    <View style={s.breakdownBarWrap}>
                      <View style={[s.breakdownBar, { width: `${(count / stats.total) * 100}%` as any, backgroundColor: BRAND_COLOR[brand] || '#666' }]} />
                    </View>
                    <Text style={s.breakdownVal}>{count}</Text>
                  </View>
                ))}
              </View>

              <Text style={s.sectionTitle}>🌍 توزيع الدول</Text>
              <View style={s.card}>
                {Object.entries(stats.countryBreakdown).sort((a: any, b: any) => b[1] - a[1]).map(([country, count]: any) => (
                  <View key={country} style={s.breakdownRow}>
                    <Text style={s.flagText}>{BRAND_FLAG[country] || '🌍'}</Text>
                    <Text style={s.breakdownLabel}>{country}</Text>
                    <View style={s.breakdownBarWrap}>
                      <View style={[s.breakdownBar, { width: `${(count / stats.total) * 100}%` as any, backgroundColor: '#8B5CF6' }]} />
                    </View>
                    <Text style={s.breakdownVal}>{count}</Text>
                  </View>
                ))}
              </View>

              <Text style={s.sectionTitle}>🏦 توزيع البوابات المُوصى بها</Text>
              <View style={s.card}>
                {Object.entries(stats.gatewayBreakdown).sort((a: any, b: any) => b[1] - a[1]).map(([gw, count]: any) => (
                  <View key={gw} style={s.breakdownRow}>
                    <Text style={s.breakdownLabel}>{gw}</Text>
                    <View style={s.breakdownBarWrap}>
                      <View style={[s.breakdownBar, { width: `${(count / stats.total) * 100}%` as any, backgroundColor: COLORS.primary }]} />
                    </View>
                    <Text style={s.breakdownVal}>{count}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ── History Tab ── */}
          {tab === 'history' && (
            <>
              <Text style={s.sectionTitle}>آخر عمليات البحث ({history.length})</Text>
              {history.map((h) => (
                <View key={h.id} style={s.historyCard}>
                  <View style={s.historyRow}>
                    <View style={[s.brandDot, { backgroundColor: BRAND_COLOR[h.cardBrand] || '#666', width: 10, height: 10 }]} />
                    <View style={s.historyInfo}>
                      <Text style={s.historyBin}>{h.bin} — {h.cardBrand} {h.cardType}</Text>
                      <Text style={s.historyBank}>{h.bankName || '—'} · {BRAND_FLAG[h.bankCountry] || ''} {h.bankCountry || '—'}</Text>
                    </View>
                    <View style={s.historyRight}>
                      {h.gatewayHint && <Text style={s.historyGw}>{h.gatewayHint}</Text>}
                      <Text style={s.historyTime}>{new Date(h.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: COLORS.background },
  center:            { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs:              { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: COLORS.card, marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 4 },
  tabBtn:            { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive:         { backgroundColor: '#8B5CF622' },
  tabLabel:          { fontSize: 12, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },
  tabLabelActive:    { color: '#8B5CF6', fontWeight: FONT_WEIGHT.semibold },
  sectionTitle:      { fontSize: 15, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text, marginBottom: 12, marginTop: 4 },
  card:              { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 12 },
  fieldLabel:        { fontSize: 13, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text, marginBottom: 10 },
  inputRow:          { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginBottom: 8 },
  binInput:          { flex: 1, backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, letterSpacing: 4, textAlign: 'center', fontWeight: FONT_WEIGHT.bold },
  lookupBtn:         { backgroundColor: '#8B5CF6', paddingHorizontal: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  lookupBtnText:     { color: '#fff', fontSize: 14, fontWeight: FONT_WEIGHT.semibold },
  hintText:          { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
  resultCard:        { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#8B5CF640' },
  resultHeader:      { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  brandBadge:        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  brandText:         { color: '#fff', fontSize: 13, fontWeight: FONT_WEIGHT.bold },
  resultBin:         { fontSize: 16, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  resultSource:      { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  resultGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  resultItem:        { width: '47%', backgroundColor: COLORS.background, borderRadius: 10, padding: 10 },
  resultItemLabel:   { fontSize: 10, color: COLORS.textSecondary, marginBottom: 4 },
  resultItemVal:     { fontSize: 13, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  gwRec:             { backgroundColor: COLORS.success + '15', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.success + '40' },
  gwRecLabel:        { fontSize: 12, color: COLORS.success, fontWeight: FONT_WEIGHT.semibold, marginBottom: 6 },
  gwRecRow:          { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' },
  gwRecName:         { fontSize: 16, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  gwRecRate:         { fontSize: 14, color: COLORS.success, fontWeight: FONT_WEIGHT.semibold },
  quickGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  quickBtn:          { width: '30%', backgroundColor: COLORS.card, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  quickBin:          { fontSize: 13, fontWeight: FONT_WEIGHT.bold, color: '#8B5CF6', letterSpacing: 1 },
  quickLabel:        { fontSize: 10, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  kpiCard:           { backgroundColor: COLORS.card, borderRadius: 14, padding: 20, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#8B5CF640' },
  kpiVal:            { fontSize: 36, fontWeight: FONT_WEIGHT.bold, color: '#8B5CF6' },
  kpiLabel:          { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  breakdownRow:      { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  brandDot:          { width: 8, height: 8, borderRadius: 4 },
  flagText:          { fontSize: 16 },
  breakdownLabel:    { width: 100, fontSize: 12, color: COLORS.text },
  breakdownBarWrap:  { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  breakdownBar:      { height: 6, borderRadius: 3 },
  breakdownVal:      { width: 28, fontSize: 12, color: COLORS.textSecondary, textAlign: 'right' },
  historyCard:       { backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 8 },
  historyRow:        { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 },
  historyInfo:       { flex: 1 },
  historyBin:        { fontSize: 13, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  historyBank:       { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  historyRight:      { alignItems: isRTL ? 'flex-start' : 'flex-end' },
  historyGw:         { fontSize: 12, color: '#8B5CF6', fontWeight: FONT_WEIGHT.semibold },
  historyTime:       { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
});