// app/(merchant)/refunds.tsx
import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  I18nManager,
  SafeAreaView,
  Alert,
  ListRenderItemInfo,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { refundsApi } from '../../services/api'

const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────────────────────────────────

type RefundStatus = 'processing' | 'completed' | 'failed'

interface Refund {
  id: string
  orderId: string
  date: string
  customerName: string
  amount: number
  currency: string
  reason: string
  method: string
  flag: string
  status: RefundStatus
}

type FilterKey = 'all' | RefundStatus


// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusConfig(status: RefundStatus): {
  label: string
  bg: string
  text: string
  icon: string
} {
  switch (status) {
    case 'processing':
      return { label: 'Processing', bg: COLORS.warningBg, text: COLORS.warning, icon: '↻' }
    case 'completed':
      return { label: 'Completed',  bg: COLORS.successBg,  text: COLORS.success,  icon: '✓' }
    case 'failed':
      return { label: 'Failed',     bg: COLORS.dangerBg,   text: COLORS.danger,   icon: '✕' }
  }
}

// ─── RefundCard ───────────────────────────────────────────────────────────────

function RefundCard({
  refund,
  onPress,
}: {
  refund: Refund
  onPress: (id: string) => void
}) {
  const cfg = statusConfig(refund.status)

  return (
    <TouchableOpacity
      style={card.container}
      onPress={() => onPress(refund.id)}
      activeOpacity={0.75}
    >
      {/* Top row */}
      <View style={[card.topRow, isRTL && card.topRowRTL]}>

        {/* Flag + customer */}
        <View style={[card.customerGroup, isRTL && card.customerGroupRTL]}>
          <View style={card.flagBubble}>
            <Text style={card.flag}>{refund.flag}</Text>
          </View>
          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={card.customerName}>{refund.customerName}</Text>
            <View style={[card.idRow, isRTL && card.idRowRTL]}>
              <Text style={card.refundId}>{refund.id}</Text>
              <Text style={card.idSep}>·</Text>
              <Text style={card.orderId}>{refund.orderId}</Text>
            </View>
          </View>
        </View>

        {/* Amount + badge */}
        <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 4 }}>
          <Text style={card.amount}>
            -{refund.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {refund.currency}
          </Text>
          <View style={[card.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[card.badgeText, { color: cfg.text }]}>
              {cfg.icon}  {cfg.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={card.divider} />

      {/* Bottom row */}
      <View style={[card.bottomRow, isRTL && card.bottomRowRTL]}>
        <View style={[card.metaItem, isRTL && card.metaItemRTL]}>
          <Text style={card.metaLabel}>Sebep</Text>
          <Text style={card.metaValue} numberOfLines={1}>{refund.reason}</Text>
        </View>
        <View style={[card.metaItem, isRTL && card.metaItemRTL]}>
          <Text style={card.metaLabel}>Yöntem</Text>
          <Text style={card.metaValue} numberOfLines={1}>{refund.method}</Text>
        </View>
        <Text style={card.date}>{refund.date}</Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RefundsScreen() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [allRefunds, setAllRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      const data = await refundsApi.list()
      setAllRefunds(data.refunds)
    } catch (err) { console.warn(err) }
    finally { setLoading(false); setRefreshing(false) }
  }

  React.useEffect(() => { fetchData() }, [])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all',        label: t('refunds.filter_all') },
    { key: 'processing', label: t('refunds.filter_processing') },
    { key: 'completed',  label: t('refunds.filter_completed') },
    { key: 'failed',     label: t('refunds.filter_failed') },
  ]

  // KPIs
  const totalRefunded  = allRefunds
    .filter((r) => r.status === 'completed')
    .reduce((s, r) => s + r.amount, 0)
  const processingAmt  = allRefunds
    .filter((r) => r.status === 'processing')
    .reduce((s, r) => s + r.amount, 0)
  const processingCount = allRefunds.filter((r) => r.status === 'processing').length

  const filtered = useMemo(
    () => allRefunds.filter((r) => filter === 'all' || r.status === filter),
    [filter, allRefunds],
  )

  const handlePress = (id: string) => {
    Alert.alert(t('refunds.title'), id)
  }

  const handleNewRefund = () => {
    Alert.alert(t('refunds.new_refund'), t('common.coming_soon'))
  }

  // ── Render ──

  const renderItem = ({ item }: ListRenderItemInfo<Refund>) => (
    <RefundCard refund={item} onPress={handlePress} />
  )

  const renderHeader = () => (
    <>
      {/* Page header */}
      <View style={styles.pageHeader}>
        <View style={[styles.headerRow, isRTL && styles.headerRowRTL]}>
          <View>
            <Text style={[styles.pageTitle, isRTL && styles.textRight]}>
              {t('refunds.title')}
            </Text>
            <Text style={[styles.pageSubtitle, isRTL && styles.textRight]}>
              {t('refunds.subtitle')}
            </Text>
          </View>
          <TouchableOpacity style={styles.newBtn} onPress={handleNewRefund}>
            <Text style={styles.newBtnText}>+ {t('refunds.new_refund')}</Text>
          </TouchableOpacity>
        </View>

        {/* Processing alert */}
        {processingCount > 0 && (
          <View style={[styles.processingBar, isRTL && styles.processingBarRTL]}>
            <Text style={styles.processingIcon}>↻</Text>
            <Text style={styles.processingText}>
              {processingCount} {t('refunds.filter_processing')} —{' '}
              <Text style={styles.processingAmt}>
                ${processingAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </Text>
          </View>
        )}
      </View>

      {/* KPI row */}
      <View style={[styles.kpiRow, isRTL && styles.kpiRowRTL]}>
        <KpiMini
          label={t('refunds.total_refunded')}
          value={`$${totalRefunded.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          color={COLORS.danger}
        />
        <KpiMini
          label={t('refunds.filter_processing')}
          value={`$${processingAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          color={COLORS.warning}
        />
        <KpiMini
          label={t('refunds.count')}
          value={String(allRefunds.length)}
          color={COLORS.textPrimary}
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
              f.key === 'processing' && filter === f.key && styles.filterTabProcessing,
              f.key === 'completed'  && filter === f.key && styles.filterTabCompleted,
              f.key === 'failed'     && filter === f.key && styles.filterTabFailed,
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
    </>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>↩</Text>
      <Text style={styles.emptyText}>{t('refunds.empty')}</Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.safeArea}>
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

// ─── KpiMini ─────────────────────────────────────────────────────────────────

function KpiMini({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <View style={mini.card}>
      <Text style={mini.label}>{label}</Text>
      <Text style={[mini.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
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

  // Header
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
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

  // New refund button
  newBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Processing alert bar
  processingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.warningBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  processingBarRTL: {
    flexDirection: 'row-reverse',
  },
  processingIcon: {
    fontSize: 16,
    color: COLORS.warning,
    fontWeight: '700',
  },
  processingText: {
    fontSize: 13,
    color: COLORS.warning,
    fontWeight: '500',
  },
  processingAmt: {
    fontWeight: '700',
  },

  // KPI row
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: COLORS.cardBg,
  },
  kpiRowRTL: {
    flexDirection: 'row-reverse',
  },

  // Filter tabs
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterRowRTL: {
    flexDirection: 'row-reverse',
  },
  filterTab: {
    paddingHorizontal: 12,
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
  filterTabProcessing: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warning,
  },
  filterTabCompleted: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.success,
  },
  filterTabFailed: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.danger,
  },
  filterTabText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterTabTextActive: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyIcon: {
    fontSize: 36,
    color: COLORS.textMuted,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
})

const card = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  topRowRTL: {
    flexDirection: 'row-reverse',
  },
  customerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  customerGroupRTL: {
    flexDirection: 'row-reverse',
  },
  flagBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  flag: {
    fontSize: 20,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  idRowRTL: {
    flexDirection: 'row-reverse',
  },
  refundId: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: 'monospace',
  },
  idSep: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  orderId: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.danger,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  // Bottom row
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  bottomRowRTL: {
    flexDirection: 'row-reverse',
  },
  metaItem: {
    flex: 1,
    gap: 2,
  },
  metaItemRTL: {
    alignItems: 'flex-end',
  },
  metaLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaValue: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  date: {
    fontSize: 11,
    color: COLORS.textMuted,
    alignSelf: 'flex-end',
  },
})

const mini = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 15,
    fontWeight: '800',
  },
})
