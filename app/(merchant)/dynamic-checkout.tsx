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
import { dynamicCheckoutApi } from '../../services/api';

const isRTL = I18nManager.isRTL;

// ─── Demo Data ────────────────────────────────────────────────
const DEMO_CHECKOUTS = [
  {
    id: 'dc1', name: 'الصفحة الرئيسية', description: 'صفحة دفع ذكية للسوق السعودي', isActive: true, status: 'ACTIVE',
    brandColor: '#1A56DB', defaultCurrency: 'SAR', autoSelectGateway: true, showBinHints: true,
    usageCount: 248, totalRevenue: 125400, conversionRate: 78.5,
    allowedMethods: ['CREDIT_CARD', 'MADA', 'STC_PAY', 'APPLE_PAY'],
    _count: { events: 248 },
    rules: [
      { id: 'r1', trigger: 'CUSTOMER_COUNTRY', condition: 'SA', action: 'SET_GATEWAY', actionValue: 'tap',    priority: 1, isActive: true },
      { id: 'r2', trigger: 'CUSTOMER_COUNTRY', condition: 'TR', action: 'SET_GATEWAY', actionValue: 'iyzico', priority: 2, isActive: true },
      { id: 'r3', trigger: 'AMOUNT_RANGE',      condition: '0-100', action: 'ADD_METHOD', actionValue: 'COD', priority: 3, isActive: true },
    ],
  },
  {
    id: 'dc2', name: 'السوق التركي', description: 'مخصص للعملاء الأتراك', isActive: true, status: 'ACTIVE',
    brandColor: '#E30613', defaultCurrency: 'TRY', autoSelectGateway: true, showBinHints: true,
    usageCount: 94, totalRevenue: 38200, conversionRate: 71.2,
    allowedMethods: ['CREDIT_CARD', 'TROY', 'BANK_TRANSFER'],
    _count: { events: 94 },
    rules: [
      { id: 'r4', trigger: 'CUSTOMER_COUNTRY', condition: 'TR', action: 'SET_GATEWAY', actionValue: 'iyzico', priority: 1, isActive: true },
    ],
  },
];

const TRIGGER_LABELS: Record<string, string> = {
  CUSTOMER_COUNTRY:  '🌍 الدولة',
  AMOUNT_RANGE:      '💰 النطاق السعري',
  PAYMENT_METHOD:    '💳 طريقة الدفع',
  TIME_OF_DAY:       '🕐 وقت اليوم',
  RETURNING_CUSTOMER:'🔁 عميل عائد',
};

const ACTION_LABELS: Record<string, string> = {
  SET_GATEWAY:   'تعيين بوابة',
  ADD_METHOD:    'إضافة طريقة',
  REMOVE_METHOD: 'إزالة طريقة',
  SET_METHODS:   'تعيين طرق',
};

// ─── Component ────────────────────────────────────────────────
export default function DynamicCheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [tab, setTab]           = useState<'checkouts' | 'create'>('checkouts');
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [selected, setSelected]   = useState<any | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ruleModal, setRuleModal]   = useState(false);
  const [toast, setToast]           = useState<{ msg: string; type?: 'success' | 'error' } | null>(null);

  // Create form
  const [form, setForm] = useState({ name: '', description: '', defaultCurrency: 'SAR', brandColor: '#1A56DB' });

  // Rule form
  const [ruleForm, setRuleForm] = useState({ trigger: 'CUSTOMER_COUNTRY', condition: '', action: 'SET_GATEWAY', actionValue: '', priority: '0' });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await dynamicCheckoutApi.list();
      setCheckouts(res?.data?.checkouts || DEMO_CHECKOUTS);
    } catch {
      setCheckouts(DEMO_CHECKOUTS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name) { showToast('الاسم مطلوب', 'error'); return; }
    try {
      await dynamicCheckoutApi.create(form);
      showToast('تم إنشاء الصفحة');
      setForm({ name: '', description: '', defaultCurrency: 'SAR', brandColor: '#1A56DB' });
      setTab('checkouts');
      load(true);
    } catch { showToast('فشل الإنشاء', 'error'); }
  };

  const handleToggle = async (checkout: any) => {
    try {
      await dynamicCheckoutApi.update(checkout.id, { isActive: !checkout.isActive });
      showToast(checkout.isActive ? 'تم تعطيل الصفحة' : 'تم تفعيل الصفحة');
      load(true);
    } catch { showToast('فشل التحديث', 'error'); }
  };

  const handleAddRule = async () => {
    if (!selected || !ruleForm.condition || !ruleForm.action) { showToast('أكمل البيانات', 'error'); return; }
    try {
      await dynamicCheckoutApi.createRule(selected.id, { ...ruleForm, priority: parseInt(ruleForm.priority) || 0 });
      showToast('تمت إضافة القاعدة');
      setRuleModal(false);
      load(true);
      const updated = checkouts.find(c => c.id === selected.id);
      if (updated) setSelected(updated);
    } catch { showToast('فشل الإضافة', 'error'); }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!selected) return;
    try {
      await dynamicCheckoutApi.deleteRule(selected.id, ruleId);
      showToast('تم حذف القاعدة');
      load(true);
    } catch { showToast('فشل الحذف', 'error'); }
  };

  const handleResolve = async (checkout: any) => {
    try {
      const res = await dynamicCheckoutApi.resolve(checkout.id, { country: 'SA', currency: 'SAR', amount: 500 });
      const d = res?.data;
      showToast(`✅ Gateway: ${d?.resolvedGateway || '—'} | طرق: ${d?.resolvedMethods?.join(', ') || '—'}`);
    } catch { showToast('فشل الاختبار', 'error'); }
  };

  const tabBarHeight = 92;

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <InnerHeader title="Dynamic Checkout" accentColor="#F59E0B" onBack={() => router.back()} />
        <View style={s.center}><ActivityIndicator size="large" color="#F59E0B" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <InnerHeader
        title="Dynamic Checkout"
        accentColor="#F59E0B"
        onBack={() => { if (selected) { setSelected(null); } else { router.back(); } }}
        rightIcon={!selected ? '＋' : undefined}
        onRightPress={!selected ? () => setTab('create') : undefined}
      />

      {/* Tabs (only when no checkout selected) */}
      {!selected && (
        <View style={s.tabs}>
          {(['checkouts', 'create'] as const).map((t_) => (
            <TouchableOpacity key={t_} style={[s.tabBtn, tab === t_ && s.tabActive]} onPress={() => setTab(t_)}>
              <Text style={[s.tabLabel, tab === t_ && s.tabLabelActive]}>
                {t_ === 'checkouts' ? '📋 صفحاتي' : '➕ إنشاء جديد'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#F59E0B" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Checkout Detail ── */}
        {selected && (
          <>
            <View style={s.detailHeader}>
              <View style={[s.colorDot, { backgroundColor: selected.brandColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.detailName}>{selected.name}</Text>
                <Text style={s.detailDesc}>{selected.description || 'بلا وصف'}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: selected.isActive ? COLORS.success + '22' : COLORS.danger + '22' }]}>
                <Text style={[s.statusText, { color: selected.isActive ? COLORS.success : COLORS.danger }]}>
                  {selected.isActive ? 'نشط' : 'معطل'}
                </Text>
              </View>
            </View>

            {/* KPIs */}
            <View style={s.kpiRow}>
              <View style={s.kpiCard}><Text style={s.kpiVal}>{selected.usageCount}</Text><Text style={s.kpiLabel}>استخدام</Text></View>
              <View style={s.kpiCard}><Text style={[s.kpiVal, { color: '#F59E0B' }]}>{selected.conversionRate}%</Text><Text style={s.kpiLabel}>تحويل</Text></View>
              <View style={s.kpiCard}><Text style={[s.kpiVal, { color: COLORS.success }]}>{(Number(selected.totalRevenue) / 1000).toFixed(1)}K</Text><Text style={s.kpiLabel}>إيراد</Text></View>
            </View>

            {/* Methods */}
            <View style={s.card}>
              <Text style={s.cardTitle}>💳 طرق الدفع المسموحة</Text>
              <View style={s.methodsWrap}>
                {selected.allowedMethods.map((m: string) => (
                  <View key={m} style={s.methodTag}><Text style={s.methodText}>{m}</Text></View>
                ))}
              </View>
            </View>

            {/* Rules */}
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>⚡ القواعد الذكية ({selected.rules.length})</Text>
              <TouchableOpacity style={s.addRuleBtn} onPress={() => setRuleModal(true)}>
                <Text style={s.addRuleText}>+ قاعدة</Text>
              </TouchableOpacity>
            </View>
            {selected.rules.map((rule: any) => (
              <View key={rule.id} style={s.ruleCard}>
                <View style={s.ruleRow}>
                  <Text style={s.ruleTrigger}>{TRIGGER_LABELS[rule.trigger] || rule.trigger}</Text>
                  <Text style={s.ruleArrow}>→</Text>
                  <Text style={s.ruleAction}>{ACTION_LABELS[rule.action] || rule.action}</Text>
                  {rule.actionValue && <Text style={s.ruleValue}>{rule.actionValue}</Text>}
                </View>
                <View style={s.ruleBottom}>
                  <Text style={s.ruleCondition}>شرط: {rule.condition}</Text>
                  <TouchableOpacity onPress={() => handleDeleteRule(rule.id)}>
                    <Text style={s.ruleDelete}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Test & Actions */}
            <TouchableOpacity style={s.testBtn} onPress={() => handleResolve(selected)}>
              <Text style={s.testBtnText}>🧪 اختبار: SA · SAR · 500</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.toggleBtn, { backgroundColor: selected.isActive ? COLORS.danger + '15' : COLORS.success + '15' }]} onPress={() => handleToggle(selected)}>
              <Text style={[s.toggleBtnText, { color: selected.isActive ? COLORS.danger : COLORS.success }]}>
                {selected.isActive ? '⏸ تعطيل' : '▶ تفعيل'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Checkouts List ── */}
        {!selected && tab === 'checkouts' && (
          <>
            <Text style={s.sectionTitle}>صفحات الدفع الديناميكية ({checkouts.length})</Text>
            {checkouts.map((co) => (
              <TouchableOpacity key={co.id} style={s.card} onPress={() => setSelected(co)} activeOpacity={0.8}>
                <View style={s.coRow}>
                  <View style={s.coLeft}>
                    <View style={[s.colorDot, { backgroundColor: co.brandColor }]} />
                    <View>
                      <Text style={s.coName}>{co.name}</Text>
                      <Text style={s.coDesc}>{co.description || co.defaultCurrency}</Text>
                    </View>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: co.isActive ? COLORS.success + '22' : COLORS.danger + '22' }]}>
                    <Text style={[s.statusText, { color: co.isActive ? COLORS.success : COLORS.danger }]}>
                      {co.isActive ? 'نشط' : 'معطل'}
                    </Text>
                  </View>
                </View>
                <View style={s.coStats}>
                  <Text style={s.coStat}>{co.usageCount} استخدام</Text>
                  <Text style={s.coStat}>{co.conversionRate}% تحويل</Text>
                  <Text style={s.coStat}>{co.rules?.length || 0} قاعدة</Text>
                  <Text style={s.coStat}>{co.allowedMethods?.length || 0} طريقة</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── Create Tab ── */}
        {!selected && tab === 'create' && (
          <>
            <Text style={s.sectionTitle}>إنشاء صفحة دفع ذكية جديدة</Text>
            <View style={s.card}>
              <Text style={s.fieldLabel}>اسم الصفحة *</Text>
              <TextInput style={s.input} placeholder="مثال: السوق السعودي" placeholderTextColor="#555" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} />
              <Text style={s.fieldLabel}>وصف (اختياري)</Text>
              <TextInput style={s.input} placeholder="وصف مختصر" placeholderTextColor="#555" value={form.description} onChangeText={v => setForm(p => ({ ...p, description: v }))} />
              <Text style={s.fieldLabel}>العملة الافتراضية</Text>
              <View style={s.currencyRow}>
                {['SAR', 'TRY', 'AED', 'USD'].map(c => (
                  <TouchableOpacity key={c} style={[s.currencyBtn, form.defaultCurrency === c && s.currencyBtnActive]} onPress={() => setForm(p => ({ ...p, defaultCurrency: c }))}>
                    <Text style={[s.currencyText, form.defaultCurrency === c && s.currencyTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.fieldLabel}>لون العلامة التجارية</Text>
              <View style={s.colorRow}>
                {['#1A56DB', '#E30613', '#00A651', '#F59E0B', '#8B5CF6', '#EC4899'].map(c => (
                  <TouchableOpacity key={c} style={[s.colorSwatch, { backgroundColor: c }, form.brandColor === c && s.colorSwatchActive]} onPress={() => setForm(p => ({ ...p, brandColor: c }))} />
                ))}
              </View>
              <TouchableOpacity style={s.createBtn} onPress={handleCreate}>
                <Text style={s.createBtnText}>إنشاء الصفحة</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Add Rule Modal */}
      <Modal visible={ruleModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>إضافة قاعدة ذكية</Text>

            <Text style={s.fieldLabel}>المُحفِّز (Trigger)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                <TouchableOpacity key={key} style={[s.triggerBtn, ruleForm.trigger === key && s.triggerBtnActive]} onPress={() => setRuleForm(p => ({ ...p, trigger: key }))}>
                  <Text style={[s.triggerText, ruleForm.trigger === key && s.triggerTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.fieldLabel}>الشرط</Text>
            <TextInput style={s.input} placeholder={ruleForm.trigger === 'AMOUNT_RANGE' ? '0-500' : ruleForm.trigger === 'CUSTOMER_COUNTRY' ? 'SA' : 'القيمة'} placeholderTextColor="#555" value={ruleForm.condition} onChangeText={v => setRuleForm(p => ({ ...p, condition: v }))} />

            <Text style={s.fieldLabel}>الإجراء (Action)</Text>
            <View style={s.currencyRow}>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <TouchableOpacity key={key} style={[s.currencyBtn, ruleForm.action === key && s.currencyBtnActive]} onPress={() => setRuleForm(p => ({ ...p, action: key }))}>
                  <Text style={[s.currencyText, ruleForm.action === key && s.currencyTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>القيمة (مثال: tap, iyzico, MADA)</Text>
            <TextInput style={s.input} placeholder="القيمة" placeholderTextColor="#555" value={ruleForm.actionValue} onChangeText={v => setRuleForm(p => ({ ...p, actionValue: v }))} />

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setRuleModal(false)}>
                <Text style={s.cancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleAddRule}>
                <Text style={s.saveText}>إضافة</Text>
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
  safe:              { flex: 1, backgroundColor: COLORS.background },
  center:            { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs:              { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: COLORS.card, marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 4 },
  tabBtn:            { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive:         { backgroundColor: '#F59E0B22' },
  tabLabel:          { fontSize: 12, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },
  tabLabelActive:    { color: '#F59E0B', fontWeight: FONT_WEIGHT.semibold },
  sectionTitle:      { fontSize: 15, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text, marginBottom: 12 },
  card:              { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 12 },
  cardTitle:         { fontSize: 13, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text, marginBottom: 10 },
  cardHeader:        { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fieldLabel:        { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6, marginTop: 4 },
  input:             { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: COLORS.text, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  detailHeader:      { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 12 },
  colorDot:          { width: 16, height: 16, borderRadius: 8 },
  detailName:        { fontSize: 16, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  detailDesc:        { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText:        { fontSize: 11, fontWeight: FONT_WEIGHT.semibold },
  kpiRow:            { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginBottom: 12 },
  kpiCard:           { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 12, alignItems: 'center' },
  kpiVal:            { fontSize: 20, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  kpiLabel:          { fontSize: 10, color: COLORS.textSecondary, marginTop: 3 },
  methodsWrap:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodTag:         { backgroundColor: COLORS.primary + '18', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  methodText:        { fontSize: 11, color: COLORS.primary, fontWeight: FONT_WEIGHT.medium },
  addRuleBtn:        { backgroundColor: '#F59E0B22', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addRuleText:       { fontSize: 12, color: '#F59E0B', fontWeight: FONT_WEIGHT.semibold },
  ruleCard:          { backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F59E0B30' },
  ruleRow:           { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  ruleTrigger:       { fontSize: 12, color: COLORS.text, fontWeight: FONT_WEIGHT.semibold },
  ruleArrow:         { fontSize: 12, color: COLORS.textSecondary },
  ruleAction:        { fontSize: 12, color: '#F59E0B', fontWeight: FONT_WEIGHT.semibold },
  ruleValue:         { fontSize: 11, color: COLORS.primary, backgroundColor: COLORS.primary + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  ruleBottom:        { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  ruleCondition:     { fontSize: 11, color: COLORS.textSecondary },
  ruleDelete:        { fontSize: 16 },
  testBtn:           { backgroundColor: '#F59E0B15', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#F59E0B40' },
  testBtnText:       { color: '#F59E0B', fontSize: 13, fontWeight: FONT_WEIGHT.semibold },
  toggleBtn:         { paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginBottom: 8 },
  toggleBtnText:     { fontSize: 13, fontWeight: FONT_WEIGHT.semibold },
  coRow:             { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  coLeft:            { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 },
  coName:            { fontSize: 14, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  coDesc:            { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  coStats:           { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 },
  coStat:            { fontSize: 11, color: COLORS.textSecondary },
  currencyRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  currencyBtn:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  currencyBtnActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  currencyText:      { fontSize: 12, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },
  currencyTextActive:{ color: '#fff', fontWeight: FONT_WEIGHT.semibold },
  colorRow:          { flexDirection: 'row', gap: 10, marginBottom: 12 },
  colorSwatch:       { width: 32, height: 32, borderRadius: 8 },
  colorSwatchActive: { borderWidth: 3, borderColor: '#fff' },
  createBtn:         { backgroundColor: '#F59E0B', paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  createBtnText:     { color: '#fff', fontSize: 14, fontWeight: FONT_WEIGHT.bold },
  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox:          { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalTitle:        { fontSize: 16, fontWeight: FONT_WEIGHT.bold, color: COLORS.text, marginBottom: 14, textAlign: 'center' },
  triggerBtn:        { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  triggerBtnActive:  { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  triggerText:       { fontSize: 12, color: COLORS.textSecondary },
  triggerTextActive: { color: '#fff', fontWeight: FONT_WEIGHT.semibold },
  modalBtns:         { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginTop: 10 },
  cancelBtn:         { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.background, alignItems: 'center' },
  cancelText:        { color: COLORS.textSecondary, fontSize: 14 },
  saveBtn:           { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F59E0B', alignItems: 'center' },
  saveText:          { color: '#fff', fontSize: 14, fontWeight: FONT_WEIGHT.semibold },
});