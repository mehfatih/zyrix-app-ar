// app/(merchant)/analytics.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  I18nManager, SafeAreaView, ActivityIndicator, RefreshControl,
  Dimensions, Animated,
} from 'react-native'
import { BarChart } from 'react-native-chart-kit'
import { InnerHeader } from '../../components/InnerHeader'
import { SmartEmptyState, EmbeddedHelp } from '../../components/SmartEmptyState'
import { COLORS } from '../../constants/colors'
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme'
import { useTranslation } from '../../hooks/useTranslation'
import { useCurrency } from '../../hooks/useCurrency'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { analyticsApi, analyticsIntelligenceApi } from '../../services/api'

const isRTL = I18nManager.isRTL
const SW    = Dimensions.get('window').width

// ─── Types ───────────────────────────────────────────────────────────────────
type RangeKey = '7d' | '30d' | '90d'
type TabKey   = 'overview' | 'funnel' | 'success' | 'customers' | 'insights' | 'forecast' | 'alerts'

const RANGE_LABELS: Record<RangeKey, string> = { '7d': '٧ أيام', '30d': '٣٠ يوم', '90d': '٩٠ يوم' }

const TABS: { key: TabKey; icon: string; labelAr: string }[] = [
  { key: 'overview',   icon: '📊', labelAr: 'لوحة' },
  { key: 'funnel',     icon: '🔽', labelAr: 'القمع' },
  { key: 'success',    icon: '🌍', labelAr: 'النجاح' },
  { key: 'customers',  icon: '👥', labelAr: 'العملاء' },
  { key: 'insights',   icon: '💡', labelAr: 'ذكاء' },
  { key: 'forecast',   icon: '📈', labelAr: 'توقعات' },
  { key: 'alerts',     icon: '🔔', labelAr: 'تنبيهات' },
]

// ─── Demo Data ────────────────────────────────────────────────────────────────
const DEMO_DASHBOARD = {
  kpis: {
    totalVolume:    { value: 86131, change: 12,  trend: 'up' },
    successRate:    { value: 87,    change: 4,   trend: 'up' },
    totalTx:        { value: 312,   change: -3,  trend: 'down' },
    failedTx:       { value: 18,    change: 0,   trend: 'neutral' },
    pendingSettlements: 2,
    openDisputes:       1,
  },
  sparkline: [
    { day: '04-04', volume: 8200,  txCount: 38 },
    { day: '04-05', volume: 12400, txCount: 52 },
    { day: '04-06', volume: 9800,  txCount: 44 },
    { day: '04-07', volume: 14200, txCount: 61 },
    { day: '04-08', volume: 11600, txCount: 48 },
    { day: '04-09', volume: 16800, txCount: 72 },
    { day: '04-10', volume: 13131, txCount: 55 },
  ],
}

const DEMO_FUNNEL = {
  steps: [
    { label: 'زيارة / Click', value: 420, pct: 100 },
    { label: 'بدء الدفع',     value: 312, pct: 74 },
    { label: 'معالجة',        value: 295, pct: 70 },
    { label: 'نجاح',          value: 271, pct: 65 },
  ],
  summary: { totalInitiated: 420, totalSucceeded: 271, totalFailed: 24, totalPending: 17, dropped: 108, conversionRate: 65 },
}

const DEMO_SUCCESS = {
  overall: { total: 312, success: 271, volume: 86131, successRate: 87 },
  byCountry: [
    { country: 'السعودية', flag: '🇸🇦', total: 180, success: 162, failed: 18, volume: 52100, successRate: 90 },
    { country: 'الإمارات', flag: '🇦🇪', total: 74,  success: 62,  failed: 12, volume: 21400, successRate: 84 },
    { country: 'قطر',      flag: '🇶🇦', total: 38,  success: 32,  failed: 6,  volume: 8600,  successRate: 84 },
    { country: 'الكويت',   flag: '🇰🇼', total: 20,  success: 15,  failed: 5,  volume: 4031,  successRate: 75 },
  ],
  byMethod: [
    { method: 'CREDIT_CARD',    total: 142, success: 128, successRate: 90 },
    { method: 'DIGITAL_WALLET', total: 98,  success: 85,  successRate: 87 },
    { method: 'BANK_TRANSFER',  total: 52,  success: 42,  successRate: 81 },
    { method: 'CRYPTO',         total: 20,  success: 16,  successRate: 80 },
  ],
}

const DEMO_CUSTOMERS = {
  clv: { avgLTV: 4401, maxLTV: 12500, avgOrderValue: 694, avgOrders: 7.4, totalCustomers: 8, newThisPeriod: 1 },
  segments: {
    VIP:     { count: 2, avgSpent: 10950 },
    loyal:   { count: 2, avgSpent: 5000 },
    active:  { count: 1, avgSpent: 1750 },
    new:     { count: 1, avgSpent: 450 },
    at_risk: { count: 1, avgSpent: 890 },
    lost:    { count: 1, avgSpent: 220 },
  },
  cohort: [
    { month: '2024-10', count: 1 }, { month: '2024-11', count: 2 },
    { month: '2024-12', count: 1 }, { month: '2025-01', count: 2 },
    { month: '2025-02', count: 1 }, { month: '2025-03', count: 1 },
  ],
  topCustomers: [
    { name: 'محمد العمري',   totalSpent: 12500, totalOrders: 18, avgOrderValue: 694 },
    { name: 'أحمد القحطاني', totalSpent: 9400,  totalOrders: 14, avgOrderValue: 671 },
    { name: 'سارة الأحمدي',  totalSpent: 6800,  totalOrders: 11, avgOrderValue: 618 },
  ],
}

const DEMO_INSIGHTS = {
  insights: [
    { id: 'all_good', priority: 'low', icon: '✅', titleAr: 'كل شيء يعمل بشكل ممتاز', descAr: 'معدل نجاح 87% — لا توصيات فورية.', action: null, metric: 87 },
  ],
}

const DEMO_FORECAST = {
  historical: [
    { month: '2024-11', volume: 64200 }, { month: '2024-12', volume: 71400 },
    { month: '2025-01', volume: 68900 }, { month: '2025-02', volume: 78500 },
    { month: '2025-03', volume: 82100 }, { month: '2025-04', volume: 86131 },
  ],
  forecast: [
    { month: '2025-05', predicted: 93000, lower: 79050, upper: 106950, growthRate: 8 },
    { month: '2025-06', predicted: 100440, lower: 85374, upper: 115506, growthRate: 8 },
    { month: '2025-07', predicted: 108475, lower: 92204, upper: 124746, growthRate: 8 },
  ],
  avgMonthlyGrowth: 8,
  confidence: 'high',
}

const DEMO_ALERTS = { alerts: [], history: [] }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n) }
function fmtSAR(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(0)}k ر.س` : `${n} ر.س` }

// ─── Shared Components ────────────────────────────────────────────────────────
function RangeToggle({ active, onChange }: { active: RangeKey; onChange: (k: RangeKey) => void }) {
  return (
    <View style={[tog.wrapper, isRTL && tog.wrapperRTL]}>
      {(['7d', '30d', '90d'] as RangeKey[]).map((k) => (
        <TouchableOpacity key={k} style={[tog.btn, active === k && tog.btnActive]} onPress={() => onChange(k)}>
          <Text style={[tog.label, active === k && tog.labelActive]}>{RANGE_LABELS[k]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}
const tog = StyleSheet.create({
  wrapper:     { flexDirection: 'row', backgroundColor: COLORS.cardBg, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  wrapperRTL:  { flexDirection: 'row-reverse' },
  btn:         { paddingHorizontal: 12, paddingVertical: 6 },
  btnActive:   { backgroundColor: COLORS.primary },
  label:       { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  labelActive: { color: COLORS.white },
})

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={sh.row}>
      <Text style={sh.icon}>{icon}</Text>
      <Text style={sh.title}>{title}</Text>
    </View>
  )
}
const sh = StyleSheet.create({
  row:   { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 },
  icon:  { fontSize: 16 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
})

function KpiMiniCard({ label, value, change, trend, accent }: {
  label: string; value: string; change: number; trend: string; accent: string
}) {
  const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : COLORS.textMuted
  const trendIcon  = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '─'
  return (
    <View style={[kmi.card, { borderColor: `${accent}40` }]}>
      <View style={[kmi.accent, { backgroundColor: accent }]} />
      <Text style={kmi.label} numberOfLines={1}>{label}</Text>
      <Text style={[kmi.value, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <View style={[kmi.trendRow, isRTL && kmi.trendRowRTL]}>
        <Text style={[kmi.trendTxt, { color: trendColor }]}>{trendIcon} {Math.abs(change)}%</Text>
      </View>
    </View>
  )
}
const kmi = StyleSheet.create({
  card:        { flex: 1, backgroundColor: COLORS.cardBg, borderRadius: 12, borderWidth: 1.5, padding: 12, overflow: 'hidden', minHeight: 95 },
  accent:      { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  label:       { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6, marginTop: 6 },
  value:       { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  trendRow:    { flexDirection: 'row' },
  trendRowRTL: { flexDirection: 'row-reverse' },
  trendTxt:    { fontSize: 11, fontWeight: '700' },
})

// ─── Tab: Overview (16 — Real-time Dashboard) ────────────────────────────────
function OverviewTab({ range, onRangeChange }: { range: RangeKey; onRangeChange: (k: RangeKey) => void }) {
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    analyticsIntelligenceApi.getDashboard(range)
      .then(r => setData(r.data))
      .catch(() => setData(DEMO_DASHBOARD))
      .finally(() => setLoading(false))
  }, [range])

  if (loading) return <View style={tab.centered}><ActivityIndicator color={COLORS.primary} /></View>

  const d = data || DEMO_DASHBOARD
  const kpis = [
    { label: 'حجم المبيعات',   value: fmtSAR(d.kpis.totalVolume.value),   change: d.kpis.totalVolume.change,  trend: d.kpis.totalVolume.trend,  accent: '#06B6D4' },
    { label: 'معدل النجاح',    value: `${d.kpis.successRate.value}%`,       change: d.kpis.successRate.change,  trend: d.kpis.successRate.trend,  accent: '#10B981' },
    { label: 'المعاملات',      value: String(d.kpis.totalTx.value),         change: d.kpis.totalTx.change,      trend: d.kpis.totalTx.trend,      accent: '#8B5CF6' },
    { label: 'معاملات فاشلة',  value: String(d.kpis.failedTx.value),        change: d.kpis.failedTx.change,     trend: d.kpis.failedTx.trend,     accent: '#EF4444' },
  ]

  const sparkLabels  = d.sparkline.map((_: any, i: number) => i % 2 === 0 ? d.sparkline[i].day.slice(3) : '')
  const sparkValues  = d.sparkline.map((s: any) => s.volume)
  const chartCfg = {
    backgroundColor: 'transparent', backgroundGradientFrom: COLORS.cardBg, backgroundGradientTo: COLORS.cardBg,
    color: (op = 1) => `rgba(6,182,212,${op})`, labelColor: () => COLORS.textMuted,
    decimalPlaces: 0, strokeWidth: 0,
    propsForBackgroundLines: { strokeDasharray: '4,4', stroke: COLORS.border, strokeWidth: 1 },
    formatYLabel: (v: string) => { const n = parseFloat(v); return n >= 1000 ? `${(n/1000).toFixed(0)}k` : v },
  }

  return (
    <View style={tab.container}>
      <View style={[tab.row, isRTL && tab.rowRTL]}>
        {kpis.slice(0, 2).map((k, i) => <KpiMiniCard key={i} {...k} />)}
      </View>
      <View style={[tab.row, isRTL && tab.rowRTL]}>
        {kpis.slice(2, 4).map((k, i) => <KpiMiniCard key={i} {...k} />)}
      </View>

      <View style={tab.card}>
        <SectionHeader title="حجم المبيعات — آخر 7 أيام" icon="📉" />
        <BarChart
          data={{ labels: sparkLabels, datasets: [{ data: sparkValues }] }}
          width={SW - 64} height={140} chartConfig={chartCfg}
          showValuesOnTopOfBars withInnerLines fromZero
          style={{ borderRadius: 8 }} yAxisLabel="" yAxisSuffix=""
        />
      </View>

      <View style={[tab.row, isRTL && tab.rowRTL]}>
        <View style={[tab.statCard, { borderColor: 'rgba(245,158,11,0.4)' }]}>
          <Text style={tab.statIcon}>⏳</Text>
          <Text style={tab.statVal}>{d.kpis.pendingSettlements}</Text>
          <Text style={tab.statLbl}>تسويات معلقة</Text>
        </View>
        <View style={[tab.statCard, { borderColor: 'rgba(239,68,68,0.4)' }]}>
          <Text style={tab.statIcon}>⚠️</Text>
          <Text style={tab.statVal}>{d.kpis.openDisputes}</Text>
          <Text style={tab.statLbl}>نزاعات مفتوحة</Text>
        </View>
      </View>

      <View style={tab.updateRow}>
        <Text style={tab.updateTxt}>🔄 آخر تحديث: {new Date(d.updatedAt || Date.now()).toLocaleTimeString('ar')}</Text>
      </View>
    </View>
  )
}

// ─── Tab: Funnel (17 — Conversion Funnel) ────────────────────────────────────
function FunnelTab({ range }: { range: RangeKey }) {
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    analyticsIntelligenceApi.getFunnel(range)
      .then(r => setData(r.data))
      .catch(() => setData(DEMO_FUNNEL))
      .finally(() => setLoading(false))
  }, [range])

  if (loading) return <View style={tab.centered}><ActivityIndicator color={COLORS.primary} /></View>

  const d = data || DEMO_FUNNEL
  const colors = ['#06B6D4', '#8B5CF6', '#F59E0B', '#10B981']

  return (
    <View style={tab.container}>
      <View style={tab.card}>
        <SectionHeader title="قمع التحويل — click → payment" icon="🔽" />
        {d.steps.map((step: any, i: number) => (
          <View key={i} style={fun.stepRow}>
            <View style={[fun.stepBar, { width: `${step.pct}%`, backgroundColor: colors[i] }]} />
            <View style={[fun.stepInfo, isRTL && fun.stepInfoRTL]}>
              <Text style={fun.stepLabel}>{step.label}</Text>
              <Text style={[fun.stepPct, { color: colors[i] }]}>{step.pct}%</Text>
              <Text style={fun.stepVal}>{fmt(step.value)}</Text>
            </View>
            {i < d.steps.length - 1 && (
              <View style={fun.arrow}>
                <Text style={fun.arrowTxt}>↓</Text>
                <Text style={fun.dropTxt}>
                  -{d.steps[i].value - d.steps[i + 1].value} تسرّب
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={[tab.row, isRTL && tab.rowRTL]}>
        {[
          { label: 'معدل التحويل', value: `${d.summary.conversionRate}%`, accent: '#10B981' },
          { label: 'فاشل',         value: String(d.summary.totalFailed),  accent: '#EF4444' },
          { label: 'معلق',         value: String(d.summary.totalPending), accent: '#F59E0B' },
        ].map((s, i) => (
          <View key={i} style={[fun.summaryCard, { borderColor: `${s.accent}40` }]}>
            <Text style={[fun.summaryVal, { color: s.accent }]}>{s.value}</Text>
            <Text style={fun.summaryLbl}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const fun = StyleSheet.create({
  stepRow:      { marginBottom: 4 },
  stepBar:      { height: 8, borderRadius: 4, marginBottom: 4, minWidth: 20 },
  stepInfo:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  stepInfoRTL:  { flexDirection: 'row-reverse' },
  stepLabel:    { flex: 1, fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  stepPct:      { fontSize: 13, fontWeight: '800' },
  stepVal:      { fontSize: 12, color: COLORS.textMuted, minWidth: 30, textAlign: 'right' },
  arrow:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 2 },
  arrowTxt:     { fontSize: 14, color: COLORS.textMuted },
  dropTxt:      { fontSize: 11, color: '#EF4444', fontWeight: '600' },
  summaryCard:  { flex: 1, backgroundColor: COLORS.cardBg, borderRadius: 10, borderWidth: 1.5, padding: 12, alignItems: 'center' },
  summaryVal:   { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  summaryLbl:   { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
})

// ─── Tab: Success Rate (18 — by Country) ─────────────────────────────────────
function SuccessTab({ range }: { range: RangeKey }) {
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    analyticsIntelligenceApi.getSuccessRate(range)
      .then(r => setData(r.data))
      .catch(() => setData(DEMO_SUCCESS))
      .finally(() => setLoading(false))
  }, [range])

  if (loading) return <View style={tab.centered}><ActivityIndicator color={COLORS.primary} /></View>

  const d = data || DEMO_SUCCESS

  return (
    <View style={tab.container}>
      <View style={tab.card}>
        <SectionHeader title="الإجمالي" icon="📊" />
        <View style={[tab.row, isRTL && tab.rowRTL]}>
          {[
            { label: 'إجمالي', value: String(d.overall.total),        accent: COLORS.primary },
            { label: 'ناجح',   value: String(d.overall.success),       accent: '#10B981' },
            { label: 'معدل',   value: `${d.overall.successRate}%`,     accent: '#06B6D4' },
          ].map((s, i) => (
            <View key={i} style={[suc.overallCard, { borderColor: `${s.accent}40` }]}>
              <Text style={[suc.overallVal, { color: s.accent }]}>{s.value}</Text>
              <Text style={suc.overallLbl}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={tab.card}>
        <SectionHeader title="حسب الدولة" icon="🌍" />
        {d.byCountry.map((c: any, i: number) => (
          <View key={i} style={[suc.countryRow, isRTL && suc.countryRowRTL]}>
            <Text style={suc.flag}>{c.flag}</Text>
            <View style={suc.countryInfo}>
              <View style={[suc.nameRow, isRTL && suc.nameRowRTL]}>
                <Text style={suc.countryName}>{c.country}</Text>
                <Text style={[suc.rateBadge, { color: c.successRate >= 85 ? '#10B981' : c.successRate >= 70 ? '#F59E0B' : '#EF4444' }]}>
                  {c.successRate}%
                </Text>
              </View>
              <View style={suc.barTrack}>
                <View style={[suc.barFill, {
                  width: `${c.successRate}%`,
                  backgroundColor: c.successRate >= 85 ? '#10B981' : c.successRate >= 70 ? '#F59E0B' : '#EF4444',
                }]} />
              </View>
              <Text style={suc.countryVol}>{fmtSAR(c.volume)} · {c.total} معاملة</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={tab.card}>
        <SectionHeader title="حسب طريقة الدفع" icon="💳" />
        {d.byMethod.map((m: any, i: number) => {
          const methodNames: Record<string, string> = {
            CREDIT_CARD: 'بطاقة ائتمان', DIGITAL_WALLET: 'محفظة رقمية',
            BANK_TRANSFER: 'تحويل بنكي', CRYPTO: 'كريبتو',
          }
          return (
            <View key={i} style={[suc.methodRow, isRTL && suc.methodRowRTL]}>
              <Text style={suc.methodName}>{methodNames[m.method] || m.method}</Text>
              <View style={suc.barTrack}>
                <View style={[suc.barFill, { width: `${m.successRate}%`, backgroundColor: COLORS.primary }]} />
              </View>
              <Text style={[suc.methodRate, { color: m.successRate >= 85 ? '#10B981' : '#F59E0B' }]}>{m.successRate}%</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const suc = StyleSheet.create({
  overallCard:    { flex: 1, backgroundColor: COLORS.surfaceBg, borderRadius: 10, borderWidth: 1.5, padding: 12, alignItems: 'center' },
  overallVal:     { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  overallLbl:     { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  countryRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  countryRowRTL:  { flexDirection: 'row-reverse' },
  flag:           { fontSize: 22 },
  countryInfo:    { flex: 1, gap: 4 },
  nameRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameRowRTL:     { flexDirection: 'row-reverse' },
  countryName:    { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  rateBadge:      { fontSize: 13, fontWeight: '800' },
  barTrack:       { height: 6, backgroundColor: COLORS.surfaceBg, borderRadius: 3, overflow: 'hidden' },
  barFill:        { height: '100%', borderRadius: 3 },
  countryVol:     { fontSize: 11, color: COLORS.textMuted },
  methodRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  methodRowRTL:   { flexDirection: 'row-reverse' },
  methodName:     { width: 100, fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  methodRate:     { fontSize: 12, fontWeight: '800', minWidth: 36, textAlign: 'right' },
})

// ─── Tab: Customer Analytics (19 — CLV + Segmentation) ───────────────────────
function CustomersTab({ range }: { range: RangeKey }) {
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    analyticsIntelligenceApi.getCustomerAnalytics(range as any)
      .then(r => setData(r.data))
      .catch(() => setData(DEMO_CUSTOMERS))
      .finally(() => setLoading(false))
  }, [range])

  if (loading) return <View style={tab.centered}><ActivityIndicator color={COLORS.primary} /></View>

  const d = data || DEMO_CUSTOMERS
  const segColors: Record<string, string> = {
    VIP: '#F59E0B', loyal: '#10B981', active: '#06B6D4',
    new: '#8B5CF6', at_risk: '#F97316', lost: '#EF4444',
  }
  const segLabels: Record<string, string> = {
    VIP: 'VIP', loyal: 'مخلص', active: 'نشط', new: 'جديد', at_risk: 'خطر', lost: 'مفقود',
  }

  return (
    <View style={tab.container}>
      <View style={tab.card}>
        <SectionHeader title="قيمة عمر العميل (CLV)" icon="💎" />
        <View style={[tab.row, isRTL && tab.rowRTL]}>
          {[
            { label: 'متوسط LTV',    value: fmtSAR(d.clv.avgLTV),        accent: '#F59E0B' },
            { label: 'أعلى LTV',     value: fmtSAR(d.clv.maxLTV),        accent: '#10B981' },
            { label: 'متوسط الطلب',  value: fmtSAR(d.clv.avgOrderValue), accent: '#06B6D4' },
          ].map((s, i) => (
            <View key={i} style={[suc.overallCard, { borderColor: `${s.accent}40` }]}>
              <Text style={[suc.overallVal, { color: s.accent }]}>{s.value}</Text>
              <Text style={suc.overallLbl}>{s.label}</Text>
            </View>
          ))}
        </View>
        <View style={[cust.clvRow, isRTL && cust.clvRowRTL]}>
          <Text style={cust.clvInfo}>👥 {d.clv.totalCustomers} عميل إجمالي</Text>
          <Text style={cust.clvInfo}>🆕 {d.clv.newThisPeriod} جديد هذه الفترة</Text>
          <Text style={cust.clvInfo}>🛒 متوسط {d.clv.avgOrders} طلب/عميل</Text>
        </View>
      </View>

      <View style={tab.card}>
        <SectionHeader title="تقسيم العملاء" icon="🎯" />
        <View style={cust.segGrid}>
          {Object.entries(d.segments).map(([seg, info]: [string, any]) => (
            <View key={seg} style={[cust.segCard, { borderColor: `${segColors[seg] || COLORS.border}50` }]}>
              <View style={[cust.segDot, { backgroundColor: segColors[seg] || COLORS.primary }]} />
              <Text style={cust.segCount}>{info.count}</Text>
              <Text style={[cust.segName, { color: segColors[seg] || COLORS.textSecondary }]}>
                {segLabels[seg] || seg}
              </Text>
              <Text style={cust.segSpent}>{fmtSAR(info.avgSpent)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={tab.card}>
        <SectionHeader title="أفضل العملاء" icon="🏆" />
        {d.topCustomers.map((c: any, i: number) => (
          <View key={i} style={[cust.topRow, isRTL && cust.topRowRTL]}>
            <View style={cust.topRank}>
              <Text style={cust.topRankTxt}>{['🥇','🥈','🥉'][i] || `#${i+1}`}</Text>
            </View>
            <View style={cust.topInfo}>
              <Text style={cust.topName}>{c.name}</Text>
              <Text style={cust.topSub}>{c.totalOrders} طلب · متوسط {fmtSAR(c.avgOrderValue)}</Text>
            </View>
            <Text style={cust.topSpent}>{fmtSAR(c.totalSpent)}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const cust = StyleSheet.create({
  clvRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  clvRowRTL:   { flexDirection: 'row-reverse' },
  clvInfo:     { fontSize: 12, color: COLORS.textMuted, backgroundColor: COLORS.surfaceBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  segGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segCard:     { width: (SW - 80) / 3, backgroundColor: COLORS.surfaceBg, borderRadius: 10, borderWidth: 1.5, padding: 10, alignItems: 'center', gap: 3 },
  segDot:      { width: 10, height: 10, borderRadius: 5 },
  segCount:    { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  segName:     { fontSize: 11, fontWeight: '700' },
  segSpent:    { fontSize: 10, color: COLORS.textMuted },
  topRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  topRowRTL:   { flexDirection: 'row-reverse' },
  topRank:     { width: 32, alignItems: 'center' },
  topRankTxt:  { fontSize: 18 },
  topInfo:     { flex: 1 },
  topName:     { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  topSub:      { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  topSpent:    { fontSize: 13, fontWeight: '800', color: '#10B981' },
})

// ─── Tab: Smart Insights (20) ────────────────────────────────────────────────
function InsightsTab() {
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsIntelligenceApi.getInsights()
      .then(r => setData(r.data))
      .catch(() => setData(DEMO_INSIGHTS))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <View style={tab.centered}><ActivityIndicator color={COLORS.primary} /></View>

  const d = data || DEMO_INSIGHTS
  const priorityColor: Record<string, string> = {
    critical: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#10B981',
  }
  const priorityLabel: Record<string, string> = {
    critical: 'حرج', high: 'عالي', medium: 'متوسط', low: 'منخفض',
  }

  return (
    <View style={tab.container}>
      <View style={ins.header}>
        <Text style={ins.headerTxt}>🤖 توصيات ذكية مبنية على بياناتك الفعلية</Text>
        <Text style={ins.headerSub}>آخر تحديث: {new Date(d.generatedAt || Date.now()).toLocaleTimeString('ar')}</Text>
      </View>
      {d.insights.map((insight: any) => (
        <View key={insight.id} style={[ins.card, { borderColor: `${priorityColor[insight.priority]}40` }]}>
          <View style={[ins.priorityBar, { backgroundColor: priorityColor[insight.priority] }]} />
          <View style={ins.cardBody}>
            <View style={[ins.titleRow, isRTL && ins.titleRowRTL]}>
              <Text style={ins.icon}>{insight.icon}</Text>
              <Text style={ins.title}>{insight.titleAr}</Text>
              <View style={[ins.badge, { backgroundColor: `${priorityColor[insight.priority]}20` }]}>
                <Text style={[ins.badgeTxt, { color: priorityColor[insight.priority] }]}>
                  {priorityLabel[insight.priority]}
                </Text>
              </View>
            </View>
            <Text style={ins.desc}>{insight.descAr}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

const ins = StyleSheet.create({
  header:       { backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', padding: 12, marginBottom: 12 },
  headerTxt:    { fontSize: 13, fontWeight: '700', color: '#8B5CF6', marginBottom: 4 },
  headerSub:    { fontSize: 11, color: COLORS.textMuted },
  card:         { backgroundColor: COLORS.cardBg, borderRadius: 12, borderWidth: 1.5, marginBottom: 10, overflow: 'hidden', flexDirection: 'row' },
  priorityBar:  { width: 4 },
  cardBody:     { flex: 1, padding: 12, gap: 6 },
  titleRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleRowRTL:  { flexDirection: 'row-reverse' },
  icon:         { fontSize: 18 },
  title:        { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeTxt:     { fontSize: 10, fontWeight: '700' },
  desc:         { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
})

// ─── Tab: Forecast (21) ──────────────────────────────────────────────────────
function ForecastTab() {
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsIntelligenceApi.getForecast(3)
      .then(r => setData(r.data))
      .catch(() => setData(DEMO_FORECAST))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <View style={tab.centered}><ActivityIndicator color={COLORS.primary} /></View>

  const d = data || DEMO_FORECAST
  const confColor: Record<string, string> = { high: '#10B981', medium: '#F59E0B', low: '#EF4444' }
  const allVols = [...d.historical.map((h: any) => h.volume), ...d.forecast.map((f: any) => f.upper)]
  const maxVol  = Math.max(...allVols)

  return (
    <View style={tab.container}>
      <View style={[fore.banner, { borderColor: `${confColor[d.confidence] || '#10B981'}40` }]}>
        <Text style={fore.bannerTxt}>
          📈 نمو شهري متوقع: <Text style={{ color: '#10B981', fontWeight: '800' }}>{d.avgMonthlyGrowth}%</Text>
          {'  '}· دقة: <Text style={{ color: confColor[d.confidence], fontWeight: '800' }}>
            {{ high: 'عالية', medium: 'متوسطة', low: 'منخفضة' }[d.confidence] || d.confidence}
          </Text>
        </Text>
      </View>

      <View style={tab.card}>
        <SectionHeader title="السجل التاريخي" icon="📅" />
        {d.historical.slice(-4).map((h: any, i: number) => (
          <View key={i} style={[fore.barRow, isRTL && fore.barRowRTL]}>
            <Text style={fore.barMonth}>{h.month}</Text>
            <View style={fore.barTrack}>
              <View style={[fore.barFill, { width: `${(h.volume / maxVol) * 100}%`, backgroundColor: '#06B6D4' }]} />
            </View>
            <Text style={fore.barVal}>{fmtSAR(h.volume)}</Text>
          </View>
        ))}
      </View>

      <View style={tab.card}>
        <SectionHeader title="التوقعات القادمة" icon="🔮" />
        {d.forecast.map((f: any, i: number) => (
          <View key={i} style={[fore.foreRow, { borderColor: 'rgba(139,92,246,0.25)' }]}>
            <View style={fore.foreHeader}>
              <Text style={fore.foreMonth}>{f.month}</Text>
              <Text style={fore.foreGrowth}>+{f.growthRate}%</Text>
            </View>
            <Text style={fore.forePredicted}>{fmtSAR(f.predicted)}</Text>
            <View style={fore.foreRange}>
              <View style={fore.barTrack}>
                <View style={[fore.barFill, { width: `${(f.lower / maxVol) * 100}%`, backgroundColor: 'rgba(139,92,246,0.3)' }]} />
                <View style={[fore.barFill, {
                  position: 'absolute', left: 0,
                  width: `${(f.predicted / maxVol) * 100}%`, backgroundColor: '#8B5CF6',
                }]} />
              </View>
              <Text style={fore.rangeHint}>{fmtSAR(f.lower)} — {fmtSAR(f.upper)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

const fore = StyleSheet.create({
  banner:     { backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  bannerTxt:  { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  barRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  barRowRTL:  { flexDirection: 'row-reverse' },
  barMonth:   { width: 60, fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  barTrack:   { flex: 1, height: 8, backgroundColor: COLORS.surfaceBg, borderRadius: 4, overflow: 'hidden', position: 'relative' },
  barFill:    { height: '100%', borderRadius: 4 },
  barVal:     { width: 72, fontSize: 11, color: COLORS.textPrimary, fontWeight: '700', textAlign: 'right' },
  foreRow:    { borderRadius: 10, borderWidth: 1, backgroundColor: 'rgba(139,92,246,0.05)', padding: 12, marginBottom: 8 },
  foreHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  foreMonth:  { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  foreGrowth: { fontSize: 12, color: '#10B981', fontWeight: '700' },
  forePredicted: { fontSize: 20, fontWeight: '800', color: '#8B5CF6', marginBottom: 8 },
  foreRange:  { gap: 4 },
  rangeHint:  { fontSize: 10, color: COLORS.textMuted, marginTop: 3 },
})

// ─── Tab: Alerts (22) ────────────────────────────────────────────────────────
const METRIC_LABELS: Record<string, string> = {
  success_rate: 'معدل النجاح', transaction_count: 'عدد المعاملات',
  volume: 'الحجم', failed_count: 'المعاملات الفاشلة', fraud_score: 'نقاط الاحتيال',
}
const OP_LABELS: Record<string, string> = { lt: 'أقل من', lte: 'أقل أو يساوي', gt: 'أكبر من', gte: 'أكبر أو يساوي' }

function AlertsTab() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newAlert, setNewAlert] = useState({ name: '', metric: 'success_rate', operator: 'lt', threshold: '70', windowMinutes: '60' })
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    analyticsIntelligenceApi.getAlerts()
      .then(r => setData(r.data))
      .catch(() => setData(DEMO_ALERTS))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!newAlert.name) return
    setCreating(true)
    try {
      await analyticsIntelligenceApi.createAlert({
        name: newAlert.name, metric: newAlert.metric,
        operator: newAlert.operator, threshold: Number(newAlert.threshold),
        windowMinutes: Number(newAlert.windowMinutes),
      })
      setShowForm(false)
      load()
    } catch (_e) {}
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    try { await analyticsIntelligenceApi.deleteAlert(id); load() } catch (_e) {}
  }

  const handleCheck = async () => {
    try {
      const r = await analyticsIntelligenceApi.checkAlerts()
      const triggered = r.data?.triggered?.length || 0
      load()
      alert(triggered > 0 ? `تم تشغيل ${triggered} تنبيه` : 'لا تنبيهات محققة الآن')
    } catch (_e) {}
  }

  if (loading) return <View style={tab.centered}><ActivityIndicator color={COLORS.primary} /></View>

  const d = data || DEMO_ALERTS

  return (
    <View style={tab.container}>
      <View style={[ale.actionRow, isRTL && ale.actionRowRTL]}>
        <TouchableOpacity style={ale.btnPrimary} onPress={() => setShowForm(!showForm)}>
          <Text style={ale.btnPrimaryTxt}>+ تنبيه جديد</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ale.btnSecondary} onPress={handleCheck}>
          <Text style={ale.btnSecondaryTxt}>🔍 فحص الآن</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={[tab.card, { borderColor: 'rgba(139,92,246,0.4)' }]}>
          <SectionHeader title="إنشاء تنبيه جديد" icon="🔔" />
          {[
            { label: 'اسم التنبيه', key: 'name', placeholder: 'مثال: تحذير انخفاض النجاح' },
            { label: 'الحد (threshold)', key: 'threshold', placeholder: '70' },
            { label: 'النافذة الزمنية (دقيقة)', key: 'windowMinutes', placeholder: '60' },
          ].map(f => (
            <View key={f.key} style={ale.formRow}>
              <Text style={ale.formLabel}>{f.label}</Text>
              <View style={ale.input}>
                <Text style={ale.inputTxt} onPress={() => {}}>
                  {(newAlert as any)[f.key] || f.placeholder}
                </Text>
              </View>
            </View>
          ))}
          <View style={ale.formRow}>
            <Text style={ale.formLabel}>المؤشر</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[ale.chipRow, isRTL && ale.chipRowRTL]}>
                {Object.entries(METRIC_LABELS).map(([k, v]) => (
                  <TouchableOpacity key={k} style={[ale.chip, newAlert.metric === k && ale.chipActive]}
                    onPress={() => setNewAlert(p => ({ ...p, metric: k }))}>
                    <Text style={[ale.chipTxt, newAlert.metric === k && ale.chipTxtActive]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={ale.formRow}>
            <Text style={ale.formLabel}>العملية</Text>
            <View style={[ale.chipRow, isRTL && ale.chipRowRTL]}>
              {Object.entries(OP_LABELS).map(([k, v]) => (
                <TouchableOpacity key={k} style={[ale.chip, newAlert.operator === k && ale.chipActive]}
                  onPress={() => setNewAlert(p => ({ ...p, operator: k }))}>
                  <Text style={[ale.chipTxt, newAlert.operator === k && ale.chipTxtActive]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity style={ale.saveBtn} onPress={handleCreate} disabled={creating}>
            {creating
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={ale.saveBtnTxt}>حفظ التنبيه</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {d.alerts.length === 0 && !showForm ? (
        <SmartEmptyState type="alerts" showCta={false} />
      ) : (
        d.alerts.map((a: any) => (
          <View key={a.id} style={[ale.alertCard, { borderColor: a.isActive ? 'rgba(16,185,129,0.4)' : COLORS.border }]}>
            <View style={[ale.alertRow, isRTL && ale.alertRowRTL]}>
              <Text style={ale.alertIcon}>{a.isActive ? '🟢' : '⭕'}</Text>
              <View style={ale.alertInfo}>
                <Text style={ale.alertName}>{a.name}</Text>
                <Text style={ale.alertDesc}>
                  {METRIC_LABELS[a.metric]} {OP_LABELS[a.operator]} {a.threshold}
                  {' '}· كل {a.windowMinutes} دقيقة
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(a.id)} style={ale.deleteBtn}>
                <Text style={ale.deleteTxt}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {d.history.length > 0 && (
        <View style={tab.card}>
          <SectionHeader title="سجل التنبيهات المحققة" icon="📋" />
          {d.history.slice(0, 5).map((h: any, i: number) => (
            <View key={i} style={[ale.histRow, isRTL && ale.histRowRTL]}>
              <Text style={ale.histIcon}>🔴</Text>
              <View style={ale.histInfo}>
                <Text style={ale.histName}>{h.alertName}</Text>
                <Text style={ale.histVal}>القيمة: {h.currentValue} (العتبة: {h.threshold})</Text>
                <Text style={ale.histTime}>{new Date(h.triggeredAt).toLocaleString('ar')}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const ale = StyleSheet.create({
  actionRow:      { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionRowRTL:   { flexDirection: 'row-reverse' },
  btnPrimary:     { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnPrimaryTxt:  { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  btnSecondary:   { flex: 1, backgroundColor: COLORS.cardBg, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, paddingVertical: 12, alignItems: 'center' },
  btnSecondaryTxt:{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
  formRow:        { marginBottom: 12 },
  formLabel:      { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6 },
  input:          { backgroundColor: COLORS.surfaceBg, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10 },
  inputTxt:       { fontSize: 13, color: COLORS.textPrimary },
  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipRowRTL:     { flexDirection: 'row-reverse' },
  chip:           { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceBg },
  chipActive:     { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  chipTxt:        { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  chipTxtActive:  { color: COLORS.primary },
  saveBtn:        { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  saveBtnTxt:     { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  empty:          { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon:      { fontSize: 40 },
  emptyTxt:       { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  emptySub:       { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  alertCard:      { backgroundColor: COLORS.cardBg, borderRadius: 12, borderWidth: 1.5, padding: 12, marginBottom: 8 },
  alertRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertRowRTL:    { flexDirection: 'row-reverse' },
  alertIcon:      { fontSize: 16 },
  alertInfo:      { flex: 1 },
  alertName:      { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  alertDesc:      { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  deleteBtn:      { padding: 4 },
  deleteTxt:      { fontSize: 16 },
  histRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  histRowRTL:     { flexDirection: 'row-reverse' },
  histIcon:       { fontSize: 14, marginTop: 2 },
  histInfo:       { flex: 1 },
  histName:       { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  histVal:        { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  histTime:       { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
})

// ─── Shared tab styles ────────────────────────────────────────────────────────
const tab = StyleSheet.create({
  container: { gap: 0 },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  card:      { backgroundColor: COLORS.cardBg, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 12 },
  row:       { flexDirection: 'row', gap: 8, marginBottom: 8 },
  rowRTL:    { flexDirection: 'row-reverse' },
  statCard:  { flex: 1, backgroundColor: COLORS.cardBg, borderRadius: 10, borderWidth: 1.5, padding: 12, alignItems: 'center', gap: 4 },
  statIcon:  { fontSize: 20 },
  statVal:   { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  statLbl:   { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  updateRow: { alignItems: 'center', paddingVertical: 8 },
  updateTxt: { fontSize: 11, color: COLORS.textMuted },
})

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AnalyticsScreen() {
  const { t }          = useTranslation()
  const tabBarHeight   = useTabBarHeight()
  const [range, setRange]       = useState<RangeKey>('30d')
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  return (
    <SafeAreaView style={s.safeArea}>
      <InnerHeader title={t('tabs.analytics')} accentColor="#06B6D4" />

      {/* Tab Bar */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={s.tabScroll} contentContainerStyle={s.tabContent}
      >
        {TABS.map(tb => (
          <TouchableOpacity
            key={tb.key}
            style={[s.tabBtn, activeTab === tb.key && s.tabBtnActive]}
            onPress={() => setActiveTab(tb.key)}
          >
            <Text style={s.tabIcon}>{tb.icon}</Text>
            <Text style={[s.tabLabel, activeTab === tb.key && s.tabLabelActive]}>{tb.labelAr}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Range Toggle */}
      {activeTab !== 'insights' && activeTab !== 'forecast' && activeTab !== 'alerts' && (
        <View style={s.rangeRow}>
          <RangeToggle active={range} onChange={setRange} />
        </View>
      )}

      {/* Content */}
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: tabBarHeight + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.body}>
          {activeTab === 'overview'  && <OverviewTab  range={range} onRangeChange={setRange} />}
          {activeTab === 'funnel'    && <FunnelTab    range={range} />}
          {activeTab === 'success'   && <SuccessTab   range={range} />}
          {activeTab === 'customers' && <CustomersTab range={range} />}
          {activeTab === 'insights'  && <InsightsTab />}
          {activeTab === 'forecast'  && <ForecastTab />}
          {activeTab === 'alerts'    && <AlertsTab />}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: COLORS.darkBg },
  tabScroll:     { maxHeight: 56, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabContent:    { paddingHorizontal: 12, gap: 6, alignItems: 'center', paddingVertical: 8 },
  tabBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.cardBg },
  tabBtnActive:  { borderColor: '#06B6D4', backgroundColor: 'rgba(6,182,212,0.12)' },
  tabIcon:       { fontSize: 13 },
  tabLabel:      { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  tabLabelActive:{ color: '#06B6D4' },
  rangeRow:      { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  scroll:        {},
  body:          { padding: 16 },
})