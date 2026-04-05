import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, I18nManager, SafeAreaView, ActivityIndicator, RefreshControl, Alert, Modal, Animated } from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { revenueGoalsApi } from '../../services/api'

const isRTL = I18nManager.isRTL

interface Goal { id: string; targetAmount: string; currentAmount: number; currency: string; period: string; status: string; progress: number; daysLeft: number; startDate: string; endDate: string }

const DEMO_GOALS: Goal[] = [
  { id: 'g1', targetAmount: '100000', currentAmount: 67500, currency: 'SAR', period: 'monthly', status: 'in_progress', progress: 68, daysLeft: 12, startDate: '2026-04-01', endDate: '2026-04-30' },
  { id: 'g2', targetAmount: '250000', currentAmount: 195000, currency: 'SAR', period: 'quarterly', status: 'in_progress', progress: 78, daysLeft: 45, startDate: '2026-01-01', endDate: '2026-03-31' },
  { id: 'g3', targetAmount: '50000', currentAmount: 50000, currency: 'SAR', period: 'monthly', status: 'achieved', progress: 100, daysLeft: 0, startDate: '2026-03-01', endDate: '2026-03-31' },
  { id: 'g4', targetAmount: '1000000', currentAmount: 420000, currency: 'SAR', period: 'yearly', status: 'in_progress', progress: 42, daysLeft: 270, startDate: '2026-01-01', endDate: '2026-12-31' },
]

const PERIOD_AR: Record<string, string> = { monthly: 'شهري', quarterly: 'ربع سنوي', yearly: 'سنوي' }
const CARD_COLORS = [
  { bg: 'rgba(26, 86, 219, 0.1)', border: 'rgba(26, 86, 219, 0.3)', bar: COLORS.primary },
  { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)', bar: COLORS.chart.purple },
  { bg: 'rgba(5, 150, 105, 0.1)', border: 'rgba(5, 150, 105, 0.3)', bar: COLORS.success },
  { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', bar: COLORS.chart.orange },
]

function AnimatedProgress({ progress, color }: { progress: number; color: string }) {
  const anim = React.useRef(new Animated.Value(0)).current
  React.useEffect(() => { Animated.timing(anim, { toValue: Math.min(progress, 100), duration: 1000, useNativeDriver: false }).start() }, [progress])
  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] })
  return (
    <View style={st.progressBg}>
      <Animated.View style={[st.progressFill, { width, backgroundColor: color }]} />
    </View>
  )
}

export default function RevenueGoalsScreen() {
  const { t } = useTranslation()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ targetAmount: '', period: 'monthly' })

  const fetchData = useCallback(async () => {
    try { const res = await revenueGoalsApi.list(); setGoals(res.goals?.length > 0 ? res.goals : DEMO_GOALS) }
    catch (_e) { setGoals(DEMO_GOALS) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async () => {
    if (!form.targetAmount) return
    setCreating(true)
    try { await revenueGoalsApi.create({ targetAmount: parseFloat(form.targetAmount), period: form.period }); setShowCreate(false); setForm({ targetAmount: '', period: 'monthly' }); fetchData() }
    catch (e: unknown) { Alert.alert(t('common.error'), e instanceof Error ? e.message : '') }
    setCreating(false)
  }

  const handleDelete = (id: string) => {
    Alert.alert('حذف الهدف', 'هل أنت متأكد من حذف هذا الهدف؟', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => { try { await revenueGoalsApi.delete(id) } catch {} fetchData() } },
    ])
  }

  if (loading) return <SafeAreaView style={st.safe}><View style={st.center}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>

  // KPI summary
  const totalTarget = goals.reduce((s, g) => s + Number(g.targetAmount), 0)
  const totalCurrent = goals.reduce((s, g) => s + g.currentAmount, 0)
  const achievedCount = goals.filter(g => g.status === 'achieved').length
  const avgProgress = goals.length ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={COLORS.primary} />}>

        {/* Header */}
        <View style={st.header}>
          <Text style={st.headerTitle}>أهداف الإيرادات</Text>
          <TouchableOpacity style={st.createBtn} onPress={() => setShowCreate(true)}>
            <Text style={st.createBtnText}>+ هدف جديد</Text>
          </TouchableOpacity>
        </View>

        {/* KPI Summary */}
        <View style={[st.kpiRow, isRTL && st.kpiRowRTL]}>
          <View style={[st.kpiCard, { backgroundColor: 'rgba(26, 86, 219, 0.15)', borderColor: 'rgba(26, 86, 219, 0.3)' }]}>
            <Text style={st.kpiLabel}>إجمالي المستهدف</Text>
            <Text style={[st.kpiValue, { color: COLORS.primary }]}>{(totalTarget / 1000).toFixed(0)}k ر.س</Text>
          </View>
          <View style={[st.kpiCard, { backgroundColor: 'rgba(5, 150, 105, 0.15)', borderColor: 'rgba(5, 150, 105, 0.3)' }]}>
            <Text style={st.kpiLabel}>المحقق</Text>
            <Text style={[st.kpiValue, { color: COLORS.success }]}>{(totalCurrent / 1000).toFixed(0)}k ر.س</Text>
          </View>
          <View style={[st.kpiCard, { backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)' }]}>
            <Text style={st.kpiLabel}>متوسط الإنجاز</Text>
            <Text style={[st.kpiValue, { color: COLORS.chart.purple }]}>{avgProgress}%</Text>
          </View>
        </View>

        {/* Chart — comparison */}
        <View style={st.chartContainer}>
          <Text style={st.chartTitle}>مقارنة الأهداف</Text>
          <View style={st.chartBars}>
            {goals.map((g, i) => {
              const colors = CARD_COLORS[i % CARD_COLORS.length]
              return (
                <View key={g.id} style={st.chartBarGroup}>
                  <View style={st.chartBarTrack}>
                    <View style={[st.chartBarFill, { backgroundColor: colors.bar, height: `${Math.max(g.progress, 5)}%` }]} />
                  </View>
                  <Text style={[st.chartBarValue, { color: colors.bar }]}>{g.progress}%</Text>
                  <Text style={st.chartBarLabel}>{PERIOD_AR[g.period] || g.period}</Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Goal Cards */}
        {goals.map((goal, i) => {
          const colors = CARD_COLORS[i % CARD_COLORS.length]
          const isAchieved = goal.status === 'achieved'
          return (
            <View key={goal.id} style={[st.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <View style={[st.cardRow, isRTL && st.cardRowRTL]}>
                <View style={{ flex: 1 }}>
                  <Text style={st.cardPeriod}>{PERIOD_AR[goal.period] || goal.period}</Text>
                  <Text style={st.cardTarget}>{Number(goal.targetAmount).toLocaleString('en-US')} ر.س</Text>
                </View>
                <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                  {isAchieved ? (
                    <View style={st.achievedBadge}><Text style={st.achievedText}>✅ تم التحقيق</Text></View>
                  ) : (
                    <Text style={st.daysText}>{goal.daysLeft} يوم متبقي</Text>
                  )}
                </View>
              </View>

              {/* Animated Progress Bar */}
              <AnimatedProgress progress={goal.progress} color={colors.bar} />

              <View style={[st.progressRow, isRTL && st.cardRowRTL]}>
                <Text style={st.progressText}>{goal.currentAmount.toLocaleString('en-US')} ر.س</Text>
                <Text style={[st.progressPercent, { color: colors.bar }]}>{goal.progress}%</Text>
              </View>

              {/* Mini chart inside card */}
              <View style={st.miniChart}>
                <View style={[st.miniBar, { width: `${goal.progress}%`, backgroundColor: colors.bar }]} />
                <View style={[st.miniBar, { width: `${100 - goal.progress}%`, backgroundColor: COLORS.surfaceBg }]} />
              </View>
              <View style={[st.miniLabels, isRTL && st.cardRowRTL]}>
                <Text style={[st.miniLabel, { color: colors.bar }]}>المحقق</Text>
                <Text style={[st.miniLabel, { color: COLORS.textMuted }]}>المتبقي</Text>
              </View>

              {!isAchieved && (
                <TouchableOpacity style={st.deleteBtn} onPress={() => handleDelete(goal.id)}>
                  <Text style={st.deleteBtnText}>🗑 حذف</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        })}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={st.modalOverlay}><View style={st.modal}>
          <Text style={st.modalTitle}>هدف إيرادات جديد</Text>
          <TextInput placeholder="المبلغ المستهدف (ر.س)" value={form.targetAmount} onChangeText={v => setForm({...form, targetAmount: v})} style={st.input} placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" textAlign="right" />
          <View style={st.intervalRow}>
            {(['monthly', 'quarterly', 'yearly'] as const).map(p => (
              <TouchableOpacity key={p} style={[st.intervalBtn, form.period === p && st.intervalActive]} onPress={() => setForm({...form, period: p})}>
                <Text style={[st.intervalText, form.period === p && st.intervalTextActive]}>{PERIOD_AR[p]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={st.modalActions}>
            <TouchableOpacity style={st.modalCancel} onPress={() => setShowCreate(false)}><Text style={{ color: COLORS.textSecondary }}>{t('common.cancel')}</Text></TouchableOpacity>
            <TouchableOpacity style={st.modalSubmit} onPress={handleCreate} disabled={creating}><Text style={{ color: COLORS.white, fontWeight: '700' }}>{creating ? '...' : 'إنشاء'}</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.darkBg },
  scroll: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  header: { flexDirection: isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, backgroundColor: 'rgba(245, 158, 11, 0.12)', borderBottomWidth: 1, borderBottomColor: 'rgba(245, 158, 11, 0.3)' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  createBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  createBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  kpiRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  kpiRowRTL: { flexDirection: 'row-reverse' },
  kpiCard: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 10, gap: 4 },
  kpiLabel: { fontSize: 9, fontWeight: '600', color: COLORS.textMuted, textAlign: isRTL ? 'right' : 'left' },
  kpiValue: { fontSize: 16, fontWeight: '800' },
  // Chart
  chartContainer: { backgroundColor: COLORS.surfaceBg, marginHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 12 },
  chartTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' },
  chartBars: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 100 },
  chartBarGroup: { alignItems: 'center', flex: 1, gap: 4 },
  chartBarTrack: { width: 28, height: 80, backgroundColor: COLORS.cardBg, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  chartBarFill: { width: '100%', borderRadius: 6 },
  chartBarValue: { fontSize: 11, fontWeight: '800' },
  chartBarLabel: { fontSize: 9, fontWeight: '600', color: COLORS.textSecondary },
  // Cards
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 14, borderWidth: 1, padding: 16 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardRowRTL: { flexDirection: 'row-reverse' },
  cardPeriod: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 4, textAlign: isRTL ? 'right' : 'left' },
  cardTarget: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  daysText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  achievedBadge: { backgroundColor: COLORS.successBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  achievedText: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  progressBg: { height: 10, backgroundColor: COLORS.surfaceBg, borderRadius: 5, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: 10, borderRadius: 5 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressText: { fontSize: 12, color: COLORS.textSecondary },
  progressPercent: { fontSize: 13, fontWeight: '800' },
  miniChart: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8, gap: 2 },
  miniBar: { height: 6, borderRadius: 3 },
  miniLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  miniLabel: { fontSize: 9, fontWeight: '600' },
  deleteBtn: { marginTop: 10, alignSelf: isRTL ? 'flex-end' : 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.dangerBg },
  deleteBtnText: { fontSize: 12, color: COLORS.danger, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, color: COLORS.textPrimary, fontSize: 15, marginBottom: 12 },
  intervalRow: { flexDirection: isRTL ? 'row' : 'row-reverse', gap: 8, marginBottom: 12 },
  intervalBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.surfaceBg },
  intervalActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  intervalText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  intervalTextActive: { color: COLORS.white },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surfaceBg },
  modalSubmit: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary },
})