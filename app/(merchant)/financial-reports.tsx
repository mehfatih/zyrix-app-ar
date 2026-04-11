// ─────────────────────────────────────────────────────────────
// app/(merchant)/financial-reports.tsx
// P&L + Cash Flow + Revenue + Tax + Custom Export
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  I18nManager, ActivityIndicator, RefreshControl,
  Modal, Alert, ScrollView, ListRenderItemInfo,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { COLORS } from '../../constants/colors'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { financialReportsApi } from '../../services/api'
import { InnerHeader } from '../../components/InnerHeader'

const isRTL = I18nManager.isRTL

interface Report {
  id: string; reportType: string; name: string
  periodStart: string; periodEnd: string; currency: string; status: string; createdAt: string
}
interface PNLData {
  revenue: number; expenses: number; tax: number
  grossProfit: number; netProfit: number; margin: number
  txCount: number; expCount: number; currency: string
}
interface ReportDetail {
  id: string; reportType: string; name: string
  periodStart: string; periodEnd: string; currency: string
  reportData: any; status: string
}

const REPORT_TYPES = [
  { type: 'PNL',        label: 'أرباح وخسائر',    icon: '📊', color: '#6366F1' },
  { type: 'CASH_FLOW',  label: 'التدفق النقدي',    icon: '💰', color: '#10B981' },
  { type: 'REVENUE',    label: 'تقرير الإيرادات',  icon: '📈', color: '#F59E0B' },
  { type: 'EXPENSE',    label: 'تقرير المصاريف',   icon: '📉', color: '#EF4444' },
  { type: 'TAX',        label: 'تقرير الضرائب',    icon: '🧾', color: '#06B6D4' },
  { type: 'CUSTOM',     label: 'تقرير شامل',       icon: '📋', color: '#8B5CF6' },
]

// ─── Quick PNL Card ───────────────────────────────────────────

function QuickPNLCard({ data }: { data: PNLData | null }) {
  if (!data) return null
  const isProfit = data.netProfit >= 0
  return (
    <View style={pnlS.wrap}>
      <View style={[pnlS.head, isRTL && { flexDirection: 'row-reverse' }]}>
        <View style={[pnlS.dot, { backgroundColor: isProfit ? '#10B981' : '#EF4444' }]} />
        <Text style={pnlS.title}>P&L — آخر 30 يوم</Text>
        <Text style={[pnlS.margin, { color: isProfit ? '#10B981' : '#EF4444' }]}>
          هامش {data.margin}%
        </Text>
      </View>
      <View style={pnlS.bars}>
        {[
          { label: 'الإيرادات',    value: data.revenue,    color: '#10B981' },
          { label: 'المصاريف',    value: data.expenses,   color: '#EF4444' },
          { label: 'الضرائب',     value: data.tax,        color: '#F59E0B' },
          { label: 'صافي الربح',  value: Math.abs(data.netProfit), color: isProfit ? '#6366F1' : '#EF4444' },
        ].map((b, i) => {
          const max = Math.max(data.revenue, 1)
          const pct = Math.max((b.value / max) * 100, 4)
          return (
            <View key={i} style={pnlS.barGroup}>
              <Text style={[pnlS.barVal, { color: b.color }]}>
                {b.value >= 1000 ? `${(b.value / 1000).toFixed(1)}k` : String(Math.round(b.value))}
              </Text>
              <View style={pnlS.barTrack}>
                <View style={[pnlS.barFill, { height: `${pct}%`, backgroundColor: b.color }]} />
              </View>
              <Text style={[pnlS.barLabel, { color: b.color }]}>{b.label}</Text>
            </View>
          )
        })}
      </View>
      <View style={[pnlS.netRow, { backgroundColor: isProfit ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', borderColor: isProfit ? '#10B981' : '#EF4444' }]}>
        <Text style={[pnlS.netLabel, { color: isProfit ? '#10B981' : '#EF4444' }]}>
          {isProfit ? '📈 صافي الربح' : '📉 صافي الخسارة'}
        </Text>
        <Text style={[pnlS.netVal, { color: isProfit ? '#10B981' : '#EF4444' }]}>
          {data.netProfit.toLocaleString()} {data.currency === 'SAR' ? 'ر.س' : data.currency}
        </Text>
      </View>
    </View>
  )
}
const pnlS = StyleSheet.create({
  wrap:     { marginHorizontal: 12, marginBottom: 10, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.4)', backgroundColor: COLORS.cardBg, padding: 12 },
  head:     { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  dot:      { width: 7, height: 7, borderRadius: 4 },
  title:    { flex: 1, fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  margin:   { fontSize: 12, fontWeight: '800' },
  bars:     { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 110, marginBottom: 12 },
  barGroup: { alignItems: 'center', flex: 1, gap: 4 },
  barVal:   { fontSize: 10, fontWeight: '800' },
  barTrack: { width: 26, height: 70, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill:  { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 8, fontWeight: '600' },
  netRow:   { borderRadius: 10, borderWidth: 1.5, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netLabel: { fontSize: 13, fontWeight: '700' },
  netVal:   { fontSize: 16, fontWeight: '800' },
})

// ─── Report Card ──────────────────────────────────────────────

function ReportCard({ report, onView, onDelete }: {
  report: Report; onView: (id: string) => void; onDelete: (id: string) => void
}) {
  const cfg = REPORT_TYPES.find(r => r.type === report.reportType) ?? REPORT_TYPES[0]
  return (
    <View style={[rcS.card, { backgroundColor: cfg.color + '10', borderColor: cfg.color + '30' }]}>
      <View style={[rcS.row, isRTL && rcS.rowRTL]}>
        <Text style={rcS.icon}>{cfg.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[rcS.name, { color: cfg.color }]}>{report.name}</Text>
          <Text style={rcS.period}>
            {new Date(report.periodStart).toLocaleDateString('ar-SA')} — {new Date(report.periodEnd).toLocaleDateString('ar-SA')}
          </Text>
        </View>
        <View style={[rcS.statusBadge, { backgroundColor: cfg.color + '20' }]}>
          <Text style={[rcS.statusTxt, { color: cfg.color }]}>{report.status === 'READY' ? 'جاهز' : '...'}</Text>
        </View>
      </View>
      <View style={[rcS.actions, isRTL && rcS.rowRTL]}>
        <TouchableOpacity style={[rcS.btn, { backgroundColor: cfg.color + '20', borderColor: cfg.color + '50' }]} onPress={() => onView(report.id)}>
          <Text style={[rcS.btnTxt, { color: cfg.color }]}>👁 عرض</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[rcS.btn, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)' }]} onPress={() => onDelete(report.id)}>
          <Text style={[rcS.btnTxt, { color: '#EF4444' }]}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
const rcS = StyleSheet.create({
  card:        { marginHorizontal: 12, marginBottom: 8, borderRadius: 12, borderWidth: 1.5, padding: 12 },
  row:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  rowRTL:      { flexDirection: 'row-reverse' },
  icon:        { fontSize: 22, marginTop: 2 },
  name:        { fontSize: 13, fontWeight: '700', textAlign: 'right', marginBottom: 3 },
  period:      { fontSize: 10, color: COLORS.textMuted, textAlign: 'right' },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  statusTxt:   { fontSize: 9, fontWeight: '700' },
  actions:     { flexDirection: 'row', gap: 7 },
  btn:         { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  btnTxt:      { fontSize: 11, fontWeight: '700' },
})

// ─── Generate Modal ───────────────────────────────────────────

function GenerateModal({ visible, onClose, onGenerate, loading }: {
  visible: boolean; onClose: () => void; onGenerate: (data: any) => void; loading: boolean
}) {
  const [type, setType]   = useState('PNL')
  const [range, setRange] = useState('30d')

  const ranges = [
    { label: 'آخر 7 أيام',  value: '7d'  },
    { label: 'آخر 30 يوم',  value: '30d' },
    { label: 'آخر 90 يوم',  value: '90d' },
    { label: 'هذا العام',   value: 'ytd' },
  ]

  const handleGenerate = () => {
    const now = new Date()
    const end = now.toISOString()
    let start = new Date(now)
    if (range === '7d')       start.setDate(start.getDate() - 7)
    else if (range === '30d') start.setDate(start.getDate() - 30)
    else if (range === '90d') start.setDate(start.getDate() - 90)
    else start = new Date(now.getFullYear(), 0, 1)

    const cfg = REPORT_TYPES.find(r => r.type === type)
    onGenerate({
      reportType: type,
      periodStart: start.toISOString(),
      periodEnd: end,
      currency: 'SAR',
      name: `${cfg?.label} — ${new Date().toLocaleDateString('ar-SA')}`,
    })
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mdS.overlay}>
        <View style={mdS.container}>
          <View style={mdS.head}>
            <Text style={mdS.title}>📊 إنشاء تقرير</Text>
            <TouchableOpacity onPress={onClose} style={mdS.closeBtn}><Text style={mdS.closeTxt}>✕</Text></TouchableOpacity>
          </View>
          <View style={mdS.body}>
            <Text style={mdS.label}>نوع التقرير</Text>
            <View style={mdS.typeGrid}>
              {REPORT_TYPES.map(rt => (
                <TouchableOpacity key={rt.type}
                  style={[mdS.typeBtn, type === rt.type && { backgroundColor: rt.color + '25', borderColor: rt.color }]}
                  onPress={() => setType(rt.type)}
                >
                  <Text style={mdS.typeIcon}>{rt.icon}</Text>
                  <Text style={[mdS.typeTxt, type === rt.type && { color: rt.color }]}>{rt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[mdS.label, { marginTop: 8 }]}>الفترة</Text>
            <View style={mdS.rangeRow}>
              {ranges.map(r => (
                <TouchableOpacity key={r.value}
                  style={[mdS.rangeBtn, range === r.value && mdS.rangeActive]}
                  onPress={() => setRange(r.value)}
                >
                  <Text style={[mdS.rangeTxt, range === r.value && mdS.rangeActiveTxt]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[mdS.actions, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={mdS.cancelBtn} onPress={onClose}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[mdS.submitBtn, loading && { opacity: 0.6 }]} onPress={handleGenerate} disabled={loading}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{loading ? 'جاري الإنشاء...' : 'إنشاء التقرير'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Report Detail Modal ──────────────────────────────────────

function ReportDetailModal({ visible, report, onClose }: {
  visible: boolean; report: ReportDetail | null; onClose: () => void
}) {
  if (!report) return null
  const cfg = REPORT_TYPES.find(r => r.type === report.reportType) ?? REPORT_TYPES[0]
  const data = report.reportData

  const renderPNL = () => data && (
    <View style={detS.section}>
      {[
        { label: 'الإيرادات',    val: data.revenue,    color: '#10B981' },
        { label: 'المصاريف',    val: data.expenses,   color: '#EF4444' },
        { label: 'الضرائب',     val: data.tax,        color: '#F59E0B' },
        { label: 'إجمالي الربح', val: data.grossProfit, color: '#6366F1' },
        { label: 'صافي الربح',  val: data.netProfit,  color: data.netProfit >= 0 ? '#10B981' : '#EF4444' },
        { label: 'هامش الربح',  val: `${data.margin}%`, color: '#6366F1' },
      ].map((r, i) => (
        <View key={i} style={[detS.row, isRTL && { flexDirection: 'row-reverse' }, { backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }]}>
          <Text style={detS.rowLabel}>{r.label}</Text>
          <Text style={[detS.rowVal, { color: r.color }]}>
            {typeof r.val === 'number' ? `${r.val.toLocaleString()} ر.س` : r.val}
          </Text>
        </View>
      ))}
    </View>
  )

  const renderGeneric = () => (
    <View style={detS.section}>
      <Text style={detS.rawData}>{JSON.stringify(data, null, 2)}</Text>
    </View>
  )

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mdS.overlay}>
        <View style={[mdS.container, { maxHeight: '85%' }]}>
          <View style={mdS.head}>
            <Text style={[mdS.title, { color: cfg.color }]}>{cfg.icon} {report.name}</Text>
            <TouchableOpacity onPress={onClose} style={mdS.closeBtn}><Text style={mdS.closeTxt}>✕</Text></TouchableOpacity>
          </View>
          <Text style={detS.period}>
            {new Date(report.periodStart).toLocaleDateString('ar-SA')} — {new Date(report.periodEnd).toLocaleDateString('ar-SA')}
          </Text>
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            {report.reportType === 'PNL' || report.reportType === 'CUSTOM' ? renderPNL() : renderGeneric()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
const detS = StyleSheet.create({
  section: { padding: 16, gap: 2 },
  row:     { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderRadius: 6 },
  rowLabel:{ fontSize: 13, color: COLORS.textSecondary },
  rowVal:  { fontSize: 14, fontWeight: '700' },
  period:  { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rawData: { fontSize: 10, color: COLORS.textSecondary, fontFamily: 'monospace', padding: 12 },
})

const mdS = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container:  { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  head:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:      { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  closeBtn:   { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeTxt:   { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  body:       { padding: 16, gap: 10 },
  label:      { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'right' },
  typeGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  typeBtn:    { width: '30%', paddingVertical: 10, borderRadius: 9, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', gap: 3 },
  typeIcon:   { fontSize: 18 },
  typeTxt:    { fontSize: 9, color: COLORS.textMuted, fontWeight: '700', textAlign: 'center' },
  rangeRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  rangeBtn:   { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border },
  rangeActive:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rangeTxt:   { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  rangeActiveTxt: { color: '#fff' },
  actions:    { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surfaceBg },
  submitBtn:  { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary },
})

export default function FinancialReportsScreen() {
  const tabBarHeight = useTabBarHeight()
    const [reports, setReports]     = useState<Report[]>([])
  const [quickPNL, setQuickPNL]   = useState<PNLData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [generating, setGenerating]   = useState(false)
  const [viewReport, setViewReport]   = useState<ReportDetail | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [listRes, pnlRes] = await Promise.allSettled([
        financialReportsApi.list(),
        financialReportsApi.getQuickPNL('30d'),
      ])
      if (listRes.status === 'fulfilled') setReports(listRes.value?.data ?? [])
      if (pnlRes.status === 'fulfilled')  setQuickPNL(pnlRes.value?.data ?? null)
    } catch (_e) {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleGenerate = async (data: any) => {
    setGenerating(true)
    try {
      await financialReportsApi.generate(data)
      setShowGenerate(false)
      Alert.alert('', 'تم إنشاء التقرير')
      fetchData()
    } catch { Alert.alert('', 'حدث خطأ') }
    setGenerating(false)
  }

  const handleView = async (id: string) => {
    try {
      const res = await financialReportsApi.getById(id)
      setViewReport(res?.data ?? null)
    } catch { Alert.alert('', 'حدث خطأ في تحميل التقرير') }
  }

  const handleDelete = async (id: string) => {
    try {
      await financialReportsApi.delete(id)
      Alert.alert('', 'تم الحذف')
      fetchData()
    } catch { Alert.alert('', 'حدث خطأ') }
  }

  if (loading) {
    return (
      <SafeAreaView style={sc.safe} edges={['top']}>
        <InnerHeader title="التقارير المالية" accentColor="#6366F1" />
        <View style={sc.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={sc.safe} edges={['top']}>
      <InnerHeader title="التقارير المالية" accentColor="#6366F1" />
      <FlatList
        data={reports}
        keyExtractor={item => item.id}
        renderItem={({ item }: ListRenderItemInfo<Report>) => (
          <ReportCard report={item} onView={handleView} onDelete={handleDelete} />
        )}
        ListHeaderComponent={
          <>
            <QuickPNLCard data={quickPNL} />
            <View style={[sc.listHeader, isRTL && sc.rowRTL]}>
              <Text style={sc.listTitle}>التقارير ({reports.length})</Text>
              <TouchableOpacity style={sc.createBtn} onPress={() => setShowGenerate(true)}>
                <Text style={sc.createBtnTxt}>+ تقرير جديد</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={sc.empty}>
            <Text style={sc.emptyIcon}>📊</Text>
            <Text style={sc.emptyTxt}>لا توجد تقارير بعد — أنشئ تقريرك الأول</Text>
            <TouchableOpacity style={[sc.createBtn, { marginTop: 8 }]} onPress={() => setShowGenerate(true)}>
              <Text style={sc.createBtnTxt}>+ إنشاء تقرير</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={[sc.listContent, { paddingBottom: tabBarHeight }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      />
      <GenerateModal visible={showGenerate} onClose={() => setShowGenerate(false)} onGenerate={handleGenerate} loading={generating} />
      <ReportDetailModal visible={!!viewReport} report={viewReport} onClose={() => setViewReport(null)} />
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
  emptyTxt:    { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
})