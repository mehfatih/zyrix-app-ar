// app/(merchant)/refunds.tsx
import React, { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl,
  I18nManager, SafeAreaView, Alert, ListRenderItemInfo,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { refundsApi } from '../../services/api'

const isRTL = I18nManager.isRTL

type RefundStatus = 'processing' | 'completed' | 'failed'
interface Refund {
  id: string; orderId: string; date: string; customerName: string;
  amount: number; currency: string; reason: string; method: string; flag: string; status: RefundStatus;
}
type FilterKey = 'all' | RefundStatus

const STATUS_AR: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  processing: { label: 'قيد المعالجة', bg: COLORS.warningBg, text: COLORS.warning, icon: '↻' },
  completed:  { label: 'مكتمل',       bg: COLORS.successBg, text: COLORS.success, icon: '✓' },
  failed:     { label: 'فاشل',        bg: COLORS.dangerBg,  text: COLORS.danger,  icon: '✕' },
}

const METHOD_AR: Record<string, string> = {
  'Credit card': 'بطاقة ائتمان', 'credit_card': 'بطاقة ائتمان',
  'Bank transfer': 'تحويل بنكي', 'bank_transfer': 'تحويل بنكي',
  'Digital wallet': 'محفظة رقمية', 'digital_wallet': 'محفظة رقمية',
}

const CARD_BG = [
  { bg: 'rgba(26, 86, 219, 0.1)', border: 'rgba(26, 86, 219, 0.3)' },
  { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)' },
  { bg: 'rgba(13, 148, 136, 0.1)', border: 'rgba(13, 148, 136, 0.3)' },
  { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' },
  { bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.3)' },
]

const ICONS_BY_STATUS: Record<string, string> = { processing: '⏳', completed: '✅', failed: '❌' }

function RefundCard({ refund, index }: { refund: Refund; index: number }) {
  const cfg = STATUS_AR[refund.status] || STATUS_AR.processing
  const colors = CARD_BG[index % CARD_BG.length]
  const methodLabel = METHOD_AR[refund.method] ?? refund.method

  return (
    <View style={[cd.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={[cd.topRow, isRTL && cd.topRowRTL]}>
        <View style={[cd.customerGroup, isRTL && cd.customerGroupRTL]}>
          <View style={cd.iconBubble}><Text style={cd.iconText}>{ICONS_BY_STATUS[refund.status] || '↩'}</Text></View>
          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={cd.customerName}>{refund.customerName}</Text>
            <Text style={cd.refundId}>{refund.id}</Text>
          </View>
        </View>
        <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 4 }}>
          <Text style={cd.amount}>-{refund.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س</Text>
          <View style={[cd.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[cd.badgeText, { color: cfg.text }]}>{cfg.icon} {cfg.label}</Text>
          </View>
        </View>
      </View>
      <View style={cd.divider} />
      <View style={[cd.bottomRow, isRTL && cd.bottomRowRTL]}>
        <View style={cd.metaItem}><Text style={cd.metaLabel}>السبب</Text><Text style={cd.metaValue} numberOfLines={1}>{refund.reason}</Text></View>
        <View style={cd.metaItem}><Text style={cd.metaLabel}>الطريقة</Text><Text style={cd.metaValue} numberOfLines={1}>{methodLabel}</Text></View>
        <Text style={cd.date}>{refund.date}</Text>
      </View>
    </View>
  )
}

export default function RefundsScreen() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [allRefunds, setAllRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try { const data = await refundsApi.list(); setAllRefunds(data.refunds) }
    catch (err) { console.warn(err) }
    finally { setLoading(false); setRefreshing(false) }
  }

  React.useEffect(() => { fetchData() }, [])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const FILTERS: { key: FilterKey; label: string; color: string; activeBg: string; activeBorder: string }[] = [
    { key: 'completed',  label: t('refunds.filter_completed'),  color: COLORS.success, activeBg: COLORS.successBg, activeBorder: COLORS.success },
    { key: 'processing', label: t('refunds.filter_processing'), color: COLORS.warning, activeBg: COLORS.warningBg, activeBorder: COLORS.warning },
    { key: 'failed',     label: t('refunds.filter_failed'),     color: COLORS.danger,  activeBg: COLORS.dangerBg,  activeBorder: COLORS.danger },
    { key: 'all',        label: t('refunds.filter_all'),        color: COLORS.primaryLight, activeBg: 'rgba(59,130,246,0.2)', activeBorder: COLORS.primaryLight },
  ]

  const totalRefunded = allRefunds.filter((r) => r.status === 'completed').reduce((s, r) => s + r.amount, 0)
  const processingAmt = allRefunds.filter((r) => r.status === 'processing').reduce((s, r) => s + r.amount, 0)
  const processingCount = allRefunds.filter((r) => r.status === 'processing').length
  const refundCount = allRefunds.length

  const filtered = useMemo(() => allRefunds.filter((r) => filter === 'all' || r.status === filter), [filter, allRefunds])

  const maxKpi = Math.max(totalRefunded, processingAmt, refundCount, 1)

  const renderItem = ({ item, index }: ListRenderItemInfo<Refund>) => <RefundCard refund={item} index={index} />

  const renderHeader = () => (
    <>
      {/* Compact header — two buttons side by side */}
      <View style={st.pageHeader}>
        <View style={[st.headerBtns, isRTL && st.headerBtnsRTL]}>
          <TouchableOpacity style={st.newBtn} onPress={() => Alert.alert(t('refunds.new_refund'))}>
            <Text style={st.newBtnText}>+ {t('refunds.new_refund')}</Text>
          </TouchableOpacity>
          {processingCount > 0 && (
            <View style={st.processingPill}>
              <Text style={st.processingText}>{processingCount} {t('refunds.filter_processing')} — {processingAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س</Text>
            </View>
          )}
        </View>
      </View>

      {/* KPI — each unique color */}
      <View style={[st.kpiRow, isRTL && st.kpiRowRTL]}>
        <View style={[st.kpiCard, { backgroundColor: 'rgba(220, 38, 38, 0.15)', borderColor: 'rgba(220, 38, 38, 0.3)' }]}>
          <Text style={st.kpiLabel}>{t('refunds.total_refunded')}</Text>
          <Text style={[st.kpiValue, { color: COLORS.danger }]}>{totalRefunded.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س</Text>
        </View>
        <View style={[st.kpiCard, { backgroundColor: 'rgba(217, 119, 6, 0.15)', borderColor: 'rgba(217, 119, 6, 0.3)' }]}>
          <Text style={st.kpiLabel}>{t('refunds.filter_processing')}</Text>
          <Text style={[st.kpiValue, { color: COLORS.warning }]}>{processingAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س</Text>
        </View>
        <View style={[st.kpiCard, { backgroundColor: 'rgba(26, 86, 219, 0.15)', borderColor: 'rgba(26, 86, 219, 0.3)' }]}>
          <Text style={st.kpiLabel}>{t('refunds.count')}</Text>
          <Text style={[st.kpiValue, { color: COLORS.primaryLight }]}>{refundCount}</Text>
        </View>
      </View>

      {/* Pivot chart */}
      <View style={st.chartContainer}>
        <View style={st.chartBarGroup}>
          <View style={st.chartBarTrack}><View style={[st.chartBarFill, { backgroundColor: COLORS.danger, height: `${Math.max((totalRefunded / maxKpi) * 100, 8)}%` }]} /></View>
          <Text style={[st.chartBarLabel, { color: COLORS.danger }]}>{t('refunds.total_refunded')}</Text>
        </View>
        <View style={st.chartBarGroup}>
          <View style={st.chartBarTrack}><View style={[st.chartBarFill, { backgroundColor: COLORS.warning, height: `${Math.max((processingAmt / maxKpi) * 100, 8)}%` }]} /></View>
          <Text style={[st.chartBarLabel, { color: COLORS.warning }]}>{t('refunds.filter_processing')}</Text>
        </View>
        <View style={st.chartBarGroup}>
          <View style={st.chartBarTrack}><View style={[st.chartBarFill, { backgroundColor: COLORS.primaryLight, height: `${Math.max((refundCount / Math.max(totalRefunded, 1)) * 100, 15)}%` }]} /></View>
          <Text style={[st.chartBarLabel, { color: COLORS.primaryLight }]}>{t('refunds.count')}</Text>
        </View>
      </View>

      {/* Filters — centered, unique colors, order: مكتمل، قيد المعالجة، فاشل، الكل */}
      <View style={st.filterWrapper}>
        <View style={st.filterRow}>
          {FILTERS.map((f) => {
            const isActive = filter === f.key
            return (
              <TouchableOpacity key={f.key} style={[st.filterTab, isActive && { backgroundColor: f.activeBg, borderColor: f.activeBorder }]} onPress={() => setFilter(f.key)}>
                <Text style={[st.filterTabText, isActive && { color: f.color, fontWeight: '700' }]}>{f.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    </>
  )

  const renderEmpty = () => (
    <View style={st.emptyContainer}><Text style={st.emptyIcon}>↩</Text><Text style={st.emptyText}>{t('refunds.empty')}</Text></View>
  )

  return (
    <SafeAreaView style={st.safeArea}>
      <FlatList refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        data={filtered} keyExtractor={(item) => item.id} renderItem={renderItem}
        ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
        contentContainerStyle={st.listContent} showsVerticalScrollIndicator={false} />
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.darkBg },
  listContent: { paddingBottom: 40 },
  pageHeader: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, backgroundColor: 'rgba(13, 148, 136, 0.12)', borderBottomWidth: 1, borderBottomColor: 'rgba(13, 148, 136, 0.3)' },
  headerBtns: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  headerBtnsRTL: { flexDirection: 'row-reverse' },
  newBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  processingPill: { flex: 1, backgroundColor: COLORS.warningBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.warning },
  processingText: { fontSize: 12, color: COLORS.warning, fontWeight: '600' },
  kpiRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  kpiRowRTL: { flexDirection: 'row-reverse' },
  kpiCard: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 10, gap: 4 },
  kpiLabel: { fontSize: 9, fontWeight: '600', color: COLORS.textMuted },
  kpiValue: { fontSize: 14, fontWeight: '800' },
  chartContainer: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-around', alignItems: 'flex-end', backgroundColor: COLORS.surfaceBg, marginHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, height: 130 },
  chartBarGroup: { alignItems: 'center', flex: 1, gap: 4 },
  chartBarTrack: { width: 28, height: 70, backgroundColor: COLORS.cardBg, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  chartBarFill: { width: '100%', borderRadius: 6 },
  chartBarLabel: { fontSize: 8, fontWeight: '700', textAlign: 'center' },
  filterWrapper: { backgroundColor: COLORS.cardBg, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, marginHorizontal: 12, marginTop: 10, borderRadius: 12 },
  filterRow: { flexDirection: isRTL ? 'row' : 'row-reverse', gap: 6, justifyContent: 'center' },
  filterTab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  filterTabText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon: { fontSize: 36, color: COLORS.textMuted },
  emptyText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '500' },
})

const cd = StyleSheet.create({
  container: { marginHorizontal: 16, marginTop: 10, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 },
  topRowRTL: { flexDirection: 'row-reverse' },
  customerGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  customerGroupRTL: { flexDirection: 'row-reverse' },
  iconBubble: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  iconText: { fontSize: 18 },
  customerName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  refundId: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace' },
  amount: { fontSize: 14, fontWeight: '800', color: COLORS.danger },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  divider: { height: 1, backgroundColor: COLORS.border },
  bottomRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 10 },
  bottomRowRTL: { flexDirection: 'row-reverse' },
  metaItem: { flex: 1, gap: 1 },
  metaLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  metaValue: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  date: { fontSize: 10, color: COLORS.textMuted },
})