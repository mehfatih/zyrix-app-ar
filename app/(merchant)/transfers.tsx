// app/(merchant)/transfers.tsx
import React, { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl,
  I18nManager, SafeAreaView, Alert, TextInput, Modal, ListRenderItemInfo,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { transfersApi } from '../../services/api'
import { useCurrency } from '../../hooks/useCurrency'
import { InnerHeader } from '../../components/InnerHeader';

const isRTL = I18nManager.isRTL

type TabKey = 'sent' | 'received'

interface Transfer {
  id: string
  transferId: string
  amount: number
  currency: string
  description: string | null
  status: string
  createdAt: string
  toMerchant?: { merchantId: string; name: string }
  fromMerchant?: { merchantId: string; name: string }
}

const CARD_BG = [
  { bg: 'rgba(26, 86, 219, 0.1)',   border: 'rgba(26, 86, 219, 0.3)' },
  { bg: 'rgba(139, 92, 246, 0.1)',  border: 'rgba(139, 92, 246, 0.3)' },
  { bg: 'rgba(13, 148, 136, 0.1)',  border: 'rgba(13, 148, 136, 0.3)' },
  { bg: 'rgba(245, 158, 11, 0.1)',  border: 'rgba(245, 158, 11, 0.3)' },
  { bg: 'rgba(99, 102, 241, 0.1)',  border: 'rgba(99, 102, 241, 0.3)' },
]

function TransferCard({ transfer, tab, index }: { transfer: Transfer; tab: TabKey; index: number }) {
  const colors = CARD_BG[index % CARD_BG.length]
  const isSent = tab === 'sent'
  const counterparty = isSent ? transfer.toMerchant : transfer.fromMerchant
  const amountColor = isSent ? COLORS.danger : COLORS.success
  const amountPrefix = isSent ? '-' : '+'
  const icon = isSent ? '↑' : '↓'

  return (
    <View style={[cd.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={[cd.topRow, isRTL && cd.topRowRTL]}>
        <View style={[cd.merchantGroup, isRTL && cd.merchantGroupRTL]}>
          <View style={[cd.iconBubble, { backgroundColor: isSent ? COLORS.dangerBg : COLORS.successBg }]}>
            <Text style={[cd.iconText, { color: amountColor }]}>{icon}</Text>
          </View>
          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={cd.merchantName}>{counterparty?.name ?? '—'}</Text>
            <Text style={cd.transferId}>{transfer.transferId}</Text>
          </View>
        </View>
        <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 4 }}>
          <Text style={[cd.amount, { color: amountColor }]}>
            {amountPrefix}{transfer.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
          </Text>
          <View style={[cd.badge, { backgroundColor: COLORS.successBg }]}>
            <Text style={[cd.badgeText, { color: COLORS.success }]}>✓ مكتمل</Text>
          </View>
        </View>
      </View>
      <View style={cd.divider} />
      <View style={[cd.bottomRow, isRTL && cd.bottomRowRTL]}>
        <View style={cd.metaItem}>
          <Text style={cd.metaLabel}>{isSent ? 'إلى' : 'من'}</Text>
          <Text style={cd.metaValue}>{counterparty?.merchantId ?? '—'}</Text>
        </View>
        {transfer.description ? (
          <View style={cd.metaItem}>
            <Text style={cd.metaLabel}>الوصف</Text>
            <Text style={cd.metaValue} numberOfLines={1}>{transfer.description}</Text>
          </View>
        ) : null}
        <Text style={cd.date}>{new Date(transfer.createdAt).toLocaleDateString('ar-SA')}</Text>
      </View>
    </View>
  )
}

export default function TransfersScreen() {
  const { t } = useTranslation()
  const { currency } = useCurrency('SAR')
  const [tab, setTab] = useState<TabKey>('sent')
  const [sent, setSent] = useState<Transfer[]>([])
  const [received, setReceived] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [toMerchantId, setToMerchantId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)

  const fetchData = async () => {
    try {
      const data = await transfersApi.list()
      setSent(data.sent.map((t: any) => ({ ...t, amount: parseFloat(t.amount) })))
      setReceived(data.received.map((t: any) => ({ ...t, amount: parseFloat(t.amount) })))
    } catch (err) {
      console.warn(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  React.useEffect(() => { fetchData() }, [])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const handleSend = async () => {
    if (!toMerchantId.trim()) { Alert.alert('خطأ', 'أدخل رقم التاجر المستلم'); return }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) { Alert.alert('خطأ', 'أدخل مبلغاً صحيحاً'); return }
    setSending(true)
    try {
      await transfersApi.create({ toMerchantId: toMerchantId.trim(), amount: parseFloat(amount), description: description.trim() || undefined })
      Alert.alert('✓', 'تم إرسال التحويل بنجاح')
      setShowModal(false)
      setToMerchantId(''); setAmount(''); setDescription('')
      fetchData()
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'حدث خطأ أثناء الإرسال')
    } finally {
      setSending(false)
    }
  }

  const displayed = tab === 'sent' ? sent : received
  const totalSent = sent.reduce((s, t) => s + t.amount, 0)
  const totalReceived = received.reduce((s, t) => s + t.amount, 0)

  const renderItem = ({ item, index }: ListRenderItemInfo<Transfer>) => (
    <TransferCard transfer={item} tab={tab} index={index} />
  )

  const renderHeader = () => (
    <>
      {/* Header */}
      <View style={st.pageHeader}>
        <View style={[st.headerBtns, isRTL && st.headerBtnsRTL]}>
          <TouchableOpacity style={st.newBtn} onPress={() => setShowModal(true)}>
            <Text style={st.newBtnText}>+ {t('transfers.send')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI */}
      <View style={[st.kpiRow, isRTL && st.kpiRowRTL]}>
        <View style={[st.kpiCard, { backgroundColor: 'rgba(220, 38, 38, 0.15)', borderColor: 'rgba(220, 38, 38, 0.3)' }]}>
          <Text style={st.kpiLabel}>إجمالي المرسل</Text>
          <Text style={[st.kpiValue, { color: COLORS.danger }]}>{totalSent.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س</Text>
        </View>
        <View style={[st.kpiCard, { backgroundColor: 'rgba(5, 150, 105, 0.15)', borderColor: 'rgba(5, 150, 105, 0.3)' }]}>
          <Text style={st.kpiLabel}>إجمالي المستلم</Text>
          <Text style={[st.kpiValue, { color: COLORS.success }]}>{totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س</Text>
        </View>
        <View style={[st.kpiCard, { backgroundColor: 'rgba(26, 86, 219, 0.15)', borderColor: 'rgba(26, 86, 219, 0.3)' }]}>
          <Text style={st.kpiLabel}>عدد التحويلات</Text>
          <Text style={[st.kpiValue, { color: COLORS.primaryLight }]}>{sent.length + received.length}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={st.tabsWrapper}>
        <View style={[st.tabsRow, isRTL && st.tabsRowRTL]}>
          <TouchableOpacity
            style={[st.tabBtn, tab === 'sent' && { backgroundColor: 'rgba(220, 38, 38, 0.2)', borderColor: COLORS.danger }]}
            onPress={() => setTab('sent')}
          >
            <Text style={[st.tabBtnText, tab === 'sent' && { color: COLORS.danger, fontWeight: '700' }]}>
              {t('transfers.sent_tab')} ({sent.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.tabBtn, tab === 'received' && { backgroundColor: 'rgba(5, 150, 105, 0.2)', borderColor: COLORS.success }]}
            onPress={() => setTab('received')}
          >
            <Text style={[st.tabBtnText, tab === 'received' && { color: COLORS.success, fontWeight: '700' }]}>
              {t('transfers.received_tab')} ({received.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  )

  const renderEmpty = () => (
    <View style={st.emptyContainer}>
      <Text style={st.emptyIcon}>↕</Text>
      <Text style={st.emptyText}>{t('transfers.no_transfers')}</Text>
    </View>
  )

  return (
    <SafeAreaView style={st.safeArea}>
      <InnerHeader title={t('refunds.title')} accentColor="#EF4444" />
      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        data={displayed}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={st.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Send Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={modal.overlay}>
          <View style={modal.container}>
            <View style={modal.header}>
              <Text style={modal.title}>{t('transfers.send')}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={modal.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={modal.body}>
              <Text style={modal.label}>{t('transfers.recipient_id')}</Text>
              <TextInput
                style={modal.input}
                value={toMerchantId}
                onChangeText={setToMerchantId}
                placeholder="ZRX-XXXXX"
                placeholderTextColor={COLORS.textMuted}
                textAlign={isRTL ? 'right' : 'left'}
                autoCapitalize="characters"
              />
              <Text style={modal.label}>المبلغ (ر.س)</Text>
              <TextInput
                style={modal.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
                textAlign={isRTL ? 'right' : 'left'}
              />
              <Text style={modal.label}>الوصف (اختياري)</Text>
              <TextInput
                style={modal.input}
                value={description}
                onChangeText={setDescription}
                placeholder="وصف التحويل..."
                placeholderTextColor={COLORS.textMuted}
                textAlign={isRTL ? 'right' : 'left'}
              />
              <TouchableOpacity
                style={[modal.sendBtn, sending && { opacity: 0.6 }]}
                onPress={handleSend}
                disabled={sending}
              >
                <Text style={modal.sendBtnText}>{sending ? '...' : t('transfers.send')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.darkBg },
  listContent: { paddingBottom: 40 },
  pageHeader: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, backgroundColor: 'rgba(26, 86, 219, 0.12)', borderBottomWidth: 1, borderBottomColor: 'rgba(26, 86, 219, 0.3)' },
  headerBtns: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  headerBtnsRTL: { flexDirection: 'row-reverse' },
  newBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  kpiRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  kpiRowRTL: { flexDirection: 'row-reverse' },
  kpiCard: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 10, gap: 4 },
  kpiLabel: { fontSize: 9, fontWeight: '600', color: COLORS.textMuted },
  kpiValue: { fontSize: 14, fontWeight: '800' },
  tabsWrapper: { backgroundColor: COLORS.cardBg, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, marginHorizontal: 12, marginTop: 10, borderRadius: 12 },
  tabsRow: { flexDirection: 'row', gap: 8 },
  tabsRowRTL: { flexDirection: 'row-reverse' },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  tabBtnText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon: { fontSize: 36, color: COLORS.textMuted },
  emptyText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '500' },
})

const cd = StyleSheet.create({
  container: { marginHorizontal: 16, marginTop: 10, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 },
  topRowRTL: { flexDirection: 'row-reverse' },
  merchantGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  merchantGroupRTL: { flexDirection: 'row-reverse' },
  iconBubble: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  iconText: { fontSize: 18, fontWeight: '700' },
  merchantName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  transferId: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace' },
  amount: { fontSize: 14, fontWeight: '800' },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  divider: { height: 1, backgroundColor: COLORS.border },
  bottomRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 10 },
  bottomRowRTL: { flexDirection: 'row-reverse' },
  metaItem: { flex: 1, gap: 1 },
  metaLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  metaValue: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  date: { fontSize: 10, color: COLORS.textMuted },
})

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container: { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn: { fontSize: 18, color: COLORS.textMuted, padding: 4 },
  body: { padding: 16, gap: 8 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginTop: 8 },
  input: { backgroundColor: COLORS.surfaceBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  sendBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
})