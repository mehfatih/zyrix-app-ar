// app/(merchant)/webhooks.tsx
import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl,
  I18nManager, SafeAreaView, Alert, Modal, TextInput, ScrollView,
  ListRenderItemInfo,
} from 'react-native'
import { useRouter } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { webhooksApi } from '../../services/api'

const isRTL = I18nManager.isRTL

interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  isActive: boolean
  lastTriggeredAt: string | null
  failureCount: number
  createdAt: string
}

const AVAILABLE_EVENTS = [
  { key: 'payment.success',   label: 'دفعة ناجحة' },
  { key: 'payment.failed',    label: 'دفعة فاشلة' },
  { key: 'refund.created',    label: 'استرداد جديد' },
  { key: 'refund.completed',  label: 'استرداد مكتمل' },
  { key: 'dispute.created',   label: 'نزاع جديد' },
  { key: 'dispute.resolved',  label: 'نزاع محلول' },
  { key: 'settlement.completed', label: 'تسوية مكتملة' },
]

const CARD_BG = [
  { bg: 'rgba(26, 86, 219, 0.1)',   border: 'rgba(26, 86, 219, 0.3)' },
  { bg: 'rgba(13, 148, 136, 0.1)',  border: 'rgba(13, 148, 136, 0.3)' },
  { bg: 'rgba(139, 92, 246, 0.1)',  border: 'rgba(139, 92, 246, 0.3)' },
  { bg: 'rgba(245, 158, 11, 0.1)',  border: 'rgba(245, 158, 11, 0.3)' },
]

function WebhookCard({ webhook, index, onDelete, onTest }: {
  webhook: Webhook; index: number;
  onDelete: (id: string, name: string) => void;
  onTest: (id: string) => void;
}) {
  const colors = CARD_BG[index % CARD_BG.length]
  const hasFailures = webhook.failureCount > 0

  return (
    <View style={[cd.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={[cd.topRow, isRTL && cd.topRowRTL]}>
        <View style={[cd.nameGroup, isRTL && cd.nameGroupRTL]}>
          <View style={cd.iconBubble}>
            <Text style={cd.iconText}>🔗</Text>
          </View>
          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1 }}>
            <Text style={cd.webhookName}>{webhook.name}</Text>
            <Text style={cd.webhookUrl} numberOfLines={1}>{webhook.url}</Text>
          </View>
        </View>
        <View style={[cd.statusBadge, { backgroundColor: webhook.isActive && !hasFailures ? COLORS.successBg : COLORS.dangerBg }]}>
          <Text style={[cd.statusText, { color: webhook.isActive && !hasFailures ? COLORS.success : COLORS.danger }]}>
            {hasFailures ? `⚠ ${webhook.failureCount} خطأ` : webhook.isActive ? '● نشط' : '● معطل'}
          </Text>
        </View>
      </View>

      {/* Events */}
      <View style={[cd.eventsRow, isRTL && cd.eventsRowRTL]}>
        {webhook.events.slice(0, 3).map((e) => (
          <View key={e} style={cd.eventChip}>
            <Text style={cd.eventChipText}>{e}</Text>
          </View>
        ))}
        {webhook.events.length > 3 && (
          <View style={cd.eventChip}>
            <Text style={cd.eventChipText}>+{webhook.events.length - 3}</Text>
          </View>
        )}
      </View>

      <View style={cd.divider} />

      <View style={[cd.bottomRow, isRTL && cd.bottomRowRTL]}>
        <View style={cd.metaItem}>
          <Text style={cd.metaLabel}>آخر تشغيل</Text>
          <Text style={cd.metaValue}>
            {webhook.lastTriggeredAt ? new Date(webhook.lastTriggeredAt).toLocaleDateString('ar-SA') : 'لم يُشغَّل'}
          </Text>
        </View>
        <View style={[cd.actions, isRTL && cd.actionsRTL]}>
          <TouchableOpacity style={cd.testBtn} onPress={() => onTest(webhook.id)}>
            <Text style={cd.testBtnText}>اختبار</Text>
          </TouchableOpacity>
          <TouchableOpacity style={cd.deleteBtn} onPress={() => onDelete(webhook.id, webhook.name)}>
            <Text style={cd.deleteBtnText}>حذف</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export default function WebhooksScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await webhooksApi.list()
      setWebhooks(res.data || [])
    } catch (err) {
      console.warn(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => { fetchData() }, [])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const toggleEvent = (key: string) => {
    setSelectedEvents(prev =>
      prev.includes(key) ? prev.filter(e => e !== key) : [...prev, key]
    )
  }

  const handleCreate = async () => {
    if (!newName.trim()) { Alert.alert('خطأ', 'أدخل اسماً للـ webhook'); return }
    if (!newUrl.trim() || !newUrl.startsWith('http')) { Alert.alert('خطأ', 'أدخل URL صحيح يبدأ بـ https://'); return }
    if (selectedEvents.length === 0) { Alert.alert('خطأ', 'اختر حدثاً واحداً على الأقل'); return }

    setCreating(true)
    try {
      await webhooksApi.create({ url: newUrl.trim(), events: selectedEvents, name: newName.trim() })
      Alert.alert('✓', 'تم إنشاء الـ webhook بنجاح')
      setShowModal(false)
      setNewName(''); setNewUrl(''); setSelectedEvents([])
      fetchData()
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'حدث خطأ')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = (id: string, name: string) => {
    Alert.alert('حذف Webhook', `هل أنت متأكد من حذف "${name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: async () => {
          try {
            await webhooksApi.delete(id)
            fetchData()
          } catch (err: any) {
            Alert.alert('خطأ', err.message || 'حدث خطأ')
          }
        }
      }
    ])
  }

  const handleTest = async (id: string) => {
    try {
      const res = await webhooksApi.test(id)
      Alert.alert(
        res.data.status === 'delivered' ? '✓ تم الإرسال' : '⚠ فشل الإرسال',
        res.data.message
      )
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'حدث خطأ في الاختبار')
    }
  }

  const renderItem = ({ item, index }: ListRenderItemInfo<Webhook>) => (
    <WebhookCard webhook={item} index={index} onDelete={handleDelete} onTest={handleTest} />
  )

  const renderHeader = () => (
    <>
      <View style={st.pageHeader}>
        <View style={[st.headerRow, isRTL && st.headerRowRTL]}>
          <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
            <Text style={[st.backBtnText, isRTL && { transform: [{ scaleX: -1 }] }]}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[st.pageTitle, isRTL && st.textRight]}>Webhooks</Text>
            <Text style={[st.pageSubtitle, isRTL && st.textRight]}>إشعارات فورية عند كل حدث</Text>
          </View>
          <TouchableOpacity style={st.newBtn} onPress={() => setShowModal(true)}>
            <Text style={st.newBtnText}>+ جديد</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI */}
      <View style={[st.kpiRow, isRTL && st.kpiRowRTL]}>
        <View style={[st.kpiCard, { backgroundColor: 'rgba(26, 86, 219, 0.15)', borderColor: 'rgba(26, 86, 219, 0.3)' }]}>
          <Text style={st.kpiLabel}>إجمالي</Text>
          <Text style={[st.kpiValue, { color: COLORS.primaryLight }]}>{webhooks.length}</Text>
        </View>
        <View style={[st.kpiCard, { backgroundColor: 'rgba(5, 150, 105, 0.15)', borderColor: 'rgba(5, 150, 105, 0.3)' }]}>
          <Text style={st.kpiLabel}>نشط</Text>
          <Text style={[st.kpiValue, { color: COLORS.success }]}>{webhooks.filter(w => w.isActive && w.failureCount === 0).length}</Text>
        </View>
        <View style={[st.kpiCard, { backgroundColor: 'rgba(220, 38, 38, 0.15)', borderColor: 'rgba(220, 38, 38, 0.3)' }]}>
          <Text style={st.kpiLabel}>أخطاء</Text>
          <Text style={[st.kpiValue, { color: COLORS.danger }]}>{webhooks.filter(w => w.failureCount > 0).length}</Text>
        </View>
      </View>

      <View style={st.infoBox}>
        <Text style={[st.infoText, isRTL && st.textRight]}>
          🔔 Webhooks تُرسل HTTP POST لـ URL المحدد عند كل حدث. استخدم HTTPS دائماً.
        </Text>
      </View>
    </>
  )

  const renderEmpty = () => (
    <View style={st.emptyContainer}>
      <Text style={st.emptyIcon}>🔗</Text>
      <Text style={st.emptyText}>لا توجد Webhooks بعد</Text>
      <TouchableOpacity style={st.emptyBtn} onPress={() => setShowModal(true)}>
        <Text style={st.emptyBtnText}>+ إنشاء Webhook جديد</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={st.safeArea}>
      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        data={webhooks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={loading ? null : renderEmpty}
        contentContainerStyle={st.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={modal.overlay}>
          <View style={modal.container}>
            <View style={modal.header}>
              <Text style={modal.title}>Webhook جديد</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={modal.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={modal.scroll}>
              <View style={modal.body}>
                <Text style={modal.label}>الاسم</Text>
                <TextInput
                  style={modal.input}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="مثال: موقعي، نظام ERP..."
                  placeholderTextColor={COLORS.textMuted}
                  textAlign={isRTL ? 'right' : 'left'}
                />

                <Text style={modal.label}>URL الاستقبال</Text>
                <TextInput
                  style={modal.input}
                  value={newUrl}
                  onChangeText={setNewUrl}
                  placeholder="https://yoursite.com/webhook"
                  placeholderTextColor={COLORS.textMuted}
                  textAlign="left"
                  autoCapitalize="none"
                  keyboardType="url"
                />

                <Text style={modal.label}>الأحداث ({selectedEvents.length} محدد)</Text>
                <View style={modal.eventsGrid}>
                  {AVAILABLE_EVENTS.map((event) => {
                    const isSelected = selectedEvents.includes(event.key)
                    return (
                      <TouchableOpacity
                        key={event.key}
                        style={[modal.eventChip, isSelected && modal.eventChipSelected]}
                        onPress={() => toggleEvent(event.key)}
                      >
                        <Text style={[modal.eventChipText, isSelected && modal.eventChipTextSelected]}>
                          {isSelected ? '✓ ' : ''}{event.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                <TouchableOpacity
                  style={[modal.createBtn, creating && { opacity: 0.6 }]}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  <Text style={modal.createBtnText}>{creating ? '...' : 'إنشاء Webhook'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.darkBg },
  listContent: { paddingBottom: 40 },
  pageHeader: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: 'rgba(26, 86, 219, 0.12)', borderBottomWidth: 1, borderBottomColor: 'rgba(26, 86, 219, 0.3)' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRowRTL: { flexDirection: 'row-reverse' },
  backBtn: { padding: 4 },
  backBtnText: { fontSize: 28, color: COLORS.textSecondary, lineHeight: 32 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  pageSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  textRight: { textAlign: 'right' },
  newBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  kpiRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  kpiRowRTL: { flexDirection: 'row-reverse' },
  kpiCard: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 10, gap: 4 },
  kpiLabel: { fontSize: 9, fontWeight: '600', color: COLORS.textMuted },
  kpiValue: { fontSize: 18, fontWeight: '800' },
  infoBox: { marginHorizontal: 12, marginBottom: 8, backgroundColor: 'rgba(13, 148, 136, 0.1)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(13, 148, 136, 0.3)', padding: 12 },
  infoText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '500' },
  emptyBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
})

const cd = StyleSheet.create({
  container: { marginHorizontal: 16, marginTop: 10, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  topRowRTL: { flexDirection: 'row-reverse' },
  nameGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 },
  nameGroupRTL: { flexDirection: 'row-reverse', marginRight: 0, marginLeft: 8 },
  iconBubble: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  iconText: { fontSize: 18 },
  webhookName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  webhookUrl: { fontSize: 11, color: COLORS.textMuted },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  eventsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingBottom: 8, gap: 4 },
  eventsRowRTL: { flexDirection: 'row-reverse' },
  eventChip: { backgroundColor: COLORS.surfaceBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.border },
  eventChipText: { fontSize: 10, color: COLORS.textMuted },
  divider: { height: 1, backgroundColor: COLORS.border },
  bottomRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  bottomRowRTL: { flexDirection: 'row-reverse' },
  metaItem: { flex: 1, gap: 2 },
  metaLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  metaValue: { fontSize: 11, color: COLORS.textSecondary },
  actions: { flexDirection: 'row', gap: 6 },
  actionsRTL: { flexDirection: 'row-reverse' },
  testBtn: { backgroundColor: 'rgba(26, 86, 219, 0.15)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.primaryLight },
  testBtnText: { fontSize: 11, color: COLORS.primaryLight, fontWeight: '600' },
  deleteBtn: { backgroundColor: COLORS.dangerBg, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  deleteBtnText: { fontSize: 11, color: COLORS.danger, fontWeight: '600' },
})

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container: { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn: { fontSize: 18, color: COLORS.textMuted, padding: 4 },
  scroll: { maxHeight: 500 },
  body: { padding: 16, gap: 8 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginTop: 8 },
  input: { backgroundColor: COLORS.surfaceBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  eventsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  eventChip: { backgroundColor: COLORS.surfaceBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  eventChipSelected: { backgroundColor: 'rgba(26, 86, 219, 0.2)', borderColor: COLORS.primary },
  eventChipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  eventChipTextSelected: { color: COLORS.primaryLight, fontWeight: '700' },
  createBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  createBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
})