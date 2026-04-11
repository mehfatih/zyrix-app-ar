import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { FONT_WEIGHT } from '../../constants/theme';
import { chargebackApi } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────
interface Alert {
  id: string;
  alertType: string;
  riskScore: number;
  status: string;
  autoRefunded: boolean;
  autoRefundAmount?: number;
  recommendedAction: string;
  reason?: string;
  customerPhone?: string;
  customerEmail?: string;
  amount: number;
  currency: string;
  createdAt: string;
  resolvedAt?: string;
}

interface Rule {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  triggerValue?: string;
  action: string;
  autoRefundThreshold?: number;
  isActive: boolean;
  triggerCount: number;
}

interface Stats {
  total: number;
  open: number;
  resolved: number;
  autoRefunds: number;
  highRisk: number;
  avgRisk: number;
  savedAmount: number;
}

// ─── Helpers ──────────────────────────────────────────────────
const riskColor = (score: number) => score >= 70 ? '#EF4444' : score >= 40 ? '#F59E0B' : '#10B981';
const riskLabel = (score: number) => score >= 70 ? 'عالي' : score >= 40 ? 'متوسط' : 'منخفض';
const actionColor: Record<string, string> = {
  AUTO_REFUND: '#10B981', ALERT_MERCHANT: '#F59E0B', MONITOR: '#6B7280',
};
const TRIGGER_LABELS: Record<string, string> = {
  HIGH_AMOUNT: 'مبلغ مرتفع', REPEAT_CUSTOMER: 'عميل متكرر',
  DISPUTE_KEYWORD: 'كلمة نزاع', AMOUNT_THRESHOLD: 'حد المبلغ',
};
const ACTION_LABELS: Record<string, string> = {
  AUTO_REFUND: '⚡ استرداد تلقائي', ALERT: '🔔 تنبيه', MONITOR: '👁 مراقبة',
};

// ─── Main Screen ──────────────────────────────────────────────
export default function ChargebackPreventionScreen() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'rules' | 'stats'>('alerts');
  const [alerts, setAlerts]   = useState<Alert[]>([]);
  const [rules, setRules]     = useState<Rule[]>([]);
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showAddRule, setShowAddRule] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    name: '', triggerType: 'HIGH_AMOUNT', triggerValue: '1000',
    action: 'ALERT', autoRefundThreshold: '',
  });

  const load = useCallback(async () => {
    try {
      const [alertsRes, rulesRes, statsRes] = await Promise.all([
        chargebackApi.listAlerts({ status: filterStatus || undefined }),
        chargebackApi.listRules(),
        chargebackApi.stats(),
      ]);
      setAlerts(alertsRes.alerts || []);
      setRules(rulesRes.rules || []);
      setStats(statsRes || null);
    } catch (_e) {}
    finally { setLoading(false); setRefreshing(false); }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleResolve = async (id: string) => {
    try { await chargebackApi.resolveAlert(id, { resolvedNote: 'تم الحل من التطبيق' }); load(); }
    catch (_e) {}
  };

  const handleAddRule = async () => {
    if (!ruleForm.name || !ruleForm.triggerType) return;
    try {
      await chargebackApi.createRule({
        ...ruleForm,
        autoRefundThreshold: ruleForm.autoRefundThreshold ? parseFloat(ruleForm.autoRefundThreshold) : undefined,
      });
      setShowAddRule(false);
      setRuleForm({ name: '', triggerType: 'HIGH_AMOUNT', triggerValue: '1000', action: 'ALERT', autoRefundThreshold: '' });
      load();
    } catch (_e) {}
  };

  const handleToggleRule = async (rule: Rule) => {
    try { await chargebackApi.updateRule(rule.id, { isActive: !rule.isActive }); load(); }
    catch (_e) {}
  };

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
          <Text style={s.title}>Chargeback Prevention</Text>
          <Text style={s.subtitle}>منع النزاعات قبل حدوثها</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['alerts', 'rules', 'stats'] as const).map(tab => (
          <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'alerts' ? `🔔 تنبيهات${alerts.filter(a => a.status === 'OPEN').length ? ` (${alerts.filter(a => a.status === 'OPEN').length})` : ''}` :
               tab === 'rules'  ? '⚙️ قواعد' : '📊 إحصائيات'}
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

        {/* ── ALERTS TAB ── */}
        {activeTab === 'alerts' && (
          <>
            {/* Filter */}
            <View style={s.filterRow}>
              {['', 'OPEN', 'RESOLVED'].map(st => (
                <TouchableOpacity key={st} style={[s.filterChip, filterStatus === st && s.filterChipActive]} onPress={() => setFilterStatus(st)}>
                  <Text style={[s.filterText, filterStatus === st && s.filterTextActive]}>
                    {st === '' ? 'الكل' : st === 'OPEN' ? 'مفتوح' : 'محلول'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {alerts.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>🛡️</Text>
                <Text style={s.emptyTitle}>لا توجد تنبيهات</Text>
                <Text style={s.emptyDesc}>كل شيء يسير بشكل طبيعي</Text>
              </View>
            ) : alerts.map(alert => (
              <View key={alert.id} style={[s.alertCard, alert.status === 'RESOLVED' && s.alertResolved]}>
                <View style={s.alertTop}>
                  <View style={[s.riskBadge, { backgroundColor: riskColor(Number(alert.riskScore)) + '22' }]}>
                    <Text style={[s.riskScore, { color: riskColor(Number(alert.riskScore)) }]}>{alert.riskScore}</Text>
                    <Text style={[s.riskLabel, { color: riskColor(Number(alert.riskScore)) }]}>{riskLabel(Number(alert.riskScore))}</Text>
                  </View>
                  <View style={s.alertInfo}>
                    <Text style={s.alertAmount}>{alert.currency} {Number(alert.amount).toLocaleString()}</Text>
                    {alert.customerPhone && <Text style={s.alertCustomer}>{alert.customerPhone}</Text>}
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: alert.status === 'OPEN' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)' }]}>
                    <Text style={[s.statusText, { color: alert.status === 'OPEN' ? '#EF4444' : '#10B981' }]}>
                      {alert.status === 'OPEN' ? 'مفتوح' : 'محلول'}
                    </Text>
                  </View>
                </View>

                <View style={s.alertAction}>
                  <Text style={[s.recommendLabel, { color: actionColor[alert.recommendedAction] || '#6B7280' }]}>
                    {alert.recommendedAction === 'AUTO_REFUND' ? '⚡ تم استرداد تلقائي' :
                     alert.recommendedAction === 'ALERT_MERCHANT' ? '⚠️ مراجعة مطلوبة' : '👁 تحت المراقبة'}
                  </Text>
                  {alert.autoRefunded && alert.autoRefundAmount && (
                    <Text style={s.autoRefundText}>استرداد: {alert.currency} {Number(alert.autoRefundAmount).toLocaleString()}</Text>
                  )}
                </View>

                {alert.reason && <Text style={s.alertReason}>السبب: {alert.reason}</Text>}

                {alert.status === 'OPEN' && (
                  <TouchableOpacity style={s.resolveBtn} onPress={() => handleResolve(alert.id)}>
                    <Text style={s.resolveBtnText}>✅ تحديد كمحلول</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}

        {/* ── RULES TAB ── */}
        {activeTab === 'rules' && (
          <>
            <TouchableOpacity style={s.addRuleBtn} onPress={() => setShowAddRule(!showAddRule)}>
              <Text style={s.addRuleBtnText}>{showAddRule ? '✕ إغلاق' : '➕ إضافة قاعدة'}</Text>
            </TouchableOpacity>

            {showAddRule && (
              <View style={s.ruleForm}>
                <View style={s.field}>
                  <Text style={s.fieldLabel}>اسم القاعدة *</Text>
                  <TextInput style={s.input} placeholder="مثال: تنبيه مبالغ كبيرة" placeholderTextColor="rgba(255,255,255,0.3)" value={ruleForm.name} onChangeText={v => setRuleForm(f => ({ ...f, name: v }))} />
                </View>

                <View style={s.field}>
                  <Text style={s.fieldLabel}>نوع المشغّل</Text>
                  <View style={s.optionRow}>
                    {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                      <TouchableOpacity key={key} style={[s.optionChip, ruleForm.triggerType === key && s.optionChipActive]} onPress={() => setRuleForm(f => ({ ...f, triggerType: key }))}>
                        <Text style={[s.optionChipText, ruleForm.triggerType === key && s.optionChipTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={s.field}>
                  <Text style={s.fieldLabel}>القيمة</Text>
                  <TextInput style={s.input} placeholder="مثال: 1000" placeholderTextColor="rgba(255,255,255,0.3)" keyboardType="numeric" value={ruleForm.triggerValue} onChangeText={v => setRuleForm(f => ({ ...f, triggerValue: v }))} />
                </View>

                <View style={s.field}>
                  <Text style={s.fieldLabel}>الإجراء</Text>
                  <View style={s.optionRow}>
                    {Object.entries(ACTION_LABELS).map(([key, label]) => (
                      <TouchableOpacity key={key} style={[s.optionChip, ruleForm.action === key && s.optionChipActive]} onPress={() => setRuleForm(f => ({ ...f, action: key }))}>
                        <Text style={[s.optionChipText, ruleForm.action === key && s.optionChipTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {ruleForm.action === 'AUTO_REFUND' && (
                  <View style={s.field}>
                    <Text style={s.fieldLabel}>الحد الأقصى للاسترداد التلقائي</Text>
                    <TextInput style={s.input} placeholder="مثال: 500" placeholderTextColor="rgba(255,255,255,0.3)" keyboardType="numeric" value={ruleForm.autoRefundThreshold} onChangeText={v => setRuleForm(f => ({ ...f, autoRefundThreshold: v }))} />
                  </View>
                )}

                <TouchableOpacity style={[s.submitBtn, !ruleForm.name && s.submitBtnDisabled]} onPress={handleAddRule} disabled={!ruleForm.name}>
                  <Text style={s.submitBtnText}>✅ حفظ القاعدة</Text>
                </TouchableOpacity>
              </View>
            )}

            {rules.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>⚙️</Text>
                <Text style={s.emptyTitle}>لا توجد قواعد</Text>
                <Text style={s.emptyDesc}>أضف قواعد لمنع النزاعات تلقائياً</Text>
              </View>
            ) : rules.map(rule => (
              <View key={rule.id} style={[s.ruleCard, !rule.isActive && s.ruleCardInactive]}>
                <View style={s.ruleTop}>
                  <View>
                    <Text style={s.ruleName}>{rule.name}</Text>
                    <Text style={s.ruleTrigger}>{TRIGGER_LABELS[rule.triggerType] || rule.triggerType} — {rule.triggerValue}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleToggleRule(rule)}>
                    <View style={[s.toggle, rule.isActive && s.toggleOn]}>
                      <View style={[s.toggleThumb, rule.isActive && s.toggleThumbOn]} />
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={s.ruleMeta}>
                  <View style={[s.actionBadge, { backgroundColor: actionColor[rule.action] + '22' }]}>
                    <Text style={[s.actionBadgeText, { color: actionColor[rule.action] || '#6B7280' }]}>{ACTION_LABELS[rule.action] || rule.action}</Text>
                  </View>
                  <Text style={s.triggerCount}>تفعّل {rule.triggerCount}x</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── STATS TAB ── */}
        {activeTab === 'stats' && stats && (
          <>
            <View style={s.statsGrid}>
              {[
                { label: 'إجمالي التنبيهات', value: stats.total, icon: '🔔', color: '#fff' },
                { label: 'مفتوح', value: stats.open, icon: '⚠️', color: '#EF4444' },
                { label: 'محلول', value: stats.resolved, icon: '✅', color: '#10B981' },
                { label: 'استرداد تلقائي', value: stats.autoRefunds, icon: '⚡', color: '#3B82F6' },
                { label: 'مخاطر عالية', value: stats.highRisk, icon: '🚨', color: '#EF4444' },
                { label: 'متوسط المخاطرة', value: `${stats.avgRisk}%`, icon: '📊', color: '#F59E0B' },
              ].map(({ label, value, icon, color }) => (
                <View key={label} style={s.statCard}>
                  <Text style={s.statIcon}>{icon}</Text>
                  <Text style={[s.statVal, { color }]}>{value}</Text>
                  <Text style={s.statLabel}>{label}</Text>
                </View>
              ))}
            </View>

            <View style={s.savingsCard}>
              <Text style={s.savingsIcon}>💰</Text>
              <View>
                <Text style={s.savingsTitle}>مبالغ محفوظة من النزاعات</Text>
                <Text style={s.savingsAmount}>SAR {Number(stats.savedAmount).toLocaleString()}</Text>
                <Text style={s.savingsDesc}>عبر الاسترداد التلقائي الذكي</Text>
              </View>
            </View>

            {/* Risk Distribution */}
            <View style={s.distCard}>
              <Text style={s.distTitle}>توزيع المخاطر</Text>
              {[
                { label: 'عالي (70+)', pct: stats.total > 0 ? Math.round((stats.highRisk / stats.total) * 100) : 0, color: '#EF4444' },
                { label: 'متوسط (40-70)', pct: stats.total > 0 ? Math.round(((stats.total - stats.highRisk - Math.round(stats.total * 0.3)) / stats.total) * 100) : 0, color: '#F59E0B' },
                { label: 'منخفض (<40)', pct: stats.total > 0 ? 100 - Math.round((stats.highRisk / stats.total) * 100) - 20 : 0, color: '#10B981' },
              ].map(({ label, pct, color }) => (
                <View key={label} style={s.distRow}>
                  <Text style={s.distLabel}>{label}</Text>
                  <View style={s.distBar}>
                    <View style={[s.distFill, { width: `${Math.max(pct, 2)}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[s.distPct, { color }]}>{pct}%</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
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
  tabText:     { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: FONT_WEIGHT.medium },
  tabTextActive: { color: '#fff', fontWeight: FONT_WEIGHT.semibold },
  scroll:      { flex: 1 },
  scrollContent: { padding: 20 },
  filterRow:   { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip:  { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText:  { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  filterTextActive: { color: '#fff', fontWeight: FONT_WEIGHT.semibold },
  alertCard:   { backgroundColor: CARD_BG, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  alertResolved: { opacity: 0.6 },
  alertTop:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  riskBadge:   { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  riskScore:   { fontSize: 20, fontWeight: FONT_WEIGHT.bold },
  riskLabel:   { fontSize: 10, fontWeight: FONT_WEIGHT.semibold },
  alertInfo:   { flex: 1 },
  alertAmount: { color: '#fff', fontSize: 15, fontWeight: FONT_WEIGHT.semibold },
  alertCustomer: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText:  { fontSize: 12, fontWeight: FONT_WEIGHT.semibold },
  alertAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  recommendLabel: { fontSize: 13, fontWeight: FONT_WEIGHT.semibold },
  autoRefundText: { color: '#10B981', fontSize: 12 },
  alertReason: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 10 },
  resolveBtn:  { backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  resolveBtnText: { color: '#10B981', fontSize: 13, fontWeight: FONT_WEIGHT.semibold },
  addRuleBtn:  { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  addRuleBtnText: { color: '#fff', fontSize: 14, fontWeight: FONT_WEIGHT.semibold },
  ruleForm:    { backgroundColor: CARD_BG, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: BORDER, gap: 14 },
  field:       { gap: 8 },
  fieldLabel:  { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: FONT_WEIGHT.medium },
  input:       { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 14 },
  optionRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip:  { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER },
  optionChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionChipText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  optionChipTextActive: { color: '#fff', fontWeight: FONT_WEIGHT.semibold },
  submitBtn:   { backgroundColor: COLORS.primary, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: FONT_WEIGHT.bold },
  ruleCard:    { backgroundColor: CARD_BG, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
  ruleCardInactive: { opacity: 0.5 },
  ruleTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  ruleName:    { color: '#fff', fontSize: 14, fontWeight: FONT_WEIGHT.semibold },
  ruleTrigger: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 3 },
  ruleMeta:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  actionBadgeText: { fontSize: 12, fontWeight: FONT_WEIGHT.semibold },
  triggerCount: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  toggle:      { width: 40, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn:    { backgroundColor: COLORS.primary },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.5)' },
  toggleThumbOn: { backgroundColor: '#fff', transform: [{ translateX: 18 }] },
  statsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard:    { width: '30%', backgroundColor: CARD_BG, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  statIcon:    { fontSize: 20, marginBottom: 6 },
  statVal:     { color: '#fff', fontSize: 20, fontWeight: FONT_WEIGHT.bold },
  statLabel:   { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2, textAlign: 'center' },
  savingsCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', borderRadius: 16, padding: 18, marginBottom: 16 },
  savingsIcon: { fontSize: 32 },
  savingsTitle: { color: '#10B981', fontSize: 13, fontWeight: FONT_WEIGHT.semibold },
  savingsAmount: { color: '#fff', fontSize: 22, fontWeight: FONT_WEIGHT.bold, marginTop: 4 },
  savingsDesc:  { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  distCard:    { backgroundColor: CARD_BG, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },
  distTitle:   { color: '#fff', fontSize: 15, fontWeight: FONT_WEIGHT.semibold, marginBottom: 16 },
  distRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  distLabel:   { color: 'rgba(255,255,255,0.6)', fontSize: 12, width: 90 },
  distBar:     { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  distFill:    { height: '100%', borderRadius: 4 },
  distPct:     { fontSize: 12, fontWeight: FONT_WEIGHT.semibold, width: 36, textAlign: 'right' },
  empty:       { alignItems: 'center', paddingVertical: 48 },
  emptyIcon:   { fontSize: 48, marginBottom: 16 },
  emptyTitle:  { color: '#fff', fontSize: 18, fontWeight: FONT_WEIGHT.semibold, marginBottom: 8 },
  emptyDesc:   { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
});