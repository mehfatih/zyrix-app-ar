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

const isRTL = I18nManager.isRTL

// ─── Mock Data ────────────────────────────────────────────────────────────────



// ─── Filter Tabs ───────────────────────────────────────────────────────────────

type FilterKey = 'all' | TransactionStatus

interface FilterTab {
  key: FilterKey
  labelKey: string
}

const FILTERS: FilterTab[] = [
  { key: 'success', labelKey: 'transactions.filter_success' },
  { key: 'pending', labelKey: 'transactions.filter_pending' },
  { key: 'failed',  labelKey: 'transactions.filter_failed' },
  { key: 'all',     labelKey: 'transactions.filter_all' },
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

  const renderItem = ({ item, index }: ListRenderItemInfo<Transaction>) => (
    <TransactionRow
      {...item}
      index={index}
      onPress={() => handleRowPress(item.id)}
    />
  )

  const renderHeader = () => (
    <>
      {/* Page header — compact, no white bg */}
      <View style={styles.header}>
        <View style={[styles.headerTopRow, isRTL && styles.headerTopRowRTL]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.subtitle, isRTL && styles.textRight]}>
              {t('transactions.subtitle')}
            </Text>
          </View>
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

      {/* KPI row */}
      <View style={styles.kpiRow}>
        <KpiCard
          label={t('transactions.success_rate')}
          value={`${successRate}%`}
          icon="✅"
          color={COLORS.kpiGreen}
          style={styles.kpiCard}
        />
        <KpiCard
          label={t('transactions.total_count')}
          value={String(stats.totalCount)}
          icon="📋"
          color={COLORS.kpiPurple}
          style={styles.kpiCard}
        />
        <KpiCard
          label={t('transactions.total_volume')}
          value={`$${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          icon="💳"
          color={COLORS.kpiBlue}
          style={styles.kpiCard}
        />
      </View>

      {/* Search bar */}
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

      {/* Filter tabs */}
      <View style={[styles.filterRow, isRTL && styles.filterRowRTL]}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterTab,
              filter === f.key && styles.filterTabActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === f.key && styles.filterTabTextActive,
              ]}
            >
              {t(f.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
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
      <FlatList
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
    backgroundColor: COLORS.cardBg,
  },
  listContent: {
    paddingBottom: 32,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: COLORS.surfaceBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTopRowRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  csvBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  csvBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  textRight: {
    textAlign: 'right',
  },

  // KPIs
  kpiRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 8,
    backgroundColor: COLORS.cardBg,
  },
  kpiCard: {
    flex: 1,
  },

  // Search
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.cardBg,
  },
  searchInput: {
    height: 40,
    backgroundColor: COLORS.surfaceBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 13,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  searchInputRTL: {
    textAlign: 'right',
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterRowRTL: {
    flexDirection: 'row-reverse',
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.cardBgLight,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  filterTabActive: {
    backgroundColor: `${COLORS.primary}30`,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: COLORS.primary,
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
