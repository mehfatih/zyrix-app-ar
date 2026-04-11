/**
 * Zyrix App — Payment Methods Screen (ELITE)
 * ✅ Auto-suggest best methods by country/context
 * ✅ Success rate per method
 * ✅ Smart recommendation engine
 */

import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  I18nManager, SafeAreaView, ActivityIndicator, RefreshControl, Switch, Alert,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme'
import { InnerHeader } from '../../components/InnerHeader'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'

const isRTL = I18nManager.isRTL

interface PaymentMethodItem {
  method: string; nameAr: string; nameEn: string; icon: string
  popular: boolean; isActive: boolean; status: string; isDefault: boolean
  feePercent: number | null; feeFixed: number | null
  successRate?: number; countries?: string[]
}

// ─── Smart Recommendations by Country ─────────────
const COUNTRY_RECOMMENDATIONS: Record<string, { methods: string[]; tip: string }> = {
  SA: { methods: ['MADA', 'STC_PAY', 'CREDIT_CARD', 'APPLE_PAY'], tip: 'في السعودية: مدى وSTCPay يرفعان معدل التحويل 40%' },
  AE: { methods: ['CREDIT_CARD', 'APPLE_PAY', 'GOOGLE_PAY', 'BANK_TRANSFER'], tip: 'في الإمارات: البطاقات و Apple Pay الأكثر استخداماً' },
  KW: { methods: ['CREDIT_CARD', 'KNET', 'APPLE_PAY'], tip: 'في الكويت: KNET أكثر طرق الدفع المحلية شيوعاً' },
  QA: { methods: ['CREDIT_CARD', 'APPLE_PAY', 'BANK_TRANSFER'], tip: 'في قطر: البطاقات الائتمانية تهيمن على 70% من المدفوعات' },
  TR: { methods: ['CREDIT_CARD', 'BANK_TRANSFER', 'TROY'], tip: 'في تركيا: التقسيط على البطاقة يزيد التحويل 35%' },
}

const DEMO_METHODS: PaymentMethodItem[] = [
  { method: 'CREDIT_CARD',   nameAr: 'بطاقة ائتمانية',  nameEn: 'Credit Card',      icon: '💳', popular: true,  isActive: true,  status: 'ACTIVE',   isDefault: true,  feePercent: 2.5,  feeFixed: null, successRate: 89, countries: ['SA','AE','KW','QA','TR'] },
  { method: 'MADA',          nameAr: 'مدى',              nameEn: 'Mada',             icon: '💙', popular: true,  isActive: true,  status: 'ACTIVE',   isDefault: false, feePercent: 1.5,  feeFixed: null, successRate: 94, countries: ['SA'] },
  { method: 'APPLE_PAY',     nameAr: 'Apple Pay',        nameEn: 'Apple Pay',        icon: '🍎', popular: true,  isActive: false, status: 'INACTIVE', isDefault: false, feePercent: 2.0,  feeFixed: null, successRate: 96, countries: ['SA','AE','QA'] },
  { method: 'GOOGLE_PAY',    nameAr: 'Google Pay',       nameEn: 'Google Pay',       icon: '🔵', popular: true,  isActive: false, status: 'INACTIVE', isDefault: false, feePercent: 2.0,  feeFixed: null, successRate: 93, countries: ['AE'] },
  { method: 'STC_PAY',       nameAr: 'STC Pay',          nameEn: 'STC Pay',          icon: '📱', popular: true,  isActive: false, status: 'INACTIVE', isDefault: false, feePercent: 1.8,  feeFixed: null, successRate: 91, countries: ['SA'] },
  { method: 'BANK_TRANSFER', nameAr: 'تحويل بنكي',       nameEn: 'Bank Transfer',    icon: '🏦', popular: false, isActive: true,  status: 'ACTIVE',   isDefault: false, feePercent: null, feeFixed: 5.0,  successRate: 78, countries: ['SA','AE','KW','QA','TR'] },
  { method: 'TAMARA',        nameAr: 'تمارا (BNPL)',     nameEn: 'Tamara',           icon: '🛒', popular: true,  isActive: false, status: 'INACTIVE', isDefault: false, feePercent: 3.0,  feeFixed: null, successRate: 87, countries: ['SA','AE'] },
  { method: 'TABBY',         nameAr: 'تابي (تقسيط)',     nameEn: 'Tabby',            icon: '📦', popular: false, isActive: false, status: 'INACTIVE', isDefault: false, feePercent: 3.5,  feeFixed: null, successRate: 85, countries: ['SA','AE'] },
  { method: 'DEBIT_CARD',    nameAr: 'بطاقة مدفوعة مسبقاً', nameEn: 'Debit Card',  icon: '💳', popular: false, isActive: true,  status: 'ACTIVE',   isDefault: false, feePercent: 1.5,  feeFixed: null, successRate: 82, countries: ['SA','AE','TR'] },
  { method: 'CRYPTO',        nameAr: 'كريبتو',           nameEn: 'Crypto',           icon: '₿', popular: false, isActive: false, status: 'INACTIVE', isDefault: false, feePercent: 1.0,  feeFixed: null, successRate: 71, countries: ['SA','AE'] },
  { method: 'COD',           nameAr: 'دفع عند الاستلام', nameEn: 'Cash on Delivery', icon: '💵', popular: true,  isActive: false, status: 'INACTIVE', isDefault: false, feePercent: null, feeFixed: 10.0, successRate: 65, countries: ['SA','KW'] },
  { method: 'WALLET',        nameAr: 'محفظة Zyrix',      nameEn: 'Zyrix Wallet',     icon: '👜', popular: false, isActive: false, status: 'INACTIVE', isDefault: false, feePercent: 0.5,  feeFixed: null, successRate: 99, countries: ['SA','AE','TR'] },
]

// ─── Smart Suggestion Panel ────────────────────────
function SmartSuggestions({ methods, selectedCountry, onActivate }: {
  methods: PaymentMethodItem[]
  selectedCountry: string
  onActivate: (method: string) => void
}) {
  const rec = COUNTRY_RECOMMENDATIONS[selectedCountry]
  if (!rec) return null

  const recommended = rec.methods.filter(m => {
    const found = methods.find(pm => pm.method === m || pm.nameEn.toUpperCase().replace(' ','_') === m)
    return found && !found.isActive
  })

  if (recommended.length === 0) return null

  const getMethod = (key: string) => methods.find(m =>
    m.method === key || m.nameEn.toUpperCase().replace(' ','_') === key
  )

  return (
    <View style={ss.wrap}>
      <View style={[ss.header, isRTL && ss.headerRTL]}>
        <Text style={ss.headerIcon}>🎯</Text>
        <View style={{ flex: 1 }}>
          <Text style={ss.headerTxt}>توصيات ذكية لسوقك</Text>
          <Text style={ss.tip}>{rec.tip}</Text>
        </View>
      </View>
      <View style={[ss.methodsRow, isRTL && ss.methodsRowRTL]}>
        {recommended.slice(0, 4).map(key => {
          const m = getMethod(key)
          if (!m) return null
          return (
            <TouchableOpacity key={key} style={ss.methodCard} onPress={() => onActivate(m.method)} activeOpacity={0.8}>
              <Text style={ss.methodIcon}>{m.icon}</Text>
              <Text style={ss.methodName} numberOfLines={1}>{m.nameAr}</Text>
              {m.successRate && <Text style={ss.rate}>{m.successRate}% ✓</Text>}
              <View style={ss.activateBtn}>
                <Text style={ss.activateTxt}>تفعيل</Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}
const ss = StyleSheet.create({
  wrap:          { backgroundColor: 'rgba(16,185,129,0.06)', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(16,185,129,0.3)', padding: 14, marginBottom: 12 },
  header:        { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 12 },
  headerRTL:     { flexDirection: 'row-reverse' },
  headerIcon:    { fontSize: 20 },
  headerTxt:     { fontSize: 14, fontWeight: '700', color: '#10B981', marginBottom: 3 },
  tip:           { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  methodsRow:    { flexDirection: 'row', gap: 8 },
  methodsRowRTL: { flexDirection: 'row-reverse' },
  methodCard:    { flex: 1, backgroundColor: COLORS.cardBg, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', padding: 10, alignItems: 'center', gap: 4 },
  methodIcon:    { fontSize: 22 },
  methodName:    { fontSize: 10, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
  rate:          { fontSize: 10, color: '#10B981', fontWeight: '700' },
  activateBtn:   { backgroundColor: '#10B981', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2 },
  activateTxt:   { fontSize: 10, color: COLORS.white, fontWeight: '700' },
})

// ─── Country Selector ──────────────────────────────
function CountrySelector({ selected, onChange }: { selected: string; onChange: (c: string) => void }) {
  const countries = [
    { code: 'SA', flag: '🇸🇦', label: 'السعودية' },
    { code: 'AE', flag: '🇦🇪', label: 'الإمارات' },
    { code: 'KW', flag: '🇰🇼', label: 'الكويت' },
    { code: 'QA', flag: '🇶🇦', label: 'قطر' },
    { code: 'TR', flag: '🇹🇷', label: 'تركيا' },
  ]
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cs.row}>
      {countries.map(c => (
        <TouchableOpacity
          key={c.code}
          style={[cs.btn, selected === c.code && cs.btnActive]}
          onPress={() => onChange(c.code)}
          activeOpacity={0.8}
        >
          <Text style={cs.flag}>{c.flag}</Text>
          <Text style={[cs.label, selected === c.code && cs.labelActive]}>{c.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}
const cs = StyleSheet.create({
  row:       { paddingHorizontal: 16, gap: 8, paddingVertical: 8 },
  btn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.cardBg },
  btnActive: { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.12)' },
  flag:      { fontSize: 14 },
  label:     { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  labelActive:{ color: '#10B981' },
})

// ─── Success Rate Badge ────────────────────────────
function SuccessRateBadge({ rate }: { rate?: number }) {
  if (!rate) return null
  const color = rate >= 90 ? '#10B981' : rate >= 80 ? '#F59E0B' : '#EF4444'
  return (
    <View style={[srb.wrap, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
      <Text style={[srb.txt, { color }]}>{rate}% نجاح</Text>
    </View>
  )
}
const srb = StyleSheet.create({
  wrap: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  txt:  { fontSize: 10, fontWeight: '700' },
})

// ─── Method Card ──────────────────────────────────
function MethodCard({ item, onToggle, toggling }: {
  item: PaymentMethodItem
  onToggle: (method: string, current: boolean) => void
  toggling: string | null
}) {
  const isToggling = toggling === item.method
  const accentColor = item.isActive ? '#10B981' : COLORS.textMuted
  const cardBg = item.isActive ? 'rgba(16,185,129,0.06)' : COLORS.cardBg

  return (
    <View style={[styles.methodCard, { backgroundColor: cardBg, borderColor: item.isActive ? 'rgba(16,185,129,0.3)' : COLORS.border }]}>
      <View style={[styles.methodRow, isRTL && styles.rev]}>
        <View style={[styles.methodIconWrap, { backgroundColor: item.isActive ? 'rgba(16,185,129,0.15)' : COLORS.surfaceBg, borderColor: item.isActive ? 'rgba(16,185,129,0.3)' : COLORS.border }]}>
          <Text style={styles.methodIcon}>{item.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={[styles.methodNameRow, isRTL && styles.rev]}>
            <Text style={styles.methodName}>{item.nameAr}</Text>
            {item.popular && <View style={styles.popularBadge}><Text style={styles.popularText}>شائع</Text></View>}
            {item.isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultText}>افتراضي</Text></View>}
          </View>
          <View style={[styles.methodNameRow, isRTL && styles.rev, { marginTop: 3 }]}>
            <Text style={styles.methodNameEn}>{item.nameEn}</Text>
            <SuccessRateBadge rate={item.successRate} />
          </View>
          {(item.feePercent !== null || item.feeFixed !== null) && (
            <Text style={[styles.feeText, { color: accentColor }]}>
              {item.feePercent !== null ? `رسوم: ${item.feePercent}%` : `رسوم ثابتة: ${item.feeFixed} ر.س`}
            </Text>
          )}
        </View>
        {isToggling
          ? <ActivityIndicator size="small" color={COLORS.primary} />
          : <Switch value={item.isActive} onValueChange={() => onToggle(item.method, item.isActive)} trackColor={{ false: COLORS.border, true: '#10B981' }} thumbColor={COLORS.white} />
        }
      </View>
      {item.isActive && <View style={styles.activeBar} />}
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────
export default function PaymentMethodsScreen() {
  const tabBarHeight       = useTabBarHeight()
  const [methods, setMethods]         = useState<PaymentMethodItem[]>(DEMO_METHODS)
  const [loading, setLoading]         = useState(false)
  const [refreshing, setRefreshing]   = useState(false)
  const [toggling, setToggling]       = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedCountry, setSelectedCountry] = useState('SA')

  const fetchData = useCallback(async () => {
    try { setMethods(DEMO_METHODS) }
    catch { setMethods(DEMO_METHODS) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  const onRefresh = () => { setRefreshing(true); fetchData() }

  const handleToggle = async (method: string, currentActive: boolean) => {
    setToggling(method)
    try {
      await new Promise(r => setTimeout(r, 400))
      setMethods(prev => prev.map(m => m.method === method ? { ...m, isActive: !m.isActive, status: !m.isActive ? 'ACTIVE' : 'INACTIVE' } : m))
    } catch { Alert.alert('خطأ', 'فشل تغيير الحالة') }
    finally { setToggling(null) }
  }

  const handleActivateSuggestion = (method: string) => {
    Alert.alert('تفعيل الطريقة', `هل تريد تفعيل "${method}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تفعيل', onPress: () => handleToggle(method, false) },
    ])
  }

  const activeCount = methods.filter(m => m.isActive).length
  const filteredMethods = methods
    .filter(m => activeFilter === 'all' || (activeFilter === 'active' ? m.isActive : !m.isActive))
    .sort((a, b) => (b.successRate || 0) - (a.successRate || 0))

  const popularMethods = filteredMethods.filter(m => m.popular)
  const otherMethods   = filteredMethods.filter(m => !m.popular)

  if (loading) return (
    <SafeAreaView style={styles.safe}><InnerHeader title="طرق الدفع" accentColor="#10B981" />
      <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={styles.safe}>
      <InnerHeader title="طرق الدفع" accentColor="#10B981" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={[styles.summaryRow, isRTL && styles.rev]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>{activeCount}</Text>
              <Text style={styles.summaryLabel}>مفعّلة</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{methods.length - activeCount}</Text>
              <Text style={styles.summaryLabel}>غير مفعّلة</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                {methods.filter(m => m.isActive && m.successRate).length > 0
                  ? `${Math.round(methods.filter(m => m.isActive && m.successRate).reduce((s, m) => s + (m.successRate || 0), 0) / methods.filter(m => m.isActive && m.successRate).length)}%`
                  : '—'}
              </Text>
              <Text style={styles.summaryLabel}>متوسط نجاح</Text>
            </View>
          </View>
          <View style={[styles.activePills, isRTL && styles.rev]}>
            {methods.filter(m => m.isActive).map(m => (
              <View key={m.method} style={styles.activePill}>
                <Text style={styles.activePillIcon}>{m.icon}</Text>
                <Text style={styles.activePillText}>{m.nameAr}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Country Selector */}
        <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginBottom: 6 }]}>🌍 توصيات حسب السوق</Text>
        <CountrySelector selected={selectedCountry} onChange={setSelectedCountry} />

        {/* Smart Suggestions */}
        <View style={{ paddingTop: 8 }}>
          <SmartSuggestions methods={methods} selectedCountry={selectedCountry} onActivate={handleActivateSuggestion} />
        </View>

        {/* Filter Tabs */}
        <View style={[styles.filterRow, isRTL && styles.rev]}>
          {([{ key: 'all', label: 'الكل' }, { key: 'active', label: 'المفعّلة' }, { key: 'inactive', label: 'غير المفعّلة' }] as const).map(f => (
            <TouchableOpacity key={f.key} style={[styles.filterBtn, activeFilter === f.key && styles.filterBtnActive]} onPress={() => setActiveFilter(f.key)} activeOpacity={0.8}>
              <Text style={[styles.filterBtnText, activeFilter === f.key && styles.filterBtnTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Popular Methods */}
        {popularMethods.length > 0 && (
          <>
            <View style={[styles.sectionHeader, isRTL && styles.rev]}>
              <Text style={styles.sectionTitle}>الطرق الشائعة</Text>
              <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{popularMethods.filter(m => m.isActive).length}/{popularMethods.length}</Text></View>
            </View>
            {popularMethods.map(item => <MethodCard key={item.method} item={item} onToggle={handleToggle} toggling={toggling} />)}
          </>
        )}

        {/* Other Methods */}
        {otherMethods.length > 0 && (
          <>
            <View style={[styles.sectionHeader, isRTL && styles.rev]}>
              <Text style={styles.sectionTitle}>طرق أخرى</Text>
              <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{otherMethods.filter(m => m.isActive).length}/{otherMethods.length}</Text></View>
            </View>
            {otherMethods.map(item => <MethodCard key={item.method} item={item} onToggle={handleToggle} toggling={toggling} />)}
          </>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={[styles.infoText, isRTL && { textAlign: 'right' }]}>
            الطرق المفعّلة ستظهر تلقائياً في Hosted Checkout. الطرق مرتبة حسب معدل النجاح.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.deepBg },
  scroll:  { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  rev:     { flexDirection: 'row-reverse' },
  summaryCard:      { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)', padding: SPACING.lg, marginBottom: SPACING.md },
  summaryRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  summaryItem:      { flex: 1, alignItems: 'center' },
  summaryValue:     { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.textPrimary },
  summaryLabel:     { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  summaryDivider:   { width: 1, height: 32, backgroundColor: COLORS.border },
  activePills:      { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  activePill:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.sm, paddingVertical: 4, backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' },
  activePillIcon:   { fontSize: 12 },
  activePillText:   { fontSize: 10, color: '#10B981', fontWeight: FONT_WEIGHT.semibold },
  filterRow:        { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  filterBtn:        { flex: 1, paddingVertical: 9, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border },
  filterBtnActive:  { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)' },
  filterBtnText:    { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textMuted },
  filterBtnTextActive: { color: '#10B981' },
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm, marginTop: SPACING.sm },
  sectionTitle:     { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textSecondary },
  sectionBadge:     { paddingHorizontal: SPACING.sm, paddingVertical: 2, backgroundColor: COLORS.surfaceBg, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  sectionBadgeText: { fontSize: 10, color: COLORS.textMuted, fontWeight: FONT_WEIGHT.semibold },
  methodCard:       { borderRadius: RADIUS.lg, borderWidth: 1, marginBottom: SPACING.sm, overflow: 'hidden' },
  methodRow:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.lg },
  methodIconWrap:   { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  methodIcon:       { fontSize: 22 },
  methodNameRow:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  methodName:       { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  methodNameEn:     { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  feeText:          { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, marginTop: 2 },
  popularBadge:     { paddingHorizontal: SPACING.sm, paddingVertical: 2, backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  popularText:      { fontSize: 9, color: '#F59E0B', fontWeight: FONT_WEIGHT.bold },
  defaultBadge:     { paddingHorizontal: SPACING.sm, paddingVertical: 2, backgroundColor: 'rgba(26,86,219,0.15)', borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(26,86,219,0.3)' },
  defaultText:      { fontSize: 9, color: COLORS.primaryLight, fontWeight: FONT_WEIGHT.bold },
  activeBar:        { height: 2, backgroundColor: '#10B981', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, borderRadius: 1 },
  infoBox:          { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: 'rgba(8,145,178,0.08)', borderRadius: RADIUS.lg, padding: SPACING.lg, marginTop: SPACING.lg, gap: SPACING.md, borderWidth: 1, borderColor: 'rgba(8,145,178,0.2)', alignItems: 'flex-start' },
  infoIcon:         { fontSize: 18 },
  infoText:         { flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.info, lineHeight: 18 },
})