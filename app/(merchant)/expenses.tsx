// app/(merchant)/expenses.tsx
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  I18nManager, SafeAreaView, ActivityIndicator, RefreshControl, Alert, Modal,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { expensesApi } from '../../services/api'
import { InnerHeader } from '../../components/InnerHeader'

const isRTL = I18nManager.isRTL
const CATEGORIES = ['rent', 'salary', 'supplies', 'marketing', 'utilities', 'other'] as const

const CAT_ICONS: Record<string, string> = {
  rent: '🏢', salary: '💼', supplies: '📦',
  marketing: '📢', utilities: '⚡', other: '📋',
}

const DEMO_EXPENSES = [
  { id: 'exp-001', amount: '4500', currency: 'SAR', category: 'salary',    title: 'رواتب الموظفين - مارس',        date: '2026-03-28' },
  { id: 'exp-002', amount: '2200', currency: 'SAR', category: 'rent',      title: 'إيجار المكتب - أبريل',         date: '2026-04-01' },
  { id: 'exp-003', amount: '850',  currency: 'SAR', category: 'marketing', title: 'حملة إعلانية - انستغرام',      date: '2026-03-25' },
  { id: 'exp-004', amount: '320',  currency: 'SAR', category: 'utilities', title: 'فاتورة الكهرباء والانترنت',    date: '2026-03-20' },
  { id: 'exp-005', amount: '180',  currency: 'SAR', category: 'supplies',  title: 'مستلزمات مكتبية',             date: '2026-03-15' },
  { id: 'exp-006', amount: '1200', currency: 'SAR', category: 'other',     title: 'صيانة الأجهزة والمعدات',      date: '2026-03-10' },
]

const DEMO_SUMMARY = {
  totalRevenue: 28500,
  totalExpenses: 9250,
  netProfit: 19250,
}

const CARD_BG = [
  { bg: 'rgba(26, 86, 219, 0.10)',  border: 'rgba(26, 86, 219, 0.25)' },
  { bg: 'rgba(139, 92, 246, 0.10)', border: 'rgba(139, 92, 246, 0.25)' },
  { bg: 'rgba(13, 148, 136, 0.10)', border: 'rgba(13, 148, 136, 0.25)' },
  { bg: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.25)' },
  { bg: 'rgba(99, 102, 241, 0.10)', border: 'rgba(99, 102, 241, 0.25)' },
  { bg: 'rgba(236, 72, 153, 0.10)', border: 'rgba(236, 72, 153, 0.25)' },
]

export default function ExpensesScreen() {
  const { t } = useTranslation()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ amount: '', title: '', category: 'other' })

  const fetchData = useCallback(async () => {
    try {
      const res = await expensesApi.list()
      if (res?.expenses?.length > 0) {
        setData(res)
      } else {
        setData({ expenses: DEMO_EXPENSES, summary: DEMO_SUMMARY })
      }
    } catch (_e) {
      setData({ expenses: DEMO_EXPENSES, summary: DEMO_SUMMARY })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async () => {
    if (!form.amount || !form.title) return
    setCreating(true)
    try {
      await expensesApi.create({ amount: parseFloat(form.amount), category: form.category, title: form.title })
      setShowCreate(false)
      setForm({ amount: '', title: '', category: 'other' })
      fetchData()
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : '')
    }
    setCreating(false)
  }

  if (loading) {
    return (
      <SafeAreaView style={st.safe}>
        <InnerHeader title={t('expenses.title')} accentColor="#10B981" />
        <View style={st.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    )
  }

  const summary  = data?.summary  || DEMO_SUMMARY
  const expenses = data?.expenses || DEMO_EXPENSES
  const maxKpi   = Math.max(summary.totalRevenue, summary.totalExpenses, summary.netProfit, 1)

  return (
    <SafeAreaView style={st.safe}>
      {/* ── InnerHeader ── */}
      <InnerHeader title={t('expenses.title')} accentColor="#10B981" />

      <ScrollView
        contentContainerStyle={st.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* زر إضافة مصروف */}
        <View style={st.addRow}>
          <TouchableOpacity style={st.createBtn} onPress={() => setShowCreate(true)}>
            <Text style={st.createBtnText}>+ {t('expenses.add')}</Text>
          </TouchableOpacity>
        </View>

        {/* KPI */}
        <View style={st.kpiWrapper}>
          <View style={[st.kpiRow, isRTL && st.kpiRowRTL]}>
            <View style={[st.kpiCard, { backgroundColor: 'rgba(5, 150, 105, 0.15)', borderColor: 'rgba(5, 150, 105, 0.3)' }]}>
              <Text style={st.kpiLabel}>{t('expenses.total_revenue')}</Text>
              <Text style={[st.kpiValue, { color: COLORS.success }]}>{summary.totalRevenue.toLocaleString('en-US')} ر.س</Text>
            </View>
            <View style={[st.kpiCard, { backgroundColor: 'rgba(220, 38, 38, 0.15)', borderColor: 'rgba(220, 38, 38, 0.3)' }]}>
              <Text style={st.kpiLabel}>{t('expenses.total_expenses')}</Text>
              <Text style={[st.kpiValue, { color: COLORS.danger }]}>{summary.totalExpenses.toLocaleString('en-US')} ر.س</Text>
            </View>
            <View style={[st.kpiCard, { backgroundColor: 'rgba(26, 86, 219, 0.15)', borderColor: 'rgba(26, 86, 219, 0.3)' }]}>
              <Text style={st.kpiLabel}>{t('expenses.net_profit')}</Text>
              <Text style={[st.kpiValue, { color: summary.netProfit >= 0 ? COLORS.primaryLight : COLORS.danger }]}>
                {summary.netProfit.toLocaleString('en-US')} ر.س
              </Text>
            </View>
          </View>
        </View>

        {/* Chart */}
        <View style={st.chartContainer}>
          {[
            { label: t('expenses.total_revenue'),  value: summary.totalRevenue,  color: COLORS.success },
            { label: t('expenses.total_expenses'), value: summary.totalExpenses, color: COLORS.danger },
            { label: t('expenses.net_profit'),     value: Math.abs(summary.netProfit), color: COLORS.primaryLight },
          ].map((bar, i) => (
            <View key={i} style={st.chartBarGroup}>
              <View style={st.chartBarTrack}>
                <View style={[st.chartBarFill, { backgroundColor: bar.color, height: `${Math.max((bar.value / maxKpi) * 100, 8)}%` }]} />
              </View>
              <Text style={[st.chartBarLabel, { color: bar.color }]}>{bar.label}</Text>
            </View>
          ))}
        </View>

        {/* Expenses list */}
        {expenses.map((exp: any, i: number) => {
          const colors = CARD_BG[i % CARD_BG.length]
          return (
            <View key={exp.id} style={[st.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <View style={[st.cardRow, isRTL && st.cardRowRTL]}>
                <View style={st.cardIcon}>
                  <Text style={{ fontSize: 18 }}>{CAT_ICONS[exp.category] || '📋'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.cardTitle}>{exp.title}</Text>
                  <Text style={st.cardCat}>
                    {t(`expenses.${exp.category}`) || exp.category} · {new Date(exp.date).toLocaleDateString('ar-SA')}
                  </Text>
                </View>
                <Text style={st.cardAmount}>-{Number(exp.amount).toLocaleString('en-US')} ر.س</Text>
              </View>
            </View>
          )
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal إضافة مصروف */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={st.modal}>
            <Text style={st.modalTitle}>{t('expenses.add')}</Text>
            <TextInput
              placeholder={t('expenses.title')}
              value={form.title}
              onChangeText={v => setForm({ ...form, title: v })}
              style={st.input}
              placeholderTextColor={COLORS.textMuted}
              textAlign="right"
            />
            <TextInput
              placeholder="المبلغ"
              value={form.amount}
              onChangeText={v => setForm({ ...form, amount: v })}
              style={st.input}
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
              textAlign="right"
            />
            <View style={st.catGrid}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[st.catBtn, form.category === c && st.catBtnActive]}
                  onPress={() => setForm({ ...form, category: c })}
                >
                  <Text style={[st.catBtnText, form.category === c && st.catBtnTextActive]}>
                    {CAT_ICONS[c]} {t(`expenses.${c}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={st.modalActions}>
              <TouchableOpacity style={st.modalCancel} onPress={() => setShowCreate(false)}>
                <Text style={{ color: COLORS.textSecondary }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalSubmit} onPress={handleCreate} disabled={creating}>
                <Text style={{ color: COLORS.white, fontWeight: '700' }}>
                  {creating ? '...' : t('expenses.add')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.darkBg },
  scroll:  { paddingBottom: 40 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  addRow:  { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, alignItems: isRTL ? 'flex-start' : 'flex-end' },
  createBtn:     { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  createBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  kpiWrapper: { paddingHorizontal: 12, paddingVertical: 12 },
  kpiRow:    { flexDirection: 'row', gap: 8 },
  kpiRowRTL: { flexDirection: 'row-reverse' },
  kpiCard:   { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 10, gap: 4 },
  kpiLabel:  { fontSize: 9, fontWeight: '600', color: COLORS.textMuted },
  kpiValue:  { fontSize: 14, fontWeight: '800' },
  chartContainer: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-around', alignItems: 'flex-end', backgroundColor: COLORS.surfaceBg, marginHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, height: 130, marginBottom: 12 },
  chartBarGroup:  { alignItems: 'center', flex: 1, gap: 4 },
  chartBarTrack:  { width: 28, height: 70, backgroundColor: COLORS.cardBg, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  chartBarFill:   { width: '100%', borderRadius: 6 },
  chartBarLabel:  { fontSize: 8, fontWeight: '700', textAlign: 'center' },
  card:     { marginHorizontal: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1, padding: 14 },
  cardRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardRowRTL: { flexDirection: 'row-reverse' },
  cardIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.surfaceBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  cardTitle:  { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  cardCat:    { fontSize: 11, color: COLORS.textMuted },
  cardAmount: { fontSize: 15, fontWeight: '700', color: COLORS.danger },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal:        { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle:   { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 20, textAlign: 'center' },
  input:        { backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, color: COLORS.textPrimary, fontSize: 15, marginBottom: 12 },
  catGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  catBtn:       { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceBg },
  catBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catBtnText:       { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  catBtnTextActive: { color: COLORS.white },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel:  { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surfaceBg },
  modalSubmit:  { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary },
})