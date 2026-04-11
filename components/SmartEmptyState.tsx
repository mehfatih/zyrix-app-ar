// components/SmartEmptyState.tsx
// ✅ 25 — Smart Empty States
// ✅ 30 — Embedded Help

import React, { useRef, useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, I18nManager, Modal, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { COLORS } from '../constants/colors'

const isRTL = I18nManager.isRTL

// ─── Empty State Config ───────────────────────────────────────
export type EmptyStateType =
  | 'transactions'
  | 'payment_links'
  | 'customers'
  | 'invoices'
  | 'settlements'
  | 'disputes'
  | 'subscriptions'
  | 'cod'
  | 'analytics'
  | 'alerts'
  | 'notifications'
  | 'generic'

interface EmptyConfig {
  icon:    string
  titleAr: string
  descAr:  string
  ctaAr:   string
  route:   string
  tipAr:   string
  color:   string
}

const EMPTY_CONFIGS: Record<EmptyStateType, EmptyConfig> = {
  transactions: {
    icon: '💳', color: '#06B6D4',
    titleAr: 'لا معاملات بعد',
    descAr:  'ستظهر هنا كل مدفوعاتك فور استقبالها',
    ctaAr:   'أنشئ رابط دفع',
    route:   '/(merchant)/payment-links',
    tipAr:   'أسرع طريقة لاستقبال دفعة: أنشئ رابط دفع وأرسله لعميلك',
  },
  payment_links: {
    icon: '🔗', color: '#8B5CF6',
    titleAr: 'لا روابط دفع',
    descAr:  'أنشئ رابط دفع وأرسله لعملائك في ثوانٍ',
    ctaAr:   'إنشاء رابط جديد',
    route:   '/(merchant)/payment-links',
    tipAr:   'روابط الدفع تعمل بدون موقع — مثالية لـ WhatsApp وInstagram',
  },
  customers: {
    icon: '👥', color: '#10B981',
    titleAr: 'لا عملاء مسجلين',
    descAr:  'يتم تسجيل العملاء تلقائياً عند أول دفعة',
    ctaAr:   'استقبل أول دفعة',
    route:   '/(merchant)/payment-links',
    tipAr:   'بيانات العملاء تُجمع تلقائياً من كل معاملة ناجحة',
  },
  invoices: {
    icon: '📄', color: '#F59E0B',
    titleAr: 'لا فواتير',
    descAr:  'أنشئ فاتورة احترافية وأرسلها مباشرة للعميل',
    ctaAr:   'فاتورة جديدة',
    route:   '/(merchant)/invoices',
    tipAr:   'الفواتير تدعم الضريبة تلقائياً وتُرسل بالبريد',
  },
  settlements: {
    icon: '🏦', color: '#0D9488',
    titleAr: 'لا تسويات بعد',
    descAr:  'ستظهر تسوياتك هنا بعد أول معاملة ناجحة',
    ctaAr:   'استقبل أول دفعة',
    route:   '/(merchant)/payment-links',
    tipAr:   'التسويات تتم تلقائياً كل أسبوع إلى حسابك البنكي',
  },
  disputes: {
    icon: '⚠️', color: '#10B981',
    titleAr: 'لا نزاعات مفتوحة',
    descAr:  'هذا جيد! لا نزاعات تحتاج متابعة الآن',
    ctaAr:   'عرض المعاملات',
    route:   '/(merchant)/transactions',
    tipAr:   'النزاعات تُحل عادةً خلال 3-5 أيام عمل',
  },
  subscriptions: {
    icon: '🔄', color: '#6366F1',
    titleAr: 'لا اشتراكات نشطة',
    descAr:  'أنشئ خطة اشتراك لعملائك المنتظمين',
    ctaAr:   'إنشاء اشتراك',
    route:   '/(merchant)/subscriptions',
    tipAr:   'الاشتراكات تزيد تكرار الشراء وتثبّت الإيرادات',
  },
  cod: {
    icon: '💵', color: '#EA580C',
    titleAr: 'لا طلبات COD',
    descAr:  'أنشئ طلب دفع عند الاستلام لعمليات التوصيل',
    ctaAr:   'طلب COD جديد',
    route:   '/(merchant)/cod',
    tipAr:   'COD مثالي للسوق السعودي — يزيد معدل التحويل 40%',
  },
  analytics: {
    icon: '📊', color: '#8B5CF6',
    titleAr: 'لا بيانات كافية',
    descAr:  'ستظهر تحليلاتك هنا بعد أول 10 معاملات',
    ctaAr:   'استقبل معاملات',
    route:   '/(merchant)/payment-links',
    tipAr:   'التحليلات تُحدَّث تلقائياً كل 30 ثانية',
  },
  alerts: {
    icon: '🔔', color: '#F59E0B',
    titleAr: 'لا تنبيهات',
    descAr:  'أنشئ تنبيهاً لمراقبة معدل نجاح مدفوعاتك',
    ctaAr:   'إنشاء تنبيه',
    route:   '/(merchant)/analytics',
    tipAr:   'تنبيه انخفاض معدل النجاح ينقذك من خسائر مبكرة',
  },
  notifications: {
    icon: '🔕', color: COLORS.primary,
    titleAr: 'لا إشعارات',
    descAr:  'ستصلك إشعارات فور حدوث أي نشاط',
    ctaAr:   'الرئيسية',
    route:   '/(merchant)/dashboard',
    tipAr:   'فعّل إشعارات الجهاز للحصول على تنبيهات فورية',
  },
  generic: {
    icon: '📭', color: COLORS.primary,
    titleAr: 'لا بيانات',
    descAr:  'لا يوجد شيء هنا بعد',
    ctaAr:   'الرئيسية',
    route:   '/(merchant)/dashboard',
    tipAr:   '',
  },
}

// ─── Smart Empty State Component ─────────────────────────────
interface SmartEmptyStateProps {
  type:         EmptyStateType
  customTitle?: string
  customDesc?:  string
  showCta?:     boolean
  compact?:     boolean
}

export function SmartEmptyState({
  type, customTitle, customDesc, showCta = true, compact = false,
}: SmartEmptyStateProps) {
  const router  = useRouter()
  const cfg     = EMPTY_CONFIGS[type]
  const fadeAnim  = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.85)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start()
  }, [])

  if (compact) {
    return (
      <Animated.View style={[es.compact, { opacity: fadeAnim }]}>
        <Text style={es.compactIcon}>{cfg.icon}</Text>
        <Text style={es.compactTxt}>{customTitle || cfg.titleAr}</Text>
      </Animated.View>
    )
  }

  return (
    <Animated.View style={[es.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      {/* Icon */}
      <View style={[es.iconWrap, { backgroundColor: `${cfg.color}15`, borderColor: `${cfg.color}30` }]}>
        <Text style={es.icon}>{cfg.icon}</Text>
      </View>

      {/* Text */}
      <Text style={[es.title, { color: cfg.color }]}>{customTitle || cfg.titleAr}</Text>
      <Text style={es.desc}>{customDesc || cfg.descAr}</Text>

      {/* Tip */}
      {cfg.tipAr ? (
        <View style={[es.tip, { borderColor: `${cfg.color}30`, backgroundColor: `${cfg.color}08` }]}>
          <Text style={es.tipIcon}>💡</Text>
          <Text style={[es.tipTxt, { color: cfg.color }]}>{cfg.tipAr}</Text>
        </View>
      ) : null}

      {/* CTA */}
      {showCta && (
        <TouchableOpacity
          style={[es.cta, { backgroundColor: cfg.color }]}
          onPress={() => router.push(cfg.route as any)}
          activeOpacity={0.85}
        >
          <Text style={es.ctaTxt}>{cfg.ctaAr} ›</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  )
}

const es = StyleSheet.create({
  container:   { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 14 },
  iconWrap:    { width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  icon:        { fontSize: 36 },
  title:       { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  desc:        { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  tip:         { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, borderWidth: 1, borderRadius: 10, padding: 12, alignSelf: 'stretch' },
  tipIcon:     { fontSize: 14 },
  tipTxt:      { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  cta:         { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12, marginTop: 4 },
  ctaTxt:      { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  compact:     { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, paddingVertical: 16, justifyContent: 'center' },
  compactIcon: { fontSize: 20 },
  compactTxt:  { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
})

// ─── Embedded Help Component ──────────────────────────────────
// ✅ 30 — Embedded Help

interface HelpItem {
  q: string
  a: string
}

interface EmbeddedHelpProps {
  context: string
  items:   HelpItem[]
  color?:  string
}

export function EmbeddedHelp({ context, items, color = COLORS.primary }: EmbeddedHelpProps) {
  const [expanded, setExpanded] = useState(false)
  const [openIdx,  setOpenIdx]  = useState<number | null>(null)
  const rotateAnim = useRef(new Animated.Value(0)).current

  const toggle = () => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1, duration: 200, useNativeDriver: true,
    }).start()
    setExpanded(p => !p)
    setOpenIdx(null)
  }

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })

  return (
    <View style={[hp.wrapper, { borderColor: `${color}30` }]}>
      <TouchableOpacity style={[hp.header, isRTL && hp.headerRTL]} onPress={toggle} activeOpacity={0.8}>
        <Text style={hp.headerIcon}>❓</Text>
        <Text style={[hp.headerTxt, { color }]}>مساعدة: {context}</Text>
        <Animated.Text style={[hp.chevron, { transform: [{ rotate }] }]}>▼</Animated.Text>
      </TouchableOpacity>

      {expanded && (
        <View style={hp.body}>
          {items.map((item, i) => (
            <TouchableOpacity key={i} style={hp.item} onPress={() => setOpenIdx(openIdx === i ? null : i)} activeOpacity={0.8}>
              <View style={[hp.itemHeader, isRTL && hp.itemHeaderRTL]}>
                <Text style={[hp.q, { color }]}>{item.q}</Text>
                <Text style={hp.itemChevron}>{openIdx === i ? '▲' : '▼'}</Text>
              </View>
              {openIdx === i && <Text style={hp.a}>{item.a}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

const hp = StyleSheet.create({
  wrapper:       { backgroundColor: COLORS.cardBg, borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  header:        { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  headerRTL:     { flexDirection: 'row-reverse' },
  headerIcon:    { fontSize: 16 },
  headerTxt:     { flex: 1, fontSize: 13, fontWeight: '700' },
  chevron:       { fontSize: 12, color: COLORS.textMuted },
  body:          { borderTopWidth: 1, borderTopColor: COLORS.border },
  item:          { borderBottomWidth: 1, borderBottomColor: COLORS.border, padding: 14, gap: 6 },
  itemHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemHeaderRTL: { flexDirection: 'row-reverse' },
  q:             { flex: 1, fontSize: 13, fontWeight: '700' },
  itemChevron:   { fontSize: 10, color: COLORS.textMuted },
  a:             { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
})

export default SmartEmptyState