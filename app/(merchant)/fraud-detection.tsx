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
import { fraudApi } from '../../services/api';

const isRTL = I18nManager.isRTL;

// ─── Demo Data ────────────────────────────────────────────────
const DEMO_STATS = {
  period: '30d', total: 312, blocked: 28, reviewed: 45, allowed: 239,
  critical: 8, high: 20, medium: 62, low: 222,
  avgScore: 22, unreviewed: 15,
  topRules: [
    { name: 'Velocity Phone',   count: 18 },
    { name: 'High Amount',      count: 12 },
    { name: 'Country Block',    count: 9  },
    { name: 'Duplicate Check',  count: 7  },
    { name: 'Velocity Email',   count: 5  },
  ],
};

const DEMO_EVENTS = [
  { id: 'fe1', riskScore: 92, riskLevel: 'CRITICAL', action: 'BLOCK',   reviewed: false, triggeredRules: ['Velocity Phone', 'High Amount'], country: 'XX', amount: 8500, currency: 'SAR', customerPhone: '05***1234', createdAt: new Date(Date.now() - 1*3600000).toISOString() },
  { id: 'fe2', riskScore: 68, riskLevel: 'HIGH',     action: 'REVIEW',  reviewed: false, triggeredRules: ['Duplicate Check'],               country: 'SA', amount: 1200, currency: 'SAR', customerPhone: '05***5678', createdAt: new Date(Date.now() - 2*3600000).toISOString() },
  { id: 'fe3', riskScore: 45, riskLevel: 'MEDIUM',   action: 'REVIEW',  reviewed: true,  triggeredRules: ['Velocity Email'],                country: 'TR', amount: 750,  currency: 'TRY', customerPhone: '05***9012', createdAt: new Date(Date.now() - 5*3600000).toISOString() },
  { id: 'fe4', riskScore: 15, riskLevel: 'LOW',      action: 'ALLOW',   reviewed: false, triggeredRules: [],                               country: 'AE', amount: 320,  currency: 'AED', customerPhone: '05***3456', createdAt: new Date(Date.now() - 8*3600000).toISOString() },
  { id: 'fe5', riskScore: 88, riskLevel: 'CRITICAL', action: 'BLOCK',   reviewed: true,  triggeredRules: ['Country Block', 'High Amount'],  country: 'XX', amount: 9900, currency: 'SAR', customerPhone: '05***7890', createdAt: new Date(Date.now() - 12*3600000).toISOString() },
];

const DEMO_RULES = [
  { id: 'fr1', name: 'Velocity Phone',  type: 'VELOCITY',      action: 'BLOCK',   riskScore: 60, isActive: true,  triggerCount: 18, conditions: { field: 'phone', maxCount: 3 } },
  { id: 'fr2', name: 'High Amount',     type: 'AMOUNT_LIMIT',  action: 'REVIEW',  riskScore: 40, isActive: true,  triggerCount: 12, conditions: { maxAmount: 5000 } },
  { id: 'fr3', name: 'Country Block',   type: 'COUNTRY_BLOCK', action: 'BLOCK',   riskScore: 80, isActive: true,  triggerCount: 9,  conditions: { blockedCountries: ['XX', 'YY'] } },
  { id: 'fr4', name: 'Duplicate Check', type: 'DUPLICATE_CHECK', action: 'REVIEW', riskScore: 50, isActive: true, triggerCount: 7,  conditions: { windowMinutes: 10, maxDuplicates: 1 } },
];

// ─── Helpers ──────────────────────────────────────────────────
const riskColor = (l: string) =>
  l === 'CRITICAL' ? '#EF4444' : l === 'HIGH' ? '#F97316' : l === 'MEDIUM' ? '#F59E0B' : COLORS.success;

const actionColor = (a: string) =>
  a === 'BLOCK' ? COLORS.danger : a === 'REVIEW' ? COLORS.warning : a === 'CHALLENGE' ? '#8B5CF6' : COLORS.success;

const ruleTypeLabel: Record<string, string> = {
  VELOCITY: '⚡ سرعة',
  AMOUNT_LIMIT: '💰 حد مبلغ',
  COUNTRY_BLOCK: '🌍 حظر دولة',
  IP_BLOCK: '🔒 حظر IP',
  CARD_PATTERN: '💳 نمط بطاقة',
  DUPLICATE_CHECK: '🔄 تكرار',
  CUSTOM: '⚙️ مخصص',
};

// ─── Component ────────────────────────────────────────────────
export default function FraudDetectionScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [tab, setTab]         = useState<'dashboard' | 'events' | 'rules'>('dashboard');
  const [stats, setStats]     = useState<any>(null);
  const [events, setEvents]   = useState<any[]>([]);
  const [rules, setRules]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ruleModal, setRuleModal]   = useState(false);
  const [testModal, setTestModal]   = useState(false);
  const [toast, setToast]           = useState<{ msg: string; type?: 'success' | 'error' } | null>(null);

  const [ruleForm, setRuleForm] = useState({ name: '', type: 'VELOCITY', action: 'BLOCK', riskScore: '50', conditionKey: '', conditionVal: '' });
  const [testForm, setTestForm] = useState({ amount: '500', currency: 'SAR', country: 'SA', customerPhone: '' });
  const [testResult, setTestResult] = useState<any>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [stRes, evRes, ruRes] = await Promise.all([
        fraudApi.getStats(30),
        fraudApi.listEvents(),
        fraudApi.listRules(),
      ]);
      setStats(stRes?.data   || DEMO_STATS);
      setEvents(evRes?.data?.events || DEMO_EVENTS);
      setRules(ruRes?.data?.rules   || DEMO_RULES);
    } catch {
      setStats(DEMO_STATS);
      setEvents(DEMO_EVENTS);
      setRules(DEMO_RULES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateRule = async () => {
    if (!ruleForm.name || !ruleForm.type) { showToast('الاسم والنوع مطلوبان', 'error'); return; }
    const conditions: any = {};
    if (ruleForm.conditionKey && ruleForm.conditionVal) conditions[ruleForm.conditionKey] = isNaN(Number(ruleForm.conditionVal)) ? ruleForm.conditionVal : Number(ruleForm.conditionVal);
    try {
      await fraudApi.createRule({ name: ruleForm.name, type: ruleForm.type, action: ruleForm.action, riskScore: parseInt(ruleForm.riskScore) || 50, conditions });
      showToast('تمت إضافة القاعدة');
      setRuleModal(false);
      load(true);
    } catch { showToast('فشل الإضافة', 'error'); }
  };

  const handleToggleRule = async (rule: any) => {
    try {
      await fraudApi.updateRule(rule.id, { isActive: !rule.isActive });
      showToast(rule.isActive ? 'تم تعطيل القاعدة' : 'تم تفعيل القاعدة');
      load(true);
    } catch { showToast('فشل التحديث', 'error'); }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await fraudApi.deleteRule(id);
      showToast('تم حذف القاعدة');
      load(true);
    } catch { showToast('فشل الحذف', 'error'); }
  };

  const handleReview = async (id: string) => {
    try {
      await fraudApi.reviewEvent(id, 'تمت المراجعة');
      showToast('تمت المراجعة');
      load(true);
    } catch { showToast('فشل', 'error'); }
  };

  const handleTest = async () => {
    try {
      const res = await fraudApi.analyze({ amount: Number(testForm.amount), currency: testForm.currency, country: testForm.country, customerPhone: testForm.customerPhone || undefined });
      setTestResult(res?.data);
    } catch {
      setTestResult({ riskScore: 22, riskLevel: 'LOW', action: 'ALLOW', triggeredRules: [], signals: {}, allowed: true });
    }
  };

  const tabBarHeight = 92;

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <InnerHeader title="كشف الاحتيال" accentColor={COLORS.danger} onBack={() => router.back()} />
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.danger} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <InnerHeader
        title="كشف الاحتيال"
        accentColor={COLORS.danger}
        onBack={() => router.back()}
        rightIcon={tab === 'rules' ? '＋' : tab === 'dashboard' ? '🧪' : undefined}
        onRightPress={tab === 'rules' ? () => setRuleModal(true) : tab === 'dashboard' ? () => setTestModal(true) : undefined}
      />

      {/* Tabs */}
      <View style={s.tabs}>
        {(['dashboard', 'events', 'rules'] as const).map((t_) => (
          <TouchableOpacity key={t_} style={[s.tabBtn, tab === t_ && s.tabActive]} onPress={() => setTab(t_)}>
            <Text style={[s.tabLabel, tab === t_ && s.tabLabelActive]}>
              {t_ === 'dashboard' ? '📊 لوحة التحكم' : t_ === 'events' ? '🚨 الأحداث' : '⚙️ القواعد'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.danger} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Dashboard Tab ── */}
        {tab === 'dashboard' && stats && (
          <>
            {stats.unreviewed > 0 && (
              <View style={s.alertBanner}>
                <Text style={s.alertText}>⚠️ {stats.unreviewed} حدث يحتاج مراجعة</Text>
                <TouchableOpacity onPress={() => setTab('events')}><Text style={s.alertBtn}>عرض</Text></TouchableOpacity>
              </View>
            )}

            <View style={s.kpiRow}>
              <View style={[s.kpiCard, { borderColor: COLORS.danger + '40' }]}><Text style={[s.kpiVal, { color: COLORS.danger }]}>{stats.blocked}</Text><Text style={s.kpiLabel}>محظور</Text></View>
              <View style={[s.kpiCard, { borderColor: COLORS.warning + '40' }]}><Text style={[s.kpiVal, { color: COLORS.warning }]}>{stats.reviewed}</Text><Text style={s.kpiLabel}>للمراجعة</Text></View>
              <View style={[s.kpiCard, { borderColor: COLORS.success + '40' }]}><Text style={[s.kpiVal, { color: COLORS.success }]}>{stats.allowed}</Text><Text style={s.kpiLabel}>مسموح</Text></View>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>🎯 توزيع مستوى الخطر</Text>
              {[
                { label: 'حرج',   val: stats.critical, color: '#EF4444' },
                { label: 'عالي',  val: stats.high,     color: '#F97316' },
                { label: 'متوسط', val: stats.medium,   color: '#F59E0B' },
                { label: 'منخفض', val: stats.low,      color: COLORS.success },
              ].map(item => (
                <View key={item.label} style={s.riskRow}>
                  <View style={[s.riskDot, { backgroundColor: item.color }]} />
                  <Text style={s.riskLabel}>{item.label}</Text>
                  <View style={s.riskBarWrap}>
                    <View style={[s.riskBar, { width: `${stats.total > 0 ? (item.val / stats.total) * 100 : 0}%` as any, backgroundColor: item.color }]} />
                  </View>
                  <Text style={[s.riskVal, { color: item.color }]}>{item.val}</Text>
                </View>
              ))}
            </View>

            <Text style={s.sectionTitle}>🔥 أكثر القواعد تفعيلاً</Text>
            {stats.topRules.map((r: any, i: number) => (
              <View key={r.name} style={s.topRuleCard}>
                <Text style={s.topRuleRank}>#{i + 1}</Text>
                <Text style={s.topRuleName}>{r.name}</Text>
                <Text style={s.topRuleCount}>{r.count} مرة</Text>
              </View>
            ))}

            <View style={s.scoreCard}>
              <Text style={s.scoreTitle}>متوسط درجة الخطر</Text>
              <Text style={[s.scoreVal, { color: stats.avgScore > 60 ? COLORS.danger : stats.avgScore > 35 ? COLORS.warning : COLORS.success }]}>{stats.avgScore}</Text>
              <Text style={s.scoreMax}>/100</Text>
            </View>
          </>
        )}

        {/* ── Events Tab ── */}
        {tab === 'events' && (
          <>
            <Text style={s.sectionTitle}>أحداث الاحتيال ({events.length})</Text>
            {events.map((ev) => (
              <View key={ev.id} style={[s.eventCard, { borderLeftColor: riskColor(ev.riskLevel), borderLeftWidth: 3 }]}>
                <View style={s.eventRow}>
                  <View style={s.eventLeft}>
                    <View style={[s.riskBadge, { backgroundColor: riskColor(ev.riskLevel) + '22' }]}>
                      <Text style={[s.riskBadgeText, { color: riskColor(ev.riskLevel) }]}>{ev.riskLevel}</Text>
                    </View>
                    <Text style={s.eventScore}>{ev.riskScore}</Text>
                  </View>
                  <View style={[s.actionBadge, { backgroundColor: actionColor(ev.action) + '22' }]}>
                    <Text style={[s.actionText, { color: actionColor(ev.action) }]}>{ev.action}</Text>
                  </View>
                </View>
                <View style={s.eventDetails}>
                  <Text style={s.eventDetail}>{ev.country} · {ev.currency} {Number(ev.amount).toLocaleString()}</Text>
                  <Text style={s.eventDetail}>{ev.customerPhone}</Text>
                </View>
                {ev.triggeredRules.length > 0 && (
                  <View style={s.triggeredWrap}>
                    {ev.triggeredRules.map((r: string) => (
                      <View key={r} style={s.triggeredTag}><Text style={s.triggeredText}>{r}</Text></View>
                    ))}
                  </View>
                )}
                <View style={s.eventFooter}>
                  <Text style={s.eventTime}>{new Date(ev.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</Text>
                  {!ev.reviewed && (ev.action === 'REVIEW' || ev.riskLevel === 'HIGH' || ev.riskLevel === 'CRITICAL') && (
                    <TouchableOpacity style={s.reviewBtn} onPress={() => handleReview(ev.id)}>
                      <Text style={s.reviewBtnText}>✓ مراجعة</Text>
                    </TouchableOpacity>
                  )}
                  {ev.reviewed && <Text style={s.reviewedText}>✓ تمت المراجعة</Text>}
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── Rules Tab ── */}
        {tab === 'rules' && (
          <>
            <Text style={s.sectionTitle}>قواعد كشف الاحتيال ({rules.length})</Text>
            {rules.map((rule) => (
              <View key={rule.id} style={s.ruleCard}>
                <View style={s.ruleRow}>
                  <View style={s.ruleLeft}>
                    <Text style={s.ruleType}>{ruleTypeLabel[rule.type] || rule.type}</Text>
                    <Text style={s.ruleName}>{rule.name}</Text>
                  </View>
                  <View style={[s.actionBadge, { backgroundColor: actionColor(rule.action) + '22' }]}>
                    <Text style={[s.actionText, { color: actionColor(rule.action) }]}>{rule.action}</Text>
                  </View>
                </View>
                <View style={s.ruleStats}>
                  <Text style={s.ruleStat}>درجة: {rule.riskScore}</Text>
                  <Text style={s.ruleStat}>تفعيل: {rule.triggerCount} مرة</Text>
                </View>
                <View style={s.ruleBtns}>
                  <TouchableOpacity style={[s.ruleToggle, { backgroundColor: rule.isActive ? COLORS.success + '15' : COLORS.danger + '15' }]} onPress={() => handleToggleRule(rule)}>
                    <Text style={[s.ruleToggleText, { color: rule.isActive ? COLORS.success : COLORS.danger }]}>{rule.isActive ? '✓ نشط' : '✗ معطل'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.ruleDeleteBtn} onPress={() => handleDeleteRule(rule.id)}>
                    <Text style={s.ruleDeleteText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Add Rule Modal */}
      <Modal visible={ruleModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>إضافة قاعدة جديدة</Text>
            <TextInput style={s.input} placeholder="اسم القاعدة" placeholderTextColor="#555" value={ruleForm.name} onChangeText={v => setRuleForm(p => ({ ...p, name: v }))} />
            <Text style={s.fieldLabel}>النوع</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {Object.keys(ruleTypeLabel).map(k => (
                <TouchableOpacity key={k} style={[s.typeBtn, ruleForm.type === k && s.typeBtnActive]} onPress={() => setRuleForm(p => ({ ...p, type: k }))}>
                  <Text style={[s.typeText, ruleForm.type === k && s.typeTextActive]}>{ruleTypeLabel[k]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={s.fieldLabel}>الإجراء</Text>
            <View style={s.actionRow}>
              {['BLOCK', 'REVIEW', 'CHALLENGE', 'ALLOW'].map(a => (
                <TouchableOpacity key={a} style={[s.actionBtn, ruleForm.action === a && { backgroundColor: actionColor(a) }]} onPress={() => setRuleForm(p => ({ ...p, action: a }))}>
                  <Text style={[s.actionBtnText, ruleForm.action === a && { color: '#fff' }]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={s.input} placeholder="درجة الخطر (0-100)" placeholderTextColor="#555" value={ruleForm.riskScore} onChangeText={v => setRuleForm(p => ({ ...p, riskScore: v }))} keyboardType="number-pad" />
            <View style={s.condRow}>
              <TextInput style={[s.input, { flex: 1 }]} placeholder="مفتاح الشرط" placeholderTextColor="#555" value={ruleForm.conditionKey} onChangeText={v => setRuleForm(p => ({ ...p, conditionKey: v }))} />
              <TextInput style={[s.input, { flex: 1, marginRight: 8 }]} placeholder="القيمة" placeholderTextColor="#555" value={ruleForm.conditionVal} onChangeText={v => setRuleForm(p => ({ ...p, conditionVal: v }))} />
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setRuleModal(false)}><Text style={s.cancelText}>إلغاء</Text></TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleCreateRule}><Text style={s.saveText}>إضافة</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Test Modal */}
      <Modal visible={testModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>🧪 اختبار كشف الاحتيال</Text>
            <TextInput style={s.input} placeholder="المبلغ" placeholderTextColor="#555" value={testForm.amount} onChangeText={v => setTestForm(p => ({ ...p, amount: v }))} keyboardType="decimal-pad" />
            <View style={s.actionRow}>
              {['SAR', 'TRY', 'AED', 'USD'].map(c => (
                <TouchableOpacity key={c} style={[s.actionBtn, testForm.currency === c && { backgroundColor: COLORS.primary }]} onPress={() => setTestForm(p => ({ ...p, currency: c }))}>
                  <Text style={[s.actionBtnText, testForm.currency === c && { color: '#fff' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={s.input} placeholder="كود الدولة (SA, TR, AE...)" placeholderTextColor="#555" value={testForm.country} onChangeText={v => setTestForm(p => ({ ...p, country: v }))} autoCapitalize="characters" maxLength={2} />
            <TextInput style={s.input} placeholder="رقم الجوال (اختياري)" placeholderTextColor="#555" value={testForm.customerPhone} onChangeText={v => setTestForm(p => ({ ...p, customerPhone: v }))} keyboardType="phone-pad" />
            {testResult && (
              <View style={[s.testResult, { borderColor: riskColor(testResult.riskLevel) }]}>
                <View style={s.testResultRow}>
                  <Text style={[s.testRiskLevel, { color: riskColor(testResult.riskLevel) }]}>{testResult.riskLevel}</Text>
                  <Text style={[s.testAction, { color: actionColor(testResult.action) }]}>{testResult.action}</Text>
                </View>
                <Text style={s.testScore}>درجة الخطر: {testResult.riskScore}/100</Text>
                {testResult.triggeredRules?.length > 0 && (
                  <Text style={s.testRules}>قواعد: {testResult.triggeredRules.join(', ')}</Text>
                )}
              </View>
            )}
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setTestModal(false); setTestResult(null); }}><Text style={s.cancelText}>إغلاق</Text></TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleTest}><Text style={s.saveText}>تحليل</Text></TouchableOpacity>
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
  safe:            { flex: 1, backgroundColor: COLORS.background },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs:            { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: COLORS.card, marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 4 },
  tabBtn:          { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive:       { backgroundColor: COLORS.danger + '22' },
  tabLabel:        { fontSize: 11, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },
  tabLabelActive:  { color: COLORS.danger, fontWeight: FONT_WEIGHT.semibold },
  sectionTitle:    { fontSize: 15, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text, marginBottom: 12 },
  card:            { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 12 },
  cardTitle:       { fontSize: 13, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text, marginBottom: 12 },
  alertBanner:     { backgroundColor: COLORS.warning + '20', borderRadius: 12, padding: 12, marginBottom: 12, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.warning + '40' },
  alertText:       { fontSize: 13, color: COLORS.warning, fontWeight: FONT_WEIGHT.medium },
  alertBtn:        { fontSize: 13, color: COLORS.warning, fontWeight: FONT_WEIGHT.bold, textDecorationLine: 'underline' },
  kpiRow:          { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginBottom: 12 },
  kpiCard:         { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  kpiVal:          { fontSize: 22, fontWeight: FONT_WEIGHT.bold },
  kpiLabel:        { fontSize: 10, color: COLORS.textSecondary, marginTop: 3 },
  riskRow:         { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  riskDot:         { width: 8, height: 8, borderRadius: 4 },
  riskLabel:       { width: 50, fontSize: 12, color: COLORS.text },
  riskBarWrap:     { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  riskBar:         { height: 6, borderRadius: 3 },
  riskVal:         { width: 28, fontSize: 12, fontWeight: FONT_WEIGHT.bold, textAlign: 'right' },
  topRuleCard:     { backgroundColor: COLORS.card, borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 },
  topRuleRank:     { fontSize: 14, color: COLORS.textSecondary, width: 24 },
  topRuleName:     { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: FONT_WEIGHT.medium },
  topRuleCount:    { fontSize: 12, color: COLORS.danger, fontWeight: FONT_WEIGHT.semibold },
  scoreCard:       { backgroundColor: COLORS.card, borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 12 },
  scoreTitle:      { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  scoreVal:        { fontSize: 48, fontWeight: FONT_WEIGHT.bold },
  scoreMax:        { fontSize: 14, color: COLORS.textSecondary },
  eventCard:       { backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 10 },
  eventRow:        { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  eventLeft:       { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 },
  riskBadge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  riskBadgeText:   { fontSize: 11, fontWeight: FONT_WEIGHT.bold },
  eventScore:      { fontSize: 16, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  actionBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  actionText:      { fontSize: 11, fontWeight: FONT_WEIGHT.semibold },
  eventDetails:    { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12, marginBottom: 8 },
  eventDetail:     { fontSize: 12, color: COLORS.textSecondary },
  triggeredWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  triggeredTag:    { backgroundColor: COLORS.danger + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  triggeredText:   { fontSize: 10, color: COLORS.danger },
  eventFooter:     { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventTime:       { fontSize: 11, color: COLORS.textSecondary },
  reviewBtn:       { backgroundColor: COLORS.warning + '20', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  reviewBtnText:   { fontSize: 12, color: COLORS.warning, fontWeight: FONT_WEIGHT.semibold },
  reviewedText:    { fontSize: 11, color: COLORS.success },
  ruleCard:        { backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 10 },
  ruleRow:         { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  ruleLeft:        { flex: 1 },
  ruleType:        { fontSize: 11, color: COLORS.textSecondary, marginBottom: 3 },
  ruleName:        { fontSize: 14, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  ruleStats:       { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 16, marginBottom: 8 },
  ruleStat:        { fontSize: 12, color: COLORS.textSecondary },
  ruleBtns:        { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 },
  ruleToggle:      { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  ruleToggleText:  { fontSize: 12, fontWeight: FONT_WEIGHT.semibold },
  ruleDeleteBtn:   { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: COLORS.danger + '15' },
  ruleDeleteText:  { fontSize: 14 },
  fieldLabel:      { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  input:           { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: COLORS.text, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  typeBtn:         { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  typeBtnActive:   { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  typeText:        { fontSize: 11, color: COLORS.textSecondary },
  typeTextActive:  { color: '#fff', fontWeight: FONT_WEIGHT.semibold },
  actionRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  actionBtn:       { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  actionBtnText:   { fontSize: 11, color: COLORS.textSecondary },
  condRow:         { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox:        { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalTitle:      { fontSize: 16, fontWeight: FONT_WEIGHT.bold, color: COLORS.text, marginBottom: 14, textAlign: 'center' },
  modalBtns:       { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginTop: 6 },
  cancelBtn:       { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.background, alignItems: 'center' },
  cancelText:      { color: COLORS.textSecondary, fontSize: 14 },
  saveBtn:         { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.danger, alignItems: 'center' },
  saveText:        { color: '#fff', fontSize: 14, fontWeight: FONT_WEIGHT.semibold },
  testResult:      { backgroundColor: COLORS.background, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1 },
  testResultRow:   { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 6 },
  testRiskLevel:   { fontSize: 16, fontWeight: FONT_WEIGHT.bold },
  testAction:      { fontSize: 14, fontWeight: FONT_WEIGHT.semibold },
  testScore:       { fontSize: 13, color: COLORS.text, marginBottom: 4 },
  testRules:       { fontSize: 11, color: COLORS.textSecondary },
});