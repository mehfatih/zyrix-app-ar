// app/(merchant)/analytics.tsx
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  I18nManager,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { analyticsApi } from '../../services/api'
import KpiCard from '../../components/KpiCard'
import ChartCard from '../../components/ChartCard'

const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────────────────────────────────

type RangeKey = '7d' | '30d' | '90d'

interface AnalyticsData {
  range: string
  kpi: { volume: number; successRate: number; avgTx: number; customers: number }
  volume: { label: string; value: number }[]
  successRate: { label: string; value: number }[]
  methods: { label: string; value: number }[]
  countries: { label: string; value: number }[]
}

// ─── KPI Configuration (unique accent colors) ───────────────────────────────

type KpiKey = 'volume' | 'successRate' | 'avgTx' | 'customers'

interface KpiConfig {
  key: KpiKey
  labelKey: string
  color: string
  unit: string
  chartType: 'bar' | 'line'
  dataKey: 'volume' | 'successRate'
}

const KPI_CONFIG: KpiConfig[] = [
  { key: 'volume',      labelKey: 'analytics.volume',       color: COLORS.primary,          unit: '$', chartType: 'bar',  dataKey: 'volume' },
  { key: 'successRate', labelKey: 'analytics.success_rate',  color: COLORS.success,          unit: '%', chartType: 'line', dataKey: 'successRate' },
  { key: 'avgTx',       labelKey: 'analytics.avg_tx',        color: COLORS.products.crypto,  unit: '$', chartType: 'bar',  dataKey: 'volume' },
  { key: 'customers',   labelKey: 'analytics.customers',     color: COLORS.warning,          unit: '',  chartType: 'bar',  dataKey: 'volume' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function RangeToggle({
  active,
  onChange,
}: {
  active: RangeKey
  onChange: (k: RangeKey) => void
}) {
  const keys: RangeKey[] = ['7d', '30d', '90d']
  return (
    <View style={[toggle.wrapper, isRTL && toggle.wrapperRTL]}>
      {keys.map((k) => (
        <TouchableOpacity
          key={k}
          style={[toggle.btn, active === k && toggle.btnActive]}
          onPress={() => onChange(k)}
        >
          <Text style={[toggle.label, active === k && toggle.labelActive]}>
            {k}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function DonutLegend({
  data,
  colors,
}: {
  data: { label: string; value: number }[]
  colors: string[]
}) {
  return (
    <View style={donut.container}>
      {/* Simple segmented bar */}
      <View style={donut.bar}>
        {data.map((d, i) => (
          <View
            key={i}
            style={[
              donut.segment,
              {
                flex: d.value,
                backgroundColor: colors[i % colors.length],
                borderRadius: i === 0 ? 4 : i === data.length - 1 ? 4 : 0,
              },
            ]}
          />
        ))}
      </View>
      {/* Legend rows */}
      <View style={donut.legend}>
        {data.map((d, i) => (
          <View
            key={i}
            style={[donut.legendRow, isRTL && donut.legendRowRTL]}
          >
            <View
              style={[
                donut.dot,
                { backgroundColor: colors[i % colors.length] },
              ]}
            />
            <Text style={donut.legendLabel}>{d.label}</Text>
            <Text style={donut.legendValue}>{d.value}%</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const { t } = useTranslation()
  const [range, setRange] = useState<RangeKey>('30d')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedKpi, setSelectedKpi] = useState<KpiKey>('volume')

  const fetchData = useCallback(async (selectedRange: RangeKey) => {
    try {
      setError(null)
      const result = await analyticsApi.getData(selectedRange)
      if (!result || !result.kpi || !result.volume || !result.successRate || !result.methods || !result.countries) {
        throw new Error(t('common.error'))
      }
      setData(result)
    } catch (err: unknown) {
      let message = t('common.error')
      if (err instanceof Error) {
        message = err.message
      } else if (typeof err === 'string') {
        message = err
      } else if (err && typeof err === 'object' && 'error' in err) {
        message = String((err as Record<string, unknown>).error)
      }
      setError(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [t])

  useEffect(() => {
    setLoading(true)
    fetchData(range)
  }, [range])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchData(range)
  }, [range, fetchData])

  const handleRangeChange = (newRange: RangeKey) => {
    setRange(newRange)
  }

  // Get active KPI config
  const activeKpi = KPI_CONFIG.find(k => k.key === selectedKpi) ?? KPI_CONFIG[0]

  // Method colors for donut
  const METHOD_COLORS = [COLORS.primary, COLORS.products.crypto, COLORS.products.cod, COLORS.success]

  // Get KPI display value
  const getKpiValue = (key: KpiKey): string => {
    if (!data) return '—'
    switch (key) {
      case 'volume': return `$${(data.kpi.volume / 1000).toFixed(1)}k`
      case 'successRate': return `${data.kpi.successRate}%`
      case 'avgTx': return `$${data.kpi.avgTx.toFixed(1)}`
      case 'customers': return String(data.kpi.customers)
    }
  }

  // Loading state
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

  // Error state
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >

        {/* ── Page header ── */}
        <View style={styles.pageHeader}>
          <View style={[styles.headerRow, isRTL && styles.headerRowRTL]}>
            <View>
              <Text style={[styles.pageTitle, isRTL && styles.textRight]}>
                {t('analytics.title')}
              </Text>
              <Text style={[styles.pageSubtitle, isRTL && styles.textRight]}>
                {t('analytics.subtitle')}
              </Text>
            </View>
            <RangeToggle active={range} onChange={handleRangeChange} />
          </View>
        </View>

        <View style={styles.body}>

          {/* ── Interactive KPI Cards ── */}
          <View style={[styles.kpiRow, isRTL && styles.kpiRowRTL]}>
            {KPI_CONFIG.slice(0, 2).map((kpi) => (
              <TouchableOpacity
                key={kpi.key}
                style={[
                  styles.kpiCard,
                  selectedKpi === kpi.key && { borderColor: kpi.color, borderWidth: 2 },
                ]}
                onPress={() => setSelectedKpi(kpi.key)}
                activeOpacity={0.7}
              >
                <KpiCard
                  label={t(kpi.labelKey)}
                  value={getKpiValue(kpi.key)}
                  color={kpi.color}
                  valueColor={selectedKpi === kpi.key ? kpi.color : undefined}
                  style={{ borderWidth: 0 }}
                />
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.kpiRow, isRTL && styles.kpiRowRTL]}>
            {KPI_CONFIG.slice(2, 4).map((kpi) => (
              <TouchableOpacity
                key={kpi.key}
                style={[
                  styles.kpiCard,
                  selectedKpi === kpi.key && { borderColor: kpi.color, borderWidth: 2 },
                ]}
                onPress={() => setSelectedKpi(kpi.key)}
                activeOpacity={0.7}
              >
                <KpiCard
                  label={t(kpi.labelKey)}
                  value={getKpiValue(kpi.key)}
                  color={kpi.color}
                  valueColor={selectedKpi === kpi.key ? kpi.color : undefined}
                  style={{ borderWidth: 0 }}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Dynamic Chart (changes based on selected KPI) ── */}
          <ChartCard
            title={t(activeKpi.labelKey)}
            subtitle={`${range} · ${activeKpi.unit || '#'}`}
            data={data[activeKpi.dataKey]}
            color={activeKpi.color}
            unit={activeKpi.unit}
            showAverage={activeKpi.key === 'volume'}
            type={activeKpi.chartType}
          />

          {/* ── Payment Methods (framed section) ── */}
          <View style={styles.framedSection}>
            <View style={styles.framedHeader}>
              <Text style={[styles.framedTitle, isRTL && styles.textRight]}>
                {t('analytics.payment_methods')}
              </Text>
            </View>
            <View style={styles.framedBody}>
              <DonutLegend data={data.methods} colors={METHOD_COLORS} />
            </View>
          </View>

          {/* ── Countries (framed section) ── */}
          <View style={styles.framedSection}>
            <View style={styles.framedHeader}>
              <Text style={[styles.framedTitle, isRTL && styles.textRight]}>
                {t('analytics.countries')}
              </Text>
            </View>
            <View style={styles.framedBody}>
              <ChartCard
                title=""
                data={data.countries}
                color={COLORS.products.crypto}
                unit="%"
                type="bar"
                style={{ borderWidth: 0, padding: 0, marginBottom: 0 }}
              />
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerRowRTL: {
    flexDirection: 'row-reverse',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  textRight: {
    textAlign: 'right',
  },
  body: {
    padding: 16,
    gap: 0,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  kpiRowRTL: {
    flexDirection: 'row-reverse',
  },
  kpiCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  framedSection: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  framedHeader: {
    backgroundColor: COLORS.surfaceBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  framedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  framedBody: {
    backgroundColor: COLORS.cardBg,
    padding: 16,
  },
})

const toggle = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  wrapperRTL: {
    flexDirection: 'row-reverse',
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnActive: {
    backgroundColor: COLORS.primary,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  labelActive: {
    color: COLORS.white,
  },
})

const donut = StyleSheet.create({
  container: {
    gap: 12,
  },
  bar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    gap: 2,
  },
  segment: {
    height: '100%',
  },
  legend: {
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendRowRTL: {
    flexDirection: 'row-reverse',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
})
