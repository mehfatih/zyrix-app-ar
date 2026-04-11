// ─────────────────────────────────────────────────────────────
// app/(merchant)/revenue-recovery.tsx
// Campaigns + Send + Stats + History
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, I18nManager, ActivityIndicator, Alert, RefreshControl,
  Modal, ListRenderItemInfo,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { COLORS } from '../../constants/colors'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { recoveryApi } from '../../services/api'
import { InnerHeader } from '../../components/InnerHeader'

const isRTL = I18nManager.isRTL

interface Campaign {
  id: string; name: string; channel: string; triggerType: string
  delayHours: number; message: string | null; isActive: boolean
  sentCount: number; recoveredCount: number; recoveredAmount: number; recoveryRate: number
}
interface Stats {
  totalSent: number; totalRecovered: number
  totalRecoveredAmount: number; recoveryRate: number
}

const CHANNEL_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  WHATSAPP: { icon: '💬', color: '#25D366', bg: 'rgba(37,211,102,0.15)' },
  EMAIL:    { icon: '📧', color: '#6366F1', bg: 'rgba(99,102,241,0.15)' },
  SMS:      { icon: '📱', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  PUSH:     { icon: '🔔', color: '#06B6D4', bg: 'rgba(6,182,212,0.15)' },
}

const TRIGGER_AR: Record<string, string> = {
  FAILED_PAYMENT:  'دفع فاشل',
  ABANDONED:       'سلة متروكة',
  OVERDUE_INVOICE: 'فاتورة متأخرة',
}

function StatsCard({ stats }: { stats: Stats | null }) {
  if (!stats) return null
  return (
    <View style={stS.wrap}>
      <View style={[stS.head, isRTL && { flexDirection: 'row-reverse' }]}>
        <View style={[stS.dot, { backgroundColor: '#10B981' }]} />
        <Text style={stS.title}>إحصائيات الاسترجاع</Text>
      </View>
      <View style={stS.row}>
        {[
          { label: 'رسائل مُرسلة', value: String(stats.totalSent),                                   color: '#6366F1' },
          { label: 'مُسترجع',      value: String(stats.totalRecovered),                               color: '#10B981' },
          { label: 'معدل النجاح',  value: `${stats.recoveryRate}%`,                                  color: '#F59E0B' },
          { label: 'إيراد مُسترجع', value: `${stats.totalRecoveredAmount.toLocaleString()} ر.س`,    color: '#10B981' },
        ].map((m, i) => (
          <View key={i} style={stS.metric}>
            <Text style={stS.metricLabel}>{m.label}</Text>
            <Text style={[stS.metricVal, { color: m.color }]}>{m.value}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
const stS = StyleSheet.create({
  wrap:        { marginHorizontal: 12, marginBottom: 10, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(16,185,129,0.4)', backgroundColor: COLORS.cardBg, padding: 12 },
  head:        { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  dot:         { width: 7, height: 7, borderRadius: 4 },
  title:       { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  row:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric:      { width: '47%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 8 },
  metricLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600', marginBottom: 3, textAlign: 'right' },
  metricVal:   { fontSize: 15, fontWeight: '800', textAlign: 'right' },
})

function CampaignCard({ campaign, onSend, onToggle, onDelete, sending }: {
  campaign: Campaign
  onSend: (id: string) => void
  onToggle: (id: string, current: boolean) => void
  onDelete: (id: string) => void
  sending: boolean
}) {
  const cfg = CHANNEL_CONFIG[campaign.channel] ?? CHANNEL_CONFIG.PUSH
  return (
    <View style={[cC.card, { backgroundColor: cfg.color + '10', borderColor: cfg.color + '30' }]}>
      <View style={[cC.topRow, isRTL && cC.rowRTL]}>
        <Text style={cC.icon}>{cfg.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[cC.name, { color: cfg.color }]}>{campaign.name}</Text>
          <Text style={cC.trigger}>{TRIGGER_AR[campaign.triggerType] ?? campaign.triggerType} · بعد {campaign.delayHours}h</Text>
        </View>
        <View style={[cC.activeBadge, { backgroundColor: campaign.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)' }]}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: campaign.isActive ? '#10B981' : '#6B7280' }}>
            {campaign.isActive ? 'نشطة' : 'متوقفة'}
          </Text>
        </View>
      </View>

      <View style={cC.statsRow}>
        {[
          { label: 'مُرسلة',   val: String(campaign.sentCount),      color: cfg.color },
          { label: 'مُسترجعة', val: String(campaign.recoveredCount), color: '#10B981' },
          { label: 'النجاح',   val: `${campaign.recoveryRate}%`,     color: '#F59E0B' },
          { label: 'الإيراد',  val: `${campaign.recoveredAmount.toLocaleString()} ر.س`, color: '#10B981' },
        ].map((s, i) => (
          <View key={i} style={cC.statItem}>
            <Text style={[cC.statVal, { color: s.color }]}>{s.val}</Text>
            <Text style={cC.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={[cC.actions, isRTL && cC.rowRTL]}>
        {campaign.isActive && (
          <TouchableOpacity
            style={[cC.btn, { backgroundColor: cfg.color + '20', borderColor: cfg.color + '50' }]}
            onPress={() => onSend(campaign.id)} disabled={sending}
          >
            <Text style={[cC.btnTxt, { color: cfg.color }]}>{sending ? '...' : '▶ إرسال'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[cC.btn, { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.35)' }]}
          onPress={() => onToggle(campaign.id, campaign.isActive)}
        >
          <Text style={[cC.btnTxt, { color: '#6366F1' }]}>{campaign.isActive ? 'إيقاف' : 'تفعيل'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[cC.btn, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)' }]}
          onPress={() => onDelete(campaign.id)}
        >
          <Text style={[cC.btnTxt, { color: '#EF4444' }]}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
const cC = StyleSheet.create({
  card:       { marginHorizontal: 12, marginBottom: 10, borderRadius: 14, borderWidth: 1.5, padding: 13 },
  topRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  rowRTL:     { flexDirection: 'row-reverse' },
  icon:       { fontSize: 24 },
  name:       { fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 2 },
  trigger:    { fontSize: 10, color: COLORS.textMuted, textAlign: 'right' },
  activeBadge:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statsRow:   { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, paddingVertical: 10 },
  statItem:   { alignItems: 'center', gap: 3 },
  statVal:    { fontSize: 14, fontWeight: '800' },
  statLabel:  { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  actions:    { flexDirection: 'row', gap: 7 },
  btn:        { flex: 1, paddingVertical: 9, borderRadius: 9, borderWidth: 1, alignItems: 'center' },
  btnTxt:     { fontSize: 11, fontWeight: '700' },
})

function CreateCampaignModal({ visible, onClose, onCreate, loading }: {
  visible: boolean; onClose: () => void; onCreate: (data: any) => void; loading: boolean
}) {
  const [name, setName]         = useState('')
  const [channel, setChannel]   = useState('WHATSAPP')
  const [trigger, setTrigger]   = useState('FAILED_PAYMENT')
  const [delay, setDelay]       = useState('24')
  const reset = () => { setName(''); setChannel('WHATSAPP'); setTrigger('FAILED_PAYMENT'); setDelay('24') }

  const channels = ['WHATSAPP', 'EMAIL', 'SMS', 'PUSH']
  const triggers = ['FAILED_PAYMENT', 'ABANDONED', 'OVERDUE_INVOICE']

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { onClose(); reset() }}>
      <View style={mdS.overlay}>
        <View style={mdS.container}>
          <View style={mdS.head}>
            <Text style={mdS.title}>+ حملة استرجاع جديدة</Text>
            <TouchableOpacity onPress={() => { onClose(); reset() }} style={mdS.closeBtn}>
              <Text style={mdS.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={mdS.body}>
            <TextInput placeholder="اسم الحملة *" value={name} onChangeText={setName}
              style={mdS.input} placeholderTextColor={COLORS.textMuted} textAlign={isRTL ? 'right' : 'left'} />

            <Text style={mdS.label}>القناة</Text>
            <View style={mdS.optRow}>
              {channels.map(c => {
                const cfg = CHANNEL_CONFIG[c]
                return (
                  <TouchableOpacity key={c}
                    style={[mdS.optBtn, channel === c && { backgroundColor: cfg.color + '25', borderColor: cfg.color }]}
                    onPress={() => setChannel(c)}
                  >
                    <Text style={mdS.optIcon}>{cfg.icon}</Text>
                    <Text style={[mdS.optTxt, channel === c && { color: cfg.color }]}>{c}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <Text style={[mdS.label, { marginTop: 8 }]}>المُحفّز</Text>
            <View style={{ gap: 7 }}>
              {triggers.map(t => (
                <TouchableOpacity key={t}
                  style={[mdS.triggerBtn, trigger === t && mdS.triggerActive]}
                  onPress={() => setTrigger(t)}
                >
                  <Text style={[mdS.triggerTxt, trigger === t && mdS.triggerActiveTxt]}>
                    {TRIGGER_AR[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput placeholder="التأخير (بالساعات، افتراضي: 24)" value={delay} onChangeText={setDelay}
              style={[mdS.input, { marginTop: 10 }]} keyboardType="number-pad" placeholderTextColor={COLORS.textMuted}
              textAlign={isRTL ? 'right' : 'left'} />

            <View style={[mdS.actions, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={mdS.cancelBtn} onPress={() => { onClose(); reset() }}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mdS.submitBtn, loading && { opacity: 0.6 }]}
                onPress={() => { if (!name.trim()) return; onCreate({ name: name.trim(), channel, triggerType: trigger, delayHours: parseInt(delay) || 24 }); reset() }}
                disabled={loading}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>{loading ? '...' : 'إنشاء'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
const mdS = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container:    { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  head:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:        { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn:     { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeTxt:     { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  body:         { padding: 16, gap: 10 },
  label:        { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'right' },
  input:        { backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14 },
  optRow:       { flexDirection: 'row', gap: 7 },
  optBtn:       { flex: 1, paddingVertical: 9, borderRadius: 9, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', gap: 3 },
  optIcon:      { fontSize: 18 },
  optTxt:       { fontSize: 9, color: COLORS.textMuted, fontWeight: '700' },
  triggerBtn:   { paddingVertical: 10, borderRadius: 9, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  triggerActive:{ backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10B981' },
  triggerTxt:   { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  triggerActiveTxt: { color: '#10B981' },
  actions:      { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:    { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surfaceBg },
  submitBtn:    { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: '#10B981' },
})

export default function RevenueRecoveryScreen() {
  const tabBarHeight = useTabBarHeight()
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats]         = useState<Stats | null>(null)
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating]   = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [campRes, statsRes] = await Promise.allSettled([
        recoveryApi.listCampaigns(),
        recoveryApi.getStats(),
      ])
      if (campRes.status === 'fulfilled')  setCampaigns(campRes.value?.data ?? [])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value?.data ?? null)
    } catch (_e) {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async (data: any) => {
    setCreating(true)
    try {
      await recoveryApi.createCampaign(data)
      setShowCreate(false)
      Alert.alert('', 'تم إنشاء الحملة')
      fetchData()
    } catch { Alert.alert('', 'حدث خطأ') }
    setCreating(false)
  }

  const handleSend = async (id: string) => {
    setSendingId(id)
    try {
      const res = await recoveryApi.sendCampaign(id)
      Alert.alert('', res?.data?.message ?? 'تم الإرسال')
      fetchData()
    } catch { Alert.alert('', 'حدث خطأ في الإرسال') }
    setSendingId(null)
  }

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await recoveryApi.updateCampaign(id, { isActive: !current })
      Alert.alert('', current ? 'تم إيقاف الحملة' : 'تم تفعيل الحملة')
      fetchData()
    } catch { Alert.alert('', 'حدث خطأ') }
  }

  const handleDelete = async (id: string) => {
    try {
      await recoveryApi.deleteCampaign(id)
      Alert.alert('', 'تم الحذف')
      fetchData()
    } catch { Alert.alert('', 'حدث خطأ') }
  }

  if (loading) {
    return (
      <SafeAreaView style={sc.safe} edges={['top']}>
        <InnerHeader title="استرجاع الإيرادات" accentColor="#10B981" />
        <View style={sc.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={sc.safe} edges={['top']}>
      <InnerHeader title="استرجاع الإيرادات" accentColor="#10B981" />
      <FlatList
        data={campaigns}
        keyExtractor={item => item.id}
        renderItem={({ item }: ListRenderItemInfo<Campaign>) => (
          <CampaignCard campaign={item} onSend={handleSend} onToggle={handleToggle} onDelete={handleDelete} sending={sendingId === item.id} />
        )}
        ListHeaderComponent={
          <>
            <StatsCard stats={stats} />
            <View style={[sc.listHeader, isRTL && sc.rowRTL]}>
              <Text style={sc.listTitle}>الحملات ({campaigns.length})</Text>
              <TouchableOpacity style={sc.createBtn} onPress={() => setShowCreate(true)}>
                <Text style={sc.createBtnTxt}>+ حملة جديدة</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={sc.empty}>
            <Text style={sc.emptyIcon}>💸</Text>
            <Text style={sc.emptyTxt}>لا توجد حملات استرجاع بعد</Text>
          </View>
        }
        contentContainerStyle={[sc.listContent, { paddingBottom: tabBarHeight }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      />
      <CreateCampaignModal visible={showCreate} onClose={() => setShowCreate(false)} onCreate={handleCreate} loading={creating} />
    </SafeAreaView>
  )
}
const sc = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.darkBg },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingTop: 4 },
  listHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  rowRTL:      { flexDirection: 'row-reverse' },
  listTitle:   { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  createBtn:   { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9 },
  createBtnTxt:{ color: COLORS.white, fontSize: 12, fontWeight: '700' },
  empty:       { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon:   { fontSize: 40 },
  emptyTxt:    { fontSize: 14, color: COLORS.textMuted },
})