// app/(merchant)/api-keys.tsx
import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl,
  I18nManager, SafeAreaView, Alert, Modal, TextInput, Clipboard,
  ListRenderItemInfo,
} from 'react-native'
import { useRouter } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { apiKeysApi } from '../../services/api'

const isRTL = I18nManager.isRTL

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
}

const CARD_BG = [
  { bg: 'rgba(13, 148, 136, 0.1)',  border: 'rgba(13, 148, 136, 0.3)' },
  { bg: 'rgba(26, 86, 219, 0.1)',   border: 'rgba(26, 86, 219, 0.3)' },
  { bg: 'rgba(139, 92, 246, 0.1)',  border: 'rgba(139, 92, 246, 0.3)' },
  { bg: 'rgba(245, 158, 11, 0.1)',  border: 'rgba(245, 158, 11, 0.3)' },
]

function ApiKeyCard({ apiKey, index, onRevoke }: { apiKey: ApiKey; index: number; onRevoke: (id: string, name: string) => void }) {
  const colors = CARD_BG[index % CARD_BG.length]
  const masked = `${apiKey.keyPrefix}••••••••••••••••••••••••••••••••`

  const handleCopy = () => {
    Clipboard.setString(apiKey.keyPrefix)
    Alert.alert('✓', 'تم نسخ البادئة')
  }

  return (
    <View style={[cd.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={[cd.topRow, isRTL && cd.topRowRTL]}>
        <View style={[cd.nameGroup, isRTL && cd.nameGroupRTL]}>
          <View style={cd.iconBubble}>
            <Text style={cd.iconText}>🔑</Text>
          </View>
          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={cd.keyName}>{apiKey.name}</Text>
            <Text style={cd.keyPrefix}>{masked}</Text>
          </View>
        </View>
        <View style={[cd.badge, { backgroundColor: apiKey.isActive ? COLORS.successBg : COLORS.dangerBg }]}>
          <Text style={[cd.badgeText, { color: apiKey.isActive ? COLORS.success : COLORS.danger }]}>
            {apiKey.isActive ? '● نشط' : '● معطل'}
          </Text>
        </View>
      </View>

      <View style={cd.divider} />

      <View style={[cd.bottomRow, isRTL && cd.bottomRowRTL]}>
        <View style={cd.metaItem}>
          <Text style={cd.metaLabel}>تاريخ الإنشاء</Text>
          <Text style={cd.metaValue}>{new Date(apiKey.createdAt).toLocaleDateString('ar-SA')}</Text>
        </View>
        <View style={cd.metaItem}>
          <Text style={cd.metaLabel}>آخر استخدام</Text>
          <Text style={cd.metaValue}>{apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleDateString('ar-SA') : 'لم يُستخدم'}</Text>
        </View>
        <View style={[cd.actions, isRTL && cd.actionsRTL]}>
          <TouchableOpacity style={cd.copyBtn} onPress={handleCopy}>
            <Text style={cd.copyBtnText}>نسخ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={cd.revokeBtn} onPress={() => onRevoke(apiKey.id, apiKey.name)}>
            <Text style={cd.revokeBtnText}>إلغاء</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export default function ApiKeysScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKeyFull, setNewKeyFull] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await apiKeysApi.list()
      setKeys(res.data || [])
    } catch (err) {
      console.warn(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => { fetchData() }, [])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const handleCreate = async () => {
    if (!newKeyName.trim()) { Alert.alert('خطأ', 'أدخل اسماً للمفتاح'); return }
    setCreating(true)
    try {
      const res = await apiKeysApi.create(newKeyName.trim())
      setNewKeyFull(res.data.fullKey)
      setNewKeyName('')
      fetchData()
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'حدث خطأ')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = (id: string, name: string) => {
    Alert.alert(
      'إلغاء المفتاح',
      `هل أنت متأكد من إلغاء "${name}"؟ لا يمكن التراجع.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إلغاء المفتاح', style: 'destructive',
          onPress: async () => {
            try {
              await apiKeysApi.revoke(id)
              fetchData()
            } catch (err: any) {
              Alert.alert('خطأ', err.message || 'حدث خطأ')
            }
          }
        }
      ]
    )
  }

  const handleCopyFullKey = () => {
    if (newKeyFull) {
      Clipboard.setString(newKeyFull)
      Alert.alert('✓', 'تم نسخ المفتاح الكامل')
    }
  }

  const renderItem = ({ item, index }: ListRenderItemInfo<ApiKey>) => (
    <ApiKeyCard apiKey={item} index={index} onRevoke={handleRevoke} />
  )

  const renderHeader = () => (
    <>
      <View style={st.pageHeader}>
        <View style={[st.headerRow, isRTL && st.headerRowRTL]}>
          <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
            <Text style={[st.backBtnText, isRTL && { transform: [{ scaleX: -1 }] }]}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[st.pageTitle, isRTL && st.textRight]}>مفاتيح API</Text>
            <Text style={[st.pageSubtitle, isRTL && st.textRight]}>إدارة مفاتيح التكامل البرمجي</Text>
          </View>
          <TouchableOpacity style={st.newBtn} onPress={() => setShowModal(true)}>
            <Text style={st.newBtnText}>+ جديد</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI */}
      <View style={[st.kpiRow, isRTL && st.kpiRowRTL]}>
        <View style={[st.kpiCard, { backgroundColor: 'rgba(13, 148, 136, 0.15)', borderColor: 'rgba(13, 148, 136, 0.3)' }]}>
          <Text style={st.kpiLabel}>إجمالي المفاتيح</Text>
          <Text style={[st.kpiValue, { color: COLORS.teal || '#0d9488' }]}>{keys.length}</Text>
        </View>
        <View style={[st.kpiCard, { backgroundColor: 'rgba(5, 150, 105, 0.15)', borderColor: 'rgba(5, 150, 105, 0.3)' }]}>
          <Text style={st.kpiLabel}>المفاتيح النشطة</Text>
          <Text style={[st.kpiValue, { color: COLORS.success }]}>{keys.filter(k => k.isActive).length}</Text>
        </View>
        <View style={[st.kpiCard, { backgroundColor: 'rgba(26, 86, 219, 0.15)', borderColor: 'rgba(26, 86, 219, 0.3)' }]}>
          <Text style={st.kpiLabel}>المُستخدمة</Text>
          <Text style={[st.kpiValue, { color: COLORS.primaryLight }]}>{keys.filter(k => k.lastUsedAt).length}</Text>
        </View>
      </View>

      {/* Info box */}
      <View style={st.infoBox}>
        <Text style={[st.infoText, isRTL && st.textRight]}>
          🔐 احفظ مفتاح الـ API في مكان آمن — لن تتمكن من رؤيته مرة أخرى بعد الإنشاء.
        </Text>
      </View>
    </>
  )

  const renderEmpty = () => (
    <View style={st.emptyContainer}>
      <Text style={st.emptyIcon}>🔑</Text>
      <Text style={st.emptyText}>لا توجد مفاتيح API بعد</Text>
      <TouchableOpacity style={st.emptyBtn} onPress={() => setShowModal(true)}>
        <Text style={st.emptyBtnText}>+ إنشاء مفتاح جديد</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={st.safeArea}>
      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        data={keys}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={loading ? null : renderEmpty}
        contentContainerStyle={st.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => { setShowModal(false); setNewKeyFull(null) }}>
        <View style={modal.overlay}>
          <View style={modal.container}>
            <View style={modal.header}>
              <Text style={modal.title}>{newKeyFull ? '✓ تم إنشاء المفتاح' : 'مفتاح API جديد'}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setNewKeyFull(null) }}>
                <Text style={modal.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {newKeyFull ? (
              <View style={modal.body}>
                <View style={modal.warningBox}>
                  <Text style={modal.warningText}>⚠️ انسخ المفتاح الآن — لن تتمكن من رؤيته مرة أخرى!</Text>
                </View>
                <Text style={modal.fullKeyLabel}>المفتاح الكامل:</Text>
                <View style={modal.fullKeyBox}>
                  <Text style={modal.fullKeyText} selectable>{newKeyFull}</Text>
                </View>
                <TouchableOpacity style={modal.copyBtn} onPress={handleCopyFullKey}>
                  <Text style={modal.copyBtnText}>📋 نسخ المفتاح الكامل</Text>
                </TouchableOpacity>
                <TouchableOpacity style={modal.doneBtn} onPress={() => { setShowModal(false); setNewKeyFull(null) }}>
                  <Text style={modal.doneBtnText}>تم — أحفظت المفتاح</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={modal.body}>
                <Text style={modal.label}>اسم المفتاح</Text>
                <TextInput
                  style={modal.input}
                  value={newKeyName}
                  onChangeText={setNewKeyName}
                  placeholder="مثال: موقع الويب، تطبيق الجوال..."
                  placeholderTextColor={COLORS.textMuted}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <TouchableOpacity
                  style={[modal.createBtn, creating && { opacity: 0.6 }]}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  <Text style={modal.createBtnText}>{creating ? '...' : 'إنشاء المفتاح'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.darkBg },
  listContent: { paddingBottom: 40 },
  pageHeader: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: 'rgba(13, 148, 136, 0.12)', borderBottomWidth: 1, borderBottomColor: 'rgba(13, 148, 136, 0.3)' },
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
  infoBox: { marginHorizontal: 12, marginBottom: 8, backgroundColor: 'rgba(26, 86, 219, 0.1)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(26, 86, 219, 0.3)', padding: 12 },
  infoText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '500' },
  emptyBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
})

const cd = StyleSheet.create({
  container: { marginHorizontal: 16, marginTop: 10, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 },
  topRowRTL: { flexDirection: 'row-reverse' },
  nameGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  nameGroupRTL: { flexDirection: 'row-reverse' },
  iconBubble: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  iconText: { fontSize: 18 },
  keyName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  keyPrefix: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace' },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: COLORS.border },
  bottomRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  bottomRowRTL: { flexDirection: 'row-reverse' },
  metaItem: { flex: 1, gap: 2 },
  metaLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  metaValue: { fontSize: 11, color: COLORS.textSecondary },
  actions: { flexDirection: 'row', gap: 6 },
  actionsRTL: { flexDirection: 'row-reverse' },
  copyBtn: { backgroundColor: COLORS.surfaceBg, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border },
  copyBtnText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  revokeBtn: { backgroundColor: COLORS.dangerBg, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  revokeBtnText: { fontSize: 11, color: COLORS.danger, fontWeight: '600' },
})

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container: { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn: { fontSize: 18, color: COLORS.textMuted, padding: 4 },
  body: { padding: 16, gap: 8 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginTop: 4 },
  input: { backgroundColor: COLORS.surfaceBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  createBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  createBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  warningBox: { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.4)' },
  warningText: { fontSize: 13, color: COLORS.warning, fontWeight: '600', textAlign: 'right' },
  fullKeyLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginTop: 8 },
  fullKeyBox: { backgroundColor: COLORS.deepBg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  fullKeyText: { fontSize: 12, color: COLORS.success, fontFamily: 'monospace', lineHeight: 20 },
  copyBtn: { backgroundColor: 'rgba(5, 150, 105, 0.15)', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.success },
  copyBtnText: { color: COLORS.success, fontSize: 14, fontWeight: '700' },
  doneBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  doneBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
})