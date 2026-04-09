/**
 * Zyrix App — Payment Link Detail Screen  (SCREEN 3 of 4)
 * تفاصيل رابط الدفع + إحصائيات الأداء
 *
 * 📁 app/(merchant)/payment-link-detail.tsx
 */

import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  I18nManager, SafeAreaView, ActivityIndicator, Alert, Share,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme'
import { paymentLinksApi } from '../../services/api'
import { StatusBadge } from '../../components/StatusBadge'
import { QRCodeModal } from '../../components/QRCodeModal'
import { InnerHeader } from '../../components/InnerHeader'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { KpiCard } from '../../components/KpiCard'
import Svg, { Path, Circle } from 'react-native-svg'

const isRTL = I18nManager.isRTL

// ─── Currency Map ────────────────────────────────

const CURRENCY_AR: Record<string, string> = {
  SAR: 'ر.س', AED: 'د.إ', KWD: 'د.ك', QAR: 'ر.ق', USD: '$',
}

// ─── Icons ───────────────────────────────────────

const IconShare = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"
      stroke={COLORS.white} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

const IconCopy = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2"
      stroke={COLORS.white} strokeWidth={2.2} strokeLinecap="round" />
    <Path d="M8 4a2 2 0 012-2h4a2 2 0 012 2v0a2 2 0 01-2 2h-4a2 2 0 01-2-2z"
      stroke={COLORS.white} strokeWidth={2.2} />
  </Svg>
)

const IconQr = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z"
      stroke={COLORS.white} strokeWidth={2} strokeLinejoin="round" />
    <Path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17v3M17 14h3"
      stroke={COLORS.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

const IconExternal = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
      stroke={COLORS.primaryLight} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

// ─── Types ───────────────────────────────────────

interface PaymentLink {
  id: string; linkId: string; amount: string; currency: string
  title: string; description: string | null; status: string
  expiresAt: string | null; createdAt: string; paymentUrl?: string
  views?: number; conversions?: number
}

// ─── Demo Stats ──────────────────────────────────

const DEMO_LINK: PaymentLink = {
  id: '1', linkId: 'ZRX-PL-001', amount: '5000', currency: 'SAR',
  title: 'تصميم متجر إلكتروني', description: 'تصميم وبرمجة متجر متكامل مع لوحة تحكم كاملة',
  status: 'active', expiresAt: null, createdAt: '2026-04-01',
  paymentUrl: 'https://pay.zyrix.co/ZRX-PL-001', views: 24, conversions: 3,
}

const DEMO_ACTIVITY = [
  { time: 'منذ ١٢ دقيقة', event: 'مشاهدة من الرياض 🇸🇦',    type: 'view' },
  { time: 'منذ ٣٤ دقيقة', event: 'دفعة ناجحة — ٥٠٠٠ ر.س',  type: 'paid' },
  { time: 'منذ ٢ ساعة',   event: 'مشاهدة من دبي 🇦🇪',       type: 'view' },
  { time: 'منذ ٣ ساعات',  event: 'مشاركة عبر واتساب',       type: 'share' },
  { time: 'منذ ٥ ساعات',  event: 'مشاهدة من جدة 🇸🇦',       type: 'view' },
]

// ─── Main Screen ─────────────────────────────────

export default function PaymentLinkDetailScreen() {
  const router = useRouter()
  const tabBarHeight = useTabBarHeight()
  const params = useLocalSearchParams<{ linkId: string }>()
  const [link, setLink] = useState<PaymentLink | null>(null)
  const [loading, setLoading] = useState(true)
  const [showQr, setShowQr] = useState(false)

  useEffect(() => {
    // In production: fetch from API by linkId
    // For now use demo data
    setTimeout(() => {
      setLink({ ...DEMO_LINK, linkId: params.linkId ?? DEMO_LINK.linkId })
      setLoading(false)
    }, 400)
  }, [params.linkId])

  const handleShare = async () => {
    if (!link) return
    const url = link.paymentUrl || `https://pay.zyrix.co/${link.linkId}`
    try { await Share.share({ message: `${link.title}\n${url}`, url }) } catch {}
  }

  const handleCopy = async () => {
    if (!link) return
    const url = link.paymentUrl || `https://pay.zyrix.co/${link.linkId}`
    await Clipboard.setStringAsync(url)
    Alert.alert('✓', 'تم نسخ الرابط')
  }

  const handleCancel = () => {
    if (!link) return
    Alert.alert('إلغاء الرابط', 'هل أنت متأكد من إلغاء هذا الرابط؟', [
      { text: 'تراجع', style: 'cancel' },
      { text: 'إلغاء', style: 'destructive', onPress: async () => {
        try {
          await paymentLinksApi.cancel(link.linkId)
          Alert.alert('✓', 'تم إلغاء الرابط', [{ text: 'حسناً', onPress: () => router.back() }])
        } catch {}
      }},
    ])
  }

  if (loading || !link) {
    return (
      <SafeAreaView style={s.safe}>
        <InnerHeader title="تفاصيل الرابط" accentColor={COLORS.primaryLight} />
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    )
  }

  const url = link.paymentUrl || `https://pay.zyrix.co/${link.linkId}`
  const convRate = link.views && link.views > 0
    ? Math.round((link.conversions ?? 0) / link.views * 100)
    : 0

  return (
    <SafeAreaView style={s.safe}>
      <InnerHeader title="تفاصيل الرابط" accentColor={COLORS.primaryLight} />

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabBarHeight }]} showsVerticalScrollIndicator={false}>

        {/* ─── Hero Card ─── */}
        <View style={s.heroCard}>
          <View style={[s.heroTop, isRTL && s.rev]}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroTitle}>{link.title}</Text>
              <Text style={s.heroId}>{link.linkId}</Text>
            </View>
            <StatusBadge status={link.status as any} size="md" />
          </View>

          {link.description && (
            <Text style={s.heroDesc}>{link.description}</Text>
          )}

          <View style={s.heroDivider} />

          <View style={[s.heroAmountRow, isRTL && s.rev]}>
            <View>
              <Text style={s.heroAmountLabel}>المبلغ</Text>
              <Text style={s.heroAmount}>
                {Number(link.amount).toLocaleString()} {CURRENCY_AR[link.currency] ?? link.currency}
              </Text>
            </View>
            <View style={isRTL ? { alignItems: 'flex-start' } : { alignItems: 'flex-end' }}>
              <Text style={s.heroAmountLabel}>تاريخ الإنشاء</Text>
              <Text style={s.heroDate}>
                {new Date(link.createdAt).toLocaleDateString('ar-SA')}
              </Text>
            </View>
          </View>

          {link.expiresAt && (
            <View style={s.expiryBanner}>
              <Text style={s.expiryBannerText}>
                ⏱ ينتهي في {new Date(link.expiresAt).toLocaleDateString('ar-SA')} —{' '}
                {new Date(link.expiresAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
        </View>

        {/* ─── URL Row ─── */}
        <View style={s.urlCard}>
          <View style={[s.urlRow, isRTL && s.rev]}>
            <Text style={s.urlText} numberOfLines={1}>{url}</Text>
            <IconExternal />
          </View>
        </View>

        {/* ─── Action Buttons ─── */}
        {link.status === 'active' && (
          <View style={s.actionGrid}>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnBlue]} onPress={handleShare} activeOpacity={0.8}>
              <IconShare />
              <Text style={s.actionBtnText}>مشاركة</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnBlue]} onPress={handleCopy} activeOpacity={0.8}>
              <IconCopy />
              <Text style={s.actionBtnText}>نسخ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnBlue]} onPress={() => setShowQr(true)} activeOpacity={0.8}>
              <IconQr />
              <Text style={s.actionBtnText}>QR</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── KPI Stats ─── */}
        <Text style={s.sectionTitle}>إحصائيات الأداء</Text>
        <View style={s.kpiGrid}>
          <KpiCard
            label="المشاهدات"
            value={link.views ?? 0}
            icon="👁"
            color={COLORS.kpiBlue}
            compact
            style={{ flex: 1 }}
          />
          <KpiCard
            label="المدفوعات"
            value={link.conversions ?? 0}
            icon="✅"
            color={COLORS.kpiGreen}
            compact
            style={{ flex: 1 }}
          />
        </View>
        <View style={[s.kpiGrid, { marginTop: 0 }]}>
          <KpiCard
            label="معدل التحويل"
            value={`${convRate}%`}
            icon="📈"
            color={convRate >= 10 ? COLORS.kpiGreen : COLORS.kpiOrange}
            valueColor={convRate >= 10 ? COLORS.success : COLORS.warning}
            compact
            style={{ flex: 1 }}
          />
          <KpiCard
            label="الإيراد المحصل"
            value={`${(Number(link.amount) * (link.conversions ?? 0)).toLocaleString()} ر.س`}
            icon="💰"
            color={COLORS.kpiGreen}
            valueColor={COLORS.success}
            compact
            style={{ flex: 1 }}
          />
        </View>

        {/* ─── Conversion Bar ─── */}
        <View style={s.convCard}>
          <View style={[s.convHeader, isRTL && s.rev]}>
            <Text style={s.convTitle}>معدل التحويل</Text>
            <Text style={s.convPct}>{convRate}%</Text>
          </View>
          <View style={s.convTrack}>
            <View style={[s.convFill, {
              width: `${Math.min(convRate, 100)}%`,
              backgroundColor: convRate >= 10 ? COLORS.success : COLORS.warning,
            }]} />
          </View>
          <Text style={s.convHint}>
            {link.conversions ?? 0} دفعة من أصل {link.views ?? 0} مشاهدة
          </Text>
        </View>

        {/* ─── Activity Feed ─── */}
        <Text style={s.sectionTitle}>آخر النشاطات</Text>
        <View style={s.activityCard}>
          {DEMO_ACTIVITY.map((item, i) => (
            <View key={i} style={[s.activityRow, isRTL && s.rev,
              i < DEMO_ACTIVITY.length - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
              <View style={[s.activityDot, {
                backgroundColor: item.type === 'paid'
                  ? COLORS.successBg
                  : item.type === 'share'
                  ? COLORS.infoBg
                  : COLORS.surfaceBg,
              }]}>
                <Text style={{ fontSize: 12 }}>
                  {item.type === 'paid' ? '💰' : item.type === 'share' ? '📤' : '👁'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.activityEvent}>{item.event}</Text>
                <Text style={s.activityTime}>{item.time}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ─── Danger Zone ─── */}
        {link.status === 'active' && (
          <TouchableOpacity style={s.cancelCard} onPress={handleCancel} activeOpacity={0.8}>
            <Text style={s.cancelText}>إلغاء هذا الرابط</Text>
            <Text style={s.cancelHint}>لن يتمكن العملاء من الدفع عبر هذا الرابط بعد إلغائه</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* QR Modal */}
      <QRCodeModal
        visible={showQr}
        onClose={() => setShowQr(false)}
        value={url}
        title={link.title}
        subtitle={`${Number(link.amount).toLocaleString()} ${CURRENCY_AR[link.currency] ?? link.currency}`}
      />
    </SafeAreaView>
  )
}

// ─── Styles ──────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.deepBg },
  scroll: { paddingTop: SPACING.md, paddingHorizontal: SPACING.lg,  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  rev:    { flexDirection: 'row-reverse' },

  // Hero
  heroCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  heroTop:   { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginBottom: SPACING.sm },
  heroTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: 4 },
  heroId:    { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontFamily: 'monospace' },
  heroDesc:  { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.md, lineHeight: 20 },
  heroDivider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.md },
  heroAmountRow: { flexDirection: 'row', justifyContent: 'space-between' },
  heroAmountLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 },
  heroAmount: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.success },
  heroDate:  { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },

  // Expiry
  expiryBanner: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.warningBg,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  expiryBannerText: { fontSize: FONT_SIZE.xs, color: COLORS.warning, fontWeight: FONT_WEIGHT.medium, textAlign: 'center' },

  // URL
  urlCard: {
    backgroundColor: COLORS.surfaceBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(26, 86, 219, 0.3)',
  },
  urlRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  urlText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.primaryLight, fontFamily: 'monospace' },

  // Actions
  actionGrid: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  actionBtn: {
    flex: 1, flexDirection: 'column', alignItems: 'center', gap: 6,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  actionBtnBlue: { backgroundColor: COLORS.primary },
  actionBtnText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: COLORS.white },

  // KPIs
  kpiGrid: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  // Section title
  sectionTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
    textAlign: isRTL ? 'right' : 'left',
  },

  // Conversion
  convCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginTop: SPACING.sm,
  },
  convHeader:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  convTitle:   { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  convPct:     { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },
  convTrack: {
    height: 8, backgroundColor: COLORS.surfaceBg,
    borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: SPACING.sm,
  },
  convFill: { height: '100%', borderRadius: RADIUS.full },
  convHint: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, textAlign: isRTL ? 'right' : 'left' },

  // Activity
  activityCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md, paddingVertical: SPACING.lg,
  },
  activityDot: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  activityEvent: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.medium },
  activityTime:  { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },

  // Cancel
  cancelCard: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.dangerBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
    padding: SPACING.lg,
    alignItems: 'center',
    gap: 6,
  },
  cancelText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.danger },
  cancelHint: { fontSize: FONT_SIZE.xs, color: COLORS.dangerLight, textAlign: 'center' },
})