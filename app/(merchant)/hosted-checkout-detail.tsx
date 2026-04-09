/**
 * Zyrix App — Hosted Checkout Detail Screen
 * 📁 app/(merchant)/hosted-checkout-detail.tsx
 */

import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  I18nManager, SafeAreaView, ActivityIndicator, Alert, Share, Switch,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme'
import { InnerHeader } from '../../components/InnerHeader'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { KpiCard } from '../../components/KpiCard'
import { hostedCheckoutApi } from '../../services/api'

const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────────────────

interface CheckoutDetail {
  id: string
  checkoutId: string
  name: string
  description: string | null
  currency: string
  brandColor: string
  theme: string
  isActive: boolean
  status: string
  usageCount: number
  totalRevenue: string
  requirePhone: boolean
  requireAddress: boolean
  allowNote: boolean
  successUrl: string | null
  cancelUrl: string | null
  createdAt: string
  sessions: Array<{
    sessionId: string
    amount: string
    currency: string
    status: string
    createdAt: string
  }>
}

// ─── Demo Data ────────────────────────────────────────────────

const DEMO_DETAIL: CheckoutDetail = {
  id: '1',
  checkoutId: 'ZRX-CHK-A1B2C3D4',
  name: 'متجر الإلكترونيات',
  description: 'صفحة دفع احترافية لمتجر الإلكترونيات مع دعم كامل للعملات المحلية',
  currency: 'SAR',
  brandColor: '#1A56DB',
  theme: 'DARK',
  isActive: true,
  status: 'ACTIVE',
  usageCount: 142,
  totalRevenue: '54800',
  requirePhone: true,
  requireAddress: false,
  allowNote: true,
  successUrl: 'https://mystore.com/success',
  cancelUrl: null,
  createdAt: '2026-04-01',
  sessions: [
    { sessionId: 'ZRX-SES-ABC123', amount: '850', currency: 'SAR', status: 'COMPLETED', createdAt: '2026-04-09T17:30:00Z' },
    { sessionId: 'ZRX-SES-DEF456', amount: '1200', currency: 'SAR', status: 'PENDING',   createdAt: '2026-04-09T15:10:00Z' },
    { sessionId: 'ZRX-SES-GHI789', amount: '450',  currency: 'SAR', status: 'COMPLETED', createdAt: '2026-04-09T12:45:00Z' },
    { sessionId: 'ZRX-SES-JKL012', amount: '3200', currency: 'SAR', status: 'COMPLETED', createdAt: '2026-04-08T09:20:00Z' },
    { sessionId: 'ZRX-SES-MNO345', amount: '680',  currency: 'SAR', status: 'EXPIRED',   createdAt: '2026-04-07T14:00:00Z' },
  ],
}

// ─── Session Status Colors ────────────────────────────────────

const SESSION_STATUS: Record<string, { color: string; bg: string; label: string }> = {
  COMPLETED: { color: COLORS.success,  bg: 'rgba(5,150,105,0.15)',  label: 'مكتملة'  },
  PENDING:   { color: COLORS.warning,  bg: 'rgba(217,119,6,0.15)',  label: 'معلقة'   },
  EXPIRED:   { color: COLORS.textMuted, bg: 'rgba(100,116,139,0.15)', label: 'منتهية' },
  FAILED:    { color: COLORS.danger,   bg: 'rgba(220,38,38,0.15)',  label: 'فاشلة'   },
}

// ─── Main Screen ──────────────────────────────────────────────

export default function HostedCheckoutDetailScreen() {
  const router = useRouter()
  const tabBarHeight = useTabBarHeight()
  const params = useLocalSearchParams<{ checkoutId: string }>()
  const [checkout, setCheckout] = useState<CheckoutDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    setTimeout(() => {
      setCheckout({ ...DEMO_DETAIL, checkoutId: params.checkoutId ?? DEMO_DETAIL.checkoutId })
      setLoading(false)
    }, 400)
  }, [params.checkoutId])

  const url = checkout ? `https://pay.zyrix.co/checkout/${checkout.checkoutId}` : ''

  const handleCopy = async () => {
    await Clipboard.setStringAsync(url)
    Alert.alert('✓', 'تم نسخ الرابط')
  }

  const handleShare = async () => {
    if (!checkout) return
    try {
      await Share.share({ message: `${checkout.name}\n${url}`, url })
    } catch {}
  }

  const handleToggleActive = async () => {
    if (!checkout) return
    setToggling(true)
    try {
      await hostedCheckoutApi.update(checkout.id, { isActive: !checkout.isActive })
      setCheckout(p => p ? { ...p, isActive: !p.isActive } : p)
    } catch {
      setCheckout(p => p ? { ...p, isActive: !p.isActive } : p) // demo fallback
    } finally {
      setToggling(false)
    }
  }

  const handleDelete = () => {
    Alert.alert(
      'حذف صفحة الدفع',
      'هل أنت متأكد؟ لن يتمكن العملاء من الدفع عبر هذه الصفحة بعد حذفها.',
      [
        { text: 'تراجع', style: 'cancel' },
        {
          text: 'حذف', style: 'destructive',
          onPress: async () => {
            try {
              if (checkout) await hostedCheckoutApi.delete(checkout.id)
              Alert.alert('✓', 'تم الحذف', [{ text: 'حسناً', onPress: () => router.back() }])
            } catch {
              router.back()
            }
          },
        },
      ]
    )
  }

  if (loading || !checkout) {
    return (
      <SafeAreaView style={s.safe}>
        <InnerHeader title="تفاصيل Checkout" accentColor="#7C3AED" />
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  const completedSessions = checkout.sessions.filter(ses => ses.status === 'COMPLETED').length
  const convRate = checkout.usageCount > 0
    ? Math.round((completedSessions / checkout.usageCount) * 100)
    : 0

  return (
    <SafeAreaView style={s.safe}>
      <InnerHeader title="تفاصيل Checkout" accentColor="#7C3AED" />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Card ── */}
        <View style={[s.heroCard, { borderColor: checkout.brandColor + '50' }]}>
          <View style={[s.heroTop, isRTL && s.rev]}>
            <View style={[s.colorBadge, { backgroundColor: checkout.brandColor + '20', borderColor: checkout.brandColor + '50' }]}>
              <View style={[s.colorDot, { backgroundColor: checkout.brandColor }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.heroName}>{checkout.name}</Text>
              <Text style={s.heroId}>{checkout.checkoutId}</Text>
            </View>
            <View style={[s.statusBadge, {
              backgroundColor: checkout.isActive ? 'rgba(5,150,105,0.15)' : 'rgba(100,116,139,0.15)'
            }]}>
              <Text style={[s.statusText, { color: checkout.isActive ? COLORS.success : COLORS.textMuted }]}>
                {checkout.isActive ? '● نشط' : '○ متوقف'}
              </Text>
            </View>
          </View>

          {checkout.description && (
            <Text style={s.heroDesc}>{checkout.description}</Text>
          )}

          <View style={s.heroDivider} />

          <View style={[s.heroStats, isRTL && s.rev]}>
            <View style={s.heroStat}>
              <Text style={[s.heroStatValue, { color: COLORS.success }]}>
                {Number(checkout.totalRevenue).toLocaleString()}
              </Text>
              <Text style={s.heroStatLabel}>{checkout.currency}</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{checkout.usageCount}</Text>
              <Text style={s.heroStatLabel}>جلسة</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStat}>
              <Text style={[s.heroStatValue, { color: convRate >= 50 ? COLORS.success : COLORS.warning }]}>
                {convRate}%
              </Text>
              <Text style={s.heroStatLabel}>تحويل</Text>
            </View>
          </View>
        </View>

        {/* ── URL Card ── */}
        <View style={s.urlCard}>
          <View style={[s.urlRow, isRTL && s.rev]}>
            <Text style={s.urlText} numberOfLines={1}>{url}</Text>
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <View style={[s.actionGrid, isRTL && s.rev]}>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: COLORS.primary }]} onPress={handleShare} activeOpacity={0.8}>
            <Text style={s.actionBtnText}>↑ مشاركة</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: COLORS.primary }]} onPress={handleCopy} activeOpacity={0.8}>
            <Text style={s.actionBtnText}>⧉ نسخ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: 'rgba(139,92,246,0.2)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)' }]}
            onPress={() => router.push({ pathname: '/(merchant)/create-hosted-checkout', params: { editId: checkout.id } })}
            activeOpacity={0.8}
          >
            <Text style={[s.actionBtnText, { color: '#C4B5FD' }]}>✏️ تعديل</Text>
          </TouchableOpacity>
        </View>

        {/* ── KPI Stats ── */}
        <Text style={[s.sectionTitle, isRTL && { textAlign: 'right' }]}>الإحصائيات</Text>
        <View style={[s.kpiGrid, isRTL && s.rev]}>
          <KpiCard label="إجمالي الإيرادات" value={`${Number(checkout.totalRevenue).toLocaleString()} ر.س`} icon="💰" color={COLORS.kpiGreen} compact style={{ flex: 1 }} />
          <KpiCard label="الجلسات" value={checkout.usageCount} icon="🔗" color={COLORS.kpiBlue} compact style={{ flex: 1 }} />
        </View>
        <View style={[s.kpiGrid, isRTL && s.rev, { marginTop: 0 }]}>
          <KpiCard
            label="معدل التحويل"
            value={`${convRate}%`}
            icon="📈"
            color={convRate >= 50 ? COLORS.kpiGreen : COLORS.kpiOrange}
            valueColor={convRate >= 50 ? COLORS.success : COLORS.warning}
            compact
            style={{ flex: 1 }}
          />
          <KpiCard label="مكتملة" value={completedSessions} icon="✅" color={COLORS.kpiGreen} compact style={{ flex: 1 }} />
        </View>

        {/* ── Conversion Bar ── */}
        <View style={s.convCard}>
          <View style={[s.convHeader, isRTL && s.rev]}>
            <Text style={s.convTitle}>معدل التحويل</Text>
            <Text style={[s.convPct, { color: convRate >= 50 ? COLORS.success : COLORS.warning }]}>{convRate}%</Text>
          </View>
          <View style={s.convTrack}>
            <View style={[s.convFill, {
              width: `${Math.min(convRate, 100)}%`,
              backgroundColor: convRate >= 50 ? COLORS.success : COLORS.warning,
            }]} />
          </View>
          <Text style={[s.convHint, isRTL && { textAlign: 'right' }]}>
            {completedSessions} جلسة مكتملة من أصل {checkout.usageCount} جلسة
          </Text>
        </View>

        {/* ── Settings Card ── */}
        <Text style={[s.sectionTitle, isRTL && { textAlign: 'right' }]}>الإعدادات</Text>
        <View style={s.settingsCard}>
          {/* Active toggle */}
          <View style={[s.settingRow, isRTL && s.rev]}>
            <View style={{ flex: 1 }}>
              <Text style={s.settingLabel}>تفعيل صفحة الدفع</Text>
              <Text style={s.settingHint}>العملاء يمكنهم الدفع عبر هذه الصفحة</Text>
            </View>
            {toggling
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <Switch
                  value={checkout.isActive}
                  onValueChange={handleToggleActive}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
            }
          </View>
          <View style={s.settingDivider} />
          <View style={[s.settingRow, isRTL && s.rev]}>
            <View style={{ flex: 1 }}>
              <Text style={s.settingLabel}>رقم الهاتف إلزامي</Text>
            </View>
            <Text style={[s.settingValue, { color: checkout.requirePhone ? COLORS.success : COLORS.textMuted }]}>
              {checkout.requirePhone ? '✅ نعم' : '— لا'}
            </Text>
          </View>
          <View style={s.settingDivider} />
          <View style={[s.settingRow, isRTL && s.rev]}>
            <View style={{ flex: 1 }}>
              <Text style={s.settingLabel}>العنوان إلزامي</Text>
            </View>
            <Text style={[s.settingValue, { color: checkout.requireAddress ? COLORS.success : COLORS.textMuted }]}>
              {checkout.requireAddress ? '✅ نعم' : '— لا'}
            </Text>
          </View>
          <View style={s.settingDivider} />
          <View style={[s.settingRow, isRTL && s.rev]}>
            <View style={{ flex: 1 }}>
              <Text style={s.settingLabel}>ملاحظة من العميل</Text>
            </View>
            <Text style={[s.settingValue, { color: checkout.allowNote ? COLORS.success : COLORS.textMuted }]}>
              {checkout.allowNote ? '✅ مفعّل' : '— معطّل'}
            </Text>
          </View>
          {checkout.successUrl && (
            <>
              <View style={s.settingDivider} />
              <View style={[s.settingRow, isRTL && s.rev]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.settingLabel}>رابط النجاح</Text>
                  <Text style={s.settingHint} numberOfLines={1}>{checkout.successUrl}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── Recent Sessions ── */}
        <Text style={[s.sectionTitle, isRTL && { textAlign: 'right' }]}>آخر الجلسات</Text>
        <View style={s.sessionsCard}>
          {checkout.sessions.map((ses, i) => {
            const sc = SESSION_STATUS[ses.status] || SESSION_STATUS.PENDING
            return (
              <View
                key={ses.sessionId}
                style={[
                  s.sessionRow,
                  isRTL && s.rev,
                  i < checkout.sessions.length - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.border },
                ]}
              >
                <View style={[s.sessionDot, { backgroundColor: sc.bg }]}>
                  <Text style={{ fontSize: 12 }}>
                    {ses.status === 'COMPLETED' ? '✅' : ses.status === 'PENDING' ? '⏳' : '❌'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sessionId}>{ses.sessionId}</Text>
                  <Text style={s.sessionDate}>
                    {new Date(ses.createdAt).toLocaleDateString('ar-SA')}
                  </Text>
                </View>
                <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                  <Text style={s.sessionAmount}>
                    {Number(ses.amount).toLocaleString()} {ses.currency}
                  </Text>
                  <View style={[s.sessionBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.sessionBadgeText, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                </View>
              </View>
            )
          })}
        </View>

        {/* ── Danger Zone ── */}
        <TouchableOpacity style={s.deleteCard} onPress={handleDelete} activeOpacity={0.8}>
          <Text style={s.deleteText}>حذف صفحة الدفع</Text>
          <Text style={s.deleteHint}>لن يتمكن العملاء من الدفع عبر هذه الصفحة بعد حذفها</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.deepBg },
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  rev:    { flexDirection: 'row-reverse' },

  // Hero
  heroCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  heroTop:   { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginBottom: SPACING.sm },
  colorBadge: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  colorDot:  { width: 16, height: 16, borderRadius: 8 },
  heroName:  { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: 4 },
  heroId:    { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  statusText:  { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  heroDesc:  { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.md },
  heroDivider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.md },
  heroStats: { flexDirection: 'row', justifyContent: 'space-around' },
  heroStat:  { alignItems: 'center', flex: 1 },
  heroStatValue: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.textPrimary },
  heroStatLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  heroStatDivider: { width: 1, height: 36, backgroundColor: COLORS.border },

  // URL
  urlCard: {
    backgroundColor: COLORS.surfaceBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
  },
  urlRow:  { flexDirection: 'row', alignItems: 'center' },
  urlText: { flex: 1, fontSize: FONT_SIZE.sm, color: '#A78BFA', fontFamily: 'monospace' },

  // Actions
  actionGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  actionBtn: {
    flex: 1, alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  actionBtnText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: COLORS.white },

  // KPIs
  kpiGrid: {
    flexDirection: 'row',
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
  convPct:     { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  convTrack: {
    height: 8, backgroundColor: COLORS.surfaceBg,
    borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: SPACING.sm,
  },
  convFill:  { height: '100%', borderRadius: RADIUS.full },
  convHint:  { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },

  // Settings
  settingsCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  settingRow:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  settingLabel:   { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium, color: COLORS.textPrimary },
  settingHint:    { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  settingValue:   { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  settingDivider: { height: 1, backgroundColor: COLORS.border },

  // Sessions
  sessionsCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  sessionDot: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  sessionId:     { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontFamily: 'monospace' },
  sessionDate:   { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  sessionAmount: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: 3 },
  sessionBadge:  { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  sessionBadgeText: { fontSize: 10, fontWeight: FONT_WEIGHT.semibold },

  // Delete
  deleteCard: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.dangerBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.3)',
    padding: SPACING.lg,
    alignItems: 'center',
    gap: 6,
  },
  deleteText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.danger },
  deleteHint: { fontSize: FONT_SIZE.xs, color: COLORS.dangerLight, textAlign: 'center' },
})