// app/(merchant)/customer-detail.tsx
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  I18nManager, SafeAreaView, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { InnerHeader } from '../../components/InnerHeader'
import { customersApi } from '../../services/api'

const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────────────────────────────────
interface RFM { R: number; F: number; M: number; score: number; segment: string; daysSinceLast: number }
interface Rec  { type: string; priority: 'high' | 'medium' | 'low'; titleAr: string; descAr: string; action: string }
interface Tx   { id: string; amount: number; currency: string; status: string; createdAt: string; method: string }
interface SpendPoint { month: string; amount: number }

interface CustomerDetail {
  id: string; name: string; phone?: string; email?: string; city?: string
  country?: string; tags: string[]; notes?: string
  totalSpent: number; totalOrders: number; avgOrderValue: number
  refundCount: number; lastSeenAt: string; firstSeenAt: string
  rfm: RFM
  recommendations: Rec[]
  recentTransactions: Tx[]
  spendTrend: SpendPoint[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatMoney(n: number) { return n.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' ر.س' }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' }) }
function formatAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'اليوم'
  if (days === 1) return 'أمس'
  if (days < 30) return `منذ ${days} يوم`
  return `منذ ${Math.floor(days / 30)} شهر`
}

const SEG_MAP: Record<string, { labelAr: string; color: string; bg: string; icon: string; desc: string }> = {
  VIP:     { labelAr: 'VIP',       color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  icon: '⭐', desc: 'عميل ذهبي — أعلى إنفاق وأكثر تكراراً' },
  loyal:   { labelAr: 'وفي',       color: COLORS.success, bg: COLORS.successBg,    icon: '💚', desc: 'عميل وفي — يشتري بانتظام' },
  active:  { labelAr: 'نشط',       color: '#06B6D4', bg: 'rgba(6,182,212,0.15)',   icon: '⚡', desc: 'عميل نشط — تفاعل مستمر' },
  new:     { labelAr: 'جديد',      color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)',  icon: '🆕', desc: 'عميل جديد — أول تجربة' },
  at_risk: { labelAr: 'في خطر',    color: COLORS.warning, bg: COLORS.warningBg,    icon: '⚠️', desc: 'في خطر الفقدان — تحتاج تدخل' },
  lost:    { labelAr: 'خامل',      color: COLORS.danger, bg: COLORS.dangerBg,      icon: '💤', desc: 'لم يشترِ منذ فترة طويلة' },
}

const PRIORITY_COLOR: Record<string, string> = { high: COLORS.danger, medium: COLORS.warning, low: COLORS.success }
const PRIORITY_AR: Record<string, string>    = { high: 'عاجل', medium: 'مهم', low: 'اختياري' }

const STATUS_COLOR: Record<string, string> = {
  success: COLORS.success, pending: COLORS.warning, failed: COLORS.danger,
}
const STATUS_AR: Record<string, string> = {
  success: 'ناجح', pending: 'قيد المعالجة', failed: 'فاشل',
}

// ─── RFM Radar (text-based) ───────────────────────────────────────────────────
function RFMRadar({ rfm }: { rfm: RFM }) {
  const bars = [
    { key: 'R', label: 'الحداثة', score: rfm.R, hint: 'آخر شراء' },
    { key: 'F', label: 'التكرار', score: rfm.F, hint: 'عدد المرات' },
    { key: 'M', label: 'الإنفاق', score: rfm.M, hint: 'القيمة' },
  ]
  const colors = ['#06B6D4', '#8B5CF6', '#F59E0B']
  return (
    <View style={rfmR.wrap}>
      {bars.map((b, i) => (
        <View key={b.key} style={rfmR.row}>
          <View style={rfmR.meta}>
            <Text style={rfmR.label}>{b.label}</Text>
            <Text style={rfmR.hint}>{b.hint}</Text>
          </View>
          <View style={rfmR.track}>
            <View style={[rfmR.fill, { width: `${(b.score / 5) * 100}%`, backgroundColor: colors[i] }]} />
          </View>
          <Text style={[rfmR.score, { color: colors[i] }]}>{b.score}/5</Text>
        </View>
      ))}
      <View style={rfmR.totalRow}>
        <Text style={rfmR.totalLabel}>نقاط RFM الكلية</Text>
        <Text style={rfmR.totalScore}>{rfm.score.toFixed(1)}</Text>
      </View>
    </View>
  )
}
const rfmR = StyleSheet.create({
  wrap:       { gap: 10 },
  row:        { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 },
  meta:       { width: 66, alignItems: isRTL ? 'flex-end' : 'flex-start', gap: 1 },
  label:      { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  hint:       { fontSize: 9, color: COLORS.textMuted },
  track:      { flex: 1, height: 8, backgroundColor: COLORS.surfaceBg, borderRadius: 4, overflow: 'hidden' },
  fill:       { height: '100%', borderRadius: 4 },
  score:      { fontSize: 12, fontWeight: '800', width: 32, textAlign: 'center' },
  totalRow:   { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  totalLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  totalScore: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
})

// ─── Spend Trend Mini Chart ───────────────────────────────────────────────────
function SpendTrend({ data }: { data: SpendPoint[] }) {
  const max = Math.max(...data.map(d => d.amount), 1)
  return (
    <View style={st.wrap}>
      {data.map((d, i) => (
        <View key={i} style={st.col}>
          <Text style={st.val}>{d.amount >= 1000 ? `${(d.amount / 1000).toFixed(1)}k` : String(d.amount)}</Text>
          <View style={st.track}>
            <View style={[st.fill, { height: `${Math.max((d.amount / max) * 100, 4)}%` }]} />
          </View>
          <Text style={st.label}>{d.month.slice(5)}</Text>
        </View>
      ))}
    </View>
  )
}
const st = StyleSheet.create({
  wrap:  { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 6, height: 90 },
  col:   { flex: 1, alignItems: 'center', gap: 3 },
  val:   { fontSize: 8, color: COLORS.textMuted, fontWeight: '600' },
  track: { width: '85%', height: 55, backgroundColor: COLORS.surfaceBg, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  fill:  { width: '100%', borderRadius: 4, backgroundColor: '#F59E0B' },
  label: { fontSize: 9, color: COLORS.textMuted },
})

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CustomerDetailScreen() {
  const { id }       = useLocalSearchParams<{ id: string }>()
  const router       = useRouter()
  const tabBarHeight = useTabBarHeight()

  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!id) return
    try {
      setError(null)
      const res = await customersApi.getById(id)
      setCustomer(res.customer)
    } catch (e: any) {
      setError(e.message || 'خطأ في تحميل بيانات العميل')
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchData() }, [id])

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <InnerHeader title="تفاصيل العميل" accentColor="#F59E0B" />
        <View style={s.center}><ActivityIndicator color={COLORS.primaryLight} size="large" /></View>
      </SafeAreaView>
    )
  }

  if (error || !customer) {
    return (
      <SafeAreaView style={s.safe}>
        <InnerHeader title="تفاصيل العميل" accentColor="#F59E0B" />
        <View style={s.center}>
          <Text style={s.errorTxt}>{error || 'العميل غير موجود'}</Text>
        </View>
      </SafeAreaView>
    )
  }

  const seg   = SEG_MAP[customer.rfm.segment] ?? SEG_MAP['active']
  const lifedays = Math.floor((Date.now() - new Date(customer.firstSeenAt).getTime()) / 86400000)
  const refundPct = customer.totalOrders > 0 ? Math.round((customer.refundCount / customer.totalOrders) * 100) : 0

  return (
    <SafeAreaView style={s.safe}>
      <InnerHeader title="تفاصيل العميل" accentColor="#F59E0B" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarHeight + 32 }}>

        {/* ─── Hero Banner ────────── */}
        <View style={[s.hero, { borderBottomColor: seg.color + '40', backgroundColor: seg.bg }]}>
          <View style={[s.avatar, { backgroundColor: seg.bg, borderColor: seg.color }]}>
            <Text style={[s.avatarTxt, { color: seg.color }]}>{customer.name.charAt(0)}</Text>
          </View>
          <View style={s.heroInfo}>
            <Text style={s.heroName}>{customer.name}</Text>
            <View style={[s.segBadge, { backgroundColor: seg.bg, borderColor: seg.color + '60' }]}>
              <Text style={s.segIcon}>{seg.icon}</Text>
              <Text style={[s.segLabel, { color: seg.color }]}>{seg.labelAr}</Text>
            </View>
            <Text style={[s.segDesc, { color: seg.color }]}>{seg.desc}</Text>
          </View>
        </View>

        {/* ─── Quick Stats ──────────── */}
        <View style={[s.statsRow, isRTL && { flexDirection: 'row-reverse' }]}>
          <View style={s.stat}>
            <Text style={[s.statVal, { color: '#F59E0B' }]}>{formatMoney(customer.totalSpent)}</Text>
            <Text style={s.statLabel}>إجمالي الإنفاق</Text>
          </View>
          <View style={[s.statDivider]} />
          <View style={s.stat}>
            <Text style={[s.statVal, { color: '#8B5CF6' }]}>{customer.totalOrders}</Text>
            <Text style={s.statLabel}>عدد الطلبات</Text>
          </View>
          <View style={[s.statDivider]} />
          <View style={s.stat}>
            <Text style={[s.statVal, { color: COLORS.primaryLight }]}>{formatMoney(customer.avgOrderValue)}</Text>
            <Text style={s.statLabel}>متوسط الطلب</Text>
          </View>
        </View>

        {/* ─── Contact Info ─────────── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📋 البيانات الأساسية</Text>
          {[
            { icon: '📱', label: 'الهاتف',       val: customer.phone || '—' },
            { icon: '📧', label: 'البريد',        val: customer.email || '—' },
            { icon: '🏙️', label: 'المدينة',      val: customer.city  || '—' },
            { icon: '🗓️', label: 'أول شراء',    val: formatDate(customer.firstSeenAt) },
            { icon: '🕐', label: 'آخر نشاط',    val: formatAgo(customer.lastSeenAt) },
            { icon: '📅', label: 'مدة العلاقة',  val: `${lifedays} يوم` },
          ].map(row => (
            <View key={row.label} style={[s.infoRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={s.infoIcon}>{row.icon}</Text>
              <Text style={s.infoLabel}>{row.label}</Text>
              <Text style={s.infoVal}>{row.val}</Text>
            </View>
          ))}
          {customer.tags.length > 0 && (
            <View style={[s.tagsRow, isRTL && { flexDirection: 'row-reverse' }]}>
              {customer.tags.map(tag => (
                <View key={tag} style={s.tag}>
                  <Text style={s.tagTxt}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ─── Extra KPIs ─────────── */}
        <View style={[s.card]}>
          <Text style={s.cardTitle}>📊 مؤشرات إضافية</Text>
          <View style={[s.extraRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <View style={[s.extraKpi, { backgroundColor: refundPct > 30 ? COLORS.dangerBg : COLORS.successBg, borderColor: refundPct > 30 ? COLORS.danger + '40' : COLORS.success + '40' }]}>
              <Text style={[s.extraVal, { color: refundPct > 30 ? COLORS.danger : COLORS.success }]}>{refundPct}%</Text>
              <Text style={s.extraLabel}>نسبة الاسترداد</Text>
              <Text style={s.extraSub}>{customer.refundCount} من {customer.totalOrders}</Text>
            </View>
            <View style={[s.extraKpi, { backgroundColor: 'rgba(6,182,212,0.12)', borderColor: '#06B6D4' + '40' }]}>
              <Text style={[s.extraVal, { color: '#06B6D4' }]}>{lifedays}</Text>
              <Text style={s.extraLabel}>أيام منذ الانضمام</Text>
              <Text style={s.extraSub}>عميل منذ {Math.floor(lifedays / 30)} شهر</Text>
            </View>
            <View style={[s.extraKpi, { backgroundColor: 'rgba(139,92,246,0.12)', borderColor: '#8B5CF6' + '40' }]}>
              <Text style={[s.extraVal, { color: '#8B5CF6' }]}>
                {customer.totalOrders > 0 && lifedays > 0 ? (customer.totalOrders / Math.max(lifedays / 30, 1)).toFixed(1) : '0'}
              </Text>
              <Text style={s.extraLabel}>طلب / شهر</Text>
              <Text style={s.extraSub}>معدل الشراء</Text>
            </View>
          </View>
        </View>

        {/* ─── RFM Analysis ─────────── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🎯 تحليل RFM</Text>
          <RFMRadar rfm={customer.rfm} />
        </View>

        {/* ─── Spend Trend ──────────── */}
        {customer.spendTrend && customer.spendTrend.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>📈 الإنفاق الشهري</Text>
            <SpendTrend data={customer.spendTrend} />
          </View>
        )}

        {/* ─── Recommendations ──────── */}
        {customer.recommendations && customer.recommendations.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>💡 توصيات ذكية لهذا العميل</Text>
            <View style={{ gap: 8 }}>
              {customer.recommendations.map((rec, i) => {
                const pColor = PRIORITY_COLOR[rec.priority]
                return (
                  <View key={i} style={[s.recCard, { borderColor: pColor + '50', backgroundColor: pColor === COLORS.danger ? COLORS.dangerBg : pColor === COLORS.warning ? COLORS.warningBg : COLORS.successBg }]}>
                    <View style={[s.recHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                      <Text style={[s.recTitle, { color: pColor }]}>{rec.titleAr}</Text>
                      <View style={[s.priorityBadge, { backgroundColor: pColor + '33' }]}>
                        <Text style={[s.priorityTxt, { color: pColor }]}>{PRIORITY_AR[rec.priority]}</Text>
                      </View>
                    </View>
                    <Text style={[s.recDesc, { color: pColor }]}>{rec.descAr}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* ─── Recent Transactions ──── */}
        {customer.recentTransactions && customer.recentTransactions.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>💳 آخر المعاملات</Text>
            {customer.recentTransactions.map(tx => (
              <View key={tx.id} style={[s.txRow, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={[s.txStatus, { backgroundColor: STATUS_COLOR[tx.status] + '20', borderColor: STATUS_COLOR[tx.status] + '50' }]}>
                  <Text style={[s.txStatusTxt, { color: STATUS_COLOR[tx.status] }]}>{STATUS_AR[tx.status]}</Text>
                </View>
                <View style={s.txInfo}>
                  <Text style={s.txMethod}>{tx.method?.toUpperCase()}</Text>
                  <Text style={s.txDate}>{formatDate(tx.createdAt)}</Text>
                </View>
                <Text style={[s.txAmount, { color: STATUS_COLOR[tx.status] }]}>
                  {tx.status === 'failed' ? '—' : formatMoney(tx.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ─── Notes ──────────────── */}
        {customer.notes && (
          <View style={[s.card, { borderColor: COLORS.info + '40', backgroundColor: COLORS.infoBg }]}>
            <Text style={[s.cardTitle, { color: COLORS.info }]}>📝 ملاحظات</Text>
            <Text style={[s.noteTxt, { color: COLORS.info }]}>{customer.notes}</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.darkBg },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorTxt:{ color: COLORS.danger, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },

  hero:        { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  avatar:      { width: 60, height: 60, borderRadius: 30, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:   { fontSize: 24, fontWeight: '800' },
  heroInfo:    { flex: 1, gap: 4 },
  heroName:    { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  segBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  segIcon:     { fontSize: 12 },
  segLabel:    { fontSize: 12, fontWeight: '700' },
  segDesc:     { fontSize: 11, opacity: 0.8 },

  statsRow:    { flexDirection: 'row', backgroundColor: COLORS.cardBg, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  stat:        { flex: 1, alignItems: 'center', gap: 2 },
  statVal:     { fontSize: 15, fontWeight: '800' },
  statLabel:   { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: COLORS.border },

  card:        { margin: 12, marginBottom: 0, backgroundColor: COLORS.cardBg, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 10 },
  cardTitle:   { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },

  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: COLORS.border + '80' },
  infoIcon:    { fontSize: 14, width: 20, textAlign: 'center' },
  infoLabel:   { fontSize: 12, color: COLORS.textSecondary, width: 80, textAlign: isRTL ? 'right' : 'left' },
  infoVal:     { flex: 1, fontSize: 13, color: COLORS.textPrimary, fontWeight: '600', textAlign: isRTL ? 'right' : 'left' },

  tagsRow:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  tag:         { backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  tagTxt:      { fontSize: 11, color: COLORS.primaryLight, fontWeight: '700' },

  extraRow:    { flexDirection: 'row', gap: 8 },
  extraKpi:    { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, gap: 2, alignItems: 'center' },
  extraVal:    { fontSize: 18, fontWeight: '800' },
  extraLabel:  { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600', textAlign: 'center' },
  extraSub:    { fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },

  recCard:     { borderRadius: 10, borderWidth: 1, padding: 12, gap: 4 },
  recHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recTitle:    { fontSize: 13, fontWeight: '700', flex: 1 },
  priorityBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  priorityTxt: { fontSize: 10, fontWeight: '800' },
  recDesc:     { fontSize: 12, opacity: 0.85, lineHeight: 18, textAlign: isRTL ? 'right' : 'left' },

  txRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  txStatus:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  txStatusTxt: { fontSize: 11, fontWeight: '700' },
  txInfo:      { flex: 1, gap: 2 },
  txMethod:    { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  txDate:      { fontSize: 10, color: COLORS.textMuted },
  txAmount:    { fontSize: 14, fontWeight: '800' },

  noteTxt:     { fontSize: 13, lineHeight: 20, opacity: 0.9, textAlign: isRTL ? 'right' : 'left' },
})