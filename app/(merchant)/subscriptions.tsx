import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  I18nManager, SafeAreaView, ActivityIndicator, RefreshControl, Alert, Modal,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { subscriptionsApi } from '../../services/api'
import { StatusBadge } from '../../components/StatusBadge'

const isRTL = I18nManager.isRTL

interface Sub {
  id: string; subscriptionId: string; customerName: string;
  amount: string; currency: string; interval: string; title: string;
  status: string; nextBillingDate: string; billingCount: number; createdAt: string;
}

export default function SubscriptionsScreen() {
  const { t } = useTranslation()
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ customerName: '', amount: '', title: '', interval: 'monthly' })

  const fetchData = useCallback(async () => {
    try {
      const res = await subscriptionsApi.list()
      setSubs(res.subscriptions)
    } catch (_e) { /* error */ }
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
      if (action === 'pause') await subscriptionsApi.pause(subId)
      else if (action === 'resume') await subscriptionsApi.resume(subId)
      else await subscriptionsApi.cancel(subId)
      fetchData()
    } catch (_e) { /* error */ }
  }

  if (loading) {
    return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
        <View style={s.header}>
          <View>
            <Text style={[s.title, isRTL && s.rtl]}>{t('subscriptions.title')}</Text>
            <Text style={[s.subtitle, isRTL && s.rtl]}>{t('subscriptions.subtitle')}</Text>
          </View>
          <TouchableOpacity style={s.createBtn} onPress={() => setShowCreate(true)}>
            <Text style={s.createBtnText}>+ {t('subscriptions.create')}</Text>
          </TouchableOpacity>
        </View>

        {subs.length === 0 ? (
          <View style={s.center}><Text style={s.emptyText}>{t('subscriptions.no_subs')}</Text></View>
        ) : (
          subs.map(sub => (
            <View key={sub.id} style={s.card}>
              <View style={[s.cardRow, isRTL && s.cardRowRTL]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{sub.title}</Text>
                  <Text style={s.cardCustomer}>{sub.customerName}</Text>
                  <Text style={s.cardId}>{sub.subscriptionId} · {t(`subscriptions.${sub.interval}`)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.cardAmount}>{sub.currency} {Number(sub.amount).toLocaleString()}</Text>
                  <StatusBadge status={sub.status} />
                  <Text style={s.cardDate}>{t('subscriptions.next_billing')}: {new Date(sub.nextBillingDate).toLocaleDateString()}</Text>
                </View>
              </View>
              <View style={[s.cardActions, isRTL && s.cardRowRTL]}>
                {sub.status === 'active' && (
                  <TouchableOpacity style={s.actionBtn} onPress={() => handleAction(sub.subscriptionId, 'pause')}>
                    <Text style={s.actionText}>{t('subscriptions.pause')}</Text>
                  </TouchableOpacity>
                )}
                {sub.status === 'paused' && (
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: COLORS.successBg }]} onPress={() => handleAction(sub.subscriptionId, 'resume')}>
                    <Text style={[s.actionText, { color: COLORS.success }]}>{t('subscriptions.resume')}</Text>
                  </TouchableOpacity>
                )}
                {(sub.status === 'active' || sub.status === 'paused') && (
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: COLORS.dangerBg }]} onPress={() => handleAction(sub.subscriptionId, 'cancel')}>
                    <Text style={[s.actionText, { color: COLORS.danger }]}>{t('subscriptions.cancel')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>{t('subscriptions.create')}</Text>
            <TextInput placeholder={t('subscriptions.customer')} value={form.customerName} onChangeText={v => setForm({...form, customerName: v})} style={s.input} placeholderTextColor={COLORS.textMuted} />
            <TextInput placeholder={t('subscriptions.amount')} value={form.amount} onChangeText={v => setForm({...form, amount: v})} style={s.input} placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
            <TextInput placeholder={t('payment_links.link_title')} value={form.title} onChangeText={v => setForm({...form, title: v})} style={s.input} placeholderTextColor={COLORS.textMuted} />
            <View style={[s.intervalRow, isRTL && s.cardRowRTL]}>
              {(['monthly', 'weekly', 'yearly'] as const).map(iv => (
                <TouchableOpacity key={iv} style={[s.intervalBtn, form.interval === iv && s.intervalActive]} onPress={() => setForm({...form, interval: iv})}>
                  <Text style={[s.intervalText, form.interval === iv && s.intervalTextActive]}>{t(`subscriptions.${iv}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowCreate(false)}>
                <Text style={{ color: COLORS.textSecondary }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSubmit} onPress={handleCreate} disabled={creating}>
                <Text style={{ color: COLORS.white, fontWeight: '700' }}>{creating ? t('common.loading') : t('subscriptions.create')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.deepBg },
  scroll: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary },
  rtl: { textAlign: 'right' },
  createBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  createBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  emptyText: { color: COLORS.textMuted, fontSize: 15 },
  card: { backgroundColor: COLORS.cardBg, marginHorizontal: 16, marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardRowRTL: { flexDirection: 'row-reverse' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  cardCustomer: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  cardId: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace' },
  cardAmount: { fontSize: 18, fontWeight: '700', color: COLORS.success, marginBottom: 4 },
  cardDate: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 12 },
  actionBtn: { flex: 1, backgroundColor: COLORS.surfaceBg, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, color: COLORS.textPrimary, fontSize: 15, marginBottom: 12 },
  intervalRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  intervalBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  intervalActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  intervalText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  intervalTextActive: { color: COLORS.white },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surfaceBg },
  modalSubmit: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary },
})
