// app/(merchant)/fx.tsx
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  I18nManager, SafeAreaView, ActivityIndicator, ScrollView,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { fxApi } from '../../services/api'
import { InnerHeader } from '../../components/InnerHeader'

const isRTL = I18nManager.isRTL

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

export default function FXScreen() {
  const [rates, setRates] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('100')
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [toCurrency, setToCurrency] = useState('SAR')
  const [result, setResult] = useState<{ converted: number; rate: number } | null>(null)
  const [converting, setConverting] = useState(false)
  const [updatedAt, setUpdatedAt] = useState('')

  const fetchRates = useCallback(async () => {
    try {
      const res = await fxApi.getRates()
      setRates(res.data.rates)
      setUpdatedAt(res.data.updatedAt)
    } catch (err) { console.warn(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchRates() }, [])

  const handleConvert = async () => {
    if (!amount || isNaN(parseFloat(amount))) return
    setConverting(true)
    try {
      const res = await fxApi.convert(fromCurrency, toCurrency, parseFloat(amount))
      setResult(res.data)
    } catch (err) { console.warn(err) }
    finally { setConverting(false) }
  }

  const handleSwap = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
    setResult(null)
  }

  if (loading) {
    return (
      <SafeAreaView style={st.safe}>
        <InnerHeader title="أسعار الصرف" accentColor="#06B6D4" />
        <View style={st.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={st.safe}>
      {/* ── InnerHeader ── */}
      <InnerHeader title="أسعار الصرف" accentColor="#06B6D4" />

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* Converter */}
        <View style={st.converterCard}>
          <Text style={[st.sectionTitle, isRTL && st.textRight]}>محول العملات</Text>

          <TextInput
            style={[st.amountInput, isRTL && { textAlign: 'right' }]}
            value={amount}
            onChangeText={v => { setAmount(v); setResult(null) }}
            keyboardType="decimal-pad"
            placeholder="أدخل المبلغ"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={[st.label, isRTL && st.textRight]}>من</Text>
          <View style={[st.currencyRow, isRTL && st.currencyRowRTL]}>
            {CURRENCIES.map(c => (
              <TouchableOpacity
                key={c}
                style={[st.currencyBtn, fromCurrency === c && st.currencyBtnActiveFrom]}
                onPress={() => { setFromCurrency(c); setResult(null) }}
              >
                <Text style={st.currencyFlag}>{CURRENCY_FLAGS[c]}</Text>
                <Text style={[st.currencyCode, fromCurrency === c && { color: COLORS.white, fontWeight: '800' }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={st.swapBtn} onPress={handleSwap}>
            <Text style={st.swapBtnText}>⇅ تبديل</Text>
          </TouchableOpacity>

          <Text style={[st.label, isRTL && st.textRight]}>إلى</Text>
          <View style={[st.currencyRow, isRTL && st.currencyRowRTL]}>
            {CURRENCIES.map(c => (
              <TouchableOpacity
                key={c}
                style={[st.currencyBtn, toCurrency === c && st.currencyBtnActiveTo]}
                onPress={() => { setToCurrency(c); setResult(null) }}
              >
                <Text style={st.currencyFlag}>{CURRENCY_FLAGS[c]}</Text>
                <Text style={[st.currencyCode, toCurrency === c && { color: COLORS.white, fontWeight: '800' }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[st.convertBtn, converting && { opacity: 0.6 }]}
            onPress={handleConvert}
            disabled={converting}
          >
            <Text style={st.convertBtnText}>{converting ? '...' : '🔄 تحويل'}</Text>
          </TouchableOpacity>

          {result && (
            <View style={st.resultBox}>
              <Text style={st.resultLabel}>النتيجة</Text>
              <Text style={st.resultAmount}>
                {result.converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {toCurrency}
              </Text>
              <Text style={st.resultRate}>
                1 {fromCurrency} = {result.rate.toLocaleString('en-US', { minimumFractionDigits: 4 })} {toCurrency}
              </Text>
            </View>
          )}
        </View>

        {/* Rates Table */}
        <View style={st.ratesCard}>
          <View style={[st.ratesHeader, isRTL && st.ratesHeaderRTL]}>
            <Text style={st.sectionTitle}>أسعار الصرف مقابل USD</Text>
            {updatedAt && (
              <Text style={st.updatedAt}>
                {new Date(updatedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>

          {CURRENCIES.filter(c => c !== 'USD').map((c, i) => {
            const rate = rates[c]
            if (!rate) return null
            return (
              <View key={c} style={[st.rateRow, { backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }, isRTL && st.rateRowRTL]}>
                <View style={[st.rateLeft, isRTL && st.rateLeftRTL]}>
                  <Text style={st.rateFlag}>{CURRENCY_FLAGS[c]}</Text>
                  <View>
                    <Text style={st.rateCode}>{c}</Text>
                    <Text style={st.rateName}>{CURRENCY_NAMES[c]}</Text>
                  </View>
                </View>
                <Text style={st.rateValue}>
                  {rate >= 1000
                    ? rate.toLocaleString('en-US', { maximumFractionDigits: 0 })
                    : rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </Text>
              </View>
            )
          })}
        </View>

        <Text style={st.disclaimer}>
          * الأسعار تقريبية للأغراض المعلوماتية فقط. تحقق من المصادر الرسمية للمعاملات الفعلية.
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.darkBg },
  scroll: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textRight: { textAlign: 'right' },
  converterCard: { margin: 16, backgroundColor: COLORS.cardBg, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 16, gap: 8 },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  label:         { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginTop: 4 },
  amountInput:   { backgroundColor: COLORS.surfaceBg, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: COLORS.textPrimary, fontSize: 20, fontWeight: '700', borderWidth: 1, borderColor: COLORS.border, textAlign: 'center' },
  currencyRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  currencyRowRTL: { flexDirection: 'row-reverse' },
  currencyBtn:           { flexDirection: 'column', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceBg, minWidth: 56, gap: 2 },
  currencyBtnActiveFrom: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  currencyBtnActiveTo:   { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  currencyFlag: { fontSize: 18 },
  currencyCode: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  swapBtn:     { backgroundColor: 'rgba(26,86,219,0.15)', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(26,86,219,0.3)' },
  swapBtnText: { color: COLORS.primaryLight, fontWeight: '700', fontSize: 14 },
  convertBtn:     { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  convertBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  resultBox:    { backgroundColor: 'rgba(5,150,105,0.15)', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(5,150,105,0.3)', gap: 4 },
  resultLabel:  { fontSize: 12, color: COLORS.textMuted },
  resultAmount: { fontSize: 28, fontWeight: '800', color: COLORS.success },
  resultRate:   { fontSize: 12, color: COLORS.textSecondary },
  ratesCard:    { marginHorizontal: 16, backgroundColor: COLORS.cardBg, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  ratesHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  ratesHeaderRTL: { flexDirection: 'row-reverse' },
  updatedAt: { fontSize: 11, color: COLORS.textMuted },
  rateRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  rateRowRTL: { flexDirection: 'row-reverse' },
  rateLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rateLeftRTL: { flexDirection: 'row-reverse' },
  rateFlag:  { fontSize: 24 },
  rateCode:  { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  rateName:  { fontSize: 11, color: COLORS.textMuted },
  rateValue: { fontSize: 16, fontWeight: '700', color: COLORS.primaryLight },
  disclaimer: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center', marginHorizontal: 16, marginTop: 12, lineHeight: 16 },
})