// app/(merchant)/disputes.tsx
import React, { useState, useMemo, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, I18nManager,
  SafeAreaView, Modal, ScrollView, TextInput,
  ActivityIndicator, ListRenderItemInfo, Dimensions,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { InnerHeader } from '../../components/InnerHeader'
import { SmartEmptyState, EmbeddedHelp } from '../../components/SmartEmptyState'
import { disputesApi } from '../../services/api'

const isRTL    = I18nManager.isRTL
const SCREEN_W = Dimensions.get('window').width

// ─── Types ────────────────────────────────────────

type DisputeStatus = 'pending' | 'won' | 'lost' | 'reviewing' | 'escalated'
type FilterKey = 'all' | DisputeStatus

interface Dispute {
  id: string
  orderId: string
  opened: string
  amount: number
  reason: string
  deadline: string
  status: DisputeStatus
  urgent: boolean
  evidence?: string[]
  responseText?: string
}

// ─── Demo Data ────────────────────────────────────

const DEMO_DISPUTES: Dispute[] = [
  {
    id: 'DSP-10041', orderId: 'ORD-88231',
    opened: '2026-03-01', amount: 1250.00,
    reason: 'العميل لم يستلم المنتج',
    deadline: '2026-04-15', status: 'pending', urgent: true,
  },
  {
    id: 'DSP-10038', orderId: 'ORD-88190',
    opened: '2026-02-20', amount: 3400.50,
    reason: 'المنتج لا يطابق الوصف',
    deadline: '2026-04-10', status: 'won', urgent: false,
  },
  {
    id: 'DSP-10035', orderId: 'ORD-88150',
    opened: '2026-02-10', amount: 780.00,
    reason: 'معاملة غير مصرح بها',
    deadline: '2026-04-05', status: 'lost', urgent: false,
  },
  {
    id: 'DSP-10030', orderId: 'ORD-88100',
    opened: '2026-01-28', amount: 2100.75,
    reason: 'خدمة لم تُقدَّم كما هو متفق عليه',
    deadline: '2026-04-20', status: 'reviewing', urgent: true,
  },
  {
    id: 'DSP-10025', orderId: 'ORD-88055',
    opened: '2026-01-15', amount: 5600.00,
    reason: 'تكرار في الخصم',
    deadline: '2026-04-25', status: 'escalated', urgent: true,
  },
]

// ─── Response Templates ───────────────────────────

const RESPONSE_TEMPLATES: Record<string, { title: string; text: string; winRate: number }[]> = {
  'العميل لم يستلم المنتج': [
    {
      title: 'تأكيد الشحن',
      winRate: 78,
      text: 'نود إحاطتكم علماً بأن الطلب رقم {orderId} قد تم شحنه بتاريخ {date} عبر شركة الشحن {carrier}. رقم التتبع: {tracking}. نرفق معه صورة من بوليصة الشحن وتأكيد التسليم الموقّع من العميل.',
    },
    {
      title: 'طلب تحقيق من شركة الشحن',
      winRate: 65,
      text: 'تم تسليم الطلب وفق سجلات شركة الشحن. نطلب فتح تحقيق رسمي مع شركة الشحن للتحقق من عملية التسليم، ونلتزم بتقديم أي وثائق إضافية مطلوبة.',
    },
  ],
  'المنتج لا يطابق الوصف': [
    {
      title: 'مطابقة المواصفات',
      winRate: 82,
      text: 'المنتج المُسلَّم يطابق تماماً الوصف المنشور على المنصة. نرفق صور المنتج الأصلية مع المنتج المُسلَّم إثباتاً للمطابقة.',
    },
    {
      title: 'عرض الاستبدال',
      winRate: 71,
      text: 'إيماناً منا برضا العميل، نعرض استبدال المنتج أو إعادة جزء من المبلغ كحل ودي، مع الاحتفاظ بحقنا في الدفاع عن موقفنا.',
    },
  ],
  'معاملة غير مصرح بها': [
    {
      title: 'تأكيد هوية العميل',
      winRate: 88,
      text: 'تمت عملية الدفع بعد التحقق من هوية صاحب البطاقة عبر نظام 3D Secure. نرفق سجل المصادقة وعنوان IP وبيانات الجهاز المستخدم.',
    },
  ],
  'default': [
    {
      title: 'الرد القياسي',
      winRate: 60,
      text: 'نحن نأخذ هذا النزاع بجدية تامة. نرفق جميع الوثائق الداعمة لموقفنا ونطلب مراجعة الحالة كاملةً.',
    },
    {
      title: 'طلب التسوية الودية',
      winRate: 55,
      text: 'نقترح التوصل إلى حل ودي يُرضي جميع الأطراف، مع الحرص على الحفاظ على علاقة جيدة مع العميل.',
    },
  ],
}

// ─── KPI Themes ───────────────────────────────────

const KPI_THEMES: Record<DisputeStatus | 'all', {
  bg: string; border: string; accent: string; icon: string; label: string; shades: string[];
}> = {
  pending:   { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.40)', accent: '#F59E0B', icon: '⏳', label: 'معلقة',        shades: ['rgba(245,158,11,0.35)', 'rgba(245,158,11,0.65)', 'rgba(245,158,11,1.00)'] },
  won:       { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.40)', accent: '#10B981', icon: '✅', label: 'مكسوبة',       shades: ['rgba(16,185,129,0.35)', 'rgba(16,185,129,0.65)', 'rgba(16,185,129,1.00)'] },
  lost:      { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.40)',  accent: '#EF4444', icon: '❌', label: 'خسارة',        shades: ['rgba(239,68,68,0.35)', 'rgba(239,68,68,0.65)', 'rgba(239,68,68,1.00)'] },
  reviewing: { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.40)', accent: '#6366F1', icon: '🔍', label: 'قيد المراجعة', shades: ['rgba(99,102,241,0.35)', 'rgba(99,102,241,0.65)', 'rgba(99,102,241,1.00)'] },
  escalated: { bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.40)', accent: '#EC4899', icon: '🚨', label: 'مُصعَّدة',    shades: ['rgba(236,72,153,0.35)', 'rgba(236,72,153,0.65)', 'rgba(236,72,153,1.00)'] },
  all:       { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.40)', accent: '#3B82F6', icon: '📋', label: 'الكل',        shades: ['rgba(59,130,246,0.35)', 'rgba(59,130,246,0.65)', 'rgba(59,130,246,1.00)'] },
}

// ─── Helpers ──────────────────────────────────────

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

function formatDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' })
  } catch { return s }
}

// ─── Win Rate Ring ────────────────────────────────

function WinRateRing({ rate, color }: { rate: number; color: string }) {
  const total = DEMO_DISPUTES.length
  const won   = DEMO_DISPUTES.filter(d => d.status === 'won').length
  const pct   = total > 0 ? Math.round((won / total) * 100) : rate
  return (
    <View style={wr.container}>
      <View style={[wr.ring, { borderColor: color }]}>
        <Text style={[wr.pct, { color }]}>{pct}%</Text>
        <Text style={wr.label}>نسبة الفوز</Text>
      </View>
    </View>
  )
}

const wr = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  ring:      { width: 70, height: 70, borderRadius: 35, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  pct:       { fontSize: 16, fontWeight: '800' },
  label:     { fontSize: 8, color: COLORS.textMuted, fontWeight: '600' },
})

// ─── KPI Card ─────────────────────────────────────

function KpiCard({ statusKey, count, amount, selected, onPress }: {
  statusKey: DisputeStatus | 'all'; count: number; amount: number; selected: boolean; onPress: () => void;
}) {
  const theme = KPI_THEMES[statusKey]
  return (
    <TouchableOpacity
      style={[kpiS.card, { backgroundColor: theme.bg, borderColor: selected ? theme.accent : theme.border }, selected && kpiS.cardSelected]}
      onPress={onPress} activeOpacity={0.75}
    >
      <View style={kpiS.topRow}>
        <Text style={kpiS.icon}>{theme.icon}</Text>
        <Text style={kpiS.label} numberOfLines={1}>{theme.label}</Text>
      </View>
      <Text style={[kpiS.count, { color: theme.accent }]}>{count}</Text>
      <Text style={kpiS.amount} numberOfLines={1}>
        {amount > 0 ? `${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })} ر.س` : '—'}
      </Text>
      <View style={[kpiS.bar, { backgroundColor: theme.accent, opacity: selected ? 1 : 0.5 }]} />
      {selected && <View style={[kpiS.dot, { backgroundColor: theme.accent }]} />}
    </TouchableOpacity>
  )
}

const kpiS = StyleSheet.create({
  card:         { flex: 1, borderRadius: 14, padding: 12, borderWidth: 1.5, overflow: 'hidden', minHeight: 90 },
  cardSelected: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6 },
  topRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  icon:    { fontSize: 13 },
  label:   { flex: 1, fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },
  count:   { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  amount:  { fontSize: 9, color: COLORS.textMuted, fontWeight: '500' },
  bar:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 2 },
  dot:     { position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3 },
})

// ─── Pivot Chart ──────────────────────────────────

function PivotChart({ selectedKey }: { selectedKey: FilterKey }) {
  const theme = KPI_THEMES[selectedKey]
  const PIVOT_DATA: Record<FilterKey, { labels: string[]; values: number[]; title: string }> = {
    all:       { labels: ['يناير', 'فبراير', 'مارس', 'أبريل'], values: [8, 12, 9, 5],  title: 'إجمالي النزاعات — آخر 4 أشهر' },
    pending:   { labels: ['يناير', 'فبراير', 'مارس', 'أبريل'], values: [3, 5, 4, 1],   title: 'النزاعات المعلقة — آخر 4 أشهر' },
    won:       { labels: ['يناير', 'فبراير', 'مارس', 'أبريل'], values: [2, 4, 3, 1],   title: 'النزاعات المكسوبة — آخر 4 أشهر' },
    lost:      { labels: ['يناير', 'فبراير', 'مارس', 'أبريل'], values: [1, 2, 1, 1],   title: 'نزاعات الخسارة — آخر 4 أشهر' },
    reviewing: { labels: ['يناير', 'فبراير', 'مارس', 'أبريل'], values: [1, 1, 1, 2],   title: 'قيد المراجعة — آخر 4 أشهر' },
    escalated: { labels: ['يناير', 'فبراير', 'مارس', 'أبريل'], values: [1, 0, 0, 1],   title: 'النزاعات المُصعَّدة — آخر 4 أشهر' },
  }
  const data   = PIVOT_DATA[selectedKey]
  const maxVal = Math.max(...data.values, 1)
  const change = data.values[3] - data.values[2]
  const changePct = data.values[2] !== 0 ? ((change / data.values[2]) * 100).toFixed(1) : '0'
  const isGood = change <= 0
  const shades = theme.shades

  return (
    <View style={[pivS.container, { borderColor: theme.border }]}>
      <View style={pivS.headerRow}>
        <View style={[pivS.dot, { backgroundColor: theme.accent }]} />
        <Text style={[pivS.title, { color: theme.accent }]}>{data.title}</Text>
        <View style={[pivS.badge, { backgroundColor: isGood ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
          <Text style={[pivS.badgeText, { color: isGood ? '#10B981' : '#EF4444' }]}>
            {isGood ? '▼' : '▲'} {Math.abs(parseFloat(changePct))}%
          </Text>
        </View>
        <WinRateRing rate={60} color={theme.accent} />
      </View>
      <View style={pivS.barsRow}>
        {data.values.map((val, i) => {
          const barColor = shades[Math.min(i, shades.length - 1)]
          const heightPct = Math.max((val / maxVal) * 100, val === 0 ? 0 : 8)
          return (
            <View key={i} style={pivS.barGroup}>
              <Text style={[pivS.barVal, { color: barColor }]}>{val}</Text>
              <View style={pivS.barTrack}>
                <View style={[pivS.barFill, { height: `${heightPct}%`, backgroundColor: barColor }]} />
              </View>
              <Text style={pivS.barLabel}>{data.labels[i]}</Text>
            </View>
          )
        })}
      </View>
      <View style={pivS.summaryRow}>
        {data.labels.map((lbl, i) => (
          <View key={i} style={[
            pivS.summaryCell,
            i < data.labels.length - 1 && { borderRightWidth: 1, borderRightColor: COLORS.border },
            i === data.labels.length - 1 && { backgroundColor: `${theme.accent}12` },
          ]}>
            <Text style={pivS.sumLabel}>{lbl}</Text>
            <Text style={[pivS.sumVal, { color: i === data.labels.length - 1 ? theme.accent : COLORS.textSecondary }]}>{data.values[i]}</Text>
          </View>
        ))}
      </View>
      <View style={[pivS.insight, { borderTopColor: theme.border }]}>
        <Text style={pivS.insightText}>
          💡 {isGood ? `تحسّن بنسبة ${Math.abs(parseFloat(changePct))}% مقارنةً بالشهر الماضي` : `ارتفاع بنسبة ${Math.abs(parseFloat(changePct))}% مقارنةً بالشهر الماضي`}
        </Text>
      </View>
    </View>
  )
}

const pivS = StyleSheet.create({
  container:   { marginHorizontal: 12, marginTop: 12, borderRadius: 14, borderWidth: 1.5, backgroundColor: COLORS.cardBg, overflow: 'hidden' },
  headerRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, gap: 8 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  title:       { flex: 1, fontSize: 11, fontWeight: '600' },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText:   { fontSize: 11, fontWeight: '700' },
  barsRow:     { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 8, height: 110 },
  barGroup:    { alignItems: 'center', flex: 1, gap: 4 },
  barVal:      { fontSize: 13, fontWeight: '800' },
  barTrack:    { width: 32, height: 65, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill:     { width: '100%', borderRadius: 6 },
  barLabel:    { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  summaryRow:  { flexDirection: isRTL ? 'row-reverse' : 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  summaryCell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  sumLabel:    { fontSize: 9, color: COLORS.textMuted, fontWeight: '600', marginBottom: 2 },
  sumVal:      { fontSize: 13, fontWeight: '800' },
  insight:     { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  insightText: { fontSize: 11, color: COLORS.textMuted, lineHeight: 17 },
})

// ─── Dispute Card ─────────────────────────────────

function DisputeCard({ dispute, onRespond }: { dispute: Dispute; onRespond: (d: Dispute) => void }) {
  const theme    = KPI_THEMES[dispute.status]
  const isPending = dispute.status === 'pending' || dispute.status === 'reviewing'
  const days     = daysUntil(dispute.deadline)
  const deadlineColor = days <= 3 ? '#EF4444' : days <= 7 ? '#F59E0B' : '#10B981'

  return (
    <View style={[dCard.container, { backgroundColor: theme.bg, borderColor: theme.border }]}>
      {dispute.urgent && (
        <View style={dCard.urgentBanner}>
          <Text style={dCard.urgentText}>⚠️ تنبيه: يتطلب رداً عاجلاً</Text>
        </View>
      )}

      <View style={[dCard.topRow, isRTL && dCard.rowRTL]}>
        <View style={dCard.pill}>
          <Text style={dCard.pillText}>{dispute.id}</Text>
        </View>
        <View style={[dCard.badge, { backgroundColor: `${theme.accent}22` }]}>
          <Text style={[dCard.badgeText, { color: theme.accent }]}>{theme.icon} {theme.label}</Text>
        </View>
      </View>

      <View style={[dCard.reasonRow, isRTL && dCard.rowRTL]}>
        <Text style={dCard.reasonLabel}>السبب:</Text>
        <Text style={dCard.reasonValue}>{dispute.reason}</Text>
      </View>

      <View style={dCard.divider} />

      {/* Deadline countdown */}
      <View style={[dCard.deadlineRow, isRTL && dCard.rowRTL]}>
        <View style={[dCard.deadlineBox, { borderColor: deadlineColor, backgroundColor: `${deadlineColor}12` }]}>
          <Text style={[dCard.deadlineDays, { color: deadlineColor }]}>{days > 0 ? days : 0}</Text>
          <Text style={[dCard.deadlineLabel, { color: deadlineColor }]}>يوم متبقي</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={dCard.metaLabel}>الموعد النهائي</Text>
          <Text style={[dCard.metaValue, { color: deadlineColor }]}>{formatDate(dispute.deadline)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <Text style={dCard.metaLabel}>المبلغ</Text>
          <Text style={[dCard.amountText, { color: theme.accent }]}>
            {dispute.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
          </Text>
        </View>
      </View>

      {isPending && (
        <TouchableOpacity
          style={[dCard.respondBtn, { backgroundColor: theme.accent }]}
          onPress={() => onRespond(dispute)}
          activeOpacity={0.75}
        >
          <Text style={dCard.respondBtnText}>📝 رد على النزاع</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const dCard = StyleSheet.create({
  container:    { marginHorizontal: 12, marginTop: 10, borderRadius: 14, borderWidth: 1.5, overflow: 'hidden' },
  urgentBanner: { backgroundColor: 'rgba(245,158,11,0.18)', paddingHorizontal: 16, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(245,158,11,0.4)' },
  urgentText:   { fontSize: 12, fontWeight: '700', color: '#F59E0B', textAlign: 'right' },
  topRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  rowRTL:       { flexDirection: 'row-reverse' },
  pill:         { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pillText:     { fontSize: 12, color: COLORS.textPrimary, fontWeight: '600', fontFamily: 'monospace' },
  badge:        { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:    { fontSize: 12, fontWeight: '700' },
  reasonRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  reasonLabel:  { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  reasonValue:  { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right' },
  divider:      { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 12 },
  deadlineRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  deadlineBox:  { width: 56, height: 56, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 2 },
  deadlineDays: { fontSize: 18, fontWeight: '800' },
  deadlineLabel:{ fontSize: 8, fontWeight: '600' },
  metaLabel:    { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  metaValue:    { fontSize: 13, fontWeight: '700' },
  amountText:   { fontSize: 15, fontWeight: '800' },
  respondBtn:   { marginHorizontal: 14, marginBottom: 14, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  respondBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
})

// ─── Response Modal ───────────────────────────────

function RespondModal({ dispute, visible, onClose, onSubmit }: {
  dispute: Dispute | null; visible: boolean;
  onClose: () => void; onSubmit: (text: string) => void;
}) {
  const [responseText, setResponseText] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<'templates' | 'editor'>('templates')

  if (!dispute) return null

  const templates = RESPONSE_TEMPLATES[dispute.reason] ?? RESPONSE_TEMPLATES['default']

  const handleSelectTemplate = (idx: number) => {
    setSelectedTemplate(idx)
    setResponseText(
      templates[idx].text
        .replace('{orderId}', dispute.orderId)
        .replace('{date}', formatDate(dispute.opened))
        .replace('{carrier}', 'أرامكس')
        .replace('{tracking}', 'ARX-' + dispute.id)
    )
    setStep('editor')
  }

  const handleSubmit = async () => {
    if (!responseText.trim()) return
    setSubmitting(true)
    try {
      await disputesApi.respond(dispute.id, responseText)
    } catch {}
    onSubmit(responseText)
    setSubmitting(false)
    setResponseText('')
    setSelectedTemplate(null)
    setStep('templates')
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={rm.overlay}>
        <View style={rm.container}>
          {/* Header */}
          <View style={rm.header}>
            <TouchableOpacity onPress={onClose} style={rm.closeBtn}>
              <Text style={rm.closeTxt}>✕</Text>
            </TouchableOpacity>
            <Text style={rm.title}>رد على النزاع {dispute.id}</Text>
            {step === 'editor' && (
              <TouchableOpacity onPress={() => setStep('templates')}>
                <Text style={rm.backBtn}>← القوالب</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={rm.scroll} showsVerticalScrollIndicator={false}>
            {step === 'templates' ? (
              <>
                <Text style={rm.sectionTitle}>اختر قالب الرد المناسب</Text>
                <Text style={rm.sectionSub}>القوالب مُحسَّنة لزيادة نسبة الفوز</Text>

                {templates.map((tpl, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={rm.templateCard}
                    onPress={() => handleSelectTemplate(idx)}
                    activeOpacity={0.75}
                  >
                    <View style={rm.templateHeader}>
                      <Text style={rm.templateTitle}>{tpl.title}</Text>
                      <View style={[rm.winBadge, { backgroundColor: tpl.winRate >= 75 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }]}>
                        <Text style={[rm.winText, { color: tpl.winRate >= 75 ? '#10B981' : '#F59E0B' }]}>
                          🏆 {tpl.winRate}% نسبة فوز
                        </Text>
                      </View>
                    </View>
                    <Text style={rm.templatePreview} numberOfLines={2}>{tpl.text}</Text>
                    <View style={rm.useBtn}>
                      <Text style={rm.useBtnText}>استخدم هذا القالب ←</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity style={rm.customBtn} onPress={() => { setResponseText(''); setStep('editor') }}>
                  <Text style={rm.customBtnText}>✏️ كتابة رد مخصص</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={rm.sectionTitle}>تعديل نص الرد</Text>

                {selectedTemplate !== null && (
                  <View style={rm.winAlert}>
                    <Text style={rm.winAlertText}>
                      🏆 نسبة الفوز المتوقعة: {templates[selectedTemplate]?.winRate}%
                    </Text>
                  </View>
                )}

                <TextInput
                  style={rm.textInput}
                  value={responseText}
                  onChangeText={setResponseText}
                  multiline
                  numberOfLines={8}
                  placeholder="اكتب ردك هنا..."
                  placeholderTextColor={COLORS.textMuted}
                  textAlign={isRTL ? 'right' : 'left'}
                  textAlignVertical="top"
                />

                {/* Evidence section */}
                <Text style={rm.sectionTitle}>المستندات الداعمة</Text>
                <View style={rm.evidenceRow}>
                  {['فاتورة الشحن', 'صورة المنتج', 'تأكيد التسليم'].map((doc, i) => (
                    <TouchableOpacity key={i} style={rm.evidenceBtn}>
                      <Text style={rm.evidenceIcon}>📎</Text>
                      <Text style={rm.evidenceText}>{doc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={rm.evidenceHint}>اضغط لإضافة المستند (PDF, صورة)</Text>

                <TouchableOpacity
                  style={[rm.submitBtn, (!responseText.trim() || submitting) && { opacity: 0.5 }]}
                  onPress={handleSubmit}
                  disabled={!responseText.trim() || submitting}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={rm.submitBtnText}>إرسال الرد الرسمي</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const rm = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  container:     { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:         { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, flex: 1, textAlign: 'center' },
  closeBtn:      { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeTxt:      { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  backBtn:       { fontSize: 13, color: COLORS.primaryLight, fontWeight: '600' },
  scroll:        { padding: 16 },
  sectionTitle:  { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right', marginBottom: 4, marginTop: 8 },
  sectionSub:    { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginBottom: 12 },
  templateCard:  { backgroundColor: COLORS.surfaceBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 10, gap: 8 },
  templateHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  templateTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  winBadge:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  winText:       { fontSize: 11, fontWeight: '700' },
  templatePreview: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18, textAlign: 'right' },
  useBtn:        { alignItems: 'flex-start' },
  useBtnText:    { fontSize: 12, color: COLORS.primaryLight, fontWeight: '600' },
  customBtn:     { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4, marginBottom: 20 },
  customBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  winAlert:      { backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  winAlertText:  { fontSize: 13, color: '#10B981', fontWeight: '700', textAlign: 'center' },
  textInput:     { backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, color: COLORS.textPrimary, fontSize: 14, minHeight: 160, lineHeight: 22 },
  evidenceRow:   { flexDirection: 'row', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  evidenceBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderStyle: 'dashed' },
  evidenceIcon:  { fontSize: 14 },
  evidenceText:  { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  evidenceHint:  { fontSize: 10, color: COLORS.textMuted, textAlign: 'right', marginBottom: 16 },
  submitBtn:     { backgroundColor: '#F59E0B', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})

// ─── Main Screen ──────────────────────────────────

export default function DisputesScreen() {
  const { t }        = useTranslation()
  const tabBarHeight = useTabBarHeight()
  const [selected, setSelected]       = useState<FilterKey>('pending')
  const [refreshing, setRefreshing]   = useState(false)
  const [activeDispute, setActiveDispute] = useState<Dispute | null>(null)
  const [modalVisible, setModalVisible]   = useState(false)

  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800) }

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    const a: Record<string, number> = {}
    DEMO_DISPUTES.forEach(d => {
      c[d.status] = (c[d.status] ?? 0) + 1
      a[d.status] = (a[d.status] ?? 0) + d.amount
    })
    c['all'] = DEMO_DISPUTES.length
    a['all'] = DEMO_DISPUTES.reduce((s, d) => s + d.amount, 0)
    return { counts: c, amounts: a }
  }, [])

  const filtered = useMemo(
    () => selected === 'all' ? DEMO_DISPUTES : DEMO_DISPUTES.filter(d => d.status === selected),
    [selected]
  )

  const KPI_KEYS: (DisputeStatus | 'all')[] = ['pending', 'won', 'lost', 'reviewing', 'escalated']

  const handleRespond = useCallback((dispute: Dispute) => {
    setActiveDispute(dispute)
    setModalVisible(true)
  }, [])

  const renderHeader = () => (
    <>
      <View style={sc.kpiWrap}>
        <View style={[sc.kpiRow, isRTL && sc.kpiRowRTL]}>
          {KPI_KEYS.slice(0, 3).map(key => (
            <KpiCard key={key} statusKey={key} count={counts.counts[key] ?? 0}
              amount={counts.amounts[key] ?? 0} selected={selected === key} onPress={() => setSelected(key)} />
          ))}
        </View>
        <View style={[sc.kpiRow, isRTL && sc.kpiRowRTL]}>
          {KPI_KEYS.slice(3, 5).map(key => (
            <KpiCard key={key} statusKey={key} count={counts.counts[key] ?? 0}
              amount={counts.amounts[key] ?? 0} selected={selected === key} onPress={() => setSelected(key)} />
          ))}
          <KpiCard statusKey="all" count={counts.counts['all'] ?? 0}
            amount={counts.amounts['all'] ?? 0} selected={selected === 'all'} onPress={() => setSelected('all')} />
        </View>
      </View>

      <PivotChart selectedKey={selected} />

      <View style={sc.listTitleRow}>
        <Text style={sc.listTitle}>
          {KPI_THEMES[selected]?.icon} {KPI_THEMES[selected]?.label}
          {'  '}
          <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>({filtered.length})</Text>
        </Text>
      </View>
    </>
  )

  return (
    <SafeAreaView style={sc.safeArea}>
      <InnerHeader title={t('disputes.title')} accentColor="#F59E0B" />
      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }: ListRenderItemInfo<Dispute>) => (
          <DisputeCard dispute={item} onRespond={handleRespond} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={() => (
          <SmartEmptyState type="disputes" />
        )}
        contentContainerStyle={[sc.listContent, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}
      />

      <RespondModal
        dispute={activeDispute}
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setActiveDispute(null) }}
        onSubmit={() => {}}
      />
    </SafeAreaView>
  )
}

const sc = StyleSheet.create({
  safeArea:     { flex: 1, backgroundColor: COLORS.darkBg },
  listContent:  { paddingTop: 4 },
  kpiWrap:      { paddingHorizontal: 12, paddingTop: 12, gap: 8 },
  kpiRow:       { flexDirection: 'row', gap: 8 },
  kpiRowRTL:    { flexDirection: 'row-reverse' },
  listTitleRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  listTitle:    { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right' },
  empty:        { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon:    { fontSize: 36 },
  emptyText:    { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
})