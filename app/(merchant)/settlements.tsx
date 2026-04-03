// app/(merchant)/settlements.tsx
import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  I18nManager,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  ListRenderItemInfo,
  Alert,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { settlementsApi } from '../../services/api'
import KpiCard from '../../components/KpiCard'
import SettlementRow, { SettlementRowProps } from '../../components/SettlementRow'

const isRTL = I18nManager.isRTL

// ─── Mock Data ────────────────────────────────────────────────────────────────

type SettlementStatus = 'pending' | 'settled'


// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterKey = 'all' | SettlementStatus

interface FilterTab {
  key: FilterKey
  label: string
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettlementsScreen() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [allSettlements, setAllSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      const data = await settlementsApi.list({ days: 90 })
      setAllSettlements(data.settlements)
    } catch (err) {
      console.warn('settlements fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  React.useEffect(() => { fetchData() }, [])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const FILTERS: FilterTab[] = [
    { key: 'all',     label: t('settlements.filter_all') },
    { key: 'pending', label: t('settlements.filter_pending') },
    { key: 'settled', label: t('settlements.filter_settled') },
  ]

  const totalGross = allSettlements.reduce((s, x) => s + x.gross, 0)
  const totalNet   = allSettlements.reduce((s, x) => s + x.net, 0)
  const totalComm  = allSettlements.reduce((s, x) => s + x.commission, 0)

  const filtered = useMemo(
    () =>
      allSettlements.filter(
        (s) => filter === 'all' || s.status === filter,
      ),
    [filter, allSettlements],
  )

  const handleRowPress = (id: string) => {
    Alert.alert(id, t('settlements.period'))
  }

  const handleExport = () => {
    Alert.alert('CSV', t('settlements.export'))
  }

  // ── Render ──

  const renderItem = ({ item }: ListRenderItemInfo<Settlement>) => (
    <SettlementRow {...item} onPress={() => handleRowPress(item.id)} />
  )

  const renderHeader = () => (
    <>
      {/* Page header */}
      <View style={styles.pageHeader}>
        <View style={[styles.headerRow, isRTL && styles.headerRowRTL]}>
          <View>
            <Text style={[styles.pageTitle, isRTL && styles.textRight]}>
              {t('settlements.title')}
            </Text>
            <Text style={[styles.pageSubtitle, isRTL && styles.textRight]}>
              {t('settlements.subtitle')}
            </Text>
          </View>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
            <Text style={styles.exportIcon}>↓</Text>
            <Text style={styles.exportLabel}>{t('settlements.export')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI row */}
      <View style={[styles.kpiRow, isRTL && styles.kpiRowRTL]}>
        <KpiCard
          label={t('settlements.gross')}
          value={`$${totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          style={styles.kpiCard}
        />
        <KpiCard
          label={t('settlements.commission')}
          value={`-$${totalComm.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          valueColor={COLORS.danger}
          style={styles.kpiCard}
        />
        <KpiCard
          label={t('settlements.net')}
          value={`$${totalNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          valueColor={COLORS.success}
          style={styles.kpiCard}
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
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Column headers */}
      <View style={[styles.colHeaders, isRTL && styles.colHeadersRTL]}>
        <Text style={[styles.colHeader, { flex: 2 }]}>
          {t('settlements.period')}
        </Text>
        <Text style={[styles.colHeader, styles.colHeaderCenter]}>
          {t('settlements.gross')}
        </Text>
        <Text style={[styles.colHeader, styles.colHeaderCenter]}>
          {t('settlements.commission')}
        </Text>
        <Text style={[styles.colHeader, styles.colHeaderRight]}>
          {t('settlements.net')}
        </Text>
      </View>
    </>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🗂️</Text>
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
    paddingBottom: 40,
  },

  // Page header
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

  // Export button
  exportBtn: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  exportIcon: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
  exportLabel: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // KPI row
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 8,
    backgroundColor: COLORS.cardBg,
  },
  kpiRowRTL: {
    flexDirection: 'row-reverse',
  },
  kpiCard: {
    flex: 1,
  },

  // Filter tabs
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterRowRTL: {
    flexDirection: 'row-reverse',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primaryLight,
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

  // Column headers
  colHeaders: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginTop: 8,
  },
  colHeadersRTL: {
    flexDirection: 'row-reverse',
  },
  colHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  colHeaderCenter: {
    textAlign: 'center',
  },
  colHeaderRight: {
    textAlign: isRTL ? 'left' : 'right',
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textMuted,
  },
})
