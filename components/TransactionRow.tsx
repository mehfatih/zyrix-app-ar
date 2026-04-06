// components/TransactionRow.tsx
import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
} from 'react-native'
import Svg, { Path, Rect, Circle, Line, Polyline } from 'react-native-svg'
import { COLORS } from '../constants/colors'
import { useTranslation } from '../hooks/useTranslation'
import StatusBadge from './StatusBadge'

const isRTL = I18nManager.isRTL

// ─── رموز العملات بالعربية ────────────────────────
const CURRENCY_AR: Record<string, string> = {
  SAR: 'ر.س',
  AED: 'د.إ',
  KWD: 'د.ك',
  QAR: 'ر.ق',
  IQD: 'د.ع',
  USD: '$',
  EUR: '€',
  TRY: '₺',
}

// ─── أسماء طرق الدفع بالعربية ────────────────────
const METHOD_AR: Record<string, string> = {
  'Credit card':     'بطاقة ائتمان',
  'credit_card':     'بطاقة ائتمان',
  'Debit card':      'بطاقة مدين',
  'debit_card':      'بطاقة مدين',
  'Bank transfer':   'تحويل بنكي',
  'bank_transfer':   'تحويل بنكي',
  'Digital wallet':  'محفظة رقمية',
  'digital_wallet':  'محفظة رقمية',
  'Cash':            'نقدي',
  'cash':            'نقدي',
  'Crypto':          'كريبتو',
  'crypto':          'كريبتو',
  'Fraud blocked':   'محظور - احتيال',
  'fraud_blocked':   'محظور - احتيال',
  'COD':             'الدفع عند الاستلام',
  'cod':             'الدفع عند الاستلام',
  'BNPL':            'اشتري الآن وادفع لاحقاً',
  'bnpl':            'اشتري الآن وادفع لاحقاً',
}

// ─── ألوان وأيقونات كل طريقة دفع ─────────────────
interface MethodStyle {
  bg: string
  iconColor: string
  icon: React.ReactNode
}

function getMethodStyle(method: string): MethodStyle {
  const key = method?.toLowerCase?.() ?? ''

  // بطاقة ائتمان / مدين
  if (key.includes('credit') || key.includes('debit') || key.includes('card')) {
    return {
      bg: 'rgba(26, 86, 219, 0.15)',
      iconColor: '#60A5FA',
      icon: (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Rect x="1" y="4" width="22" height="16" rx="2" ry="2"
            stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="1" y1="10" x2="23" y2="10"
            stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
          {/* شريط مغناطيسي */}
          <Rect x="4" y="14" width="6" height="2" rx="1" fill="#60A5FA" opacity="0.7" />
        </Svg>
      ),
    }
  }

  // تحويل بنكي
  if (key.includes('bank') || key.includes('transfer')) {
    return {
      bg: 'rgba(13, 148, 136, 0.15)',
      iconColor: '#2DD4BF',
      icon: (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          {/* مبنى البنك */}
          <Path d="M3 22V9M21 22V9" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" />
          <Path d="M3 9l9-7 9 7" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="1" y1="22" x2="23" y2="22" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" />
          <Rect x="9" y="14" width="6" height="8" stroke="#2DD4BF" strokeWidth="2" />
          {/* سهم */}
          <Line x1="7" y1="12" x2="17" y2="12" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
      ),
    }
  }

  // محفظة رقمية
  if (key.includes('wallet') || key.includes('digital')) {
    return {
      bg: 'rgba(139, 92, 246, 0.15)',
      iconColor: '#A78BFA',
      icon: (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"
            stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M16 3.13a4 4 0 010 7.75"
            stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" />
          <Circle cx="16" cy="14" r="1.5" fill="#A78BFA" />
        </Svg>
      ),
    }
  }

  // نقدي / COD
  if (key.includes('cash') || key.includes('cod')) {
    return {
      bg: 'rgba(245, 158, 11, 0.15)',
      iconColor: '#FCD34D',
      icon: (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Rect x="2" y="6" width="20" height="14" rx="2"
            stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="12" cy="13" r="3" stroke="#FCD34D" strokeWidth="2" />
          <Path d="M12 4v2M6 4v2M18 4v2"
            stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" />
        </Svg>
      ),
    }
  }

  // كريبتو
  if (key.includes('crypto') || key.includes('bitcoin') || key.includes('eth')) {
    return {
      bg: 'rgba(249, 115, 22, 0.15)',
      iconColor: '#FB923C',
      icon: (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M12 2L2 7l10 5 10-5-10-5z"
            stroke="#FB923C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M2 17l10 5 10-5"
            stroke="#FB923C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M2 12l10 5 10-5"
            stroke="#FB923C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ),
    }
  }

  // محظور / احتيال
  if (key.includes('fraud') || key.includes('blocked') || key.includes('block')) {
    return {
      bg: 'rgba(220, 38, 38, 0.15)',
      iconColor: '#F87171',
      icon: (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="10" stroke="#F87171" strokeWidth="2" />
          <Line x1="4.93" y1="4.93" x2="19.07" y2="19.07"
            stroke="#F87171" strokeWidth="2" strokeLinecap="round" />
        </Svg>
      ),
    }
  }

  // BNPL — اشتري الآن وادفع لاحقاً
  if (key.includes('bnpl') || key.includes('installment') || key.includes('later')) {
    return {
      bg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#34D399',
      icon: (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M12 8v4l3 3" stroke="#34D399" strokeWidth="2" strokeLinecap="round" />
          <Circle cx="12" cy="12" r="10" stroke="#34D399" strokeWidth="2" />
        </Svg>
      ),
    }
  }

  // افتراضي — معاملة عامة
  return {
    bg: 'rgba(100, 116, 139, 0.15)',
    iconColor: '#94A3B8',
    icon: (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
          stroke="#94A3B8" strokeWidth="2" />
        <Path d="M8 12h8M12 8l4 4-4 4"
          stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
  }
}

// ─── Props ────────────────────────────────────────
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

// ─── Component ────────────────────────────────────
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
  const currencyLabel = CURRENCY_AR[currency] ?? currency
  const methodLabel   = METHOD_AR[method] ?? method
  const ms            = getMethodStyle(method)

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* يسار: أيقونة الخدمة + معلومات */}
      <View style={[styles.leftSection, isRTL && styles.leftSectionRTL]}>

        {/* ── أيقونة نوع الخدمة ── */}
        <View style={[styles.iconContainer, { backgroundColor: ms.bg }]}>
          {ms.icon}
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.method} numberOfLines={1}>{methodLabel}</Text>
          <Text style={styles.idText}>{id}</Text>
        </View>
      </View>

      {/* يمين: المبلغ + الحالة + التاريخ */}
      <View style={[styles.rightSection, isRTL && styles.rightSectionRTL]}>
        <Text style={[styles.amount, isCredit ? styles.amountCredit : styles.amountDebit]}>
          {isCredit ? '+' : '-'}
          {amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          {currencyLabel}
        </Text>
        <StatusBadge status={status} />
        <Text style={styles.date}>{date}</Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Styles ───────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.cardBg,
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
  // ── الدائرة الجديدة — شفافة ملونة حسب الخدمة ──
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: isRTL ? 0 : 12,
    marginLeft: isRTL ? 12 : 0,
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