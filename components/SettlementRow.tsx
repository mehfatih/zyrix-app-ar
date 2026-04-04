// components/SettlementRow.tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native'
import { COLORS } from '../constants/colors'
import { useTranslation } from '../hooks/useTranslation'
import StatusBadge from './StatusBadge'

const isRTL = I18nManager.isRTL

const CARD_COLORS = [
  { bg: 'rgba(26, 86, 219, 0.1)', border: 'rgba(26, 86, 219, 0.3)' },
  { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)' },
  { bg: 'rgba(13, 148, 136, 0.1)', border: 'rgba(13, 148, 136, 0.3)' },
  { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' },
  { bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.3)' },
]

export interface SettlementRowProps {
  id: string; date: string; period: string; count: number;
  gross: number; commission: number; net: number;
  status: 'pending' | 'settled'; onPress?: () => void;
}

export default function SettlementRow({ id, date, period, count, gross, commission, net, status, onPress }: SettlementRowProps & { index?: number }) {
  const { t } = useTranslation()
  // Use id hash for color selection
  const colorIdx = id ? (id.charCodeAt(id.length - 1) || 0) % CARD_COLORS.length : 0
  const colors = CARD_COLORS[colorIdx]

  return (
    <TouchableOpacity style={[s.container, { backgroundColor: colors.bg, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.topRow, isRTL && s.topRowRTL]}>
        <View style={[s.topLeft, isRTL && s.topLeftRTL]}>
          <View style={s.periodPill}><Text style={s.periodText}>{period}</Text></View>
          <Text style={s.date}>{date}</Text>
        </View>
        <StatusBadge status={status} />
      </View>
      <View style={s.divider} />
      <View style={[s.bottomRow, isRTL && s.bottomRowRTL]}>
        <View style={s.cell}>
          <Text style={s.cellLabel}>{t('settlements.net')}</Text>
          <Text style={[s.cellValue, { color: COLORS.success }]}>{net.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س</Text>
        </View>
        <View style={s.sep} />
        <View style={s.cell}>
          <Text style={s.cellLabel}>{t('settlements.commission')}</Text>
          <Text style={[s.cellValue, { color: COLORS.danger }]}>-{commission.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س</Text>
        </View>
        <View style={s.sep} />
        <View style={s.cell}>
          <Text style={s.cellLabel}>{t('settlements.gross')}</Text>
          <Text style={[s.cellValue, { color: COLORS.textPrimary }]}>{gross.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س</Text>
        </View>
        <View style={s.sep} />
        <View style={s.cell}>
          <Text style={s.cellLabel}>المعاملات</Text>
          <Text style={[s.cellValue, { color: COLORS.textSecondary }]}>{count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  container: { marginHorizontal: 16, marginVertical: 6, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  topRowRTL: { flexDirection: 'row-reverse' },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  topLeftRTL: { flexDirection: 'row-reverse' },
  periodPill: { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  periodText: { fontSize: 11, color: COLORS.primaryLight, fontWeight: '600' },
  date: { fontSize: 11, color: COLORS.textMuted },
  divider: { height: 1, backgroundColor: COLORS.border },
  bottomRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10 },
  bottomRowRTL: { flexDirection: 'row-reverse' },
  sep: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 6 },
  cell: { flex: 1, alignItems: 'center' },
  cellLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600', marginBottom: 3 },
  cellValue: { fontSize: 12, fontWeight: '700' },
})