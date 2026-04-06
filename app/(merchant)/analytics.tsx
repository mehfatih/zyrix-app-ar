// app/(merchant)/analytics.tsx
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  I18nManager, SafeAreaView, ActivityIndicator, RefreshControl,
  Dimensions,
} from 'react-native'
import { BarChart } from 'react-native-chart-kit'
import { TabHeader } from '../../components/TabHeader';
import { COLORS } from '../../constants/colors'
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme'
import { useTranslation } from '../../hooks/useTranslation'
import { useCurrency } from '../../hooks/useCurrency'
import { analyticsApi } from '../../services/api'

const isRTL   = I18nManager.isRTL
const SW      = Dimensions.get('window').width

// ─── ألوان 4 KPI cards — كل بطاقة مختلفة تماماً ──
const KPI_THEMES = [
  // إجمالي الحجم — سيان
  {
    bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.40)', accent: '#06B6D4',
    iconBg: 'rgba(6,182,212,0.22)',
    shades: ['rgba(6,182,212,0.30)', 'rgba(6,182,212,0.60)', 'rgba(6,182,212,1.00)'],
  },
  // نسبة النجاح — زمردي
  {
    bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.40)', accent: '#10B981',
    iconBg: 'rgba(16,185,129,0.22)',
    shades: ['rgba(16,185,129,0.30)', 'rgba(16,185,129,0.60)', 'rgba(16,185,129,1.00)'],
  },
  // متوسط المعاملة — بنفسجي
  {
    bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.40)', accent: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.22)',
    shades: ['rgba(139,92,246,0.30)', 'rgba(139,92,246,0.60)', 'rgba(139,92,246,1.00)'],
  },
  // إجمالي العملاء — أمبر
  {
    bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.40)', accent: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.22)',
    shades: ['rgba(245,158,11,0.30)', 'rgba(245,158,11,0.60)', 'rgba(245,158,11,1.00)'],
  },
]

// ─── ألوان دول الخليج الأربعة — بدون العراق ────────
const GULF_COUNTRIES = [
  { key: 'SA', label: 'السعودية', flag: '🇸🇦', accent: '#06B6D4', bg: 'rgba(6,182,212,0.15)',  border: 'rgba(6,182,212,0.35)' },
  { key: 'AE', label: 'الإمارات', flag: '🇦🇪', accent: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)' },
  { key: 'QA', label: 'قطر',      flag: '🇶🇦', accent: '#EC4899', bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.35)' },
  { key: 'KW', label: 'الكويت',   flag: '🇰🇼', accent: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)' },
]

// ─── بيانات demo للمقارنة 3 أشهر ─────────────────
// في الإنتاج تُستبدل ببيانات API حقيقية
const KPI_MONTHS = ['يناير', 'فبراير', 'مارس']

const KPI_COMPARE = [
  { values: [64200, 78500, 86131],        unit: 'ر.س', label: 'حجم المبيعات — آخر 3 أشهر' },
  { values: [48.2,  53.1,  56.7],         unit: '%',   label: 'نسبة النجاح — آخر 3 أشهر' },
  { values: [289.5, 312.0, 342.5],        unit: 'ر.س', label: 'متوسط المعاملة — آخر 3 أشهر' },
  { values: [210,   268,   312],          unit: '',    label: 'إجمالي العملاء — آخر 3 أشهر' },
]

// بيانات الدول — 3 أشهر لكل دولة خليجية (بدون العراق)
const COUNTRY_COMPARE = [
  { values: [38200, 46500, 52100], unit: 'ر.س', monthLabel: 'حجم المعاملات — آخر 3 أشهر' },
  { values: [14800, 18200, 21400], unit: 'ر.س', monthLabel: 'حجم المعاملات — آخر 3 أشهر' },
  { values: [8600,  10900, 13200], unit: 'ر.س', monthLabel: 'حجم المعاملات — آخر 3 أشهر' },
  { values: [4200,  5100,  6300],  unit: 'ر.س', monthLabel: 'حجم المعاملات — آخر 3 أشهر' },
]

type RangeKey = '7d' | '30d' | '90d'

const RANGE_LABELS: Record<RangeKey, string> = { '7d': '٧ أيام', '30d': '٣٠ يوم', '90d': '٩٠ يوم' }

interface AnalyticsData {
  range: string
  kpi: { volume: number; successRate: number; avgTx: number; customers: number }
  volume:      { label: string; value: number }[]
  successRate: { label: string; value: number }[]
  methods:     { label: string; value: number }[]
  countries:   { label: string; value: number }[]
}

const METHOD_COLORS = [COLORS.primary, COLORS.products?.crypto ?? '#7C3AED', COLORS.products?.cod ?? '#F59E0B', COLORS.success]

// ─── Range Toggle ─────────────────────────────────

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

// ─── KPI Card ملون قابل للضغط ─────────────────────

function ColoredKpiCard({ label, value, icon, themeIdx, selected, onPress }: {
  label: string; value: string; icon: string;
  themeIdx: number; selected: boolean; onPress: () => void;
}) {
  const th = KPI_THEMES[themeIdx]
  return (
    <TouchableOpacity
      style={[kpiS.card, { backgroundColor: th.bg, borderColor: selected ? th.accent : th.border },
        selected && kpiS.cardSel]}
      onPress={onPress} activeOpacity={0.75}
    >
      <View style={kpiS.iconRow}>
        <View style={[kpiS.iconBubble, { backgroundColor: th.iconBg }]}>
          <Text style={kpiS.iconText}>{icon}</Text>
        </View>
        <Text style={kpiS.label} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[kpiS.value, { color: th.accent }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <View style={[kpiS.bar, { backgroundColor: th.accent, opacity: selected ? 1 : 0.5 }]} />
      {selected && <View style={[kpiS.selDot, { backgroundColor: th.accent }]} />}
    </TouchableOpacity>
  )
}
const kpiS = StyleSheet.create({
  card:     { flex: 1, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1.5, overflow: 'hidden', minHeight: 105 },
  cardSel:  { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6 },
  iconRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  iconBubble: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 14 },
  label:    { flex: 1, fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  value:    { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  bar:      { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 2 },
  selDot:   { position: 'absolute', top: 8, left: 8, width: 7, height: 7, borderRadius: 4 },
})

// ─── Pivot Chart — مقارنة 3 أشهر ─────────────────

function PivotChart({ themeIdx, kpiIdx }: { themeIdx: number; kpiIdx: number }) {
  const th   = KPI_THEMES[themeIdx]
  const d    = KPI_COMPARE[kpiIdx]
  const shds = th.shades

  const chartData = {
    labels: KPI_MONTHS,
    datasets: [{
      data: d.values,
      colors: shds.map((s) => (_op: number) => s),
    }],
  }

  const cfg = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: COLORS.cardBg,
    backgroundGradientTo:   COLORS.cardBg,
    color: (_op = 1) => th.accent,
    labelColor: () => COLORS.textSecondary,
    strokeWidth: 0, decimalPlaces: d.unit === '%' ? 1 : 0,
    propsForBackgroundLines: { strokeDasharray: '4,4', stroke: COLORS.border, strokeWidth: 1 },
    formatYLabel: (v: string) => {
      const n = parseFloat(v)
      if (isNaN(n)) return v
      if (n >= 1000) return `${(n / 1000).toFixed(0)}k`
      if (d.unit === '%') return `${n}%`
      return String(n)
    },
  }

  const change    = d.values[2] - d.values[1]
  const changePct = d.values[1] !== 0 ? ((change / d.values[1]) * 100).toFixed(1) : '0'
  const positive  = change >= 0

  return (
    <View style={[pvS.container, { borderColor: th.border }]}>
      {/* Header */}
      <View style={pvS.headerRow}>
        <View style={[pvS.dot, { backgroundColor: th.accent }]} />
        <Text style={[pvS.title, { color: th.accent }]}>{d.label}</Text>
        <View style={[pvS.badge, { backgroundColor: positive ? 'rgba(16,185,129,0.15)' : 'rgba(220,38,38,0.15)' }]}>
          <Text style={[pvS.badgeTxt, { color: positive ? '#10B981' : '#F87171' }]}>
            {positive ? '▲' : '▼'} {Math.abs(parseFloat(changePct))}%
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={pvS.legend}>
        {KPI_MONTHS.map((m, i) => (
          <View key={i} style={pvS.legItem}>
            <View style={[pvS.legDot, { backgroundColor: shds[i] }]} />
            <Text style={pvS.legTxt}>{m}</Text>
          </View>
        ))}
      </View>

      {/* Bar Chart */}
      <BarChart
        data={chartData}
        width={SW - 64}
        height={160}
        chartConfig={cfg}
        withCustomBarColorFromData
        flatColor
        showValuesOnTopOfBars
        withInnerLines
        fromZero
        yAxisLabel=""
        yAxisSuffix={d.unit === '%' ? '%' : ''}
        style={pvS.chart}
      />

      {/* Summary */}
      <View style={pvS.sumRow}>
        {d.values.map((val, i) => (
          <View key={i} style={[
            pvS.sumCell,
            i < 2 && { borderRightWidth: 1, borderRightColor: COLORS.border },
            i === 2 && { backgroundColor: `${th.accent}12` },
          ]}>
            <Text style={pvS.sumLabel}>{KPI_MONTHS[i]}</Text>
            <Text style={[pvS.sumVal, { color: i === 2 ? th.accent : COLORS.textSecondary }]}>
              {d.unit === '%' ? `${val}%` : val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(val)}
              {d.unit !== '' && d.unit !== '%' ? ` ${d.unit}` : ''}
            </Text>
          </View>
        ))}
      </View>

      {/* Insight */}
      <View style={[pvS.insight, { borderTopColor: th.border }]}>
        <Text style={pvS.insightTxt}>
          💡 {positive
            ? `تحسّن بنسبة ${Math.abs(parseFloat(changePct))}% مقارنةً بالشهر الماضي`
            : `تراجع بنسبة ${Math.abs(parseFloat(changePct))}% مقارنةً بالشهر الماضي`}
        </Text>
      </View>
    </View>
  )
}

const pvS = StyleSheet.create({
  container:  { borderRadius: RADIUS.lg, borderWidth: 1.5, backgroundColor: COLORS.cardBg, overflow: 'hidden', marginBottom: 16 },
  headerRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, gap: 8 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  title:      { flex: 1, fontSize: 13, fontWeight: '700' },
  badge:      { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeTxt:   { fontSize: 11, fontWeight: '700' },
  legend:     { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 16 },
  legItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legDot:     { width: 10, height: 10, borderRadius: 5 },
  legTxt:     { fontSize: 10, color: COLORS.textMuted },
  chart:      { marginLeft: -8, borderRadius: RADIUS.md },
  sumRow:     { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  sumCell:    { flex: 1, alignItems: 'center', paddingVertical: 10 },
  sumLabel:   { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginBottom: 3 },
  sumVal:     { fontSize: 13, fontWeight: '700' },
  insight:    { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  insightTxt: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },
})

// ─── Country Pivot — دول الخليج الأربعة ──────────

function CountryPivotChart({ selectedCountry, onSelect }: {
  selectedCountry: number; onSelect: (i: number) => void;
}) {
  const c   = GULF_COUNTRIES[selectedCountry]
  const cd  = COUNTRY_COMPARE[selectedCountry]

  // شرائح درجات اللون للبلد المختار
  const shades = [
    c.accent.replace(')', ', 0.30)').replace('rgb', 'rgba'),
    c.accent.replace(')', ', 0.60)').replace('rgb', 'rgba'),
    c.accent.replace(')', ', 1.00)').replace('rgb', 'rgba'),
  ]
  // نستخدم hex مباشرة مع opacity
  const barShades = [
    c.accent + '4D',   // 30%
    c.accent + '99',   // 60%
    c.accent,          // 100%
  ]

  const chartData = {
    labels: KPI_MONTHS,
    datasets: [{
      data: cd.values,
      colors: barShades.map((s) => (_op: number) => s),
    }],
  }

  const cfg = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: COLORS.cardBg,
    backgroundGradientTo:   COLORS.cardBg,
    color: (_op = 1) => c.accent,
    labelColor: () => COLORS.textSecondary,
    strokeWidth: 0, decimalPlaces: 0,
    propsForBackgroundLines: { strokeDasharray: '4,4', stroke: COLORS.border, strokeWidth: 1 },
    formatYLabel: (v: string) => {
      const n = parseFloat(v)
      return isNaN(n) ? v : n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n)
    },
  }

  const change    = cd.values[2] - cd.values[1]
  const changePct = cd.values[1] !== 0 ? ((change / cd.values[1]) * 100).toFixed(1) : '0'
  const positive  = change >= 0

  return (
    <View style={[ctS.wrapper, { borderColor: c.border }]}>
      {/* Country selector tabs */}
      <View style={ctS.tabs}>
        {GULF_COUNTRIES.map((gc, i) => (
          <TouchableOpacity
            key={gc.key}
            style={[ctS.tab, selectedCountry === i && { backgroundColor: gc.bg, borderColor: gc.accent, borderWidth: 1.5 }]}
            onPress={() => onSelect(i)}
            activeOpacity={0.75}
          >
            <Text style={ctS.tabFlag}>{gc.flag}</Text>
            <Text style={[ctS.tabLabel, { color: selectedCountry === i ? gc.accent : COLORS.textMuted }]}>
              {gc.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart header */}
      <View style={ctS.headerRow}>
        <Text style={ctS.tabFlag}>{c.flag}</Text>
        <Text style={[ctS.title, { color: c.accent }]}>{c.label} — آخر 3 أشهر</Text>
        <View style={[ctS.badge, { backgroundColor: positive ? 'rgba(16,185,129,0.15)' : 'rgba(220,38,38,0.15)' }]}>
          <Text style={[ctS.badgeTxt, { color: positive ? '#10B981' : '#F87171' }]}>
            {positive ? '▲' : '▼'} {Math.abs(parseFloat(changePct))}%
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={ctS.legend}>
        {KPI_MONTHS.map((m, i) => (
          <View key={i} style={ctS.legItem}>
            <View style={[ctS.legDot, { backgroundColor: barShades[i] }]} />
            <Text style={ctS.legTxt}>{m}</Text>
          </View>
        ))}
      </View>

      {/* Bar Chart */}
      <BarChart
        data={chartData}
        width={SW - 64}
        height={160}
        chartConfig={cfg}
        withCustomBarColorFromData
        flatColor
        showValuesOnTopOfBars
        withInnerLines
        fromZero
        yAxisLabel=""
        yAxisSuffix=" ر.س"
        style={ctS.chart}
      />

      {/* Summary */}
      <View style={ctS.sumRow}>
        {cd.values.map((val, i) => (
          <View key={i} style={[
            ctS.sumCell,
            i < 2 && { borderRightWidth: 1, borderRightColor: COLORS.border },
            i === 2 && { backgroundColor: `${c.accent}12` },
          ]}>
            <Text style={ctS.sumLabel}>{KPI_MONTHS[i]}</Text>
            <Text style={[ctS.sumVal, { color: i === 2 ? c.accent : COLORS.textSecondary }]}>
              {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(val)} ر.س
            </Text>
          </View>
        ))}
      </View>

      {/* Insight */}
      <View style={[ctS.insight, { borderTopColor: c.border }]}>
        <Text style={ctS.insightTxt}>
          💡 {positive
            ? `نمو ${c.label} بنسبة ${Math.abs(parseFloat(changePct))}% مقارنةً بالشهر الماضي`
            : `تراجع ${c.label} بنسبة ${Math.abs(parseFloat(changePct))}% مقارنةً بالشهر الماضي`}
        </Text>
      </View>
    </View>
  )
}

const ctS = StyleSheet.create({
  wrapper:   { borderRadius: RADIUS.lg, borderWidth: 1.5, backgroundColor: COLORS.cardBg, overflow: 'hidden', marginBottom: 16 },
  tabs:      { flexDirection: isRTL ? 'row-reverse' : 'row', padding: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab:       { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8, gap: 3, backgroundColor: COLORS.surfaceBg },
  tabFlag:   { fontSize: 18 },
  tabLabel:  { fontSize: 9, fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, gap: 8 },
  title:     { flex: 1, fontSize: 13, fontWeight: '700' },
  badge:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeTxt:  { fontSize: 11, fontWeight: '700' },
  legend:    { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 16 },
  legItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legDot:    { width: 10, height: 10, borderRadius: 5 },
  legTxt:    { fontSize: 10, color: COLORS.textMuted },
  chart:     { marginLeft: -8, borderRadius: RADIUS.md },
  sumRow:    { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  sumCell:   { flex: 1, alignItems: 'center', paddingVertical: 10 },
  sumLabel:  { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginBottom: 3 },
  sumVal:    { fontSize: 12, fontWeight: '700' },
  insight:   { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  insightTxt:{ fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },
})

// ─── Payment Methods Donut ────────────────────────

function DonutLegend({ data, colors }: { data: { label: string; value: number }[]; colors: string[] }) {
  return (
    <View style={dnS.container}>
      <View style={dnS.bar}>
        {data.map((d, i) => (
          <View key={i} style={[dnS.seg, {
            flex: d.value, backgroundColor: colors[i % colors.length],
            borderRadius: i === 0 ? 4 : i === data.length - 1 ? 4 : 0,
          }]} />
        ))}
      </View>
      <View style={dnS.legend}>
        {data.map((d, i) => (
          <View key={i} style={[dnS.row, isRTL && dnS.rowRTL]}>
            <View style={[dnS.dot, { backgroundColor: colors[i % colors.length] }]} />
            <Text style={dnS.lbl}>{d.label}</Text>
            <Text style={dnS.val}>{d.value}%</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
const dnS = StyleSheet.create({
  container: { gap: 12 },
  bar:       { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  seg:       { height: '100%' },
  legend:    { gap: 8 },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowRTL:    { flexDirection: 'row-reverse' },
  dot:       { width: 10, height: 10, borderRadius: 5 },
  lbl:       { flex: 1, fontSize: 13, color: COLORS.textSecondary },
  val:       { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
})

// ─── Main Screen ──────────────────────────────────

export default function AnalyticsScreen() {
  const { t }                   = useTranslation()
  const { format, convert, currency } = useCurrency('SAR')
  const [range, setRange]       = useState<RangeKey>('30d')
  const [data, setData]         = useState<AnalyticsData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeKpi, setActiveKpi]   = useState<number>(0)       // 0-3
  const [activeCountry, setActiveCountry] = useState<number>(0) // 0-3 خليجي

  const fmt = (n: number) => format(convert(n, 'SAR', currency), currency)

  const fetchData = useCallback(async (r: RangeKey) => {
    try {
      setError(null)
      const result = await analyticsApi.getData(r)
      // فلترة العراق من بيانات الدول
      if (result.countries) {
        result.countries = result.countries.filter(
          (c: { label: string }) => !['العراق', 'Iraq', 'IQ', 'IQD'].includes(c.label)
        )
      }
      setData(result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err) || t('common.error'))
    } finally { setLoading(false); setRefreshing(false) }
  }, [t])

  useEffect(() => { setLoading(true); fetchData(range) }, [range])
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(range) }, [range, fetchData])

  if (loading && !data) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error && !data) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.centered}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => { setLoading(true); fetchData(range) }}>
            <Text style={s.retryTxt}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (!data) return null

  const kpiCards = [
    { label: t('analytics.volume'),      value: fmt(data.kpi.volume),           icon: '💳', kpiIdx: 0 },
    { label: t('analytics.success_rate'),value: `${data.kpi.successRate}%`,      icon: '✅', kpiIdx: 1 },
    { label: t('analytics.avg_tx'),      value: fmt(data.kpi.avgTx),            icon: '📊', kpiIdx: 2 },
    { label: t('analytics.customers'),   value: String(data.kpi.customers),     icon: '👥', kpiIdx: 3 },
  ]

  return (
    <SafeAreaView style={s.safeArea}>
      <TabHeader title={t('tabs.analytics')} accentColor="#06B6D4" />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Page Header */}
        <View style={s.pageHeader}>
          <View style={[s.headerRow, isRTL && s.headerRowRTL]}>
            <View>
              <Text style={[s.pageTitle, isRTL && s.textRight]}>{t('analytics.title')}</Text>
              <Text style={[s.pageSub,   isRTL && s.textRight]}>{t('analytics.subtitle')}</Text>
            </View>
            <RangeToggle active={range} onChange={(k) => { setRange(k) }} />
          </View>
        </View>

        <View style={s.body}>

          {/* ── Hint ── */}
          <Text style={[s.hint, isRTL && s.textRight]}>اضغط على مؤشر لعرض رسمه البياني</Text>

          {/* ── KPI Cards — 4 ألوان مختلفة ── */}
          <View style={[s.kpiRow, isRTL && s.kpiRowRTL]}>
            {kpiCards.slice(0, 2).map((card, i) => (
              <ColoredKpiCard
                key={i} label={card.label} value={card.value}
                icon={card.icon} themeIdx={i}
                selected={activeKpi === i} onPress={() => setActiveKpi(i)}
              />
            ))}
          </View>
          <View style={[s.kpiRow, isRTL && s.kpiRowRTL]}>
            {kpiCards.slice(2, 4).map((card, i) => (
              <ColoredKpiCard
                key={i + 2} label={card.label} value={card.value}
                icon={card.icon} themeIdx={i + 2}
                selected={activeKpi === i + 2} onPress={() => setActiveKpi(i + 2)}
              />
            ))}
          </View>

          {/* ── Pivot Chart للخانة المختارة ── */}
          <PivotChart themeIdx={activeKpi} kpiIdx={activeKpi} />

          {/* ── طرق الدفع ── */}
          <View style={s.card}>
            <Text style={[s.cardTitle, isRTL && s.textRight]}>{t('analytics.payment_methods')}</Text>
            <DonutLegend data={data.methods} colors={METHOD_COLORS} />
          </View>

          {/* ── Country Pivot — دول الخليج فقط بدون العراق ── */}
          <Text style={[s.sectionTitle, isRTL && s.textRight]}>{t('analytics.countries')}</Text>
          <CountryPivotChart selectedCountry={activeCountry} onSelect={setActiveCountry} />

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safeArea:   { flex: 1, backgroundColor: COLORS.darkBg },
  scroll:     { paddingBottom: 120 },
  centered:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText:{ marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  errorText:  { fontSize: 15, color: COLORS.danger, textAlign: 'center', marginBottom: 16 },
  retryBtn:   { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryTxt:   { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  pageHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, backgroundColor: COLORS.deepBg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerRowRTL:{ flexDirection: 'row-reverse' },
  pageTitle:  { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  pageSub:    { fontSize: 13, color: COLORS.textSecondary },
  textRight:  { textAlign: 'right' },
  body:       { padding: 16, gap: 0 },
  hint:       { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 10 },
  kpiRow:     { flexDirection: 'row', gap: 8, marginBottom: 8 },
  kpiRowRTL:  { flexDirection: 'row-reverse' },
  card:       { backgroundColor: COLORS.cardBg, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 12 },
  cardTitle:  { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 },
  sectionTitle:{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
})