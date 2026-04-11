/**
 * Zyrix App — Payment Links Screen (ELITE)
 * ✅ Mini-landing preview per link
 * ✅ UTM tracking display
 * ✅ Countdown timer for expiring links
 * ✅ Trust badges
 * ✅ Conversion analytics per link
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  I18nManager, SafeAreaView, ActivityIndicator, RefreshControl,
  Alert, Share, Animated, Dimensions, Modal,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useRouter } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme'
import { paymentLinksApi } from '../../services/api'
import { StatusBadge } from '../../components/StatusBadge'
import { QRCodeModal } from '../../components/QRCodeModal'
import { InnerHeader } from '../../components/InnerHeader'
import { SmartEmptyState } from '../../components/SmartEmptyState'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'

const isRTL    = I18nManager.isRTL
const { width: SW } = Dimensions.get('window')

const CURRENCY_AR: Record<string, string> = { SAR: 'ر.س', AED: 'د.إ', KWD: 'د.ك', QAR: 'ر.ق', USD: '$', TRY: '₺' }

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; glow: string; icon: string }> = {
  all:     { bg: '#1E3A5F',              border: '#3B82F6', text: '#60A5FA', glow: 'rgba(59,130,246,0.35)',  icon: '🔗' },
  active:  { bg: 'rgba(5,150,105,0.18)', border: '#059669', text: '#34D399', glow: 'rgba(5,150,105,0.4)',   icon: '🟢' },
  paid:    { bg: 'rgba(37,99,235,0.18)', border: '#2563EB', text: '#60A5FA', glow: 'rgba(37,99,235,0.4)',   icon: '💰' },
  expired: { bg: 'rgba(217,119,6,0.18)', border: '#D97706', text: '#FBBF24', glow: 'rgba(217,119,6,0.4)',   icon: '⏱' },
}

const KPI_PALETTE = [
  { icon: '🔗', label: 'روابط نشطة',   color: '#3B82F6', glow: 'rgba(59,130,246,0.4)',  bgStart: '#1E3A8A', bgEnd: '#1E40AF' },
  { icon: '✅', label: 'تم الدفع',      color: '#10B981', glow: 'rgba(16,185,129,0.4)',  bgStart: '#064E3B', bgEnd: '#065F46' },
  { icon: '💰', label: 'محصّل',         color: '#34D399', glow: 'rgba(52,211,153,0.4)',  bgStart: '#065F46', bgEnd: '#047857' },
  { icon: '📊', label: 'معدل التحويل',  color: '#FBBF24', glow: 'rgba(251,191,36,0.4)',  bgStart: '#78350F', bgEnd: '#92400E' },
]

const FILTER_TABS = [
  { key: 'all',     label: 'الكل' },
  { key: 'active',  label: 'نشط' },
  { key: 'paid',    label: 'مدفوع' },
  { key: 'expired', label: 'منتهي' },
]

const TRUST_BADGES = ['🔒 SSL', '⚡ فوري', '✅ آمن', '🌍 دولي']

interface PaymentLink {
  id: string; linkId: string; amount: string; currency: string
  title: string; description: string | null; status: string
  expiresAt: string | null; createdAt: string; paymentUrl?: string
  views?: number; conversions?: number
  utmSource?: string; utmMedium?: string; utmCampaign?: string
  features?: string; faqs?: string
  usageCount?: number; paidCount?: number
}

const DEMO_LINKS: PaymentLink[] = [
  {
    id: '1', linkId: 'ZRX-PAY-A1B2C3D4', amount: '500', currency: 'SAR',
    title: 'خدمات الاستشارة التقنية', description: 'جلسة استشارة 60 دقيقة',
    status: 'active', expiresAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    paymentUrl: 'https://pay.zyrix.co/ZRX-PAY-A1B2C3D4',
    views: 48, conversions: 12, usageCount: 48, paidCount: 12,
    utmSource: 'whatsapp', utmMedium: 'social', utmCampaign: 'april_promo',
    features: 'استشارة مخصصة|تسجيل الجلسة|خطة عمل مكتوبة',
    faqs: 'هل يمكن إلغاء الحجز؟|كيف تتم الجلسة؟',
  },
  {
    id: '2', linkId: 'ZRX-PAY-E5F6G7H8', amount: '1200', currency: 'SAR',
    title: 'تصميم هوية بصرية كاملة', description: 'لوجو + ألوان + خطوط + دليل استخدام',
    status: 'active', expiresAt: null,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    paymentUrl: 'https://pay.zyrix.co/ZRX-PAY-E5F6G7H8',
    views: 124, conversions: 31, usageCount: 124, paidCount: 31,
    utmSource: 'instagram', utmMedium: 'organic', utmCampaign: 'design_services',
    features: 'لوجو 3 اقتراحات|دليل العلامة التجارية|ملفات مفتوحة',
    faqs: 'كم يستغرق التصميم؟|ماذا لو لم يعجبني؟',
  },
  {
    id: '3', linkId: 'ZRX-PAY-I9J0K1L2', amount: '250', currency: 'SAR',
    title: 'دورة تسويق رقمي', description: '8 محاضرات مسجلة + شهادة',
    status: 'paid', expiresAt: null,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    paymentUrl: 'https://pay.zyrix.co/ZRX-PAY-I9J0K1L2',
    views: 89, conversions: 45, usageCount: 89, paidCount: 45,
    utmSource: 'email', utmMedium: 'newsletter', utmCampaign: 'course_launch',
  },
  {
    id: '4', linkId: 'ZRX-PAY-M3N4O5P6', amount: '800', currency: 'SAR',
    title: 'تطوير تطبيق موبايل', description: 'نموذج أولي MVP',
    status: 'expired', expiresAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    paymentUrl: 'https://pay.zyrix.co/ZRX-PAY-M3N4O5P6',
    views: 22, conversions: 3, usageCount: 22, paidCount: 3,
  },
]

// ─── Countdown Timer ──────────────────────────────
function CountdownTimer({ expiresAt, color }: { expiresAt: string; color: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    const calc = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) { setRemaining('منتهي'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      if (d > 0) setRemaining(`${d}ي ${h}س`)
      else if (h > 0) setRemaining(`${h}س ${m}د`)
      else setRemaining(`${m} دقيقة`)
    }
    calc()
    const iv = setInterval(calc, 60000)
    return () => clearInterval(iv)
  }, [expiresAt])

  return (
    <View style={[cd.wrap, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
      <Text style={cd.icon}>⏱</Text>
      <Text style={[cd.txt, { color }]}>ينتهي: {remaining}</Text>
    </View>
  )
}
const cd = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  icon: { fontSize: 11 },
  txt:  { fontSize: 11, fontWeight: '700' },
})

// ─── UTM Badge ────────────────────────────────────
function UTMBadge({ source, medium, campaign }: { source?: string; medium?: string; campaign?: string }) {
  if (!source && !medium && !campaign) return null
  const UTM_ICONS: Record<string, string> = { whatsapp: '💬', instagram: '📸', email: '📧', facebook: '👤', twitter: '🐦', google: '🔍', organic: '🌱' }
  return (
    <View style={[utmS.wrap, isRTL && utmS.wrapRTL]}>
      <Text style={utmS.label}>📊 UTM:</Text>
      {source && (
        <View style={utmS.badge}>
          <Text style={utmS.badgeTxt}>{UTM_ICONS[source] || '🔗'} {source}</Text>
        </View>
      )}
      {medium && (
        <View style={[utmS.badge, { backgroundColor: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.4)' }]}>
          <Text style={[utmS.badgeTxt, { color: '#8B5CF6' }]}>{medium}</Text>
        </View>
      )}
      {campaign && (
        <View style={[utmS.badge, { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.4)' }]}>
          <Text style={[utmS.badgeTxt, { color: '#F59E0B' }]}>{campaign}</Text>
        </View>
      )}
    </View>
  )
}
const utmS = StyleSheet.create({
  wrap:     { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginBottom: 6 },
  wrapRTL:  { flexDirection: 'row-reverse' },
  label:    { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  badge:    { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.4)' },
  badgeTxt: { fontSize: 10, color: '#60A5FA', fontWeight: '700' },
})

// ─── Mini Landing Preview Modal ───────────────────
function MiniLandingModal({ link, visible, onClose }: { link: PaymentLink; visible: boolean; onClose: () => void }) {
  const col = STATUS_COLORS[link.status] ?? STATUS_COLORS.all
  const features = link.features?.split('|').filter(Boolean) || []
  const faqs     = link.faqs?.split('|').filter(Boolean) || []
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ml.overlay} activeOpacity={1} onPress={onClose} />
      <View style={ml.sheet}>
        <View style={[ml.header, { borderBottomColor: col.border }]}>
          <Text style={ml.headerTxt}>معاينة Mini-Landing</Text>
          <TouchableOpacity onPress={onClose} style={ml.closeBtn}>
            <Text style={ml.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={ml.scroll} showsVerticalScrollIndicator={false}>
          {/* Brand header */}
          <View style={[ml.brandBanner, { backgroundColor: `${col.border}20`, borderColor: `${col.border}40` }]}>
            <View style={[ml.brandDot, { backgroundColor: col.border }]} />
            <Text style={[ml.brandName, { color: col.text }]}>Zyrix Pay</Text>
          </View>

          {/* Title & Amount */}
          <Text style={ml.title}>{link.title}</Text>
          {link.description && <Text style={ml.desc}>{link.description}</Text>}
          <Text style={[ml.amount, { color: col.text }]}>
            {Number(link.amount).toLocaleString()} {CURRENCY_AR[link.currency] ?? link.currency}
          </Text>

          {/* Countdown */}
          {link.expiresAt && new Date(link.expiresAt) > new Date() && (
            <View style={ml.countdownWrap}>
              <CountdownTimer expiresAt={link.expiresAt} color={col.border} />
            </View>
          )}

          {/* Trust Badges */}
          <View style={[ml.trustRow, isRTL && ml.trustRowRTL]}>
            {TRUST_BADGES.map((b, i) => (
              <View key={i} style={ml.trustBadge}>
                <Text style={ml.trustTxt}>{b}</Text>
              </View>
            ))}
          </View>

          {/* Features */}
          {features.length > 0 && (
            <View style={ml.section}>
              <Text style={ml.sectionTitle}>✨ ما تحصل عليه</Text>
              {features.map((f, i) => (
                <View key={i} style={[ml.featureRow, isRTL && ml.featureRowRTL]}>
                  <Text style={[ml.featureCheck, { color: col.text }]}>✓</Text>
                  <Text style={ml.featureTxt}>{f}</Text>
                </View>
              ))}
            </View>
          )}

          {/* FAQs */}
          {faqs.length > 0 && (
            <View style={ml.section}>
              <Text style={ml.sectionTitle}>❓ الأسئلة الشائعة</Text>
              {faqs.map((q, i) => (
                <TouchableOpacity key={i} style={ml.faqItem} onPress={() => setOpenFaq(openFaq === i ? null : i)}>
                  <View style={[ml.faqHeader, isRTL && ml.faqHeaderRTL]}>
                    <Text style={ml.faqQ}>{q}</Text>
                    <Text style={ml.faqChev}>{openFaq === i ? '▲' : '▼'}</Text>
                  </View>
                  {openFaq === i && <Text style={ml.faqA}>يمكنك التواصل معنا مباشرة للاستفسار عن هذا الموضوع.</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Pay button preview */}
          <View style={[ml.payBtn, { backgroundColor: col.border }]}>
            <Text style={ml.payBtnTxt}>ادفع الآن — {Number(link.amount).toLocaleString()} {CURRENCY_AR[link.currency]}</Text>
          </View>

          {/* UTM Tracking info */}
          {(link.utmSource || link.utmCampaign) && (
            <View style={ml.utmInfo}>
              <Text style={ml.utmInfoTxt}>📊 هذا الرابط يتتبع مصدر الزيارات تلقائياً</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}
const ml = StyleSheet.create({
  overlay:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.deepBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  headerTxt:    { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn:     { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.cardBg, alignItems: 'center', justifyContent: 'center' },
  closeTxt:     { fontSize: 14, color: COLORS.textSecondary },
  scroll:       { padding: 16 },
  brandBanner:  { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 14 },
  brandDot:     { width: 8, height: 8, borderRadius: 4 },
  brandName:    { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  title:        { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' },
  desc:         { fontSize: 13, color: COLORS.textSecondary, marginBottom: 10, lineHeight: 20, textAlign: isRTL ? 'right' : 'left' },
  amount:       { fontSize: 28, fontWeight: '900', marginBottom: 12, textAlign: isRTL ? 'right' : 'left' },
  countdownWrap:{ marginBottom: 12, alignSelf: 'flex-start' },
  trustRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  trustRowRTL:  { flexDirection: 'row-reverse' },
  trustBadge:   { backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  trustTxt:     { fontSize: 11, color: '#10B981', fontWeight: '700' },
  section:      { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' },
  featureRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  featureRowRTL:{ flexDirection: 'row-reverse' },
  featureCheck: { fontSize: 14, fontWeight: '800' },
  featureTxt:   { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  faqItem:      { backgroundColor: COLORS.cardBg, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 6 },
  faqHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqHeaderRTL: { flexDirection: 'row-reverse' },
  faqQ:         { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  faqChev:      { fontSize: 10, color: COLORS.textMuted },
  faqA:         { fontSize: 12, color: COLORS.textSecondary, marginTop: 8, lineHeight: 18 },
  payBtn:       { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginVertical: 16 },
  payBtnTxt:    { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  utmInfo:      { backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)', marginBottom: 16 },
  utmInfoTxt:   { fontSize: 12, color: '#60A5FA', fontWeight: '600', textAlign: 'center' },
})

// ─── Conversion Rate Bar ──────────────────────────
function ConversionBar({ views, conversions, color }: { views: number; conversions: number; color: string }) {
  if (!views) return null
  const rate = Math.round((conversions / views) * 100)
  return (
    <View style={cvb.wrap}>
      <View style={[cvb.row, isRTL && cvb.rowRTL]}>
        <Text style={cvb.label}>تحويل: {rate}%</Text>
        <Text style={cvb.sub}>{conversions}/{views}</Text>
      </View>
      <View style={cvb.track}>
        <View style={[cvb.fill, { width: `${rate}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}
const cvb = StyleSheet.create({
  wrap:   { marginBottom: 8 },
  row:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rowRTL: { flexDirection: 'row-reverse' },
  label:  { fontSize: 11, color: COLORS.textSecondary, fontWeight: '700' },
  sub:    { fontSize: 10, color: COLORS.textMuted },
  track:  { height: 5, backgroundColor: COLORS.surfaceBg, borderRadius: 3, overflow: 'hidden' },
  fill:   { height: '100%', borderRadius: 3 },
})

// ─── Filter Tabs ──────────────────────────────────
function FilterTabs({ tabs, active, counts, onChange }: {
  tabs: typeof FILTER_TABS; active: string
  counts: Record<string, number>; onChange: (k: string) => void
}) {
  const tabWidth = (SW - SPACING.lg * 2 - 6) / tabs.length
  const animX = useRef(new Animated.Value(0)).current
  const col = STATUS_COLORS[active] ?? STATUS_COLORS.all

  useEffect(() => {
    const idx = tabs.findIndex(t => t.key === active)
    Animated.spring(animX, { toValue: idx * tabWidth, friction: 8, tension: 80, useNativeDriver: true }).start()
  }, [active])

  return (
    <View style={ft.wrap}>
      <Animated.View style={[ft.pill, { width: tabWidth, backgroundColor: col.bg, borderColor: col.border, shadowColor: col.glow, transform: [{ translateX: animX }] }]} />
      {tabs.map((tab, i) => {
        const isActive = tab.key === active
        const c = STATUS_COLORS[tab.key] ?? STATUS_COLORS.all
        return (
          <TouchableOpacity key={tab.key} style={[ft.tab, { width: tabWidth }]} onPress={() => onChange(tab.key)} activeOpacity={0.8}>
            <Text style={ft.icon}>{c.icon}</Text>
            <Text style={[ft.label, isActive && { color: c.text, fontWeight: FONT_WEIGHT.bold }]}>{tab.label}</Text>
            <View style={[ft.badge, isActive && { backgroundColor: col.border }]}>
              <Text style={[ft.badgeTxt, isActive && { color: '#fff' }]}>{counts[tab.key] ?? 0}</Text>
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}
const ft = StyleSheet.create({
  wrap:     { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg, padding: 3, position: 'relative', overflow: 'hidden' },
  pill:     { position: 'absolute', top: 3, left: 3, height: 44, borderRadius: RADIUS.md, borderWidth: 1, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 4, zIndex: 0 },
  tab:      { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.sm, gap: 2, zIndex: 1, minHeight: 50 },
  icon:     { fontSize: 14 },
  label:    { fontSize: 10, color: COLORS.textMuted, fontWeight: FONT_WEIGHT.medium },
  badge:    { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeTxt: { fontSize: 9, color: COLORS.textMuted, fontWeight: FONT_WEIGHT.bold },
})

// ─── Vivid KPI Card ───────────────────────────────
function VividKpiCard({ icon, label, value, palette, style }: {
  icon: string; label: string; value: string | number
  palette: typeof KPI_PALETTE[0]; style?: any
}) {
  return (
    <View style={[vk.card, { borderColor: palette.color + '60', shadowColor: palette.glow }, style]}>
      <View style={[vk.glow, { backgroundColor: palette.glow }]} />
      <View style={[vk.iconCircle, { backgroundColor: palette.color + '25', borderColor: palette.color + '50' }]}>
        <Text style={vk.iconText}>{icon}</Text>
      </View>
      <Text style={vk.label}>{label}</Text>
      <Text style={[vk.value, { color: palette.color }]}>{value}</Text>
      <View style={[vk.accentLine, { backgroundColor: palette.color }]} />
    </View>
  )
}
const vk = StyleSheet.create({
  card:       { flex: 1, backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md, overflow: 'hidden', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 5, position: 'relative' },
  glow:       { position: 'absolute', top: -20, right: -20, width: 60, height: 60, borderRadius: 30, opacity: 0.25 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: SPACING.sm },
  iconText:   { fontSize: 16 },
  label:      { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4, textAlign: isRTL ? 'right' : 'left' },
  value:      { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.extrabold },
  accentLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderBottomLeftRadius: RADIUS.lg, borderBottomRightRadius: RADIUS.lg },
})

// ─── Elite Link Card ──────────────────────────────
function LinkCard({ link, onShare, onCopy, onQr, onCancel, onPress, onPreview }: {
  link: PaymentLink
  onShare:()=>void; onCopy:()=>void; onQr:()=>void
  onCancel:()=>void; onPress:()=>void; onPreview:()=>void
}) {
  const col      = STATUS_COLORS[link.status] ?? STATUS_COLORS.all
  const url      = link.paymentUrl || `https://pay.zyrix.co/${link.linkId}`
  const isActive = link.status === 'active'
  const pulse    = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!isActive) return
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.4, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1.0, duration: 900, useNativeDriver: true }),
    ])).start()
  }, [isActive])

  return (
    <TouchableOpacity style={[lc.card, { borderColor: col.border, shadowColor: col.glow }]} onPress={onPress} activeOpacity={0.88}>
      <View style={[lc.accentBar, { backgroundColor: col.border }]} />
      {isActive && (
        <View style={lc.pulseWrap}>
          <Animated.View style={[lc.pulseRing, { borderColor: col.border, transform: [{ scale: pulse }] }]} />
          <View style={[lc.pulseDot, { backgroundColor: col.border }]} />
        </View>
      )}
      <View style={lc.body}>
        {/* Top row */}
        <View style={[lc.topRow, isRTL && { flexDirection: 'row-reverse' }]}>
          <View style={{ flex: 1 }}>
            <Text style={lc.title} numberOfLines={1}>{link.title}</Text>
            <Text style={lc.linkId}>{link.linkId}</Text>
            {link.description && <Text style={lc.desc} numberOfLines={1}>{link.description}</Text>}
          </View>
          <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 6 }}>
            <Text style={[lc.amount, { color: col.text }]}>
              {Number(link.amount).toLocaleString()} {CURRENCY_AR[link.currency] ?? link.currency}
            </Text>
            <StatusBadge status={link.status as any} />
          </View>
        </View>

        {/* Countdown for expiring */}
        {link.expiresAt && isActive && new Date(link.expiresAt) > new Date() && (
          <View style={{ marginBottom: 8 }}>
            <CountdownTimer expiresAt={link.expiresAt} color={col.border} />
          </View>
        )}

        {/* UTM Tracking */}
        {(link.utmSource || link.utmCampaign) && (
          <UTMBadge source={link.utmSource} medium={link.utmMedium} campaign={link.utmCampaign} />
        )}

        {/* Conversion bar */}
        {link.views !== undefined && (
          <ConversionBar views={link.views} conversions={link.conversions ?? 0} color={col.border} />
        )}

        {/* URL */}
        <View style={[lc.urlBox, { borderColor: col.border + '40', backgroundColor: col.bg }]}>
          <Text style={[lc.urlText, { color: col.text }]} numberOfLines={1}>{url}</Text>
        </View>

        {/* Trust badges */}
        <View style={[lc.trustRow, isRTL && { flexDirection: 'row-reverse' }]}>
          {TRUST_BADGES.slice(0, 3).map((b, i) => (
            <View key={i} style={lc.trustBadge}>
              <Text style={lc.trustTxt}>{b}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        {isActive && (
          <View style={[lc.actions, isRTL && { flexDirection: 'row-reverse' }]}>
            {[
              { icon:'🖼', label:'معاينة', onPress: onPreview, color:'#10B981', bg:'rgba(16,185,129,0.15)' },
              { icon:'📤', label:'مشاركة', onPress: onShare,   color:'#3B82F6', bg:'rgba(59,130,246,0.15)' },
              { icon:'📋', label:'نسخ',    onPress: onCopy,    color:'#8B5CF6', bg:'rgba(139,92,246,0.15)' },
              { icon:'◻',  label:'QR',     onPress: onQr,      color:'#06B6D4', bg:'rgba(6,182,212,0.15)'  },
              { icon:'✕',  label:'إلغاء',  onPress: onCancel,  color:'#EF4444', bg:'rgba(239,68,68,0.15)'  },
            ].map(btn => (
              <TouchableOpacity key={btn.label} style={[lc.actBtn, { backgroundColor: btn.bg, borderColor: btn.color + '50' }]} onPress={btn.onPress} activeOpacity={0.75}>
                <Text style={{ fontSize: 12 }}>{btn.icon}</Text>
                <Text style={[lc.actLabel, { color: btn.color }]}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}
const lc = StyleSheet.create({
  card:       { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, borderWidth: 1, marginBottom: SPACING.sm, flexDirection: isRTL ? 'row-reverse' : 'row', overflow: 'hidden', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  accentBar:  { width: 4, borderRadius: 2 },
  pulseWrap:  { position: 'absolute', top: 14, [isRTL ? 'left' : 'right']: 14, width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  pulseRing:  { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, opacity: 0.5 },
  pulseDot:   { width: 7, height: 7, borderRadius: 3.5 },
  body:       { flex: 1, padding: SPACING.md },
  topRow:     { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  title:      { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary, marginBottom: 2 },
  linkId:     { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontFamily: 'monospace', marginBottom: 2 },
  desc:       { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  amount:     { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.extrabold },
  urlBox:     { borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 5, marginBottom: 6, borderWidth: 1 },
  urlText:    { fontSize: 11, fontFamily: 'monospace', textAlign: isRTL ? 'right' : 'left' },
  trustRow:   { flexDirection: 'row', gap: 5, marginBottom: 8, flexWrap: 'wrap' },
  trustBadge: { backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' },
  trustTxt:   { fontSize: 10, color: '#10B981', fontWeight: '600' },
  actions:    { flexDirection: 'row', gap: 5, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border + '60' },
  actBtn:     { flex: 1, flexDirection: 'column', alignItems: 'center', gap: 3, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1 },
  actLabel:   { fontSize: 9, fontWeight: FONT_WEIGHT.bold },
})

// ─── Main Screen ──────────────────────────────────
export default function PaymentLinksScreen() {
  const router       = useRouter()
  const tabBarHeight = useTabBarHeight()
  const [links, setLinks]           = useState<PaymentLink[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setFilter]   = useState('all')
  const [qrLink, setQrLink]         = useState<PaymentLink | null>(null)
  const [previewLink, setPreviewLink] = useState<PaymentLink | null>(null)

  const fetchLinks = useCallback(async () => {
    try {
      const res = await paymentLinksApi.list()
      setLinks(res.links?.length ? res.links : DEMO_LINKS)
    } catch { setLinks(DEMO_LINKS) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchLinks() }, [fetchLinks])

  const filtered = activeFilter === 'all' ? links : links.filter(l => l.status === activeFilter)
  const counts   = {
    all: links.length,
    active: links.filter(l => l.status === 'active').length,
    paid: links.filter(l => l.status === 'paid').length,
    expired: links.filter(l => l.status === 'expired').length,
  }
  const totalRev  = links.filter(l => l.status === 'paid').reduce((s, l) => s + Number(l.amount), 0)
  const totalViews = links.reduce((s, l) => s + (l.views || 0), 0)
  const totalConv  = links.reduce((s, l) => s + (l.conversions || 0), 0)
  const convRate   = totalViews > 0 ? `${Math.round((totalConv / totalViews) * 100)}%` : '—'

  const handleShare  = async (link: PaymentLink) => { const url = link.paymentUrl || `https://pay.zyrix.co/${link.linkId}`; try { await Share.share({ message: `${link.title}\n${url}`, url }) } catch {} }
  const handleCopy   = async (link: PaymentLink) => { await Clipboard.setStringAsync(link.paymentUrl || `https://pay.zyrix.co/${link.linkId}`); Alert.alert('✓', 'تم نسخ الرابط') }
  const handleCancel = (linkId: string) => Alert.alert('إلغاء الرابط', 'هل أنت متأكد؟', [{ text: 'تراجع', style: 'cancel' }, { text: 'إلغاء', style: 'destructive', onPress: async () => { try { await paymentLinksApi.cancel(linkId); fetchLinks() } catch {} } }])

  if (loading) return (
    <SafeAreaView style={s.safe}><InnerHeader title="روابط الدفع" accentColor={COLORS.primaryLight} />
      <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.safe}>
      <InnerHeader title="روابط الدفع" accentColor={COLORS.primaryLight} />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: tabBarHeight }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLinks() }} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.kpiGrid}>
          <VividKpiCard icon={KPI_PALETTE[0].icon} label={KPI_PALETTE[0].label} value={counts.active}      palette={KPI_PALETTE[0]} style={{ flex: 1 }} />
          <VividKpiCard icon={KPI_PALETTE[1].icon} label={KPI_PALETTE[1].label} value={counts.paid}        palette={KPI_PALETTE[1]} style={{ flex: 1 }} />
        </View>
        <View style={[s.kpiGrid, { marginBottom: SPACING.lg }]}>
          <VividKpiCard icon={KPI_PALETTE[2].icon} label={KPI_PALETTE[2].label} value={`${totalRev.toLocaleString()} ر.س`} palette={KPI_PALETTE[2]} style={{ flex: 1 }} />
          <VividKpiCard icon={KPI_PALETTE[3].icon} label={KPI_PALETTE[3].label} value={convRate}           palette={KPI_PALETTE[3]} style={{ flex: 1 }} />
        </View>

        <TouchableOpacity style={s.createBtn} onPress={() => router.push('/(merchant)/create-payment-link' as any)} activeOpacity={0.85}>
          <Text style={s.createIcon}>＋</Text>
          <Text style={s.createText}>إنشاء رابط دفع جديد</Text>
        </TouchableOpacity>

        <FilterTabs tabs={FILTER_TABS} active={activeFilter} counts={counts} onChange={setFilter} />

        {filtered.length === 0 ? (
          <SmartEmptyState type="payment_links" />
        ) : filtered.map(link => (
          <LinkCard
            key={link.id} link={link}
            onShare={() => handleShare(link)}
            onCopy={() => handleCopy(link)}
            onQr={() => setQrLink(link)}
            onCancel={() => handleCancel(link.linkId)}
            onPress={() => router.push({ pathname: '/(merchant)/payment-link-detail' as any, params: { linkId: link.linkId } })}
            onPreview={() => setPreviewLink(link)}
          />
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>

      {qrLink && <QRCodeModal visible={!!qrLink} onClose={() => setQrLink(null)} value={qrLink.paymentUrl || `https://pay.zyrix.co/${qrLink.linkId}`} title={qrLink.title} subtitle={`${Number(qrLink.amount).toLocaleString()} ${CURRENCY_AR[qrLink.currency] ?? qrLink.currency}`} />}
      {previewLink && <MiniLandingModal link={previewLink} visible={!!previewLink} onClose={() => setPreviewLink(null)} />}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: COLORS.deepBg },
  scroll:    { paddingTop: SPACING.md, paddingHorizontal: SPACING.lg },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  kpiGrid:   { flexDirection: isRTL ? 'row-reverse' : 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  createBtn: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: RADIUS.lg, marginBottom: SPACING.md, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 7 },
  createIcon:{ fontSize: 20, color: COLORS.white, fontWeight: FONT_WEIGHT.bold },
  createText:{ fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.white },
})