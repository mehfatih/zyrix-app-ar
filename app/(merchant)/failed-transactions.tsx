// app/(merchant)/failed-transactions.tsx
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  I18nManager, SafeAreaView, ActivityIndicator, RefreshControl,
  ListRenderItemInfo,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { retryApi } from '../../services/api'
import { InnerHeader } from '../../components/InnerHeader'

const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────

interface FailedTx {
  id: string
  transactionId: string
  amount: string
  currency: string
  customerName: string
  method: string
  createdAt: string
  retryCount: number
  canRetry: boolean
  lastRetryStatus: string | null
}

interface RetryLog {
  id: string
  attemptNumber: number
  status: string
  errorMessage: string | null
  errorCode: string | null
  executedAt: string
  nextRetryAt: string | null
}

// ─── Demo Data ────────────────────────────────────

const DEMO_TRANSACTIONS: FailedTx[] = [
  {
    id: '1', transactionId: 'TXN-F001', amount: '450.00', currency: 'SAR',
    customerName: 'محمد العلي', method: 'CREDIT_CARD',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    retryCount: 1, canRetry: true, lastRetryStatus: 'FAILED',
  },
  {
    id: '2', transactionId: 'TXN-F002', amount: '1200.00', currency: 'SAR',
    customerName: 'سارة الأحمد', method: 'BANK_TRANSFER',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    retryCount: 0, canRetry: true, lastRetryStatus: null,
  },
  {
    id: '3', transactionId: 'TXN-F003', amount: '320.00', currency: 'SAR',
    customerName: 'خالد المنصور', method: 'DIGITAL_WALLET',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    retryCount: 3, canRetry: false, lastRetryStatus: 'EXHAUSTED',
  },
  {
    id: '4', transactionId: 'TXN-F004', amount: '750.00', currency: 'SAR',
    customerName: 'نورة السعيد', method: 'CREDIT_CARD',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    retryCount: 2, canRetry: true, lastRetryStatus: 'FAILED',
  },
]

// ─── KPI Themes ───────────────────────────────────

const KPI_THEMES = [
  { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.40)',   accent: '#EF4444' },
  { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.40)',  accent: '#F59E0B' },
  { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.40)', accent: '#6366F1' },
  { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.40)',  accent: '#10B981' },
]

const KPI_LABELS = ['المعاملات الفاشلة', 'قابلة للإعادة', 'تم إرجاعها', 'نسبة النجاح']

// ─── KPI Card ─────────────────────────────────────

function KpiCard({ label, value, themeIdx }: {
  label: string; value: string; themeIdx: number
}) {
  const t = KPI_THEMES[themeIdx]
  return (
    <View style={[kS.card, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={kS.lbl} numberOfLines={1}>{label}</Text>
      <Text style={[kS.val, { color: t.accent }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <View style={[kS.bar, { backgroundColor: t.accent }]} />
    </View>
  )
}

const kS = StyleSheet.create({
  card: { flex: 1, borderRadius: 13, padding: 11, borderWidth: 1.5, overflow: 'hidden', minHeight: 75 },
  lbl:  { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6, textAlign: 'right' },
  val:  { fontSize: 20, fontWeight: '800', textAlign: 'right' },
  bar:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 2 },
})

// ─── Method Label ─────────────────────────────────

function methodLabel(method: string): string {
  const map: Record<string, string> = {
    CREDIT_CARD:    'بطاقة ائتمان',
    BANK_TRANSFER:  'تحويل بنكي',
    DIGITAL_WALLET: 'محفظة رقمية',
    CRYPTO:         'كريبتو',
  }
  return map[method] ?? method
}

// ─── Retry Status Badge ───────────────────────────

function RetryBadge({ status, count }: { status: string | null; count: number }) {
  if (!status && count === 0) return (
    <View style={[rb.badge, { backgroundColor: 'rgba(107,114,128,0.15)' }]}>
      <Text style={[rb.txt, { color: '#9CA3AF' }]}>لم تُجرَّب</Text>
    </View>
  )
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    FAILED:    { bg: 'rgba(239,68,68,0.15)',   color: '#EF4444', label: `محاولة ${count}/3` },
    EXHAUSTED: { bg: 'rgba(107,114,128,0.15)', color: '#9CA3AF', label: 'استُنفدت المحاولات' },
    SUCCESS:   { bg: 'rgba(16,185,129,0.15)',  color: '#10B981', label: 'نجحت' },
    PENDING:   { bg: 'rgba(245,158,11,0.15)',  color: '#F59E0B', label: 'جارية' },
  }
  const c = cfg[status ?? ''] ?? cfg.FAILED
  return (
    <View style={[rb.badge, { backgroundColor: c.bg }]}>
      <Text style={[rb.txt, { color: c.color }]}>{c.label}</Text>
    </View>
  )
}

const rb = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  txt:   { fontSize: 10, fontWeight: '700' },
})

// ─── Transaction Card ─────────────────────────────

function TxCard({
  tx, onRetry, retrying,
}: {
  tx: FailedTx
  onRetry: (id: string) => void
  retrying: boolean
}) {
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(h / 24)
    if (d > 0) return `منذ ${d} يوم`
    if (h > 0) return `منذ ${h} ساعة`
    return 'منذ قليل'
  }

  return (
    <View style={txS.card}>
      {/* Header */}
      <View style={[txS.row, isRTL && txS.rowRTL]}>
        <View style={{ flex: 1 }}>
          <Text style={txS.name}>{tx.customerName}</Text>
          <Text style={txS.txId}>{tx.transactionId}</Text>
          <Text style={txS.time}>{timeAgo(tx.createdAt)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 5 }}>
          <Text style={txS.amount}>{tx.currency} {Number(tx.amount).toLocaleString('ar-SA')}</Text>
          <RetryBadge status={tx.lastRetryStatus} count={tx.retryCount} />
          <Text style={txS.method}>{methodLabel(tx.method)}</Text>
        </View>
      </View>

      <View style={txS.divider} />

      {/* Retry Progress */}
      <View style={[txS.progressRow, isRTL && txS.rowRTL]}>
        <Text style={txS.progressLabel}>المحاولات: {tx.retryCount} / 3</Text>
        <View style={txS.dots}>
          {[0, 1, 2].map(i => (
            <View
              key={i}
              style={[
                txS.dot,
                i < tx.retryCount
                  ? { backgroundColor: '#EF4444' }
                  : { backgroundColor: 'rgba(255,255,255,0.15)' },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Retry Button */}
      {tx.canRetry ? (
        <TouchableOpacity
          style={[txS.retryBtn, retrying && txS.retryBtnDisabled]}
          onPress={() => onRetry(tx.id)}
          disabled={retrying}
          activeOpacity={0.75}
        >
          {retrying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={txS.retryTxt}>🔄 إعادة المحاولة</Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={txS.exhaustedRow}>
          <Text style={txS.exhaustedTxt}>⛔ استُنفدت جميع المحاولات</Text>
        </View>
      )}
    </View>
  )
}

const txS = StyleSheet.create({
  card:           { marginHorizontal: 12, marginBottom: 10, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.06)', padding: 14 },
  row:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  rowRTL:         { flexDirection: 'row-reverse' },
  name:           { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right', marginBottom: 3 },
  txId:           { fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace', textAlign: 'right' },
  time:           { fontSize: 10, color: COLORS.textMuted, textAlign: 'right', marginTop: 2 },
  amount:         { fontSize: 18, fontWeight: '800', color: '#EF4444' },
  method:         { fontSize: 10, color: COLORS.textMuted },
  divider:        { height: 1, backgroundColor: 'rgba(239,68,68,0.15)', marginVertical: 10 },
  progressRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabel:  { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  dots:           { flexDirection: 'row', gap: 6 },
  dot:            { width: 10, height: 10, borderRadius: 5 },
  retryBtn:       { backgroundColor: '#6366F1', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  retryBtnDisabled: { opacity: 0.6 },
  retryTxt:       { color: '#fff', fontSize: 13, fontWeight: '700' },
  exhaustedRow:   { backgroundColor: 'rgba(107,114,128,0.1)', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  exhaustedTxt:   { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
})

// ─── Main Screen ──────────────────────────────────

export default function FailedTransactionsScreen() {
  const tabBarHeight = useTabBarHeight()

  const [transactions, setTransactions] = useState<FailedTx[]>([])
  const [loading, setLoading]           = useState(true)
  const [refreshing, setRefreshing]     = useState(false)
  const [retryingId, setRetryingId]     = useState<string | null>(null)
  const [resultMsg, setResultMsg]       = useState<{ id: string; success: boolean } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await retryApi.getFailed()
      setTransactions(res.data?.transactions?.length ? res.data.transactions : DEMO_TRANSACTIONS)
    } catch {
      setTransactions(DEMO_TRANSACTIONS)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const handleRetry = async (txId: string) => {
    setRetryingId(txId)
    setResultMsg(null)
    try {
      const res = await retryApi.retryTransaction(txId)
      const success = res.data?.transactionStatus === 'SUCCESS'
      setResultMsg({ id: txId, success })
      await fetchData()
    } catch {
      setResultMsg({ id: txId, success: false })
    } finally {
      setRetryingId(null)
      setTimeout(() => setResultMsg(null), 3000)
    }
  }

  // KPI values
  const total     = transactions.length
  const canRetry  = transactions.filter(t => t.canRetry).length
  const exhausted = transactions.filter(t => !t.canRetry).length
  const successRate = total > 0
    ? `${Math.round((transactions.filter(t => t.lastRetryStatus === 'SUCCESS').length / total) * 100)}%`
    : '0%'

  const kpiValues = [String(total), String(canRetry), String(exhausted), successRate]

  const renderHeader = () => (
    <>
      {/* KPI Cards */}
      <View style={sc.kpiWrap}>
        <View style={[sc.kpiRow, isRTL && sc.kpiRowRTL]}>
          {[0, 1].map(i => (
            <KpiCard key={i} label={KPI_LABELS[i]} value={kpiValues[i]} themeIdx={i} />
          ))}
        </View>
        <View style={[sc.kpiRow, isRTL && sc.kpiRowRTL]}>
          {[2, 3].map(i => (
            <KpiCard key={i} label={KPI_LABELS[i]} value={kpiValues[i]} themeIdx={i} />
          ))}
        </View>
      </View>

      {/* Result Toast */}
      {resultMsg && (
        <View style={[sc.toast, { backgroundColor: resultMsg.success ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', borderColor: resultMsg.success ? '#10B981' : '#EF4444' }]}>
          <Text style={[sc.toastTxt, { color: resultMsg.success ? '#10B981' : '#EF4444' }]}>
            {resultMsg.success ? '✅ نجحت إعادة المحاولة!' : '❌ فشلت إعادة المحاولة'}
          </Text>
        </View>
      )}

      {/* List Header */}
      <View style={[sc.listHeader, isRTL && sc.rowRTL]}>
        <Text style={sc.listTitle}>
          المعاملات الفاشلة
          {'  '}
          <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>({total})</Text>
        </Text>
      </View>
    </>
  )

  const renderEmpty = () => (
    <View style={sc.empty}>
      <Text style={sc.emptyIcon}>✅</Text>
      <Text style={sc.emptyTxt}>لا توجد معاملات فاشلة</Text>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={sc.safe}>
        <InnerHeader title="المعاملات الفاشلة" accentColor="#EF4444" />
        <View style={sc.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={sc.safe}>
      <InnerHeader title="المعاملات الفاشلة" accentColor="#EF4444" />

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: ListRenderItemInfo<FailedTx>) => (
          <TxCard
            tx={item}
            onRetry={handleRetry}
            retrying={retryingId === item.id}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[sc.listContent, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      />
    </SafeAreaView>
  )
}

const sc = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: COLORS.darkBg },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent:{ paddingTop: 4 },
  kpiWrap:    { paddingHorizontal: 12, paddingTop: 12, gap: 8 },
  kpiRow:     { flexDirection: 'row', gap: 8 },
  kpiRowRTL:  { flexDirection: 'row-reverse' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  rowRTL:     { flexDirection: 'row-reverse' },
  listTitle:  { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right' },
  empty:      { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon:  { fontSize: 40 },
  emptyTxt:   { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  toast:      { marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  toastTxt:   { fontSize: 13, fontWeight: '700' },
})