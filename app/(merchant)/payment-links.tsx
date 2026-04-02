import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  I18nManager, SafeAreaView, ActivityIndicator, RefreshControl, Alert, Share, Modal,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { paymentLinksApi } from '../../services/api'
import { StatusBadge } from '../../components/StatusBadge'

const isRTL = I18nManager.isRTL

interface PaymentLink {
  id: string; linkId: string; amount: string; currency: string;
  title: string; description: string | null; status: string;
  expiresAt: string | null; createdAt: string; paymentUrl?: string;
}

export default function PaymentLinksScreen() {
  const { t } = useTranslation()
  const [links, setLinks] = useState<PaymentLink[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', amount: '', description: '', expiresInHours: '24' })

  const fetchLinks = useCallback(async () => {
    try {
      setError(null)
      const res = await paymentLinksApi.list()
      setLinks(res.links)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [t])

  useEffect(() => { fetchLinks() }, [fetchLinks])

  const onRefresh = () => { setRefreshing(true); fetchLinks() }

  const handleCreate = async () => {
    if (!form.title.trim() || !form.amount.trim()) return
    setCreating(true)
    try {
      await paymentLinksApi.create({
        title: form.title,
        amount: parseFloat(form.amount),
        description: form.description || undefined,
        expiresInHours: parseInt(form.expiresInHours) || 24,
      })
      setShowCreate(false)
      setForm({ title: '', amount: '', description: '', expiresInHours: '24' })
      fetchLinks()
    } catch (err: unknown) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : '')
    }
    setCreating(false)
  }

  const handleShare = async (link: PaymentLink) => {
    const url = link.paymentUrl || `https://pay.zyrix.co/${link.linkId}`
    try {
      await Share.share({ message: `${link.title}: ${url}`, url })
    } catch (_e) { /* cancelled */ }
  }

  const handleCopy = async (link: PaymentLink) => {
    const url = link.paymentUrl || `https://pay.zyrix.co/${link.linkId}`
    await Clipboard.setStringAsync(url)
    Alert.alert(t('payment_links.copied'))
  }

  const handleCancel = async (linkId: string) => {
    try {
      await paymentLinksApi.cancel(linkId)
      fetchLinks()
    } catch (_e) { /* error */ }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, isRTL && styles.rtl]}>{t('payment_links.title')}</Text>
            <Text style={[styles.subtitle, isRTL && styles.rtl]}>{t('payment_links.subtitle')}</Text>
          </View>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.createBtnText}>+ {t('payment_links.create')}</Text>
          </TouchableOpacity>
        </View>

        {/* Links list */}
        {links.length === 0 ? (
          <View style={styles.center}><Text style={styles.emptyText}>{t('payment_links.no_links')}</Text></View>
        ) : (
          links.map((link: any) => (
            <View key={link.id} style={styles.card}>
              <View style={[styles.cardRow, isRTL && styles.cardRowRTL]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{link.title}</Text>
                  <Text style={styles.cardId}>{link.linkId}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cardAmount}>{link.currency} {Number(link.amount).toLocaleString()}</Text>
                  <StatusBadge status={link.status} />
                </View>
              </View>
              {link.status === 'active' && (
                <View style={[styles.cardActions, isRTL && styles.cardRowRTL]}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(link)}>
                    <Text style={styles.actionText}>{t('payment_links.share')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleCopy(link)}>
                    <Text style={styles.actionText}>{t('payment_links.copied').replace('!', '')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => handleCancel(link.linkId)}>
                    <Text style={[styles.actionText, { color: COLORS.danger }]}>{t('payment_links.cancel')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('payment_links.create')}</Text>
            <TextInput placeholder={t('payment_links.link_title')} value={form.title} onChangeText={v => setForm({...form, title: v})}
              style={styles.input} placeholderTextColor={COLORS.textMuted} />
            <TextInput placeholder={t('payment_links.amount')} value={form.amount} onChangeText={v => setForm({...form, amount: v})}
              style={styles.input} placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
            <TextInput placeholder={t('payment_links.description')} value={form.description} onChangeText={v => setForm({...form, description: v})}
              style={styles.input} placeholderTextColor={COLORS.textMuted} />
            <TextInput placeholder={t('payment_links.expires')} value={form.expiresInHours} onChangeText={v => setForm({...form, expiresInHours: v})}
              style={styles.input} placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCreate(false)}>
                <Text style={{ color: COLORS.textSecondary }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleCreate} disabled={creating}>
                <Text style={{ color: COLORS.white, fontWeight: '700' }}>
                  {creating ? t('common.loading') : t('payment_links.create')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.deepBg },
  scroll: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary },
  rtl: { textAlign: 'right' },
  createBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  createBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  emptyText: { color: COLORS.textMuted, fontSize: 15 },
  card: { backgroundColor: COLORS.cardBg, marginHorizontal: 16, marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardRowRTL: { flexDirection: 'row-reverse' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  cardId: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'monospace' },
  cardAmount: { fontSize: 18, fontWeight: '700', color: COLORS.success, marginBottom: 6 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 12 },
  actionBtn: { flex: 1, backgroundColor: COLORS.surfaceBg, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { backgroundColor: COLORS.dangerBg },
  actionText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, color: COLORS.textPrimary, fontSize: 15, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surfaceBg },
  modalSubmit: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary },
})
