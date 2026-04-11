// app/(merchant)/refunds.tsx — ELITE
// ✅ SLA تلقائي + مؤشر التأخر
// ✅ تحليل أسباب الاسترداد مع توصيات
// ✅ معدل الاسترداد لكل سبب

import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl,
  I18nManager, SafeAreaView, Modal, TextInput, ActivityIndicator,
  ListRenderItemInfo, ScrollView,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { refundsApi } from '../../services/api'
import { InnerHeader } from '../../components/InnerHeader'
import { SmartEmptyState } from '../../components/SmartEmptyState'

const isRTL = I18nManager.isRTL

interface Refund {
  id: string; refundId: string; transactionId: string
  amount: string; currency: string; reason: string; status: string
  completedAt: string | null; createdAt: string; customerName?: string
}

const DEMO_REFUNDS: Refund[] = [
  { id: '1', refundId: 'REF-001', transactionId: 'TXN-001', amount: '250.00', currency: 'SAR', reason: 'طلب العميل',           status: 'COMPLETED', completedAt: new Date(Date.now() - 86400000).toISOString(),  createdAt: new Date(Date.now() - 172800000).toISOString(), customerName: 'محمد العلي' },
  { id: '2', refundId: 'REF-002', transactionId: 'TXN-002', amount: '180.00', currency: 'SAR', reason: 'منتج تالف',            status: 'PROCESSING', completedAt: null, createdAt: new Date(Date.now() - 3600000).toISOString(),   customerName: 'سارة الأحمد' },
  { id: '3', refundId: 'REF-003', transactionId: 'TXN-003', amount: '500.00', currency: 'SAR', reason: 'خطأ في الدفع المزدوج', status: 'PROCESSING', completedAt: null, createdAt: new Date(Date.now() - 7200000).toISOString(),   customerName: 'خالد المنصور' },
  { id: '4', refundId: 'REF-004', transactionId: 'TXN-004', amount: '90.00',  currency: 'SAR', reason: 'منتج غير مطابق',      status: 'REJECTED',  completedAt: null, createdAt: new Date(Date.now() - 259200000).toISOString(), customerName: 'نورة السعيد' },
  { id: '5', refundId: 'REF-005', transactionId: 'TXN-005', amount: '320.00', currency: 'SAR', reason: 'طلب العميل',           status: 'PROCESSING', completedAt: null, createdAt: new Date(Date.now() - 10800000).toISOString(),  customerName: 'فهد الرشيدي' },
  { id: '6', refundId: 'REF-006', transactionId: 'TXN-006', amount: '150.00', currency: 'SAR', reason: 'منتج تالف',            status: 'COMPLETED', completedAt: new Date(Date.now() - 43200000).toISOString(), createdAt: new Date(Date.now() - 172800000).toISOString(), customerName: 'ريم القحطاني' },
]

const REFUND_REASONS = ['طلب العميل', 'منتج تالف', 'منتج غير مطابق', 'خطأ في الدفع المزدوج', 'تأخر التوصيل', 'أخرى']

// SLA config (hours)
const SLA_HOURS: Record<string, number> = {
  PROCESSING: 48,  // يجب الإتمام خلال 48 ساعة
  COMPLETED: 0,
  REJECTED: 0,
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  COMPLETED:  { color: '#10B981', bg: 'rgba(16,185,129,0.12)',  icon: '✅', label: 'مكتمل' },
  PROCESSING: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  icon: '⏳', label: 'جارٍ' },
  REJECTED:   { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   icon: '❌', label: 'مرفوض' },
}

// ─── SLA Indicator ────────────────────────────────
function SLAIndicator({ createdAt, status }: { createdAt: string; status: string }) {
  if (status !== 'PROCESSING') return null
  const slaHours = SLA_HOURS[status] || 48
  const elapsedHours = (Date.now() - new Date(createdAt).getTime()) / 3600000
  const remainingHours = slaHours - elapsedHours
  const pct = Math.min((elapsedHours / slaHours) * 100, 100)
  const isOverdue = remainingHours <= 0
  const isWarning = remainingHours > 0 && remainingHours <= 12

  const color = isOverdue ? '#EF4444' : isWarning ? '#F59E0B' : '#10B981'
  const label = isOverdue
    ? `تجاوز SLA بـ ${Math.abs(Math.round(remainingHours))} ساعة`
    : `SLA: ${Math.round(remainingHours)} ساعة متبقية`

  return (
    <View style={sla.wrap}>
      <View style={[sla.labelRow, isRTL && sla.labelRowRTL]}>
        <Text style={[sla.label, { color }]}>{isOverdue ? '🚨' : isWarning ? '⚠️' : '✅'} {label}</Text>
        <Text style={[sla.pct, { color }]}>{Math.round(pct)}%</Text>
      </View>
      <View style={sla.track}>
        <View style={[sla.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}
const sla = StyleSheet.create({
  wrap:        { marginBottom: 8 },
  labelRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  labelRowRTL: { flexDirection: 'row-reverse' },
  label:       { fontSize: 11, fontWeight: '700' },
  pct:         { fontSize: 11, fontWeight: '700' },
  track:       { height: 5, backgroundColor: COLORS.surfaceBg, borderRadius: 3, overflow: 'hidden' },
  fill:        { height: '100%', borderRadius: 3 },
})

// ─── Reason Analysis Panel ────────────────────────
function ReasonAnalysis({ refunds }: { refunds: Refund[] }) {
  const [expanded, setExpanded] = useState(false)
  if (refunds.length < 2) return null

  const reasonCounts: Record<string, number> = {}
  const reasonAmounts: Record<string, number> = {}
  refunds.forEach(r => {
    reasonCounts[r.reason]  = (reasonCounts[r.reason]  || 0) + 1
    reasonAmounts[r.reason] = (reasonAmounts[r.reason] || 0) + Number(r.amount)
  })
  const total = refunds.length
  const sorted = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])

  const REASON_TIPS: Record<string, string> = {
    'طلب العميل':           'راجع سياسة الاسترداد الخاصة بك لتقليل هذه الحالات',
    'منتج تالف':            'تحسين التغليف وجودة المنتج يقلل هذه المشكلة',
    'منتج غير مطابق':       'تحسين وصف المنتج والصور يقلل حالات عدم المطابقة',
    'خطأ في الدفع المزدوج': 'تفعيل Duplicate Check في إعدادات الاحتيال',
    'تأخر التوصيل':         'تحسين شركاء الشحن أو تحديث مواعيد التوصيل',
  }

  return (
    <View style={[ra.wrap, { borderColor: 'rgba(139,92,246,0.3)' }]}>
      <TouchableOpacity style={[ra.header, isRTL && ra.headerRTL]} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <Text style={ra.headerIcon}>📊</Text>
        <Text style={ra.headerTxt}>تحليل أسباب الاسترداد</Text>
        <Text style={ra.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={ra.body}>
          {sorted.map(([reason, count]) => {
            const pct   = Math.round((count / total) * 100)
            const amount = reasonAmounts[reason] || 0
            const tip   = REASON_TIPS[reason]
            return (
              <View key={reason} style={ra.item}>
                <View style={[ra.itemHeader, isRTL && ra.itemHeaderRTL]}>
                  <Text style={ra.reason}>{reason}</Text>
                  <View style={[ra.badge, isRTL && ra.badgeRTL]}>
                    <Text style={ra.badgePct}>{pct}%</Text>
                    <Text style={ra.badgeCount}>({count})</Text>
                  </View>
                </View>
                <View style={ra.track}>
                  <View style={[ra.fill, {
                    width: `${pct}%`,
                    backgroundColor: pct > 40 ? '#EF4444' : pct > 25 ? '#F59E0B' : '#10B981',
                  }]} />
                </View>
                <View style={[ra.amountRow, isRTL && ra.amountRowRTL]}>
                  <Text style={ra.amountTxt}>💰 {amount.toFixed(0)} ر.س</Text>
                  {tip && <Text style={ra.tip}>💡 {tip}</Text>}
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}
const ra = StyleSheet.create({
  wrap:         { backgroundColor: 'rgba(139,92,246,0.06)', borderRadius: 12, borderWidth: 1, marginHorizontal: 12, marginBottom: 10, overflow: 'hidden' },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  headerRTL:    { flexDirection: 'row-reverse' },
  headerIcon:   { fontSize: 16 },
  headerTxt:    { flex: 1, fontSize: 13, fontWeight: '700', color: '#8B5CF6' },
  chevron:      { fontSize: 12, color: COLORS.textMuted },
  body:         { padding: 12, paddingTop: 0, gap: 12 },
  item:         { gap: 5 },
  itemHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemHeaderRTL:{ flexDirection: 'row-reverse' },
  reason:       { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  badge:        { flexDirection: 'row', gap: 4, alignItems: 'center' },
  badgeRTL:     { flexDirection: 'row-reverse' },
  badgePct:     { fontSize: 13, fontWeight: '800', color: '#8B5CF6' },
  badgeCount:   { fontSize: 11, color: COLORS.textMuted },
  track:        { height: 6, backgroundColor: COLORS.surfaceBg, borderRadius: 3, overflow: 'hidden' },
  fill:         { height: '100%', borderRadius: 3 },
  amountRow:    { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  amountRowRTL: { flexDirection: 'row-reverse' },
  amountTxt:    { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  tip:          { fontSize: 10, color: '#8B5CF6', flex: 1, textAlign: isRTL ? 'right' : 'left' },
})

// ─── Refund Card ──────────────────────────────────
function RefundCard({ refund }: { refund: Refund }) {
  const cfg = STATUS_CONFIG[refund.status] ?? STATUS_CONFIG.PROCESSING
  const amount = Number(refund.amount)

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(h / 24)
    if (d > 0) return `منذ ${d} يوم`
    if (h > 0) return `منذ ${h} ساعة`
    return 'منذ قليل'
  }

  return (
    <View style={[rc.card, { borderColor: `${cfg.color}30` }]}>
      <View style={[rc.row, isRTL && rc.rowRTL]}>
        <View style={{ flex: 1 }}>
          <Text style={rc.customer}>{refund.customerName ?? '—'}</Text>
          <Text style={rc.refundId}>{refund.refundId}</Text>
          <Text style={rc.time}>{timeAgo(refund.createdAt)}</Text>
        </View>
        <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 5 }}>
          <Text style={[rc.amount, { color: cfg.color }]}>
            -{refund.currency} {amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
          </Text>
          <View style={[rc.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={rc.statusIcon}>{cfg.icon}</Text>
            <Text style={[rc.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
      </View>

      {/* SLA Indicator */}
      <SLAIndicator createdAt={refund.createdAt} status={refund.status} />

      <View style={rc.divider} />

      <View style={[rc.detailRow, isRTL && rc.rowRTL]}>
        <View style={[rc.typeBadge, { backgroundColor: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.35)' }]}>
          <Text style={{ fontSize: 10, color: '#8B5CF6', fontWeight: '700' }}>استرداد كامل</Text>
        </View>
        <View style={rc.reasonBadge}>
          <Text style={rc.reasonText}>📋 {refund.reason}</Text>
        </View>
      </View>

      <View style={[rc.txRow, isRTL && rc.rowRTL]}>
        <Text style={rc.txLabel}>المعاملة: </Text>
        <Text style={rc.txId}>{refund.transactionId}</Text>
        {refund.completedAt && (
          <Text style={rc.completedAt}>اكتمل: {new Date(refund.completedAt).toLocaleDateString('ar-SA')}</Text>
        )}
      </View>
    </View>
  )
}
const rc = StyleSheet.create({
  card:        { marginHorizontal: 12, marginBottom: 10, borderRadius: 14, borderWidth: 1.5, backgroundColor: 'rgba(239,68,68,0.04)', padding: 14 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  rowRTL:      { flexDirection: 'row-reverse' },
  customer:    { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right', marginBottom: 3 },
  refundId:    { fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace', textAlign: 'right' },
  time:        { fontSize: 10, color: COLORS.textMuted, textAlign: 'right', marginTop: 2 },
  amount:      { fontSize: 18, fontWeight: '800' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusIcon:  { fontSize: 10 },
  statusText:  { fontSize: 10, fontWeight: '700' },
  divider:     { height: 1, backgroundColor: 'rgba(239,68,68,0.1)', marginVertical: 10 },
  detailRow:   { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  typeBadge:   { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  reasonBadge: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  reasonText:  { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  txRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' },
  txLabel:     { fontSize: 10, color: COLORS.textMuted },
  txId:        { fontSize: 10, color: COLORS.primaryLight, fontFamily: 'monospace' },
  completedAt: { fontSize: 10, color: COLORS.textMuted, marginRight: 'auto' },
})

// ─── Create Refund Modal ──────────────────────────
function CreateRefundModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [txId, setTxId]       = useState('')
  const [amount, setAmount]   = useState('')
  const [reason, setReason]   = useState(REFUND_REASONS[0])
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep]       = useState<'form' | 'reason'>('form')

  const handleSubmit = async () => {
    if (!txId.trim() || !amount || isNaN(Number(amount)) || Number(amount) <= 0) return
    setSubmitting(true)
    try { await refundsApi.create(txId.trim(), Number(amount), reason); onCreated(); onClose(); setTxId(''); setAmount(''); setStep('form') } catch {}
    setSubmitting(false)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={md.overlay}>
        <View style={md.container}>
          <View style={md.header}>
            <Text style={md.title}>{step === 'form' ? 'إنشاء استرداد جديد' : 'سبب الاسترداد'}</Text>
            <TouchableOpacity style={md.closeBtn} onPress={onClose}><Text style={md.closeTxt}>✕</Text></TouchableOpacity>
          </View>
          <View style={md.body}>
            {step === 'form' ? (
              <>
                <Text style={md.label}>رقم المعاملة</Text>
                <TextInput style={md.input} value={txId} onChangeText={setTxId} placeholder="TXN-XXXXXXXX" placeholderTextColor={COLORS.textMuted} textAlign="right" autoCapitalize="characters" />
                <Text style={md.label}>مبلغ الاسترداد</Text>
                <TextInput style={md.input} value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" textAlign="right" />
                <View style={md.hintRow}>
                  {['كامل', 'جزئي'].map((h, i) => (
                    <View key={i} style={[md.hintBadge, { backgroundColor: i === 0 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)' }]}>
                      <Text style={[md.hintText, { color: i === 0 ? '#10B981' : '#F59E0B' }]}>{h}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity style={md.nextBtn} onPress={() => setStep('reason')}>
                  <Text style={md.nextBtnText}>التالي: السبب →</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {REFUND_REASONS.map(r => (
                  <TouchableOpacity key={r} style={[md.reasonBtn, reason === r && md.reasonBtnActive]} onPress={() => setReason(r)}>
                    <View style={[md.reasonDot, { borderColor: reason === r ? COLORS.primary : COLORS.border, backgroundColor: reason === r ? COLORS.primary : 'transparent' }]} />
                    <Text style={[md.reasonText, reason === r && { color: COLORS.primaryLight, fontWeight: '700' }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
                <View style={md.actions}>
                  <TouchableOpacity style={md.backBtn} onPress={() => setStep('form')}><Text style={md.backBtnText}>← رجوع</Text></TouchableOpacity>
                  <TouchableOpacity style={[md.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={md.submitBtnText}>تأكيد الاسترداد</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}
const md = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container:      { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:          { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn:       { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeTxt:       { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  body:           { padding: 16, gap: 10 },
  label:          { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'right' },
  input:          { backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, color: COLORS.textPrimary, fontSize: 14 },
  hintRow:        { flexDirection: 'row', gap: 8 },
  hintBadge:      { flex: 1, padding: 8, borderRadius: 8, alignItems: 'center' },
  hintText:       { fontSize: 10, fontWeight: '600' },
  nextBtn:        { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  nextBtnText:    { color: '#fff', fontSize: 14, fontWeight: '700' },
  reasonBtn:      { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceBg },
  reasonBtnActive:{ borderColor: COLORS.primary, backgroundColor: 'rgba(26,86,219,0.1)' },
  reasonDot:      { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  reasonText:     { flex: 1, fontSize: 13, color: COLORS.textSecondary, textAlign: 'right' },
  actions:        { flexDirection: 'row', gap: 10, marginTop: 8 },
  backBtn:        { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: COLORS.surfaceBg, alignItems: 'center' },
  backBtnText:    { color: COLORS.textSecondary, fontWeight: '600' },
  submitBtn:      { flex: 2, paddingVertical: 13, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center' },
  submitBtnText:  { color: '#fff', fontSize: 14, fontWeight: '700' },
})

// ─── Main Screen ──────────────────────────────────
export default function RefundsScreen() {
  const { t }        = useTranslation()
  const tabBarHeight = useTabBarHeight()
  const [refunds, setRefunds]         = useState<Refund[]>([])
  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const [showModal, setShowModal]     = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  const fetchData = useCallback(async () => {
    try { const res = await refundsApi.list(); setRefunds(res.refunds?.length ? res.refunds : DEMO_REFUNDS) }
    catch { setRefunds(DEMO_REFUNDS) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const total      = refunds.length
  const completed  = refunds.filter(r => r.status === 'COMPLETED').length
  const processing = refunds.filter(r => r.status === 'PROCESSING').length
  const rejected   = refunds.filter(r => r.status === 'REJECTED').length
  const totalAmount = refunds.filter(r => r.status !== 'REJECTED').reduce((s, r) => s + Number(r.amount), 0)
  const overdueCount = refunds.filter(r => {
    if (r.status !== 'PROCESSING') return false
    return (Date.now() - new Date(r.createdAt).getTime()) > SLA_HOURS.PROCESSING * 3600000
  }).length

  const filtered = filterStatus === 'all' ? refunds : refunds.filter(r => r.status === filterStatus)
  const FILTERS = [
    { key: 'all',        label: `الكل (${total})`,            color: COLORS.primaryLight },
    { key: 'PROCESSING', label: `جارية (${processing})`,      color: '#F59E0B' },
    { key: 'COMPLETED',  label: `مكتملة (${completed})`,      color: '#10B981' },
    { key: 'REJECTED',   label: `مرفوضة (${rejected})`,       color: '#EF4444' },
  ]

  const renderHeader = () => (
    <>
      <View style={[sc.kpiRow, isRTL && sc.kpiRowRTL]}>
        <View style={[sc.kpiCard, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)' }]}>
          <Text style={sc.kpiLabel}>إجمالي المستردات</Text>
          <Text style={[sc.kpiValue, { color: '#EF4444' }]}>{totalAmount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</Text>
          {overdueCount > 0 && (
            <View style={sc.slaWarning}>
              <Text style={sc.slaWarningTxt}>🚨 {overdueCount} تجاوزت SLA</Text>
            </View>
          )}
        </View>
        <View style={sc.kpiSmallCol}>
          <View style={[sc.kpiSmall, { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' }]}>
            <Text style={sc.kpiSmallLabel}>جارية</Text>
            <Text style={[sc.kpiSmallValue, { color: '#F59E0B' }]}>{processing}</Text>
          </View>
          <View style={[sc.kpiSmall, { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.3)' }]}>
            <Text style={sc.kpiSmallLabel}>مكتملة</Text>
            <Text style={[sc.kpiSmallValue, { color: '#10B981' }]}>{completed}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={sc.newBtn} onPress={() => setShowModal(true)} activeOpacity={0.75}>
        <Text style={sc.newBtnText}>+ إنشاء استرداد جديد</Text>
      </TouchableOpacity>

      {/* Reason Analysis */}
      <ReasonAnalysis refunds={refunds} />

      <View style={sc.filtersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sc.filtersRow}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f.key} style={[sc.filterBtn, filterStatus === f.key && { borderColor: f.color, backgroundColor: `${f.color}15` }]} onPress={() => setFilterStatus(f.key)}>
              <Text style={[sc.filterText, filterStatus === f.key && { color: f.color, fontWeight: '700' }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={sc.listHeader}>
        <Text style={sc.listTitle}>قائمة المستردات{'  '}<Text style={{ color: COLORS.textMuted, fontSize: 12 }}>({filtered.length})</Text></Text>
      </View>
    </>
  )

  if (loading) return (
    <SafeAreaView style={sc.safe}><InnerHeader title="المستردات" accentColor="#EF4444" />
      <View style={sc.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={sc.safe}>
      <InnerHeader title="المستردات" accentColor="#EF4444" />
      <FlatList
        data={filtered} keyExtractor={item => item.id}
        renderItem={({ item }: ListRenderItemInfo<Refund>) => <RefundCard refund={item} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={() => <SmartEmptyState type="generic" customTitle="لا مستردات" customDesc="لا توجد مستردات في هذه الفئة" showCta={false} />}
        contentContainerStyle={[sc.list, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      />
      <CreateRefundModal visible={showModal} onClose={() => setShowModal(false)} onCreated={fetchData} />
    </SafeAreaView>
  )
}

const sc = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.darkBg },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:          { paddingTop: 4 },
  kpiRow:        { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  kpiRowRTL:     { flexDirection: 'row-reverse' },
  kpiCard:       { flex: 2, borderRadius: 13, borderWidth: 1.5, padding: 14, gap: 6 },
  kpiLabel:      { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textAlign: 'right' },
  kpiValue:      { fontSize: 18, fontWeight: '800', textAlign: 'right' },
  slaWarning:    { backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-end' },
  slaWarningTxt: { fontSize: 10, color: '#EF4444', fontWeight: '700' },
  kpiSmallCol:   { flex: 1, gap: 8 },
  kpiSmall:      { flex: 1, borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  kpiSmallLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600', textAlign: 'right' },
  kpiSmallValue: { fontSize: 16, fontWeight: '800', textAlign: 'right' },
  newBtn:        { marginHorizontal: 12, marginTop: 10, backgroundColor: '#EF4444', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  newBtnText:    { color: '#fff', fontSize: 14, fontWeight: '700' },
  filtersWrap:   { marginTop: 10 },
  filtersRow:    { paddingHorizontal: 12, gap: 8, paddingBottom: 2 },
  filterBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.cardBg },
  filterText:    { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  listHeader:    { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  listTitle:     { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right' },
})