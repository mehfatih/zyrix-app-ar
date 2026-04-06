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
import { InnerHeader } from '../../components/InnerHeader'

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

function statusConfig(status: DisputeStatus): {
  label: string
  bg: string
  text: string
  icon: string
} {
  switch (status) {
    case 'pending':
      return { label: 'معلق',    bg: COLORS.warningBg, text: COLORS.warning, icon: '⏳' }
    case 'won':
      return { label: 'مكسوب',   bg: COLORS.successBg, text: COLORS.success, icon: '✓' }
    case 'lost':
      return { label: 'خسارة',   bg: COLORS.dangerBg,  text: COLORS.danger,  icon: '✕' }
  }
}

// ─── DisputeCard ──────────────────────────────────────────────────────────────

const CARD_COLORS = [
  { bg: 'rgba(26, 86, 219, 0.12)', border: 'rgba(26, 86, 219, 0.3)' },   // blue
  { bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.3)' },  // purple
  { bg: 'rgba(13, 148, 136, 0.12)', border: 'rgba(13, 148, 136, 0.3)' },  // teal
]

function DisputeCard({
  dispute,
  index,
  onRespond,
}: {
  dispute: Dispute
  index: number
  onRespond: (id: string) => void
}) {
  const { t } = useTranslation()
  const cfg   = statusConfig(dispute.status)
  const isPending = dispute.status === 'pending'
  const colorSet = CARD_COLORS[index % CARD_COLORS.length]

  // Format date nicely
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' })
    } catch {
      return dateStr
    }
  }

  return (
    <View style={[card.container, { backgroundColor: colorSet.bg, borderColor: colorSet.border }]}>

      {/* Urgent banner */}
      {dispute.urgent && (
        <View style={[card.urgentBanner, isRTL && card.urgentBannerRTL]}>
          <Text style={card.urgentText}>⚠ {t('disputes.warning')}</Text>
        </View>
      )}

      {/* Top row — IDs + badge */}
      <View style={[card.topRow, isRTL && card.topRowRTL]}>
        <View style={[card.idGroup, isRTL && card.idGroupRTL]}>
          <View style={card.orderPill}>
            <Text style={card.orderPillText}>{dispute.id}</Text>
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

      {/* Footer row — amount + deadline */}
      <View style={[card.footer, isRTL && card.footerRTL]}>
        <View style={card.footerCell}>
          <Text style={card.footerCellLabel}>{t('disputes.amount_label')}</Text>
          <Text style={card.footerAmount}>
            {dispute.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
          </Text>
        </View>

        {isPending && dispute.deadline && (
          <View style={card.footerCell}>
            <Text style={card.footerCellLabel}>{t('disputes.deadline')}</Text>
            <Text style={card.footerDeadline}>
              {formatDate(dispute.deadline)}
            </Text>
          </View>
        )}

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
      // Safely handle data
      const disputes = Array.isArray(data?.disputes) ? data.disputes : []
      setAllDisputes(disputes.map((d: any) => ({
        id: d.id ?? d.disputeId ?? '',
        orderId: d.orderId ?? d.transactionId ?? '',
        opened: d.opened ?? d.createdAt ?? '',
        amount: typeof d.amount === 'number' ? d.amount : parseFloat(d.amount) || 0,
        reason: d.reason ?? '',
        deadline: d.deadline ?? d.respondBy ?? '',
        status: d.status ?? 'pending',
        urgent: d.urgent ?? false,
      })))
    } catch (err) { console.warn(err) }
    finally { setLoading(false); setRefreshing(false) }
  }

  React.useEffect(() => { fetchData() }, [])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  // Reorder filters: أرباح (won) - معلق - خسارة - الكل
  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'won',     label: 'أرباح' },
    { key: 'pending', label: t('disputes.filter_pending') },
    { key: 'lost',    label: t('disputes.filter_lost') },
    { key: 'all',     label: t('disputes.filter_all') },
  ]

  const pendingCount = allDisputes.filter((d) => d.status === 'pending').length
  const urgentCount  = allDisputes.filter((d) => d.urgent).length
  const wonCount     = allDisputes.filter((d) => d.status === 'won').length
  const lostCount    = allDisputes.filter((d) => d.status === 'lost').length
  const totalAmount  = allDisputes
    .filter((d) => d.status === 'pending')
    .reduce((s, d) => s + d.amount, 0)

  const filtered = useMemo(
    () => allDisputes.filter((d) => filter === 'all' || d.status === filter),
    [filter, allDisputes],
  )

  const handleRespond = (id: string) => {
    Alert.alert(t('disputes.respond'), id)
  }

  // ── Render ──

  const renderItem = ({ item, index }: ListRenderItemInfo<Dispute>) => (
    <DisputeCard dispute={item} index={index} onRespond={handleRespond} />
  )

  // Chart bar helper
  const maxVal = Math.max(wonCount, pendingCount, lostCount, 1)
  const barData = [
    { label: 'أرباح', value: wonCount, color: COLORS.success },
    { label: 'معلق', value: pendingCount, color: COLORS.warning },
    { label: 'خسارة', value: lostCount, color: COLORS.danger },
  ]

  const renderHeader = () => (
    <>


      {/* KPI row — each with unique color */}
      <View style={[styles.kpiRow, isRTL && styles.kpiRowRTL]}>
        <KpiMini
          label={t('disputes.filter_pending')}
          value={String(pendingCount)}
          color={COLORS.warning}
          bg="rgba(217, 119, 6, 0.15)"
          borderColor="rgba(217, 119, 6, 0.3)"
        />
        <KpiMini
          label={t('disputes.urgent')}
          value={String(urgentCount)}
          color={COLORS.danger}
          bg="rgba(220, 38, 38, 0.15)"
          borderColor="rgba(220, 38, 38, 0.3)"
        />
        <KpiMini
          label={t('disputes.risk_amount')}
          value={`${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س`}
          color={COLORS.primaryLight}
          bg="rgba(59, 130, 246, 0.15)"
          borderColor="rgba(59, 130, 246, 0.3)"
        />
      </View>

      {/* Mini bar chart */}
      <View style={styles.chartContainer}>
        {barData.map((bar, i) => (
          <View key={i} style={styles.chartBarGroup}>
            <View style={styles.chartBarTrack}>
              <View style={[styles.chartBarFill, {
                backgroundColor: bar.color,
                height: `${Math.max((bar.value / maxVal) * 100, 5)}%`,
              }]} />
            </View>
            <Text style={[styles.chartBarValue, { color: bar.color }]}>{bar.value}</Text>
            <Text style={styles.chartBarLabel}>{bar.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter tabs — right to left: أرباح - معلق - خسارة - الكل */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const isActive = filter === f.key
          let activeBg = 'rgba(59, 130, 246, 0.2)'
          let activeBorder = COLORS.primaryLight
          if (f.key === 'won')     { activeBg = COLORS.successBg; activeBorder = COLORS.success }
          if (f.key === 'pending') { activeBg = COLORS.warningBg; activeBorder = COLORS.warning }
          if (f.key === 'lost')    { activeBg = COLORS.dangerBg;  activeBorder = COLORS.danger  }
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterTab,
                isActive && { backgroundColor: activeBg, borderColor: activeBorder },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  isActive && styles.filterTabTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🎉</Text>
      <Text style={styles.emptyText}>{t('disputes.noDisputes')}</Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.safeArea}>
      <InnerHeader title={t('disputes.title')} accentColor="#F59E0B" />
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
  bg,
  borderColor,
}: {
  label: string
  value: string
  color: string
  bg: string
  borderColor: string
}) {
  return (
    <View style={[mini.card, { backgroundColor: bg, borderColor }]}>
      <Text style={mini.label}>{label}</Text>
      <Text style={[mini.value, { color }]}>{value}</Text>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  listContent: {
    paddingBottom: 40,
  },

  // Header
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.deepBg,
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
    height: 140,
  },
  chartBarGroup: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  chartBarTrack: {
    width: 28,
    height: 80,
    backgroundColor: COLORS.surfaceBg,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 6,
  },
  chartBarValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  chartBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // Filters
  filterRow: {
    flexDirection: isRTL ? 'row' : 'row-reverse',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: COLORS.darkBg,
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
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterTabTextActive: {
    fontWeight: '700',
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
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  containerUrgent: {
    borderColor: COLORS.warning,
    borderWidth: 1.5,
  },
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
  orderPill: {
    backgroundColor: COLORS.cardBgLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderPillText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontFamily: 'monospace',
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
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
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
    color: COLORS.warningLight,
  },
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
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
  },
})