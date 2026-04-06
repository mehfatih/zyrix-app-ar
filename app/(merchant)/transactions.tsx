// app/(merchant)/transactions.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  I18nManager,
  SafeAreaView,
  ListRenderItemInfo,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native'
import { useRouter } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { transactionsApi } from '../../services/api'
import KpiCard from '../../components/KpiCard'
import TransactionRow from '../../components/TransactionRow'
import type { Transaction } from '../../types'
import { InnerHeader } from '../../components/InnerHeader';

const isRTL = I18nManager.isRTL

// ─── Filter Tabs ───────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'success' | 'pending' | 'failed'

interface FilterTab {
  key: FilterKey
  labelKey: string
  color: string
  activeBg: string
  activeBorder: string
}

// Order: ناجح - معلق - فاشل - جميع الحالات (right to left)
const FILTERS: FilterTab[] = [
  { key: 'success', labelKey: 'transactions.filter_success', color: COLORS.success, activeBg: COLORS.successBg, activeBorder: COLORS.success },
  { key: 'pending', labelKey: 'transactions.filter_pending', color: COLORS.warning, activeBg: COLORS.warningBg, activeBorder: COLORS.warning },
  { key: 'failed',  labelKey: 'transactions.filter_failed',  color: COLORS.danger,  activeBg: COLORS.dangerBg,  activeBorder: COLORS.danger },
  { key: 'all',     labelKey: 'transactions.filter_all',     color: COLORS.primaryLight, activeBg: 'rgba(59, 130, 246, 0.2)', activeBorder: COLORS.primaryLight },
]

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const { t } = useTranslation()
  const router = useRouter()

  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [allTx, setAllTx] = useState<Transaction[]>([])
  const [stats, setStats] = useState({ totalVolume: 0, totalCount: 0, successRate: '0' })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const data = await transactionsApi.list({ limit: 50 })
      setAllTx(data.transactions)
      setStats(data.stats)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err) || t('common.error'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [])

  const onRefresh = () => { setRefreshing(true); fetchData() }

  const totalVolume = stats.totalVolume
  const successRate = Number(stats.successRate)
  const totalCount = stats.totalCount

  // Filtered + searched list
  const filtered = useMemo(() => {
    return allTx.filter((tx) => {
      const matchesFilter = filter === 'all' || tx.status === filter
      const query = search.toLowerCase()
      const matchesSearch =
        !query ||
        tx.id.toLowerCase().includes(query) ||
        tx.name.toLowerCase().includes(query) ||
        String(tx.amount).includes(query)
      return matchesFilter && matchesSearch
    })
  }, [filter, search, allTx])

  const handleRowPress = (id: string) => {
    router.push({ pathname: '/(merchant)/transaction-detail', params: { id } })
  }

  const renderItem = ({ item }: ListRenderItemInfo<Transaction>) => (
    <TransactionRow
      {...item}
      onPress={() => handleRowPress(item.id)}
    />
  )

  // Mini bar chart data
  const maxKpi = Math.max(totalVolume, totalCount, successRate, 1)

  const renderHeader = () => (
    <>
      {/* Page header with subtitle + CSV export */}
      <View style={styles.header}>
        <View style={[styles.headerTop, isRTL && styles.headerTopRTL]}>
          <Text style={[styles.subtitle, isRTL && styles.textRight, { flex: 1 }]}>
            {t('transactions.subtitle')}
          </Text>
          <TouchableOpacity
            style={styles.csvBtn}
            onPress={() => {
              const url = 'https://api.zyrix.co/api/export/transactions?format=csv';
              Linking.openURL(url).catch(() => {});
            }}
          >
            <Text style={styles.csvBtnText}>{t('transactions.export_csv')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI row — each with unique color */}
      <View style={[styles.kpiRow, isRTL && styles.kpiRowRTL]}>
        <KpiCard
          label={t('transactions.total_volume')}
          value={`${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س`}
          icon="💳"
          color={COLORS.primary}
          style={{ flex: 1, backgroundColor: 'rgba(26, 86, 219, 0.15)', borderColor: 'rgba(26, 86, 219, 0.3)' }}
          compact
        />
        <KpiCard
          label={t('transactions.total_count')}
          value={String(totalCount)}
          icon="📋"
          color={COLORS.chart.purple}
          style={{ flex: 1, backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)' }}
          compact
        />
        <KpiCard
          label={t('transactions.success_rate')}
          value={`${successRate}%`}
          icon="✅"
          color={COLORS.success}
          style={{ flex: 1, backgroundColor: 'rgba(5, 150, 105, 0.15)', borderColor: 'rgba(5, 150, 105, 0.3)' }}
          compact
        />
      </View>

      {/* Mini pivot bar chart */}
      <View style={styles.chartContainer}>
        <View style={styles.chartBarGroup}>
          <View style={styles.chartBarTrack}>
            <View style={[styles.chartBarFill, { backgroundColor: COLORS.primary, height: '70%' }]} />
          </View>
          <Text style={[styles.chartBarLabel, { color: COLORS.primary }]}>{t('transactions.total_volume').split('(')[0].trim()}</Text>
        </View>
        <View style={styles.chartBarGroup}>
          <View style={styles.chartBarTrack}>
            <View style={[styles.chartBarFill, { backgroundColor: COLORS.chart.purple, height: `${Math.max((totalCount / Math.max(totalVolume, 1)) * 100, 15)}%` }]} />
          </View>
          <Text style={[styles.chartBarLabel, { color: COLORS.chart.purple }]}>{t('transactions.total_count')}</Text>
        </View>
        <View style={styles.chartBarGroup}>
          <View style={styles.chartBarTrack}>
            <View style={[styles.chartBarFill, { backgroundColor: COLORS.success, height: `${successRate}%` }]} />
          </View>
          <Text style={[styles.chartBarLabel, { color: COLORS.success }]}>{t('transactions.success_rate')}</Text>
        </View>
      </View>

      {/* Search bar — RTL aligned */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('transactions.search')}
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
          writingDirection="rtl"
        />
      </View>

      {/* Filter tabs — right to left: ناجح - معلق - فاشل - جميع الحالات */}
      <View style={styles.filterWrapper}>
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const isActive = filter === f.key
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterTab,
                  isActive && { backgroundColor: f.activeBg, borderColor: f.activeBorder },
                ]}
                onPress={() => setFilter(f.key)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && { color: f.color, fontWeight: '700' },
                  ]}
                >
                  {t(f.labelKey)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    </>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>—</Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.safeArea}>
      <InnerHeader title={t('transactions.detail')} accentColor="#06B6D4" />
      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  listContent: {
    paddingBottom: 32,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(13, 148, 136, 0.3)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTopRTL: {
    flexDirection: 'row-reverse',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  textRight: {
    textAlign: 'right',
  },
  csvBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  csvBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // KPIs
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: COLORS.darkBg,
  },
  kpiRowRTL: {
    flexDirection: 'row-reverse',
  },

  // Chart
  chartContainer: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    height: 130,
  },
  chartBarGroup: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  chartBarTrack: {
    width: 28,
    height: 70,
    backgroundColor: COLORS.surfaceBg,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 6,
  },
  chartBarLabel: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Search
  searchWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.darkBg,
  },
  searchInput: {
    height: 44,
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Filters
  filterWrapper: {
    backgroundColor: COLORS.surfaceBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterRow: {
    flexDirection: isRTL ? 'row' : 'row-reverse',
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 32,
    marginBottom: 12,
  },
})