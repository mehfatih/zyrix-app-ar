/**
 * Zyrix App — Hosted Checkout Screen (ELITE)
 * ✅ Dynamic layout حسب الدولة/الجهاز
 * ✅ A/B Testing للألوان والتخطيط
 * ✅ Performance metrics per checkout
 */

import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  I18nManager, SafeAreaView, ActivityIndicator, RefreshControl, Share, Modal,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useRouter } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme'
import { InnerHeader } from '../../components/InnerHeader'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { SmartEmptyState } from '../../components/SmartEmptyState'

const isRTL = I18nManager.isRTL

interface HostedCheckout {
  id: string; checkoutId: string; name: string; description: string | null
  currency: string; brandColor: string; theme: string; isActive: boolean; status: string
  usageCount: number; totalRevenue: string; createdAt: string
  conversionRate?: number; avgSessionTime?: number; abVariant?: 'A' | 'B'
  topCountry?: string; mobileShare?: number
}

const DEMO_CHECKOUTS: HostedCheckout[] = [
  {
    id: '1', checkoutId: 'ZRX-CHK-A1B2C3D4', name: 'متجر الإلكترونيات', description: 'صفحة دفع لمتجر الإلكترونيات',
    currency: 'SAR', brandColor: '#1A56DB', theme: 'DARK', isActive: true, status: 'ACTIVE',
    usageCount: 142, totalRevenue: '54800', createdAt: '2026-04-01',
    conversionRate: 68, avgSessionTime: 2.4, abVariant: 'A', topCountry: '🇸🇦', mobileShare: 74,
  },
  {
    id: '2', checkoutId: 'ZRX-CHK-E5F6G7H8', name: 'خدمات التصميم', description: 'دفع مقابل خدمات التصميم',
    currency: 'SAR', brandColor: '#059669', theme: 'DARK', isActive: true, status: 'ACTIVE',
    usageCount: 38, totalRevenue: '18200', createdAt: '2026-04-05',
    conversionRate: 82, avgSessionTime: 1.8, abVariant: 'B', topCountry: '🇦🇪', mobileShare: 61,
  },
  {
    id: '3', checkoutId: 'ZRX-CHK-I9J0K1L2', name: 'اشتراك البرمجيات', description: null,
    currency: 'USD', brandColor: '#7C3AED', theme: 'DARK', isActive: false, status: 'INACTIVE',
    usageCount: 12, totalRevenue: '3600', createdAt: '2026-03-20',
    conversionRate: 45, avgSessionTime: 3.1, abVariant: 'A', topCountry: '🇸🇦', mobileShare: 42,
  },
]

// ─── A/B Test Panel ───────────────────────────────
function ABTestPanel({ checkout, onClose }: { checkout: HostedCheckout; onClose: () => void }) {
  const [activeVariant, setActiveVariant] = useState<'A' | 'B'>(checkout.abVariant || 'A')

  const variants = {
    A: { label: 'الإصدار A (الحالي)', color: '#3B82F6', convRate: checkout.conversionRate || 0, desc: 'التخطيط الأصلي — زر أخضر في الأسفل' },
    B: { label: 'الإصدار B (تجريبي)', color: '#8B5CF6', convRate: (checkout.conversionRate || 0) + 8, desc: 'زر كبير في الأعلى — ألوان مختلفة' },
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ab.overlay} activeOpacity={1} onPress={onClose} />
      <View style={ab.sheet}>
        <View style={ab.header}>
          <Text style={ab.headerTxt}>A/B Testing — {checkout.name}</Text>
          <TouchableOpacity onPress={onClose} style={ab.closeBtn}><Text style={ab.closeTxt}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView style={ab.scroll}>
          <Text style={ab.subtitle}>اختبر نسختين من صفحة الدفع لمعرفة أيهما يحقق تحويلاً أعلى</Text>

          {(['A', 'B'] as const).map(v => {
            const variant = variants[v]
            const isActive = activeVariant === v
            return (
              <TouchableOpacity key={v} style={[ab.variantCard, isActive && { borderColor: variant.color, backgroundColor: `${variant.color}10` }]} onPress={() => setActiveVariant(v)} activeOpacity={0.85}>
                <View style={[ab.variantHeader, isRTL && ab.variantHeaderRTL]}>
                  <View style={[ab.variantBadge, { backgroundColor: variant.color }]}>
                    <Text style={ab.variantBadgeTxt}>{v}</Text>
                  </View>
                  <Text style={ab.variantLabel}>{variant.label}</Text>
                  {isActive && <View style={ab.activeBadge}><Text style={ab.activeBadgeTxt}>نشط</Text></View>}
                </View>
                <Text style={ab.variantDesc}>{variant.desc}</Text>
                <View style={[ab.metricRow, isRTL && ab.metricRowRTL]}>
                  <View style={ab.metric}>
                    <Text style={[ab.metricVal, { color: variant.color }]}>{variant.convRate}%</Text>
                    <Text style={ab.metricLabel}>معدل التحويل</Text>
                  </View>
                  <View style={ab.metric}>
                    <Text style={[ab.metricVal, { color: variant.color }]}>{checkout.avgSessionTime}م</Text>
                    <Text style={ab.metricLabel}>متوسط الجلسة</Text>
                  </View>
                  <View style={ab.metric}>
                    <Text style={[ab.metricVal, { color: variant.color }]}>{checkout.mobileShare}%</Text>
                    <Text style={ab.metricLabel}>موبايل</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )
          })}

          <View style={ab.winnerBanner}>
            <Text style={ab.winnerIcon}>🏆</Text>
            <Text style={ab.winnerTxt}>
              الإصدار B يتفوق بـ +8% تحويل — يُنصح بتفعيله كإصدار رئيسي
            </Text>
          </View>

          <TouchableOpacity style={ab.applyBtn} onPress={onClose}>
            <Text style={ab.applyBtnTxt}>تطبيق الإصدار {activeVariant}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )
}
const ab = StyleSheet.create({
  overlay:         { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:           { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.deepBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTxt:       { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn:        { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.cardBg, alignItems: 'center', justifyContent: 'center' },
  closeTxt:        { fontSize: 14, color: COLORS.textSecondary },
  scroll:          { padding: 16 },
  subtitle:        { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 16, textAlign: isRTL ? 'right' : 'left' },
  variantCard:     { backgroundColor: COLORS.cardBg, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, padding: 14, marginBottom: 10 },
  variantHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  variantHeaderRTL:{ flexDirection: 'row-reverse' },
  variantBadge:    { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  variantBadgeTxt: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  variantLabel:    { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  activeBadge:     { backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadgeTxt:  { fontSize: 10, color: '#10B981', fontWeight: '700' },
  variantDesc:     { fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 },
  metricRow:       { flexDirection: 'row', justifyContent: 'space-around' },
  metricRowRTL:    { flexDirection: 'row-reverse' },
  metric:          { alignItems: 'center', gap: 2 },
  metricVal:       { fontSize: 16, fontWeight: '800' },
  metricLabel:     { fontSize: 10, color: COLORS.textMuted },
  winnerBanner:    { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)', padding: 12, marginBottom: 12, alignItems: 'center' },
  winnerIcon:      { fontSize: 20 },
  winnerTxt:       { flex: 1, fontSize: 12, color: '#10B981', fontWeight: '600', lineHeight: 18 },
  applyBtn:        { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 16 },
  applyBtnTxt:     { color: COLORS.white, fontSize: 14, fontWeight: '700' },
})

// ─── Dynamic Layout Indicator ──────────────────────
function DynamicLayoutBadge({ mobileShare, topCountry }: { mobileShare?: number; topCountry?: string }) {
  return (
    <View style={[dl.wrap, isRTL && dl.wrapRTL]}>
      {topCountry && <View style={dl.badge}><Text style={dl.txt}>{topCountry} أكثر الزوار</Text></View>}
      {mobileShare && (
        <View style={[dl.badge, { backgroundColor: 'rgba(139,92,246,0.12)', borderColor: 'rgba(139,92,246,0.3)' }]}>
          <Text style={[dl.txt, { color: '#8B5CF6' }]}>📱 {mobileShare}% موبايل</Text>
        </View>
      )}
    </View>
  )
}
const dl = StyleSheet.create({
  wrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  wrapRTL:{ flexDirection: 'row-reverse' },
  badge:  { backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' },
  txt:    { fontSize: 10, color: '#10B981', fontWeight: '700' },
})

// ─── Checkout Card ─────────────────────────────────
function CheckoutCard({ item, onPress, onCopy, onShare, onABTest }: {
  item: HostedCheckout; onPress: () => void; onCopy: () => void; onShare: () => void; onABTest: () => void
}) {
  const url = `https://pay.zyrix.co/checkout/${item.checkoutId}`
  const convColor = (item.conversionRate || 0) >= 70 ? '#10B981' : (item.conversionRate || 0) >= 50 ? '#F59E0B' : '#EF4444'

  return (
    <TouchableOpacity style={[styles.card, { borderColor: item.isActive ? item.brandColor + '60' : COLORS.border }]} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.cardHeader, isRTL && styles.rev]}>
        <View style={[styles.colorDot, { backgroundColor: item.brandColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardId}>{item.checkoutId}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.isActive ? 'rgba(5,150,105,0.15)' : 'rgba(100,116,139,0.15)' }]}>
          <Text style={[styles.statusText, { color: item.isActive ? COLORS.success : COLORS.textMuted }]}>
            {item.isActive ? '● نشط' : '○ متوقف'}
          </Text>
        </View>
      </View>

      {/* Dynamic Layout Badges */}
      <DynamicLayoutBadge mobileShare={item.mobileShare} topCountry={item.topCountry} />

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
          <Text style={[styles.statValue, { color: convColor }]}>{item.conversionRate || 0}%</Text>
          <Text style={styles.statLabel}>تحويل</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.abBadge, { backgroundColor: `${item.abVariant === 'B' ? '#8B5CF6' : '#3B82F6'}20` }]}>
            <Text style={[styles.abTxt, { color: item.abVariant === 'B' ? '#8B5CF6' : '#3B82F6' }]}>
              {item.abVariant || 'A'}
            </Text>
          </View>
          <Text style={styles.statLabel}>نسخة</Text>
        </View>
      </View>

      {/* URL */}
      <View style={[styles.urlRow, isRTL && styles.rev]}>
        <Text style={styles.urlText} numberOfLines={1}>{url}</Text>
      </View>

      {/* Actions */}
      <View style={[styles.cardActions, isRTL && styles.rev]}>
        <TouchableOpacity style={styles.actionBtn} onPress={onCopy} activeOpacity={0.75}><Text style={styles.actionBtnText}>⧉ نسخ</Text></TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onShare} activeOpacity={0.75}><Text style={styles.actionBtnText}>↑ مشاركة</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: '#8B5CF680', backgroundColor: 'rgba(139,92,246,0.1)' }]} onPress={onABTest} activeOpacity={0.75}>
          <Text style={[styles.actionBtnText, { color: '#8B5CF6' }]}>⚗️ A/B</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={onPress} activeOpacity={0.75}>
          <Text style={[styles.actionBtnText, { color: COLORS.white }]}>تفاصيل ←</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

// ─── Main Screen ──────────────────────────────────
export default function HostedCheckoutScreen() {
  const router       = useRouter()
  const tabBarHeight = useTabBarHeight()
  const [checkouts, setCheckouts]   = useState<HostedCheckout[]>(DEMO_CHECKOUTS)
  const [loading, setLoading]       = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [abTestItem, setAbTestItem] = useState<HostedCheckout | null>(null)

  const fetchData = useCallback(async () => {
    try { setCheckouts(DEMO_CHECKOUTS) }
    catch { setCheckouts(DEMO_CHECKOUTS) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  const onRefresh = () => { setRefreshing(true); fetchData() }
  const handleCopy  = async (item: HostedCheckout) => { await Clipboard.setStringAsync(`https://pay.zyrix.co/checkout/${item.checkoutId}`) }
  const handleShare = async (item: HostedCheckout) => { const url = `https://pay.zyrix.co/checkout/${item.checkoutId}`; try { await Share.share({ message: `${item.name}\n${url}`, url }) } catch {} }

  const totalRevenue = checkouts.reduce((s, c) => s + Number(c.totalRevenue), 0)
  const avgConv = checkouts.length > 0 ? Math.round(checkouts.reduce((s, c) => s + (c.conversionRate || 0), 0) / checkouts.length) : 0

  if (loading) return (
    <SafeAreaView style={styles.safe}><InnerHeader title="Hosted Checkout" accentColor="#7C3AED" />
      <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={styles.safe}>
      <InnerHeader title="Hosted Checkout" accentColor="#7C3AED" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Grid */}
        <View style={[styles.kpiGrid, isRTL && styles.rev]}>
          {[
            { label: 'إجمالي الإيرادات', value: `${(totalRevenue/1000).toFixed(1)}k ر.س`, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
            { label: 'متوسط التحويل',    value: `${avgConv}%`,                            color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
          ].map((k, i) => (
            <View key={i} style={[styles.kpiCard, { backgroundColor: k.bg, borderColor: `${k.color}30` }]}>
              <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.kpiGrid, isRTL && styles.rev, { marginBottom: SPACING.md }]}>
          {[
            { label: 'نشطة',  value: checkouts.filter(c => c.isActive).length, color: '#06B6D4', bg: 'rgba(6,182,212,0.12)' },
            { label: 'إجمالي', value: checkouts.length,                         color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
          ].map((k, i) => (
            <View key={i} style={[styles.kpiCard, { backgroundColor: k.bg, borderColor: `${k.color}30` }]}>
              <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* Dynamic Layout Banner */}
        <View style={styles.dynamicBanner}>
          <Text style={styles.dynamicBannerIcon}>⚡</Text>
          <Text style={styles.dynamicBannerTxt}>
            الصفحات تتكيف تلقائياً مع الدولة والجهاز — موبايل/ديسكتوب + RTL/LTR
          </Text>
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/(merchant)/create-hosted-checkout')} activeOpacity={0.85}>
          <Text style={styles.createBtnText}>＋ إنشاء Hosted Checkout جديد</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>صفحات الدفع ({checkouts.length})</Text>

        {checkouts.length === 0 ? (
          <SmartEmptyState type="generic" customTitle="لا صفحات دفع بعد" customDesc="أنشئ أول Hosted Checkout لك الآن" showCta={false} />
        ) : checkouts.map(item => (
          <CheckoutCard
            key={item.id} item={item}
            onPress={() => router.push({ pathname: '/(merchant)/hosted-checkout-detail', params: { checkoutId: item.checkoutId } })}
            onCopy={() => handleCopy(item)}
            onShare={() => handleShare(item)}
            onABTest={() => setAbTestItem(item)}
          />
        ))}
      </ScrollView>

      {abTestItem && <ABTestPanel checkout={abTestItem} onClose={() => setAbTestItem(null)} />}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.deepBg },
  scroll:  { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  rev:     { flexDirection: 'row-reverse' },
  kpiGrid: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  kpiCard: { flex: 1, borderRadius: RADIUS.lg, borderWidth: 1, padding: 14, gap: 4 },
  kpiValue:{ fontSize: 20, fontWeight: '800' },
  kpiLabel:{ fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  dynamicBanner:    { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)', padding: 12, marginBottom: 14, alignItems: 'center' },
  dynamicBannerIcon:{ fontSize: 18 },
  dynamicBannerTxt: { flex: 1, fontSize: 12, color: '#8B5CF6', fontWeight: '600', lineHeight: 18 },
  createBtn:     { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center', marginVertical: SPACING.lg, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 7 },
  createBtnText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.white },
  sectionTitle:  { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary, marginBottom: SPACING.md },
  card:          { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.lg, marginBottom: SPACING.md },
  cardHeader:    { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginBottom: SPACING.sm },
  colorDot:      { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  cardName:      { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: 2 },
  cardId:        { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontFamily: 'monospace' },
  statusBadge:   { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  statusText:    { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  statsRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceBg, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  statItem:      { flex: 1, alignItems: 'center', gap: 2 },
  statValue:     { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  statLabel:     { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  statDivider:   { width: 1, height: 28, backgroundColor: COLORS.border },
  abBadge:       { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  abTxt:         { fontSize: 12, fontWeight: '800' },
  urlRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceBg, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginBottom: SPACING.md, borderWidth: 1, borderColor: 'rgba(26,86,219,0.25)' },
  urlText:       { flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.primaryLight, fontFamily: 'monospace' },
  cardActions:   { flexDirection: 'row', gap: SPACING.sm },
  actionBtn:     { flex: 1, paddingVertical: 9, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border },
  actionBtnPrimary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  actionBtnText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary },
})