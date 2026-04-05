// app/(merchant)/analytics.tsx
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  I18nManager, SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { useCurrency } from '../../hooks/useCurrency'
import { analyticsApi } from '../../services/api'
import KpiCard from '../../components/KpiCard'
import ChartCard from '../../components/ChartCard'

const isRTL = I18nManager.isRTL

type RangeKey = '7d' | '30d' | '90d'
type ActiveKpi = 'volume' | 'successRate' | 'avgTx' | 'customers' | 'all'

const RANGE_LABELS: Record<RangeKey, string> = {
  '7d':  '٧ أيام',
  '30d': '٣٠ يوم',
  '90d': '٩٠ يوم',
}

const KPI_CONFIG = {
  volume:      { color: COLORS.primary,        bgColor: 'rgba(26, 86, 219, 0.15)',   borderColor: 'rgba(26, 86, 219, 0.3)',   unit: '' },
  successRate: { color: COLORS.success,         bgColor: 'rgba(5, 150, 105, 0.15)',   borderColor: 'rgba(5, 150, 105, 0.3)',   unit: '%' },
  avgTx:       { color: COLORS.chart.purple,    bgColor: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)', unit: '' },
  customers:   { color: COLORS.chart.orange,    bgColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)', unit: '' },
}

interface AnalyticsData {
  range: string
  kpi: { volume: number; successRate: number; avgTx: number; customers: number }
  volume:      { label: string; value: number }[]
  successRate: { label: string; value: number }[]
  methods:     { label: string; value: number }[]
  countries:   { label: string; value: number }[]
}

const METHOD_COLORS  = [COLORS.primary, COLORS.products.crypto, COLORS.products.cod, COLORS.success]
const COUNTRY_COLORS = [COLORS.chart.blue, COLORS.chart.green, COLORS.chart.orange, COLORS.chart.purple, COLORS.chart.cyan]

function RangeToggle({ active, onChange }: { active: RangeKey; onChange: (k: RangeKey) => void }) {
  return (
    <View style={[toggle.wrapper, isRTL && toggle.wrapperRTL]}>
      {(['7d', '30d', '90d'] as RangeKey[]).map((k) => (
        <TouchableOpacity key={k} style={[toggle.btn, active === k && toggle.btnActive]} onPress={() => onChange(k)}>
          <Text style={[toggle.label, active === k && toggle.labelActive]}>{RANGE_LABELS[k]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function DonutLegend({ data, colors }: { data: { label: string; value: number }[]; colors: string[] }) {
  return (
    <View style={donutS.container}>
      <View style={donutS.bar}>
        {data.map((d, i) => (
          <View key={i} style={[donutS.segment, {
            flex: d.value, backgroundColor: colors[i % colors.length],
            borderRadius: i === 0 ? 4 : i === data.length - 1 ? 4 : 0,
          }]} />
        ))}
      </View>
      <View style={donutS.legend}>
        {data.map((d, i) => (
          <View key={i} style={[donutS.legendRow, isRTL && donutS.legendRowRTL]}>
            <View style={[donutS.dot, { backgroundColor: colors[i % colors.length] }]} />
            <Text style={donutS.legendLabel}>{d.label}</Text>
            <Text style={donutS.legendValue}>{d.value}%</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function MultiSeriesChart({ data, range }: { data: AnalyticsData; range: RangeKey }) {
  const series = [
    { key: 'volume'      as const, label: 'الحجم',       color: KPI_CONFIG.volume.color },
    { key: 'successRate' as const, label: 'نسبة النجاح', color: KPI_CONFIG.successRate.color },
  ]
  const labels = data.volume.map((d) => d.label)

  return (
    <View style={[styles.card, { marginBottom: 12 }]}>
      <Text style={[styles.cardTitle, isRTL && styles.textRight]}>مقارنة المؤشرات</Text>
      <Text style={[{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }, isRTL && styles.textRight]}>
        {RANGE_LABELS[range]}
      </Text>
      {series.map((s) => {
        const seriesData = data[s.key]
        const seriesMax = Math.max(...seriesData.map((d) => d.value), 1)
        return (
          <View key={s.key} style={{ marginBottom: 16 }}>
            <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 6, gap: 6 }]}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' }}>{s.label}</Text>
            </View>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-end', height: 50, gap: 3 }}>
              {seriesData.map((point, i) => {
                const heightPct = (point.value / seriesMax) * 100
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <View style={{ width: '100%', height: `${Math.max(heightPct, 4)}%`, backgroundColor: s.color, borderRadius: 3, opacity: heightPct < 20 ? 0.4 : 0.85 }} />
                  </View>
                )
              })}
            </View>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 3, marginTop: 4 }}>
              {labels.map((l, i) => (
                <Text key={i} style={{ flex: 1, fontSize: 9, color: COLORS.textMuted, textAlign: 'center' }}>{l}</Text>
              ))}
            </View>
          </View>
        )
      })}
    </View>
  )
}

function SelectableKpiCard({ kpiKey, label, value, icon, active, onPress }: {
  kpiKey: ActiveKpi; label: string; value: string; icon: string; active: boolean; onPress: () => void;
}) {
  const cfg = kpiKey !== 'all' ? KPI_CONFIG[kpiKey] : null
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress}
      style={[{ flex: 1 }, active && cfg && { borderWidth: 2, borderColor: cfg.color, borderRadius: 14 }]}>
      <KpiCard label={label} value={value} icon={icon}
        color={cfg?.color ?? COLORS.primary}
        valueColor={active && cfg ? cfg.color : undefined}
        style={{ backgroundColor: cfg?.bgColor ?? 'transparent', borderColor: active && cfg ? cfg.color : cfg?.borderColor ?? COLORS.border, borderWidth: active ? 0 : 1 }}
        compact />
    </TouchableOpacity>
  )
}

export default function AnalyticsScreen() {
  const { t } = useTranslation()
  const { format, convert, currency } = useCurrency('SAR')
  const [range, setRange] = useState<RangeKey>('30d')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeKpi, setActiveKpi] = useState<ActiveKpi>('all')

  const fmt = (amount: number) => format(convert(amount, 'SAR', currency), currency)

  const fetchData = useCallback(async (selectedRange: RangeKey) => {
    try {
      setError(null)
      const result = await analyticsApi.getData(selectedRange)
      setData(result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err) || t('common.error'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [t])

  useEffect(() => { setLoading(true); fetchData(range) }, [range])
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(range) }, [range, fetchData])

  const handleKpiPress = (key: ActiveKpi) => setActiveKpi((prev) => prev === key ? 'all' : key)

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchData(range) }}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (!data) return null

  const activeColor = activeKpi !== 'all' ? KPI_CONFIG[activeKpi].color : COLORS.primary
  const activeUnit  = activeKpi !== 'all' ? KPI_CONFIG[activeKpi].unit  : ''
  const activeData  = activeKpi === 'volume'      ? data.volume
                    : activeKpi === 'successRate' ? data.successRate
                    : activeKpi === 'avgTx'       ? data.volume.map((d) => ({ ...d, value: d.value / (data.kpi.customers || 1) }))
                    : activeKpi === 'customers'   ? data.volume.map((d, i) => ({ ...d, value: Math.round(d.value * 0.01 * (i + 1)) }))
                    : data.volume

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
      >
        <View style={styles.pageHeader}>
          <View style={[styles.headerRow, isRTL && styles.headerRowRTL]}>
            <View>
              <Text style={[styles.pageTitle, isRTL && styles.textRight]}>{t('analytics.title')}</Text>
              <Text style={[styles.pageSubtitle, isRTL && styles.textRight]}>{t('analytics.subtitle')}</Text>
            </View>
            <RangeToggle active={range} onChange={(k) => { setRange(k); setActiveKpi('all') }} />
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.kpiHint}>
            <Text style={styles.kpiHintText}>اضغط على مؤشر لعرض رسمه البياني</Text>
          </View>

          <View style={[styles.kpiRow, isRTL && styles.kpiRowRTL]}>
            <SelectableKpiCard kpiKey="volume" label={t('analytics.volume')}
              value={fmt(data.kpi.volume)} icon="💳"
              active={activeKpi === 'volume'} onPress={() => handleKpiPress('volume')} />
            <SelectableKpiCard kpiKey="successRate" label={t('analytics.success_rate')}
              value={`${data.kpi.successRate}%`} icon="✅"
              active={activeKpi === 'successRate'} onPress={() => handleKpiPress('successRate')} />
          </View>

          <View style={[styles.kpiRow, isRTL && styles.kpiRowRTL]}>
            <SelectableKpiCard kpiKey="avgTx" label={t('analytics.avg_tx')}
              value={fmt(data.kpi.avgTx)} icon="📊"
              active={activeKpi === 'avgTx'} onPress={() => handleKpiPress('avgTx')} />
            <SelectableKpiCard kpiKey="customers" label={t('analytics.customers')}
              value={String(data.kpi.customers)} icon="👥"
              active={activeKpi === 'customers'} onPress={() => handleKpiPress('customers')} />
          </View>

          <TouchableOpacity
            style={[styles.allBtn, activeKpi === 'all' && styles.allBtnActive]}
            onPress={() => setActiveKpi('all')}
          >
            <Text style={[styles.allBtnText, activeKpi === 'all' && styles.allBtnTextActive]}>
              عرض جميع المؤشرات معاً
            </Text>
          </TouchableOpacity>

          {activeKpi === 'all' ? (
            <MultiSeriesChart data={data} range={range} />
          ) : (
            <ChartCard
              title={activeKpi === 'volume' ? t('analytics.volume') : activeKpi === 'successRate' ? t('analytics.success_rate') : activeKpi === 'avgTx' ? t('analytics.avg_tx') : t('analytics.customers')}
              subtitle={`${RANGE_LABELS[range]} · ${activeUnit}`}
              data={activeData}
              color={activeColor}
              unit={activeUnit}
              showAverage={activeKpi === 'volume'}
              type={activeKpi === 'successRate' ? 'line' : 'bar'}
              style={{ backgroundColor: activeKpi !== 'all' ? KPI_CONFIG[activeKpi].bgColor : COLORS.surfaceBg, borderColor: activeColor + '50' }}
            />
          )}

          <View style={styles.card}>
            <Text style={[styles.cardTitle, isRTL && styles.textRight]}>{t('analytics.payment_methods')}</Text>
            <DonutLegend data={data.methods} colors={METHOD_COLORS} />
          </View>

          <ChartCard
            title={t('analytics.countries')}
            subtitle={`${RANGE_LABELS[range]} · %`}
            data={data.countries}
            color={COLORS.products.crypto}
            unit="%"
            type="bar"
            style={{ backgroundColor: 'rgba(124, 58, 237, 0.08)', borderColor: 'rgba(124, 58, 237, 0.25)' }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: COLORS.darkBg },
  scrollContent: { paddingBottom: 40 },
  centered:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText:   { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  errorText:     { fontSize: 15, color: COLORS.danger, textAlign: 'center', marginBottom: 16 },
  retryBtn:      { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText:     { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  pageHeader:    { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, backgroundColor: COLORS.deepBg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerRowRTL:  { flexDirection: 'row-reverse' },
  pageTitle:     { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  pageSubtitle:  { fontSize: 13, color: COLORS.textSecondary },
  textRight:     { textAlign: 'right' },
  body:          { padding: 16, gap: 0 },
  kpiRow:        { flexDirection: 'row', gap: 8, marginBottom: 8 },
  kpiRowRTL:     { flexDirection: 'row-reverse' },
  card:          { backgroundColor: COLORS.cardBg, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 12 },
  cardTitle:     { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 },
  kpiHint:       { alignItems: isRTL ? 'flex-end' : 'flex-start', marginBottom: 8 },
  kpiHintText:   { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' },
  allBtn:        { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cardBg, marginBottom: 12 },
  allBtnActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  allBtnText:    { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  allBtnTextActive: { color: COLORS.white },
})

const toggle = StyleSheet.create({
  wrapper:     { flexDirection: 'row', backgroundColor: COLORS.cardBg, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  wrapperRTL:  { flexDirection: 'row-reverse' },
  btn:         { paddingHorizontal: 12, paddingVertical: 6 },
  btnActive:   { backgroundColor: COLORS.primary },
  label:       { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  labelActive: { color: COLORS.white },
})

const donutS = StyleSheet.create({
  container:     { gap: 12 },
  bar:           { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  segment:       { height: '100%' },
  legend:        { gap: 8 },
  legendRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendRowRTL:  { flexDirection: 'row-reverse' },
  dot:           { width: 10, height: 10, borderRadius: 5 },
  legendLabel:   { flex: 1, fontSize: 13, color: COLORS.textSecondary },
  legendValue:   { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
})