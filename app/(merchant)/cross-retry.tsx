import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, I18nManager, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { FONT_WEIGHT } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';
import InnerHeader from '../../components/InnerHeader';
import Toast from '../../components/Toast';
import { crossRetryApi } from '../../services/api';

const isRTL = I18nManager.isRTL;

// ─── Demo Data ────────────────────────────────────────────────
const DEMO_STATS = {
  period: '30d',
  total: 38,
  succeeded: 29,
  exhausted: 6,
  pending: 2,
  cancelled: 1,
  recoveryRate: 76,
  avgAttempts: 1.8,
  gatewayStats: [
    { gatewayId: 'gw1', gatewayName: 'Stripe',       attempts: 22, successes: 19, successRate: 86 },
    { gatewayId: 'gw2', gatewayName: 'Tap Payments',  attempts: 18, successes: 14, successRate: 78 },
    { gatewayId: 'gw3', gatewayName: 'iyzico',        attempts: 12, successes: 8,  successRate: 67 },
    { gatewayId: 'gw4', gatewayName: 'PayTR',         attempts: 6,  successes: 2,  successRate: 33 },
  ],
};

const DEMO_RETRIES = [
  { id: 'r1', transactionId: 'TX-001', originalGatewayId: 'gw4', amount: 850,  currency: 'SAR', country: 'SA', status: 'SUCCEEDED',  attemptCount: 2, maxAttempts: 3, createdAt: new Date(Date.now() - 1*86400000).toISOString(), attempts: [{ id: 'a1', gatewayName: 'PayTR',       attemptNum: 1, status: 'FAILED',  responseMs: 520, errorCode: 'INSUFFICIENT_FUNDS' }, { id: 'a2', gatewayName: 'Tap Payments', attemptNum: 2, status: 'SUCCESS', responseMs: 390, errorCode: null }] },
  { id: 'r2', transactionId: 'TX-002', originalGatewayId: 'gw3', amount: 1200, currency: 'TRY', country: 'TR', status: 'SUCCEEDED',  attemptCount: 1, maxAttempts: 3, createdAt: new Date(Date.now() - 2*86400000).toISOString(), attempts: [{ id: 'a3', gatewayName: 'Stripe',       attemptNum: 1, status: 'SUCCESS', responseMs: 310, errorCode: null }] },
  { id: 'r3', transactionId: 'TX-003', originalGatewayId: 'gw2', amount: 450,  currency: 'SAR', country: 'SA', status: 'EXHAUSTED',  attemptCount: 3, maxAttempts: 3, createdAt: new Date(Date.now() - 3*86400000).toISOString(), attempts: [{ id: 'a4', gatewayName: 'Stripe',       attemptNum: 1, status: 'FAILED',  responseMs: 450, errorCode: 'CARD_DECLINED' }, { id: 'a5', gatewayName: 'iyzico',       attemptNum: 2, status: 'FAILED',  responseMs: 380, errorCode: 'CARD_DECLINED' }, { id: 'a6', gatewayName: 'PayTR',        attemptNum: 3, status: 'FAILED',  responseMs: 490, errorCode: 'CARD_DECLINED' }] },
  { id: 'r4', transactionId: 'TX-004', originalGatewayId: 'gw1', amount: 2300, currency: 'AED', country: 'AE', status: 'PENDING',    attemptCount: 1, maxAttempts: 3, createdAt: new Date(Date.now() - 0.5*86400000).toISOString(), attempts: [{ id: 'a7', gatewayName: 'Tap Payments', attemptNum: 1, status: 'FAILED',  responseMs: 600, errorCode: 'TIMEOUT' }] },
];

// ─── Helpers ──────────────────────────────────────────────────
const statusColor = (s: string) =>
  s === 'SUCCEEDED' ? COLORS.success :
  s === 'PENDING'   ? COLORS.warning :
  s === 'EXHAUSTED' ? COLORS.danger  : COLORS.textSecondary;

const statusLabel: Record<string, string> = {
  SUCCEEDED: 'نجح',
  PENDING:   'جارٍ',
  EXHAUSTED: 'استُنفد',
  CANCELLED: 'ملغى',
};

const attemptStatusColor = (s: string) =>
  s === 'SUCCESS' ? COLORS.success : s === 'FAILED' ? COLORS.danger : COLORS.warning;

// ─── Component ────────────────────────────────────────────────
export default function CrossRetryScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [tab, setTab] = useState<'overview' | 'sessions'>('overview');
  const [stats, setStats]     = useState<any>(null);
  const [retries, setRetries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type?: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [stRes, retRes] = await Promise.all([
        crossRetryApi.getStats(30),
        crossRetryApi.list(),
      ]);
      setStats(stRes?.data || DEMO_STATS);
      setRetries(retRes?.data?.retries || DEMO_RETRIES);
    } catch {
      setStats(DEMO_STATS);
      setRetries(DEMO_RETRIES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (retryId: string) => {
    try {
      await crossRetryApi.cancel(retryId);
      showToast('تم إلغاء جلسة الإعادة');
      load(true);
    } catch { showToast('فشل الإلغاء', 'error'); }
  };

  const tabBarHeight = 92;

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <InnerHeader title="إعادة المحاولة الذكية" accentColor={COLORS.warning} onBack={() => router.back()} />
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.warning} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <InnerHeader title="إعادة المحاولة الذكية" accentColor={COLORS.warning} onBack={() => router.back()} />

      {/* Tabs */}
      <View style={s.tabs}>
        {(['overview', 'sessions'] as const).map((t_) => (
          <TouchableOpacity key={t_} style={[s.tabBtn, tab === t_ && s.tabActive]} onPress={() => setTab(t_)}>
            <Text style={[s.tabLabel, tab === t_ && s.tabLabelActive]}>
              {t_ === 'overview' ? '📊 نظرة عامة' : '🔄 الجلسات'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.warning} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Overview Tab ── */}
        {tab === 'overview' && stats && (
          <>
            {/* KPI Row */}
            <View style={s.kpiRow}>
              <View style={[s.kpiCard, { borderColor: COLORS.success + '40' }]}>
                <Text style={[s.kpiVal, { color: COLORS.success }]}>{stats.recoveryRate}%</Text>
                <Text style={s.kpiLabel}>معدل الاسترداد</Text>
              </View>
              <View style={[s.kpiCard, { borderColor: COLORS.primary + '40' }]}>
                <Text style={[s.kpiVal, { color: COLORS.primary }]}>{stats.total}</Text>
                <Text style={s.kpiLabel}>إجمالي الجلسات</Text>
              </View>
              <View style={[s.kpiCard, { borderColor: COLORS.warning + '40' }]}>
                <Text style={[s.kpiVal, { color: COLORS.warning }]}>{stats.avgAttempts}</Text>
                <Text style={s.kpiLabel}>متوسط المحاولات</Text>
              </View>
            </View>

            {/* Status breakdown */}
            <View style={s.card}>
              <Text style={s.cardTitle}>📋 توزيع الحالات</Text>
              {[
                { label: 'نجحت',      val: stats.succeeded, color: COLORS.success },
                { label: 'استُنفدت',  val: stats.exhausted, color: COLORS.danger },
                { label: 'جارية',     val: stats.pending,   color: COLORS.warning },
                { label: 'ملغاة',     val: stats.cancelled, color: COLORS.textSecondary },
              ].map((item) => (
                <View key={item.label} style={s.statusRow}>
                  <View style={s.statusLeft}>
                    <View style={[s.dot, { backgroundColor: item.color }]} />
                    <Text style={s.statusLabel}>{item.label}</Text>
                  </View>
                  <View style={s.barWrap}>
                    <View style={[s.barFill, { width: `${stats.total > 0 ? (item.val / stats.total) * 100 : 0}%` as any, backgroundColor: item.color }]} />
                  </View>
                  <Text style={[s.statusVal, { color: item.color }]}>{item.val}</Text>
                </View>
              ))}
            </View>

            {/* Gateway Performance */}
            <Text style={s.sectionTitle}>🏦 أداء البوابات في الإعادة</Text>
            {stats.gatewayStats.map((gw: any) => (
              <View key={gw.gatewayId} style={s.card}>
                <View style={s.gwRow}>
                  <Text style={s.gwName}>{gw.gatewayName}</Text>
                  <Text style={[s.gwRate, { color: gw.successRate > 75 ? COLORS.success : gw.successRate > 50 ? COLORS.warning : COLORS.danger }]}>
                    {gw.successRate}%
                  </Text>
                </View>
                <View style={s.barBg}>
                  <View style={[s.barFill, { width: `${gw.successRate}%` as any, backgroundColor: gw.successRate > 75 ? COLORS.success : gw.successRate > 50 ? COLORS.warning : COLORS.danger }]} />
                </View>
                <View style={s.gwStats}>
                  <Text style={s.gwStat}>{gw.attempts} محاولة</Text>
                  <Text style={s.gwStat}>{gw.successes} نجاح</Text>
                  <Text style={s.gwStat}>{gw.attempts - gw.successes} فشل</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── Sessions Tab ── */}
        {tab === 'sessions' && (
          <>
            <Text style={s.sectionTitle}>جلسات الإعادة ({retries.length})</Text>
            {retries.map((r) => (
              <View key={r.id} style={s.card}>
                <TouchableOpacity onPress={() => setExpanded(expanded === r.id ? null : r.id)} activeOpacity={0.8}>
                  <View style={s.sessionRow}>
                    <View style={s.sessionLeft}>
                      <View style={[s.dot, { backgroundColor: statusColor(r.status) }]} />
                      <View>
                        <Text style={s.sessionTx}>{r.transactionId || r.id.slice(0, 8)}</Text>
                        <Text style={s.sessionMeta}>{r.country} · {r.currency} · {Number(r.amount).toLocaleString()}</Text>
                      </View>
                    </View>
                    <View style={s.sessionRight}>
                      <Text style={[s.sessionStatus, { color: statusColor(r.status) }]}>{statusLabel[r.status] || r.status}</Text>
                      <Text style={s.sessionAttempts}>{r.attemptCount}/{r.maxAttempts}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Expanded attempts */}
                {expanded === r.id && (
                  <View style={s.attemptsBox}>
                    <Text style={s.attemptsTitle}>المحاولات:</Text>
                    {r.attempts.map((a: any) => (
                      <View key={a.id} style={s.attemptRow}>
                        <View style={[s.attemptNum, { backgroundColor: attemptStatusColor(a.status) + '22' }]}>
                          <Text style={[s.attemptNumText, { color: attemptStatusColor(a.status) }]}>{a.attemptNum}</Text>
                        </View>
                        <View style={s.attemptInfo}>
                          <Text style={s.attemptGw}>{a.gatewayName}</Text>
                          {a.errorCode && <Text style={s.attemptErr}>{a.errorCode}</Text>}
                        </View>
                        <View style={s.attemptRight}>
                          <Text style={[s.attemptStatus, { color: attemptStatusColor(a.status) }]}>
                            {a.status === 'SUCCESS' ? '✓' : '✗'}
                          </Text>
                          {a.responseMs && <Text style={s.attemptMs}>{a.responseMs}ms</Text>}
                        </View>
                      </View>
                    ))}
                    {r.status === 'PENDING' && (
                      <TouchableOpacity style={s.cancelBtn} onPress={() => handleCancel(r.id)}>
                        <Text style={s.cancelText}>إلغاء الجلسة</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>

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
  tabActive:       { backgroundColor: COLORS.warning + '22' },
  tabLabel:        { fontSize: 12, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },
  tabLabelActive:  { color: COLORS.warning, fontWeight: FONT_WEIGHT.semibold },
  sectionTitle:    { fontSize: 15, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text, marginBottom: 12 },
  card:            { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 12 },
  cardTitle:       { fontSize: 13, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text, marginBottom: 12 },
  kpiRow:          { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginBottom: 12 },
  kpiCard:         { flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1 },
  kpiVal:          { fontSize: 22, fontWeight: FONT_WEIGHT.bold },
  kpiLabel:        { fontSize: 10, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  statusRow:       { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  statusLeft:      { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, width: 70 },
  statusLabel:     { fontSize: 12, color: COLORS.text },
  barWrap:         { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  barBg:           { height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginVertical: 6, overflow: 'hidden' },
  barFill:         { height: 6, borderRadius: 3 },
  statusVal:       { fontSize: 13, fontWeight: FONT_WEIGHT.bold, width: 28, textAlign: 'right' },
  dot:             { width: 8, height: 8, borderRadius: 4 },
  gwRow:           { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' },
  gwName:          { fontSize: 14, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  gwRate:          { fontSize: 16, fontWeight: FONT_WEIGHT.bold },
  gwStats:         { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 16, marginTop: 4 },
  gwStat:          { fontSize: 12, color: COLORS.textSecondary },
  sessionRow:      { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionLeft:     { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 },
  sessionRight:    { alignItems: isRTL ? 'flex-start' : 'flex-end' },
  sessionTx:       { fontSize: 13, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  sessionMeta:     { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  sessionStatus:   { fontSize: 12, fontWeight: FONT_WEIGHT.semibold },
  sessionAttempts: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  attemptsBox:     { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  attemptsTitle:   { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  attemptRow:      { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  attemptNum:      { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  attemptNumText:  { fontSize: 13, fontWeight: FONT_WEIGHT.bold },
  attemptInfo:     { flex: 1 },
  attemptGw:       { fontSize: 13, color: COLORS.text, fontWeight: FONT_WEIGHT.medium },
  attemptErr:      { fontSize: 11, color: COLORS.danger, marginTop: 2 },
  attemptRight:    { alignItems: isRTL ? 'flex-start' : 'flex-end' },
  attemptStatus:   { fontSize: 16, fontWeight: FONT_WEIGHT.bold },
  attemptMs:       { fontSize: 11, color: COLORS.textSecondary },
  cancelBtn:       { marginTop: 10, backgroundColor: COLORS.danger + '15', paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.danger + '40' },
  cancelText:      { fontSize: 13, color: COLORS.danger, fontWeight: FONT_WEIGHT.semibold },
});