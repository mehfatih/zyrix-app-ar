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

// ─── Method colour map ────────────────────────────────────────────────────────

const METHOD_COLORS = [
  COLORS.primary,
  COLORS.products.crypto,
  COLORS.products.cod,
  COLORS.success,
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

  // ── Loading state ──
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

  // ── Error state ──
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

          {/* ── KPI Row ── */}
          <View style={[styles.kpiRow, isRTL && styles.kpiRowRTL]}>
            <KpiCard
              label={t('analytics.volume')}
              value={`${(data.kpi.volume / 1000).toFixed(1)}k ₺`}
              style={styles.kpiCard}
            />
            <KpiCard
              label={t('analytics.success_rate')}
              value={`${data.kpi.successRate}%`}
              valueColor={COLORS.success}
              style={styles.kpiCard}
            />
          </View>
          <View style={[styles.kpiRow, isRTL && styles.kpiRowRTL]}>
            <KpiCard
              label={t('analytics.avg_tx')}
              value={`${data.kpi.avgTx.toFixed(1)} ₺`}
              style={styles.kpiCard}
            />
            <KpiCard
              label={t('analytics.customers')}
              value={String(data.kpi.customers)}
              style={styles.kpiCard}
            />
          </View>

          {/* ── Volume chart (bar) ── */}
          <ChartCard
            title={t('analytics.volume')}
            subtitle={`${range} · TRY`}
            data={data.volume}
            color={COLORS.primary}
            unit="₺"
            showAverage
            type="bar"
          />

          {/* ── Success rate chart (line) ── */}
          <ChartCard
            title={t('analytics.success_rate')}
            subtitle={`${range} · %`}
            data={data.successRate}
            color={COLORS.success}
            unit="%"
            type="line"
          />

          {/* ── Payment methods ── */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, isRTL && styles.textRight]}>
              {t('analytics.payment_methods')}
            </Text>
            <DonutLegend data={data.methods} colors={METHOD_COLORS} />
          </View>

          {/* ── Countries chart (bar) ── */}
          <ChartCard
            title={t('analytics.countries')}
            subtitle={`${range} · %`}
            data={data.countries}
            color={COLORS.products.crypto}
            unit="%"
            type="bar"
          />

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
    paddingTop: 20,
    paddingBottom: 16,
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
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 14,
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
