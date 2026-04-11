// ─────────────────────────────────────────────────────────────
// app/(merchant)/tax-engine.tsx
// VAT Multi-Country + Calculate + Period Report
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, I18nManager, ActivityIndicator, RefreshControl,
  Modal, ScrollView, ListRenderItemInfo,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { COLORS } from '../../constants/colors'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { taxApi } from '../../services/api'
import { InnerHeader } from '../../components/InnerHeader'
import { useToast } from '../../hooks/useToast'

const isRTL = I18nManager.isRTL

interface TaxRule {
  id: string; country: string; taxName: string; rate: number
  ratePercent?: number; appliesTo: string; isActive: boolean; isDefault: boolean
}
interface PeriodReport {
  year: number; totalTax: number
  byPeriod: { year: number; month: number; country: string; totalPreTax: number; totalTax: number; totalAmount: number }[]
}
interface CalcResult {
  country: string; taxName: string; preTax: number; rate: number
  ratePercent: number; taxAmount: number; total: number; currency: string
}

const COUNTRY_FLAGS: Record<string, string> = {
  SA: '🇸🇦', AE: '🇦🇪', TR: '🇹🇷', KW: '🇰🇼', QA: '🇶🇦', EG: '🇪🇬', IQ: '🇮🇶',
}
const MONTH_AR = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

function RateBar({ rate, color }: { rate: number; color: string }) {
  const pct = Math.min(rate * 100, 25) / 25 * 100
  return (
    <View style={rbS.track}>
      <View style={[rbS.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  )
}
const rbS = StyleSheet.create({
  track: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 3 },
})

function TaxRuleCard({ rule, onCalc }: { rule: TaxRule; onCalc: (rule: TaxRule) => void }) {
  const color = rule.rate > 0.1 ? '#EF4444' : rule.rate > 0.05 ? '#F59E0B' : '#10B981'
  return (
    <View style={[trC.card, { backgroundColor: color + '10', borderColor: color + '30' }]}>
      <View style={[trC.row, isRTL && trC.rowRTL]}>
        <Text style={trC.flag}>{COUNTRY_FLAGS[rule.country] ?? '🌍'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[trC.country, { color }]}>{rule.country} — {rule.taxName}</Text>
          <RateBar rate={rule.rate} color={color} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[trC.rate, { color }]}>{Math.round(rule.rate * 100)}%</Text>
          {rule.isDefault && <Text style={trC.defaultBadge}>افتراضي</Text>}
        </View>
      </View>
      <TouchableOpacity
        style={[trC.calcBtn, { backgroundColor: color + '20', borderColor: color + '50' }]}
        onPress={() => onCalc(rule)}
      >
        <Text style={[trC.calcTxt, { color }]}>🧮 احسب الضريبة</Text>
      </TouchableOpacity>
    </View>
  )
}
const trC = StyleSheet.create({
  card:        { marginHorizontal: 12, marginBottom: 8, borderRadius: 12, borderWidth: 1.5, padding: 12 },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  rowRTL:      { flexDirection: 'row-reverse' },
  flag:        { fontSize: 24 },
  country:     { fontSize: 13, fontWeight: '700', marginBottom: 4, textAlign: 'right' },
  rate:        { fontSize: 18, fontWeight: '800' },
  defaultBadge:{ fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  calcBtn:     { paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  calcTxt:     { fontSize: 12, fontWeight: '700' },
})

function CalcModal({ visible, rule, onClose, onCalc, loading, result }: {
  visible: boolean; rule: TaxRule | null; onClose: () => void
  onCalc: (amount: number) => void; loading: boolean; result: CalcResult | null
}) {
  const [amount, setAmount] = useState('')
  if (!rule) return null
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mdS.overlay}>
        <View style={mdS.container}>
          <View style={mdS.head}>
            <Text style={mdS.title}>{COUNTRY_FLAGS[rule.country]} احتساب {rule.taxName}</Text>
            <TouchableOpacity onPress={onClose} style={mdS.closeBtn}><Text style={mdS.closeTxt}>✕</Text></TouchableOpacity>
          </View>
          <View style={mdS.body}>
            <TextInput placeholder="المبلغ قبل الضريبة *" value={amount} onChangeText={setAmount}
              style={mdS.input} keyboardType="decimal-pad" placeholderTextColor={COLORS.textMuted}
              textAlign={isRTL ? 'right' : 'left'} />
            {result && (
              <View style={crS.box}>
                {[
                  { label: 'قبل الضريبة', val: `${result.preTax.toLocaleString()} ${result.currency}`,      color: COLORS.textPrimary },
                  { label: `${result.taxName} (${result.ratePercent}%)`, val: `${result.taxAmount.toLocaleString()} ${result.currency}`, color: '#EF4444' },
                  { label: 'الإجمالي مع الضريبة', val: `${result.total.toLocaleString()} ${result.currency}`, color: '#10B981' },
                ].map((r, i) => (
                  <View key={i} style={[crS.row, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Text style={crS.label}>{r.label}</Text>
                    <Text style={[crS.val, { color: r.color }]}>{r.val}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={[mdS.actions, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={mdS.cancelBtn} onPress={onClose}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>إغلاق</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[mdS.submitBtn, loading && { opacity: 0.6 }]}
                onPress={() => { if (amount) onCalc(parseFloat(amount)) }} disabled={loading}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{loading ? '...' : 'احتسب'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
const crS = StyleSheet.create({
  box:   { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, gap: 8, borderWidth: 1, borderColor: COLORS.border },
  row:   { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 12, color: COLORS.textMuted },
  val:   { fontSize: 13, fontWeight: '800' },
})
const mdS = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container: { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  head:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:     { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn:  { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeTxt:  { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  body:      { padding: 16, gap: 10 },
  input:     { backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14 },
  actions:   { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surfaceBg },
  submitBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary },
  label:     { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'right' },
})

export default function TaxEngineScreen() {
  const tabBarHeight = useTabBarHeight()
  const { showToast } = useToast()
  const [rules, setRules]           = useState<TaxRule[]>([])
  const [report, setReport]         = useState<PeriodReport | null>(null)
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [calcRule, setCalcRule]     = useState<TaxRule | null>(null)
  const [calcLoading, setCalcLoading] = useState(false)
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null)
  const [activeTab, setActiveTab]   = useState<'rates' | 'report'>('rates')

  const fetchData = useCallback(async () => {
    try {
      const [rulesRes, reportRes] = await Promise.allSettled([
        taxApi.listRules(),
        taxApi.getPeriodReport(new Date().getFullYear()),
      ])
      if (rulesRes.status === 'fulfilled')  setRules(rulesRes.value?.data ?? [])
      if (reportRes.status === 'fulfilled') setReport(reportRes.value?.data ?? null)
    } catch (_e) {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCalc = async (amount: number) => {
    if (!calcRule) return
    setCalcLoading(true)
    try {
      const res = await taxApi.calculate(amount, calcRule.country)
      setCalcResult(res?.data ?? null)
    } catch { showToast('حدث خطأ', 'error') }
    setCalcLoading(false)
  }

  if (loading) {
    return (
      <SafeAreaView style={sc.safe} edges={['top']}>
        <InnerHeader title="محرك الضرائب" accentColor="#EF4444" />
        <View style={sc.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      </SafeAreaView>
    )
  }

  const renderHeader = () => (
    <>
      {/* KPI */}
      <View style={[sc.kpiRow, isRTL && sc.rowRTL]}>
        {[
          { label: 'إجمالي ضرائب العام', value: report ? `${report.totalTax.toLocaleString()} ر.س` : '—', color: '#EF4444' },
          { label: 'الدول المفعّلة',      value: String(rules.filter(r => r.rate > 0).length),              color: '#F59E0B' },
          { label: 'معاملات مسجّلة',     value: report ? String(report.byPeriod.reduce((s, r) => s + r.totalAmount, 0).toLocaleString()) : '—', color: '#6366F1' },
        ].map((k, i) => (
          <View key={i} style={[sc.kpiCard, { backgroundColor: k.color + '18', borderColor: k.color + '40' }]}>
            <Text style={[sc.kpiLabel, { color: k.color }]}>{k.label}</Text>
            <Text style={[sc.kpiValue, { color: k.color }]} numberOfLines={1} adjustsFontSizeToFit>{k.value}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={sc.tabs}>
        <TouchableOpacity style={[sc.tab, activeTab === 'rates' && sc.tabActive]} onPress={() => setActiveTab('rates')}>
          <Text style={[sc.tabTxt, activeTab === 'rates' && sc.tabActiveTxt]}>🌍 معدلات الدول</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[sc.tab, activeTab === 'report' && sc.tabActive]} onPress={() => setActiveTab('report')}>
          <Text style={[sc.tabTxt, activeTab === 'report' && sc.tabActiveTxt]}>📊 تقرير الفترة</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'report' && report && (
        <View style={sc.reportBox}>
          <Text style={sc.reportTitle}>إجمالي ضرائب {report.year}: {report.totalTax.toLocaleString()} ر.س</Text>
          {report.byPeriod.map((r, i) => (
            <View key={i} style={[sc.reportRow, isRTL && sc.rowRTL]}>
              <Text style={sc.reportMonth}>{MONTH_AR[r.month]} — {COUNTRY_FLAGS[r.country] ?? '🌍'}{r.country}</Text>
              <Text style={[sc.reportTax, { color: '#EF4444' }]}>{r.totalTax.toLocaleString()} ر.س</Text>
            </View>
          ))}
          {report.byPeriod.length === 0 && (
            <Text style={{ color: COLORS.textMuted, textAlign: 'center', padding: 20 }}>لا توجد بيانات لهذا العام بعد</Text>
          )}
        </View>
      )}
    </>
  )

  return (
    <SafeAreaView style={sc.safe} edges={['top']}>
      <InnerHeader title="محرك الضرائب" accentColor="#EF4444" />
      <FlatList
        data={activeTab === 'rates' ? rules : []}
        keyExtractor={item => item.id}
        renderItem={({ item }: ListRenderItemInfo<TaxRule>) => (
          <TaxRuleCard rule={item} onCalc={r => { setCalcRule(r); setCalcResult(null) }} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={activeTab === 'rates' ? (
          <View style={sc.empty}><Text style={sc.emptyIcon}>🧾</Text><Text style={sc.emptyTxt}>لا توجد معدلات</Text></View>
        ) : null}
        contentContainerStyle={[sc.listContent, { paddingBottom: tabBarHeight }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      />
      <CalcModal visible={!!calcRule} rule={calcRule} onClose={() => { setCalcRule(null); setCalcResult(null) }} onCalc={handleCalc} loading={calcLoading} result={calcResult} />
    </SafeAreaView>
  )
}
const sc = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.darkBg },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingTop: 4 },
  kpiRow:      { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingTop: 10 },
  rowRTL:      { flexDirection: 'row-reverse' },
  kpiCard:     { flex: 1, borderRadius: 11, borderWidth: 1.5, padding: 9, alignItems: 'center' },
  kpiLabel:    { fontSize: 8, fontWeight: '600', marginBottom: 3, textAlign: 'center' },
  kpiValue:    { fontSize: 13, fontWeight: '800' },
  tabs:        { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, marginTop: 10 },
  tab:         { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:   { borderBottomWidth: 2, borderBottomColor: '#EF4444' },
  tabTxt:      { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  tabActiveTxt:{ color: '#EF4444' },
  reportBox:   { marginHorizontal: 12, marginTop: 8, backgroundColor: COLORS.cardBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, gap: 8 },
  reportTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right', marginBottom: 8 },
  reportRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  reportMonth: { fontSize: 12, color: COLORS.textSecondary },
  reportTax:   { fontSize: 13, fontWeight: '700' },
  empty:       { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon:   { fontSize: 40 },
  emptyTxt:    { fontSize: 14, color: COLORS.textMuted },
})