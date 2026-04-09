/**
 * Zyrix App — Hosted Checkout Screen
 * 📁 app/(merchant)/hosted-checkout.tsx
 */

import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  I18nManager, SafeAreaView, ActivityIndicator, RefreshControl, Share,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useRouter } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme'
import { InnerHeader } from '../../components/InnerHeader'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { KpiCard } from '../../components/KpiCard'

const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────────────────

interface HostedCheckout {
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
  createdAt: string
}

// ─── Demo Data ────────────────────────────────────────────────

const DEMO_CHECKOUTS: HostedCheckout[] = [
  {
    id: '1', checkoutId: 'ZRX-CHK-A1B2C3D4',
    name: 'متجر الإلكترونيات', description: 'صفحة دفع لمتجر الإلكترونيات',
    currency: 'SAR', brandColor: '#1A56DB', theme: 'DARK',
    isActive: true, status: 'ACTIVE', usageCount: 142, totalRevenue: '54800',
    createdAt: '2026-04-01',
  },
  {
    id: '2', checkoutId: 'ZRX-CHK-E5F6G7H8',
    name: 'خدمات التصميم', description: 'دفع مقابل خدمات التصميم الجرافيكي',
    currency: 'SAR', brandColor: '#059669', theme: 'DARK',
    isActive: true, status: 'ACTIVE', usageCount: 38, totalRevenue: '18200',
    createdAt: '2026-04-05',
  },
  {
    id: '3', checkoutId: 'ZRX-CHK-I9J0K1L2',
    name: 'اشتراك البرمجيات', description: null,
    currency: 'USD', brandColor: '#7C3AED', theme: 'DARK',
    isActive: false, status: 'INACTIVE', usageCount: 12, totalRevenue: '3600',
    createdAt: '2026-03-20',
  },
]

const DEMO_KPIS = {
  total: 3,
  active: 2,
  totalRevenue: '76,600',
  totalSessions: 192,
}

// ─── Checkout Card ────────────────────────────────────────────

function CheckoutCard({ item, onPress, onCopy, onShare }: {
  item: HostedCheckout
  onPress: () => void
  onCopy: () => void
  onShare: () => void
}) {
  const url = `https://pay.zyrix.co/checkout/${item.checkoutId}`

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: item.isActive ? item.brandColor + '60' : COLORS.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Header */}
      <View style={[styles.cardHeader, isRTL && styles.rev]}>
        <View style={[styles.colorDot, { backgroundColor: item.brandColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardId}>{item.checkoutId}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.isActive ? 'rgba(5,150,105,0.15)' : 'rgba(100,116,139,0.15)' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: item.isActive ? COLORS.success : COLORS.textMuted }
          ]}>
            {item.isActive ? '● نشط' : '○ متوقف'}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, isRTL && styles.rev]}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{Number(item.totalRevenue).toLocaleString()}</Text>
          <Text style={styles.statLabel}>{item.currency}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.usageCount}</Text>
          <Text style={styles.statLabel}>جلسة</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.theme === 'DARK' ? '🌙' : '☀️'}</Text>
          <Text style={styles.statLabel}>{item.theme === 'DARK' ? 'داكن' : 'فاتح'}</Text>
        </View>
      </View>

      {/* URL */}
      <View style={[styles.urlRow, isRTL && styles.rev]}>
        <Text style={styles.urlText} numberOfLines={1}>{url}</Text>
      </View>

      {/* Actions */}
      <View style={[styles.cardActions, isRTL && styles.rev]}>
        <TouchableOpacity style={styles.actionBtn} onPress={onCopy} activeOpacity={0.75}>
          <Text style={styles.actionBtnText}>⧉ نسخ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onShare} activeOpacity={0.75}>
          <Text style={styles.actionBtnText}>↑ مشاركة</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={onPress}
          activeOpacity={0.75}
        >
          <Text style={[styles.actionBtnText, { color: COLORS.white }]}>تفاصيل ←</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

// ─── Main Screen ──────────────────────────────────────────────

export default function HostedCheckoutScreen() {
  const router = useRouter()
  const tabBarHeight = useTabBarHeight()
  const [checkouts, setCheckouts] = useState<HostedCheckout[]>(DEMO_CHECKOUTS)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      // TODO: replace with hostedCheckoutApi.list()
      setCheckouts(DEMO_CHECKOUTS)
    } catch {
      setCheckouts(DEMO_CHECKOUTS)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const onRefresh = () => { setRefreshing(true); fetchData() }

  const handleCopy = async (item: HostedCheckout) => {
    const url = `https://pay.zyrix.co/checkout/${item.checkoutId}`
    await Clipboard.setStringAsync(url)
  }

  const handleShare = async (item: HostedCheckout) => {
    const url = `https://pay.zyrix.co/checkout/${item.checkoutId}`
    try {
      await Share.share({ message: `${item.name}\n${url}`, url })
    } catch {}
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <InnerHeader title="Hosted Checkout" accentColor="#7C3AED" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <InnerHeader title="Hosted Checkout" accentColor="#7C3AED" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Cards */}
        <View style={[styles.kpiGrid, isRTL && styles.rev]}>
          <KpiCard label="إجمالي الإيرادات" value={`${DEMO_KPIS.totalRevenue} ر.س`} icon="💰" color={COLORS.kpiGreen} compact style={{ flex: 1 }} />
          <KpiCard label="الجلسات" value={DEMO_KPIS.totalSessions} icon="🔗" color={COLORS.kpiBlue} compact style={{ flex: 1 }} />
        </View>
        <View style={[styles.kpiGrid, isRTL && styles.rev, { marginTop: 0 }]}>
          <KpiCard label="Checkouts نشطة" value={DEMO_KPIS.active} icon="✅" color={COLORS.kpiGreen} compact style={{ flex: 1 }} />
          <KpiCard label="إجمالي" value={DEMO_KPIS.total} icon="📊" color={COLORS.kpiPurple} compact style={{ flex: 1 }} />
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/(merchant)/create-hosted-checkout')}
          activeOpacity={0.85}
        >
          <Text style={styles.createBtnText}>＋ إنشاء Hosted Checkout جديد</Text>
        </TouchableOpacity>

        {/* List */}
        <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>
          صفحات الدفع ({checkouts.length})
        </Text>

        {checkouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏗️</Text>
            <Text style={styles.emptyTitle}>لا توجد صفحات دفع بعد</Text>
            <Text style={styles.emptySubtitle}>أنشئ أول Hosted Checkout لك الآن</Text>
          </View>
        ) : (
          checkouts.map(item => (
            <CheckoutCard
              key={item.id}
              item={item}
              onPress={() => router.push({ pathname: '/(merchant)/hosted-checkout-detail', params: { checkoutId: item.checkoutId } })}
              onCopy={() => handleCopy(item)}
              onShare={() => handleShare(item)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.deepBg },
  scroll:  { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  rev:     { flexDirection: 'row-reverse' },

  kpiGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  createBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: SPACING.lg,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 7,
  },
  createBtnText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },

  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },

  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  cardName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  cardId: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },

  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceBg,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(26,86,219,0.25)',
  },
  urlText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: COLORS.primaryLight,
    fontFamily: 'monospace',
  },

  cardActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionBtnText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: SPACING.sm,
  },
  emptyIcon:     { fontSize: 48 },
  emptyTitle:    { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  emptySubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center' },
})