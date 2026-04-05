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
import { QRCodeModal } from '../../components/QRCodeModal'

const isRTL = I18nManager.isRTL

interface PaymentLink {
  id: string; linkId: string; amount: string; currency: string;
  title: string; description: string | null; status: string;
  expiresAt: string | null; createdAt: string; paymentUrl?: string;
}

const DEMO_PACKAGES: PaymentLink[] = [
  { id: '1', linkId: 'ZRX-PL-001', amount: '5000', currency: 'SAR', title: 'تصميم متجر إلكتروني', description: 'تصميم وبرمجة متجر إلكتروني متكامل', status: 'active', expiresAt: null, createdAt: '2026-04-01' },
  { id: '2', linkId: 'ZRX-PL-002', amount: '2800', currency: 'SAR', title: 'باقة التسويق الرقمي', description: 'حملة تسويقية شاملة لمدة شهر', status: 'paid', expiresAt: null, createdAt: '2026-04-01' },
  { id: '3', linkId: 'ZRX-PL-003', amount: '1200', currency: 'SAR', title: 'استشارة أعمال', description: 'جلسة استشارية متخصصة في التجارة الإلكترونية', status: 'active', expiresAt: null, createdAt: '2026-03-28' },
  { id: '4', linkId: 'ZRX-PL-004', amount: '650', currency: 'SAR', title: 'تقرير تحليلي', description: 'تقرير تحليل أداء المبيعات والعملاء', status: 'active', expiresAt: null, createdAt: '2026-03-25' },
]

const CURRENCY_AR: Record<string, string> = {
  SAR: 'ر.س', AED: 'د.إ', KWD: 'د.ك', QAR: 'ر.ق', USD: '$',
}

const EXPIRY_OPTIONS = [
  { label: '٢٤ ساعة', value: '24' },
  { label: '٤٨ ساعة', value: '48' },
  { label: '٧ أيام', value: '168' },
  { label: 'بدون انتهاء', value: '0' },
]

export default function PaymentLinksScreen() {
  const { t } = useTranslation()
  const [links, setLinks] = useState<PaymentLink[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', amount: '', description: '', expiresInHours: '24' })
  const [qrLink, setQrLink] = useState<PaymentLink | null>(null)

  const fetchLinks = useCallback(async () => {
    try {
      const res = await paymentLinksApi.list()
      setLinks(res.links && res.links.length > 0 ? res.links : DEMO_PACKAGES)
    } catch (_err) {
      setLinks(DEMO_PACKAGES)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

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
        expiresInHours: parseInt(form.expiresInHours) || undefined,
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
      await Share.share({ message: `${link.title}\n${url}`, url })
    } catch (_e) {}
  }

  const handleCopy = async (link: PaymentLink) => {
    const url = link.paymentUrl || `https://pay.zyrix.co/${link.linkId}`
    await Clipboard.setStringAsync(url)
    Alert.alert('✓', t('payment_links.copied'))
  }

  const handleCancel = async (linkId: string) => {
    Alert.alert('إلغاء الرابط', 'هل أنت متأكد من إلغاء هذا الرابط؟', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: 'إلغاء الرابط', style: 'destructive', onPress: async () => {
        try { await paymentLinksApi.cancel(linkId); fetchLinks() } catch (_e) {}
      }},
    ])
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
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, isRTL && styles.rtl]}>{t('payment_links.title')}</Text>
            <Text style={[styles.subtitle, isRTL && styles.rtl]}>{t('payment_links.subtitle')}</Text>
          </View>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.createBtnText}>+ {t('payment_links.create')}</Text>
          </TouchableOpacity>
        </View>

        {/* Links */}
        {links.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>{t('payment_links.no_links')}</Text>
          </View>
        ) : (
          links.map(link => (
            <View key={link.id} style={styles.card}>
              <View style={[styles.cardRow, isRTL && styles.cardRowRTL]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{link.title}</Text>
                  <Text style={styles.cardId}>{link.linkId}</Text>
                  {link.expiresAt && (
                    <Text style={styles.cardExpiry}>
                      ينتهي: {new Date(link.expiresAt).toLocaleDateString('ar-SA')}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                  <Text style={styles.cardAmount}>
                    {Number(link.amount).toLocaleString()} {CURRENCY_AR[link.currency] ?? link.currency}
                  </Text>
                  <StatusBadge status={link.status as any} />
                </View>
              </View>

              {link.status === 'active' && (
                <View style={[styles.cardActions, isRTL && styles.cardRowRTL]}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(link)}>
                    <Text style={styles.actionText}>📤 {t('payment_links.share')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleCopy(link)}>
                    <Text style={styles.actionText}>📋 نسخ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setQrLink(link)}>
                    <Text style={styles.actionText}>◻ QR</Text>
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

            <TextInput
              placeholder={t('payment_links.link_title')}
              value={form.title}
              onChangeText={v => setForm({...form, title: v})}
              style={styles.input}
              placeholderTextColor={COLORS.textMuted}
              textAlign={isRTL ? 'right' : 'left'}
            />
            <TextInput
              placeholder={t('payment_links.amount')}
              value={form.amount}
              onChangeText={v => setForm({...form, amount: v})}
              style={styles.input}
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
              textAlign={isRTL ? 'right' : 'left'}
            />
            <TextInput
              placeholder={t('payment_links.description')}
              value={form.description}
              onChangeText={v => setForm({...form, description: v})}
              style={styles.input}
              placeholderTextColor={COLORS.textMuted}
              textAlign={isRTL ? 'right' : 'left'}
            />

            {/* Expiry Picker */}
            <Text style={[styles.expiryLabel, isRTL && { textAlign: 'right' }]}>مدة الصلاحية</Text>
            <View style={[styles.expiryRow, isRTL && styles.cardRowRTL]}>
              {EXPIRY_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.expiryBtn, form.expiresInHours === opt.value && styles.expiryBtnActive]}
                  onPress={() => setForm({...form, expiresInHours: opt.value})}
                >
                  <Text style={[styles.expiryBtnText, form.expiresInHours === opt.value && styles.expiryBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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

      {/* QR Modal */}
      {qrLink && (
        <QRCodeModal
          visible={!!qrLink}
          onClose={() => setQrLink(null)}
          value={qrLink.paymentUrl || `https://pay.zyrix.co/${qrLink.linkId}`}
          title={qrLink.title}
          subtitle={`${Number(qrLink.amount).toLocaleString()} ${CURRENCY_AR[qrLink.currency] ?? qrLink.currency}`}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.deepBg },
  scroll: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  header: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20 },
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
  cardExpiry: { fontSize: 11, color: COLORS.warning, marginTop: 4 },
  cardAmount: { fontSize: 18, fontWeight: '700', color: COLORS.success, marginBottom: 6 },
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, flexWrap: 'wrap' },
  actionBtn: { flex: 1, backgroundColor: COLORS.surfaceBg, paddingVertical: 8, borderRadius: 8, alignItems: 'center', minWidth: 60 },
  cancelBtn: { backgroundColor: COLORS.dangerBg },
  actionText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, color: COLORS.textPrimary, fontSize: 15, marginBottom: 12 },
  expiryLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  expiryRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  expiryBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.surfaceBg },
  expiryBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  expiryBtnText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  expiryBtnTextActive: { color: COLORS.white },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surfaceBg },
  modalSubmit: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary },
})