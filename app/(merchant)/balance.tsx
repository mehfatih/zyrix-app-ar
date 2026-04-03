// app/(merchant)/balance.tsx
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

  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { balanceApi } from '../../services/api'
import KpiCard from '../../components/KpiCard'
import { QRCodeModal } from '../../components/QRCodeModal'

const isRTL = I18nManager.isRTL

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ text }: { text: string }) {
  return (
    <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>
      {text}
    </Text>
  )
}

function ActionButton({
  icon,
  label,
  onPress,
  variant = 'default',
}: {
  icon: string
  label: string
  onPress: () => void
  variant?: 'default' | 'primary'
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, variant === 'primary' && styles.actionBtnPrimary]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={[styles.actionLabel, variant === 'primary' && styles.actionLabelPrimary]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BalanceScreen() {
  const { t } = useTranslation()
  const [ibanCopied, setIbanCopied] = useState(false)
  const [balanceData, setBalanceData] = useState<{ available: number; incoming: number; outgoing: number; iban: string; company: string; nextSettlement: { id: string; date: string; net: number; commission: number } | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)

  const fetchData = async () => {
    try {
      setError(null)
      const data = await balanceApi.get()
      setBalanceData(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err) || t('common.error'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  React.useEffect(() => { fetchData() }, [])

  const onRefresh = () => { setRefreshing(true); fetchData() }

  // Use API data or fallback
  const bal = balanceData || { available: 0, iban: '', company: '', incoming: 0, outgoing: 0, nextSettlement: null }

  const handleCopyIban = () => {
    Clipboard.setStringAsync(bal.iban)
    setIbanCopied(true)
    setTimeout(() => setIbanCopied(false), 2000)
  }

  const handleTransfer = () => {
    Alert.alert(t('balance.transfer'), bal.iban)
  }

  const handleQr = () => {
    setShowQR(true)
  }

  if (loading && !balanceData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Page Header ── */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, isRTL && styles.textRight]}>
            {t('balance.title')}
          </Text>
        </View>

        {/* ── Hero Card — Available Balance ── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{t('balance.available')}</Text>
          <Text style={styles.heroAmount}>
            {bal.available.toLocaleString('en-US', {
              minimumFractionDigits: 2,
            })}{' '}
            <Text style={styles.heroCurrency}>{'USD'}</Text>
          </Text>

          {/* Action Buttons */}
          <View style={[styles.actionRow, isRTL && styles.actionRowRTL]}>
            <ActionButton
              icon="↑"
              label={t('balance.transfer')}
              onPress={handleTransfer}
              variant="primary"
            />
            <ActionButton
              icon="⧉"
              label={t('balance.copy_iban')}
              onPress={handleCopyIban}
            />
            <ActionButton
              icon="▦"
              label={t('balance.qr_code')}
              onPress={handleQr}
            />
          </View>

          {/* IBAN row */}
          <TouchableOpacity
            style={[styles.ibanRow, isRTL && styles.ibanRowRTL]}
            onPress={handleCopyIban}
            activeOpacity={0.7}
          >
            <Text style={styles.ibanLabel}>IBAN</Text>
            <Text style={styles.ibanValue}>{bal.iban}</Text>
            <Text style={[styles.ibanCopied, { opacity: ibanCopied ? 1 : 0 }]}>
              ✓
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── KPI Row — Incoming / Outgoing ── */}
        <View style={styles.kpiRow}>
          {[{ label: 'incoming', amount: bal.incoming, sign: '+', color: COLORS.success }, { label: 'outgoing', amount: bal.outgoing, sign: '-', color: COLORS.danger }].map((item) => (
            <KpiCard
              key={item.label}
              label={t(`balance.${item.label}`)}
              value={`${item.sign}${item.amount.toLocaleString('en-US', {
                minimumFractionDigits: 2,
              })} $`}
              valueColor={item.color}
              style={styles.kpiCard}
            />
          ))}
        </View>

        {/* ── Next Settlement Card ── */}
        <View style={styles.section}>
          <SectionTitle text={t('balance.next_settlement')} />

          <View style={styles.settlementCard}>
            {/* Date row */}
            <View style={[styles.settlementRow, isRTL && styles.settlementRowRTL]}>
              <View style={styles.settlementLeft}>
                <Text style={styles.settlementDate}>
                  📅  {bal.nextSettlement?.date}
                </Text>
                <Text style={styles.settlementCompany}>
                  {bal.company}
                </Text>
              </View>
              <View style={styles.settlementRight}>
                <Text style={styles.settlementNet}>
                  +{(bal.nextSettlement?.dateAmount ?? 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  {'USD'}
                </Text>
                <Text style={styles.settlementNetLabel}>Net</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Breakdown */}
            <View style={[styles.breakdownRow, isRTL && styles.breakdownRowRTL]}>
              <BreakdownItem
                label={t('settlements.pending')}
                value={`$${bal.available.toFixed(2)}`}
                color={COLORS.textPrimary}
              />
              <BreakdownItem
                label={t('settlements.commission')}
                value={`-$${(bal.nextSettlement?.commission ?? 0).toFixed(2)}`}
                color={COLORS.danger}
              />
              <BreakdownItem
                label={t('settlements.net')}
                value={`$${(bal.nextSettlement?.dateAmount ?? 0).toFixed(2)}`}
                color={COLORS.success}
              />
            </View>
          </View>
        </View>

        {/* ── Account Info ── */}
        <View style={styles.section}>
          <SectionTitle text="Merchant ID" />
          <View style={styles.infoCard}>
            <InfoRow label={t('profile.merchantId')} value="ZRX-10042" />
            <InfoRow label={t('profile.company')} value={bal.company} />
            <InfoRow label="IBAN" value={bal.iban} mono />
          </View>
        </View>

      </ScrollView>
      <QRCodeModal
        visible={showQR}
        onClose={() => setShowQR(false)}
        value={balanceData?.iban || ""}
        title="IBAN QR Code"
        subtitle={balanceData?.company || ""}
      />
    </SafeAreaView>
  )
}

// ─── Helper components ────────────────────────────────────────────────────────

function BreakdownItem({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <View style={styles.breakdownItem}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={[styles.breakdownValue, { color }]}>{value}</Text>
    </View>
  )
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.infoValueMono]}>
        {value}
      </Text>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  textRight: {
    textAlign: 'right',
  },

  // Hero card
  heroCard: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: COLORS.darkBg,
    padding: 24,
    shadowColor: COLORS.deepBg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: isRTL ? 'right' : 'left',
  },
  heroAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 24,
    textAlign: isRTL ? 'right' : 'left',
  },
  heroCurrency: {
    fontSize: 20,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionRowRTL: {
    flexDirection: 'row-reverse',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.divider,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 4,
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionIcon: {
    fontSize: 18,
    color: COLORS.white,
  },
  actionLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  actionLabelPrimary: {
    color: COLORS.white,
  },

  // IBAN
  ibanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.divider,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  ibanRowRTL: {
    flexDirection: 'row-reverse',
  },
  ibanLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ibanValue: {
    flex: 1,
    fontSize: 12,
    color: COLORS.white,
    fontFamily: 'monospace',
  },
  ibanCopied: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '700',
  },

  // KPI row
  kpiRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
  },

  // Section
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // Settlement card
  settlementCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settlementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  settlementRowRTL: {
    flexDirection: 'row-reverse',
  },
  settlementLeft: {
    flex: 1,
  },
  settlementDate: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  settlementCompany: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  settlementRight: {
    alignItems: 'flex-end',
  },
  settlementNet: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.success,
  },
  settlementNetLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownRowRTL: {
    flexDirection: 'row-reverse',
  },
  breakdownItem: {
    alignItems: 'center',
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Info card
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoRowRTL: {
    flexDirection: 'row-reverse',
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: isRTL ? 'left' : 'right',
  },
  infoValueMono: {
    fontFamily: 'monospace',
    fontSize: 11,
  },
})
