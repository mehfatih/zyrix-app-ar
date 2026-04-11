// ─────────────────────────────────────────────────────────────
// app/(merchant)/expenses.tsx — Elite (Analytics + Auto Import + Net Profit)
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, I18nManager, ActivityIndicator, Alert, RefreshControl,
  Modal, ListRenderItemInfo,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { expensesApi } from '../../services/api'
import { InnerHeader } from '../../components/InnerHeader'

const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────────────────

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  currency: string
  date: string
}

interface Analytics {
  topCategory: string | null
  totalExpenses: number
  totalRevenue: number
  netProfit: number
  profitMargin: number
  categoryBreakdown: Record<string, { total: number; count: number; percent: number }>
  calculatedAt?: string
}

// ─── Constants ────────────────────────────────────────────────

const CAT_ICONS: Record<string, string> = {
  rent: '🏢', salary: '💼', supplies: '📦',
  marketing: '📢', utilities: '⚡', other: '📋',
}

const CAT_AR: Record<string, string> = {
  rent: 'إيجار', salary: 'رواتب', supplies: 'مستلزمات',
  marketing: 'تسويق', utilities: 'مرافق', other: 'أخرى',
}

const CAT_COLORS: Record<string, string> = {
  rent: '#6366F1', salary: '#F59E0B', supplies: '#06B6D4',
  marketing: '#EC4899', utilities: '#10B981', other: '#94A3B8',
}

const CARD_ACCENTS = ['#1A56DB', '#8B5CF6', '#0D9488', '#F59E0B', '#06B6D4', '#EC4899']

const CATEGORIES = ['rent', 'salary', 'supplies', 'marketing', 'utilities', 'other'] as const

// ─── Analytics Card ───────────────────────────────────────────

function AnalyticsCard({ analytics, onRefresh, onAutoImport, loading }: {
  analytics: Analytics | null
  onRefresh: () => void
  onAutoImport: () => void
  loading: boolean
}) {
  if (!analytics) return null

  const isProfit = analytics.netProfit >= 0

  return (
    <View style={anS.wrap}>
      {/* Header */}
      <View style={[anS.head, isRTL && { flexDirection: 'row-reverse' }]}>
        <View style={[anS.dot, { backgroundColor: '#10B981' }]} />
        <Text style={anS.title}>تحليل المصاريف الذكي</Text>
        <TouchableOpacity
          style={anS.refreshBtn}
          onPress={onRefresh}
          disabled={loading}
        >
          <Text style={anS.refreshTxt}>{loading ? '...' : '🔄'}</Text>
        </TouchableOpacity>
      </View>

      {/* Net Profit Row */}
      <View style={[anS.profitRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <View style={[anS.profitCard, { backgroundColor: isProfit ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', borderColor: isProfit ? '#10B981' : '#EF4444' }]}>
          <Text style={[anS.profitLabel, { color: isProfit ? '#10B981' : '#EF4444' }]}>
            {isProfit ? '📈 صافي الربح' : '📉 صافي الخسارة'}
          </Text>
          <Text style={[anS.profitVal, { color: isProfit ? '#10B981' : '#EF4444' }]}>
            {analytics.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} ر.س
          </Text>
          <Text style={[anS.marginTxt, { color: isProfit ? '#10B981' : '#EF4444' }]}>
            هامش {analytics.profitMargin}%
          </Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          {[
            { label: 'الإيراد', value: analytics.totalRevenue, color: '#10B981' },
            { label: 'المصاريف', value: analytics.totalExpenses, color: '#EF4444' },
          ].map((item, i) => (
            <View key={i} style={[anS.metricRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={[anS.metricLabel, { color: item.color }]}>{item.label}</Text>
              <Text style={[anS.metricVal, { color: item.color }]}>
                {item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Category Breakdown */}
      {Object.keys(analytics.categoryBreakdown).length > 0 && (
        <View style={anS.breakdown}>
          {Object.entries(analytics.categoryBreakdown)
            .sort(([, a], [, b]) => b.total - a.total)
            .slice(0, 4)
            .map(([cat, data]) => {
              const color = CAT_COLORS[cat] ?? '#94A3B8'
              return (
                <View key={cat} style={anS.catRow}>
                  <Text style={anS.catIcon}>{CAT_ICONS[cat] ?? '📋'}</Text>
                  <View style={anS.catBarWrap}>
                    <View style={[anS.catBarFill, { width: `${data.percent}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[anS.catPct, { color }]}>{data.percent}%</Text>
                </View>
              )
            })}
        </View>
      )}

      {/* Auto Import */}
      <TouchableOpacity
        style={[anS.importBtn, loading && { opacity: 0.6 }]}
        onPress={onAutoImport}
        disabled={loading}
      >
        <Text style={anS.importTxt}>
          {loading ? 'جاري الاستيراد...' : '🔗 استيراد تلقائي من المعاملات'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}
const anS = StyleSheet.create({
  wrap:        { marginHorizontal: 12, marginBottom: 10, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(16,185,129,0.35)', backgroundColor: COLORS.cardBg, overflow: 'hidden', padding: 12 },
  head:        { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  dot:         { width: 7, height: 7, borderRadius: 4 },
  title:       { flex: 1, fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  refreshBtn:  { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  refreshTxt:  { fontSize: 14 },
  profitRow:   { flexDirection: 'row', gap: 10, marginBottom: 12 },
  profitCard:  { width: 120, borderRadius: 10, borderWidth: 1.5, padding: 10, alignItems: 'center', gap: 3 },
  profitLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  profitVal:   { fontSize: 16, fontWeight: '800' },
  marginTxt:   { fontSize: 9, fontWeight: '600' },
  metricRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  metricLabel: { fontSize: 11, fontWeight: '600' },
  metricVal:   { fontSize: 13, fontWeight: '800' },
  breakdown:   { gap: 7, marginBottom: 12 },
  catRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catIcon:     { fontSize: 14, width: 20, textAlign: 'center' },
  catBarWrap:  { flex: 1, height: 7, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' },
  catBarFill:  { height: '100%', borderRadius: 4 },
  catPct:      { fontSize: 10, fontWeight: '800', width: 30, textAlign: 'right' },
  importBtn:   { backgroundColor: 'rgba(6,182,212,0.15)', borderRadius: 9, borderWidth: 1, borderColor: 'rgba(6,182,212,0.35)', paddingVertical: 10, alignItems: 'center' },
  importTxt:   { fontSize: 12, fontWeight: '700', color: '#06B6D4' },
})

// ─── Expense Card ─────────────────────────────────────────────

function ExpenseCard({ exp, accent, onDelete }: {
  exp: Expense; accent: string; onDelete: (id: string) => void
}) {
  const color = CAT_COLORS[exp.category] ?? accent
  return (
    <View style={[eC.card, { backgroundColor: accent + '12', borderColor: accent + '35' }]}>
      <View style={[eC.row, isRTL && eC.rowRTL]}>
        <View style={[eC.iconWrap, { backgroundColor: color + '20', borderColor: color + '40' }]}>
          <Text style={eC.icon}>{CAT_ICONS[exp.category] ?? '📋'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={eC.desc} numberOfLines={1}>{exp.description}</Text>
          <Text style={eC.meta}>
            {CAT_AR[exp.category] ?? exp.category} · {new Date(exp.date).toLocaleDateString('ar-SA')}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={eC.amount}>-{Number(exp.amount).toLocaleString()} {exp.currency === 'SAR' ? 'ر.س' : exp.currency}</Text>
          <TouchableOpacity onPress={() => onDelete(exp.id)} style={eC.deleteBtn}>
            <Text style={eC.deleteTxt}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}
const eC = StyleSheet.create({
  card:      { marginHorizontal: 12, marginBottom: 8, borderRadius: 12, borderWidth: 1.5, padding: 13 },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowRTL:    { flexDirection: 'row-reverse' },
  iconWrap:  { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  icon:      { fontSize: 18 },
  desc:      { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2, textAlign: 'right' },
  meta:      { fontSize: 10, color: COLORS.textMuted, textAlign: 'right' },
  amount:    { fontSize: 14, fontWeight: '800', color: '#EF4444' },
  deleteBtn: { padding: 4 },
  deleteTxt: { fontSize: 14 },
})

// ─── Create Modal ─────────────────────────────────────────────

function CreateModal({ visible, onClose, onCreate, loading }: {
  visible: boolean; onClose: () => void
  onCreate: (data: any) => void; loading: boolean
}) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('other')
  const [currency, setCurrency] = useState('SAR')

  const reset = () => { setDescription(''); setAmount(''); setCategory('other'); setCurrency('SAR') }

  const handleSubmit = () => {
    if (!description.trim() || !amount.trim()) return
    onCreate({
      description: description.trim(),
      amount: parseFloat(amount),
      category,
      currency,
      date: new Date().toISOString(),
    })
    reset()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { onClose(); reset() }}>
      <View style={mdS.overlay}>
        <View style={mdS.container}>
          <View style={mdS.head}>
            <Text style={mdS.title}>+ مصروف جديد</Text>
            <TouchableOpacity onPress={() => { onClose(); reset() }} style={mdS.closeBtn}>
              <Text style={mdS.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={mdS.body}>
            <TextInput
              placeholder="وصف المصروف *"
              value={description}
              onChangeText={setDescription}
              style={mdS.input}
              placeholderTextColor={COLORS.textMuted}
              textAlign={isRTL ? 'right' : 'left'}
            />
            <TextInput
              placeholder="المبلغ *"
              value={amount}
              onChangeText={setAmount}
              style={mdS.input}
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.textMuted}
              textAlign={isRTL ? 'right' : 'left'}
            />

            <Text style={mdS.label}>العملة</Text>
            <View style={crS.row}>
              {['SAR', 'AED', 'KWD', 'USD'].map(c => (
                <TouchableOpacity key={c} style={[crS.btn, currency === c && crS.active]} onPress={() => setCurrency(c)}>
                  <Text style={[crS.txt, currency === c && crS.activeTxt]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[mdS.label, { marginTop: 8 }]}>الفئة</Text>
            <View style={crS.catGrid}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[crS.catBtn, category === c && { backgroundColor: (CAT_COLORS[c] ?? COLORS.primary) + '25', borderColor: CAT_COLORS[c] ?? COLORS.primary }]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={crS.catIcon}>{CAT_ICONS[c]}</Text>
                  <Text style={[crS.catTxt, category === c && { color: CAT_COLORS[c] ?? COLORS.primary }]}>
                    {CAT_AR[c]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[mdS.actions, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={mdS.cancelBtn} onPress={() => { onClose(); reset() }}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mdS.submitBtn, loading && { opacity: 0.6 }]}
                onPress={handleSubmit} disabled={loading}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {loading ? 'جاري الإضافة...' : 'إضافة'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
const crS = StyleSheet.create({
  row:       { flexDirection: 'row', gap: 7, marginBottom: 8 },
  btn:       { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  active:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  txt:       { fontSize: 11, color: COLORS.textMuted, fontWeight: '700' },
  activeTxt: { color: '#fff' },
  catGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 8 },
  catBtn:    { width: '30%', paddingVertical: 9, borderRadius: 9, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', gap: 3 },
  catIcon:   { fontSize: 18 },
  catTxt:    { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
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
  actions:   { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surfaceBg },
  submitBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary },
})

// ─── Main Screen ──────────────────────────────────────────────

export default function ExpensesScreen() {
  const { t } = useTranslation()
  const tabBarHeight = useTabBarHeight()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  // ─── Fetch ──────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [listRes, analyticsRes] = await Promise.allSettled([
        expensesApi.list(),
        expensesApi.getAnalytics(),
      ])
      if (listRes.status === 'fulfilled') {
        const raw = listRes.value?.data ?? listRes.value?.expenses ?? []
        setExpenses(Array.isArray(raw) ? raw : [])
      }
      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value?.data ?? null)
      }
    } catch (_e) {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Handlers ───────────────────────────────────
  const handleCreate = async (data: any) => {
    setCreating(true)
    try {
      await expensesApi.create(data)
      setShowCreate(false)
      Alert.alert('', 'تم إضافة المصروف')
      fetchData()
    } catch (err: unknown) {
      Alert.alert('', err instanceof Error ? err.message : 'حدث خطأ')
    }
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await expensesApi.delete(id)
      Alert.alert('', 'تم حذف المصروف')
      fetchData()
    } catch {
      Alert.alert('', 'حدث خطأ في الحذف')
    }
  }

  const handleRefreshAnalytics = async () => {
    setAnalyticsLoading(true)
    try {
      await expensesApi.refreshAnalytics()
      const res = await expensesApi.getAnalytics()
      setAnalytics(res?.data ?? null)
      Alert.alert('', 'تم تحديث التحليلات')
    } catch {
      Alert.alert('', 'حدث خطأ')
    }
    setAnalyticsLoading(false)
  }

  const handleAutoImport = async () => {
    setImportLoading(true)
    try {
      const res = await expensesApi.autoImport(30)
      Alert.alert('', res?.data?.message ?? 'تم الاستيراد')
      fetchData()
    } catch {
      Alert.alert('', 'حدث خطأ في الاستيراد')
    }
    setImportLoading(false)
  }

  // ─── Render ─────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={sc.safe} edges={['top']}>
        <InnerHeader title={t('expenses.title') || 'المصاريف'} accentColor="#10B981" />
        <View style={sc.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      </SafeAreaView>
    )
  }

  const renderHeader = () => (
    <>
      {/* Analytics Elite Card */}
      <AnalyticsCard
        analytics={analytics}
        onRefresh={handleRefreshAnalytics}
        onAutoImport={handleAutoImport}
        loading={analyticsLoading || importLoading}
      />

      {/* List Header */}
      <View style={[sc.listHeader, isRTL && sc.rowRTL]}>
        <Text style={sc.listTitle}>
          المصاريف{' '}
          <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>({expenses.length})</Text>
        </Text>
        <TouchableOpacity style={sc.createBtn} onPress={() => setShowCreate(true)}>
          <Text style={sc.createBtnTxt}>+ {t('expenses.add') || 'إضافة'}</Text>
        </TouchableOpacity>
      </View>
    </>
  )

  const renderEmpty = () => (
    <View style={sc.empty}>
      <Text style={sc.emptyIcon}>💸</Text>
      <Text style={sc.emptyTxt}>لا توجد مصاريف بعد</Text>
      <TouchableOpacity style={[sc.createBtn, { marginTop: 8 }]} onPress={() => setShowCreate(true)}>
        <Text style={sc.createBtnTxt}>+ إضافة مصروف</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={sc.safe} edges={['top']}>
      <InnerHeader title={t('expenses.title') || 'المصاريف'} accentColor="#10B981" />

      <FlatList
        data={expenses}
        keyExtractor={item => item.id}
        renderItem={({ item, index }: ListRenderItemInfo<Expense>) => (
          <ExpenseCard
            exp={item}
            accent={CARD_ACCENTS[index % CARD_ACCENTS.length]}
            onDelete={handleDelete}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[sc.listContent, { paddingBottom: tabBarHeight }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }}
            tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
      />

      <CreateModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        loading={creating}
      />
    </SafeAreaView>
  )
}

const sc = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.darkBg },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingTop: 8 },
  listHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  rowRTL:      { flexDirection: 'row-reverse' },
  listTitle:   { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right' },
  createBtn:   { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9 },
  createBtnTxt:{ color: COLORS.white, fontSize: 12, fontWeight: '700' },
  empty:       { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon:   { fontSize: 40 },
  emptyTxt:    { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
})