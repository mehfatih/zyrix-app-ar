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
  onPress,
}: TransactionRowProps) {
  const { t } = useTranslation()

  return (
    <TouchableOpacity
      style={styles.container}
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
          <Text style={styles.method} numberOfLines={1}>
            {method}
          </Text>
          <Text style={styles.idText}>{id}</Text>
        </View>
      </View>

      {/* Right: Amount + Status */}
      <View style={[styles.rightSection, isRTL && styles.rightSectionRTL]}>
        <Text
          style={[
            styles.amount,
            isCredit ? styles.amountCredit : styles.amountDebit,
          ]}
        >
          {isCredit ? '+' : '-'}
          {amount.toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          {currency}
        </Text>
        <StatusBadge status={status} />
        <Text style={styles.date}>{date}</Text>
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
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: isRTL ? 0 : 12,
    marginLeft: isRTL ? 12 : 0,
  },
  flag: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    alignItems: isRTL ? 'flex-end' : 'flex-start',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  method: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  idText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  rightSectionRTL: {
    alignItems: 'flex-start',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  amountCredit: {
    color: COLORS.success,
  },
  amountDebit: {
    color: COLORS.danger,
  },
  date: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
})
