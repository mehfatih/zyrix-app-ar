// ─────────────────────────────────────────────────────────────
// app/(merchant)/subscriptions.tsx — Elite (Smart Retry + Dunning + Churn)
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, I18nManager, ActivityIndicator, RefreshControl,
  Modal, ListRenderItemInfo, Alert, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { subscriptionsApi } from '../../services/api'
import { InnerHeader } from '../../components/InnerHeader'

const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────────────────

interface Sub {
  id: string
  planName: string
  amount: number
  currency: string
  interval: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  createdAt: string
  churnScore: number
  churnRisk: string
  churnFactors: string[]
}

interface RetryAttempt {
  id: string
  attempt: number
  status: string
  scheduledAt: string
  executedAt: string | null
  errorMessage: string | null
}

interface DunningLog {
  id: string
  step: number
  channel: string
  message: string
  sentAt: string
  opened: boolean
}

interface ChurnOverview {
  summary: { critical: number; high: number; medium: number; low: number; avgScore: number }
  atRisk: { subscriptionId: string; churnScore: number; riskLevel: string; factors: string[] }[]
}

// ─── Tier Themes ──────────────────────────────────────────────

const TIER_THEMES = {
  diamond: { accent: '#06B6D4', bg: 'rgba(6,182,212,0.13)', border: 'rgba(6,182,212,0.40)', icon: '💎', label: 'الماسية', price: 'SAR 999' },
  gold:    { accent: '#F59E0B', bg: 'rgba(245,158,11,0.13)', border: 'rgba(245,158,11,0.40)', icon: '🥇', label: 'الذهبية', price: 'SAR 499' },
  silver:  { accent: '#94A3B8', bg: 'rgba(148,163,184,0.13)', border: 'rgba(148,163,184,0.40)', icon: '🥈', label: 'الفضية', price: 'SAR 249' },
  bronze:  { accent: '#CD7C2F', bg: 'rgba(205,124,47,0.13)', border: 'rgba(205,124,47,0.40)', icon: '🥉', label: 'البرونزية', price: 'SAR 99' },
}

function getTierTheme(planName: string) {
  if (planName.includes('ماس') || planName.toLowerCase().includes('diamond')) return TIER_THEMES.diamond
  if (planName.includes('ذهب') || planName.toLowerCase().includes('gold'))    return TIER_THEMES.gold
  if (planName.includes('فض')  || planName.toLowerCase().includes('silver'))  return TIER_THEMES.silver
  return TIER_THEMES.bronze
}

// ─── KPI Data ─────────────────────────────────────────────────

const KPI_THEMES = [
  { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.40)', accent: '#10B981', label: 'نشطة' },
  { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.40)', accent: '#6366F1', label: 'متأخرة' },
  { bg: 'rgba(6,182,212,0.15)',  border: 'rgba(6,182,212,0.40)',  accent: '#06B6D4', label: 'إجمالي' },
  { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.40)', accent: '#F59E0B', label: 'الإيراد' },
]

// ─── Churn Badge ──────────────────────────────────────────────

const CHURN_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  LOW:      { color: '#10B981', bg: 'rgba(16,185,129,0.15)',  label: 'خطر منخفض' },
  MEDIUM:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  label: 'خطر متوسط' },
  HIGH:     { color: '#F97316', bg: 'rgba(249,115,22,0.15)',  label: 'خطر عالي' },
  CRITICAL: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)',   label: 'خطر حرج' },
}

function ChurnBadge({ score, risk }: { score: number; risk: string }) {
  const cfg = CHURN_CONFIG[risk] ?? CHURN_CONFIG.LOW
  return (
    <View style={[chB.wrap, { backgroundColor: cfg.bg, borderColor: cfg.color + '50' }]}>
      <Text style={[chB.score, { color: cfg.color }]}>{score}</Text>
      <Text style={[chB.label, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  )
}
const chB = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  score: { fontSize: 11, fontWeight: '800' },
  label: { fontSize: 9, fontWeight: '600' },
})

// ─── KPI Card ─────────────────────────────────────────────────

function KpiCard({ label, value, themeIdx, selected, onPress }: {
  label: string; value: string; themeIdx: number; selected: boolean; onPress: () => void
}) {
  const t = KPI_THEMES[themeIdx]
  return (
    <TouchableOpacity
      style={[kS.card, { backgroundColor: t.bg, borderColor: selected ? t.accent : t.border }, selected && kS.sel]}
      onPress={onPress} activeOpacity={0.75}
    >
      <Text style={[kS.lbl, { color: t.accent }]}>{label}</Text>
      <Text style={[kS.val, { color: t.accent }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <View style={[kS.bar, { backgroundColor: t.accent, opacity: selected ? 1 : 0.5 }]} />
      {selected && <View style={[kS.dot, { backgroundColor: t.accent }]} />}
    </TouchableOpacity>
  )
}
const kS = StyleSheet.create({
  card: { flex: 1, borderRadius: 13, padding: 11, borderWidth: 1.5, overflow: 'hidden', minHeight: 72 },
  sel:  { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  lbl:  { fontSize: 10, fontWeight: '600', marginBottom: 5, textAlign: 'right' },
  val:  { fontSize: 22, fontWeight: '800', textAlign: 'right' },
  bar:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 2 },
  dot:  { position: 'absolute', top: 7, left: 7, width: 6, height: 6, borderRadius: 3 },
})

// ─── Churn Overview Card ──────────────────────────────────────

function ChurnOverviewCard({ overview }: { overview: ChurnOverview | null }) {
  if (!overview) return null
  const { summary } = overview
  const total = summary.critical + summary.high + summary.medium + summary.low
  if (total === 0) return null

  return (
    <View style={coS.container}>
      <View style={coS.head}>
        <View style={[coS.dot, { backgroundColor: '#EF4444' }]} />
        <Text style={coS.title}>Churn Prediction — خطر الإلغاء</Text>
        <View style={coS.badge}>
          <Text style={coS.badgeTxt}>متوسط {summary.avgScore}</Text>
        </View>
      </View>

      <View style={coS.bars}>
        {[
          { label: 'حرج', count: summary.critical, color: '#EF4444' },
          { label: 'عالي', count: summary.high,     color: '#F97316' },
          { label: 'متوسط', count: summary.medium,  color: '#F59E0B' },
          { label: 'منخفض', count: summary.low,     color: '#10B981' },
        ].map((item, i) => {
          const pct = total > 0 ? (item.count / total) * 100 : 0
          return (
            <View key={i} style={coS.barRow}>
              <Text style={[coS.barLabel, { color: item.color }]}>{item.label}</Text>
              <View style={coS.barTrack}>
                <View style={[coS.barFill, { width: `${pct}%`, backgroundColor: item.color }]} />
              </View>
              <Text style={[coS.barCount, { color: item.color }]}>{item.count}</Text>
            </View>
          )
        })}
      </View>

      {overview.atRisk.length > 0 && (
        <View style={coS.insight}>
          <Text style={coS.insightTxt}>
            ⚠️ {summary.critical + summary.high} اشتراك في خطر إلغاء — يُنصح بإرسال dunning فوراً
          </Text>
        </View>
      )}
    </View>
  )
}
const coS = StyleSheet.create({
  container:  { marginHorizontal: 12, marginBottom: 10, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.35)', backgroundColor: COLORS.cardBg, overflow: 'hidden' },
  head:       { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 7 },
  dot:        { width: 7, height: 7, borderRadius: 4 },
  title:      { flex: 1, fontSize: 11, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' },
  badge:      { backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  badgeTxt:   { fontSize: 9, fontWeight: '700', color: '#EF4444' },
  bars:       { paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  barRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel:   { fontSize: 10, fontWeight: '700', width: 42, textAlign: 'right' },
  barTrack:   { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' },
  barFill:    { height: '100%', borderRadius: 4 },
  barCount:   { fontSize: 11, fontWeight: '800', width: 24, textAlign: 'left' },
  insight:    { paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(239,68,68,0.2)' },
  insightTxt: { fontSize: 10, color: COLORS.textMuted, lineHeight: 15, textAlign: 'right' },
})

// ─── Sub Card ─────────────────────────────────────────────────

function SubCard({ sub, onAction }: {
  sub: Sub
  onAction: (sub: Sub, action: 'cancel' | 'retry' | 'dunning' | 'detail') => void
}) {
  const tier = getTierTheme(sub.planName)

  const statusMap: Record<string, { bg: string; color: string; label: string }> = {
    ACTIVE:    { bg: 'rgba(16,185,129,0.2)',  color: '#10B981', label: 'نشط' },
    PAST_DUE:  { bg: 'rgba(249,115,22,0.2)',  color: '#F97316', label: 'متأخر' },
    CANCELLED: { bg: 'rgba(239,68,68,0.18)',  color: '#EF4444', label: 'ملغي' },
  }
  const st = statusMap[sub.status] ?? statusMap.ACTIVE

  const daysLeft = Math.max(0, Math.floor(
    (new Date(sub.currentPeriodEnd).getTime() - Date.now()) / 86400000
  ))

  return (
    <TouchableOpacity
      style={[sC.card, { backgroundColor: tier.bg, borderColor: tier.border }]}
      onPress={() => onAction(sub, 'detail')}
      activeOpacity={0.85}
    >
      {/* Header */}
      <View style={[sC.topRow, isRTL && sC.rowRTL]}>
        <View style={{ flex: 1 }}>
          <View style={[sC.titleRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={sC.tierIcon}>{tier.icon}</Text>
            <Text style={[sC.title, { color: tier.accent }]}>{sub.planName}</Text>
          </View>
          <Text style={[sC.subId, isRTL && { textAlign: 'right' }]}>
            {sub.interval === 'MONTHLY' ? 'شهري' : 'سنوي'} · {daysLeft} يوم متبقي
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
        </View>
      </View>

      <View style={[sC.divider, { backgroundColor: `${tier.accent}25` }]} />

      {/* Churn + تاريخ */}
      <View style={[sC.metaRow, isRTL && sC.rowRTL]}>
        <ChurnBadge score={sub.churnScore} risk={sub.churnRisk} />
        <Text style={sC.dateText}>
          التجديد: {new Date(sub.currentPeriodEnd).toLocaleDateString('ar-SA')}
        </Text>
      </View>

      <View style={[sC.divider2]} />

      {/* Actions */}
      <View style={[sC.actions, isRTL && sC.rowRTL]}>
        {sub.status === 'PAST_DUE' && (
          <TouchableOpacity
            style={[sC.actionBtn, { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.35)' }]}
            onPress={() => onAction(sub, 'retry')}
          >
            <Text style={[sC.actionTxt, { color: '#10B981' }]}>🔄 Smart Retry</Text>
          </TouchableOpacity>
        )}
        {(sub.status === 'ACTIVE' || sub.status === 'PAST_DUE') && (
          <TouchableOpacity
            style={[sC.actionBtn, { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.35)' }]}
            onPress={() => onAction(sub, 'dunning')}
          >
            <Text style={[sC.actionTxt, { color: '#F59E0B' }]}>📢 Dunning</Text>
          </TouchableOpacity>
        )}
        {(sub.status === 'ACTIVE' || sub.status === 'PAST_DUE') && (
          <TouchableOpacity
            style={[sC.actionBtn, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)' }]}
            onPress={() => onAction(sub, 'cancel')}
          >
            <Text style={[sC.actionTxt, { color: '#EF4444' }]}>إلغاء</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  )
}
const sC = StyleSheet.create({
  card:        { marginHorizontal: 12, marginBottom: 10, borderRadius: 14, borderWidth: 1.5, overflow: 'hidden', padding: 14 },
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  rowRTL:      { flexDirection: 'row-reverse' },
  titleRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  tierIcon:    { fontSize: 16 },
  title:       { fontSize: 15, fontWeight: '800' },
  subId:       { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  amount:      { fontSize: 17, fontWeight: '800', marginBottom: 3 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusTxt:   { fontSize: 11, fontWeight: '700' },
  divider:     { height: 1, marginVertical: 10 },
  divider2:    { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 10 },
  metaRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dateText:    { fontSize: 10, color: COLORS.textMuted },
  actions:     { flexDirection: 'row', gap: 8 },
  actionBtn:   { flex: 1, paddingVertical: 9, borderRadius: 9, borderWidth: 1, alignItems: 'center' },
  actionTxt:   { fontSize: 11, fontWeight: '700' },
})

// ─── Retry Modal ──────────────────────────────────────────────

function RetryModal({ visible, sub, onClose, onConfirm, loading }: {
  visible: boolean; sub: Sub | null; onClose: () => void
  onConfirm: () => void; loading: boolean
}) {
  if (!sub) return null
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mdS.overlay}>
        <View style={mdS.container}>
          <View style={mdS.head}>
            <Text style={mdS.title}>🔄 Smart Retry</Text>
            <TouchableOpacity onPress={onClose} style={mdS.closeBtn}>
              <Text style={mdS.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={mdS.body}>
            <Text style={mdS.desc}>
              سيتم جدولة 3 محاولات تلقائية لتحصيل دفعة{' '}
              <Text style={{ color: '#10B981', fontWeight: '700' }}>
                {sub.currency} {Number(sub.amount).toLocaleString()}
              </Text>
            </Text>

            <View style={mdS.scheduleBox}>
              {[
                { day: 'اليوم + 1', label: 'المحاولة الأولى', color: '#10B981' },
                { day: 'اليوم + 3', label: 'المحاولة الثانية', color: '#F59E0B' },
                { day: 'اليوم + 7', label: 'المحاولة الأخيرة', color: '#EF4444' },
              ].map((item, i) => (
                <View key={i} style={[mdS.scheduleRow, isRTL && { flexDirection: 'row-reverse' }]}>
                  <View style={[mdS.schedDot, { backgroundColor: item.color }]} />
                  <Text style={[mdS.schedLabel, { color: item.color }]}>{item.label}</Text>
                  <Text style={mdS.schedDay}>{item.day}</Text>
                </View>
              ))}
            </View>

            <View style={[mdS.actions, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={mdS.cancelBtn} onPress={onClose}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mdS.submitBtn, { backgroundColor: '#10B981' }, loading && { opacity: 0.6 }]}
                onPress={onConfirm} disabled={loading}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {loading ? 'جاري الجدولة...' : 'تأكيد Smart Retry'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Dunning Modal ────────────────────────────────────────────

function DunningModal({ visible, sub, onClose, onSend, loading }: {
  visible: boolean; sub: Sub | null; onClose: () => void
  onSend: (step: number, channel: string) => void; loading: boolean
}) {
  const [step, setStep] = useState(1)
  const [channel, setChannel] = useState('PUSH')
  if (!sub) return null

  const stepLabels = ['تذكير أول', 'تحذير ثاني', 'إشعار إلغاء']
  const stepColors = ['#F59E0B', '#F97316', '#EF4444']
  const channels = ['PUSH', 'SMS', 'EMAIL', 'WHATSAPP']

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mdS.overlay}>
        <View style={mdS.container}>
          <View style={mdS.head}>
            <Text style={mdS.title}>📢 Dunning</Text>
            <TouchableOpacity onPress={onClose} style={mdS.closeBtn}>
              <Text style={mdS.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={mdS.body}>
            <Text style={mdS.label}>خطوة التذكير</Text>
            <View style={mdS.stepRow}>
              {stepLabels.map((lbl, i) => (
                <TouchableOpacity
                  key={i}
                  style={[mdS.stepBtn, step === i + 1 && { backgroundColor: stepColors[i] + '25', borderColor: stepColors[i] }]}
                  onPress={() => setStep(i + 1)}
                >
                  <Text style={[mdS.stepTxt, { color: step === i + 1 ? stepColors[i] : COLORS.textMuted }]}>
                    {lbl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[mdS.label, { marginTop: 12 }]}>قناة الإرسال</Text>
            <View style={mdS.channelRow}>
              {channels.map(ch => (
                <TouchableOpacity
                  key={ch}
                  style={[mdS.channelBtn, channel === ch && mdS.channelActive]}
                  onPress={() => setChannel(ch)}
                >
                  <Text style={[mdS.channelTxt, channel === ch && mdS.channelActiveTxt]}>{ch}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[mdS.actions, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={mdS.cancelBtn} onPress={onClose}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mdS.submitBtn, { backgroundColor: stepColors[step - 1] }, loading && { opacity: 0.6 }]}
                onPress={() => onSend(step, channel)} disabled={loading}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {loading ? 'جاري الإرسال...' : 'إرسال التذكير'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Detail Modal (Retry Status + Dunning History) ────────────

function DetailModal({ visible, sub, onClose }: {
  visible: boolean; sub: Sub | null; onClose: () => void
}) {
  const [retries, setRetries] = useState<RetryAttempt[]>([])
  const [dunningLogs, setDunningLogs] = useState<DunningLog[]>([])
  const [tab, setTab] = useState<'retry' | 'dunning'>('retry')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible || !sub) return
    setLoading(true)
    Promise.all([
      subscriptionsApi.getRetryStatus(sub.id),
      subscriptionsApi.getDunningHistory(sub.id),
    ]).then(([r, d]) => {
      setRetries(r?.data ?? [])
      setDunningLogs(d?.data ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [visible, sub])

  if (!sub) return null

  const retryColors: Record<string, string> = {
    PENDING: '#6366F1', SUCCESS: '#10B981', FAILED: '#EF4444', EXHAUSTED: '#6B7280'
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mdS.overlay}>
        <View style={[mdS.container, { maxHeight: '75%' }]}>
          <View style={mdS.head}>
            <Text style={mdS.title}>{sub.planName}</Text>
            <TouchableOpacity onPress={onClose} style={mdS.closeBtn}>
              <Text style={mdS.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={dtS.tabs}>
            <TouchableOpacity
              style={[dtS.tab, tab === 'retry' && dtS.tabActive]}
              onPress={() => setTab('retry')}
            >
              <Text style={[dtS.tabTxt, tab === 'retry' && dtS.tabActiveTxt]}>🔄 محاولات الدفع</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[dtS.tab, tab === 'dunning' && dtS.tabActive]}
              onPress={() => setTab('dunning')}
            >
              <Text style={[dtS.tabTxt, tab === 'dunning' && dtS.tabActiveTxt]}>📢 سجل Dunning</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ padding: 30, alignItems: 'center' }}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ padding: 14, gap: 8 }}>
              {tab === 'retry' && (
                retries.length === 0 ? (
                  <Text style={dtS.empty}>لا توجد محاولات retry بعد</Text>
                ) : (
                  retries.map(r => (
                    <View key={r.id} style={[dtS.row, { borderColor: retryColors[r.status] + '40' }]}>
                      <View style={[dtS.rowDot, { backgroundColor: retryColors[r.status] }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[dtS.rowTitle, { color: retryColors[r.status] }]}>
                          المحاولة {r.attempt} — {r.status}
                        </Text>
                        <Text style={dtS.rowSub}>
                          {new Date(r.scheduledAt).toLocaleDateString('ar-SA')}
                          {r.errorMessage ? ` · ${r.errorMessage}` : ''}
                        </Text>
                      </View>
                    </View>
                  ))
                )
              )}
              {tab === 'dunning' && (
                dunningLogs.length === 0 ? (
                  <Text style={dtS.empty}>لا توجد رسائل dunning بعد</Text>
                ) : (
                  dunningLogs.map(d => (
                    <View key={d.id} style={[dtS.row, { borderColor: 'rgba(245,158,11,0.3)' }]}>
                      <View style={[dtS.rowDot, { backgroundColor: '#F59E0B' }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[dtS.rowTitle, { color: '#F59E0B' }]}>
                          خطوة {d.step} — {d.channel}
                        </Text>
                        <Text style={dtS.rowSub}>{d.message}</Text>
                        <Text style={[dtS.rowSub, { marginTop: 2 }]}>
                          {new Date(d.sentAt).toLocaleDateString('ar-SA')}
                          {d.opened ? ' · تم الفتح' : ''}
                        </Text>
                      </View>
                    </View>
                  ))
                )
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  )
}

const dtS = StyleSheet.create({
  tabs:       { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab:        { flex: 1, paddingVertical: 11, alignItems: 'center' },
  tabActive:  { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabTxt:     { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  tabActiveTxt: { color: COLORS.primary },
  row:        { borderRadius: 10, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(255,255,255,0.03)' },
  rowDot:     { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  rowTitle:   { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  rowSub:     { fontSize: 10, color: COLORS.textMuted, lineHeight: 15 },
  empty:      { textAlign: 'center', color: COLORS.textMuted, fontSize: 13, paddingVertical: 20 },
})

const mdS = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container:   { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  head:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:       { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn:    { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeTxt:    { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  body:        { padding: 16, gap: 12 },
  desc:        { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, textAlign: 'right' },
  label:       { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'right' },
  scheduleBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, gap: 10 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  schedDot:    { width: 8, height: 8, borderRadius: 4 },
  schedLabel:  { flex: 1, fontSize: 12, fontWeight: '600' },
  schedDay:    { fontSize: 11, color: COLORS.textMuted },
  actions:     { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:   { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surfaceBg },
  submitBtn:   { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary },
  stepRow:     { flexDirection: 'row', gap: 7 },
  stepBtn:     { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  stepTxt:     { fontSize: 10, fontWeight: '700' },
  channelRow:  { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  channelBtn:  { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  channelActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  channelTxt:  { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  channelActiveTxt: { color: '#fff' },
})

// ─── Create Modal ─────────────────────────────────────────────

const TIER_PLANS = [
  { label: 'الباقة الماسية', value: 'diamond' },
  { label: 'الباقة الذهبية', value: 'gold' },
  { label: 'الباقة الفضية',  value: 'silver' },
  { label: 'الباقة البرونزية', value: 'bronze' },
]

function CreateModal({ visible, onClose, onCreate, loading }: {
  visible: boolean; onClose: () => void
  onCreate: (data: { planName: string; amount: number; currency: string; interval: string; currentPeriodStart: string; currentPeriodEnd: string }) => void
  loading: boolean
}) {
  const [form, setForm] = useState({ planName: '', amount: '', interval: 'MONTHLY', currency: 'SAR' })

  const handleSubmit = () => {
    if (!form.planName.trim() || !form.amount.trim()) return
    const start = new Date()
    const end = new Date()
    if (form.interval === 'MONTHLY') end.setMonth(end.getMonth() + 1)
    else end.setFullYear(end.getFullYear() + 1)
    onCreate({
      planName: form.planName,
      amount: parseFloat(form.amount),
      currency: form.currency,
      interval: form.interval,
      currentPeriodStart: start.toISOString(),
      currentPeriodEnd: end.toISOString(),
    })
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mdS.overlay}>
        <View style={mdS.container}>
          <View style={mdS.head}>
            <Text style={mdS.title}>+ اشتراك جديد</Text>
            <TouchableOpacity onPress={onClose} style={mdS.closeBtn}>
              <Text style={mdS.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={mdS.body}>
            {/* اختيار الباقة */}
            <Text style={mdS.label}>اختر الباقة</Text>
            <View style={crS.tierGrid}>
              {TIER_PLANS.map(plan => {
                const tier = TIER_THEMES[plan.value as keyof typeof TIER_THEMES]
                const active = form.planName === plan.label
                return (
                  <TouchableOpacity
                    key={plan.value}
                    style={[crS.tierBtn, { borderColor: active ? tier.accent : COLORS.border }, active && { backgroundColor: tier.bg }]}
                    onPress={() => setForm({ ...form, planName: plan.label, amount: tier.price.replace('SAR ', '') })}
                  >
                    <Text style={crS.tierIcon}>{tier.icon}</Text>
                    <Text style={[crS.tierLabel, { color: active ? tier.accent : COLORS.textSecondary }]}>
                      {plan.label.replace('الباقة ', '')}
                    </Text>
                    <Text style={[crS.tierPrice, { color: active ? tier.accent : COLORS.textMuted }]}>
                      {tier.price}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TextInput
              placeholder="المبلغ" value={form.amount}
              onChangeText={v => setForm({ ...form, amount: v })}
              style={crS.input} placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad" textAlign={isRTL ? 'right' : 'left'}
            />

            {/* دورة الفوترة */}
            <Text style={mdS.label}>دورة الفوترة</Text>
            <View style={[crS.intervalRow, isRTL && { flexDirection: 'row-reverse' }]}>
              {(['MONTHLY', 'YEARLY'] as const).map(iv => (
                <TouchableOpacity
                  key={iv}
                  style={[crS.intervalBtn, form.interval === iv && crS.intervalActive]}
                  onPress={() => setForm({ ...form, interval: iv })}
                >
                  <Text style={[crS.intervalTxt, form.interval === iv && crS.intervalActiveTxt]}>
                    {iv === 'MONTHLY' ? 'شهري' : 'سنوي'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[mdS.actions, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={mdS.cancelBtn} onPress={onClose}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mdS.submitBtn, loading && { opacity: 0.6 }]}
                onPress={handleSubmit} disabled={loading}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {loading ? 'جاري الإنشاء...' : 'إنشاء الاشتراك'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
const crS = StyleSheet.create({
  tierGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tierBtn:        { width: '47%', padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceBg, alignItems: 'center', gap: 3 },
  tierIcon:       { fontSize: 22 },
  tierLabel:      { fontSize: 12, fontWeight: '700' },
  tierPrice:      { fontSize: 11, fontWeight: '600' },
  input:          { backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, color: COLORS.textPrimary, fontSize: 14 },
  intervalRow:    { flexDirection: 'row', gap: 8 },
  intervalBtn:    { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  intervalActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  intervalTxt:    { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  intervalActiveTxt: { color: '#fff' },
})

// ─── Main Screen ──────────────────────────────────────────────

export default function SubscriptionsScreen() {
  const { t } = useTranslation()
  const tabBarHeight = useTabBarHeight()

  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [churnOverview, setChurnOverview] = useState<ChurnOverview | null>(null)

  const [selKpi, setSelKpi] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  const [retryModal, setRetryModal] = useState<Sub | null>(null)
  const [retryLoading, setRetryLoading] = useState(false)

  const [dunningModal, setDunningModal] = useState<Sub | null>(null)
  const [dunningLoading, setDunningLoading] = useState(false)

  const [detailModal, setDetailModal] = useState<Sub | null>(null)

  // ─── Fetch ──────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [subsRes, churnRes] = await Promise.allSettled([
        subscriptionsApi.list(),
        subscriptionsApi.getChurnOverview(),
      ])
      if (subsRes.status === 'fulfilled') {
        const raw = subsRes.value?.data ?? subsRes.value?.subscriptions ?? []
        setSubs(Array.isArray(raw) ? raw : [])
      }
      if (churnRes.status === 'fulfilled') {
        setChurnOverview(churnRes.value?.data ?? null)
      }
    } catch (_e) {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  // ─── KPI Values ─────────────────────────────────
  const activeCount  = subs.filter(s => s.status === 'ACTIVE').length
  const pastDueCount = subs.filter(s => s.status === 'PAST_DUE').length
  const totalCount   = subs.length
  const totalRevenue = subs.filter(s => s.status === 'ACTIVE').reduce((sum, s) => sum + Number(s.amount), 0)
  const kpiValues = [
    String(activeCount),
    String(pastDueCount),
    String(totalCount),
    totalRevenue >= 1000 ? `${(totalRevenue / 1000).toFixed(1)}k` : String(totalRevenue),
  ]

  // ─── Handlers ───────────────────────────────────
  const handleAction = (sub: Sub, action: 'cancel' | 'retry' | 'dunning' | 'detail') => {
    if (action === 'cancel')  handleCancel(sub)
    if (action === 'retry')   setRetryModal(sub)
    if (action === 'dunning') setDunningModal(sub)
    if (action === 'detail')  setDetailModal(sub)
  }

  const handleCancel = (sub: Sub) => {
    subscriptionsApi.cancel(sub.id)
      .then(() => { Alert.alert('', 'تم إلغاء الاشتراك'); fetchData() })
      .catch(() => Alert.alert('', 'حدث خطأ'))
  }

  const handleCreate = async (data: Parameters<typeof subscriptionsApi.create>[0]) => {
    setCreating(true)
    try {
      await subscriptionsApi.create(data)
      setShowCreate(false)
      Alert.alert('', 'تم إنشاء الاشتراك بنجاح')
      fetchData()
    } catch (err: unknown) {
      Alert.alert('', err instanceof Error ? err.message : 'حدث خطأ')
    }
    setCreating(false)
  }

  const handleRetryConfirm = async () => {
    if (!retryModal) return
    setRetryLoading(true)
    try {
      await subscriptionsApi.triggerRetry(retryModal.id)
      Alert.alert('', 'تم جدولة Smart Retry بنجاح')
      setRetryModal(null)
      fetchData()
    } catch {
      Alert.alert('', 'حدث خطأ في جدولة Retry')
    }
    setRetryLoading(false)
  }

  const handleDunningSend = async (step: number, channel: string) => {
    if (!dunningModal) return
    setDunningLoading(true)
    try {
      await subscriptionsApi.sendDunning(dunningModal.id, step, channel)
      Alert.alert('', 'تم إرسال رسالة Dunning')
      setDunningModal(null)
      fetchData()
    } catch {
      Alert.alert('', 'حدث خطأ في الإرسال')
    }
    setDunningLoading(false)
  }

  // ─── Render ─────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={sc.safe} edges={['top']}>
        <InnerHeader title={t('subscriptions.title') || 'الاشتراكات'} />
        <View style={sc.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      </SafeAreaView>
    )
  }

  const renderHeader = () => (
    <>
      {/* KPI Row 1 */}
      <View style={[sc.kpiRow, isRTL && sc.kpiRowRTL]}>
        {[0, 1].map(i => (
          <KpiCard key={i} label={KPI_THEMES[i].label} value={kpiValues[i]}
            themeIdx={i} selected={selKpi === i} onPress={() => setSelKpi(i)} />
        ))}
      </View>
      {/* KPI Row 2 */}
      <View style={[sc.kpiRow, isRTL && sc.kpiRowRTL]}>
        {[2, 3].map(i => (
          <KpiCard key={i} label={KPI_THEMES[i].label} value={kpiValues[i]}
            themeIdx={i} selected={selKpi === i} onPress={() => setSelKpi(i)} />
        ))}
      </View>

      {/* Churn Overview */}
      <ChurnOverviewCard overview={churnOverview} />

      {/* List Header */}
      <View style={[sc.listHeader, isRTL && sc.rowRTL]}>
        <Text style={sc.listTitle}>
          الاشتراكات{' '}
          <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>({totalCount})</Text>
        </Text>
        <TouchableOpacity style={sc.createBtn} onPress={() => setShowCreate(true)}>
          <Text style={sc.createBtnTxt}>+ {t('subscriptions.create') || 'إنشاء'}</Text>
        </TouchableOpacity>
      </View>
    </>
  )

  const renderEmpty = () => (
    <View style={sc.empty}>
      <Text style={sc.emptyIcon}>🔄</Text>
      <Text style={sc.emptyTxt}>لا توجد اشتراكات بعد</Text>
      <TouchableOpacity style={[sc.createBtn, { marginTop: 8 }]} onPress={() => setShowCreate(true)}>
        <Text style={sc.createBtnTxt}>+ إنشاء اشتراك</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={sc.safe} edges={['top']}>
      <InnerHeader title={t('subscriptions.title') || 'الاشتراكات'} />

      <FlatList
        data={subs}
        keyExtractor={item => item.id}
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

      <CreateModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        loading={creating}
      />
      <RetryModal
        visible={!!retryModal}
        sub={retryModal}
        onClose={() => setRetryModal(null)}
        onConfirm={handleRetryConfirm}
        loading={retryLoading}
      />
      <DunningModal
        visible={!!dunningModal}
        sub={dunningModal}
        onClose={() => setDunningModal(null)}
        onSend={handleDunningSend}
        loading={dunningLoading}
      />
      <DetailModal
        visible={!!detailModal}
        sub={detailModal}
        onClose={() => setDetailModal(null)}
      />
    </SafeAreaView>
  )
}

const sc = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.darkBg },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingTop: 4 },
  kpiRow:      { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10 },
  kpiRowRTL:   { flexDirection: 'row-reverse' },
  listHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  rowRTL:      { flexDirection: 'row-reverse' },
  listTitle:   { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right' },
  createBtn:   { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9 },
  createBtnTxt:{ color: COLORS.white, fontSize: 12, fontWeight: '700' },
  empty:       { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon:   { fontSize: 40 },
  emptyTxt:    { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
})