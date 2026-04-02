// app/(merchant)/disputes.tsx
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
import { disputesApi } from '../../services/api'

const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────────────────────────────────

type DisputeStatus = 'pending' | 'won' | 'lost'

interface Dispute {
  id: string
  orderId: string
  opened: string
  amount: number
  reason: string
  deadline: string
  status: DisputeStatus
  urgent: boolean
}

type FilterKey = 'all' | DisputeStatus


// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const parts = dateStr.split('.').map(Number)
  const d = parts[0] ?? 1
  const m = parts[1] ?? 1
  const y = parts[2] ?? 2026
  const target = new Date(y, m - 1, d)
  const today  = new Date(2026, 2, 23) // fixed to brief date
  const diff   = Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
  return diff
}

function statusConfig(status: DisputeStatus): {
  label: string
  bg: string
  text: string
  icon: string
} {
  switch (status) {
    case 'pending':
      return { label: 'Pending',  bg: COLORS.warningBg, text: COLORS.warning, icon: '⏳' }
    case 'won':
      return { label: 'Won',      bg: COLORS.successBg,  text: COLORS.success,  icon: '✓' }
    case 'lost':
      return { label: 'Lost',     bg: COLORS.dangerBg,   text: COLORS.danger,   icon: '✕' }
  }
}

// ─── DisputeCard ──────────────────────────────────────────────────────────────

function DisputeCard({
  dispute,
  onRespond,
}: {
  dispute: Dispute
  onRespond: (id: string) => void
}) {
  const { t } = useTranslation()
  const cfg   = statusConfig(dispute.status)
  const days  = daysUntil(dispute.deadline)
  const isPending = dispute.status === 'pending'

  const deadlineColor =
    days <= 2 ? COLORS.danger :
    days <= 5 ? COLORS.warning :
    COLORS.textMuted

  return (
    <View style={[card.container, dispute.urgent && card.containerUrgent]}>

      {/* Urgent banner */}
      {dispute.urgent && (
        <View style={[card.urgentBanner, isRTL && card.urgentBannerRTL]}>
          <Text style={card.urgentText}>⚠ {t('disputes.warning')}</Text>
        </View>
      )}

      {/* Top row — IDs + badge */}
      <View style={[card.topRow, isRTL && card.topRowRTL]}>
        <View style={[card.idGroup, isRTL && card.idGroupRTL]}>
          <Text style={card.id}>{dispute.id}</Text>
          <View style={card.orderPill}>
            <Text style={card.orderPillText}>{dispute.orderId}</Text>
          </View>
        </View>

        {/* Status badge */}
        <View style={[card.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[card.badgeText, { color: cfg.text }]}>
            {cfg.icon}  {cfg.label}
          </Text>
        </View>
      </View>

      {/* Reason */}
      <View style={[card.reasonRow, isRTL && card.reasonRowRTL]}>
        <Text style={card.reasonLabel}>{t('disputes.reason')}</Text>
        <Text style={card.reasonValue}>{dispute.reason}</Text>
      </View>

      {/* Divider */}
      <View style={card.divider} />

      {/* Footer row — amount + deadline + button */}
      <View style={[card.footer, isRTL && card.footerRTL]}>

        {/* Amount */}
        <View style={card.footerCell}>
          <Text style={card.footerCellLabel}>{t('disputes.amount_label')}</Text>
          <Text style={card.footerAmount}>
            {dispute.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
          </Text>
        </View>

        {/* Deadline */}
        <View style={card.footerCell}>
          <Text style={card.footerCellLabel}>{t('disputes.deadline')}</Text>
          <Text style={[card.footerDeadline, { color: deadlineColor }]}>
            {dispute.deadline}
            {isPending && (
              <Text style={[card.daysLeft, { color: deadlineColor }]}>
                {' '}({days > 0 ? `${days}d` : '—'})
              </Text>
            )}
          </Text>
        </View>

        {/* Opened */}
        <View style={card.footerCell}>
          <Text style={card.footerCellLabel}>{t('disputes.opened')}</Text>
          <Text style={card.footerOpened}>{dispute.opened}</Text>
        </View>

        {/* Respond button — only for pending */}
        {isPending && (
          <>
            <View style={card.footerSpacer} />
            <TouchableOpacity
              style={card.respondBtn}
              onPress={() => onRespond(dispute.id)}
              activeOpacity={0.75}
            >
              <Text style={card.respondBtnText}>{t('disputes.respond')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DisputesScreen() {
  const { t }   = useTranslation()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [allDisputes, setAllDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      const data = await disputesApi.list()
      setAllDisputes(data.disputes)
    } catch (err) { console.warn(err) }
    finally { setLoading(false); setRefreshing(false) }
  }

  React.useEffect(() => { fetchData() }, [])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all',     label: t('disputes.filter_all') },
    { key: 'pending', label: t('disputes.filter_pending') },
    { key: 'won',     label: t('disputes.filter_won') },
    { key: 'lost',    label: t('disputes.filter_lost') },
  ]

  const pendingCount = allDisputes.filter((d: any) => d.status === 'pending').length
  const urgentCount  = allDisputes.filter((d: any) => d.urgent).length
  const totalAmount  = allDisputes
    .filter((d: any) => d.status === 'pending')
    .reduce((s: number, d: any) => s + d.amount, 0)

  const filtered = useMemo(
    () => allDisputes.filter((d: any) => filter === 'all' || d.status === filter),
    [filter, allDisputes],
  )

  const handleRespond = (id: string) => {
    Alert.alert(t('disputes.respond'), id)
  }

  // ── Render ──

  const renderItem = ({ item }: any) => (
    <DisputeCard dispute={item} onRespond={handleRespond} />
  )

  const renderHeader = () => (
    <>
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={[styles.pageTitle, isRTL && styles.textRight]}>
          {t('disputes.title')}
        </Text>

        {/* Alert bar */}
        {pendingCount > 0 && (
          <View style={[styles.alertBar, isRTL && styles.alertBarRTL]}>
            <Text style={styles.alertIcon}>⚠</Text>
            <Text style={styles.alertText}>
              {pendingCount} {t('disputes.warning')}
            </Text>
            {urgentCount > 0 && (
              <View style={styles.urgentPill}>
                <Text style={styles.urgentPillText}>
                  {urgentCount} acil
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* KPI row */}
      <View style={[styles.kpiRow, isRTL && styles.kpiRowRTL]}>
        <KpiMini
          label={t('disputes.filter_pending')}
          value={String(pendingCount)}
          color={COLORS.warning}
        />
        <KpiMini
          label={t('disputes.urgent')}
          value={String(urgentCount)}
          color={COLORS.danger}
        />
        <KpiMini
          label={t('disputes.risk_amount')}
          value={`${totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
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
              f.key === 'pending' && filter === f.key && styles.filterTabPending,
              f.key === 'won'     && filter === f.key && styles.filterTabWon,
              f.key === 'lost'    && filter === f.key && styles.filterTabLost,
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
      <Text style={styles.emptyIcon}>🎉</Text>
      <Text style={styles.emptyText}>{t('disputes.no_disputes')}</Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        data={filtered}
        keyExtractor={(item: any) => item.id}
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
      <Text style={[mini.value, { color }]}>{value}</Text>
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
    backgroundColor: COLORS.darkBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  textRight: {
    textAlign: 'right',
  },

  // Alert bar
  alertBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.warningBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  alertBarRTL: {
    flexDirection: 'row-reverse',
  },
  alertIcon: {
    fontSize: 16,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.warning,
  },
  urgentPill: {
    backgroundColor: COLORS.dangerBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  urgentPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.danger,
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

  // Filters
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: COLORS.darkBg,
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
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  filterTabPending: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warning,
  },
  filterTabWon: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.success,
  },
  filterTabLost: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.danger,
  },
  filterTabText: {
    fontSize: 13,
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
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
})

const card = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBgLight,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  containerUrgent: {
    borderColor: COLORS.warning,
    borderWidth: 1.5,
  },

  // Urgent banner
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.warningBg,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.warning,
  },
  urgentBannerRTL: {
    flexDirection: 'row-reverse',
  },
  urgentText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.warning,
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  topRowRTL: {
    flexDirection: 'row-reverse',
  },
  idGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idGroupRTL: {
    flexDirection: 'row-reverse',
  },
  id: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
  },
  orderPill: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderPillText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Reason
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  reasonRowRTL: {
    flexDirection: 'row-reverse',
  },
  reasonLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  reasonValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 1,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  footerRTL: {
    flexDirection: 'row-reverse',
  },
  footerCell: {
    gap: 3,
  },
  footerSpacer: {
    flex: 1,
  },
  footerCellLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  footerAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  footerDeadline: {
    fontSize: 13,
    fontWeight: '600',
  },
  daysLeft: {
    fontSize: 12,
    fontWeight: '500',
  },
  footerOpened: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // Respond button
  respondBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  respondBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
})

const mini = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.cardBgLight,
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
    fontSize: 16,
    fontWeight: '800',
  },
})
