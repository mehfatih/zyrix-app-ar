// app/(merchant)/transactions.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  I18nManager, SafeAreaView, ListRenderItemInfo, ActivityIndicator,
  RefreshControl, Linking, Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { LineChart, BarChart } from 'react-native-chart-kit'
import { COLORS } from '../../constants/colors'
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme'
import { useTranslation } from '../../hooks/useTranslation'
import { useCurrency } from '../../hooks/useCurrency'
import { transactionsApi } from '../../services/api'
import TransactionRow from '../../components/TransactionRow'
import type { Transaction } from '../../types'
import { useToast } from '../../components/Toast'

const isRTL = I18nManager.isRTL
const SCREEN_WIDTH = Dimensions.get('window').width

// ─── ألوان مميزة لكل KPI card ────────────────────
const KPI_THEMES = [
  // نسبة النجاح — زمردي
  { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.40)', accent: '#10B981', iconBg: 'rgba(16, 185, 129, 0.22)', chartLine: '#10B981', chartGrad: '#10B981' },
  // العدد — وردي/فوشيا
  { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.40)', accent: '#EC4899', iconBg: 'rgba(236, 72, 153, 0.22)', chartLine: '#EC4899', chartGrad: '#EC4899' },
  // الحجم — سماوي/سيان
  { bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.40)', accent: '#06B6D4', iconBg: 'rgba(6, 182, 212, 0.22)', chartLine: '#06B6D4', chartGrad: '#06B6D4' },
]

// ─── Demo chart data لكل KPI ─────────────────────
// في الإنتاج يُستبدل بـ API data حقيقية
const CHART_DEMO: Record<number, { labels: string[]; data: number[]; unit: string; title: string }> = {
  0: {
    labels: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
    data: [72, 68, 81, 75, 87, 56, 83],
    unit: '%',
    title: 'معدل النجاح اليومي',
  },
  1: {
    labels: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
    data: [24, 18, 32, 28, 41, 15, 30],
    unit: '',
    title: 'عدد المعاملات اليومي',
  },
  2: {
    labels: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
    data: [12400, 9800, 18600, 15200, 22100, 8300, 17500],
    unit: 'ر.س',
    title: 'حجم المبيعات اليومي',
  },
}

type FilterKey = 'all' | 'success' | 'pending' | 'failed'

const FILTERS = [
  { key: 'success' as FilterKey, labelKey: 'transactions.filter_success' },
  { key: 'pending' as FilterKey, labelKey: 'transactions.filter_pending' },
  { key: 'failed'  as FilterKey, labelKey: 'transactions.filter_failed' },
  { key: 'all'     as FilterKey, labelKey: 'transactions.filter_all' },
]

// ─── Colored KPI Card ────────────────────────────

function ColoredKpiCard({
  label, value, icon, themeIndex, selected, onPress,
}: {
  label: string; value: string; icon: string;
  themeIndex: number; selected: boolean; onPress: () => void;
}) {
  const theme = KPI_THEMES[themeIndex % KPI_THEMES.length]
  return (
    <TouchableOpacity
      style={[
        kpiS.card,
        { backgroundColor: theme.bg, borderColor: theme.border },
        selected && kpiS.cardSelected,
        selected && { borderColor: theme.accent, borderWidth: 2 },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={kpiS.iconRow}>
        <View style={[kpiS.iconBubble, { backgroundColor: theme.iconBg }]}>
          <Text style={kpiS.iconText}>{icon}</Text>
        </View>
        <Text style={kpiS.label} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[kpiS.value, { color: theme.accent }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {/* خط زخرفي سفلي — يظهر دائماً، يضيء عند التحديد */}
      <View style={[kpiS.accentBar, { backgroundColor: theme.accent, opacity: selected ? 1 : 0.5 }]} />
      {/* نقطة تحديد */}
      {selected && <View style={[kpiS.selectedDot, { backgroundColor: theme.accent }]} />}
    </TouchableOpacity>
  )
}

const kpiS = StyleSheet.create({
  card: {
    flex: 1, borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1.5, overflow: 'hidden', minHeight: 100,
  },
  cardSelected: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm },
  iconBubble: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 14 },
  label: { flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },
  value: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.bold, marginBottom: SPACING.sm },
  accentBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 2 },
  selectedDot: { position: 'absolute', top: 8, left: 8, width: 8, height: 8, borderRadius: 4 },
})

// ─── Interactive Pivot Chart ──────────────────────

function PivotChart({ selectedKpi, stats, fmt }: {
  selectedKpi: number;
  stats: { totalVolume: number; totalCount: number; successRate: string };
  fmt: (n: number) => string;
}) {
  const theme = KPI_THEMES[selectedKpi % KPI_THEMES.length]
  const chartData = CHART_DEMO[selectedKpi]
  if (!chartData) return null

  // Format large numbers for Y axis
  const formatYLabel = (v: string) => {
    const n = parseFloat(v)
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`
    return v
  }

  const config = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: COLORS.cardBg,
    backgroundGradientTo: COLORS.cardBg,
    color: (opacity = 1) => `${theme.chartLine}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    labelColor: () => COLORS.textSecondary,
    strokeWidth: 2.5,
    decimalPlaces: selectedKpi === 2 ? 0 : 1,
    propsForDots: { r: '5', strokeWidth: '2', stroke: theme.chartLine, fill: COLORS.cardBg },
    propsForBackgroundLines: { strokeDasharray: '4,4', stroke: COLORS.border, strokeWidth: 1 },
    formatYLabel,
  }

  // Summary stats لكل KPI
  const summaryItems = [
    selectedKpi === 0 ? [
      { label: 'أعلى يوم', value: `${Math.max(...chartData.data)}%`, color: theme.accent },
      { label: 'أقل يوم',  value: `${Math.min(...chartData.data)}%`, color: COLORS.textMuted },
      { label: 'المتوسط',  value: `${(chartData.data.reduce((a, b) => a + b, 0) / chartData.data.length).toFixed(1)}%`, color: theme.accent },
    ] : selectedKpi === 1 ? [
      { label: 'أعلى يوم', value: String(Math.max(...chartData.data)), color: theme.accent },
      { label: 'أقل يوم',  value: String(Math.min(...chartData.data)), color: COLORS.textMuted },
      { label: 'الإجمالي', value: String(stats.totalCount), color: theme.accent },
    ] : [
      { label: 'أعلى يوم', value: fmt(Math.max(...chartData.data)), color: theme.accent },
      { label: 'أقل يوم',  value: fmt(Math.min(...chartData.data)), color: COLORS.textMuted },
      { label: 'الإجمالي', value: fmt(stats.totalVolume), color: theme.accent },
    ]
  ][0]

  return (
    <View style={[pivotS.container, { borderColor: theme.border }]}>
      {/* Header */}
      <View style={pivotS.header}>
        <View style={[pivotS.dot, { backgroundColor: theme.accent }]} />
        <Text style={[pivotS.title, { color: theme.accent }]}>{chartData.title}</Text>
        <Text style={pivotS.period}>آخر 7 أيام</Text>
      </View>

      {/* Chart */}
      <LineChart
        data={{ labels: chartData.labels, datasets: [{ data: chartData.data }] }}
        width={SCREEN_WIDTH - 32 - 32}
        height={160}
        chartConfig={config}
        bezier
        withInnerLines={false}
        withOuterLines={false}
        withHorizontalLabels
        withVerticalLabels
        style={pivotS.chart}
        formatYLabel={formatYLabel}
      />

      {/* Summary Stats */}
      <View style={pivotS.statsRow}>
        {summaryItems.map((item, i) => (
          <View key={i} style={[pivotS.statItem, i < summaryItems.length - 1 && { borderRightWidth: 1, borderRightColor: COLORS.border }]}>
            <Text style={pivotS.statLabel}>{item.label}</Text>
            <Text style={[pivotS.statValue, { color: item.color }]}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const pivotS = StyleSheet.create({
  container: {
    marginHorizontal: 12, marginVertical: 8,
    backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg,
    borderWidth: 1.5, overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  period: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  chart: { marginLeft: -8, borderRadius: RADIUS.md },
  statsRow: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  statItem: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
  },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginBottom: 3 },
  statValue: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
})

// ─── Main Screen ──────────────────────────────────

export default function TransactionsScreen() {
  const { t } = useTranslation()
  const { format, convert, currency } = useCurrency('SAR')
  const router = useRouter()
  const { showToast } = useToast()

  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [allTx, setAllTx] = useState<Transaction[]>([])
  const [stats, setStats] = useState({ totalVolume: 0, totalCount: 0, successRate: '0' })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedKpi, setSelectedKpi] = useState(2) // الحجم محدد افتراضياً

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const data = await transactionsApi.list({ limit: 50 })
      setAllTx(data.transactions)
      setStats(data.stats)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err) || t('common.error'))
    } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchData() }, [])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const fmt = useCallback((amount: number) => format(convert(amount, 'SAR', currency), currency), [format, convert, currency])

  const filtered = useMemo(() => allTx.filter((tx) => {
    const matchesFilter = filter === 'all' || tx.status === filter
    const query = search.toLowerCase()
    const matchesSearch = !query || tx.id.toLowerCase().includes(query) || tx.name.toLowerCase().includes(query) || String(tx.amount).includes(query)
    return matchesFilter && matchesSearch
  }), [filter, search, allTx])

  const handleRowPress = (id: string) => {
    router.push({ pathname: '/(merchant)/transaction-detail', params: { id } })
  }

  const kpiItems = [
    { label: t('transactions.success_rate'), value: `${Number(stats.successRate)}%`,  icon: '✅', themeIndex: 0 },
    { label: t('transactions.total_count'),  value: String(stats.totalCount),          icon: '📋', themeIndex: 1 },
    { label: t('transactions.total_volume'), value: fmt(stats.totalVolume),            icon: '💳', themeIndex: 2 },
  ]

  const renderItem = ({ item, index }: ListRenderItemInfo<Transaction>) => (
    <TransactionRow {...item} index={index} onPress={() => handleRowPress(item.id)} />
  )

  const renderHeader = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerTopRow, isRTL && styles.headerTopRowRTL]}>
          <Text style={[styles.subtitle, isRTL && styles.textRight]}>{t('transactions.subtitle')}</Text>
          <TouchableOpacity
            style={styles.csvBtn}
            onPress={() => {
              const url = 'https://api.zyrix.co/api/export/transactions?format=csv'
              Linking.openURL(url).catch(() => showToast(t('common.coming_soon'), 'info'))
            }}
          >
            <Text style={styles.csvBtnText}>{t('transactions.export_csv')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── KPI Cards — 3 ألوان مميزة، قابلة للضغط ── */}
      <View style={[styles.kpiRow, isRTL && styles.kpiRowRTL]}>
        {kpiItems.map((item, i) => (
          <ColoredKpiCard
            key={i}
            label={item.label}
            value={item.value}
            icon={item.icon}
            themeIndex={item.themeIndex}
            selected={selectedKpi === i}
            onPress={() => setSelectedKpi(i)}
          />
        ))}
      </View>

      {/* ── Pivot Chart — يتغير حسب الخانة المختارة ── */}
      <PivotChart selectedKpi={selectedKpi} stats={stats} fmt={fmt} />

      {/* Search */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={[styles.searchInput, isRTL && styles.searchInputRTL]}
          placeholder={t('transactions.search')}
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          textAlign={isRTL ? 'right' : 'left'}
        />
      </View>

      {/* Filters */}
      <View style={[styles.filterRow, isRTL && styles.filterRowRTL]}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>
              {t(f.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  )

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>—</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.cardBg },
  listContent: { paddingBottom: 32 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, backgroundColor: COLORS.surfaceBg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  headerTopRowRTL: { flexDirection: 'row-reverse' },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500', flex: 1 },
  csvBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  csvBtnText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  textRight: { textAlign: 'right' },
  kpiRow: { flexDirection: isRTL ? 'row-reverse' : 'row', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4, gap: 8, backgroundColor: COLORS.cardBg },
  kpiRowRTL: { flexDirection: 'row-reverse' },
  searchWrapper: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.cardBg },
  searchInput: { height: 40, backgroundColor: COLORS.surfaceBg, borderRadius: 10, paddingHorizontal: 14, fontSize: 13, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.borderLight },
  searchInputRTL: { textAlign: 'right' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8, backgroundColor: COLORS.cardBg, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterRowRTL: { flexDirection: 'row-reverse' },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.cardBgLight, borderWidth: 1, borderColor: COLORS.borderLight },
  filterTabActive: { backgroundColor: `${COLORS.primary}30`, borderColor: COLORS.primary },
  filterTabText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  filterTabTextActive: { color: COLORS.primary, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 32, marginBottom: 12 },
})