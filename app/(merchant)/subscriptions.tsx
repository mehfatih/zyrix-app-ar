// app/(merchant)/subscriptions.tsx
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  I18nManager, SafeAreaView, ActivityIndicator, RefreshControl,
  Alert, Modal, ListRenderItemInfo,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { subscriptionsApi } from '../../services/api'
import { StatusBadge } from '../../components/StatusBadge'
import { InnerHeader } from '../../components/InnerHeader'

const isRTL = I18nManager.isRTL

interface Sub {
  id: string; subscriptionId: string; customerName: string;
  amount: string; currency: string; interval: string; title: string;
  status: string; nextBillingDate: string; billingCount: number; createdAt: string;
}

// ─── Tier Themes — 4 باقات بألوان مختلفة ─────────

const TIER_THEMES = {
  diamond:  { accent: '#06B6D4', bg: 'rgba(6,182,212,0.13)',   border: 'rgba(6,182,212,0.40)',   icon: '💎', label: 'الماسية',  features: 12, price: 'SAR 999' },
  gold:     { accent: '#F59E0B', bg: 'rgba(245,158,11,0.13)',  border: 'rgba(245,158,11,0.40)',  icon: '🥇', label: 'الذهبية',  features: 8,  price: 'SAR 499' },
  silver:   { accent: '#94A3B8', bg: 'rgba(148,163,184,0.13)', border: 'rgba(148,163,184,0.40)', icon: '🥈', label: 'الفضية',   features: 5,  price: 'SAR 249' },
  bronze:   { accent: '#CD7C2F', bg: 'rgba(205,124,47,0.13)',  border: 'rgba(205,124,47,0.40)',  icon: '🥉', label: 'البرونزية', features: 3,  price: 'SAR 99'  },
}

// ─── KPI Themes ───────────────────────────────────

const KPI_THEMES = [
  { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.40)',  accent: '#10B981', label: 'نشطة'    },
  { bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.40)',  accent: '#6366F1', label: 'متوقفة'  },
  { bg: 'rgba(6,182,212,0.15)',   border: 'rgba(6,182,212,0.40)',   accent: '#06B6D4', label: 'إجمالي'  },
  { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.40)',  accent: '#F59E0B', label: 'الإيراد' },
]

// ─── Pivot Data — مميزات الباقات ─────────────────

const PIVOT_DATA = [
  {
    title: 'الاشتراكات النشطة — آخر 3 أشهر',
    months: ['يناير', 'فبراير', 'مارس'],
    values: [18, 22, 28],
  },
  {
    title: 'الاشتراكات المتوقفة — آخر 3 أشهر',
    months: ['يناير', 'فبراير', 'مارس'],
    values: [4, 2, 1],
  },
  {
    title: 'إجمالي الاشتراكات — آخر 3 أشهر',
    months: ['يناير', 'فبراير', 'مارس'],
    values: [22, 24, 29],
  },
  {
    title: 'إيراد الاشتراكات — آخر 3 أشهر',
    months: ['يناير', 'فبراير', 'مارس'],
    values: [14200, 18700, 24600],
  },
]

// ─── Features Pivot — لتحفيز الترقية ─────────────

const TIER_FEATURES = [
  { tier: 'diamond', label: 'الماسية',  color: '#06B6D4', count: 12, items: ['API غير محدود', 'دعم 24/7 مخصص', 'لوحة تحليلات متقدمة', 'تقارير مخصصة', 'حماية من الاحتيال', 'تكاملات غير محدودة', 'مدير حساب خاص', 'SLA 99.99%', 'COD متقدم', 'أسعار صرف فورية', 'فواتير تلقائية', 'اشتراكات متعددة'] },
  { tier: 'gold',    label: 'الذهبية',  color: '#F59E0B', count: 8,  items: ['API 10,000 طلب/يوم', 'دعم أولوية', 'تحليلات متوسطة', 'تقارير شهرية', 'حماية من الاحتيال', 'تكاملات 5', 'COD أساسي', 'اشتراكات متعددة'] },
  { tier: 'silver',  label: 'الفضية',   color: '#94A3B8', count: 5,  items: ['API 2,000 طلب/يوم', 'دعم بريد إلكتروني', 'تحليلات أساسية', 'تقارير أسبوعية', 'COD أساسي'] },
  { tier: 'bronze',  label: 'البرونزية', color: '#CD7C2F', count: 3,  items: ['API 500 طلب/يوم', 'دعم بريد إلكتروني', 'تحليلات أساسية'] },
]

// ─── KPI Card ─────────────────────────────────────

function KpiCard({ label, value, themeIdx, selected, onPress }: {
  label: string; value: string; themeIdx: number; selected: boolean; onPress: () => void;
}) {
  const t = KPI_THEMES[themeIdx]
  return (
    <TouchableOpacity
      style={[kS.card, { backgroundColor: t.bg, borderColor: selected ? t.accent : t.border }, selected && kS.sel]}
      onPress={onPress} activeOpacity={0.75}
    >
      <Text style={kS.lbl} numberOfLines={1}>{label}</Text>
      <Text style={[kS.val, { color: t.accent }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <View style={[kS.bar, { backgroundColor: t.accent, opacity: selected ? 1 : 0.5 }]} />
      {selected && <View style={[kS.dot, { backgroundColor: t.accent }]} />}
    </TouchableOpacity>
  )
}

const kS = StyleSheet.create({
  card: { flex: 1, borderRadius: 13, padding: 11, borderWidth: 1.5, overflow: 'hidden', minHeight: 80 },
  sel:  { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  lbl:  { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6, textAlign: 'right' },
  val:  { fontSize: 20, fontWeight: '800', textAlign: 'right' },
  bar:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 2 },
  dot:  { position: 'absolute', top: 7, left: 7, width: 6, height: 6, borderRadius: 3 },
})

// ─── Pivot Chart (KPI) ────────────────────────────

function PivotChart({ idx }: { idx: number }) {
  const theme = KPI_THEMES[idx]
  const d     = PIVOT_DATA[idx]
  const max   = Math.max(...d.values, 1)
  const chg   = d.values[2] - d.values[1]
  const pct   = d.values[1] !== 0 ? Math.abs(chg / d.values[1] * 100).toFixed(1) : '0'
  const good  = chg >= 0
  const shades = [`${theme.accent}55`, `${theme.accent}99`, theme.accent]
  const fmt = (v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)

  return (
    <View style={[pS.container, { borderColor: theme.border }]}>
      <View style={pS.head}>
        <View style={[pS.dot, { backgroundColor: theme.accent }]} />
        <Text style={[pS.title, { color: theme.accent }]}>{d.title}</Text>
        <View style={[pS.badge, { backgroundColor: good ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
          <Text style={[pS.badgeTxt, { color: good ? '#10B981' : '#EF4444' }]}>
            {good ? '▲' : '▼'} {pct}%
          </Text>
        </View>
      </View>

      <View style={pS.legendRow}>
        {d.months.map((m, i) => (
          <View key={i} style={pS.legItem}>
            <View style={[pS.legDot, { backgroundColor: shades[i] }]} />
            <Text style={pS.legTxt}>{m}</Text>
          </View>
        ))}
      </View>

      <View style={pS.barsRow}>
        {d.values.map((v, i) => {
          const h = Math.max((v / max) * 100, 6)
          return (
            <View key={i} style={pS.barGroup}>
              <Text style={[pS.barVal, { color: shades[i] }]}>{fmt(v)}</Text>
              <View style={pS.barTrack}>
                <View style={[pS.barFill, { height: `${h}%`, backgroundColor: shades[i] }]} />
              </View>
              <Text style={pS.barLbl}>{d.months[i]}</Text>
            </View>
          )
        })}
      </View>

      <View style={pS.sumRow}>
        {d.values.map((v, i) => (
          <View key={i} style={[
            pS.sumCell,
            i < 2 && { borderRightWidth: 1, borderRightColor: COLORS.border },
            i === 2 && { backgroundColor: `${theme.accent}12` },
          ]}>
            <Text style={pS.sumLbl}>{d.months[i]}</Text>
            <Text style={[pS.sumVal, { color: i === 2 ? theme.accent : COLORS.textSecondary }]}>{fmt(v)}</Text>
          </View>
        ))}
      </View>

      <View style={[pS.insight, { borderTopColor: theme.border }]}>
        <Text style={pS.insightTxt}>
          💡 {good
            ? `تحسّن بنسبة ${pct}% مقارنةً بالشهر الماضي`
            : `تراجع بنسبة ${pct}% مقارنةً بالشهر الماضي`}
        </Text>
      </View>
    </View>
  )
}

// ─── Features Pivot — مقارنة مميزات الباقات ──────

function FeaturesPivot() {
  const max = Math.max(...TIER_FEATURES.map(t => t.count))

  return (
    <View style={fpS.container}>
      <View style={fpS.head}>
        <View style={[fpS.dot, { backgroundColor: '#06B6D4' }]} />
        <Text style={[fpS.title, { color: '#06B6D4' }]}>مقارنة مميزات الباقات</Text>
        <View style={fpS.topBadge}>
          <Text style={fpS.topBadgeTxt}>💎 الماسية الأفضل</Text>
        </View>
      </View>

      {/* Bars */}
      <View style={fpS.barsRow}>
        {TIER_FEATURES.map((tier, i) => {
          const h = Math.max((tier.count / max) * 100, 10)
          const isTop = i === 0
          return (
            <View key={i} style={fpS.barGroup}>
              <Text style={[fpS.barCount, { color: tier.color }]}>{tier.count}</Text>
              <View style={[fpS.barTrack, isTop && { borderWidth: 1, borderColor: `${tier.color}40` }]}>
                <View style={[fpS.barFill, {
                  height: `${h}%`,
                  backgroundColor: tier.color,
                  opacity: isTop ? 1 : 0.6,
                }]} />
              </View>
              <Text style={[fpS.barLabel, { color: tier.color }]}>{tier.label.replace('ال', '')}</Text>
            </View>
          )
        })}
      </View>

      {/* Summary */}
      <View style={fpS.sumRow}>
        {TIER_FEATURES.map((tier, i) => (
          <View key={i} style={[
            fpS.sumCell,
            i < 3 && { borderRightWidth: 1, borderRightColor: COLORS.border },
            i === 0 && { backgroundColor: `${tier.color}12` },
          ]}>
            <Text style={[fpS.sumPrice, { color: tier.color }]}>{TIER_THEMES[tier.tier as keyof typeof TIER_THEMES].price}</Text>
            <Text style={fpS.sumFeatures}>{tier.count} ميزة</Text>
          </View>
        ))}
      </View>

      <View style={fpS.insight}>
        <Text style={fpS.insightTxt}>
          💡 الباقة الماسية توفر 4× مميزات أكثر من البرونزية — استثمارك الأمثل
        </Text>
      </View>
    </View>
  )
}

const fpS = StyleSheet.create({
  container:   { marginHorizontal: 12, marginBottom: 10, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(6,182,212,0.35)', backgroundColor: COLORS.cardBg, overflow: 'hidden' },
  head:        { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 7 },
  dot:         { width: 7, height: 7, borderRadius: 4 },
  title:       { flex: 1, fontSize: 11, fontWeight: '600', textAlign: 'right' },
  topBadge:    { backgroundColor: 'rgba(6,182,212,0.15)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  topBadgeTxt: { fontSize: 9, fontWeight: '700', color: '#06B6D4' },
  barsRow:     { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingHorizontal: 12, paddingBottom: 6, height: 100 },
  barGroup:    { alignItems: 'center', flex: 1, gap: 3 },
  barCount:    { fontSize: 13, fontWeight: '800' },
  barTrack:    { width: 32, height: 65, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill:     { width: '100%', borderRadius: 6 },
  barLabel:    { fontSize: 9, fontWeight: '600' },
  sumRow:      { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  sumCell:     { flex: 1, alignItems: 'center', paddingVertical: 8 },
  sumPrice:    { fontSize: 11, fontWeight: '800', marginBottom: 2 },
  sumFeatures: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  insight:     { paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(6,182,212,0.2)' },
  insightTxt:  { fontSize: 10, color: COLORS.textMuted, lineHeight: 15, textAlign: 'right' },
})

const pS = StyleSheet.create({
  container:  { marginHorizontal: 12, marginBottom: 10, borderRadius: 13, borderWidth: 1.5, backgroundColor: COLORS.cardBg, overflow: 'hidden' },
  head:       { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 7 },
  dot:        { width: 7, height: 7, borderRadius: 4 },
  title:      { flex: 1, fontSize: 11, fontWeight: '600', textAlign: 'right' },
  badge:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  badgeTxt:   { fontSize: 10, fontWeight: '700' },
  legendRow:  { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 6, gap: 10, justifyContent: 'flex-end' },
  legItem:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legDot:     { width: 8, height: 8, borderRadius: 4 },
  legTxt:     { fontSize: 9, color: COLORS.textMuted },
  barsRow:    { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingHorizontal: 12, paddingBottom: 6, height: 90 },
  barGroup:   { alignItems: 'center', flex: 1, gap: 3 },
  barVal:     { fontSize: 11, fontWeight: '700' },
  barTrack:   { width: 28, height: 58, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 5, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill:    { width: '100%', borderRadius: 5 },
  barLbl:     { fontSize: 9, color: COLORS.textMuted, fontWeight: '500' },
  sumRow:     { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  sumCell:    { flex: 1, alignItems: 'center', paddingVertical: 7 },
  sumLbl:     { fontSize: 8.5, color: COLORS.textMuted, fontWeight: '600', marginBottom: 2 },
  sumVal:     { fontSize: 12, fontWeight: '700' },
  insight:    { paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1 },
  insightTxt: { fontSize: 10, color: COLORS.textMuted, lineHeight: 15, textAlign: 'right' },
})

// ─── Sub Card ─────────────────────────────────────

function SubCard({ sub, onAction }: {
  sub: Sub
  onAction: (id: string, action: 'pause' | 'resume' | 'cancel') => void
}) {
  const { t } = useTranslation()

  // تحديد ثيم الباقة حسب الاسم
  const getTierTheme = (title: string) => {
    if (title.includes('ماس'))    return TIER_THEMES.diamond
    if (title.includes('ذهب'))   return TIER_THEMES.gold
    if (title.includes('فض'))    return TIER_THEMES.silver
    if (title.includes('برونز')) return TIER_THEMES.bronze
    return TIER_THEMES.bronze
  }

  const tier = getTierTheme(sub.title)

  const statusMap: Record<string, { bg: string; color: string; label: string }> = {
    active:    { bg: 'rgba(16,185,129,0.2)',  color: '#10B981', label: 'Active'  },
    paused:    { bg: 'rgba(245,158,11,0.2)',  color: '#F59E0B', label: 'Paused'  },
    cancelled: { bg: 'rgba(239,68,68,0.18)',  color: '#EF4444', label: 'Cancelled' },
    expired:   { bg: 'rgba(107,114,128,0.18)', color: '#9CA3AF', label: 'Expired'  },
  }
  const st = statusMap[sub.status] ?? statusMap.active

  return (
    <View style={[sC.card, { backgroundColor: tier.bg, borderColor: tier.border }]}>

      {/* Header الباقة */}
      <View style={[sC.topRow, isRTL && sC.rowRTL]}>
        <View style={{ flex: 1 }}>
          <View style={sC.titleRow}>
            <Text style={sC.tierIcon}>{tier.icon}</Text>
            <Text style={[sC.title, { color: tier.accent }]}>{sub.title}</Text>
          </View>
          <Text style={[sC.customer, isRTL && { textAlign: 'right' }]}>{sub.customerName}</Text>
          <Text style={sC.subId}>
            {sub.subscriptionId} · {t(`subscriptions.${sub.interval}`)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-start', gap: 5 }}>
          <Text style={[sC.amount, { color: tier.accent }]}>
            {sub.currency} {Number(sub.amount).toLocaleString()}
          </Text>
          <View style={[sC.statusBadge, { backgroundColor: st.bg }]}>
            <View style={[sC.statusDot, { backgroundColor: st.color }]} />
            <Text style={[sC.statusTxt, { color: st.color }]}>{st.label}</Text>
          </View>
          <Text style={sC.date}>
            الفاتورة القادمة: {new Date(sub.nextBillingDate).toLocaleDateString('ar-SA')}
          </Text>
        </View>
      </View>

      <View style={[sC.divider, { backgroundColor: `${tier.accent}25` }]} />

      {/* Features count */}
      <View style={sC.featuresRow}>
        {TIER_FEATURES.find(tf => sub.title.includes(tf.label.replace('ال','').replace('ة','')) || sub.title.includes(tf.label))?.items.slice(0, 3).map((feat, i) => (
          <View key={i} style={[sC.featPill, { backgroundColor: `${tier.accent}15`, borderColor: `${tier.accent}30` }]}>
            <Text style={[sC.featTxt, { color: tier.accent }]}>✓ {feat}</Text>
          </View>
        ))}
      </View>

      <View style={sC.divider2} />

      {/* Actions */}
      <View style={[sC.actions, isRTL && sC.rowRTL]}>
        {sub.status === 'active' && (
          <TouchableOpacity
            style={[sC.actionBtn, { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)' }]}
            onPress={() => onAction(sub.subscriptionId, 'pause')}
          >
            <Text style={[sC.actionTxt, { color: '#6366F1' }]}>{t('subscriptions.pause')}</Text>
          </TouchableOpacity>
        )}
        {sub.status === 'paused' && (
          <TouchableOpacity
            style={[sC.actionBtn, { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)' }]}
            onPress={() => onAction(sub.subscriptionId, 'resume')}
          >
            <Text style={[sC.actionTxt, { color: '#10B981' }]}>{t('subscriptions.resume')}</Text>
          </TouchableOpacity>
        )}
        {(sub.status === 'active' || sub.status === 'paused') && (
          <TouchableOpacity
            style={[sC.actionBtn, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)' }]}
            onPress={() => onAction(sub.subscriptionId, 'cancel')}
          >
            <Text style={[sC.actionTxt, { color: '#EF4444' }]}>{t('subscriptions.cancel')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const sC = StyleSheet.create({
  card:        { marginHorizontal: 12, marginBottom: 10, borderRadius: 14, borderWidth: 1.5, overflow: 'hidden', padding: 14 },
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  rowRTL:      { flexDirection: 'row-reverse' },
  titleRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, justifyContent: 'flex-end' },
  tierIcon:    { fontSize: 16 },
  title:       { fontSize: 16, fontWeight: '800' },
  customer:    { fontSize: 12, color: COLORS.textSecondary, marginBottom: 3 },
  subId:       { fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace', textAlign: 'right' },
  amount:      { fontSize: 18, fontWeight: '800', marginBottom: 3 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusTxt:   { fontSize: 11, fontWeight: '700' },
  date:        { fontSize: 9, color: COLORS.textMuted, marginTop: 2 },
  divider:     { height: 1, marginVertical: 10 },
  divider2:    { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 10 },
  featuresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10, justifyContent: 'flex-end' },
  featPill:    { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  featTxt:     { fontSize: 9, fontWeight: '600' },
  actions:     { flexDirection: 'row', gap: 8 },
  actionBtn:   { flex: 1, paddingVertical: 9, borderRadius: 9, borderWidth: 1, alignItems: 'center' },
  actionTxt:   { fontSize: 12, fontWeight: '700' },
})

// ─── Main Screen ──────────────────────────────────

export default function SubscriptionsScreen() {
  const { t }        = useTranslation()
  const tabBarHeight = useTabBarHeight()

  const [subs, setSubs]             = useState<Sub[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating]     = useState(false)
  const [selKpi, setSelKpi]         = useState(0)
  const [form, setForm] = useState({ customerName: '', amount: '', title: '', interval: 'monthly' })

  const fetchData = useCallback(async () => {
    try {
      const res = await subscriptionsApi.list()
      setSubs(res.subscriptions)
    } catch (_e) {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const handleCreate = async () => {
    if (!form.customerName.trim() || !form.amount.trim() || !form.title.trim()) return
    setCreating(true)
    try {
      await subscriptionsApi.create({
        customerName: form.customerName,
        amount: parseFloat(form.amount),
        interval: form.interval,
        title: form.title,
      })
      setShowCreate(false)
      setForm({ customerName: '', amount: '', title: '', interval: 'monthly' })
      fetchData()
    } catch (err: unknown) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : '')
    }
    setCreating(false)
  }

  const handleAction = async (subId: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      if (action === 'pause')       await subscriptionsApi.pause(subId)
      else if (action === 'resume') await subscriptionsApi.resume(subId)
      else                          await subscriptionsApi.cancel(subId)
      fetchData()
    } catch (_e) {}
  }

  const activeCount  = subs.filter(s => s.status === 'active').length
  const pausedCount  = subs.filter(s => s.status === 'paused').length
  const totalCount   = subs.length
  const totalRevenue = subs
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + Number(s.amount), 0)

  const kpiValues = [
    String(activeCount),
    String(pausedCount),
    String(totalCount),
    totalRevenue >= 1000 ? `${(totalRevenue/1000).toFixed(1)}k` : String(totalRevenue),
  ]

  const TIER_PLANS = [
    { label: 'الباقة الماسية',   value: 'diamond' },
    { label: 'الباقة الذهبية',   value: 'gold'    },
    { label: 'الباقة الفضية',    value: 'silver'  },
    { label: 'الباقة البرونزية', value: 'bronze'  },
  ]

  if (loading) {
    return (
      <SafeAreaView style={sc.safe}>
        <InnerHeader title={t('subscriptions.title')} accentColor="#10B981" />
        <View style={sc.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  const renderHeader = () => (
    <>
      {/* KPI Cards */}
      <View style={sc.kpiWrap}>
        <View style={[sc.kpiRow, isRTL && sc.kpiRowRTL]}>
          {[0, 1].map(i => (
            <KpiCard key={i} label={KPI_THEMES[i].label} value={kpiValues[i]}
              themeIdx={i} selected={selKpi === i} onPress={() => setSelKpi(i)} />
          ))}
        </View>
        <View style={[sc.kpiRow, isRTL && sc.kpiRowRTL]}>
          {[2, 3].map(i => (
            <KpiCard key={i} label={KPI_THEMES[i].label} value={kpiValues[i]}
              themeIdx={i} selected={selKpi === i} onPress={() => setSelKpi(i)} />
          ))}
        </View>
      </View>

      {/* KPI Pivot Chart */}
      <PivotChart idx={selKpi} />

      {/* Features Pivot — مقارنة الباقات */}
      <FeaturesPivot />

      {/* List Header */}
      <View style={[sc.listHeader, isRTL && sc.rowRTL]}>
        <Text style={sc.listTitle}>
          الاشتراكات النشطة
          {'  '}
          <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>({totalCount})</Text>
        </Text>
        <TouchableOpacity style={sc.createBtn} onPress={() => setShowCreate(true)}>
          <Text style={sc.createBtnTxt}>+ {t('subscriptions.create')}</Text>
        </TouchableOpacity>
      </View>
    </>
  )

  const renderEmpty = () => (
    <View style={sc.empty}>
      <Text style={sc.emptyIcon}>🔄</Text>
      <Text style={sc.emptyTxt}>{t('subscriptions.no_subs')}</Text>
      <TouchableOpacity style={sc.createBtn} onPress={() => setShowCreate(true)}>
        <Text style={sc.createBtnTxt}>+ {t('subscriptions.create')}</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={sc.safe}>
      <InnerHeader title={t('subscriptions.title')} accentColor="#10B981" />

      <FlatList
        data={subs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: ListRenderItemInfo<Sub>) => (
          <SubCard sub={item} onAction={handleAction} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[sc.listContent, { paddingBottom: tabBarHeight }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
      />

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={md.overlay}>
          <View style={md.container}>
            <View style={md.head}>
              <Text style={md.title}>{t('subscriptions.create')}</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={md.closeBtn}>
                <Text style={md.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={md.body}>
              <TextInput
                placeholder={t('subscriptions.customer')} value={form.customerName}
                onChangeText={v => setForm({...form, customerName: v})}
                style={md.input} placeholderTextColor={COLORS.textMuted}
                textAlign={isRTL ? 'right' : 'left'}
              />

              {/* اختيار الباقة */}
              <Text style={[md.label, isRTL && { textAlign: 'right' }]}>اختر الباقة</Text>
              <View style={md.tierGrid}>
                {TIER_PLANS.map(plan => {
                  const tier = TIER_THEMES[plan.value as keyof typeof TIER_THEMES]
                  const isActive = form.title === plan.label
                  return (
                    <TouchableOpacity
                      key={plan.value}
                      style={[md.tierBtn,
                        { borderColor: isActive ? tier.accent : COLORS.border },
                        isActive && { backgroundColor: tier.bg }
                      ]}
                      onPress={() => setForm({
                        ...form, title: plan.label,
                        amount: tier.price.replace('SAR ', ''),
                      })}
                    >
                      <Text style={md.tierIcon}>{tier.icon}</Text>
                      <Text style={[md.tierLabel, { color: isActive ? tier.accent : COLORS.textSecondary }]}>
                        {plan.label.replace('الباقة ', '')}
                      </Text>
                      <Text style={[md.tierPrice, { color: isActive ? tier.accent : COLORS.textMuted }]}>
                        {tier.price}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <TextInput
                placeholder="المبلغ" value={form.amount}
                onChangeText={v => setForm({...form, amount: v})}
                style={md.input} placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad" textAlign={isRTL ? 'right' : 'left'}
              />

              <Text style={[md.label, isRTL && { textAlign: 'right' }]}>دورة الفوترة</Text>
              <View style={[md.intervalRow, isRTL && { flexDirection: 'row-reverse' }]}>
                {(['monthly', 'weekly', 'yearly'] as const).map(iv => (
                  <TouchableOpacity
                    key={iv}
                    style={[md.intervalBtn, form.interval === iv && md.intervalActive]}
                    onPress={() => setForm({...form, interval: iv})}
                  >
                    <Text style={[md.intervalTxt, form.interval === iv && md.intervalActiveTxt]}>
                      {t(`subscriptions.${iv}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={md.actions}>
                <TouchableOpacity style={md.cancelBtn} onPress={() => setShowCreate(false)}>
                  <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[md.submitBtn, creating && { opacity: 0.6 }]}
                  onPress={handleCreate} disabled={creating}
                >
                  <Text style={{ color: COLORS.white, fontWeight: '700' }}>
                    {creating ? t('common.loading') : t('subscriptions.create')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const sc = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.darkBg },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent:  { paddingTop: 4 },
  kpiWrap:      { paddingHorizontal: 12, paddingTop: 12, gap: 8 },
  kpiRow:       { flexDirection: 'row', gap: 8 },
  kpiRowRTL:    { flexDirection: 'row-reverse' },
  listHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  rowRTL:       { flexDirection: 'row-reverse' },
  listTitle:    { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right' },
  createBtn:    { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9 },
  createBtnTxt: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  empty:        { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon:    { fontSize: 40 },
  emptyTxt:     { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
})

const md = StyleSheet.create({
  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container:        { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  head:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:            { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn:         { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeTxt:         { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  body:             { padding: 16, gap: 10 },
  label:            { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  input:            { backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, color: COLORS.textPrimary, fontSize: 14 },
  tierGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tierBtn:          { width: '47%', padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceBg, alignItems: 'center', gap: 3 },
  tierIcon:         { fontSize: 22 },
  tierLabel:        { fontSize: 12, fontWeight: '700' },
  tierPrice:        { fontSize: 11, fontWeight: '600' },
  intervalRow:      { flexDirection: 'row', gap: 8 },
  intervalBtn:      { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  intervalActive:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  intervalTxt:      { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  intervalActiveTxt:{ color: COLORS.white },
  actions:          { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:        { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surfaceBg },
  submitBtn:        { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary },
})