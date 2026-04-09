/**
 * Zyrix App — Payment Links Screen  (REBUILT with vivid colors + animated pivot)
 * 📁 app/(merchant)/payment-links.tsx
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  I18nManager, SafeAreaView, ActivityIndicator, RefreshControl,
  Alert, Share, Animated, Dimensions,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useRouter } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme'
import { paymentLinksApi } from '../../services/api'
import { StatusBadge } from '../../components/StatusBadge'
import { QRCodeModal } from '../../components/QRCodeModal'
import { InnerHeader } from '../../components/InnerHeader'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg'

const isRTL    = I18nManager.isRTL
const { width: SW } = Dimensions.get('window')

// ─── Vivid Color Palette per status ──────────────

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; glow: string; icon: string }> = {
  all:     { bg: '#1E3A5F',           border: '#3B82F6', text: '#60A5FA', glow: 'rgba(59,130,246,0.35)',  icon: '🔗' },
  active:  { bg: 'rgba(5,150,105,0.18)', border: '#059669', text: '#34D399', glow: 'rgba(5,150,105,0.4)',  icon: '🟢' },
  paid:    { bg: 'rgba(37,99,235,0.18)', border: '#2563EB', text: '#60A5FA', glow: 'rgba(37,99,235,0.4)',  icon: '💰' },
  expired: { bg: 'rgba(217,119,6,0.18)', border: '#D97706', text: '#FBBF24', glow: 'rgba(217,119,6,0.4)',  icon: '⏱' },
}

const KPI_PALETTE = [
  { icon: '🔗', label: 'روابط نشطة',    color: '#3B82F6', glow: 'rgba(59,130,246,0.4)',   bgStart: '#1E3A8A', bgEnd: '#1E40AF' },
  { icon: '✅', label: 'تم الدفع',       color: '#10B981', glow: 'rgba(16,185,129,0.4)',   bgStart: '#064E3B', bgEnd: '#065F46' },
  { icon: '💰', label: 'محصّل',          color: '#34D399', glow: 'rgba(52,211,153,0.4)',   bgStart: '#065F46', bgEnd: '#047857' },
  { icon: '⏳', label: 'معلّق',          color: '#FBBF24', glow: 'rgba(251,191,36,0.4)',   bgStart: '#78350F', bgEnd: '#92400E' },
]

// ─── Types ───────────────────────────────────────

interface PaymentLink {
  id: string; linkId: string; amount: string; currency: string
  title: string; description: string | null; status: string
  expiresAt: string | null; createdAt: string; paymentUrl?: string
  views?: number; conversions?: number
}

const DEMO_LINKS: PaymentLink[] = [
  { id:'1', linkId:'ZRX-PL-001', amount:'5000', currency:'SAR', title:'تصميم متجر إلكتروني',    description:'تصميم وبرمجة متجر متكامل',          status:'active',  expiresAt:null,                  createdAt:'2026-04-01', views:24, conversions:3 },
  { id:'2', linkId:'ZRX-PL-002', amount:'2800', currency:'SAR', title:'باقة التسويق الرقمي',     description:'حملة تسويقية شاملة لمدة شهر',       status:'paid',    expiresAt:null,                  createdAt:'2026-04-01', views:18, conversions:1 },
  { id:'3', linkId:'ZRX-PL-003', amount:'1200', currency:'SAR', title:'استشارة أعمال',            description:'جلسة استشارية متخصصة',              status:'active',  expiresAt:'2026-04-15T23:59:00Z', createdAt:'2026-03-28', views:9,  conversions:0 },
  { id:'4', linkId:'ZRX-PL-004', amount:'650',  currency:'SAR', title:'تقرير تحليلي',             description:'تقرير أداء المبيعات',               status:'expired', expiresAt:'2026-03-30T23:59:00Z', createdAt:'2026-03-25', views:5,  conversions:0 },
  { id:'5', linkId:'ZRX-PL-005', amount:'3500', currency:'SAR', title:'تطوير تطبيق موبايل',       description:'تطبيق iOS وAndroid متكامل',          status:'active',  expiresAt:null,                  createdAt:'2026-03-20', views:41, conversions:2 },
]

const CURRENCY_AR: Record<string,string> = { SAR:'ر.س', AED:'د.إ', KWD:'د.ك', QAR:'ر.ق', USD:'$' }

const FILTER_TABS = [
  { key:'all',     label:'الكل'     },
  { key:'active',  label:'نشطة'     },
  { key:'paid',    label:'مدفوعة'   },
  { key:'expired', label:'منتهية'   },
]

// ─── Animated Filter Tab ─────────────────────────

function FilterTabs({
  tabs, active, counts, onChange,
}: {
  tabs: typeof FILTER_TABS
  active: string
  counts: Record<string, number>
  onChange: (k: string) => void
}) {
  const tabWidth = (SW - SPACING.lg * 2) / tabs.length
  const animX    = useRef(new Animated.Value(0)).current
  const activeIdx = tabs.findIndex(t => t.key === active)

  useEffect(() => {
    Animated.spring(animX, {
      toValue: activeIdx * tabWidth,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start()
  }, [activeIdx, tabWidth])

  const col = STATUS_COLORS[active] ?? STATUS_COLORS.all

  return (
    <View style={ft.wrap}>
      {/* Sliding pill */}
      <Animated.View
        style={[ft.pill, {
          width: tabWidth - 6,
          backgroundColor: col.bg,
          borderColor: col.border,
          shadowColor: col.glow,
          transform: [{ translateX: animX }],
        }]}
      />
      {tabs.map((tab, i) => {
        const isActive = tab.key === active
        const c = STATUS_COLORS[tab.key] ?? STATUS_COLORS.all
        return (
          <TouchableOpacity
            key={tab.key}
            style={[ft.tab, { width: tabWidth }]}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[ft.icon]}>{c.icon}</Text>
            <Text style={[ft.label, isActive && { color: c.text, fontWeight: FONT_WEIGHT.bold }]}>
              {tab.label}
            </Text>
            <View style={[ft.badge, isActive && { backgroundColor: col.border }]}>
              <Text style={[ft.badgeTxt, isActive && { color: '#fff' }]}>
                {counts[tab.key] ?? 0}
              </Text>
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const ft = StyleSheet.create({
  wrap: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    padding: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  pill: {
    position: 'absolute',
    top: 3,
    left: 3,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 0,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: 2,
    zIndex: 1,
    minHeight: 50,
  },
  icon:     { fontSize: 14 },
  label:    { fontSize: 10, color: COLORS.textMuted, fontWeight: FONT_WEIGHT.medium },
  badge: {
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeTxt: { fontSize: 9, color: COLORS.textMuted, fontWeight: FONT_WEIGHT.bold },
})

// ─── Vivid KPI Card ───────────────────────────────

function VividKpiCard({
  icon, label, value, palette, style,
}: {
  icon: string; label: string; value: string | number
  palette: typeof KPI_PALETTE[0]; style?: any
}) {
  return (
    <View style={[vk.card, {
      borderColor: palette.color + '60',
      shadowColor: palette.glow,
    }, style]}>
      {/* Glow dot */}
      <View style={[vk.glow, { backgroundColor: palette.glow }]} />

      <View style={[vk.iconCircle, { backgroundColor: palette.color + '25', borderColor: palette.color + '50' }]}>
        <Text style={vk.iconText}>{icon}</Text>
      </View>
      <Text style={vk.label}>{label}</Text>
      <Text style={[vk.value, { color: palette.color }]}>{value}</Text>
      {/* Bottom accent line */}
      <View style={[vk.accentLine, { backgroundColor: palette.color }]} />
    </View>
  )
}

const vk = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
    position: 'relative',
  },
  glow: {
    position: 'absolute', top: -20, right: -20,
    width: 60, height: 60, borderRadius: 30,
    opacity: 0.25,
  },
  iconCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  iconText: { fontSize: 16 },
  label: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4, textAlign: isRTL ? 'right' : 'left' },
  value: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.extrabold },
  accentLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderBottomLeftRadius: RADIUS.lg, borderBottomRightRadius: RADIUS.lg },
})

// ─── Vivid Link Card ──────────────────────────────

function LinkCard({
  link, onShare, onCopy, onQr, onCancel, onPress,
}: {
  link: PaymentLink
  onShare:()=>void; onCopy:()=>void; onQr:()=>void; onCancel:()=>void; onPress:()=>void
}) {
  const col     = STATUS_COLORS[link.status] ?? STATUS_COLORS.all
  const url     = link.paymentUrl || `https://pay.zyrix.co/${link.linkId}`
  const isActive = link.status === 'active'

  // Pulse animation for active links
  const pulse = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (!isActive) return
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.4, duration: 900,  useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 900,  useNativeDriver: true }),
      ])
    ).start()
  }, [isActive])

  return (
    <TouchableOpacity
      style={[lc.card, { borderColor: col.border, shadowColor: col.glow }]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Left accent bar */}
      <View style={[lc.accentBar, { backgroundColor: col.border }]} />

      {/* Status pulse dot */}
      {isActive && (
        <View style={lc.pulseWrap}>
          <Animated.View style={[lc.pulseRing, { borderColor: col.border, transform: [{ scale: pulse }] }]} />
          <View style={[lc.pulseDot, { backgroundColor: col.border }]} />
        </View>
      )}

      <View style={lc.body}>
        {/* Top row */}
        <View style={[lc.topRow, isRTL && s.rev]}>
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

        {/* URL */}
        <View style={[lc.urlBox, { borderColor: col.border + '40', backgroundColor: col.bg }]}>
          <Text style={[lc.urlText, { color: col.text }]} numberOfLines={1}>{url}</Text>
        </View>

        {/* Stats */}
        {link.views !== undefined && (
          <View style={[lc.statsRow, isRTL && s.rev]}>
            <Text style={lc.stat}>👁 {link.views}</Text>
            <Text style={lc.dot}>·</Text>
            <Text style={lc.stat}>✓ {link.conversions ?? 0}</Text>
            {link.expiresAt && (
              <>
                <Text style={lc.dot}>·</Text>
                <Text style={[lc.stat, { color: COLORS.warning }]}>
                  ⏱ {new Date(link.expiresAt).toLocaleDateString('ar-SA')}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Actions */}
        {isActive && (
          <View style={[lc.actions, isRTL && s.rev]}>
            {[
              { icon:'📤', label:'مشاركة', onPress: onShare,  color:'#3B82F6', bg:'rgba(59,130,246,0.15)'  },
              { icon:'📋', label:'نسخ',    onPress: onCopy,   color:'#8B5CF6', bg:'rgba(139,92,246,0.15)' },
              { icon:'◻',  label:'QR',     onPress: onQr,     color:'#06B6D4', bg:'rgba(6,182,212,0.15)'  },
              { icon:'✕',  label:'إلغاء',  onPress: onCancel, color:'#EF4444', bg:'rgba(239,68,68,0.15)'  },
            ].map(btn => (
              <TouchableOpacity
                key={btn.label}
                style={[lc.actBtn, { backgroundColor: btn.bg, borderColor: btn.color + '50' }]}
                onPress={btn.onPress}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 13 }}>{btn.icon}</Text>
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
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  accentBar: { width: 4, borderRadius: 2 },
  pulseWrap: { position: 'absolute', top: 14, [isRTL ? 'left' : 'right']: 14, width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, opacity: 0.5 },
  pulseDot:  { width: 7, height: 7, borderRadius: 3.5 },
  body:      { flex: 1, padding: SPACING.md },
  topRow:    { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  title:     { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary, marginBottom: 2 },
  linkId:    { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontFamily: 'monospace', marginBottom: 2 },
  desc:      { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  amount:    { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.extrabold },
  urlBox:    { borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 5, marginBottom: SPACING.sm, borderWidth: 1 },
  urlText:   { fontSize: 11, fontFamily: 'monospace', textAlign: isRTL ? 'right' : 'left' },
  statsRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  stat:      { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  dot:       { fontSize: FONT_SIZE.xs, color: COLORS.border },
  actions:   { flexDirection: 'row', gap: 6, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border + '60' },
  actBtn: {
    flex: 1, flexDirection: 'column', alignItems: 'center', gap: 3,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  actLabel:  { fontSize: 10, fontWeight: FONT_WEIGHT.bold },
})

// ─── Main Screen ─────────────────────────────────

export default function PaymentLinksScreen() {
  const router      = useRouter()
  const tabBarHeight = useTabBarHeight()
  const [links, setLinks]         = useState<PaymentLink[]>([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setFilter] = useState('all')
  const [qrLink, setQrLink]       = useState<PaymentLink | null>(null)

  const fetchLinks = useCallback(async () => {
    try {
      const res = await paymentLinksApi.list()
      setLinks(res.links?.length ? res.links : DEMO_LINKS)
    } catch { setLinks(DEMO_LINKS) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchLinks() }, [fetchLinks])

  const filtered  = activeFilter === 'all' ? links : links.filter(l => l.status === activeFilter)
  const counts    = { all: links.length, active: links.filter(l=>l.status==='active').length, paid: links.filter(l=>l.status==='paid').length, expired: links.filter(l=>l.status==='expired').length }
  const totalRev  = links.filter(l=>l.status==='paid').reduce((s,l)=>s+Number(l.amount),0)
  const pendRev   = links.filter(l=>l.status==='active').reduce((s,l)=>s+Number(l.amount),0)

  const handleShare = async (link: PaymentLink) => {
    const url = link.paymentUrl || `https://pay.zyrix.co/${link.linkId}`
    try { await Share.share({ message: `${link.title}\n${url}`, url }) } catch {}
  }
  const handleCopy = async (link: PaymentLink) => {
    await Clipboard.setStringAsync(link.paymentUrl || `https://pay.zyrix.co/${link.linkId}`)
    Alert.alert('✓', 'تم نسخ الرابط')
  }
  const handleCancel = (linkId: string) =>
    Alert.alert('إلغاء الرابط', 'هل أنت متأكد؟', [
      { text: 'تراجع', style: 'cancel' },
      { text: 'إلغاء', style: 'destructive', onPress: async () => {
        try { await paymentLinksApi.cancel(linkId); fetchLinks() } catch {}
      }},
    ])

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <InnerHeader title="روابط الدفع" accentColor={COLORS.primaryLight} />
      <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.safe}>
      <InnerHeader title="روابط الدفع" accentColor={COLORS.primaryLight} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: tabBarHeight }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLinks() }} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Vivid KPI Grid ─── */}
        <View style={s.kpiGrid}>
          <VividKpiCard icon={KPI_PALETTE[0].icon} label={KPI_PALETTE[0].label} value={counts.active}              palette={KPI_PALETTE[0]} style={{ flex: 1 }} />
          <VividKpiCard icon={KPI_PALETTE[1].icon} label={KPI_PALETTE[1].label} value={counts.paid}                palette={KPI_PALETTE[1]} style={{ flex: 1 }} />
        </View>
        <View style={[s.kpiGrid, { marginBottom: SPACING.lg }]}>
          <VividKpiCard icon={KPI_PALETTE[2].icon} label={KPI_PALETTE[2].label} value={`${totalRev.toLocaleString()} ر.س`} palette={KPI_PALETTE[2]} style={{ flex: 1 }} />
          <VividKpiCard icon={KPI_PALETTE[3].icon} label={KPI_PALETTE[3].label} value={`${pendRev.toLocaleString()} ر.س`}  palette={KPI_PALETTE[3]} style={{ flex: 1 }} />
        </View>

        {/* ─── Create CTA ─── */}
        <TouchableOpacity
          style={s.createBtn}
          onPress={() => router.push('/(merchant)/create-payment-link' as any)}
          activeOpacity={0.85}
        >
          <Text style={s.createIcon}>＋</Text>
          <Text style={s.createText}>إنشاء رابط دفع جديد</Text>
        </TouchableOpacity>

        {/* ─── Animated Filter Tabs ─── */}
        <FilterTabs
          tabs={FILTER_TABS}
          active={activeFilter}
          counts={counts}
          onChange={setFilter}
        />

        {/* ─── List ─── */}
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>{STATUS_COLORS[activeFilter]?.icon ?? '🔗'}</Text>
            <Text style={s.emptyTitle}>لا توجد روابط</Text>
            <Text style={s.emptyHint}>أنشئ رابط دفع جديد لتحصيل مدفوعاتك</Text>
          </View>
        ) : (
          filtered.map(link => (
            <LinkCard
              key={link.id}
              link={link}
              onShare={() => handleShare(link)}
              onCopy={() => handleCopy(link)}
              onQr={() => setQrLink(link)}
              onCancel={() => handleCancel(link.linkId)}
              onPress={() => router.push({ pathname: '/(merchant)/payment-link-detail' as any, params: { linkId: link.linkId } })}
            />
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {qrLink && (
        <QRCodeModal
          visible={!!qrLink} onClose={() => setQrLink(null)}
          value={qrLink.paymentUrl || `https://pay.zyrix.co/${qrLink.linkId}`}
          title={qrLink.title}
          subtitle={`${Number(qrLink.amount).toLocaleString()} ${CURRENCY_AR[qrLink.currency] ?? qrLink.currency}`}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.deepBg },
  scroll:  { paddingTop: SPACING.md, paddingHorizontal: SPACING.lg,  },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  rev:     { flexDirection: 'row-reverse' },
  kpiGrid: { flexDirection: isRTL ? 'row-reverse' : 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  createBtn: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: 14, borderRadius: RADIUS.lg, marginBottom: SPACING.md,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 7,
  },
  createIcon: { fontSize: 20, color: COLORS.white, fontWeight: FONT_WEIGHT.bold },
  createText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.white },
  empty:      { paddingVertical: 60, alignItems: 'center', gap: SPACING.sm },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  emptyHint:  { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center' },
})