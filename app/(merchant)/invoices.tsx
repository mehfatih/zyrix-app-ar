// ─────────────────────────────────────────────────────────────
// app/(merchant)/invoices.tsx — Elite (e-Invoicing + Reminders + Overdue)
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, I18nManager, ActivityIndicator, RefreshControl,
  Modal, Alert, ScrollView, ListRenderItemInfo,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { invoicesApi } from '../../services/api'
import { InnerHeader } from '../../components/InnerHeader'

const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────────────────

interface InvoiceItem {
  description: string
  quantity: string
  unitPrice: string
}

interface Invoice {
  id: string
  invoiceId: string
  customerName: string
  total: number
  currency: string
  status: string
  createdAt: string
  dueDate: string
  paidDate: string | null
  items: any
  einvoice: { zatcaUuid: string; status: string; qrData: string } | null
}

interface OverdueSummary {
  summary: Record<string, { count: number; totalAmount: number }>
  overdue: { count: number; totalAmount: number }
}

interface ReminderLog {
  id: string
  triggerDay: number
  channel: string
  message: string
  status: string
  sentAt: string | null
}

// ─── Constants ────────────────────────────────────────────────

const CURRENCY_SYM: Record<string, string> = {
  SAR: 'ر.س', AED: 'د.إ', KWD: 'د.ك', QAR: 'ر.ق', USD: '$', TRY: '₺',
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  DRAFT:   { color: '#6B7280', bg: 'rgba(107,114,128,0.15)', label: 'مسودة',  icon: '📝' },
  SENT:    { color: '#6366F1', bg: 'rgba(99,102,241,0.15)',  label: 'مرسلة',  icon: '📤' },
  PAID:    { color: '#10B981', bg: 'rgba(16,185,129,0.15)',  label: 'مدفوعة', icon: '✅' },
  OVERDUE: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)',   label: 'متأخرة', icon: '⚠️' },
}

const CARD_ACCENTS = ['#6366F1', '#8B5CF6', '#0D9488', '#F59E0B', '#06B6D4']

const emptyItem = (): InvoiceItem => ({ description: '', quantity: '1', unitPrice: '' })

// ─── KPI Card ─────────────────────────────────────────────────

function KpiCard({ label, value, accent, selected, onPress }: {
  label: string; value: string; accent: string; selected: boolean; onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[kS.card, { borderColor: selected ? accent : accent + '40', backgroundColor: accent + (selected ? '22' : '12') }]}
      onPress={onPress} activeOpacity={0.75}
    >
      <Text style={[kS.lbl, { color: accent }]}>{label}</Text>
      <Text style={[kS.val, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <View style={[kS.bar, { backgroundColor: accent, opacity: selected ? 1 : 0.4 }]} />
    </TouchableOpacity>
  )
}
const kS = StyleSheet.create({
  card: { flex: 1, borderRadius: 12, padding: 11, borderWidth: 1.5, overflow: 'hidden', minHeight: 68 },
  lbl:  { fontSize: 10, fontWeight: '600', marginBottom: 4, textAlign: 'right' },
  val:  { fontSize: 20, fontWeight: '800', textAlign: 'right' },
  bar:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 2 },
})

// ─── Overdue Banner ───────────────────────────────────────────

function OverdueBanner({ summary }: { summary: OverdueSummary | null }) {
  if (!summary || summary.overdue.count === 0) return null
  return (
    <View style={obS.wrap}>
      <Text style={obS.icon}>⚠️</Text>
      <View style={{ flex: 1 }}>
        <Text style={obS.title}>{summary.overdue.count} فاتورة متأخرة</Text>
        <Text style={obS.sub}>
          إجمالي {summary.overdue.totalAmount.toLocaleString()} ر.س غير محصّل
        </Text>
      </View>
    </View>
  )
}
const obS = StyleSheet.create({
  wrap:  { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginBottom: 10, padding: 12, backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)' },
  icon:  { fontSize: 22 },
  title: { fontSize: 13, fontWeight: '700', color: '#EF4444' },
  sub:   { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
})

// ─── e-Invoice Badge ──────────────────────────────────────────

function EInvoiceBadge({ einvoice }: { einvoice: Invoice['einvoice'] }) {
  if (!einvoice) return null
  const colors: Record<string, string> = {
    GENERATED: '#06B6D4', SUBMITTED: '#6366F1', ACCEPTED: '#10B981', REJECTED: '#EF4444',
  }
  const color = colors[einvoice.status] ?? '#6B7280'
  return (
    <View style={[eiS.badge, { backgroundColor: color + '20', borderColor: color + '50' }]}>
      <Text style={[eiS.txt, { color }]}>📄 ZATCA {einvoice.status}</Text>
    </View>
  )
}
const eiS = StyleSheet.create({
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  txt:   { fontSize: 9, fontWeight: '700' },
})

// ─── Invoice Card ─────────────────────────────────────────────

function InvoiceCard({ inv, accent, onAction }: {
  inv: Invoice
  accent: string
  onAction: (inv: Invoice, action: 'send' | 'markPaid' | 'einvoice' | 'reminder' | 'detail') => void
}) {
  const st = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.DRAFT
  const curr = CURRENCY_SYM[inv.currency] ?? inv.currency
  const daysOverdue = inv.status === 'OVERDUE'
    ? Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86400000)
    : 0

  return (
    <TouchableOpacity
      style={[iC.card, { backgroundColor: accent + '12', borderColor: accent + '35' }]}
      onPress={() => onAction(inv, 'detail')}
      activeOpacity={0.85}
    >
      {/* Header */}
      <View style={[iC.topRow, isRTL && iC.rowRTL]}>
        <View style={{ flex: 1 }}>
          <Text style={iC.customer}>{inv.customerName}</Text>
          <Text style={iC.invId}>{inv.invoiceId}</Text>
          <Text style={iC.date}>
            {new Date(inv.createdAt).toLocaleDateString('ar-SA')}
            {' · '}استحقاق {new Date(inv.dueDate).toLocaleDateString('ar-SA')}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-start', gap: 5 }}>
          <Text style={[iC.amount, { color: accent }]}>
            {Number(inv.total).toLocaleString()} {curr}
          </Text>
          <View style={[iC.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[iC.statusTxt, { color: st.color }]}>{st.icon} {st.label}</Text>
          </View>
          {daysOverdue > 0 && (
            <Text style={iC.overdueText}>متأخرة {daysOverdue} يوم</Text>
          )}
        </View>
      </View>

      {inv.einvoice && (
        <View style={{ marginBottom: 8 }}>
          <EInvoiceBadge einvoice={inv.einvoice} />
        </View>
      )}

      <View style={[iC.divider, { backgroundColor: accent + '25' }]} />

      {/* Actions */}
      <View style={[iC.actions, isRTL && iC.rowRTL]}>
        {inv.status === 'DRAFT' && (
          <TouchableOpacity
            style={[iC.btn, { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.35)' }]}
            onPress={() => onAction(inv, 'send')}
          >
            <Text style={[iC.btnTxt, { color: '#6366F1' }]}>📤 إرسال</Text>
          </TouchableOpacity>
        )}
        {inv.status === 'SENT' && (
          <TouchableOpacity
            style={[iC.btn, { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.35)' }]}
            onPress={() => onAction(inv, 'markPaid')}
          >
            <Text style={[iC.btnTxt, { color: '#10B981' }]}>✓ تم الدفع</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[iC.btn, { backgroundColor: 'rgba(6,182,212,0.15)', borderColor: 'rgba(6,182,212,0.35)' }]}
          onPress={() => onAction(inv, 'einvoice')}
        >
          <Text style={[iC.btnTxt, { color: '#06B6D4' }]}>📄 ZATCA</Text>
        </TouchableOpacity>
        {(inv.status === 'SENT' || inv.status === 'OVERDUE') && (
          <TouchableOpacity
            style={[iC.btn, { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.35)' }]}
            onPress={() => onAction(inv, 'reminder')}
          >
            <Text style={[iC.btnTxt, { color: '#F59E0B' }]}>🔔 تذكير</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  )
}
const iC = StyleSheet.create({
  card:        { marginHorizontal: 12, marginBottom: 10, borderRadius: 14, borderWidth: 1.5, padding: 14, overflow: 'hidden' },
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  rowRTL:      { flexDirection: 'row-reverse' },
  customer:    { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2, textAlign: 'right' },
  invId:       { fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace', textAlign: 'right' },
  date:        { fontSize: 10, color: COLORS.textMuted, marginTop: 3, textAlign: 'right' },
  amount:      { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusTxt:   { fontSize: 10, fontWeight: '700' },
  overdueText: { fontSize: 9, color: '#EF4444', fontWeight: '600' },
  divider:     { height: 1, marginBottom: 10 },
  actions:     { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  btn:         { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  btnTxt:      { fontSize: 11, fontWeight: '700' },
})

// ─── e-Invoice Modal ──────────────────────────────────────────

function EInvoiceModal({ visible, inv, onClose, onGenerate, loading }: {
  visible: boolean; inv: Invoice | null; onClose: () => void
  onGenerate: (taxRate: number) => void; loading: boolean
}) {
  const [taxRate, setTaxRate] = useState('15')
  if (!inv) return null

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mdS.overlay}>
        <View style={mdS.container}>
          <View style={mdS.head}>
            <Text style={mdS.title}>📄 الفاتورة الإلكترونية ZATCA</Text>
            <TouchableOpacity onPress={onClose} style={mdS.closeBtn}>
              <Text style={mdS.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={mdS.body}>
            {inv.einvoice ? (
              <>
                <View style={eiM.infoBox}>
                  <View style={[eiM.row, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Text style={eiM.label}>UUID</Text>
                    <Text style={eiM.val} numberOfLines={1}>{inv.einvoice.zatcaUuid}</Text>
                  </View>
                  <View style={[eiM.row, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Text style={eiM.label}>الحالة</Text>
                    <Text style={[eiM.val, { color: '#06B6D4' }]}>{inv.einvoice.status}</Text>
                  </View>
                  <View style={[eiM.row, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Text style={eiM.label}>QR Data</Text>
                    <Text style={eiM.val} numberOfLines={2}>{inv.einvoice.qrData.slice(0, 40)}...</Text>
                  </View>
                </View>
                <Text style={eiM.note}>✅ تم إنشاء الفاتورة الإلكترونية وفق معايير ZATCA</Text>
              </>
            ) : (
              <>
                <Text style={mdS.desc}>
                  إنشاء فاتورة إلكترونية متوافقة مع هيئة الزكاة والضريبة والجمارك (ZATCA) للفاتورة{' '}
                  <Text style={{ color: '#06B6D4', fontWeight: '700' }}>{inv.invoiceId}</Text>
                </Text>
                <Text style={mdS.label}>نسبة ضريبة القيمة المضافة (%)</Text>
                <TextInput
                  value={taxRate}
                  onChangeText={setTaxRate}
                  style={mdS.input}
                  keyboardType="decimal-pad"
                  placeholderTextColor={COLORS.textMuted}
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </>
            )}
            <View style={[mdS.actions, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={mdS.cancelBtn} onPress={onClose}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>إغلاق</Text>
              </TouchableOpacity>
              {!inv.einvoice && (
                <TouchableOpacity
                  style={[mdS.submitBtn, { backgroundColor: '#06B6D4' }, loading && { opacity: 0.6 }]}
                  onPress={() => onGenerate(parseFloat(taxRate) || 15)}
                  disabled={loading}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>
                    {loading ? 'جاري الإنشاء...' : 'إنشاء e-Invoice'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
const eiM = StyleSheet.create({
  infoBox: { backgroundColor: 'rgba(6,182,212,0.08)', borderRadius: 10, padding: 12, gap: 8, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(6,182,212,0.25)' },
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  label:   { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', width: 55 },
  val:     { flex: 1, fontSize: 11, color: COLORS.textPrimary, fontFamily: 'monospace', textAlign: 'right' },
  note:    { fontSize: 12, color: '#10B981', fontWeight: '600', textAlign: 'center', marginBottom: 8 },
})

// ─── Reminder Modal ───────────────────────────────────────────

function ReminderModal({ visible, inv, onClose, onSend, loading }: {
  visible: boolean; inv: Invoice | null; onClose: () => void
  onSend: (triggerDay: number, channel: string) => void; loading: boolean
}) {
  const [triggerDay, setTriggerDay] = useState(0)
  const [channel, setChannel] = useState('PUSH')
  const channels = ['PUSH', 'SMS', 'EMAIL', 'WHATSAPP']
  if (!inv) return null

  const dayOptions = [
    { label: 'اليوم', value: 0 },
    { label: 'بعد 3 أيام', value: 3 },
    { label: 'بعد 7 أيام', value: 7 },
  ]

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mdS.overlay}>
        <View style={mdS.container}>
          <View style={mdS.head}>
            <Text style={mdS.title}>🔔 إرسال تذكير</Text>
            <TouchableOpacity onPress={onClose} style={mdS.closeBtn}>
              <Text style={mdS.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={mdS.body}>
            <Text style={mdS.label}>وقت الإرسال</Text>
            <View style={rmS.dayRow}>
              {dayOptions.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[rmS.dayBtn, triggerDay === opt.value && rmS.dayActive]}
                  onPress={() => setTriggerDay(opt.value)}
                >
                  <Text style={[rmS.dayTxt, triggerDay === opt.value && rmS.dayActiveTxt]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[mdS.label, { marginTop: 12 }]}>قناة الإرسال</Text>
            <View style={rmS.channelRow}>
              {channels.map(ch => (
                <TouchableOpacity
                  key={ch}
                  style={[rmS.channelBtn, channel === ch && rmS.channelActive]}
                  onPress={() => setChannel(ch)}
                >
                  <Text style={[rmS.channelTxt, channel === ch && rmS.channelActiveTxt]}>{ch}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[mdS.actions, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={mdS.cancelBtn} onPress={onClose}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mdS.submitBtn, { backgroundColor: '#F59E0B' }, loading && { opacity: 0.6 }]}
                onPress={() => onSend(triggerDay, channel)}
                disabled={loading}
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
const rmS = StyleSheet.create({
  dayRow:         { flexDirection: 'row', gap: 7 },
  dayBtn:         { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  dayActive:      { backgroundColor: '#F59E0B25', borderColor: '#F59E0B' },
  dayTxt:         { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  dayActiveTxt:   { color: '#F59E0B' },
  channelRow:     { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  channelBtn:     { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  channelActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  channelTxt:     { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  channelActiveTxt: { color: '#fff' },
})

// ─── Create Modal ─────────────────────────────────────────────

function CreateModal({ visible, onClose, onCreate, loading }: {
  visible: boolean; onClose: () => void
  onCreate: (data: any) => void; loading: boolean
}) {
  const [customerName, setCustomerName] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()])
  const [taxRate, setTaxRate] = useState('15')
  const [currency, setCurrency] = useState('SAR')

  const updateItem = (i: number, field: keyof InvoiceItem, val: string) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))

  const subtotal = items.reduce((sum, it) => {
    return sum + (parseInt(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0)
  }, 0)
  const taxAmt = subtotal * ((parseFloat(taxRate) || 0) / 100)
  const total = subtotal + taxAmt

  const handleSubmit = () => {
    if (!customerName.trim()) return
    const valid = items.filter(i => i.description.trim() && i.unitPrice.trim())
    if (valid.length === 0) return
    const due = new Date()
    due.setDate(due.getDate() + 30)
    onCreate({
      customerName: customerName.trim(),
      total,
      currency,
      items: valid.map(i => ({
        description: i.description.trim(),
        quantity: parseInt(i.quantity) || 1,
        unitPrice: parseFloat(i.unitPrice),
      })),
      taxRate: parseFloat(taxRate) || 0,
      dueDate: due.toISOString(),
    })
  }

  const reset = () => {
    setCustomerName(''); setItems([emptyItem()]); setTaxRate('15')
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { onClose(); reset() }}>
      <View style={mdS.overlay}>
        <View style={[mdS.container, { maxHeight: '90%' }]}>
          <View style={mdS.head}>
            <Text style={mdS.title}>+ فاتورة جديدة</Text>
            <TouchableOpacity onPress={() => { onClose(); reset() }} style={mdS.closeBtn}>
              <Text style={mdS.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={mdS.body} showsVerticalScrollIndicator={false}>
            <TextInput
              placeholder="اسم العميل *"
              value={customerName}
              onChangeText={setCustomerName}
              style={mdS.input}
              placeholderTextColor={COLORS.textMuted}
              textAlign={isRTL ? 'right' : 'left'}
            />

            {/* العملة */}
            <Text style={mdS.label}>العملة</Text>
            <View style={crS.currencyRow}>
              {['SAR', 'AED', 'KWD', 'USD'].map(c => (
                <TouchableOpacity
                  key={c}
                  style={[crS.currBtn, currency === c && crS.currActive]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[crS.currTxt, currency === c && crS.currActiveTxt]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* البنود */}
            <Text style={[mdS.label, { marginTop: 8 }]}>البنود</Text>
            {items.map((item, idx) => (
              <View key={idx} style={crS.itemBox}>
                <View style={[crS.itemHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                  <Text style={crS.itemNum}>بند {idx + 1}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => setItems(p => p.filter((_, i) => i !== idx))}>
                      <Text style={crS.removeBtn}>✕ حذف</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  placeholder="وصف الخدمة / المنتج *"
                  value={item.description}
                  onChangeText={v => updateItem(idx, 'description', v)}
                  style={mdS.input}
                  placeholderTextColor={COLORS.textMuted}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <View style={[crS.priceRow, isRTL && { flexDirection: 'row-reverse' }]}>
                  <TextInput
                    placeholder="الكمية"
                    value={item.quantity}
                    onChangeText={v => updateItem(idx, 'quantity', v)}
                    style={[mdS.input, { flex: 1, marginBottom: 0 }]}
                    keyboardType="number-pad"
                    placeholderTextColor={COLORS.textMuted}
                    textAlign="center"
                  />
                  <TextInput
                    placeholder="السعر *"
                    value={item.unitPrice}
                    onChangeText={v => updateItem(idx, 'unitPrice', v)}
                    style={[mdS.input, { flex: 2, marginBottom: 0 }]}
                    keyboardType="decimal-pad"
                    placeholderTextColor={COLORS.textMuted}
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                </View>
                {item.description && item.unitPrice ? (
                  <Text style={crS.itemSub}>
                    = {((parseInt(item.quantity)||0)*(parseFloat(item.unitPrice)||0)).toLocaleString()} {CURRENCY_SYM[currency] ?? currency}
                  </Text>
                ) : null}
              </View>
            ))}

            <TouchableOpacity style={crS.addBtn} onPress={() => setItems(p => [...p, emptyItem()])}>
              <Text style={crS.addBtnTxt}>+ إضافة بند</Text>
            </TouchableOpacity>

            {/* الضريبة */}
            <View style={[crS.taxRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={[mdS.label, { marginBottom: 0, flex: 1 }]}>ضريبة القيمة المضافة (%)</Text>
              <TextInput
                value={taxRate}
                onChangeText={setTaxRate}
                style={[mdS.input, { width: 75, marginBottom: 0, textAlign: 'center' }]}
                keyboardType="decimal-pad"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            {/* الملخص */}
            {subtotal > 0 && (
              <View style={crS.summaryBox}>
                {[
                  { label: 'المجموع الفرعي', val: subtotal.toFixed(2) },
                  { label: `ضريبة (${taxRate}%)`, val: taxAmt.toFixed(2) },
                ].map((r, i) => (
                  <View key={i} style={[crS.summRow, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Text style={crS.summLabel}>{r.label}</Text>
                    <Text style={crS.summVal}>{Number(r.val).toLocaleString()} {CURRENCY_SYM[currency]}</Text>
                  </View>
                ))}
                <View style={crS.summDivider} />
                <View style={[crS.summRow, isRTL && { flexDirection: 'row-reverse' }]}>
                  <Text style={[crS.summLabel, { fontWeight: '800', color: COLORS.textPrimary }]}>الإجمالي</Text>
                  <Text style={[crS.summVal, { fontWeight: '800', color: '#10B981', fontSize: 16 }]}>
                    {total.toLocaleString(undefined, { minimumFractionDigits: 2 })} {CURRENCY_SYM[currency]}
                  </Text>
                </View>
              </View>
            )}

            <View style={[mdS.actions, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={mdS.cancelBtn} onPress={() => { onClose(); reset() }}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mdS.submitBtn, loading && { opacity: 0.6 }]}
                onPress={handleSubmit} disabled={loading}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {loading ? 'جاري الإنشاء...' : 'إنشاء الفاتورة'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
const crS = StyleSheet.create({
  currencyRow:  { flexDirection: 'row', gap: 7, marginBottom: 10 },
  currBtn:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border },
  currActive:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  currTxt:      { fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },
  currActiveTxt:{ color: '#fff' },
  itemBox:      { backgroundColor: COLORS.surfaceBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 10, gap: 8 },
  itemHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemNum:      { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  removeBtn:    { fontSize: 12, color: COLORS.danger, fontWeight: '600' },
  priceRow:     { flexDirection: 'row', gap: 8 },
  itemSub:      { fontSize: 11, color: '#10B981', fontWeight: '600', textAlign: 'right' },
  addBtn:       { borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 12 },
  addBtnTxt:    { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  taxRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  summaryBox:   { backgroundColor: COLORS.deepBg, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  summRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summLabel:    { fontSize: 13, color: COLORS.textSecondary },
  summVal:      { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  summDivider:  { height: 1, backgroundColor: COLORS.border },
})

const mdS = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container: { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  head:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:     { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn:  { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeTxt:  { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  body:      { padding: 16, gap: 10 },
  desc:      { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, textAlign: 'right' },
  label:     { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'right' },
  input:     { backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14, marginBottom: 10 },
  actions:   { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surfaceBg },
  submitBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary },
})

// ─── Main Screen ──────────────────────────────────────────────

export default function InvoicesScreen() {
  const { t } = useTranslation()
  const tabBarHeight = useTabBarHeight()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [overdueSummary, setOverdueSummary] = useState<OverdueSummary | null>(null)
  const [selKpi, setSelKpi] = useState(0)

  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  const [einvoiceModal, setEinvoiceModal] = useState<Invoice | null>(null)
  const [einvoiceLoading, setEinvoiceLoading] = useState(false)

  const [reminderModal, setReminderModal] = useState<Invoice | null>(null)
  const [reminderLoading, setReminderLoading] = useState(false)

  // ─── Fetch ──────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [listRes, overdueRes] = await Promise.allSettled([
        invoicesApi.list(),
        invoicesApi.getOverdueSummary(),
      ])
      if (listRes.status === 'fulfilled') {
        const raw = listRes.value?.data ?? listRes.value?.invoices ?? []
        setInvoices(Array.isArray(raw) ? raw : [])
      }
      if (overdueRes.status === 'fulfilled') {
        setOverdueSummary(overdueRes.value?.data ?? null)
      }
    } catch (_e) {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── KPI Values ─────────────────────────────────
  const draftCount   = invoices.filter(i => i.status === 'DRAFT').length
  const sentCount    = invoices.filter(i => i.status === 'SENT').length
  const paidCount    = invoices.filter(i => i.status === 'PAID').length
  const overdueCount = invoices.filter(i => i.status === 'OVERDUE').length
  const totalPaid    = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.total, 0)

  const kpiData = [
    { label: 'مسودة',   value: String(draftCount),   accent: '#6B7280' },
    { label: 'مرسلة',   value: String(sentCount),    accent: '#6366F1' },
    { label: 'مدفوعة',  value: String(paidCount),    accent: '#10B981' },
    { label: 'متأخرة',  value: String(overdueCount), accent: '#EF4444' },
  ]

  // ─── Handlers ───────────────────────────────────
  const handleAction = async (
    inv: Invoice,
    action: 'send' | 'markPaid' | 'einvoice' | 'reminder' | 'detail'
  ) => {
    if (action === 'einvoice') { setEinvoiceModal(inv); return }
    if (action === 'reminder') { setReminderModal(inv); return }
    if (action === 'detail')   return

    try {
      if (action === 'send')     await invoicesApi.send(inv.id)
      if (action === 'markPaid') await invoicesApi.markPaid(inv.id)
      Alert.alert('', action === 'send' ? 'تم إرسال الفاتورة' : 'تم تسجيل الدفع')
      fetchData()
    } catch {
      Alert.alert('', 'حدث خطأ')
    }
  }

  const handleCreate = async (data: any) => {
    setCreating(true)
    try {
      await invoicesApi.create(data)
      setShowCreate(false)
      Alert.alert('', 'تم إنشاء الفاتورة بنجاح')
      fetchData()
    } catch (err: unknown) {
      Alert.alert('', err instanceof Error ? err.message : 'حدث خطأ')
    }
    setCreating(false)
  }

  const handleGenerateEInvoice = async (taxRate: number) => {
    if (!einvoiceModal) return
    setEinvoiceLoading(true)
    try {
      await invoicesApi.generateEInvoice(einvoiceModal.id, taxRate)
      Alert.alert('', 'تم إنشاء الفاتورة الإلكترونية')
      setEinvoiceModal(null)
      fetchData()
    } catch {
      Alert.alert('', 'حدث خطأ في إنشاء e-Invoice')
    }
    setEinvoiceLoading(false)
  }

  const handleSendReminder = async (triggerDay: number, channel: string) => {
    if (!reminderModal) return
    setReminderLoading(true)
    try {
      await invoicesApi.sendReminder(reminderModal.id, triggerDay, channel)
      Alert.alert('', 'تم إرسال التذكير')
      setReminderModal(null)
    } catch {
      Alert.alert('', 'حدث خطأ في إرسال التذكير')
    }
    setReminderLoading(false)
  }

  // ─── Render ─────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={sc.safe} edges={['top']}>
        <InnerHeader title={t('invoices.title') || 'الفواتير'} accentColor="#8B5CF6" />
        <View style={sc.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      </SafeAreaView>
    )
  }

  const renderHeader = () => (
    <>
      {/* KPI */}
      <View style={[sc.kpiRow, isRTL && sc.kpiRowRTL]}>
        {kpiData.slice(0, 2).map((k, i) => (
          <KpiCard key={i} label={k.label} value={k.value} accent={k.accent}
            selected={selKpi === i} onPress={() => setSelKpi(i)} />
        ))}
      </View>
      <View style={[sc.kpiRow, isRTL && sc.kpiRowRTL]}>
        {kpiData.slice(2).map((k, i) => (
          <KpiCard key={i+2} label={k.label} value={k.value} accent={k.accent}
            selected={selKpi === i+2} onPress={() => setSelKpi(i+2)} />
        ))}
      </View>

      {/* Overdue Banner */}
      <OverdueBanner summary={overdueSummary} />

      {/* e-Invoice Banner */}
      <View style={sc.eInvoiceBanner}>
        <Text style={sc.eInvoiceIcon}>📄</Text>
        <View style={{ flex: 1 }}>
          <Text style={sc.eInvoiceTitle}>الفاتورة الإلكترونية</Text>
          <Text style={sc.eInvoiceDesc}>إصدار فواتير إلكترونية متوافقة مع معايير ZATCA</Text>
        </View>
        <View style={sc.eInvoiceBadge}><Text style={sc.eInvoiceBadgeTxt}>متاح</Text></View>
      </View>

      {/* List Header */}
      <View style={[sc.listHeader, isRTL && sc.rowRTL]}>
        <Text style={sc.listTitle}>
          الفواتير{' '}
          <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>({invoices.length})</Text>
        </Text>
        <TouchableOpacity style={sc.createBtn} onPress={() => setShowCreate(true)}>
          <Text style={sc.createBtnTxt}>+ {t('invoices.create') || 'إنشاء'}</Text>
        </TouchableOpacity>
      </View>
    </>
  )

  const renderEmpty = () => (
    <View style={sc.empty}>
      <Text style={sc.emptyIcon}>🧾</Text>
      <Text style={sc.emptyTxt}>لا توجد فواتير بعد</Text>
      <TouchableOpacity style={[sc.createBtn, { marginTop: 8 }]} onPress={() => setShowCreate(true)}>
        <Text style={sc.createBtnTxt}>+ إنشاء فاتورة</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={sc.safe} edges={['top']}>
      <InnerHeader title={t('invoices.title') || 'الفواتير'} accentColor="#8B5CF6" />

      <FlatList
        data={invoices}
        keyExtractor={item => item.id}
        renderItem={({ item, index }: ListRenderItemInfo<Invoice>) => (
          <InvoiceCard
            inv={item}
            accent={CARD_ACCENTS[index % CARD_ACCENTS.length]}
            onAction={handleAction}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[sc.listContent, { paddingBottom: tabBarHeight }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }}
            tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
      />

      <CreateModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        loading={creating}
      />
      <EInvoiceModal
        visible={!!einvoiceModal}
        inv={einvoiceModal}
        onClose={() => setEinvoiceModal(null)}
        onGenerate={handleGenerateEInvoice}
        loading={einvoiceLoading}
      />
      <ReminderModal
        visible={!!reminderModal}
        inv={reminderModal}
        onClose={() => setReminderModal(null)}
        onSend={handleSendReminder}
        loading={reminderLoading}
      />
    </SafeAreaView>
  )
}

const sc = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.darkBg },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent:    { paddingTop: 4 },
  kpiRow:         { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10 },
  kpiRowRTL:      { flexDirection: 'row-reverse' },
  eInvoiceBanner: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginTop: 10, marginBottom: 4, padding: 13, backgroundColor: 'rgba(13,148,136,0.12)', borderRadius: 13, borderWidth: 1, borderColor: 'rgba(13,148,136,0.3)' },
  eInvoiceIcon:   { fontSize: 26 },
  eInvoiceTitle:  { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  eInvoiceDesc:   { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  eInvoiceBadge:  { backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  eInvoiceBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#10B981' },
  listHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  rowRTL:         { flexDirection: 'row-reverse' },
  listTitle:      { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right' },
  createBtn:      { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9 },
  createBtnTxt:   { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  empty:          { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon:      { fontSize: 40 },
  emptyTxt:       { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
})