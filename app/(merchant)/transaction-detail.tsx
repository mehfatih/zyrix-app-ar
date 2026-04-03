// app/(merchant)/transaction-detail.tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  I18nManager,
  SafeAreaView,
  Alert,

} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { transactionsApi } from '../../services/api'
import StatusBadge from '../../components/StatusBadge'
import { useToast } from '../../components/Toast'

const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────────────────────────────────

type TxStatus = 'success' | 'pending' | 'failed'

interface TimelineEvent {
  label: string
  time: string
  done: boolean
}

interface TransactionDetail {
  id: string
  date: string
  name: string
  method: string
  flag: string
  country: string
  amount: number
  currency: string
  isCredit: boolean
  status: TxStatus
  fee: number
  net: number
  cardLast4?: string
  cardBrand?: string
  iban?: string
  authCode?: string
  referenceId: string
  ipAddress: string
  timeline: TimelineEvent[]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={section.wrapper}>
      <Text style={[section.title, isRTL && section.titleRTL]}>{title}</Text>
      <View style={section.card}>{children}</View>
    </View>
  )
}

function DetailRow({
  label,
  value,
  mono,
  copyable,
  valueColor,
}: {
  label: string
  value: string
  mono?: boolean
  copyable?: boolean
  valueColor?: string
}) {
  const handleCopy = () => {
    Clipboard.setStringAsync(value)
    Alert.alert('✓', 'تم النسخ')
  }

  return (
    <TouchableOpacity
      style={[detailRow.container, isRTL && detailRow.containerRTL]}
      onPress={copyable ? handleCopy : undefined}
      activeOpacity={copyable ? 0.65 : 1}
    >
      <Text style={detailRow.label}>{label}</Text>
      <View style={[detailRow.right, isRTL && detailRow.rightRTL]}>
        <Text
          style={[
            detailRow.value,
            mono && detailRow.valueMono,
            valueColor ? { color: valueColor } : null,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
        {copyable && <Text style={detailRow.copyIcon}>⧉</Text>}
      </View>
    </TouchableOpacity>
  )
}

function RowDivider() {
  return <View style={{ height: 1, backgroundColor: COLORS.border }} />
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <View style={timeline.container}>
      {events.map((ev, i) => {
        const isLast = i === events.length - 1
        return (
          <View key={i} style={[timeline.row, isRTL && timeline.rowRTL]}>
            {/* Line + dot */}
            <View style={timeline.track}>
              <View
                style={[
                  timeline.dot,
                  ev.done ? timeline.dotDone : timeline.dotPending,
                ]}
              >
                {ev.done && <Text style={timeline.dotCheck}>✓</Text>}
              </View>
              {!isLast && (
                <View
                  style={[
                    timeline.line,
                    events[i + 1]?.done ? timeline.lineDone : timeline.linePending,
                  ]}
                />
              )}
            </View>
            {/* Text */}
            <View style={[timeline.textBlock, isRTL && timeline.textBlockRTL]}>
              <Text
                style={[
                  timeline.eventLabel,
                  ev.done ? timeline.eventLabelDone : timeline.eventLabelPending,
                ]}
              >
                {ev.label}
              </Text>
              <Text style={timeline.eventTime}>{ev.time}</Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

// ─── Actions ──────────────────────────────────────────────────────────────────

function ActionButton({
  icon,
  label,
  onPress,
  variant = 'default',
}: {
  icon: string
  label: string
  onPress: () => void
  variant?: 'default' | 'danger'
}) {
  return (
    <TouchableOpacity
      style={[action.btn, variant === 'danger' && action.btnDanger]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={action.icon}>{icon}</Text>
      <Text style={[action.label, variant === 'danger' && action.labelDanger]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TransactionDetailScreen() {
  const { t }  = useTranslation()
  const router = useRouter()
  const { showToast } = useToast()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [tx, setTx] = useState<TransactionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    const fetchTx = async () => {
      try {
        const data = await transactionsApi.getById(id ?? '')
        setTx(data)
      } catch (err) {
        console.warn(err)
      } finally {
        setLoading(false)
      }
    }
    fetchTx()
  }, [id])

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (!tx) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('transactions.not_found')}: {id}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Geri dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const handleRefund = () =>
    Alert.alert(t('transactions.refund_title'), t('transactions.refund_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('transactions.refund_action'), style: 'destructive', onPress: () => {} },
    ])

  const handleDispute = () =>
    Alert.alert(t('transactions.dispute_title'), t('transactions.dispute_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('transactions.dispute_action'), style: 'destructive', onPress: () => {} },
    ])

  const handleShare = () =>
    showToast(t('transactions.share_receipt'), 'info')

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Back button */}
      <TouchableOpacity
        style={[styles.backBtn, isRTL && styles.backBtnRTL]}
        onPress={() => router.back()}
      >
        <Text style={[styles.backIcon, isRTL && styles.backIconRTL]}>←</Text>
        <Text style={styles.backText}>{	('transactions.back_to_list')}</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Text style={styles.heroFlag}>{tx.flag}</Text>

          <Text
            style={[
              styles.heroAmount,
              tx.status === 'failed'
                ? { color: COLORS.danger }
                : tx.isCredit
                ? { color: COLORS.success }
                : { color: COLORS.danger },
            ]}
          >
            {tx.status === 'failed'
              ? '—'
              : `${tx.isCredit ? '+' : '-'}${tx.amount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })} ${tx.currency}`}
          </Text>

          <StatusBadge status={tx.status} />

          <Text style={styles.heroName}>{tx.name}</Text>
          <Text style={styles.heroDate}>{tx.date}</Text>
        </View>

        {/* ── Actions ── */}
        <View style={[styles.actionsRow, isRTL && styles.actionsRowRTL]}>
          <ActionButton icon="↩" label={t('refunds.title')}      onPress={handleRefund}  variant={tx.status === 'success' ? 'danger' : 'default'} />
          <ActionButton icon="⚡" label={t('disputes.title')} onPress={handleDispute} />
          <ActionButton icon="↑" label={t('common.export')}    onPress={handleShare}   />
        </View>

        {/* ── Fee breakdown ── */}
        {tx.status !== 'failed' && (
          <Section title={t('transactions.amount_breakdown')}>
            <DetailRow
              label={t('transactions.gross_amount')}
              value={`${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${tx.currency}`}
              valueColor={COLORS.textPrimary}
            />
            <RowDivider />
            <DetailRow
              label={t('transactions.fee')}
              value={`-${tx.fee.toFixed(2)} ${tx.currency}`}
              valueColor={COLORS.danger}
            />
            <RowDivider />
            <DetailRow
              label={t('transactions.net')}
              value={`${tx.net.toFixed(2)} ${tx.currency}`}
              valueColor={COLORS.success}
            />
          </Section>
        )}

        {/* ── Payment details ── */}
        <Section title={t('transactions.payment_info')}>
          <DetailRow label={t('transactions.transaction_id')}  value={tx.id}           mono copyable />
          <RowDivider />
          <DetailRow label={t('transactions.transaction_id')}  value={tx.referenceId}  mono copyable />
          <RowDivider />
          <DetailRow label="Yöntem"    value={tx.method} />
          <RowDivider />
          <DetailRow label={t('transactions.country')}      value={`${tx.flag} ${tx.country}`} />
          {tx.cardLast4 && (
            <>
              <RowDivider />
              <DetailRow
                label={t('transactions.card')}
                value={`${tx.cardBrand ?? ''} •••• ${tx.cardLast4}`}
              />
            </>
          )}
          {tx.iban && (
            <>
              <RowDivider />
              <DetailRow label="IBAN" value={tx.iban} mono copyable />
            </>
          )}
          {tx.authCode && (
            <>
              <RowDivider />
              <DetailRow
                label={t('transactions.status')}
                value={tx.authCode}
                mono
                valueColor={
                  tx.authCode === 'DECLINED' ? COLORS.danger : COLORS.success
                }
              />
            </>
          )}
          <RowDivider />
          <DetailRow label="IP Adresi"  value={tx.ipAddress} mono />
        </Section>

        {/* ── Timeline ── */}
        <Section title={t('transactions.transaction_flow')}>
          <View style={{ padding: 16 }}>
            <Timeline events={tx.timeline} />
          </View>
        </Section>

      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
  },
  scrollContent: {
    paddingBottom: 48,
  },

  // Back button
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtnRTL: {
    flexDirection: 'row-reverse',
  },
  backIcon: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: '600',
  },
  backIconRTL: {
    transform: [{ scaleX: -1 }],
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Hero
  hero: {
    backgroundColor: COLORS.white,
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  heroFlag: {
    fontSize: 40,
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  heroDate: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actionsRowRTL: {
    flexDirection: 'row-reverse',
  },

  // Not found
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notFoundText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  backLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
})

const section = StyleSheet.create({
  wrapper: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  titleRTL: {
    textAlign: 'right',
    marginLeft: 0,
    marginRight: 4,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
})

const detailRow = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    flexShrink: 0,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  rightRTL: {
    justifyContent: 'flex-start',
    flexDirection: 'row-reverse',
  },
  value: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
  valueMono: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  copyIcon: {
    fontSize: 14,
    color: COLORS.textMuted,
    flexShrink: 0,
  },
})

const action = StyleSheet.create({
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  btnDanger: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.danger,
  },
  icon: {
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  labelDanger: {
    color: COLORS.danger,
  },
})

const timeline = StyleSheet.create({
  container: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  track: {
    alignItems: 'center',
    width: 24,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  dotDone: {
    backgroundColor: COLORS.success,
  },
  dotPending: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  dotCheck: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '800',
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 24,
    marginVertical: 2,
  },
  lineDone: {
    backgroundColor: COLORS.success,
  },
  linePending: {
    backgroundColor: COLORS.border,
  },
  textBlock: {
    flex: 1,
    paddingBottom: 20,
    gap: 3,
  },
  textBlockRTL: {
    alignItems: 'flex-end',
  },
  eventLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventLabelDone: {
    color: COLORS.textPrimary,
  },
  eventLabelPending: {
    color: COLORS.textMuted,
  },
  eventTime: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
})
