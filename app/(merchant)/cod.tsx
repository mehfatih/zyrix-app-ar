// app/(merchant)/cod.tsx
import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl,
  I18nManager, SafeAreaView, Alert, Modal, TextInput, ListRenderItemInfo,
} from 'react-native'
import { useRouter } from 'expo-router'
import { InnerHeader } from '../../components/InnerHeader'
import { SmartEmptyState, EmbeddedHelp } from '../../components/SmartEmptyState'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { codApi } from '../../services/api'

const isRTL = I18nManager.isRTL

interface CODOrder {
  id: string
  orderId: string
  customerName: string
  amount: number
  currency: string
  address: string
  phone: string | null
  description: string | null
  status: string
  collectedAmount: number
  collectedAt: string | null
  notes: string | null
  createdAt: string
}

const STATUS_AR: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  PENDING:          { label: 'قيد الانتظار', bg: 'rgba(245,158,11,0.15)',  text: COLORS.warning,      icon: '⏳' },
  OUT_FOR_DELIVERY: { label: 'في الطريق',    bg: 'rgba(26,86,219,0.15)',   text: COLORS.primaryLight, icon: '🚚' },
  COLLECTED:        { label: 'تم التحصيل',   bg: 'rgba(5,150,105,0.15)',   text: COLORS.success,      icon: '✓'  },
  FAILED:           { label: 'فشل التسليم',  bg: 'rgba(220,38,38,0.15)',   text: COLORS.danger,       icon: '✕'  },
  RETURNED:         { label: 'مُرجَع',        bg: 'rgba(139,92,246,0.15)', text: '#8B5CF6',           icon: '↩'  },
}

const CURRENCY_AR: Record<string, string> = {
  SAR: 'ر.س', AED: 'د.إ', KWD: 'د.ك', QAR: 'ر.ق', IQD: 'د.ع', USD: '$',
}

const CURRENCIES = ['SAR', 'AED', 'KWD', 'QAR', 'IQD', 'USD']

const CARD_BG = [
  { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)'  },
  { bg: 'rgba(26,86,219,0.1)',   border: 'rgba(26,86,219,0.3)'   },
  { bg: 'rgba(5,150,105,0.1)',   border: 'rgba(5,150,105,0.3)'   },
  { bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.3)'  },
]

function CODCard({ order, index, onCollect }: {
  order: CODOrder; index: number; onCollect: (id: string, amount: number) => void
}) {
  const colors    = CARD_BG[index % CARD_BG.length]
  const statusCfg = STATUS_AR[order.status] || STATUS_AR.PENDING
  const curr      = CURRENCY_AR[order.currency] ?? order.currency

  return (
    <View style={[cd.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={[cd.topRow, isRTL && cd.topRowRTL]}>
        <View style={[cd.customerGroup, isRTL && cd.customerGroupRTL]}>
          <View style={cd.iconBubble}>
            <Text style={cd.iconText}>{statusCfg.icon}</Text>
          </View>
          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1 }}>
            <Text style={cd.customerName}>{order.customerName}</Text>
            <Text style={cd.orderId}>{order.orderId}</Text>
          </View>
        </View>
        <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 4 }}>
          <Text style={cd.amount}>{order.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {curr}</Text>
          <View style={[cd.badge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[cd.badgeText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
          </View>
        </View>
      </View>

      <View style={cd.divider} />

      <View style={[cd.middleRow, isRTL && cd.middleRowRTL]}>
        <Text style={cd.address} numberOfLines={1}>📍 {order.address}</Text>
        {order.phone && <Text style={cd.phone}>📞 {order.phone}</Text>}
      </View>

      {order.status === 'PENDING' || order.status === 'OUT_FOR_DELIVERY' ? (
        <TouchableOpacity style={cd.collectBtn} onPress={() => onCollect(order.id, order.amount)}>
          <Text style={cd.collectBtnText}>✓ تأكيد استلام النقود</Text>
        </TouchableOpacity>
      ) : order.status === 'COLLECTED' ? (
        <View style={cd.collectedInfo}>
          <Text style={cd.collectedText}>
            ✓ تم تحصيل {order.collectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {curr}
          </Text>
          {order.collectedAt && (
            <Text style={cd.collectedDate}>{new Date(order.collectedAt).toLocaleDateString('ar-SA')}</Text>
          )}
        </View>
      ) : null}

      <Text style={[cd.date, isRTL && { textAlign: 'right' }]}>
        {new Date(order.createdAt).toLocaleDateString('ar-SA')}
      </Text>
    </View>
  )
}

export default function CODScreen() {
  const { t }        = useTranslation()
  const router       = useRouter()
  const tabBarHeight = useTabBarHeight()
  const [orders, setOrders]     = useState<CODOrder[]>([])
  const [summary, setSummary]   = useState({ totalOrders: 0, collectedOrders: 0, pendingOrders: 0, totalCollected: 0, totalPending: 0 })
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const [showCreate, setShowCreate]   = useState(false)
  const [showCollect, setShowCollect] = useState<{ id: string; amount: number } | null>(null)
  const [creating, setCreating]       = useState(false)
  const [collecting, setCollecting]   = useState(false)
  const [collectNotes, setCollectNotes] = useState('')
  const [form, setForm] = useState({ customerName: '', amount: '', address: '', phone: '', currency: 'SAR', description: '' })

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, summaryRes] = await Promise.all([codApi.list(), codApi.summary()])
      setOrders(ordersRes.data || [])
      setSummary(summaryRes.data || summary)
    } catch (err) { console.warn(err) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  React.useEffect(() => { fetchData() }, [])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const handleCreate = async () => {
    if (!form.customerName.trim() || !form.amount.trim() || !form.address.trim()) {
      Alert.alert('خطأ', 'يرجى ملء الحقول المطلوبة')
      return
    }
    setCreating(true)
    try {
      await codApi.create({
        customerName: form.customerName, amount: parseFloat(form.amount),
        address: form.address, phone: form.phone || null,
        currency: form.currency, description: form.description || null,
      })
      setShowCreate(false)
      setForm({ customerName: '', amount: '', address: '', phone: '', currency: 'SAR', description: '' })
      fetchData()
    } catch (err) { Alert.alert('خطأ', 'فشل إنشاء الطلب') }
    finally { setCreating(false) }
  }

  const handleCollect = async () => {
    if (!showCollect) return
    setCollecting(true)
    try {
      await codApi.collect(showCollect.id, { notes: collectNotes || null })
      setShowCollect(null)
      setCollectNotes('')
      fetchData()
    } catch (err) { Alert.alert('خطأ', 'فشل تأكيد التحصيل') }
    finally { setCollecting(false) }
  }

  const renderHeader = () => (
    <>
      <View style={[st.pageHeader, isRTL && { alignItems: 'flex-end' }]}>
        <View style={[st.headerRow, isRTL && st.headerRowRTL]}>
          <View style={{ flex: 1 }}>
            <Text style={[st.pageTitle, isRTL && { textAlign: 'right' }]}>كاش عند الاستلام</Text>
            <Text style={[st.pageSubtitle, isRTL && { textAlign: 'right' }]}>COD — Cash on Delivery</Text>
          </View>
          <TouchableOpacity style={st.newBtn} onPress={() => setShowCreate(true)}>
            <Text style={st.newBtnText}>+ طلب جديد</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[st.kpiRow, isRTL && st.kpiRowRTL]}>
        <View style={[st.kpiCard, { backgroundColor: 'rgba(5,150,105,0.12)', borderColor: 'rgba(5,150,105,0.3)' }]}>
          <Text style={st.kpiLabel}>إجمالي المحصَّل</Text>
          <Text style={[st.kpiValue, { color: COLORS.success }]}>
            {summary.totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
          </Text>
        </View>
        <View style={[st.kpiCard, { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' }]}>
          <Text style={st.kpiLabel}>قيد الانتظار</Text>
          <Text style={[st.kpiValue, { color: COLORS.warning }]}>
            {summary.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
          </Text>
        </View>
        <View style={[st.kpiCard, { backgroundColor: 'rgba(26,86,219,0.12)', borderColor: 'rgba(26,86,219,0.3)' }]}>
          <Text style={st.kpiLabel}>الطلبات</Text>
          <Text style={[st.kpiValue, { color: COLORS.primaryLight }]}>{summary.totalOrders}</Text>
        </View>
      </View>

      <View style={st.infoBox}>
        <Text style={[st.infoText, isRTL && { textAlign: 'right' }]}>
          💵 ميزة حصرية — تتبع طلبات الكاش عند الاستلام رقمياً. مهمة جداً للسوق العراقي والخليجي.
        </Text>
      </View>
    </>
  )

  const renderEmpty = () => (
    <SmartEmptyState type="cod" />
    </View>
  )

  return (
    <SafeAreaView style={st.safeArea}>
      <InnerHeader title="كاش COD" accentColor="#F59E0B" />
      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }: ListRenderItemInfo<CODOrder>) => (
          <CODCard order={item} index={index} onCollect={(id, amt) => setShowCollect({ id, amount: amt })} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[st.listContent, { paddingBottom: tabBarHeight }]}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={modal.overlay}>
          <View style={modal.container}>
            <View style={modal.header}>
              <Text style={modal.title}>طلب COD جديد</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Text style={modal.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={modal.body}>
              <TextInput style={modal.input} value={form.customerName} onChangeText={v => setForm({...form, customerName: v})}
                placeholder="اسم العميل *" placeholderTextColor={COLORS.textMuted} textAlign={isRTL ? 'right' : 'left'} />
              <TextInput style={modal.input} value={form.amount} onChangeText={v => setForm({...form, amount: v})}
                placeholder="المبلغ *" placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" textAlign={isRTL ? 'right' : 'left'} />
              <Text style={[modal.label, isRTL && { textAlign: 'right' }]}>العملة</Text>
              <View style={[modal.currencyRow, isRTL && { flexDirection: 'row-reverse' }]}>
                {CURRENCIES.map(c => (
                  <TouchableOpacity key={c} style={[modal.currencyBtn, form.currency === c && modal.currencyBtnActive]} onPress={() => setForm({...form, currency: c})}>
                    <Text style={[modal.currencyText, form.currency === c && modal.currencyTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={modal.input} value={form.address} onChangeText={v => setForm({...form, address: v})}
                placeholder="العنوان *" placeholderTextColor={COLORS.textMuted} textAlign={isRTL ? 'right' : 'left'} />
              <TextInput style={modal.input} value={form.phone} onChangeText={v => setForm({...form, phone: v})}
                placeholder="رقم الهاتف (اختياري)" placeholderTextColor={COLORS.textMuted} keyboardType="phone-pad" textAlign={isRTL ? 'right' : 'left'} />
              <TextInput style={modal.input} value={form.description} onChangeText={v => setForm({...form, description: v})}
                placeholder="وصف الطلب (اختياري)" placeholderTextColor={COLORS.textMuted} textAlign={isRTL ? 'right' : 'left'} />
              <TouchableOpacity style={[modal.createBtn, creating && { opacity: 0.6 }]} onPress={handleCreate} disabled={creating}>
                <Text style={modal.createBtnText}>{creating ? '...' : 'إنشاء الطلب'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Collect Modal */}
      <Modal visible={!!showCollect} transparent animationType="slide" onRequestClose={() => setShowCollect(null)}>
        <View style={modal.overlay}>
          <View style={modal.container}>
            <View style={modal.header}>
              <Text style={modal.title}>تأكيد استلام النقود</Text>
              <TouchableOpacity onPress={() => setShowCollect(null)}>
                <Text style={modal.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={modal.body}>
              {showCollect && (
                <View style={modal.collectAmountBox}>
                  <Text style={modal.collectAmountLabel}>المبلغ المتوقع</Text>
                  <Text style={modal.collectAmountValue}>{showCollect.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س</Text>
                </View>
              )}
              <TextInput style={modal.input} value={collectNotes} onChangeText={setCollectNotes}
                placeholder="ملاحظات (اختياري)" placeholderTextColor={COLORS.textMuted} textAlign={isRTL ? 'right' : 'left'} />
              <TouchableOpacity style={[modal.collectBtn, collecting && { opacity: 0.6 }]} onPress={handleCollect} disabled={collecting}>
                <Text style={modal.collectBtnText}>{collecting ? '...' : '✓ تأكيد الاستلام'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  safeArea:        { flex: 1, backgroundColor: COLORS.darkBg },
  listContent:     { },
  pageHeader:      { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: 'rgba(245,158,11,0.12)', borderBottomWidth: 1, borderBottomColor: 'rgba(245,158,11,0.3)' },
  headerRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRowRTL:    { flexDirection: 'row-reverse' },
  pageTitle:       { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  pageSubtitle:    { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  newBtn:          { backgroundColor: COLORS.warning, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnText:      { fontSize: 13, fontWeight: '700', color: COLORS.white },
  kpiRow:          { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  kpiRowRTL:       { flexDirection: 'row-reverse' },
  kpiCard:         { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 10, gap: 4 },
  kpiLabel:        { fontSize: 9, fontWeight: '600', color: COLORS.textMuted },
  kpiValue:        { fontSize: 14, fontWeight: '800' },
  infoBox:         { marginHorizontal: 12, marginBottom: 8, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', padding: 12 },
  infoText:        { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  emptyContainer:  { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon:       { fontSize: 48 },
  emptyText:       { fontSize: 15, color: COLORS.textMuted, fontWeight: '500' },
  emptyBtn:        { backgroundColor: COLORS.warning, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText:    { color: COLORS.white, fontWeight: '700', fontSize: 14 },
})

const cd = StyleSheet.create({
  container:        { marginHorizontal: 16, marginTop: 10, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  topRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  topRowRTL:        { flexDirection: 'row-reverse' },
  customerGroup:    { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  customerGroupRTL: { flexDirection: 'row-reverse' },
  iconBubble:       { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  iconText:         { fontSize: 18 },
  customerName:     { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  orderId:          { fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace' },
  amount:           { fontSize: 16, fontWeight: '800', color: COLORS.warning },
  badge:            { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:        { fontSize: 11, fontWeight: '700' },
  divider:          { height: 1, backgroundColor: COLORS.border },
  middleRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 12, flexWrap: 'wrap' },
  middleRowRTL:     { flexDirection: 'row-reverse' },
  address:          { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  phone:            { fontSize: 12, color: COLORS.textSecondary },
  collectBtn:       { backgroundColor: COLORS.success, marginHorizontal: 14, marginBottom: 10, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  collectBtnText:   { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  collectedInfo:    { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 8 },
  collectedText:    { fontSize: 13, color: COLORS.success, fontWeight: '600' },
  collectedDate:    { fontSize: 11, color: COLORS.textMuted },
  date:             { fontSize: 10, color: COLORS.textMuted, paddingHorizontal: 14, paddingBottom: 8 },
})

const modal = StyleSheet.create({
  overlay:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container:          { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:              { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn:           { fontSize: 18, color: COLORS.textMuted, padding: 4 },
  body:               { padding: 16, gap: 8 },
  label:              { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginTop: 4 },
  input:              { backgroundColor: COLORS.surfaceBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  currencyRow:        { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  currencyBtn:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceBg },
  currencyBtnActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  currencyText:       { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  currencyTextActive: { color: COLORS.white },
  createBtn:          { backgroundColor: COLORS.warning, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  createBtnText:      { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  collectAmountBox:   { backgroundColor: 'rgba(5,150,105,0.15)', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 },
  collectAmountLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  collectAmountValue: { fontSize: 24, fontWeight: '800', color: COLORS.success },
  collectBtn:         { backgroundColor: COLORS.success, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  collectBtnText:     { color: COLORS.white, fontSize: 15, fontWeight: '700' },
})