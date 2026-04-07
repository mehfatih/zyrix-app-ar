// app/(merchant)/analytics.tsx
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  I18nManager, SafeAreaView, ActivityIndicator, RefreshControl,
  Dimensions,
} from 'react-native'
import { BarChart } from 'react-native-chart-kit'
import { InnerHeader } from '../../components/InnerHeader'
import { COLORS } from '../../constants/colors'
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme'
import { useTranslation } from '../../hooks/useTranslation'
import { useCurrency } from '../../hooks/useCurrency'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { analyticsApi } from '../../services/api'

const isRTL   = I18nManager.isRTL
const SW      = Dimensions.get('window').width

const KPI_THEMES = [
  {
    bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.40)', accent: '#06B6D4',
    iconBg: 'rgba(6,182,212,0.22)',
    shades: ['rgba(6,182,212,0.30)', 'rgba(6,182,212,0.60)', 'rgba(6,182,212,1.00)'],
  },
  {
    bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.40)', accent: '#10B981',
    iconBg: 'rgba(16,185,129,0.22)',
    shades: ['rgba(16,185,129,0.30)', 'rgba(16,185,129,0.60)', 'rgba(16,185,129,1.00)'],
  },
  {
    bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.40)', accent: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.22)',
    shades: ['rgba(139,92,246,0.30)', 'rgba(139,92,246,0.60)', 'rgba(139,92,246,1.00)'],
  },
  {
    bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.40)', accent: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.22)',
    shades: ['rgba(245,158,11,0.30)', 'rgba(245,158,11,0.60)', 'rgba(245,158,11,1.00)'],
  },
]

const GULF_COUNTRIES = [
  { key: 'SA', label: 'السعودية', flag: '🇸🇦', accent: '#06B6D4', bg: 'rgba(6,182,212,0.15)',  border: 'rgba(6,182,212,0.35)' },
  { key: 'AE', label: 'الإمارات', flag: '🇦🇪', accent: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)' },
  { key: 'QA', label: 'قطر',      flag: '🇶🇦', accent: '#EC4899', bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.35)' },
  { key: 'KW', label: 'الكويت',   flag: '🇰🇼', accent: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)' },
]

const KPI_MONTHS = ['يناير', 'فبراير', 'مارس']

const KPI_COMPARE = [
  { values: [64200, 78500, 86131],  unit: 'ر.س', label: 'حجم المبيعات — آخر 3 أشهر' },
  { values: [48.2,  53.1,  56.7],   unit: '%',   label: 'نسبة النجاح — آخر 3 أشهر' },
  { values: [289.5, 312.0, 342.5],  unit: 'ر.س', label: 'متوسط المعاملة — آخر 3 أشهر' },
  { values: [210,   268,   312],    unit: '',    label: 'إجمالي العملاء — آخر 3 أشهر' },
]

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

function PivotChart({ themeIdx, kpiIdx }: { themeIdx: number; kpiIdx: number }) {
  const th   = KPI_THEMES[themeIdx]
  const d    = KPI_COMPARE[kpiIdx]
  const shds = th.shades

  const chartData = {
    labels: KPI_MONTHS,
    datasets: [{ data: d.values, colors: shds.map((s) => (_op: number) => s) }],
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
    <View style={[pivS.container, { borderColor: th.border }]}>
      <View style={pivS.headerRow}>
        <View style={[pivS.dot, { backgroundColor: th.accent }]} />
        <Text style={[pivS.title, { color: th.accent }]}>{d.label}</Text>
        <View style={[pivS.badge, { backgroundColor: positive ? 'rgba(16,185,129,0.15)' : 'rgba(220,38,38,0.15)' }]}>
          <Text style={[pivS.badgeTxt, { color: positive ? '#10B981' : '#F87171' }]}>
            {positive ? '▲' : '▼'} {Math.abs(parseFloat(changePct))}%
          </Text>
        </View>
      </View>
      <View style={pivS.legendRow}>
        {KPI_MONTHS.map((m, i) => (
          <View key={i} style={pivS.legendItem}>
            <View style={[pivS.legendDot, { backgroundColor: shds[i] }]} />
            <Text style={pivS.legendText}>{m}</Text>
          </View>
        ))}
      </View>
      <BarChart
        data={chartData}
        width={SW - 32 - 32}
        height={160}
        chartConfig={cfg}
        withCustomBarColorFromData flatColor
        showValuesOnTopOfBars withInnerLines
        style={pivS.chart}
        yAxisLabel="" yAxisSuffix={d.unit === '%' ? '%' : ''} fromZero
      />
      <View style={pivS.summaryRow}>
        {d.values.map((v, i) => (
          <View key={i} style={[
            pivS.summaryCell,
            i < 2 && { borderRightWidth: 1, borderRightColor: COLORS.border },
            i === 2 && { backgroundColor: `${th.accent}10` },
          ]}>
            <Text style={pivS.sumLabel}>{KPI_MONTHS[i]}</Text>
            <Text style={[pivS.sumValue, { color: i === 2 ? th.accent : COLORS.textSecondary }]}>
              {d.unit === '%' ? `${v}%` : v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)}
              {d.unit !== '' && d.unit !== '%' ? ` ${d.unit}` : ''}
            </Text>
          </View>
        ))}
      </View>
      <View style={[pivS.insightRow, { borderTopColor: th.border }]}>
        <Text style={[pivS.insightText, { color: COLORS.textMuted }]}>
          💡 {positive
            ? `تحسّن بنسبة ${Math.abs(parseFloat(changePct))}% مقارنةً بالشهر الماضي`
            : `تراجع بنسبة ${Math.abs(parseFloat(changePct))}% مقارنةً بالشهر الماضي`}
        </Text>
      </View>
    </View>
  )
}

const pivS = StyleSheet.create({
  container:   { borderRadius: RADIUS.lg, borderWidth: 1.5, backgroundColor: COLORS.cardBg, overflow: 'hidden', marginBottom: 12 },
  headerRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xs, gap: SPACING.sm },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  title:       { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  badge:       { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  badgeTxt:    { fontSize: 11, fontWeight: FONT_WEIGHT.bold },
  legendRow:   { flexDirection: 'row', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, gap: SPACING.lg },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendText:  { fontSize: 10, color: COLORS.textMuted },
  chart:       { marginLeft: -SPACING.sm, borderRadius: RADIUS.md },
  summaryRow:  { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  summaryCell: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm },
  sumLabel:    { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginBottom: 3 },
  sumValue:    { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  insightRow:  { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderTopWidth: 1 },
  insightText: { fontSize: FONT_SIZE.xs, lineHeight: 18 },
})

function CountryPivotChart({ selectedCountry, onSelect }: { selectedCountry: number; onSelect: (i: number) => void }) {
  const country = GULF_COUNTRIES[selectedCountry]
  const d       = COUNTRY_COMPARE[selectedCountry]

  return (
    <View>
      <View style={[cntS.tabsRow, isRTL && cntS.tabsRowRTL]}>
        {GULF_COUNTRIES.map((c, i) => (
          <TouchableOpacity
            key={c.key}
            style={[cntS.tab, { borderColor: selectedCountry === i ? c.accent : COLORS.border },
              selectedCountry === i && { backgroundColor: c.bg }]}
            onPress={() => onSelect(i)}
          >
            <Text style={cntS.tabFlag}>{c.flag}</Text>
            <Text style={[cntS.tabLabel, selectedCountry === i && { color: c.accent }]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[cntS.card, { borderColor: country.border, backgroundColor: `${country.accent}08` }]}>
        <View style={cntS.cardHeader}>
          <Text style={[cntS.cardFlag]}>{country.flag}</Text>
          <Text style={[cntS.cardTitle, { color: country.accent }]}>{country.label}</Text>
        </View>
        <View style={cntS.barsRow}>
          {d.values.map((v, i) => {
            const maxV = Math.max(...d.values)
            const h = Math.max((v / maxV) * 100, 8)
            const shade = country.accent
            return (
              <View key={i} style={cntS.barGroup}>
                <Text style={[cntS.barVal, { color: shade }]}>
                  {v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
                </Text>
                <View style={cntS.barTrack}>
                  <View style={[cntS.barFill, { height: `${h}%`, backgroundColor: shade, opacity: 0.4 + (i * 0.3) }]} />
                </View>
                <Text style={cntS.barLabel}>{KPI_MONTHS[i]}</Text>
              </View>
            )
          })}
        </View>
        <View style={[cntS.insightRow, { borderTopColor: country.border }]}>
          <Text style={cntS.insightTxt}>
            💡 نمو {(((d.values[2] - d.values[0]) / d.values[0]) * 100).toFixed(1)}% خلال 3 أشهر
          </Text>
        </View>
      </View>
    </View>
  )
}

const cntS = StyleSheet.create({
  tabsRow:    { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  tabsRowRTL: { flexDirection: 'row-reverse' },
  tab:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, backgroundColor: COLORS.cardBg },
  tabFlag:    { fontSize: 14 },
  tabLabel:   { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  card:       { borderRadius: 14, borderWidth: 1.5, overflow: 'hidden', marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  cardFlag:   { fontSize: 20 },
  cardTitle:  { fontSize: 14, fontWeight: '700' },
  barsRow:    { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-around', alignItems: 'flex-end', padding: 12, height: 110 },
  barGroup:   { alignItems: 'center', flex: 1, gap: 4 },
  barVal:     { fontSize: 11, fontWeight: '700' },
  barTrack:   { width: 32, height: 65, backgroundColor: COLORS.surfaceBg, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill:    { width: '100%', borderRadius: 6 },
  barLabel:   { fontSize: 10, color: COLORS.textMuted },
  insightRow: { paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1 },
  insightTxt: { fontSize: 11, color: COLORS.textMuted },
})

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

export default function AnalyticsScreen() {
  const { t }                         = useTranslation()
  const { format, convert, currency } = useCurrency('SAR')
  const tabBarHeight                  = useTabBarHeight()
  const [range, setRange]             = useState<RangeKey>('30d')
  const [data, setData]               = useState<AnalyticsData | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [refreshing, setRefreshing]   = useState(false)
  const [activeKpi, setActiveKpi]         = useState<number>(0)
  const [activeCountry, setActiveCountry] = useState<number>(0)

  const fmt = (n: number) => format(convert(n, 'SAR', currency), currency)

  const fetchData = useCallback(async (r: RangeKey) => {
    try {
      setError(null)
      const result = await analyticsApi.getData(r)
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
        <InnerHeader title={t('tabs.analytics')} accentColor="#06B6D4" />
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
        <InnerHeader title={t('tabs.analytics')} accentColor="#06B6D4" />
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
    { label: t('analytics.volume'),       value: fmt(data.kpi.volume),       icon: '💳', kpiIdx: 0 },
    { label: t('analytics.success_rate'), value: `${data.kpi.successRate}%`, icon: '✅', kpiIdx: 1 },
    { label: t('analytics.avg_tx'),       value: fmt(data.kpi.avgTx),        icon: '📊', kpiIdx: 2 },
    { label: t('analytics.customers'),    value: String(data.kpi.customers), icon: '👥', kpiIdx: 3 },
  ]

  return (
    <SafeAreaView style={s.safeArea}>
      <InnerHeader title={t('tabs.analytics')} accentColor="#06B6D4" />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: tabBarHeight }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
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
          <Text style={[s.hint, isRTL && s.textRight]}>اضغط على مؤشر لعرض رسمه البياني</Text>
          <View style={[s.kpiRow, isRTL && s.kpiRowRTL]}>
            {kpiCards.slice(0, 2).map((card, i) => (
              <ColoredKpiCard key={i} label={card.label} value={card.value}
                icon={card.icon} themeIdx={i} selected={activeKpi === i} onPress={() => setActiveKpi(i)} />
            ))}
          </View>
          <View style={[s.kpiRow, isRTL && s.kpiRowRTL]}>
            {kpiCards.slice(2, 4).map((card, i) => (
              <ColoredKpiCard key={i+2} label={card.label} value={card.value}
                icon={card.icon} themeIdx={i+2} selected={activeKpi === i+2} onPress={() => setActiveKpi(i+2)} />
            ))}
          </View>
          <PivotChart themeIdx={activeKpi} kpiIdx={activeKpi} />
          <View style={s.card}>
            <Text style={[s.cardTitle, isRTL && s.textRight]}>{t('analytics.payment_methods')}</Text>
            <DonutLegend data={data.methods} colors={METHOD_COLORS} />
          </View>
          <Text style={[s.sectionTitle, isRTL && s.textRight]}>{t('analytics.countries')}</Text>
          <CountryPivotChart selectedCountry={activeCountry} onSelect={setActiveCountry} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safeArea:     { flex: 1, backgroundColor: COLORS.darkBg },
  scroll:       { },
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText:  { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  errorText:    { fontSize: 15, color: COLORS.danger, textAlign: 'center', marginBottom: 16 },
  retryBtn:     { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryTxt:     { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  pageHeader:   { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, backgroundColor: COLORS.deepBg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerRowRTL: { flexDirection: 'row-reverse' },
  pageTitle:    { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  pageSub:      { fontSize: 13, color: COLORS.textSecondary },
  textRight:    { textAlign: 'right' },
  body:         { padding: 16, gap: 0 },
  hint:         { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 10 },
  kpiRow:       { flexDirection: 'row', gap: 8, marginBottom: 8 },
  kpiRowRTL:    { flexDirection: 'row-reverse' },
  card:         { backgroundColor: COLORS.cardBg, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 12 },
  cardTitle:    { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
})