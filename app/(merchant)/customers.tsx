// app/(merchant)/customers.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, FlatList, I18nManager, SafeAreaView,
  ActivityIndicator, RefreshControl, Animated, Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { InnerHeader } from '../../components/InnerHeader'
import { SmartEmptyState, EmbeddedHelp } from '../../components/SmartEmptyState'
import { customersApi } from '../../services/api'

const isRTL   = I18nManager.isRTL
const { width: SW } = Dimensions.get('window')

// ─── Types ────────────────────────────────────────────────────────────────────
interface RFM { R: number; F: number; M: number; score: number; segment: string; daysSinceLast: number }
interface Customer {
  id: string; customerId: string; name: string; phone?: string; email?: string
  city?: string; country?: string; tags: string[]; totalSpent: number
  totalOrders: number; avgOrderValue: number; refundCount: number
  lastSeenAt: string; firstSeenAt: string; rfm: RFM
}
interface Stats {
  totalCustomers: number; totalRevenue: number; totalOrders: number
  avgLTV: number; churnRate: number
  segmentCounts: Record<string, number>
  topCustomers: Array<{ id: string; name: string; totalSpent: number; segment: string }>
  cohort: Array<{ month: string; count: number }>
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SEGMENTS: Array<{ key: string; labelAr: string; color: string; bg: string; icon: string }> = [
  { key: 'all',     labelAr: 'الكل',       color: COLORS.primaryLight,    bg: 'rgba(59,130,246,0.15)',  icon: '👥' },
  { key: 'VIP',     labelAr: 'VIP',        color: '#F59E0B',              bg: 'rgba(245,158,11,0.15)', icon: '⭐' },
  { key: 'loyal',   labelAr: 'وفي',        color: COLORS.success,         bg: COLORS.successBg,        icon: '💚' },
  { key: 'active',  labelAr: 'نشط',        color: '#06B6D4',              bg: 'rgba(6,182,212,0.15)',  icon: '⚡' },
  { key: 'new',     labelAr: 'جديد',       color: '#8B5CF6',              bg: 'rgba(139,92,246,0.15)', icon: '🆕' },
  { key: 'at_risk', labelAr: 'في خطر',     color: COLORS.warning,         bg: COLORS.warningBg,        icon: '⚠️' },
  { key: 'lost',    labelAr: 'خامل',       color: COLORS.danger,          bg: COLORS.dangerBg,         icon: '💤' },
]

const SORT_OPTIONS = [
  { key: 'totalSpent',   labelAr: 'الإنفاق' },
  { key: 'totalOrders',  labelAr: 'الطلبات' },
  { key: 'lastSeenAt',   labelAr: 'الأحدث'  },
  { key: 'firstSeenAt',  labelAr: 'الأقدم'  },
]

const PIVOT_TABS = [
  { key: 'overview',  labelAr: 'نظرة عامة' },
  { key: 'segments',  labelAr: 'التقسيم'   },
  { key: 'cohort',    labelAr: 'التطور'    },
  { key: 'top',       labelAr: 'الأفضل'    },
]

function segInfo(seg: string) {
  return SEGMENTS.find(s => s.key === seg) ?? SEGMENTS[0]
}

function formatAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'اليوم'
  if (days === 1) return 'أمس'
  if (days < 30) return `${days} يوم`
  if (days < 365) return `${Math.floor(days / 30)} شهر`
  return `${Math.floor(days / 365)} سنة`
}

function formatMoney(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' ر.س'
}

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
function MiniBarChart({ data, color }: { data: Array<{ label: string; value: number }>; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <View style={mbc.wrap}>
      {data.map((d, i) => (
        <View key={i} style={mbc.col}>
          <View style={[mbc.track]}>
            <View style={[mbc.fill, { height: `${Math.max((d.value / max) * 100, 4)}%`, backgroundColor: color }]} />
          </View>
          <Text style={mbc.label} numberOfLines={1}>{d.label.slice(5)}</Text>
        </View>
      ))}
    </View>
  )
}
const mbc = StyleSheet.create({
  wrap:  { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 4, height: 56 },
  col:   { flex: 1, alignItems: 'center', gap: 2 },
  track: { width: '80%', height: 40, backgroundColor: COLORS.surfaceBg, borderRadius: 3, justifyContent: 'flex-end', overflow: 'hidden' },
  fill:  { width: '100%', borderRadius: 3 },
  label: { fontSize: 8, color: COLORS.textMuted, textAlign: 'center' },
})

// ─── RFM Badge ────────────────────────────────────────────────────────────────
function RFMBadge({ score, segment }: { score: number; segment: string }) {
  const info = segInfo(segment)
  return (
    <View style={[rfmS.badge, { backgroundColor: info.bg, borderColor: info.color + '55' }]}>
      <Text style={rfmS.icon}>{info.icon}</Text>
      <Text style={[rfmS.label, { color: info.color }]}>{info.labelAr}</Text>
      <Text style={[rfmS.score, { color: info.color }]}>{score.toFixed(1)}</Text>
    </View>
  )
}
const rfmS = StyleSheet.create({
  badge: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  icon:  { fontSize: 11 },
  label: { fontSize: 11, fontWeight: '700' },
  score: { fontSize: 10, fontWeight: '600', opacity: 0.8 },
})

// ─── Customer Row ─────────────────────────────────────────────────────────────
function CustomerRow({ item, onPress }: { item: Customer; onPress: () => void }) {
  const info = segInfo(item.rfm.segment)
  return (
    <TouchableOpacity style={crS.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[crS.avatar, { backgroundColor: info.bg, borderColor: info.color + '60' }]}>
        <Text style={[crS.avatarText, { color: info.color }]}>{item.name.charAt(0)}</Text>
      </View>
      <View style={crS.info}>
        <View style={[crS.nameRow, isRTL && { flexDirection: 'row-reverse' }]}>
          <Text style={crS.name} numberOfLines={1}>{item.name}</Text>
          <RFMBadge score={item.rfm.score} segment={item.rfm.segment} />
        </View>
        <View style={[crS.meta, isRTL && { flexDirection: 'row-reverse' }]}>
          <Text style={crS.metaTxt}>{item.totalOrders} طلب</Text>
          <Text style={crS.dot}>·</Text>
          <Text style={crS.metaTxt}>{item.city || '—'}</Text>
          <Text style={crS.dot}>·</Text>
          <Text style={crS.metaTxt}>آخر نشاط {formatAgo(item.lastSeenAt)}</Text>
        </View>
      </View>
      <View style={crS.right}>
        <Text style={crS.amount}>{formatMoney(item.totalSpent)}</Text>
        <Text style={crS.avg}>متوسط {formatMoney(item.avgOrderValue)}</Text>
      </View>
    </TouchableOpacity>
  )
}
const crS = StyleSheet.create({
  row:        { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatar:     { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  info:       { flex: 1, gap: 4 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name:       { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  meta:       { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaTxt:    { fontSize: 11, color: COLORS.textMuted },
  dot:        { fontSize: 11, color: COLORS.textMuted },
  right:      { alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 2 },
  amount:     { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  avg:        { fontSize: 10, color: COLORS.textMuted },
})

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, color, bg }: { label: string; value: string; sub?: string; color: string; bg: string }) {
  return (
    <View style={[kpiS.card, { backgroundColor: bg, borderColor: color + '40' }]}>
      <Text style={[kpiS.value, { color }]}>{value}</Text>
      <Text style={kpiS.label}>{label}</Text>
      {sub ? <Text style={kpiS.sub}>{sub}</Text> : null}
    </View>
  )
}
const kpiS = StyleSheet.create({
  card:  { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, gap: 2, minWidth: (SW - 48) / 3 },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  sub:   { fontSize: 10, color: COLORS.textMuted },
})

// ─── Donut-style Segment Chart ────────────────────────────────────────────────
function SegmentBreakdown({ counts, total }: { counts: Record<string, number>; total: number }) {
  return (
    <View style={sbS.wrap}>
      {SEGMENTS.filter(s => s.key !== 'all').map(seg => {
        const count = counts[seg.key] || 0
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <View key={seg.key} style={sbS.row}>
            <View style={[sbS.dot, { backgroundColor: seg.color }]} />
            <Text style={sbS.label}>{seg.labelAr}</Text>
            <View style={sbS.barWrap}>
              <View style={[sbS.barFill, { width: `${pct}%`, backgroundColor: seg.color + 'CC' }]} />
            </View>
            <Text style={[sbS.count, { color: seg.color }]}>{count}</Text>
            <Text style={sbS.pct}>{pct}%</Text>
          </View>
        )
      })}
    </View>
  )
}
const sbS = StyleSheet.create({
  wrap:    { gap: 10 },
  row:     { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 },
  dot:     { width: 8, height: 8, borderRadius: 4 },
  label:   { fontSize: 12, color: COLORS.textSecondary, width: 50, textAlign: isRTL ? 'right' : 'left' },
  barWrap: { flex: 1, height: 6, backgroundColor: COLORS.surfaceBg, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  count:   { fontSize: 13, fontWeight: '700', width: 24, textAlign: 'center' },
  pct:     { fontSize: 11, color: COLORS.textMuted, width: 32, textAlign: 'right' },
})

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CustomersScreen() {
  const router       = useRouter()
  const tabBarHeight = useTabBarHeight()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats]         = useState<Stats | null>(null)
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch]       = useState('')
  const [segment, setSegment]     = useState('all')
  const [sortKey, setSortKey]     = useState('totalSpent')
  const [pivotTab, setPivotTab]   = useState('overview')
  const [error, setError]         = useState<string | null>(null)

  const fetchData = useCallback(async (seg?: string, sort?: string) => {
    try {
      setError(null)
      const res = await customersApi.list({ segment: (seg || segment) !== 'all' ? (seg || segment) : undefined, sort: sort || sortKey, limit: 50 })
      setCustomers(res.customers)
      setStats(res.stats)
    } catch (e: any) {
      setError(e.message || 'خطأ في تحميل البيانات')
    } finally { setLoading(false); setRefreshing(false) }
  }, [segment, sortKey])

  useEffect(() => { fetchData() }, [])

  const onRefresh = () => { setRefreshing(true); fetchData() }

  const onSegmentChange = (s: string) => {
    setSegment(s)
    setLoading(true)
    fetchData(s, sortKey)
  }

  const onSortChange = (s: string) => {
    setSortKey(s)
    fetchData(segment, s)
  }

  const filtered = search
    ? customers.filter(c =>
        c.name.includes(search) ||
        (c.phone || '').includes(search) ||
        (c.city || '').includes(search)
      )
    : customers

  // ─── Pivot: Overview ────────────────────────────────────────────
  const renderOverview = () => (
    <View style={ps.section}>
      <View style={[ps.kpiRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <KPI label="إجمالي العملاء" value={String(stats?.totalCustomers || 0)} color={COLORS.primaryLight} bg="rgba(59,130,246,0.12)" />
        <KPI label="متوسط LTV" value={formatMoney(stats?.avgLTV || 0)} color="#F59E0B" bg="rgba(245,158,11,0.12)" />
        <KPI label="نسبة الخسارة" value={`${stats?.churnRate || 0}%`} color={COLORS.danger} bg={COLORS.dangerBg} />
      </View>
      <View style={[ps.kpiRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <KPI label="إجمالي الإيرادات" value={formatMoney(stats?.totalRevenue || 0)} color={COLORS.success} bg={COLORS.successBg} />
        <KPI label="إجمالي الطلبات" value={String(stats?.totalOrders || 0)} color="#8B5CF6" bg="rgba(139,92,246,0.12)" />
        <KPI label="VIP" value={String(stats?.segmentCounts?.VIP || 0)} color="#F59E0B" bg="rgba(245,158,11,0.12)" />
      </View>

      {/* مؤشر الصحة العامة */}
      <View style={ps.healthCard}>
        <Text style={ps.cardTitle}>🩺 صحة قاعدة العملاء</Text>
        {(() => {
          const vip = stats?.segmentCounts?.VIP || 0
          const loyal = stats?.segmentCounts?.loyal || 0
          const atRisk = stats?.segmentCounts?.at_risk || 0
          const lost = stats?.segmentCounts?.lost || 0
          const total = stats?.totalCustomers || 1
          const healthScore = Math.round(((vip * 2 + loyal * 1.5) - (atRisk + lost * 1.5)) / total * 100 + 50)
          const clamped = Math.max(0, Math.min(100, healthScore))
          const color = clamped >= 70 ? COLORS.success : clamped >= 40 ? COLORS.warning : COLORS.danger
          const label = clamped >= 70 ? 'ممتاز' : clamped >= 40 ? 'متوسط — تحتاج تحسين' : 'ضعيف — تدخل مطلوب'
          return (
            <>
              <View style={ps.healthBarWrap}>
                <View style={[ps.healthBarFill, { width: `${clamped}%`, backgroundColor: color }]} />
              </View>
              <View style={[ps.healthMeta, isRTL && { flexDirection: 'row-reverse' }]}>
                <Text style={[ps.healthScore, { color }]}>{clamped}/100</Text>
                <Text style={ps.healthLabel}>{label}</Text>
              </View>
            </>
          )
        })()}
      </View>
    </View>
  )

  // ─── Pivot: Segments ─────────────────────────────────────────────
  const renderSegments = () => (
    <View style={ps.section}>
      <Text style={ps.cardTitle}>📊 توزيع العملاء بالشرائح</Text>
      <SegmentBreakdown counts={stats?.segmentCounts || {}} total={stats?.totalCustomers || 0} />

      <View style={ps.divider} />

      {/* توصيات على مستوى الشرائح */}
      <Text style={ps.cardTitle}>💡 توصيات ذكية</Text>
      <View style={ps.recsList}>
        {stats && (() => {
          const recs = []
          const atRisk = stats.segmentCounts?.at_risk || 0
          const lost = stats.segmentCounts?.lost || 0
          const vip = stats.segmentCounts?.VIP || 0
          const newC = stats.segmentCounts?.new || 0

          if (atRisk > 0)
            recs.push({ icon: '⚠️', color: COLORS.warning, bg: COLORS.warningBg, text: `لديك ${atRisk} عميل في خطر فقدان — أرسل عروضاً استرداد فورية`, action: 'at_risk' })
          if (lost > 0)
            recs.push({ icon: '💤', color: COLORS.danger, bg: COLORS.dangerBg, text: `${lost} عميل خامل — ابدأ حملة Win-Back بخصم 20%`, action: 'lost' })
          if (vip > 0)
            recs.push({ icon: '⭐', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', text: `${vip} عميل VIP — أنشئ برنامج ولاء حصري لهم`, action: 'VIP' })
          if (newC > 0)
            recs.push({ icon: '🆕', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', text: `${newC} عميل جديد — تابع بـ onboarding sequence`, action: 'new' })
          if (stats.churnRate > 30)
            recs.push({ icon: '🚨', color: COLORS.danger, bg: COLORS.dangerBg, text: `معدل الخسارة ${stats.churnRate}% مرتفع — راجع تجربة العميل`, action: '' })

          return recs.map((r, i) => (
            <TouchableOpacity key={i}
              style={[ps.recRow, { backgroundColor: r.bg, borderColor: r.color + '40' }]}
              onPress={() => r.action && onSegmentChange(r.action)}
              activeOpacity={0.75}
            >
              <Text style={ps.recIcon}>{r.icon}</Text>
              <Text style={[ps.recText, { color: r.color, flex: 1 }]}>{r.text}</Text>
              {r.action ? <Text style={[ps.recArrow, { color: r.color }]}>{isRTL ? '←' : '→'}</Text> : null}
            </TouchableOpacity>
          ))
        })()}
      </View>
    </View>
  )

  // ─── Pivot: Cohort ───────────────────────────────────────────────
  const renderCohort = () => (
    <View style={ps.section}>
      <Text style={ps.cardTitle}>📈 نمو العملاء الجدد (آخر 6 أشهر)</Text>
      {stats?.cohort && stats.cohort.length > 0
        ? <MiniBarChart data={stats.cohort.map(c => ({ label: c.month, value: c.count }))} color={COLORS.primaryLight} />
        : <Text style={ps.emptyTxt}>لا توجد بيانات كافية</Text>
      }

      <View style={ps.divider} />

      <Text style={ps.cardTitle}>📊 إحصائيات الاحتفاظ</Text>
      <View style={[ps.kpiRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <KPI label="معدل الاحتفاظ" value={`${100 - (stats?.churnRate || 0)}%`} color={COLORS.success} bg={COLORS.successBg} />
        <KPI label="معدل الخسارة" value={`${stats?.churnRate || 0}%`} color={COLORS.danger} bg={COLORS.dangerBg} />
        <KPI label="متوسط LTV" value={formatMoney(stats?.avgLTV || 0)} color="#F59E0B" bg="rgba(245,158,11,0.12)" />
      </View>

      <View style={[ps.infoCard, { borderColor: COLORS.info + '40', backgroundColor: COLORS.infoBg }]}>
        <Text style={[ps.infoText, { color: COLORS.info }]}>
          💡 {stats?.churnRate && stats.churnRate > 25
            ? `معدل الخسارة (${stats.churnRate}%) أعلى من المتوسط. رفعه إلى أقل من 20% يزيد الإيراد بنسبة تصل إلى 35%.`
            : `معدل الخسارة (${stats?.churnRate || 0}%) في النطاق الصحي. استمر في الاستراتيجية الحالية.`
          }
        </Text>
      </View>
    </View>
  )

  // ─── Pivot: Top Customers ────────────────────────────────────────
  const renderTop = () => (
    <View style={ps.section}>
      <Text style={ps.cardTitle}>🏆 أفضل 5 عملاء بالإيراد</Text>
      {stats?.topCustomers?.map((c, i) => {
        const info = segInfo(c.segment)
        return (
          <TouchableOpacity
            key={c.id}
            style={ps.topRow}
            onPress={() => router.push({ pathname: '/(merchant)/customer-detail', params: { id: c.id } })}
            activeOpacity={0.75}
          >
            <Text style={ps.topRank}>#{i + 1}</Text>
            <View style={[ps.topAvatar, { backgroundColor: info.bg, borderColor: info.color + '60' }]}>
              <Text style={[ps.topAvatarText, { color: info.color }]}>{c.name.charAt(0)}</Text>
            </View>
            <Text style={[ps.topName, { flex: 1 }]} numberOfLines={1}>{c.name}</Text>
            <RFMBadge score={0} segment={c.segment} />
            <Text style={ps.topAmount}>{formatMoney(c.totalSpent)}</Text>
          </TouchableOpacity>
        )
      })}

      <View style={ps.divider} />

      <Text style={ps.cardTitle}>📊 توزيع الإيراد بالشريحة</Text>
      {stats && (() => {
        const vipSpend   = (stats.segmentCounts?.VIP   || 0) * (stats.avgLTV * 2.5)
        const loyalSpend = (stats.segmentCounts?.loyal  || 0) * (stats.avgLTV * 1.5)
        const otherSpend = stats.totalRevenue - vipSpend - loyalSpend
        const data = [
          { label: 'VIP',   value: Math.max(vipSpend, 0),   color: '#F59E0B' },
          { label: 'وفي',   value: Math.max(loyalSpend, 0), color: COLORS.success },
          { label: 'آخرون', value: Math.max(otherSpend, 0), color: COLORS.primaryLight },
        ].filter(d => d.value > 0)
        const total = data.reduce((s, d) => s + d.value, 0) || 1
        return data.map(d => (
          <View key={d.label} style={[sbS.row, { marginBottom: 6 }]}>
            <View style={[sbS.dot, { backgroundColor: d.color }]} />
            <Text style={[sbS.label, { width: 44 }]}>{d.label}</Text>
            <View style={sbS.barWrap}>
              <View style={[sbS.barFill, { width: `${(d.value / total) * 100}%`, backgroundColor: d.color + 'CC' }]} />
            </View>
            <Text style={[sbS.pct, { color: d.color, width: 42 }]}>{Math.round((d.value / total) * 100)}%</Text>
          </View>
        ))
      })()}
    </View>
  )

  // ─── Render ───────────────────────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={s.safe}>
        <InnerHeader title="إدارة العملاء" accentColor="#F59E0B" />
        <View style={s.center}><ActivityIndicator color={COLORS.primaryLight} size="large" /></View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <InnerHeader title="إدارة العملاء" accentColor="#F59E0B" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} colors={[COLORS.primaryLight]} />}
      >

        {/* ─── Header Banner ── */}
        <View style={s.banner}>
          <View style={[s.bannerRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={s.bannerTitle}>👥 قاعدة العملاء</Text>
            <View style={[s.bannerBadge]}>
              <Text style={s.bannerBadgeTxt}>{stats?.totalCustomers || 0} عميل</Text>
            </View>
          </View>
          <Text style={s.bannerSub}>تحليل متقدم · RFM · توصيات ذكية</Text>
        </View>

        {/* ─── Pivot Tabs ─────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pivotScroll} contentContainerStyle={s.pivotContent}>
          {PIVOT_TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[s.pivotTab, pivotTab === tab.key && s.pivotTabActive]}
              onPress={() => setPivotTab(tab.key)}
              activeOpacity={0.75}
            >
              <Text style={[s.pivotTabTxt, pivotTab === tab.key && s.pivotTabTxtActive]}>
                {tab.labelAr}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ─── Pivot Content ─── */}
        {pivotTab === 'overview' && renderOverview()}
        {pivotTab === 'segments' && renderSegments()}
        {pivotTab === 'cohort'   && renderCohort()}
        {pivotTab === 'top'      && renderTop()}

        {/* ─── Filter: Segments ─ */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.segScroll} contentContainerStyle={s.segContent}>
          {SEGMENTS.map(seg => (
            <TouchableOpacity
              key={seg.key}
              style={[s.segTab, segment === seg.key && { backgroundColor: seg.bg, borderColor: seg.color }]}
              onPress={() => onSegmentChange(seg.key)}
              activeOpacity={0.75}
            >
              <Text style={s.segIcon}>{seg.icon}</Text>
              <Text style={[s.segTxt, segment === seg.key && { color: seg.color, fontWeight: '700' }]}>
                {seg.labelAr}
              </Text>
              {stats?.segmentCounts && seg.key !== 'all' && (
                <View style={[s.segBadge, { backgroundColor: seg.color + '33' }]}>
                  <Text style={[s.segBadgeTxt, { color: seg.color }]}>{stats.segmentCounts[seg.key] || 0}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ─── Sort + Search ──── */}
        <View style={s.toolRow}>
          <TextInput
            style={[s.search, { flex: 1 }]}
            placeholder="بحث بالاسم أو الهاتف..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
            textAlign="right"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.sortScroll} contentContainerStyle={{ gap: 6, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[s.sortBtn, sortKey === opt.key && s.sortBtnActive]}
                onPress={() => onSortChange(opt.key)}
              >
                <Text style={[s.sortTxt, sortKey === opt.key && s.sortTxtActive]}>{opt.labelAr}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ─── Customer List ──── */}
        <View style={s.listWrap}>
          {error
            ? <Text style={s.errorTxt}>{error}</Text>
            : filtered.length === 0
              : <SmartEmptyState type="customers" compact />
              : filtered.map(item => (
                  <CustomerRow
                    key={item.id}
                    item={item}
                    onPress={() => router.push({ pathname: '/(merchant)/customer-detail', params: { id: item.id } })}
                  />
                ))
          }
        </View>

      <EmbeddedHelp
        context="العملاء"
        color="#10B981"
        items={[
          { q: 'كيف تُحسب قيمة العميل (CLV)؟', a: 'CLV = مجموع مشترياته منذ أول طلب. يُحدَّث تلقائياً بعد كل معاملة.' },
          { q: 'ما معنى شريحة VIP؟', a: 'العملاء الذين أنفقوا أكثر من 5000 ر.س وأتموا أكثر من 10 طلبات.' },
          { q: 'كيف أتواصل مع عميل؟', a: 'اضغط على اسم العميل ثم اختر واتساب أو اتصال.' },
        ]}
      />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.darkBg },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  banner:      { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'rgba(245,158,11,0.1)', borderBottomWidth: 1, borderBottomColor: 'rgba(245,158,11,0.25)' },
  bannerRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  bannerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  bannerBadge: { backgroundColor: 'rgba(245,158,11,0.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  bannerBadgeTxt: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  bannerSub:   { fontSize: 11, color: COLORS.textMuted },

  pivotScroll:   { backgroundColor: COLORS.darkBg },
  pivotContent:  { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' },
  pivotTab:      { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cardBg },
  pivotTabActive:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pivotTabTxt:   { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  pivotTabTxtActive: { color: COLORS.white, fontWeight: '700' },

  segScroll:   { backgroundColor: COLORS.surfaceBg, borderTopWidth: 1, borderTopColor: COLORS.border },
  segContent:  { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' },
  segTab:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cardBg },
  segIcon:     { fontSize: 12 },
  segTxt:      { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  segBadge:    { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  segBadgeTxt: { fontSize: 10, fontWeight: '800' },

  toolRow:     { flexDirection: isRTL ? 'row-reverse' : 'row', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4, gap: 8, alignItems: 'center' },
  search:      { height: 40, backgroundColor: COLORS.cardBg, borderRadius: 10, paddingHorizontal: 12, fontSize: 13, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  sortScroll:  { maxWidth: 180 },
  sortBtn:     { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cardBg },
  sortBtnActive: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primary },
  sortTxt:     { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  sortTxtActive: { color: COLORS.white },

  listWrap:    { backgroundColor: COLORS.cardBg, marginTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  emptyTxt:    { textAlign: 'center', color: COLORS.textMuted, fontSize: 14, paddingVertical: 40 },
  errorTxt:    { textAlign: 'center', color: COLORS.danger, fontSize: 13, paddingVertical: 32, paddingHorizontal: 16 },
})

const ps = StyleSheet.create({
  section:    { paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  kpiRow:     { flexDirection: 'row', gap: 8 },
  cardTitle:  { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  divider:    { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  emptyTxt:   { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 16 },

  healthCard:    { backgroundColor: COLORS.cardBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 8 },
  healthBarWrap: { height: 8, backgroundColor: COLORS.surfaceBg, borderRadius: 4, overflow: 'hidden' },
  healthBarFill: { height: '100%', borderRadius: 4 },
  healthMeta:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  healthScore:   { fontSize: 20, fontWeight: '800' },
  healthLabel:   { fontSize: 12, color: COLORS.textSecondary },

  recsList: { gap: 8 },
  recRow:   { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  recIcon:  { fontSize: 16 },
  recText:  { fontSize: 13, fontWeight: '600', textAlign: isRTL ? 'right' : 'left' },
  recArrow: { fontSize: 14, fontWeight: '700' },

  infoCard: { borderRadius: 10, borderWidth: 1, padding: 12 },
  infoText: { fontSize: 12, lineHeight: 20, textAlign: isRTL ? 'right' : 'left' },

  topRow:       { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  topRank:      { fontSize: 13, fontWeight: '800', color: COLORS.textMuted, width: 24, textAlign: 'center' },
  topAvatar:    { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topAvatarText:{ fontSize: 14, fontWeight: '700' },
  topName:      { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  topAmount:    { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
})