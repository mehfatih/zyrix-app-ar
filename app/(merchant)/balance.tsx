// app/(merchant)/balance.tsx (Elite — Sub-wallets + Cashflow Alerts)
import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, I18nManager, ActivityIndicator, RefreshControl,
  Modal, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import { useRouter } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { useCurrency } from '../../hooks/useCurrency'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { balanceApi, walletsApi } from '../../services/api'
import { QRCodeModal } from '../../components/QRCodeModal'
import { InnerHeader } from '../../components/InnerHeader'


const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────────────────

interface SubWallet {
  id: string
  name: string
  purpose: string
  balance: number
  targetAmount: number | null
  color: string
  icon: string
  isLocked: boolean
}

interface CashflowAlert {
  id: string
  currency: string
  threshold: number
  alertType: string
  isActive: boolean
  lastTriggeredAt: string | null
}

interface TriggeredAlert {
  currency: string
  currentBalance: number
  threshold: number
  alertType: string
}

// ─── Purpose Config ───────────────────────────────────────────
const PURPOSE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  general:    { label: 'عام',       icon: '💼', color: '#6366F1' },
  reserve:    { label: 'احتياطي',   icon: '🛡️', color: '#06B6D4' },
  tax:        { label: 'ضرائب',    icon: '📊', color: '#F59E0B' },
  operations: { label: 'تشغيل',    icon: '⚙️', color: '#10B981' },
  payroll:    { label: 'رواتب',    icon: '👥', color: '#8B5CF6' },
}

// ─── Sub-wallet Card ──────────────────────────────────────────
function SubWalletCard({ sub, currency, onAllocate, onDelete }: {
  sub: SubWallet; currency: string
  onAllocate: (id: string) => void
  onDelete: (id: string) => void
}) {
  const sym = currency === 'SAR' ? 'ر.س' : currency
  const pct = sub.targetAmount && sub.targetAmount > 0
    ? Math.min(100, Math.round((sub.balance / sub.targetAmount) * 100))
    : null

  return (
    <View style={[swS.card, { backgroundColor: sub.color + '15', borderColor: sub.color + '40' }]}>
      <View style={[swS.row, isRTL && swS.rowRTL]}>
        <Text style={swS.icon}>{sub.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[swS.name, { color: sub.color }]}>{sub.name}</Text>
          <Text style={swS.purpose}>{PURPOSE_CONFIG[sub.purpose]?.label ?? sub.purpose}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <Text style={[swS.balance, { color: sub.color }]}>
            {Number(sub.balance).toLocaleString()} {sym}
          </Text>
          {pct !== null && (
            <Text style={[swS.pct, { color: sub.color }]}>{pct}% من الهدف</Text>
          )}
        </View>
      </View>

      {sub.targetAmount && (
        <View style={swS.progressWrap}>
          <View style={[swS.progressFill, {
            width: `${Math.min(100, Math.round((sub.balance / sub.targetAmount) * 100))}%`,
            backgroundColor: sub.color,
          }]} />
        </View>
      )}

      <View style={[swS.actions, isRTL && swS.rowRTL]}>
        <TouchableOpacity
          style={[swS.btn, { backgroundColor: sub.color + '20', borderColor: sub.color + '50' }]}
          onPress={() => onAllocate(sub.id)}
        >
          <Text style={[swS.btnTxt, { color: sub.color }]}>+ تخصيص</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[swS.btn, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)' }]}
          onPress={() => onDelete(sub.id)}
        >
          <Text style={[swS.btnTxt, { color: '#EF4444' }]}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
const swS = StyleSheet.create({
  card:       { borderRadius: 12, borderWidth: 1.5, padding: 12, marginBottom: 8 },
  row:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  rowRTL:     { flexDirection: 'row-reverse' },
  icon:       { fontSize: 22, marginTop: 2 },
  name:       { fontSize: 13, fontWeight: '700', marginBottom: 2, textAlign: 'right' },
  purpose:    { fontSize: 10, color: COLORS.textMuted, textAlign: 'right' },
  balance:    { fontSize: 15, fontWeight: '800' },
  pct:        { fontSize: 9, fontWeight: '600' },
  progressWrap: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 3 },
  actions:    { flexDirection: 'row', gap: 7 },
  btn:        { flex: 1, paddingVertical: 7, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  btnTxt:     { fontSize: 11, fontWeight: '700' },
})

// ─── Cashflow Alert Banner ────────────────────────────────────
function CashflowAlertBanner({ triggered }: { triggered: TriggeredAlert[] }) {
  if (triggered.length === 0) return null
  return (
    <View style={caS.wrap}>
      {triggered.map((t, i) => (
        <View key={i} style={[caS.row, isRTL && { flexDirection: 'row-reverse' }]}>
          <Text style={caS.icon}>⚠️</Text>
          <Text style={caS.txt}>
            رصيد {t.currency} منخفض: {t.currentBalance.toLocaleString()} (الحد: {t.threshold.toLocaleString()})
          </Text>
        </View>
      ))}
    </View>
  )
}
const caS = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)', backgroundColor: 'rgba(245,158,11,0.12)', padding: 10, gap: 6 },
  row:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 16 },
  txt:  { fontSize: 12, color: '#F59E0B', fontWeight: '600', flex: 1, textAlign: 'right' },
})

// ─── Create Sub-wallet Modal ──────────────────────────────────
function CreateSubWalletModal({ visible, currency, onClose, onCreate, loading }: {
  visible: boolean; currency: string; onClose: () => void
  onCreate: (data: any) => void; loading: boolean
}) {
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('general')
  const [targetAmount, setTargetAmount] = useState('')

  const reset = () => { setName(''); setPurpose('general'); setTargetAmount('') }
  const purposes = ['general', 'reserve', 'tax', 'operations', 'payroll']

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { onClose(); reset() }}>
      <View style={mdS.overlay}>
        <View style={mdS.container}>
          <View style={mdS.head}>
            <Text style={mdS.title}>+ محفظة فرعية</Text>
            <TouchableOpacity onPress={() => { onClose(); reset() }} style={mdS.closeBtn}>
              <Text style={mdS.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={mdS.body}>
            <TextInput
              placeholder="اسم المحفظة الفرعية *"
              value={name}
              onChangeText={setName}
              style={mdS.input}
              placeholderTextColor={COLORS.textMuted}
              textAlign={isRTL ? 'right' : 'left'}
            />
            <TextInput
              placeholder="المبلغ المستهدف (اختياري)"
              value={targetAmount}
              onChangeText={setTargetAmount}
              style={mdS.input}
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.textMuted}
              textAlign={isRTL ? 'right' : 'left'}
            />
            <Text style={mdS.label}>الغرض</Text>
            <View style={mdS.purposeGrid}>
              {purposes.map(p => {
                const cfg = PURPOSE_CONFIG[p]
                const active = purpose === p
                return (
                  <TouchableOpacity
                    key={p}
                    style={[mdS.purposeBtn, active && { backgroundColor: cfg.color + '25', borderColor: cfg.color }]}
                    onPress={() => setPurpose(p)}
                  >
                    <Text style={mdS.purposeIcon}>{cfg.icon}</Text>
                    <Text style={[mdS.purposeTxt, active && { color: cfg.color }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <View style={[mdS.actions, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={mdS.cancelBtn} onPress={() => { onClose(); reset() }}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mdS.submitBtn, loading && { opacity: 0.6 }]}
                onPress={() => {
                  if (!name.trim()) return
                  const cfg = PURPOSE_CONFIG[purpose]
                  onCreate({
                    name: name.trim(),
                    purpose,
                    targetAmount: targetAmount ? parseFloat(targetAmount) : undefined,
                    color: cfg?.color ?? '#6366F1',
                    icon: cfg?.icon ?? '💼',
                  })
                  reset()
                }}
                disabled={loading}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {loading ? 'جاري الإنشاء...' : 'إنشاء'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Allocate Modal ───────────────────────────────────────────
function AllocateModal({ visible, subWalletId, currency, onClose, onAllocate, loading }: {
  visible: boolean; subWalletId: string | null; currency: string; onClose: () => void
  onAllocate: (id: string, amount: number) => void; loading: boolean
}) {
  const [amount, setAmount] = useState('')
  const sym = currency === 'SAR' ? 'ر.س' : currency

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mdS.overlay}>
        <View style={mdS.container}>
          <View style={mdS.head}>
            <Text style={mdS.title}>تخصيص مبلغ</Text>
            <TouchableOpacity onPress={onClose} style={mdS.closeBtn}>
              <Text style={mdS.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={mdS.body}>
            <TextInput
              placeholder={`المبلغ (${sym}) *`}
              value={amount}
              onChangeText={setAmount}
              style={mdS.input}
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.textMuted}
              textAlign={isRTL ? 'right' : 'left'}
            />
            <View style={[mdS.actions, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={mdS.cancelBtn} onPress={onClose}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mdS.submitBtn, loading && { opacity: 0.6 }]}
                onPress={() => {
                  if (!amount || !subWalletId) return
                  onAllocate(subWalletId, parseFloat(amount))
                  setAmount('')
                }}
                disabled={loading}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {loading ? 'جاري التخصيص...' : 'تخصيص'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Set Alert Modal ──────────────────────────────────────────
function SetAlertModal({ visible, onClose, onSet, loading }: {
  visible: boolean; onClose: () => void
  onSet: (currency: string, threshold: number) => void; loading: boolean
}) {
  const [currency, setCurrency] = useState('SAR')
  const [threshold, setThreshold] = useState('')

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mdS.overlay}>
        <View style={mdS.container}>
          <View style={mdS.head}>
            <Text style={mdS.title}>🔔 تنبيه Cashflow</Text>
            <TouchableOpacity onPress={onClose} style={mdS.closeBtn}>
              <Text style={mdS.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={mdS.body}>
            <Text style={mdS.label}>العملة</Text>
            <View style={alS.row}>
              {['SAR', 'USD', 'AED', 'TRY'].map(c => (
                <TouchableOpacity
                  key={c}
                  style={[alS.btn, currency === c && alS.active]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[alS.txt, currency === c && alS.activeTxt]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              placeholder="حد الرصيد الأدنى *"
              value={threshold}
              onChangeText={setThreshold}
              style={mdS.input}
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.textMuted}
              textAlign={isRTL ? 'right' : 'left'}
            />
            <View style={[mdS.actions, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={mdS.cancelBtn} onPress={onClose}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mdS.submitBtn, { backgroundColor: '#F59E0B' }, loading && { opacity: 0.6 }]}
                onPress={() => { if (!threshold) return; onSet(currency, parseFloat(threshold)) }}
                disabled={loading}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {loading ? '...' : 'تفعيل التنبيه'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
const alS = StyleSheet.create({
  row:       { flexDirection: 'row', gap: 7, marginBottom: 10 },
  btn:       { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  active:    { backgroundColor: '#F59E0B25', borderColor: '#F59E0B' },
  txt:       { fontSize: 11, color: COLORS.textMuted, fontWeight: '700' },
  activeTxt: { color: '#F59E0B' },
})

const mdS = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container:  { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  head:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:      { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn:   { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeTxt:   { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  body:       { padding: 16, gap: 10 },
  label:      { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'right' },
  input:      { backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14 },
  actions:    { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surfaceBg },
  submitBtn:  { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary },
  purposeGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  purposeBtn: { width: '30%', paddingVertical: 9, borderRadius: 9, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', gap: 3, backgroundColor: COLORS.surfaceBg },
  purposeIcon:{ fontSize: 18 },
  purposeTxt: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
})

// ─── Main Screen ──────────────────────────────────────────────

function SectionTitle({ text }: { text: string }) {
  return <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{text}</Text>
}

export default function BalanceScreen() {
  const { t } = useTranslation()
  const { format, convert, currency } = useCurrency('SAR')
  const tabBarHeight = useTabBarHeight()
  const router = useRouter()

  const [ibanCopied, setIbanCopied] = useState(false)
  const [balanceData, setBalanceData] = useState<any>(null)
  const [subWallets, setSubWallets] = useState<SubWallet[]>([])
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showQR, setShowQR] = useState(false)

  const [showCreateSub, setShowCreateSub] = useState(false)
  const [createSubLoading, setCreateSubLoading] = useState(false)

  const [allocateSubId, setAllocateSubId] = useState<string | null>(null)
  const [allocateLoading, setAllocateLoading] = useState(false)

  const [showSetAlert, setShowSetAlert] = useState(false)
  const [alertLoading, setAlertLoading] = useState(false)

  // ─── Fetch ──────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [balRes, subRes, alertRes] = await Promise.allSettled([
        balanceApi.get(),
        walletsApi.get('SAR'),
        walletsApi.getCashflowAlerts ? walletsApi.getCashflowAlerts() : Promise.resolve(null),
      ])
      if (balRes.status === 'fulfilled') setBalanceData(balRes.value)
      if (subRes.status === 'fulfilled') {
        setSubWallets(subRes.value?.data?.subWallets ?? [])
      }
      if (alertRes.status === 'fulfilled' && alertRes.value) {
        setTriggeredAlerts(alertRes.value?.data?.triggered ?? [])
      }
    } catch (_e) {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  React.useEffect(() => { fetchData() }, [fetchData])

  const bal = balanceData || { available: 0, iban: '', company: '', incoming: 0, outgoing: 0, nextSettlement: null }
  const fmt = (amount: number) => format(convert(amount, 'SAR', currency), currency)
  const maxFlow = Math.max(bal.incoming, Math.abs(bal.outgoing), 1)
  const netAmount = bal.nextSettlement?.net ?? bal.nextSettlement?.dateAmount ?? 0
  const commission = bal.nextSettlement?.commission ?? 0

  const handleCopyIban = () => {
    Clipboard.setStringAsync(bal.iban)
    setIbanCopied(true)
    setTimeout(() => setIbanCopied(false), 2000)
  }

  // ─── Sub-wallet handlers ─────────────────────────
  const handleCreateSubWallet = async (data: any) => {
    setCreateSubLoading(true)
    try {
      await walletsApi.createSubWallet('SAR', data)
      setShowCreateSub(false)
      Alert.alert('', 'تم إنشاء المحفظة الفرعية')
      fetchData()
    } catch {
      Alert.alert('', 'حدث خطأ')
    }
    setCreateSubLoading(false)
  }

  const handleAllocate = async (subId: string, amount: number) => {
    setAllocateLoading(true)
    try {
      await walletsApi.allocateToSubWallet('SAR', subId, amount)
      setAllocateSubId(null)
      Alert.alert('', 'تم التخصيص بنجاح')
      fetchData()
    } catch {
      Alert.alert('', 'حدث خطأ في التخصيص')
    }
    setAllocateLoading(false)
  }

  const handleDeleteSubWallet = async (subId: string) => {
    try {
      await walletsApi.deleteSubWallet('SAR', subId)
      Alert.alert('', 'تم حذف المحفظة الفرعية')
      fetchData()
    } catch {
      Alert.alert('', 'حدث خطأ')
    }
  }

  const handleSetAlert = async (alertCurrency: string, threshold: number) => {
    setAlertLoading(true)
    try {
      await walletsApi.setCashflowAlert(alertCurrency, threshold)
      setShowSetAlert(false)
      Alert.alert('', `تم تفعيل تنبيه ${alertCurrency} عند ${threshold}`)
      fetchData()
    } catch {
      Alert.alert('', 'حدث خطأ')
    }
    setAlertLoading(false)
  }

  if (loading && !balanceData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <InnerHeader title={t('balance.title')} accentColor="#0D9488" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <InnerHeader title={t('balance.title')} accentColor="#0D9488" />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Cashflow Alert Banner */}
        <CashflowAlertBanner triggered={triggeredAlerts} />

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Text style={[styles.heroLabel, isRTL && { textAlign: 'right' }]}>{t('balance.available')}</Text>
          <Text style={[styles.heroAmount, isRTL && { textAlign: 'right' }]}>{fmt(bal.available)}</Text>

          <View style={[styles.actionRow, isRTL && styles.actionRowRTL]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}
              onPress={() => Alert.alert('', t('balance.transfer'))}
            >
              <Text style={styles.actionIcon}>↑</Text>
              <Text style={[styles.actionLabel, { color: COLORS.white }]}>{t('balance.transfer')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: 'rgba(13,148,136,0.25)', borderColor: 'rgba(13,148,136,0.5)' }]}
              onPress={handleCopyIban}
            >
              <Text style={styles.actionIcon}>⧉</Text>
              <Text style={[styles.actionLabel, { color: '#0D9488' }]}>{t('balance.copy_iban')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: 'rgba(139,92,246,0.2)', borderColor: 'rgba(139,92,246,0.4)' }]}
              onPress={() => setShowQR(true)}
            >
              <Text style={styles.actionIcon}>▦</Text>
              <Text style={[styles.actionLabel, { color: COLORS.chart?.purple ?? '#8B5CF6' }]}>{t('balance.qr_code')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.ibanRow, isRTL && styles.ibanRowRTL]}
            onPress={handleCopyIban}
          >
            <Text style={styles.ibanLabel}>IBAN</Text>
            <Text style={styles.ibanValue} numberOfLines={1} adjustsFontSizeToFit>{bal.iban}</Text>
            <Text style={[styles.ibanCopied, { opacity: ibanCopied ? 1 : 0 }]}>✓</Text>
          </TouchableOpacity>
        </View>

        {/* Multi-Currency Wallets Button */}
        <TouchableOpacity
          style={styles.walletsBtn}
          onPress={() => router.push('/(merchant)/wallets' as any)}
        >
          <View style={[styles.walletsBtnLeft, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.walletsBtnIcon}>💱</Text>
            <View>
              <Text style={[styles.walletsBtnTitle, isRTL && { textAlign: 'right' }]}>المحافظ متعددة العملات</Text>
              <Text style={[styles.walletsBtnSub, isRTL && { textAlign: 'right' }]}>SAR · USD · AED · TRY وأكثر</Text>
            </View>
          </View>
          <Text style={styles.walletsBtnArrow}>{isRTL ? '‹' : '›'}</Text>
        </TouchableOpacity>

        {/* Flow Cards */}
        <View style={[styles.flowRow, isRTL && styles.flowRowRTL]}>
          <View style={[styles.flowCard, { backgroundColor: 'rgba(5,150,105,0.12)', borderColor: 'rgba(5,150,105,0.3)' }]}>
            <View style={[styles.flowDot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.flowLabel}>{t('balance.incoming')}</Text>
            <Text style={[styles.flowAmount, { color: COLORS.success }]}>+{fmt(bal.incoming)}</Text>
          </View>
          <View style={[styles.flowCard, { backgroundColor: 'rgba(220,38,38,0.12)', borderColor: 'rgba(220,38,38,0.3)' }]}>
            <View style={[styles.flowDot, { backgroundColor: COLORS.danger }]} />
            <Text style={styles.flowLabel}>{t('balance.outgoing')}</Text>
            <Text style={[styles.flowAmount, { color: COLORS.danger }]}>-{fmt(Math.abs(bal.outgoing))}</Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          {[
            { label: t('balance.incoming'),  value: bal.incoming,            color: COLORS.success },
            { label: t('balance.outgoing'), value: Math.abs(bal.outgoing),  color: COLORS.danger  },
          ].map((bar, i) => (
            <View key={i} style={styles.chartBarGroup}>
              <View style={styles.chartBarTrack}>
                <View style={[styles.chartBarFill, { backgroundColor: bar.color, height: `${Math.max((bar.value / maxFlow) * 100, 8)}%` }]} />
              </View>
              <Text style={[styles.chartBarLabel, { color: bar.color }]}>{bar.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Elite: Sub-wallets Section ── */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, isRTL && { flexDirection: 'row-reverse' }]}>
            <SectionTitle text="المحافظ الفرعية — Segregation" />
            <View style={[styles.sectionActions, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity
                style={styles.sectionBtn}
                onPress={() => setShowSetAlert(true)}
              >
                <Text style={styles.sectionBtnTxt}>🔔 تنبيه</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sectionBtn, { backgroundColor: COLORS.primary }]}
                onPress={() => setShowCreateSub(true)}
              >
                <Text style={[styles.sectionBtnTxt, { color: '#fff' }]}>+ إضافة</Text>
              </TouchableOpacity>
            </View>
          </View>

          {subWallets.length === 0 ? (
            <View style={styles.emptySubWallets}>
              <Text style={styles.emptySubTxt}>🗂️ لا توجد محافظ فرعية بعد</Text>
              <Text style={styles.emptySubDesc}>خصّص أجزاء من رصيدك لأغراض مختلفة (احتياطي، ضرائب، رواتب...)</Text>
            </View>
          ) : (
            subWallets.map(sub => (
              <SubWalletCard
                key={sub.id}
                sub={sub}
                currency="SAR"
                onAllocate={(id) => setAllocateSubId(id)}
                onDelete={handleDeleteSubWallet}
              />
            ))
          )}
        </View>

        {/* Settlement */}
        <View style={styles.section}>
          <SectionTitle text={t('balance.next_settlement')} />
          <View style={styles.settlementCard}>
            <View style={styles.settlementCardHeader}>
              <Text style={[styles.settlementCardTitle, isRTL && { textAlign: 'right' }]}>
                {t('balance.next_settlement')}
              </Text>
            </View>
            {[
              { label: `📅 ${t('settlements.date') || 'التاريخ'}`,   value: bal.nextSettlement?.date ?? '—',           color: COLORS.textPrimary },
              { label: t('profile.company'),                           value: bal.company || 'Zyrix Global Technology',  color: COLORS.textPrimary },
              { label: t('settlements.gross') || 'الإجمالي',          value: fmt(bal.available),                        color: COLORS.textPrimary },
              { label: t('settlements.commission'),                    value: `-${fmt(commission)}`,                     color: COLORS.danger      },
              { label: t('settlements.net'),                           value: `+${fmt(netAmount)}`,                      color: COLORS.success     },
            ].map((row, i) => (
              <View key={i} style={[styles.settRow, { backgroundColor: i % 2 === 0 ? 'rgba(26,86,219,0.08)' : 'rgba(26,86,219,0.04)' }, isRTL && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.settLabel}>{row.label}</Text>
                <Text style={[styles.settValue, { color: row.color }]}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Merchant Info */}
        <View style={styles.section}>
          <SectionTitle text={t('profile.title')} />
          <View style={styles.infoCard}>
            {[
              { label: t('profile.merchantId'), value: 'ZRX-10042' },
              { label: t('profile.company'),    value: bal.company || 'Zyrix Global Technology' },
              { label: 'IBAN',                  value: bal.iban, mono: true },
            ].map((row, i) => (
              <View key={i} style={[styles.infoRow, { backgroundColor: i % 2 === 0 ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.04)' }, isRTL && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={[styles.infoValue, row.mono && styles.infoValueMono]} numberOfLines={1} adjustsFontSizeToFit>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>

      <QRCodeModal
        visible={showQR}
        onClose={() => setShowQR(false)}
        value={balanceData?.iban || ""}
        title="IBAN QR Code"
        subtitle={balanceData?.company || ""}
      />

      <CreateSubWalletModal
        visible={showCreateSub}
        currency="SAR"
        onClose={() => setShowCreateSub(false)}
        onCreate={handleCreateSubWallet}
        loading={createSubLoading}
      />

      <AllocateModal
        visible={!!allocateSubId}
        subWalletId={allocateSubId}
        currency="SAR"
        onClose={() => setAllocateSubId(null)}
        onAllocate={handleAllocate}
        loading={allocateLoading}
      />

      <SetAlertModal
        visible={showSetAlert}
        onClose={() => setShowSetAlert(false)}
        onSet={handleSetAlert}
        loading={alertLoading}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea:             { flex: 1, backgroundColor: COLORS.darkBg },
  scrollContent:        {},
  heroCard:             { margin: 16, borderRadius: 16, backgroundColor: 'rgba(13,148,136,0.15)', borderWidth: 1, borderColor: 'rgba(13,148,136,0.35)', padding: 24 },
  heroLabel:            { fontSize: 12, fontWeight: '600', letterSpacing: 1, color: COLORS.textSecondary, marginBottom: 8 },
  heroAmount:           { fontSize: 36, fontWeight: '800', color: COLORS.white, marginBottom: 24 },
  actionRow:            { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionRowRTL:         { flexDirection: 'row-reverse' },
  actionBtn:            { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  actionIcon:           { fontSize: 18, color: COLORS.white },
  actionLabel:          { fontSize: 11, fontWeight: '600' },
  ibanRow:              { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, gap: 6, borderWidth: 1, borderColor: COLORS.border },
  ibanRowRTL:           { flexDirection: 'row-reverse' },
  ibanLabel:            { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 0.5 },
  ibanValue:            { flex: 1, fontSize: 10, color: COLORS.textPrimary, fontFamily: 'monospace', letterSpacing: 0.5 },
  ibanCopied:           { fontSize: 14, color: COLORS.success, fontWeight: '700' },
  walletsBtn:           { flexDirection: isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.cardBg, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(5,150,105,0.3)', marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 16, paddingVertical: 14 },
  walletsBtnLeft:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  walletsBtnIcon:       { fontSize: 24 },
  walletsBtnTitle:      { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  walletsBtnSub:        { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  walletsBtnArrow:      { fontSize: 22, color: COLORS.textMuted },
  flowRow:              { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 6, gap: 10 },
  flowRowRTL:           { flexDirection: 'row-reverse' },
  flowCard:             { flex: 1, borderRadius: 14, borderWidth: 1, padding: 16 },
  flowDot:              { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  flowLabel:            { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 4 },
  flowAmount:           { fontSize: 18, fontWeight: '800' },
  chartContainer:       { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-around', alignItems: 'flex-end', backgroundColor: COLORS.cardBg, marginHorizontal: 16, marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, height: 120 },
  chartBarGroup:        { alignItems: 'center', flex: 1, gap: 4 },
  chartBarTrack:        { width: 36, height: 65, backgroundColor: COLORS.surfaceBg, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  chartBarFill:         { width: '100%', borderRadius: 6 },
  chartBarLabel:        { fontSize: 11, fontWeight: '700' },
  section:              { marginTop: 20, paddingHorizontal: 16 },
  sectionHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:         { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.5 },
  sectionActions:       { flexDirection: 'row', gap: 7 },
  sectionBtn:           { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: COLORS.border },
  sectionBtnTxt:        { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  emptySubWallets:      { backgroundColor: COLORS.cardBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 16, alignItems: 'center', gap: 6 },
  emptySubTxt:          { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  emptySubDesc:         { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', lineHeight: 17 },
  settlementCard:       { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(26,86,219,0.3)', overflow: 'hidden' },
  settlementCardHeader: { backgroundColor: 'rgba(26,86,219,0.15)', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(26,86,219,0.2)' },
  settlementCardTitle:  { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  settRow:              { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  settLabel:            { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  settValue:            { fontSize: 13, fontWeight: '600' },
  infoCard:             { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', overflow: 'hidden' },
  infoRow:              { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel:            { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  infoValue:            { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600', maxWidth: '60%', textAlign: isRTL ? 'left' : 'right' },
  infoValueMono:        { fontFamily: 'monospace', fontSize: 10 },
})