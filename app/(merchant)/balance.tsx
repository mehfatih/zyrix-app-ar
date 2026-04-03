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
  Modal,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { balanceApi } from '../../services/api'
import KpiCard from '../../components/KpiCard'
import { QRCodeModal } from '../../components/QRCodeModal'
import { useToast } from '../../components/Toast'

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
  const { showToast } = useToast()
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
    showToast(t('common.copied'), 'success')
    setTimeout(() => setIbanCopied(false), 2000)
  }

  const [showTransfer, setShowTransfer] = useState(false)

  const handleTransfer = () => {
    setShowTransfer(true)
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
            {/* Header row */}
            <View style={styles.settlementHeader}>
              <Text style={styles.settlementHeaderText}>{t('balance.next_settlement')}</Text>
            </View>

            {/* Date & Company row */}
            <View style={[styles.tableRow, styles.tableRowShaded]}>
              <Text style={styles.tableLabel}>📅  {t('settlements.date')}</Text>
              <Text style={styles.tableValue}>{bal.nextSettlement?.date}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{t('profile.company')}</Text>
              <Text style={styles.tableValue}>{bal.company}</Text>
            </View>

            {/* Financial breakdown */}
            <View style={[styles.tableRow, styles.tableRowShaded]}>
              <Text style={styles.tableLabel}>{t('settlements.gross')}</Text>
              <Text style={styles.tableValue}>${bal.available.toFixed(2)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{t('settlements.commission')}</Text>
              <Text style={[styles.tableValue, { color: COLORS.danger }]}>-${(bal.nextSettlement?.commission ?? 0).toFixed(2)}</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowShaded, styles.tableRowLast]}>
              <Text style={[styles.tableLabel, { fontWeight: '700' }]}>{t('settlements.net')}</Text>
              <Text style={[styles.tableValue, { color: COLORS.success, fontWeight: '700', fontSize: 16 }]}>
                +${(bal.nextSettlement?.dateAmount ?? 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Account Info ── */}
        <View style={styles.section}>
          <SectionTitle text={t('profile.title')} />
          <View style={styles.infoCard}>
            <View style={[styles.tableRow, styles.tableRowShaded]}>
              <Text style={styles.tableLabel}>{t('profile.merchantId')}</Text>
              <Text style={[styles.tableValue, { fontFamily: 'monospace' }]}>ZRX-10042</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{t('profile.company')}</Text>
              <Text style={styles.tableValue}>{bal.company}</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowShaded, styles.tableRowLast]}>
              <Text style={styles.tableLabel}>IBAN</Text>
              <Text style={[styles.tableValue, { fontFamily: 'monospace', fontSize: 11 }]}>{bal.iban}</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* ── Transfer Bottom Sheet ── */}
      <Modal
        visible={showTransfer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTransfer(false)}
      >
        <TouchableOpacity
          style={transferStyles.overlay}
          activeOpacity={1}
          onPress={() => setShowTransfer(false)}
        >
          <View style={transferStyles.sheet}>
            <View style={transferStyles.handle} />
            <Text style={[transferStyles.title, isRTL && styles.textRight]}>
              {t('balance.transfer')}
            </Text>

            {/* IBAN display */}
            <TouchableOpacity
              style={transferStyles.ibanBox}
              onPress={() => {
                Clipboard.setStringAsync(bal.iban)
                showToast(t('common.copied'), 'success')
              }}
              activeOpacity={0.7}
            >
              <Text style={transferStyles.ibanLabel}>IBAN</Text>
              <Text style={transferStyles.ibanText}>{bal.iban}</Text>
              <Text style={transferStyles.copyHint}>{t('common.copy')} 📋</Text>
            </TouchableOpacity>

            {/* Open bank app button */}
            <TouchableOpacity
              style={transferStyles.bankBtn}
              onPress={() => {
                setShowTransfer(false)
                // Try to open banking app with IBAN
                Linking.openURL(`https://pay.zyrix.co/transfer?iban=${encodeURIComponent(bal.iban)}`).catch(() => {
                  showToast(t('common.coming_soon'), 'info')
                })
              }}
              activeOpacity={0.75}
            >
              <Text style={transferStyles.bankBtnText}>{t('balance.transfer')} →</Text>
            </TouchableOpacity>

            {/* Close */}
            <TouchableOpacity
              style={transferStyles.closeBtn}
              onPress={() => setShowTransfer(false)}
            >
              <Text style={transferStyles.closeBtnText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: COLORS.cardBg,
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
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  settlementHeader: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  settlementHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: isRTL ? 'right' : 'left',
  },

  // Shared table row styles
  tableRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  tableRowShaded: {
    backgroundColor: COLORS.surfaceBg,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tableValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: isRTL ? 'left' : 'right',
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },

  // Info card
  infoCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
})

// ─── Transfer Bottom Sheet Styles ─────────────────────────────────────────────

const transferStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
    textAlign: isRTL ? 'right' : 'left',
  },
  ibanBox: {
    backgroundColor: COLORS.darkBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ibanLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  ibanText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: isRTL ? 'right' : 'left',
  },
  copyHint: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: isRTL ? 'right' : 'left',
  },
  bankBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  bankBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  closeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
})
