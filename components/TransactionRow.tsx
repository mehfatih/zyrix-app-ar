// components/TransactionRow.tsx
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

export interface TransactionRowProps {
  id: string
  date: string
  name: string
  method: string
  flag: string
  country: string
  amount: number
  currency: string
  isCredit: boolean
  status: 'success' | 'pending' | 'failed'
  index?: number
  onPress?: () => void
}

export default function TransactionRow({
  id,
  date,
  name,
  method,
  flag,
  country,
  amount,
  currency,
  isCredit,
  status,
  index = 0,
  onPress,
}: TransactionRowProps) {
  const { t } = useTranslation()
  const isEven = index % 2 === 0

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isEven ? styles.rowEven : styles.rowOdd,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Left: Flag + Info */}
      <View style={[styles.leftSection, isRTL && styles.leftSectionRTL]}>
        <View style={styles.flagContainer}>
          <Text style={styles.flag}>{flag}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {method} · {id}
          </Text>
        </View>
      </View>

      {/* Right: Amount + Status + Date */}
      <View style={[styles.rightSection, isRTL && styles.rightSectionRTL]}>
        <Text
          style={[
            styles.amount,
            isCredit ? styles.amountCredit : styles.amountDebit,
          ]}
        >
          {isCredit ? '+' : '-'}
          {amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          {currency}
        </Text>
        <View style={styles.statusDateRow}>
          <StatusBadge status={status} />
          <Text style={styles.date}>{date}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  rowEven: {
    backgroundColor: COLORS.cardBg,
  },
  rowOdd: {
    backgroundColor: COLORS.surfaceBg,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  leftSectionRTL: {
    flexDirection: 'row-reverse',
    marginRight: 0,
    marginLeft: 12,
  },
  flagContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: isRTL ? 0 : 10,
    marginLeft: isRTL ? 10 : 0,
  },
  flag: {
    fontSize: 18,
  },
  info: {
    flex: 1,
    alignItems: isRTL ? 'flex-end' : 'flex-start',
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  meta: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rightSectionRTL: {
    alignItems: 'flex-start',
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
  },
  amountCredit: {
    color: COLORS.success,
  },
  amountDebit: {
    color: COLORS.danger,
  },
  statusDateRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 6,
  },
  date: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
})
