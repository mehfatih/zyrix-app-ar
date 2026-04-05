// app/(merchant)/settlements.tsx
import React, { useState, useMemo } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  I18nManager, SafeAreaView, RefreshControl, ListRenderItemInfo, Alert,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { useCurrency } from '../../hooks/useCurrency'
import { settlementsApi } from '../../services/api'
import KpiCard from '../../components/KpiCard'
import SettlementRow from '../../components/SettlementRow'

const isRTL = I18nManager.isRTL

type SettlementStatus = 'pending' | 'settled'
type FilterKey = 'all' | SettlementStatus

interface Settlement {
  id: string; date: string; period: string; count: number;
  gross: number; commission: number; net: number; status: SettlementStatus;
}

export default function SettlementsScreen() {
  const { t } = useTranslation()
  const { format, convert, currency } = useCurrency('SAR')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [allSettlements, setAllSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      const data = await settlementsApi.list({ days: 90 })
      setAllSettlements(data.settlements)
    } catch (err) { console.warn(err) }
    finally { setLoading(false); setRefreshing(false) }
  }

  React.useEffect(() => { fetchData() }, [])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const fmt = (amount: number) => format(convert(amount, 'SAR', currency), currency)

  const FILTERS: { key: FilterKey; label: string; color: string; activeBg: string; activeBorder: string }[] = [
    { key: 'settled', label: t('settlements.filter_settled') || 'مكتمل', color: COLORS.success, activeBg: COLORS.successBg, activeBorder: COLORS.success },
    { key: 'pending', label: t('settlements.filter_pending') || 'معلق', color: COLORS.warning, activeBg: COLORS.warningBg, activeBorder: COLORS.warning },
    { key: 'all', label: t('settlements.filter_all') || 'الكل', color: COLORS.primaryLight, activeBg: 'rgba(59,130,246,0.2)', activeBorder: COLORS.primaryLight },
  ]

  const totalGross = allSettlements.reduce((s, x) => s + x.gross, 0)
  const totalNet = allSettlements.reduce((s, x) => s + x.net, 0)
  const totalComm = allSettlements.reduce((s, x) => s + x.commission, 0)

  const filtered = useMemo(() => allSettlements.filter((s) => filter === 'all' || s.status === filter), [filter, allSettlements])

  const handleExport = () => Alert.alert('CSV', t('settlements.export'))

  const maxKpi = Math.max(totalGross, totalNet, totalComm, 1)

  const renderItem = ({ item }: ListRenderItemInfo<Settlement>) => (
    <SettlementRow {...item} onPress={() => Alert.alert(item.id)} />
  )

  const renderHeader = () => (
    <>
      <View style={st.pageHeader}>
        <View style={[st.headerRow, isRTL && st.headerRowRTL]}>
          <Text style={[st.pageSubtitle, isRTL && st.textRight, { flex: 1 }]}>
            {t('settlements.subtitle') || 'سجل التسويات الأسبوعية'}
          </Text>
          <TouchableOpacity style={st.exportBtn} onPress={handleExport}>
            <Text style={st.exportIcon}>↓</Text>
            <Text style={st.exportLabel}>{t('settlements.export')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[st.kpiRow, isRTL && st.kpiRowRTL]}>
        <KpiCard label={t('settlements.net')} value={fmt(totalNet)}
          icon="💰" color={COLORS.success} valueColor={COLORS.success}
          style={{ flex: 1, backgroundColor: 'rgba(5, 150, 105, 0.15)', borderColor: 'rgba(5, 150, 105, 0.3)' }} compact />
        <KpiCard label={t('settlements.commission')} value={`-${fmt(totalComm)}`}
          icon="📊" color={COLORS.danger} valueColor={COLORS.danger}
          style={{ flex: 1, backgroundColor: 'rgba(220, 38, 38, 0.15)', borderColor: 'rgba(220, 38, 38, 0.3)' }} compact />
        <KpiCard label={t('settlements.gross')} value={fmt(totalGross)}
          icon="💳" color={COLORS.primary}
          style={{ flex: 1, backgroundColor: 'rgba(26, 86, 219, 0.15)', borderColor: 'rgba(26, 86, 219, 0.3)' }} compact />
      </View>

      <View style={st.chartContainer}>
        <View style={st.chartBarGroup}>
          <View style={st.chartBarTrack}>
            <View style={[st.chartBarFill, { backgroundColor: COLORS.success, height: `${Math.max((totalNet / maxKpi) * 100, 8)}%` }]} />
          </View>
          <Text style={[st.chartBarValue, { color: COLORS.success }]}>{(totalNet / 1000).toFixed(1)}k</Text>
          <Text style={st.chartBarLabel}>{t('settlements.net')}</Text>
        </View>
        <View style={st.chartBarGroup}>
          <View style={st.chartBarTrack}>
            <View style={[st.chartBarFill, { backgroundColor: COLORS.danger, height: `${Math.max((totalComm / maxKpi) * 100, 8)}%` }]} />
          </View>
          <Text style={[st.chartBarValue, { color: COLORS.danger }]}>{(totalComm / 1000).toFixed(1)}k</Text>
          <Text style={st.chartBarLabel}>{t('settlements.commission')}</Text>
        </View>
        <View style={st.chartBarGroup}>
          <View style={st.chartBarTrack}>
            <View style={[st.chartBarFill, { backgroundColor: COLORS.primary, height: `${Math.max((totalGross / maxKpi) * 100, 8)}%` }]} />
          </View>
          <Text style={[st.chartBarValue, { color: COLORS.primary }]}>{(totalGross / 1000).toFixed(1)}k</Text>
          <Text style={st.chartBarLabel}>{t('settlements.gross')}</Text>
        </View>
      </View>

      <View style={st.filterWrapper}>
        <View style={st.filterRow}>
          {FILTERS.map((f) => {
            const isActive = filter === f.key
            return (
              <TouchableOpacity key={f.key}
                style={[st.filterTab, isActive && { backgroundColor: f.activeBg, borderColor: f.activeBorder }]}
                onPress={() => setFilter(f.key)}>
                <Text style={[st.filterTabText, isActive && { color: f.color, fontWeight: '700' }]}>{f.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <View style={[st.colHeaders, isRTL && st.colHeadersRTL]}>
        <Text style={[st.colHeader, { flex: 2 }]}>{t('settlements.period') || 'الفترة'}</Text>
        <Text style={[st.colHeader, st.colHeaderCenter]}>{t('settlements.gross')}</Text>
        <Text style={[st.colHeader, st.colHeaderCenter]}>{t('settlements.commission')}</Text>
        <Text style={[st.colHeader, st.colHeaderRight]}>{t('settlements.net')}</Text>
      </View>
    </>
  )

  const renderEmpty = () => (
    <View style={st.emptyContainer}>
      <Text style={st.emptyIcon}>🗂️</Text>
      <Text style={st.emptyText}>لا توجد تسويات</Text>
    </View>
  )

  return (
    <SafeAreaView style={st.safeArea}>
      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        data={filtered} keyExtractor={(item) => item.id} renderItem={renderItem}
        ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
        contentContainerStyle={st.listContent} showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.darkBg },
  listContent: { paddingBottom: 40 },
  pageHeader: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, backgroundColor: 'rgba(13, 148, 136, 0.12)', borderBottomWidth: 1, borderBottomColor: 'rgba(13, 148, 136, 0.3)' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRowRTL: { flexDirection: 'row-reverse' },
  pageSubtitle: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  textRight: { textAlign: 'right' },
  exportBtn: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: COLORS.primary },
  exportIcon: { fontSize: 14, color: COLORS.white, fontWeight: '700' },
  exportLabel: { fontSize: 12, color: COLORS.white, fontWeight: '600' },
  kpiRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  kpiRowRTL: { flexDirection: 'row-reverse' },
  chartContainer: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-around', alignItems: 'flex-end', backgroundColor: COLORS.cardBg, marginHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, height: 140 },
  chartBarGroup: { alignItems: 'center', flex: 1, gap: 4 },
  chartBarTrack: { width: 32, height: 80, backgroundColor: COLORS.surfaceBg, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  chartBarFill: { width: '100%', borderRadius: 6 },
  chartBarValue: { fontSize: 11, fontWeight: '800' },
  chartBarLabel: { fontSize: 9, fontWeight: '600', color: COLORS.textSecondary },
  filterWrapper: { backgroundColor: COLORS.surfaceBg, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, marginHorizontal: 12, marginTop: 10, borderRadius: 12 },
  filterRow: { flexDirection: isRTL ? 'row' : 'row-reverse', gap: 8, justifyContent: 'center' },
  filterTab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  filterTabText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  colHeaders: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.cardBg, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginTop: 8 },
  colHeadersRTL: { flexDirection: 'row-reverse' },
  colHeader: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.5, flex: 1 },
  colHeaderCenter: { textAlign: 'center' },
  colHeaderRight: { textAlign: isRTL ? 'left' : 'right' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 15, color: COLORS.textMuted },
})