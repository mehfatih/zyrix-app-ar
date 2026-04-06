// app/(merchant)/balance.tsx
import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  I18nManager, SafeAreaView, Alert, ActivityIndicator, RefreshControl,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { useCurrency } from '../../hooks/useCurrency'
import { balanceApi } from '../../services/api'
import KpiCard from '../../components/KpiCard'
import { QRCodeModal } from '../../components/QRCodeModal'
import { TabHeader } from '../../components/TabHeader';

const isRTL = I18nManager.isRTL

function SectionTitle({ text }: { text: string }) {
  return <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>{text}</Text>
}

export default function BalanceScreen() {
  const { t } = useTranslation()
  const { format, convert, currency } = useCurrency('SAR')
  const [ibanCopied, setIbanCopied] = useState(false)
  const [balanceData, setBalanceData] = useState<{
    available: number; incoming: number; outgoing: number;
    iban: string; company: string;
    nextSettlement: { id: string; date: string; net: number; commission: number; dateAmount?: number } | null
  } | null>(null)
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

  const bal = balanceData || { available: 0, iban: '', company: '', incoming: 0, outgoing: 0, nextSettlement: null }

  const handleCopyIban = () => {
    Clipboard.setStringAsync(bal.iban)
    setIbanCopied(true)
    setTimeout(() => setIbanCopied(false), 2000)
  }

  const handleTransfer = () => Alert.alert(t('balance.transfer'), bal.iban)
  const handleQr = () => setShowQR(true)

  if (loading && !balanceData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <TabHeader title={t('balance.title')} accentColor="#0D9488" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  const netAmount = bal.nextSettlement?.net ?? bal.nextSettlement?.dateAmount ?? 0
  const commission = bal.nextSettlement?.commission ?? 0
  const maxFlow = Math.max(bal.incoming, Math.abs(bal.outgoing), 1)
  const fmt = (amount: number) => format(convert(amount, 'SAR', currency), currency)

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── InnerHeader ── */}
      <TabHeader title={t('balance.title')} accentColor="#0D9488" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{t('balance.available')}</Text>
          <Text style={styles.heroAmount}>{fmt(bal.available)}</Text>

          <View style={[styles.actionRow, isRTL && styles.actionRowRTL]}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]} onPress={handleTransfer} activeOpacity={0.75}>
              <Text style={styles.actionIcon}>↑</Text>
              <Text style={[styles.actionLabel, { color: COLORS.white }]}>{t('balance.transfer')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(13, 148, 136, 0.25)', borderColor: 'rgba(13, 148, 136, 0.5)' }]} onPress={handleCopyIban} activeOpacity={0.75}>
              <Text style={styles.actionIcon}>⧉</Text>
              <Text style={[styles.actionLabel, { color: '#0D9488' }]}>{t('balance.copy_iban')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(139, 92, 246, 0.2)', borderColor: 'rgba(139, 92, 246, 0.4)' }]} onPress={handleQr} activeOpacity={0.75}>
              <Text style={styles.actionIcon}>▦</Text>
              <Text style={[styles.actionLabel, { color: COLORS.chart.purple }]}>{t('balance.qr_code')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.ibanRow, isRTL && styles.ibanRowRTL]} onPress={handleCopyIban} activeOpacity={0.7}>
            <Text style={styles.ibanLabel}>IBAN</Text>
            <Text style={styles.ibanValue} numberOfLines={1} adjustsFontSizeToFit>{bal.iban}</Text>
            <Text style={[styles.ibanCopied, { opacity: ibanCopied ? 1 : 0 }]}>✓</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.flowRow, isRTL && styles.flowRowRTL]}>
          <View style={[styles.flowCard, { backgroundColor: 'rgba(5, 150, 105, 0.12)', borderColor: 'rgba(5, 150, 105, 0.3)' }]}>
            <View style={[styles.flowDot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.flowLabel}>{t('balance.incoming')}</Text>
            <Text style={[styles.flowAmount, { color: COLORS.success }]}>+{fmt(bal.incoming)}</Text>
          </View>
          <View style={[styles.flowCard, { backgroundColor: 'rgba(220, 38, 38, 0.12)', borderColor: 'rgba(220, 38, 38, 0.3)' }]}>
            <View style={[styles.flowDot, { backgroundColor: COLORS.danger }]} />
            <Text style={styles.flowLabel}>{t('balance.outgoing')}</Text>
            <Text style={[styles.flowAmount, { color: COLORS.danger }]}>-{fmt(Math.abs(bal.outgoing))}</Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <View style={styles.chartBarGroup}>
            <View style={styles.chartBarTrack}>
              <View style={[styles.chartBarFill, { backgroundColor: COLORS.success, height: `${Math.max((bal.incoming / maxFlow) * 100, 8)}%` }]} />
            </View>
            <Text style={[styles.chartBarLabel, { color: COLORS.success }]}>{t('balance.incoming')}</Text>
          </View>
          <View style={styles.chartBarGroup}>
            <View style={styles.chartBarTrack}>
              <View style={[styles.chartBarFill, { backgroundColor: COLORS.danger, height: `${Math.max((Math.abs(bal.outgoing) / maxFlow) * 100, 8)}%` }]} />
            </View>
            <Text style={[styles.chartBarLabel, { color: COLORS.danger }]}>{t('balance.outgoing')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle text={t('balance.next_settlement')} />
          <View style={styles.settlementCard}>
            <View style={styles.settlementCardHeader}>
              <Text style={styles.settlementCardTitle}>{t('balance.next_settlement')}</Text>
            </View>
            <View style={[styles.settRow, { backgroundColor: 'rgba(26, 86, 219, 0.08)' }]}>
              <Text style={styles.settLabel}>📅 {t('settlements.date') || 'التاريخ'}</Text>
              <Text style={styles.settValue}>{bal.nextSettlement?.date ?? '2026-04-07'}</Text>
            </View>
            <View style={[styles.settRow, { backgroundColor: 'rgba(26, 86, 219, 0.04)' }]}>
              <Text style={styles.settLabel}>{t('profile.company')}</Text>
              <Text style={styles.settValue}>{bal.company || 'Zyrix Global Technology'}</Text>
            </View>
            <View style={[styles.settRow, { backgroundColor: 'rgba(26, 86, 219, 0.08)' }]}>
              <Text style={styles.settLabel}>{t('settlements.gross') || 'الإجمالي'}</Text>
              <Text style={styles.settValue}>{fmt(bal.available)}</Text>
            </View>
            <View style={[styles.settRow, { backgroundColor: 'rgba(26, 86, 219, 0.04)' }]}>
              <Text style={styles.settLabel}>{t('settlements.commission')}</Text>
              <Text style={[styles.settValue, { color: COLORS.danger }]}>-{fmt(commission)}</Text>
            </View>
            <View style={[styles.settRow, { backgroundColor: 'rgba(26, 86, 219, 0.08)' }]}>
              <Text style={styles.settLabel}>{t('settlements.net')}</Text>
              <Text style={[styles.settValue, { color: COLORS.success }]}>+{fmt(netAmount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle text={t('profile.title')} />
          <View style={styles.infoCard}>
            <View style={[styles.infoRow, { backgroundColor: 'rgba(139, 92, 246, 0.08)' }]}>
              <Text style={styles.infoLabel}>{t('profile.merchantId')}</Text>
              <Text style={styles.infoValue}>ZRX-10042</Text>
            </View>
            <View style={[styles.infoRow, { backgroundColor: 'rgba(139, 92, 246, 0.04)' }]}>
              <Text style={styles.infoLabel}>{t('profile.company')}</Text>
              <Text style={styles.infoValue}>{bal.company || 'Zyrix Global Technology'}</Text>
            </View>
            <View style={[styles.infoRow, { backgroundColor: 'rgba(139, 92, 246, 0.08)' }]}>
              <Text style={styles.infoLabel}>IBAN</Text>
              <Text style={[styles.infoValue, styles.infoValueMono]} numberOfLines={1} adjustsFontSizeToFit>{bal.iban}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.darkBg },
  scrollContent: { paddingBottom: 120 },
  textRight: { textAlign: 'right' },
  heroCard: { margin: 16, borderRadius: 16, backgroundColor: 'rgba(13, 148, 136, 0.15)', borderWidth: 1, borderColor: 'rgba(13, 148, 136, 0.35)', padding: 24 },
  heroLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1, color: COLORS.textSecondary, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' },
  heroAmount: { fontSize: 36, fontWeight: '800', color: COLORS.white, marginBottom: 24, textAlign: isRTL ? 'right' : 'left' },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionRowRTL: { flexDirection: 'row-reverse' },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  actionIcon: { fontSize: 18, color: COLORS.white },
  actionLabel: { fontSize: 11, fontWeight: '600' },
  ibanRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, gap: 6, borderWidth: 1, borderColor: COLORS.border },
  ibanRowRTL: { flexDirection: 'row-reverse' },
  ibanLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 0.5 },
  ibanValue: { flex: 1, fontSize: 10, color: COLORS.textPrimary, fontFamily: 'monospace', letterSpacing: 0.5 },
  ibanCopied: { fontSize: 14, color: COLORS.success, fontWeight: '700' },
  flowRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 6, gap: 10 },
  flowRowRTL: { flexDirection: 'row-reverse' },
  flowCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 16, alignItems: isRTL ? 'flex-end' : 'flex-start' },
  flowDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  flowLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 4 },
  flowAmount: { fontSize: 18, fontWeight: '800' },
  chartContainer: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-around', alignItems: 'flex-end', backgroundColor: COLORS.cardBg, marginHorizontal: 16, marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, height: 120 },
  chartBarGroup: { alignItems: 'center', flex: 1, gap: 4 },
  chartBarTrack: { width: 36, height: 65, backgroundColor: COLORS.surfaceBg, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  chartBarFill: { width: '100%', borderRadius: 6 },
  chartBarLabel: { fontSize: 11, fontWeight: '700' },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.5, marginBottom: 10 },
  settlementCard: { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(26, 86, 219, 0.3)', overflow: 'hidden' },
  settlementCardHeader: { backgroundColor: 'rgba(26, 86, 219, 0.15)', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(26, 86, 219, 0.2)' },
  settlementCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, textAlign: isRTL ? 'right' : 'left' },
  settRow: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  settLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  settValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  infoCard: { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.3)', overflow: 'hidden' },
  infoRow: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600', maxWidth: '60%', textAlign: isRTL ? 'left' : 'right' },
  infoValueMono: { fontFamily: 'monospace', fontSize: 10 },
})