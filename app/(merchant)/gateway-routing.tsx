import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, I18nManager, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { FONT_WEIGHT } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';
import InnerHeader from '../../components/InnerHeader';
import Toast from '../../components/Toast';
import { gatewayRoutingApi } from '../../services/api';

const isRTL = I18nManager.isRTL;

// ─── Demo Data ────────────────────────────────────────────────
const DEMO_GATEWAYS = [
  { id: 'gw1', name: 'Stripe', code: 'stripe', status: 'ACTIVE', isDefault: true,  successRate: 97.5, avgResponseMs: 320, totalTransactions: 1840, costPercent: 2.9,  costFixed: 0.30, supportedCountries: ['US','GB','AE','SA'], supportedCurrencies: ['USD','EUR','SAR','AED'], supportedMethods: ['CREDIT_CARD','DEBIT_CARD','APPLE_PAY'], _count: { events: 1840 } },
  { id: 'gw2', name: 'Tap Payments', code: 'tap', status: 'ACTIVE', isDefault: false, successRate: 94.2, avgResponseMs: 410, totalTransactions: 960,  costPercent: 2.5,  costFixed: 0.00, supportedCountries: ['SA','AE','KW','QA'], supportedCurrencies: ['SAR','AED','KWD','QAR'], supportedMethods: ['CREDIT_CARD','MADA','STC_PAY'], _count: { events: 960 } },
  { id: 'gw3', name: 'iyzico', code: 'iyzico', status: 'ACTIVE', isDefault: false, successRate: 92.8, avgResponseMs: 380, totalTransactions: 540,  costPercent: 2.35, costFixed: 0.00, supportedCountries: ['TR'], supportedCurrencies: ['TRY','USD','EUR'], supportedMethods: ['CREDIT_CARD','DEBIT_CARD'], _count: { events: 540 } },
  { id: 'gw4', name: 'PayTR', code: 'paytr', status: 'DEGRADED', isDefault: false, successRate: 88.1, avgResponseMs: 520, totalTransactions: 210,  costPercent: 1.99, costFixed: 0.00, supportedCountries: ['TR'], supportedCurrencies: ['TRY'], supportedMethods: ['CREDIT_CARD','BANK_TRANSFER'], _count: { events: 210 } },
];

const DEMO_CONFIG = { mode: 'SUCCESS_RATE', fallbackEnabled: true, maxRetries: 2 };

const DEMO_ANALYTICS = DEMO_GATEWAYS.map(g => ({
  id: g.id, name: g.name, code: g.code, status: g.status, isDefault: g.isDefault,
  successRate: g.successRate, totalEvents: g._count.events,
  successCount: Math.round(g._count.events * g.successRate / 100),
  failureCount: Math.round(g._count.events * (100 - g.successRate) / 100),
  avgResponseMs: g.avgResponseMs, volume: Math.round(g.totalTransactions * 450 * g.successRate / 100),
  costPercent: g.costPercent, costFixed: g.costFixed,
}));

// ─── Helpers ──────────────────────────────────────────────────
const statusColor = (s: string) =>
  s === 'ACTIVE' ? COLORS.success : s === 'DEGRADED' ? COLORS.warning : COLORS.danger;

const modeLabel: Record<string, string> = {
  SUCCESS_RATE:  'معدل النجاح',
  COST_OPTIMIZED:'أقل تكلفة',
  LOAD_BALANCED: 'توازن الحمل',
  COUNTRY_BASED: 'حسب الدولة',
};

// ─── Component ────────────────────────────────────────────────
export default function GatewayRoutingScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [tab, setTab] = useState<'gateways' | 'analytics' | 'config'>('gateways');
  const [gateways, setGateways] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [config, setConfig]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast]   = useState<{ msg: string; type?: 'success' | 'error' } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGateway, setEditingGateway] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', code: '', costPercent: '', priority: '' });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [gwRes, cfgRes, anRes] = await Promise.all([
        gatewayRoutingApi.listGateways(),
        gatewayRoutingApi.getConfig(),
        gatewayRoutingApi.getAnalytics(30),
      ]);
      setGateways(gwRes?.data?.gateways || DEMO_GATEWAYS);
      setConfig(cfgRes?.data?.config   || DEMO_CONFIG);
      setAnalytics(anRes?.data?.analytics || DEMO_ANALYTICS);
    } catch {
      setGateways(DEMO_GATEWAYS);
      setConfig(DEMO_CONFIG);
      setAnalytics(DEMO_ANALYTICS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingGateway(null);
    setForm({ name: '', code: '', costPercent: '', priority: '' });
    setModalVisible(true);
  };

  const openEdit = (gw: any) => {
    setEditingGateway(gw);
    setForm({ name: gw.name, code: gw.code, costPercent: String(gw.costPercent), priority: String(gw.priority ?? 0) });
    setModalVisible(true);
  };

  const saveGateway = async () => {
    if (!form.name || !form.code) { showToast('الاسم والكود مطلوبان', 'error'); return; }
    try {
      if (editingGateway) {
        await gatewayRoutingApi.updateGateway(editingGateway.id, {
          name: form.name, costPercent: parseFloat(form.costPercent) || 0, priority: parseInt(form.priority) || 0,
        });
        showToast('تم تحديث البوابة');
      } else {
        await gatewayRoutingApi.createGateway({
          name: form.name, code: form.code,
          costPercent: parseFloat(form.costPercent) || 0, priority: parseInt(form.priority) || 0,
        });
        showToast('تمت إضافة البوابة');
      }
      setModalVisible(false);
      load(true);
    } catch { showToast('فشلت العملية', 'error'); }
  };

  const toggleDefault = async (gw: any) => {
    try {
      await gatewayRoutingApi.updateGateway(gw.id, { isDefault: true });
      showToast(`${gw.name} أصبحت البوابة الافتراضية`);
      load(true);
    } catch { showToast('فشل التحديث', 'error'); }
  };

  const saveConfig = async (patch: any) => {
    try {
      const res = await gatewayRoutingApi.updateConfig(patch);
      setConfig(res?.data?.config || { ...config, ...patch });
      showToast('تم حفظ الإعدادات');
    } catch { showToast('فشل الحفظ', 'error'); }
  };

  const tabBarHeight = 92;

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <InnerHeader title="توجيه البوابات" accentColor={COLORS.primary} onBack={() => router.back()} />
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <InnerHeader
        title="توجيه البوابات"
        accentColor={COLORS.primary}
        onBack={() => router.back()}
        rightIcon="＋"
        onRightPress={tab === 'gateways' ? openAdd : undefined}
      />

      {/* Tabs */}
      <View style={s.tabs}>
        {(['gateways', 'analytics', 'config'] as const).map((t_) => (
          <TouchableOpacity key={t_} style={[s.tabBtn, tab === t_ && s.tabActive]} onPress={() => setTab(t_)}>
            <Text style={[s.tabLabel, tab === t_ && s.tabLabelActive]}>
              {t_ === 'gateways' ? '🏦 البوابات' : t_ === 'analytics' ? '📊 التحليل' : '⚙️ الإعدادات'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Gateways Tab ── */}
        {tab === 'gateways' && (
          <>
            <Text style={s.sectionTitle}>البوابات المتاحة ({gateways.length})</Text>
            {gateways.map((gw) => (
              <TouchableOpacity key={gw.id} style={s.card} onPress={() => openEdit(gw)} activeOpacity={0.8}>
                <View style={s.cardRow}>
                  <View style={s.cardLeft}>
                    <View style={[s.statusDot, { backgroundColor: statusColor(gw.status) }]} />
                    <View>
                      <Text style={s.cardName}>{gw.name}</Text>
                      <Text style={s.cardCode}>{gw.code}</Text>
                    </View>
                  </View>
                  <View style={s.cardRight}>
                    {gw.isDefault && <View style={s.defaultBadge}><Text style={s.defaultText}>افتراضي</Text></View>}
                    <Text style={[s.statusBadge, { color: statusColor(gw.status) }]}>{gw.status}</Text>
                  </View>
                </View>
                <View style={s.cardStats}>
                  <View style={s.stat}><Text style={s.statVal}>{gw.successRate}%</Text><Text style={s.statLabel}>نجاح</Text></View>
                  <View style={s.stat}><Text style={s.statVal}>{gw.avgResponseMs}ms</Text><Text style={s.statLabel}>استجابة</Text></View>
                  <View style={s.stat}><Text style={s.statVal}>{gw.totalTransactions.toLocaleString()}</Text><Text style={s.statLabel}>معاملة</Text></View>
                  <View style={s.stat}><Text style={s.statVal}>{gw.costPercent}%</Text><Text style={s.statLabel}>تكلفة</Text></View>
                </View>
                {!gw.isDefault && (
                  <TouchableOpacity style={s.setDefaultBtn} onPress={() => toggleDefault(gw)}>
                    <Text style={s.setDefaultText}>تعيين كافتراضي</Text>
                  </TouchableOpacity>
                )}
                {gw.supportedCountries?.length > 0 && (
                  <Text style={s.countriesText}>🌍 {gw.supportedCountries.join(' · ')}</Text>
                )}
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── Analytics Tab ── */}
        {tab === 'analytics' && (
          <>
            <Text style={s.sectionTitle}>أداء البوابات (آخر 30 يوم)</Text>
            {analytics.map((a) => {
              const barWidth = Math.max(a.successRate, 1);
              return (
                <View key={a.id} style={s.card}>
                  <View style={s.cardRow}>
                    <View style={s.cardLeft}>
                      <View style={[s.statusDot, { backgroundColor: statusColor(a.status) }]} />
                      <Text style={s.cardName}>{a.name}</Text>
                    </View>
                    <Text style={s.volText}>{(a.volume / 1000).toFixed(1)}K SAR</Text>
                  </View>
                  <View style={s.barBg}>
                    <View style={[s.barFill, { width: `${barWidth}%` as any, backgroundColor: a.successRate > 95 ? COLORS.success : a.successRate > 85 ? COLORS.warning : COLORS.danger }]} />
                  </View>
                  <View style={s.cardStats}>
                    <View style={s.stat}><Text style={s.statVal}>{a.successRate}%</Text><Text style={s.statLabel}>نجاح</Text></View>
                    <View style={s.stat}><Text style={s.statVal}>{a.successCount}</Text><Text style={s.statLabel}>ناجح</Text></View>
                    <View style={s.stat}><Text style={s.statVal}>{a.failureCount}</Text><Text style={s.statLabel}>فشل</Text></View>
                    <View style={s.stat}><Text style={s.statVal}>{a.avgResponseMs}ms</Text><Text style={s.statLabel}>وقت</Text></View>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* ── Config Tab ── */}
        {tab === 'config' && config && (
          <>
            <Text style={s.sectionTitle}>إعدادات التوجيه</Text>
            <View style={s.card}>
              <Text style={s.fieldLabel}>🎯 استراتيجية التوجيه</Text>
              <View style={s.modesGrid}>
                {Object.entries(modeLabel).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[s.modeBtn, config.mode === key && s.modeBtnActive]}
                    onPress={() => saveConfig({ mode: key })}
                  >
                    <Text style={[s.modeBtnText, config.mode === key && s.modeBtnTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={s.card}>
              <Text style={s.fieldLabel}>🔄 خيارات Fallback</Text>
              <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>تفعيل Fallback التلقائي</Text>
                <TouchableOpacity
                  style={[s.toggle, config.fallbackEnabled && s.toggleOn]}
                  onPress={() => saveConfig({ fallbackEnabled: !config.fallbackEnabled })}
                >
                  <View style={[s.toggleKnob, config.fallbackEnabled && s.toggleKnobOn]} />
                </TouchableOpacity>
              </View>
              <View style={s.retryRow}>
                <Text style={s.toggleLabel}>عدد المحاولات القصوى</Text>
                <View style={s.retryBtns}>
                  {[1, 2, 3].map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[s.retryBtn, config.maxRetries === n && s.retryBtnActive]}
                      onPress={() => saveConfig({ maxRetries: n })}
                    >
                      <Text style={[s.retryBtnText, config.maxRetries === n && s.retryBtnTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <View style={s.card}>
              <Text style={s.fieldLabel}>🧪 اختبار التوجيه</Text>
              <Text style={s.hintText}>يمكنك اختبار توجيه معاملة افتراضية لمعرفة أي بوابة ستُختار</Text>
              <TouchableOpacity
                style={s.testBtn}
                onPress={async () => {
                  try {
                    const res = await gatewayRoutingApi.routeTransaction({ country: 'SA', currency: 'SAR', amount: 500 });
                    const gw = res?.data?.gateway;
                    showToast(`✅ سيُوجَّه إلى: ${gw?.name || 'بوابة افتراضية'}`);
                  } catch { showToast('❌ لا توجد بوابة مؤهلة', 'error'); }
                }}
              >
                <Text style={s.testBtnText}>اختبار: SA · SAR · 500</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>{editingGateway ? 'تعديل البوابة' : 'إضافة بوابة جديدة'}</Text>
            <TextInput style={s.input} placeholder="اسم البوابة" placeholderTextColor="#666" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} />
            {!editingGateway && (
              <TextInput style={s.input} placeholder="الكود (مثال: stripe)" placeholderTextColor="#666" value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} autoCapitalize="none" />
            )}
            <TextInput style={s.input} placeholder="نسبة التكلفة % (مثال: 2.9)" placeholderTextColor="#666" value={form.costPercent} onChangeText={v => setForm(p => ({ ...p, costPercent: v }))} keyboardType="decimal-pad" />
            <TextInput style={s.input} placeholder="الأولوية (0 = أعلى)" placeholderTextColor="#666" value={form.priority} onChangeText={v => setForm(p => ({ ...p, priority: v }))} keyboardType="number-pad" />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={s.cancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={saveGateway}>
                <Text style={s.saveText}>حفظ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: COLORS.background },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs:             { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: COLORS.card, marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 4 },
  tabBtn:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive:        { backgroundColor: COLORS.primary + '22' },
  tabLabel:         { fontSize: 12, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },
  tabLabelActive:   { color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
  sectionTitle:     { fontSize: 15, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text, marginBottom: 12 },
  card:             { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 12 },
  cardRow:          { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardLeft:         { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 },
  cardRight:        { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 },
  statusDot:        { width: 8, height: 8, borderRadius: 4 },
  cardName:         { fontSize: 14, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  cardCode:         { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  statusBadge:      { fontSize: 11, fontWeight: FONT_WEIGHT.medium },
  defaultBadge:     { backgroundColor: COLORS.primary + '22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  defaultText:      { fontSize: 10, color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
  cardStats:        { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginTop: 6 },
  stat:             { alignItems: 'center', flex: 1 },
  statVal:          { fontSize: 13, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  statLabel:        { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  setDefaultBtn:    { marginTop: 10, backgroundColor: COLORS.primary + '15', paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  setDefaultText:   { fontSize: 12, color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
  countriesText:    { fontSize: 11, color: COLORS.textSecondary, marginTop: 8 },
  volText:          { fontSize: 13, fontWeight: FONT_WEIGHT.bold, color: COLORS.success },
  barBg:            { height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginVertical: 8, overflow: 'hidden' },
  barFill:          { height: 6, borderRadius: 3 },
  fieldLabel:       { fontSize: 13, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text, marginBottom: 10 },
  modesGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeBtn:          { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  modeBtnActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  modeBtnText:      { fontSize: 12, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },
  modeBtnTextActive:{ color: '#fff', fontWeight: FONT_WEIGHT.semibold },
  toggleRow:        { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  toggleLabel:      { fontSize: 13, color: COLORS.text },
  toggle:           { width: 44, height: 24, borderRadius: 12, backgroundColor: COLORS.border, justifyContent: 'center', padding: 2 },
  toggleOn:         { backgroundColor: COLORS.primary },
  toggleKnob:       { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignSelf: 'flex-start' },
  toggleKnobOn:     { alignSelf: 'flex-end' },
  retryRow:         { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' },
  retryBtns:        { flexDirection: 'row', gap: 8 },
  retryBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  retryBtnActive:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  retryBtnText:     { fontSize: 14, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.bold },
  retryBtnTextActive:{ color: '#fff' },
  hintText:         { fontSize: 12, color: COLORS.textSecondary, marginBottom: 10, lineHeight: 18 },
  testBtn:          { backgroundColor: COLORS.primary + '20', paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary + '40' },
  testBtnText:      { fontSize: 13, color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox:         { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalTitle:       { fontSize: 16, fontWeight: FONT_WEIGHT.bold, color: COLORS.text, marginBottom: 16, textAlign: 'center' },
  input:            { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: COLORS.text, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  modalBtns:        { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginTop: 6 },
  cancelBtn:        { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.background, alignItems: 'center' },
  cancelText:       { color: COLORS.textSecondary, fontSize: 14, fontWeight: FONT_WEIGHT.medium },
  saveBtn:          { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveText:         { color: '#fff', fontSize: 14, fontWeight: FONT_WEIGHT.semibold },
});