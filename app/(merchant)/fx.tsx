// app/(merchant)/fx.tsx
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  I18nManager, SafeAreaView, ActivityIndicator, ScrollView,
  Modal,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { fxApi } from '../../services/api'
import { InnerHeader } from '../../components/InnerHeader'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'

const isRTL = I18nManager.isRTL

// ─── Constants ────────────────────────────────────

const CURRENCIES = ['USD', 'SAR', 'AED', 'KWD', 'QAR', 'EUR', 'TRY']

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸', SAR: '🇸🇦', AED: '🇦🇪', KWD: '🇰🇼',
  QAR: '🇶🇦', EUR: '🇪🇺', TRY: '🇹🇷',
}

const CURRENCY_NAMES: Record<string, string> = {
  USD: 'دولار أمريكي', SAR: 'ريال سعودي', AED: 'درهم إماراتي',
  KWD: 'دينار كويتي', QAR: 'ريال قطري',
  EUR: 'يورو', TRY: 'ليرة تركية',
}

const CURRENCY_ACCENT: Record<string, string> = {
  USD: '#10B981', SAR: '#06B6D4', AED: '#8B5CF6',
  KWD: '#F59E0B', QAR: '#EC4899', EUR: '#3B82F6', TRY: '#EF4444',
}

// ─── Demo Wallets ─────────────────────────────────

const DEMO_WALLETS = [
  { currency: 'SAR', balance: 48250.75,  change: +2.3  },
  { currency: 'USD', balance: 12800.00,  change: -0.8  },
  { currency: 'AED', balance: 9400.50,   change: +1.1  },
  { currency: 'KWD', balance: 3200.00,   change: +0.5  },
  { currency: 'QAR', balance: 6750.25,   change: -0.3  },
  { currency: 'EUR', balance: 5100.00,   change: +1.8  },
  { currency: 'TRY', balance: 42000.00,  change: -3.2  },
]

// ─── Demo FX History ──────────────────────────────

const FX_HISTORY: Record<string, number[]> = {
  USD: [3.72, 3.74, 3.73, 3.75, 3.76, 3.74, 3.75],
  AED: [1.02, 1.02, 1.03, 1.02, 1.02, 1.03, 1.02],
  KWD: [12.1, 12.2, 12.1, 12.3, 12.2, 12.1, 12.2],
  QAR: [1.02, 1.03, 1.02, 1.02, 1.03, 1.02, 1.03],
  EUR: [4.05, 4.08, 4.06, 4.07, 4.09, 4.08, 4.10],
  TRY: [0.11, 0.11, 0.10, 0.11, 0.10, 0.11, 0.10],
}

const DEMO_RATES: Record<string, number> = {
  SAR: 3.75, AED: 3.67, KWD: 0.31, QAR: 3.64,
  EUR: 0.92, TRY: 32.5,
}

// ─── Smart FX Tips ────────────────────────────────

const FX_TIPS = [
  { icon: '💡', text: 'الريال السعودي في أعلى مستوياته مقابل الدولار هذا الأسبوع — وقت مناسب للتحويل', color: '#10B981' },
  { icon: '⚠️', text: 'الليرة التركية في تراجع — تأخير تحويلات TRY قد يوفر 3-5%', color: '#F59E0B' },
  { icon: '🎯', text: 'أفضل وقت لتحويل AED → SAR: الثلاثاء والأربعاء صباحاً', color: '#06B6D4' },
]

// ─── Tab Keys ─────────────────────────────────────

type TabKey = 'wallets' | 'converter' | 'rates' | 'smart'

// ─── Mini Sparkline ───────────────────────────────

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 60; const H = 24
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / range) * H
    return `${x},${y}`
  }).join(' ')
  const isUp = values[values.length - 1] >= values[0]
  const lineColor = isUp ? '#10B981' : '#EF4444'
  return (
    <View style={{ width: W, height: H }}>
      <Text style={{ fontSize: 6, color: lineColor, fontFamily: 'monospace' }}>
        {values.map((v, i) => {
          const h = Math.round(((v - min) / range) * 8)
          return i === values.length - 1 ? '●' : h > 4 ? '▲' : '▼'
        }).join('')}
      </Text>
    </View>
  )
}

// ─── Wallet Card ──────────────────────────────────

function WalletCard({ wallet, onPress }: {
  wallet: typeof DEMO_WALLETS[0]; onPress: () => void
}) {
  const accent = CURRENCY_ACCENT[wallet.currency] ?? COLORS.primary
  const isUp = wallet.change >= 0
  const history = FX_HISTORY[wallet.currency] ?? [1, 1, 1, 1, 1, 1, 1]

  return (
    <TouchableOpacity
      style={[wc.card, { borderColor: `${accent}35`, backgroundColor: `${accent}0D` }]}
      onPress={onPress} activeOpacity={0.75}
    >
      {/* Top */}
      <View style={[wc.top, isRTL && wc.rowRTL]}>
        <Text style={wc.flag}>{CURRENCY_FLAGS[wallet.currency]}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[wc.code, { color: accent }]}>{wallet.currency}</Text>
          <Text style={wc.name}>{CURRENCY_NAMES[wallet.currency]}</Text>
        </View>
        <Sparkline values={history} color={accent} />
      </View>

      {/* Balance */}
      <Text style={[wc.balance, { color: accent }]}>
        {wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </Text>

      {/* Change */}
      <View style={[wc.changeRow, isRTL && wc.rowRTL]}>
        <View style={[wc.changeBadge, { backgroundColor: isUp ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
          <Text style={[wc.changeText, { color: isUp ? '#10B981' : '#EF4444' }]}>
            {isUp ? '▲' : '▼'} {Math.abs(wallet.change)}%
          </Text>
        </View>
        <Text style={wc.changeLabel}>هذا الأسبوع</Text>
      </View>

      <View style={[wc.accentBar, { backgroundColor: accent }]} />
    </TouchableOpacity>
  )
}

const wc = StyleSheet.create({
  card:        { borderRadius: 14, borderWidth: 1.5, padding: 14, overflow: 'hidden', gap: 6 },
  top:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowRTL:      { flexDirection: 'row-reverse' },
  flag:        { fontSize: 22 },
  code:        { fontSize: 16, fontWeight: '800' },
  name:        { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },
  balance:     { fontSize: 20, fontWeight: '800' },
  changeRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  changeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  changeText:  { fontSize: 11, fontWeight: '700' },
  changeLabel: { fontSize: 10, color: COLORS.textMuted },
  accentBar:   { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 2, opacity: 0.7 },
})

// ─── Transfer Modal ───────────────────────────────

function TransferModal({ visible, onClose, fromCurrency }: {
  visible: boolean; onClose: () => void; fromCurrency: string;
}) {
  const [to, setTo]         = useState('SAR')
  const [amount, setAmount] = useState('')
  const accent = CURRENCY_ACCENT[fromCurrency] ?? COLORS.primary

  const rate = DEMO_RATES[fromCurrency] ?? 1
  const converted = amount ? (parseFloat(amount) * rate).toFixed(2) : '0.00'
  const fee = amount ? (parseFloat(amount) * 0.005).toFixed(2) : '0.00'
  const saving = amount ? (parseFloat(amount) * 0.012).toFixed(2) : '0.00'

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tm.overlay}>
        <View style={tm.container}>
          <View style={tm.header}>
            <Text style={tm.title}>تحويل {fromCurrency}</Text>
            <TouchableOpacity onPress={onClose} style={tm.closeBtn}>
              <Text style={tm.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={tm.scroll} showsVerticalScrollIndicator={false}>
            <Text style={tm.label}>المبلغ ({fromCurrency})</Text>
            <TextInput
              style={[tm.input, { borderColor: accent }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              textAlign="center"
            />

            <Text style={tm.label}>إلى عملة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tm.currencyRow}>
              {CURRENCIES.filter(c => c !== fromCurrency).map(c => (
                <TouchableOpacity
                  key={c}
                  style={[tm.currBtn, to === c && { borderColor: CURRENCY_ACCENT[c], backgroundColor: `${CURRENCY_ACCENT[c]}20` }]}
                  onPress={() => setTo(c)}
                >
                  <Text style={tm.currFlag}>{CURRENCY_FLAGS[c]}</Text>
                  <Text style={[tm.currCode, to === c && { color: CURRENCY_ACCENT[c], fontWeight: '700' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Cost breakdown */}
            <View style={tm.breakdownCard}>
              <Text style={tm.breakdownTitle}>تفاصيل التحويل</Text>
              <View style={tm.breakdownRow}>
                <Text style={tm.breakdownLabel}>ستحصل على</Text>
                <Text style={[tm.breakdownValue, { color: '#10B981', fontSize: 20 }]}>{converted} {to}</Text>
              </View>
              <View style={tm.breakdownRow}>
                <Text style={tm.breakdownLabel}>سعر الصرف</Text>
                <Text style={tm.breakdownValue}>1 {fromCurrency} = {rate} {to}</Text>
              </View>
              <View style={tm.breakdownRow}>
                <Text style={tm.breakdownLabel}>رسوم التحويل (0.5%)</Text>
                <Text style={[tm.breakdownValue, { color: '#F59E0B' }]}>{fee} {fromCurrency}</Text>
              </View>
              <View style={[tm.breakdownRow, tm.savingRow]}>
                <Text style={[tm.breakdownLabel, { color: '#10B981' }]}>💰 وفّرت مقابل البنوك</Text>
                <Text style={[tm.breakdownValue, { color: '#10B981' }]}>~{saving} {fromCurrency}</Text>
              </View>
            </View>

            <TouchableOpacity style={[tm.submitBtn, { backgroundColor: accent }]} onPress={onClose}>
              <Text style={tm.submitBtnText}>تأكيد التحويل</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const tm = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  container:     { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:         { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn:      { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeTxt:      { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  scroll:        { padding: 16 },
  label:         { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'right', marginBottom: 8, marginTop: 12 },
  input:         { backgroundColor: COLORS.surfaceBg, borderWidth: 2, borderRadius: 12, paddingVertical: 14, color: COLORS.textPrimary, fontSize: 24, fontWeight: '800' },
  currencyRow:   { gap: 8, paddingBottom: 4 },
  currBtn:       { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceBg, gap: 4 },
  currFlag:      { fontSize: 20 },
  currCode:      { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  breakdownCard: { backgroundColor: COLORS.surfaceBg, borderRadius: 12, padding: 14, gap: 10, marginTop: 16, borderWidth: 1, borderColor: COLORS.border },
  breakdownTitle:{ fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right', marginBottom: 4 },
  breakdownRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownLabel:{ fontSize: 12, color: COLORS.textMuted },
  breakdownValue:{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  savingRow:     { backgroundColor: 'rgba(16,185,129,0.08)', padding: 8, borderRadius: 8, marginTop: 4 },
  submitBtn:     { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})

// ─── Main Screen ──────────────────────────────────

export default function FXScreen() {
  const tabBarHeight = useTabBarHeight()
  const [tab, setTab]           = useState<TabKey>('wallets')
  const [rates, setRates]       = useState<Record<string, number>>(DEMO_RATES)
  const [loading, setLoading]   = useState(false)
  const [amount, setAmount]     = useState('100')
  const [fromCcy, setFromCcy]   = useState('USD')
  const [toCcy, setToCcy]       = useState('SAR')
  const [result, setResult]     = useState<{ converted: number; rate: number } | null>(null)
  const [converting, setConverting] = useState(false)
  const [updatedAt, setUpdatedAt]   = useState('')
  const [transferModal, setTransferModal] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState('USD')

  const fetchRates = useCallback(async () => {
    try {
      const res = await fxApi.getRates()
      setRates(res.data.rates)
      setUpdatedAt(res.data.updatedAt)
    } catch {}
  }, [])

  useEffect(() => { fetchRates() }, [])

  const handleConvert = async () => {
    if (!amount || isNaN(parseFloat(amount))) return
    setConverting(true)
    try {
      const res = await fxApi.convert(fromCcy, toCcy, parseFloat(amount))
      setResult(res.data)
    } catch {
      const rate = DEMO_RATES[toCcy] ?? 1
      setResult({ converted: parseFloat(amount) * rate, rate })
    } finally { setConverting(false) }
  }

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: 'wallets',   label: 'المحافظ',    icon: '💼' },
    { key: 'converter', label: 'المحول',     icon: '🔄' },
    { key: 'rates',     label: 'الأسعار',    icon: '📊' },
    { key: 'smart',     label: 'FX ذكي',    icon: '🧠' },
  ]

  const totalInUSD = DEMO_WALLETS.reduce((sum, w) => {
    if (w.currency === 'USD') return sum + w.balance
    const r = DEMO_RATES[w.currency] ?? 1
    return sum + w.balance / r
  }, 0)

  return (
    <SafeAreaView style={st.safe}>
      <InnerHeader title="العملات المتعددة" accentColor="#06B6D4" />

      {/* Total Balance Banner */}
      <View style={st.totalBanner}>
        <View>
          <Text style={st.totalLabel}>إجمالي الرصيد</Text>
          <Text style={st.totalValue}>
            ${totalInUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
          </Text>
        </View>
        <View style={st.totalRight}>
          <Text style={st.totalCurrencies}>{DEMO_WALLETS.length} عملة</Text>
          <View style={st.totalBadge}>
            <Text style={st.totalBadgeText}>▲ 1.2% هذا الأسبوع</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={st.tabsRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[st.tabBtn, tab === t.key && st.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={st.tabIcon}>{t.icon}</Text>
            <Text style={[st.tabLabel, tab === t.key && st.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[st.scroll, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ─── Wallets Tab ─── */}
        {tab === 'wallets' && (
          <View style={st.walletsGrid}>
            {DEMO_WALLETS.map(w => (
              <WalletCard
                key={w.currency}
                wallet={w}
                onPress={() => { setSelectedWallet(w.currency); setTransferModal(true) }}
              />
            ))}
          </View>
        )}

        {/* ─── Converter Tab ─── */}
        {tab === 'converter' && (
          <View style={st.converterCard}>
            <Text style={st.sectionTitle}>محول العملات</Text>

            <TextInput
              style={st.amountInput}
              value={amount}
              onChangeText={v => { setAmount(v); setResult(null) }}
              keyboardType="decimal-pad"
              placeholder="أدخل المبلغ"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={st.label}>من</Text>
            <View style={st.currencyRow}>
              {CURRENCIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[st.currencyBtn, fromCcy === c && { backgroundColor: `${CURRENCY_ACCENT[c]}25`, borderColor: CURRENCY_ACCENT[c] }]}
                  onPress={() => { setFromCcy(c); setResult(null) }}
                >
                  <Text style={st.currencyFlag}>{CURRENCY_FLAGS[c]}</Text>
                  <Text style={[st.currencyCode, fromCcy === c && { color: CURRENCY_ACCENT[c], fontWeight: '800' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={st.swapBtn} onPress={() => { setFromCcy(toCcy); setToCcy(fromCcy); setResult(null) }}>
              <Text style={st.swapBtnText}>⇅ تبديل</Text>
            </TouchableOpacity>

            <Text style={st.label}>إلى</Text>
            <View style={st.currencyRow}>
              {CURRENCIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[st.currencyBtn, toCcy === c && { backgroundColor: `${CURRENCY_ACCENT[c]}25`, borderColor: CURRENCY_ACCENT[c] }]}
                  onPress={() => { setToCcy(c); setResult(null) }}
                >
                  <Text style={st.currencyFlag}>{CURRENCY_FLAGS[c]}</Text>
                  <Text style={[st.currencyCode, toCcy === c && { color: CURRENCY_ACCENT[c], fontWeight: '800' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[st.convertBtn, converting && { opacity: 0.6 }]} onPress={handleConvert} disabled={converting}>
              <Text style={st.convertBtnText}>{converting ? '...' : '🔄 تحويل'}</Text>
            </TouchableOpacity>

            {result && (
              <View style={st.resultBox}>
                <Text style={st.resultLabel}>النتيجة</Text>
                <Text style={st.resultAmount}>
                  {result.converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {toCcy}
                </Text>
                <Text style={st.resultRate}>
                  1 {fromCcy} = {result.rate.toLocaleString('en-US', { minimumFractionDigits: 4 })} {toCcy}
                </Text>
                {/* Loss reduction */}
                <View style={st.savingBox}>
                  <Text style={st.savingText}>
                    💰 وفّرت ~{(parseFloat(amount) * 0.012).toFixed(2)} {fromCcy} مقابل أسعار البنوك التقليدية
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ─── Rates Tab ─── */}
        {tab === 'rates' && (
          <View style={st.ratesCard}>
            <View style={[st.ratesHeader, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={st.sectionTitle}>أسعار الصرف مقابل USD</Text>
              {updatedAt && (
                <Text style={st.updatedAt}>
                  {new Date(updatedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
            {CURRENCIES.filter(c => c !== 'USD').map((c, i) => {
              const rate = rates[c] ?? DEMO_RATES[c]
              const history = FX_HISTORY[c] ?? []
              const isUp = history.length > 1 && history[history.length - 1] >= history[0]
              const accent = CURRENCY_ACCENT[c]
              return (
                <View key={c} style={[st.rateRow, { backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }, isRTL && { flexDirection: 'row-reverse' }]}>
                  <View style={[st.rateLeft, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Text style={st.rateFlag}>{CURRENCY_FLAGS[c]}</Text>
                    <View>
                      <Text style={[st.rateCode, { color: accent }]}>{c}</Text>
                      <Text style={st.rateName}>{CURRENCY_NAMES[c]}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    <Text style={[st.rateValue, { color: accent }]}>
                      {rate >= 1000
                        ? rate.toLocaleString('en-US', { maximumFractionDigits: 0 })
                        : rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </Text>
                    <Text style={[st.rateChange, { color: isUp ? '#10B981' : '#EF4444' }]}>
                      {isUp ? '▲' : '▼'} {(Math.random() * 0.5 + 0.1).toFixed(2)}%
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* ─── Smart FX Tab ─── */}
        {tab === 'smart' && (
          <>
            <Text style={st.smartTitle}>توصيات FX الذكية</Text>
            {FX_TIPS.map((tip, i) => (
              <View key={i} style={[st.tipCard, { borderColor: `${tip.color}35`, backgroundColor: `${tip.color}0D` }]}>
                <Text style={st.tipIcon}>{tip.icon}</Text>
                <Text style={[st.tipText, { color: tip.color }]}>{tip.text}</Text>
              </View>
            ))}

            <Text style={[st.smartTitle, { marginTop: 16 }]}>تقليل خسائر التحويل</Text>
            <View style={st.savingsCard}>
              <View style={st.savingsRow}>
                <Text style={st.savingsLabel}>متوسط التوفير شهرياً</Text>
                <Text style={st.savingsValue}>~$240</Text>
              </View>
              <View style={st.savingsRow}>
                <Text style={st.savingsLabel}>أفضل مسار تحويل</Text>
                <Text style={[st.savingsValue, { color: '#10B981' }]}>SAR → USD → AED</Text>
              </View>
              <View style={st.savingsRow}>
                <Text style={st.savingsLabel}>رسوم Zyrix مقابل البنوك</Text>
                <Text style={[st.savingsValue, { color: '#10B981' }]}>0.5% vs 2.5%</Text>
              </View>
              <View style={[st.savingsBar]}>
                <View style={[st.savingsBarFill, { width: '20%', backgroundColor: '#10B981' }]} />
                <View style={[st.savingsBarFill, { width: '80%', backgroundColor: 'rgba(239,68,68,0.3)' }]} />
              </View>
              <View style={st.savingsBarLabels}>
                <Text style={[st.savingsBarLabel, { color: '#10B981' }]}>Zyrix 0.5%</Text>
                <Text style={[st.savingsBarLabel, { color: '#EF4444' }]}>البنوك 2.5%</Text>
              </View>
            </View>

            <Text style={[st.smartTitle, { marginTop: 16 }]}>تنبيهات الأسعار</Text>
            {CURRENCIES.filter(c => c !== 'SAR').slice(0, 3).map((c, i) => (
              <View key={i} style={st.alertCard}>
                <View style={[st.alertLeft, isRTL && { flexDirection: 'row-reverse' }]}>
                  <Text style={st.alertFlag}>{CURRENCY_FLAGS[c]}</Text>
                  <Text style={st.alertText}>تنبيه عند 1 {c} = {(DEMO_RATES[c] * 1.02).toFixed(2)} SAR</Text>
                </View>
                <View style={[st.alertToggle, { backgroundColor: 'rgba(16,185,129,0.2)', borderColor: '#10B981' }]}>
                  <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '700' }}>مفعّل</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <Text style={st.disclaimer}>
          * الأسعار تقريبية للأغراض المعلوماتية. تحقق من المصادر الرسمية للمعاملات الفعلية.
        </Text>
      </ScrollView>

      <TransferModal
        visible={transferModal}
        onClose={() => setTransferModal(false)}
        fromCurrency={selectedWallet}
      />
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.darkBg },
  scroll:       { paddingTop: 8 },

  // Total Banner
  totalBanner:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 12, marginTop: 8, backgroundColor: 'rgba(6,182,212,0.12)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(6,182,212,0.3)', padding: 14 },
  totalLabel:   { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', textAlign: 'right' },
  totalValue:   { fontSize: 22, fontWeight: '800', color: '#06B6D4' },
  totalRight:   { alignItems: 'flex-end', gap: 6 },
  totalCurrencies: { fontSize: 11, color: COLORS.textMuted },
  totalBadge:   { backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  totalBadgeText: { fontSize: 11, color: '#10B981', fontWeight: '700' },

  // Tabs
  tabsRow:      { flexDirection: 'row', marginHorizontal: 12, marginTop: 10, backgroundColor: COLORS.cardBg, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: COLORS.border },
  tabBtn:       { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9, gap: 2 },
  tabBtnActive: { backgroundColor: 'rgba(6,182,212,0.2)' },
  tabIcon:      { fontSize: 14 },
  tabLabel:     { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  tabLabelActive: { color: '#06B6D4', fontWeight: '700' },

  // Wallets Grid
  walletsGrid:  { padding: 12, gap: 10 },

  // Converter
  converterCard:  { margin: 12, backgroundColor: COLORS.cardBg, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 16, gap: 8 },
  sectionTitle:   { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4, textAlign: 'right' },
  label:          { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginTop: 4, textAlign: 'right' },
  amountInput:    { backgroundColor: COLORS.surfaceBg, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: COLORS.textPrimary, fontSize: 20, fontWeight: '700', borderWidth: 1, borderColor: COLORS.border, textAlign: 'center' },
  currencyRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  currencyBtn:    { flexDirection: 'column', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceBg, minWidth: 52, gap: 2 },
  currencyFlag:   { fontSize: 18 },
  currencyCode:   { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  swapBtn:        { backgroundColor: 'rgba(26,86,219,0.15)', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(26,86,219,0.3)' },
  swapBtnText:    { color: COLORS.primaryLight, fontWeight: '700', fontSize: 14 },
  convertBtn:     { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  convertBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  resultBox:      { backgroundColor: 'rgba(5,150,105,0.15)', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(5,150,105,0.3)', gap: 4 },
  resultLabel:    { fontSize: 12, color: COLORS.textMuted },
  resultAmount:   { fontSize: 28, fontWeight: '800', color: COLORS.success },
  resultRate:     { fontSize: 12, color: COLORS.textSecondary },
  savingBox:      { backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 8, padding: 8, marginTop: 4 },
  savingText:     { fontSize: 11, color: '#10B981', fontWeight: '600', textAlign: 'center' },

  // Rates
  ratesCard:    { marginHorizontal: 12, backgroundColor: COLORS.cardBg, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  ratesHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  updatedAt:    { fontSize: 11, color: COLORS.textMuted },
  rateRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  rateLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rateFlag:     { fontSize: 24 },
  rateCode:     { fontSize: 14, fontWeight: '700' },
  rateName:     { fontSize: 11, color: COLORS.textMuted },
  rateValue:    { fontSize: 16, fontWeight: '700' },
  rateChange:   { fontSize: 11, fontWeight: '600' },

  // Smart FX
  smartTitle:   { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginHorizontal: 12, marginTop: 8, marginBottom: 8, textAlign: 'right' },
  tipCard:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 12, marginBottom: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  tipIcon:      { fontSize: 18 },
  tipText:      { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 20, textAlign: 'right' },
  savingsCard:  { marginHorizontal: 12, backgroundColor: COLORS.cardBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 10 },
  savingsRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  savingsLabel: { fontSize: 12, color: COLORS.textMuted },
  savingsValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  savingsBar:   { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  savingsBarFill: { height: '100%' },
  savingsBarLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  savingsBarLabel:  { fontSize: 10, fontWeight: '600' },
  alertCard:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 12, marginBottom: 8, backgroundColor: COLORS.cardBg, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 12 },
  alertLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  alertFlag:    { fontSize: 20 },
  alertText:    { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500', flex: 1, textAlign: 'right' },
  alertToggle:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },

  disclaimer:   { fontSize: 10, color: COLORS.textMuted, textAlign: 'center', marginHorizontal: 16, marginTop: 16, lineHeight: 16 },
})