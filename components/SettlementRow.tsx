// components/SettlementRow.tsx
import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
} from 'react-native'
import { COLORS } from '../constants/colors'
import { useTranslation } from '../hooks/useTranslation'
import StatusBadge from './StatusBadge'

const isRTL = I18nManager.isRTL

export interface SettlementRowProps {
  id: string
  date: string
  period: string
  count: number
  gross: number
  commission: number
  net: number
  status: 'pending' | 'settled'
  onPress?: () => void
}

export default function SettlementRow({
  id,
  date,
  period,
  count,
  gross,
  commission,
  net,
  status,
  onPress,
}: SettlementRowProps) {
  const { t } = useTranslation()

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Top row — ID + date + badge */}
      <View style={[styles.topRow, isRTL && styles.topRowRTL]}>
        <View style={[styles.topLeft, isRTL && styles.topLeftRTL]}>
          <Text style={styles.id}>{id}</Text>
          <View style={styles.periodPill}>
            <Text style={styles.periodText}>{period}</Text>
          </View>
        </View>
        <View style={[styles.topRight, isRTL && styles.topRightRTL]}>
          <StatusBadge status={status} />
          <Text style={styles.date}>{date}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Bottom row — financials */}
      <View style={[styles.bottomRow, isRTL && styles.bottomRowRTL]}>
        <FinancialCell
          label={t('settlements.gross')}
          value={`${gross.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
          color={COLORS.textPrimary}
        />
        <View style={styles.separator} />
        <FinancialCell
          label={t('settlements.commission')}
          value={`-${commission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
          color={COLORS.danger}
        />
        <View style={styles.separator} />
        <FinancialCell
          label={t('settlements.net')}
          value={`${net.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
          color={COLORS.success}
          bold
        />
        <View style={styles.separator} />
        <FinancialCell
          label="İşlem"
          value={String(count)}
          color={COLORS.textSecondary}
        />
      </View>
    </TouchableOpacity>
  )
}

function FinancialCell({
  label,
  value,
  color,
  bold,
}: {
  label: string
  value: string
  color: string
  bold?: boolean
}) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={[styles.cellValue, { color }, bold && styles.cellValueBold]}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  topRowRTL: {
    flexDirection: 'row-reverse',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  topLeftRTL: {
    flexDirection: 'row-reverse',
  },
  topRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  topRightRTL: {
    alignItems: 'flex-start',
  },
  id: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
  },
  periodPill: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  periodText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  date: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 0,
  },

  // Bottom row
  bottomRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bottomRowRTL: {
    flexDirection: 'row-reverse',
  },
  separator: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  cellLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  cellValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  cellValueBold: {
    fontWeight: '800',
    fontSize: 14,
  },
})
