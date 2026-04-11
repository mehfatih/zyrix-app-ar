// ─────────────────────────────────────────────────────────────
// app/(merchant)/commission-engine.tsx
// Rules + Calculate + Partners + Summary
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
import { commissionApi } from '../../services/api'
import { InnerHeader } from '../../components/InnerHeader'
import { useToast } from '../../hooks/useToast'

const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────────────────

interface CommissionRule {
  id: string; name: string; type: string
  rate: number | null; fixedAmount: number | null
  tiers: any; appliesTo: string; currency: string; isActive: boolean
}

interface CommissionPartner {
  id: string; name: string; email: string | null
  splitPercent: number; totalEarned: number; isActive: boolean
}

interface Summary {
  totalBase: number; totalCommission: number; totalNet: number
  calcCount: number; commissionRate: number
  partners: { id: string; name: string; splitPercent: number; totalEarned: number }[]
}

// ─── Type Config ──────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  PERCENTAGE: { label: 'نسبة مئوية', color: '#6366F1', icon: '%' },
  FIXED:      { label: 'مبلغ ثابت',  color: '#10B981', icon: '₊' },
  TIERED:     { label: 'متدرج',      color: '#F59E0B', icon: '📊' },
}

// ─── Summary Card ─────────────────────────────────────────────

function SummaryCard({ summary }: { summary: Summary | null }) {
  if (!summary) return null
  return (
    <View style={smS.wrap}>
      <View style={[smS.head, isRTL && { flexDirection: 'row-reverse' }]}>
        <View style={[smS.dot, { backgroundColor: '#6366F1' }]} />
        <Text style={smS.title}>ملخص العمولات</Text>
      </View>
      <View style={smS.row}>
        {[
          { label: 'إجمالي القاعدة', value: `${summary.totalBase.toLocaleString()} ر.س`,      color: COLORS.textPrimary },
          { label: 'العمولات',       value: `${summary.totalCommission.toLocaleString()} ر.س`, color: '#EF4444' },
          { label: 'الصافي',         value: `${summary.totalNet.toLocaleString()} ر.س`,        color: '#10B981' },
          { label: 'معدل العمولة',   value: `${summary.commissionRate}%`,                      color: '#6366F1' },
        ].map((m, i) => (
          <View key={i} style={smS.metric}>
            <Text style={smS.metricLabel}>{m.label}</Text>
            <Text style={[smS.metricVal, { color: m.color }]}>{m.value}</Text>
          </View>
        ))}
      </View>
      {summary.partners.length > 0 && (
        <View style={smS.partners}>
          <Text style={smS.partnerTitle}>الشركاء</Text>
          {summary.partners.map(p => (
            <View key={p.id} style={[smS.partnerRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={smS.partnerName}>{p.name}</Text>
              <Text style={smS.partnerEarned}>{p.totalEarned.toLocaleString()} ر.س</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
const smS = StyleSheet.create({
  wrap:        { marginHorizontal: 12, marginBottom: 10, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.4)', backgroundColor: COLORS.cardBg, padding: 12 },
  head:        { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  dot:         { width: 7, height: 7, borderRadius: 4 },
  title:       { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  row:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  metric:      { width: '47%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 8 },
  metricLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600', marginBottom: 3, textAlign: 'right' },
  metricVal:   { fontSize: 14, fontWeight: '800', textAlign: 'right' },
  partners:    { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, gap: 7 },
  partnerTitle:{ fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'right', marginBottom: 4 },
  partnerRow:  { flexDirection: 'row', justifyContent: 'space-between' },
  partnerName: { fontSize: 12, color: COLORS.textPrimary },
  partnerEarned: { fontSize: 12, fontWeight: '700', color: '#10B981' },
})

// ─── Rule Card ────────────────────────────────────────────────

function RuleCard({ rule, onCalc, onDelete }: {
  rule: CommissionRule
  onCalc: (rule: CommissionRule) => void
  onDelete: (id: string) => void
}) {
  const cfg = TYPE_CONFIG[rule.type] ?? TYPE_CONFIG.PERCENTAGE
  const ruleValue = rule.type === 'PERCENTAGE'
    ? `${((rule.rate ?? 0) * 100).toFixed(1)}%`
    : rule.type === 'FIXED'
    ? `${rule.fixedAmount?.toLocaleString()} ${rule.currency}`
    : `متدرج`

  return (
    <View style={[rC.card, { backgroundColor: cfg.color + '12', borderColor: cfg.color + '35' }]}>
      <View style={[rC.topRow, isRTL && rC.rowRTL]}>
        <View style={{ flex: 1 }}>
          <Text style={[rC.name, { color: cfg.color }]}>{rule.name}</Text>
          <View style={[rC.typeBadge, { backgroundColor: cfg.color + '20' }]}>
            <Text style={[rC.typeTxt, { color: cfg.color }]}>{cfg.icon} {cfg.label}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[rC.value, { color: cfg.color }]}>{ruleValue}</Text>
          <Text style={rC.applies}>{rule.appliesTo}</Text>
        </View>
      </View>
      <View style={[rC.actions, isRTL && rC.rowRTL]}>
        <TouchableOpacity
          style={[rC.btn, { backgroundColor: cfg.color + '20', borderColor: cfg.color + '50' }]}
          onPress={() => onCalc(rule)}
        >
          <Text style={[rC.btnTxt, { color: cfg.color }]}>🧮 احسب</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[rC.btn, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)' }]}
          onPress={() => onDelete(rule.id)}
        >
          <Text style={[rC.btnTxt, { color: '#EF4444' }]}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
const rC = StyleSheet.create({
  card:      { marginHorizontal: 12, marginBottom: 10, borderRadius: 13, borderWidth: 1.5, padding: 13 },
  topRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  rowRTL:    { flexDirection: 'row-reverse' },
  name:      { fontSize: 14, fontWeight: '800', marginBottom: 5, textAlign: 'right' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-end' },
  typeTxt:   { fontSize: 10, fontWeight: '700' },
  value:     { fontSize: 18, fontWeight: '800', marginBottom: 3 },
  applies:   { fontSize: 10, color: COLORS.textMuted },
  actions:   { flexDirection: 'row', gap: 8 },
  btn:       { flex: 1, paddingVertical: 9, borderRadius: 9, borderWidth: 1, alignItems: 'center' },
  btnTxt:    { fontSize: 12, fontWeight: '700' },
})

// ─── Create Rule Modal ────────────────────────────────────────

function CreateRuleModal({ visible, onClose, onCreate, loading }: {
  visible: boolean; onClose: () => void; onCreate: (data: any) => void; loading: boolean
}) {
  const [name, setName]   = useState('')
  const [type, setType]   = useState('PERCENTAGE')
  const [rate, setRate]   = useState('')
  const [fixed, setFixed] = useState('')

  const reset = () => { setName(''); setType('PERCENTAGE'); setRate(''); setFixed('') }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { onClose(); reset() }}>
      <View style={mdS.overlay}>
        <View style={mdS.container}>
          <View style={mdS.head}>
            <Text style={mdS.title}>+ قاعدة عمولة جديدة</Text>
            <TouchableOpacity onPress={() => { onClose(); reset() }} style={mdS.closeBtn}>
              <Text style={mdS.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={mdS.body}>
            <TextInput placeholder="اسم القاعدة *" value={name} onChangeText={setName}
              style={mdS.input} placeholderTextColor={COLORS.textMuted} textAlign={isRTL ? 'right' : 'left'} />

            <Text style={mdS.label}>النوع</Text>
            <View style={mdS.typeRow}>
              {(['PERCENTAGE', 'FIXED', 'TIERED'] as const).map(t => {
                const cfg = TYPE_CONFIG[t]
                return (
                  <TouchableOpacity key={t}
                    style={[mdS.typeBtn, type === t && { backgroundColor: cfg.color + '25', borderColor: cfg.color }]}
                    onPress={() => setType(t)}
                  >
                    <Text style={[mdS.typeBtnTxt, type === t && { color: cfg.color }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {type === 'PERCENTAGE' && (
              <TextInput placeholder="النسبة (مثال: 0.05 = 5%)" value={rate} onChangeText={setRate}
                style={mdS.input} keyboardType="decimal-pad" placeholderTextColor={COLORS.textMuted}
                textAlign={isRTL ? 'right' : 'left'} />
            )}
            {type === 'FIXED' && (
              <TextInput placeholder="المبلغ الثابت" value={fixed} onChangeText={setFixed}
                style={mdS.input} keyboardType="decimal-pad" placeholderTextColor={COLORS.textMuted}
                textAlign={isRTL ? 'right' : 'left'} />
            )}
            {type === 'TIERED' && (
              <View style={mdS.tierNote}>
                <Text style={mdS.tierNoteTxt}>
                  💡 الشرائح المتدرجة تُضاف تلقائياً بثلاث مستويات: 0-1000 (3%), 1001-5000 (2%), 5001+ (1.5%)
                </Text>
              </View>
            )}

            <View style={[mdS.actions, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={mdS.cancelBtn} onPress={() => { onClose(); reset() }}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mdS.submitBtn, loading && { opacity: 0.6 }]}
                onPress={() => {
                  if (!name.trim()) return
                  const tiers = type === 'TIERED'
                    ? [{ min: 0, max: 1000, rate: 0.03 }, { min: 1001, max: 5000, rate: 0.02 }, { min: 5001, max: null, rate: 0.015 }]
                    : undefined
                  onCreate({
                    name: name.trim(), type,
                    rate: type === 'PERCENTAGE' ? parseFloat(rate) : undefined,
                    fixedAmount: type === 'FIXED' ? parseFloat(fixed) : undefined,
                    tiers,
                  })
                  reset()
                }}
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

// ─── Calculate Modal ──────────────────────────────────────────

function CalcModal({ visible, rule, onClose, onCalc, loading, result }: {
  visible: boolean; rule: CommissionRule | null; onClose: () => void
  onCalc: (amount: number) => void; loading: boolean
  result: { baseAmount: number; commission: number; netAmount: number; currency: string } | null
}) {
  const [amount, setAmount] = useState('')
  if (!rule) return null

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mdS.overlay}>
        <View style={mdS.container}>
          <View style={mdS.head}>
            <Text style={mdS.title}>🧮 حساب العمولة</Text>
            <TouchableOpacity onPress={onClose} style={mdS.closeBtn}>
              <Text style={mdS.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={mdS.body}>
            <Text style={[mdS.label, { marginBottom: 4 }]}>القاعدة: {rule.name}</Text>
            <TextInput placeholder="المبلغ الأساسي *" value={amount} onChangeText={setAmount}
              style={mdS.input} keyboardType="decimal-pad" placeholderTextColor={COLORS.textMuted}
              textAlign={isRTL ? 'right' : 'left'} />

            {result && (
              <View style={calcS.resultBox}>
                {[
                  { label: 'المبلغ الأساسي', val: `${result.baseAmount.toLocaleString()} ${result.currency}`, color: COLORS.textPrimary },
                  { label: 'العمولة',        val: `${result.commission.toLocaleString()} ${result.currency}`, color: '#EF4444' },
                  { label: 'الصافي',         val: `${result.netAmount.toLocaleString()} ${result.currency}`,  color: '#10B981' },
                ].map((r, i) => (
                  <View key={i} style={[calcS.row, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Text style={calcS.label}>{r.label}</Text>
                    <Text style={[calcS.val, { color: r.color }]}>{r.val}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={[mdS.actions, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={mdS.cancelBtn} onPress={onClose}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>إغلاق</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mdS.submitBtn, { backgroundColor: '#6366F1' }, loading && { opacity: 0.6 }]}
                onPress={() => { if (amount) onCalc(parseFloat(amount)) }}
                disabled={loading}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>{loading ? '...' : 'احسب'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
const calcS = StyleSheet.create({
  resultBox: { backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)', padding: 12, gap: 8 },
  row:       { flexDirection: 'row', justifyContent: 'space-between' },
  label:     { fontSize: 12, color: COLORS.textMuted },
  val:       { fontSize: 14, fontWeight: '800' },
})

const mdS = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container: { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  head:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:     { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn:  { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeTxt:  { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  body:      { padding: 16, gap: 10 },
  label:     { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'right' },
  input:     { backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14 },
  typeRow:   { flexDirection: 'row', gap: 7 },
  typeBtn:   { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  typeBtnTxt:{ fontSize: 10, color: COLORS.textMuted, fontWeight: '700' },
  tierNote:  { backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  tierNoteTxt: { fontSize: 11, color: '#F59E0B', textAlign: 'right', lineHeight: 17 },
  actions:   { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surfaceBg },
  submitBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary },
})

// ─── Main Screen ──────────────────────────────────────────────

export default function CommissionEngineScreen() {
  const tabBarHeight = useTabBarHeight()
  const { showToast } = useToast()

  const [rules, setRules]       = useState<CommissionRule[]>([])
  const [summary, setSummary]   = useState<Summary | null>(null)
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [calcRule, setCalcRule] = useState<CommissionRule | null>(null)
  const [calcLoading, setCalcLoading] = useState(false)
  const [calcResult, setCalcResult] = useState<any>(null)

  const fetchData = useCallback(async () => {
    try {
      const [rulesRes, summaryRes] = await Promise.allSettled([
        commissionApi.listRules(),
        commissionApi.getSummary(),
      ])
      if (rulesRes.status === 'fulfilled')   setRules(rulesRes.value?.data ?? [])
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value?.data ?? null)
    } catch (_e) {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async (data: any) => {
    setCreating(true)
    try {
      await commissionApi.createRule(data)
      setShowCreate(false)
      showToast('تم إنشاء القاعدة', 'success')
      fetchData()
    } catch { showToast('حدث خطأ', 'error') }
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await commissionApi.deleteRule(id)
      showToast('تم الحذف', 'success')
      fetchData()
    } catch { showToast('حدث خطأ', 'error') }
  }

  const handleCalc = async (amount: number) => {
    if (!calcRule) return
    setCalcLoading(true)
    try {
      const res = await commissionApi.calculate(calcRule.id, amount)
      setCalcResult(res?.data ?? null)
    } catch { showToast('حدث خطأ في الحساب', 'error') }
    setCalcLoading(false)
  }

  if (loading) {
    return (
      <SafeAreaView style={sc.safe} edges={['top']}>
        <InnerHeader title="محرك العمولات" accentColor="#6366F1" />
        <View style={sc.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      </SafeAreaView>
    )
  }

  const renderHeader = () => (
    <>
      <SummaryCard summary={summary} />
      <View style={[sc.listHeader, isRTL && sc.rowRTL]}>
        <Text style={sc.listTitle}>قواعد العمولات ({rules.length})</Text>
        <TouchableOpacity style={sc.createBtn} onPress={() => setShowCreate(true)}>
          <Text style={sc.createBtnTxt}>+ قاعدة جديدة</Text>
        </TouchableOpacity>
      </View>
    </>
  )

  return (
    <SafeAreaView style={sc.safe} edges={['top']}>
      <InnerHeader title="محرك العمولات" accentColor="#6366F1" />
      <FlatList
        data={rules}
        keyExtractor={item => item.id}
        renderItem={({ item }: ListRenderItemInfo<CommissionRule>) => (
          <RuleCard rule={item} onCalc={r => { setCalcRule(r); setCalcResult(null) }} onDelete={handleDelete} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={sc.empty}>
            <Text style={sc.emptyIcon}>💰</Text>
            <Text style={sc.emptyTxt}>لا توجد قواعد عمولات بعد</Text>
          </View>
        }
        contentContainerStyle={[sc.listContent, { paddingBottom: tabBarHeight }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      />
      <CreateRuleModal visible={showCreate} onClose={() => setShowCreate(false)} onCreate={handleCreate} loading={creating} />
      <CalcModal visible={!!calcRule} rule={calcRule} onClose={() => { setCalcRule(null); setCalcResult(null) }} onCalc={handleCalc} loading={calcLoading} result={calcResult} />
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
  createBtn:   { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9 },
  createBtnTxt:{ color: COLORS.white, fontSize: 12, fontWeight: '700' },
  empty:       { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon:   { fontSize: 40 },
  emptyTxt:    { fontSize: 14, color: COLORS.textMuted },
})