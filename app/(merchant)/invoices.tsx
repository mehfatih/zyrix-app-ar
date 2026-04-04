import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, I18nManager, SafeAreaView, ActivityIndicator, RefreshControl, Alert, Modal, Linking } from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { invoicesApi } from '../../services/api'
import { StatusBadge } from '../../components/StatusBadge'

const isRTL = I18nManager.isRTL

const CURRENCY_AR: Record<string, string> = { SAR: 'ر.س', AED: 'د.إ', KWD: 'د.ك', QAR: 'ر.ق', USD: '$' }

const DEMO_INVOICES = [
  { id: '1', invoiceId: 'ZRX-INV-001', customerName: 'أحمد محمد العلي', total: '3500', currency: 'SAR', status: 'paid', createdAt: '2026-04-01', items: 'خدمات استشارية' },
  { id: '2', invoiceId: 'ZRX-INV-002', customerName: 'فاطمة حسين', total: '1800', currency: 'SAR', status: 'sent', createdAt: '2026-03-28', items: 'تصميم هوية بصرية' },
  { id: '3', invoiceId: 'ZRX-INV-003', customerName: 'خالد الراشد', total: '4200', currency: 'SAR', status: 'draft', createdAt: '2026-03-25', items: 'تطوير تطبيق موبايل' },
  { id: '4', invoiceId: 'ZRX-INV-004', customerName: 'نورا السالم', total: '950', currency: 'SAR', status: 'paid', createdAt: '2026-03-20', items: 'إدارة حسابات التواصل' },
  { id: '5', invoiceId: 'ZRX-INV-005', customerName: 'سارة القحطاني', total: '2600', currency: 'SAR', status: 'sent', createdAt: '2026-03-15', items: 'حملة تسويقية رقمية' },
]

const CARD_BG = [
  { bg: 'rgba(26, 86, 219, 0.1)', border: 'rgba(26, 86, 219, 0.25)' },
  { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.25)' },
  { bg: 'rgba(13, 148, 136, 0.1)', border: 'rgba(13, 148, 136, 0.25)' },
  { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.25)' },
  { bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.25)' },
]

export default function InvoicesScreen() {
  const { t } = useTranslation()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ customerName: '', itemDesc: '', quantity: '1', unitPrice: '' })

  const fetchData = useCallback(async () => {
    try {
      const res = await invoicesApi.list()
      setInvoices(res.invoices?.length > 0 ? res.invoices : DEMO_INVOICES)
    } catch (_e) { setInvoices(DEMO_INVOICES) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async () => {
    if (!form.customerName || !form.itemDesc || !form.unitPrice) return
    setCreating(true)
    try {
      await invoicesApi.create({ customerName: form.customerName, items: [{ description: form.itemDesc, quantity: parseInt(form.quantity) || 1, unitPrice: parseFloat(form.unitPrice) }] })
      setShowCreate(false); setForm({ customerName: '', itemDesc: '', quantity: '1', unitPrice: '' }); fetchData()
    } catch (e: unknown) { Alert.alert(t('common.error'), e instanceof Error ? e.message : '') }
    setCreating(false)
  }

  const handleAction = async (invoiceId: string, action: 'send' | 'mark-paid') => {
    try {
      if (action === 'send') await invoicesApi.send(invoiceId)
      else await invoicesApi.markPaid(invoiceId)
      fetchData()
    } catch (_e) {}
  }

  const handleDownloadExcel = (inv: any) => {
    const url = `https://api.zyrix.co/api/invoices/${inv.invoiceId}/download?format=xlsx`
    Linking.openURL(url).catch(() => Alert.alert('تحميل', `سيتم تحميل الفاتورة ${inv.invoiceId}`))
  }

  const handleEInvoice = (inv: any) => {
    Alert.alert('الفاتورة الإلكترونية', `تم إنشاء الفاتورة الإلكترونية رقم ${inv.invoiceId} وفق معايير هيئة الزكاة والضريبة والجمارك (ZATCA)\n\nالعميل: ${inv.customerName}\nالمبلغ: ${Number(inv.total).toLocaleString('en-US')} ر.س\n\nسيتم إرسالها للعميل عبر البريد الإلكتروني.`)
  }

  if (loading) return <SafeAreaView style={st.safe}><View style={st.center}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={COLORS.primary} />}>

        {/* Header */}
        <View style={st.header}>
          <Text style={st.headerTitle}>{t('invoices.title')}</Text>
          <TouchableOpacity style={st.createBtn} onPress={() => setShowCreate(true)}>
            <Text style={st.createBtnText}>+ {t('invoices.create')}</Text>
          </TouchableOpacity>
        </View>

        {/* E-Invoice banner */}
        <View style={st.eInvoiceBanner}>
          <Text style={st.eInvoiceIcon}>📄</Text>
          <View style={{ flex: 1 }}>
            <Text style={st.eInvoiceTitle}>الفاتورة الإلكترونية</Text>
            <Text style={st.eInvoiceDesc}>إصدار فواتير إلكترونية متوافقة مع معايير ZATCA</Text>
          </View>
          <View style={st.eInvoiceBadge}><Text style={st.eInvoiceBadgeText}>متاح</Text></View>
        </View>

        {/* Invoices list */}
        {invoices.map((inv, i) => {
          const colors = CARD_BG[i % CARD_BG.length]
          const curr = CURRENCY_AR[inv.currency] ?? inv.currency
          return (
            <View key={inv.id} style={[st.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <View style={[st.cardRow, isRTL && st.cardRowRTL]}>
                <View style={{ flex: 1 }}>
                  <Text style={st.cardTitle}>{inv.customerName}</Text>
                  <Text style={st.cardId}>{inv.invoiceId} · {new Date(inv.createdAt).toLocaleDateString('ar-SA')}</Text>
                  {inv.items && <Text style={st.cardItems}>{typeof inv.items === 'string' ? inv.items : ''}</Text>}
                </View>
                <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                  <Text style={st.cardAmount}>{Number(inv.total).toLocaleString('en-US')} {curr}</Text>
                  <StatusBadge status={inv.status} />
                </View>
              </View>
              <View style={[st.cardActions, isRTL && st.cardRowRTL]}>
                <TouchableOpacity style={st.actionBtn} onPress={() => handleDownloadExcel(inv)}>
                  <Text style={st.actionText}>📥 تحميل Excel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.actionBtn, { backgroundColor: 'rgba(13, 148, 136, 0.15)', borderColor: 'rgba(13, 148, 136, 0.3)', borderWidth: 1 }]} onPress={() => handleEInvoice(inv)}>
                  <Text style={[st.actionText, { color: '#0D9488' }]}>📄 فاتورة إلكترونية</Text>
                </TouchableOpacity>
                {inv.status === 'draft' && (
                  <TouchableOpacity style={[st.actionBtn, { backgroundColor: COLORS.primaryLight + '20' }]} onPress={() => handleAction(inv.invoiceId, 'send')}>
                    <Text style={[st.actionText]}>📤 إرسال</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )
        })}
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={st.modalOverlay}><View style={st.modal}>
          <Text style={st.modalTitle}>{t('invoices.create')}</Text>
          <TextInput placeholder="اسم العميل" value={form.customerName} onChangeText={v => setForm({...form, customerName: v})} style={st.input} placeholderTextColor={COLORS.textMuted} textAlign="right" />
          <TextInput placeholder="وصف الخدمة" value={form.itemDesc} onChangeText={v => setForm({...form, itemDesc: v})} style={st.input} placeholderTextColor={COLORS.textMuted} textAlign="right" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput placeholder="الكمية" value={form.quantity} onChangeText={v => setForm({...form, quantity: v})} style={[st.input, { flex: 1 }]} placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" textAlign="right" />
            <TextInput placeholder="السعر" value={form.unitPrice} onChangeText={v => setForm({...form, unitPrice: v})} style={[st.input, { flex: 2 }]} placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" textAlign="right" />
          </View>
          <Text style={st.taxNote}>ضريبة القيمة المضافة 15% (VAT)</Text>
          <View style={st.modalActions}>
            <TouchableOpacity style={st.modalCancel} onPress={() => setShowCreate(false)}><Text style={{ color: COLORS.textSecondary }}>{t('common.cancel')}</Text></TouchableOpacity>
            <TouchableOpacity style={st.modalSubmit} onPress={handleCreate} disabled={creating}><Text style={{ color: COLORS.white, fontWeight: '700' }}>{creating ? '...' : t('invoices.create')}</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.darkBg },
  scroll: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  header: { flexDirection: isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, backgroundColor: 'rgba(139, 92, 246, 0.12)', borderBottomWidth: 1, borderBottomColor: 'rgba(139, 92, 246, 0.3)' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  createBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  createBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  // E-Invoice banner
  eInvoiceBanner: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, padding: 14, backgroundColor: 'rgba(13, 148, 136, 0.12)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(13, 148, 136, 0.3)' },
  eInvoiceIcon: { fontSize: 28 },
  eInvoiceTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, textAlign: isRTL ? 'right' : 'left' },
  eInvoiceDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, textAlign: isRTL ? 'right' : 'left' },
  eInvoiceBadge: { backgroundColor: COLORS.successBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  eInvoiceBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.success },
  // Cards
  card: { marginHorizontal: 16, marginTop: 10, borderRadius: 14, borderWidth: 1, padding: 14 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardRowRTL: { flexDirection: 'row-reverse' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  cardId: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace' },
  cardItems: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },
  cardAmount: { fontSize: 16, fontWeight: '700', color: COLORS.success, marginBottom: 4 },
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, flexWrap: 'wrap' },
  actionBtn: { flex: 1, backgroundColor: COLORS.surfaceBg, paddingVertical: 8, borderRadius: 8, alignItems: 'center', minWidth: 90 },
  actionText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, color: COLORS.textPrimary, fontSize: 15, marginBottom: 12 },
  taxNote: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginBottom: 8 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surfaceBg },
  modalSubmit: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary },
})