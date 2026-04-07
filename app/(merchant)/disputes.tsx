// app/(merchant)/disputes.tsx
import React, { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, I18nManager,
  SafeAreaView, Alert, ListRenderItemInfo, Dimensions,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { InnerHeader } from '../../components/InnerHeader'

const isRTL     = I18nManager.isRTL
const SCREEN_W  = Dimensions.get('window').width

// ─── Types ────────────────────────────────────────

type DisputeStatus = 'pending' | 'won' | 'lost' | 'reviewing' | 'escalated'

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

// ─── Demo Data ────────────────────────────────────

const DEMO_DISPUTES: Dispute[] = [
  {
    id: 'DSP-10041',
    orderId: 'ORD-88231',
    opened: '2026-03-01',
    amount: 1250.00,
    reason: 'العميل لم يستلم المنتج',
    deadline: '2026-04-15',
    status: 'pending',
    urgent: true,
  },
  {
    id: 'DSP-10038',
    orderId: 'ORD-88190',
    opened: '2026-02-20',
    amount: 3400.50,
    reason: 'المنتج لا يطابق الوصف',
    deadline: '2026-04-10',
    status: 'won',
    urgent: false,
  },
  {
    id: 'DSP-10035',
    orderId: 'ORD-88150',
    opened: '2026-02-10',
    amount: 780.00,
    reason: 'معاملة غير مصرح بها',
    deadline: '2026-04-05',
    status: 'lost',
    urgent: false,
  },
  {
    id: 'DSP-10030',
    orderId: 'ORD-88100',
    opened: '2026-01-28',
    amount: 2100.75,
    reason: 'خدمة لم تُقدَّم كما هو متفق عليه',
    deadline: '2026-04-20',
    status: 'reviewing',
    urgent: true,
  },
  {
    id: 'DSP-10025',
    orderId: 'ORD-88055',
    opened: '2026-01-15',
    amount: 5600.00,
    reason: 'تكرار في الخصم',
    deadline: '2026-04-25',
    status: 'escalated',
    urgent: true,
  },
]

// ─── KPI Themes (لكل خانة لون مميز) ─────────────

const KPI_THEMES: Record<DisputeStatus | 'all', {
  bg: string; border: string; accent: string; icon: string; label: string;
  shades: string[];
}> = {
  pending: {
    bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.40)',
    accent: '#F59E0B', icon: '⏳', label: 'معلقة',
    shades: ['rgba(245,158,11,0.35)', 'rgba(245,158,11,0.65)', 'rgba(245,158,11,1.00)'],
  },
  won: {
    bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.40)',
    accent: '#10B981', icon: '✅', label: 'مكسوبة',
    shades: ['rgba(16,185,129,0.35)', 'rgba(16,185,129,0.65)', 'rgba(16,185,129,1.00)'],
  },
  lost: {
    bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.40)',
    accent: '#EF4444', icon: '❌', label: 'خسارة',
    shades: ['rgba(239,68,68,0.35)', 'rgba(239,68,68,0.65)', 'rgba(239,68,68,1.00)'],
  },
  reviewing: {
    bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.40)',
    accent: '#6366F1', icon: '🔍', label: 'قيد المراجعة',
    shades: ['rgba(99,102,241,0.35)', 'rgba(99,102,241,0.65)', 'rgba(99,102,241,1.00)'],
  },
  escalated: {
    bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.40)',
    accent: '#EC4899', icon: '🚨', label: 'مُصعَّدة',
    shades: ['rgba(236,72,153,0.35)', 'rgba(236,72,153,0.65)', 'rgba(236,72,153,1.00)'],
  },
  all: {
    bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.40)',
    accent: '#3B82F6', icon: '📋', label: 'الكل',
    shades: ['rgba(59,130,246,0.35)', 'rgba(59,130,246,0.65)', 'rgba(59,130,246,1.00)'],
  },
}

// ─── KPI Card ─────────────────────────────────────

function KpiCard({
  statusKey, count, amount, selected, onPress,
}: {
  statusKey: DisputeStatus | 'all'
  count: number
  amount: number
  selected: boolean
  onPress: () => void
}) {
  const theme = KPI_THEMES[statusKey]
  return (
    <TouchableOpacity
      style={[
        kpiS.card,
        { backgroundColor: theme.bg, borderColor: selected ? theme.accent : theme.border },
        selected && kpiS.cardSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={kpiS.topRow}>
        <Text style={kpiS.icon}>{theme.icon}</Text>
        <Text style={kpiS.label} numberOfLines={1}>{theme.label}</Text>
      </View>
      <Text style={[kpiS.count, { color: theme.accent }]}>{count}</Text>
      <Text style={kpiS.amount} numberOfLines={1}>
        {amount > 0 ? `${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س` : '—'}
      </Text>
      <View style={[kpiS.bar, { backgroundColor: theme.accent, opacity: selected ? 1 : 0.5 }]} />
      {selected && <View style={[kpiS.dot, { backgroundColor: theme.accent }]} />}
    </TouchableOpacity>
  )
}

const kpiS = StyleSheet.create({
  card: {
    flex: 1, borderRadius: 14, padding: 12,
    borderWidth: 1.5, overflow: 'hidden', minHeight: 90,
  },
  cardSelected: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },
  topRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  icon:    { fontSize: 13 },
  label:   { flex: 1, fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },
  count:   { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  amount:  { fontSize: 9, color: COLORS.textMuted, fontWeight: '500' },
  bar:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 2 },
  dot:     { position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3, opacity: 0.9 },
})

// ─── Pivot Chart ──────────────────────────────────

function PivotChart({ selectedKey }: { selectedKey: FilterKey }) {
  const theme = KPI_THEMES[selectedKey]

  // بيانات الـ pivot حسب الخانة المختارة — آخر 4 أشهر
  const PIVOT_DATA: Record<FilterKey, { labels: string[]; values: number[]; title: string }> = {
    all: {
      labels: ['يناير', 'فبراير', 'مارس', 'أبريل'],
      values: [8, 12, 9, 5],
      title: 'إجمالي النزاعات — آخر 4 أشهر',
    },
    pending: {
      labels: ['يناير', 'فبراير', 'مارس', 'أبريل'],
      values: [3, 5, 4, 1],
      title: 'النزاعات المعلقة — آخر 4 أشهر',
    },
    won: {
      labels: ['يناير', 'فبراير', 'مارس', 'أبريل'],
      values: [2, 4, 3, 1],
      title: 'النزاعات المكسوبة — آخر 4 أشهر',
    },
    lost: {
      labels: ['يناير', 'فبراير', 'مارس', 'أبريل'],
      values: [1, 2, 1, 1],
      title: 'نزاعات الخسارة — آخر 4 أشهر',
    },
    reviewing: {
      labels: ['يناير', 'فبراير', 'مارس', 'أبريل'],
      values: [1, 1, 1, 2],
      title: 'قيد المراجعة — آخر 4 أشهر',
    },
    escalated: {
      labels: ['يناير', 'فبراير', 'مارس', 'أبريل'],
      values: [1, 0, 0, 1],
      title: 'النزاعات المُصعَّدة — آخر 4 أشهر',
    },
  }

  const data     = PIVOT_DATA[selectedKey]
  const maxVal   = Math.max(...data.values, 1)
  const change   = data.values[3] - data.values[2]
  const changePct = data.values[2] !== 0
    ? ((change / data.values[2]) * 100).toFixed(1)
    : '0'
  // للنزاعات: الانخفاض إيجابي
  const isGood   = change <= 0
  const shades   = theme.shades

  return (
    <View style={[pivS.container, { borderColor: theme.border }]}>
      {/* Header */}
      <View style={pivS.headerRow}>
        <View style={[pivS.dot, { backgroundColor: theme.accent }]} />
        <Text style={[pivS.title, { color: theme.accent }]}>{data.title}</Text>
        <View style={[pivS.badge, {
          backgroundColor: isGood ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
        }]}>
          <Text style={[pivS.badgeText, { color: isGood ? '#10B981' : '#EF4444' }]}>
            {isGood ? '▼' : '▲'} {Math.abs(parseFloat(changePct))}%
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={pivS.legendRow}>
        {data.labels.map((lbl, i) => (
          <View key={i} style={pivS.legendItem}>
            <View style={[pivS.legendDot, { backgroundColor: shades[Math.min(i, shades.length - 1)] }]} />
            <Text style={pivS.legendText}>{lbl}</Text>
          </View>
        ))}
      </View>

      {/* Bars */}
      <View style={pivS.barsRow}>
        {data.values.map((val, i) => {
          const barColor = shades[Math.min(i, shades.length - 1)]
          const heightPct = Math.max((val / maxVal) * 100, val === 0 ? 0 : 8)
          return (
            <View key={i} style={pivS.barGroup}>
              <Text style={[pivS.barVal, { color: barColor }]}>{val}</Text>
              <View style={pivS.barTrack}>
                <View style={[pivS.barFill, {
                  height: `${heightPct}%`,
                  backgroundColor: barColor,
                }]} />
              </View>
              <Text style={pivS.barLabel}>{data.labels[i]}</Text>
            </View>
          )
        })}
      </View>

      {/* Summary row */}
      <View style={pivS.summaryRow}>
        {data.labels.map((lbl, i) => (
          <View key={i} style={[
            pivS.summaryCell,
            i < data.labels.length - 1 && { borderRightWidth: 1, borderRightColor: COLORS.border },
            i === data.labels.length - 1 && { backgroundColor: `${theme.accent}12` },
          ]}>
            <Text style={pivS.sumLabel}>{lbl}</Text>
            <Text style={[pivS.sumVal, {
              color: i === data.labels.length - 1 ? theme.accent : COLORS.textSecondary,
            }]}>{data.values[i]}</Text>
          </View>
        ))}
      </View>

      {/* Insight */}
      <View style={[pivS.insight, { borderTopColor: theme.border }]}>
        <Text style={pivS.insightText}>
          💡 {isGood
            ? `تحسّن بنسبة ${Math.abs(parseFloat(changePct))}% مقارنةً بالشهر الماضي`
            : `ارتفاع بنسبة ${Math.abs(parseFloat(changePct))}% مقارنةً بالشهر الماضي`}
        </Text>
      </View>
    </View>
  )
}

const pivS = StyleSheet.create({
  container: {
    marginHorizontal: 12, marginTop: 12,
    borderRadius: 14, borderWidth: 1.5,
    backgroundColor: COLORS.cardBg, overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, gap: 8,
  },
  dot:   { width: 8, height: 8, borderRadius: 4 },
  title: { flex: 1, fontSize: 12, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  legendRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    paddingHorizontal: 16, paddingBottom: 8, gap: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 10, color: COLORS.textMuted },
  barsRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
    height: 120,
  },
  barGroup: { alignItems: 'center', flex: 1, gap: 4 },
  barVal:   { fontSize: 13, fontWeight: '800' },
  barTrack: {
    width: 32, height: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden',
  },
  barFill:  { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  summaryRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  summaryCell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  sumLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600', marginBottom: 2 },
  sumVal:   { fontSize: 13, fontWeight: '800' },
  insight:  { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  insightText: { fontSize: 11, color: COLORS.textMuted, lineHeight: 17 },
})

// ─── Dispute Card ─────────────────────────────────

function DisputeCard({
  dispute, onRespond,
}: {
  dispute: Dispute
  onRespond: (id: string) => void
}) {
  const { t }     = useTranslation()
  const theme     = KPI_THEMES[dispute.status]
  const isPending = dispute.status === 'pending'

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleDateString('ar-SA', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      })
    } catch { return s }
  }

  return (
    <View style={[dCard.container, { backgroundColor: theme.bg, borderColor: theme.border }]}>

      {/* Urgent banner */}
      {dispute.urgent && (
        <View style={dCard.urgentBanner}>
          <Text style={dCard.urgentText}>⚠ تنبيه: يتطلب رداً عاجلاً</Text>
        </View>
      )}

      {/* Top row */}
      <View style={[dCard.topRow, isRTL && dCard.rowRTL]}>
        <View style={[dCard.pill, { borderColor: theme.border }]}>
          <Text style={dCard.pillText}>{dispute.id}</Text>
        </View>
        <View style={[dCard.badge, { backgroundColor: `${theme.accent}22` }]}>
          <Text style={[dCard.badgeText, { color: theme.accent }]}>
            {theme.icon}  {theme.label}
          </Text>
        </View>
      </View>

      {/* Reason */}
      <View style={[dCard.reasonRow, isRTL && dCard.rowRTL]}>
        <Text style={dCard.reasonLabel}>السبب:</Text>
        <Text style={dCard.reasonValue}>{dispute.reason}</Text>
      </View>

      <View style={dCard.divider} />

      {/* Footer */}
      <View style={[dCard.footer, isRTL && dCard.rowRTL]}>
        <View style={dCard.footerCell}>
          <Text style={dCard.footerCellLabel}>المبلغ</Text>
          <Text style={[dCard.footerAmount, { color: theme.accent }]}>
            {dispute.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
          </Text>
        </View>

        {dispute.deadline && (
          <View style={dCard.footerCell}>
            <Text style={dCard.footerCellLabel}>الموعد النهائي</Text>
            <Text style={dCard.footerDeadline}>{formatDate(dispute.deadline)}</Text>
          </View>
        )}

        <View style={{ flex: 1 }} />

        {isPending && (
          <TouchableOpacity
            style={[dCard.respondBtn, { backgroundColor: theme.accent }]}
            onPress={() => onRespond(dispute.id)}
            activeOpacity={0.75}
          >
            <Text style={dCard.respondBtnText}>رد الآن</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const dCard = StyleSheet.create({
  container: {
    marginHorizontal: 12, marginTop: 10,
    borderRadius: 14, borderWidth: 1.5, overflow: 'hidden',
  },
  urgentBanner: {
    backgroundColor: 'rgba(245,158,11,0.18)',
    paddingHorizontal: 16, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: 'rgba(245,158,11,0.4)',
  },
  urgentText: { fontSize: 12, fontWeight: '700', color: '#F59E0B', textAlign: 'right' },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 14, paddingBottom: 10,
  },
  rowRTL: { flexDirection: 'row-reverse' },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1,
  },
  pillText:   { fontSize: 12, color: COLORS.textPrimary, fontWeight: '600', fontFamily: 'monospace' },
  badge:      { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:  { fontSize: 12, fontWeight: '700' },
  reasonRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  reasonLabel:{ fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  reasonValue:{ fontSize: 13, color: COLORS.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right' },
  divider:    { height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  footer:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  footerCell: { gap: 3 },
  footerCellLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  footerAmount:    { fontSize: 14, fontWeight: '800' },
  footerDeadline:  { fontSize: 12, fontWeight: '600', color: '#FCD34D' },
  respondBtn:      { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  respondBtnText:  { fontSize: 13, fontWeight: '700', color: '#fff' },
})

// ─── Main Screen ──────────────────────────────────

export default function DisputesScreen() {
  const { t }        = useTranslation()
  const tabBarHeight = useTabBarHeight()
  const [selected, setSelected] = useState<FilterKey>('pending')
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 800)
  }

  // إحصاءات لكل status
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    const a: Record<string, number> = {}
    DEMO_DISPUTES.forEach((d) => {
      c[d.status] = (c[d.status] ?? 0) + 1
      a[d.status] = (a[d.status] ?? 0) + d.amount
    })
    c['all'] = DEMO_DISPUTES.length
    a['all'] = DEMO_DISPUTES.reduce((s, d) => s + d.amount, 0)
    return { counts: c, amounts: a }
  }, [])

  const filtered = useMemo(
    () => selected === 'all'
      ? DEMO_DISPUTES
      : DEMO_DISPUTES.filter((d) => d.status === selected),
    [selected],
  )

  const KPI_KEYS: (DisputeStatus | 'all')[] = ['pending', 'won', 'lost', 'reviewing', 'escalated']

  const handleRespond = (id: string) => {
    Alert.alert('رد على النزاع', `سيتم فتح نموذج الرد للنزاع ${id}`)
  }

  const renderHeader = () => (
    <>
      {/* KPI Cards — صفان */}
      <View style={sc.kpiWrap}>
        <View style={[sc.kpiRow, isRTL && sc.kpiRowRTL]}>
          {KPI_KEYS.slice(0, 3).map((key) => (
            <KpiCard
              key={key}
              statusKey={key}
              count={counts.counts[key] ?? 0}
              amount={counts.amounts[key] ?? 0}
              selected={selected === key}
              onPress={() => setSelected(key)}
            />
          ))}
        </View>
        <View style={[sc.kpiRow, isRTL && sc.kpiRowRTL]}>
          {KPI_KEYS.slice(3, 5).map((key) => (
            <KpiCard
              key={key}
              statusKey={key}
              count={counts.counts[key] ?? 0}
              amount={counts.amounts[key] ?? 0}
              selected={selected === key}
              onPress={() => setSelected(key)}
            />
          ))}
          {/* خانة الكل */}
          <KpiCard
            statusKey="all"
            count={counts.counts['all'] ?? 0}
            amount={counts.amounts['all'] ?? 0}
            selected={selected === 'all'}
            onPress={() => setSelected('all')}
          />
        </View>
      </View>

      {/* Pivot Chart ديناميكي */}
      <PivotChart selectedKey={selected} />

      {/* عنوان القائمة */}
      <View style={sc.listTitleRow}>
        <Text style={sc.listTitle}>
          {KPI_THEMES[selected]?.icon} {KPI_THEMES[selected]?.label}
          {'  '}
          <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
            ({filtered.length})
          </Text>
        </Text>
      </View>
    </>
  )

  const renderEmpty = () => (
    <View style={sc.empty}>
      <Text style={sc.emptyIcon}>🎉</Text>
      <Text style={sc.emptyText}>لا توجد نزاعات في هذه الفئة</Text>
    </View>
  )

  return (
    <SafeAreaView style={sc.safeArea}>
      <InnerHeader title={t('disputes.title')} accentColor="#F59E0B" />
      <FlatList
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: ListRenderItemInfo<Dispute>) => (
          <DisputeCard dispute={item} onRespond={handleRespond} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[sc.listContent, { paddingBottom: tabBarHeight }]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

// ─── Screen Styles ────────────────────────────────

const sc = StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: COLORS.darkBg },
  listContent: { paddingTop: 4 },
  kpiWrap:     { paddingHorizontal: 12, paddingTop: 12, gap: 8 },
  kpiRow:      { flexDirection: 'row', gap: 8 },
  kpiRowRTL:   { flexDirection: 'row-reverse' },
  listTitleRow:{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  listTitle:   { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right' },
  empty: {
    alignItems: 'center', paddingVertical: 60, gap: 10,
  },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
})