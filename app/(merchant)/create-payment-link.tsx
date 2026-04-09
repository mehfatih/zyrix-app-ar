/**
 * Zyrix App — Create Payment Link Screen  (REBUILT with vivid colors + animated pivot)
 * 📁 app/(merchant)/create-payment-link.tsx
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  I18nManager, SafeAreaView, ActivityIndicator, Alert, Switch,
  Animated, Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme'
import { paymentLinksApi } from '../../services/api'
import { InnerHeader } from '../../components/InnerHeader'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'

const isRTL = I18nManager.isRTL
const { width: SW } = Dimensions.get('window')

// ─── Vivid per-option palettes ────────────────────

const CURRENCY_PALETTE: Record<string, { border: string; bg: string; text: string; glow: string; flag: string; name: string }> = {
  SAR: { border: '#10B981', bg: 'rgba(16,185,129,0.15)', text: '#34D399', glow: 'rgba(16,185,129,0.5)', flag: '🇸🇦', name: 'ريال سعودي' },
  AED: { border: '#F59E0B', bg: 'rgba(245,158,11,0.15)', text: '#FCD34D', glow: 'rgba(245,158,11,0.5)', flag: '🇦🇪', name: 'درهم إماراتي' },
  KWD: { border: '#3B82F6', bg: 'rgba(59,130,246,0.15)', text: '#93C5FD', glow: 'rgba(59,130,246,0.5)', flag: '🇰🇼', name: 'دينار كويتي' },
  QAR: { border: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', text: '#C4B5FD', glow: 'rgba(139,92,246,0.5)', flag: '🇶🇦', name: 'ريال قطري'   },
  USD: { border: '#06B6D4', bg: 'rgba(6,182,212,0.15)',  text: '#67E8F9', glow: 'rgba(6,182,212,0.5)',  flag: '🇺🇸', name: 'دولار أمريكي' },
}

const EXPIRY_PALETTE = [
  { value: '24',  label: '٢٤ ساعة',  icon: '⚡', border: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  text: '#FCD34D', glow: 'rgba(245,158,11,0.5)'  },
  { value: '48',  label: '٤٨ ساعة',  icon: '🕐', border: '#3B82F6', bg: 'rgba(59,130,246,0.15)',  text: '#93C5FD', glow: 'rgba(59,130,246,0.5)'  },
  { value: '168', label: '٧ أيام',   icon: '📅', border: '#8B5CF6', bg: 'rgba(139,92,246,0.15)',  text: '#C4B5FD', glow: 'rgba(139,92,246,0.5)'  },
  { value: '0',   label: 'دائم',     icon: '∞',  border: '#10B981', bg: 'rgba(16,185,129,0.15)',  text: '#34D399', glow: 'rgba(16,185,129,0.5)'  },
]

const STEP_COLORS = ['#3B82F6', '#10B981']

// ─── Animated Step Indicator ─────────────────────

function StepBar({ step }: { step: 0 | 1 }) {
  const prog = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.spring(prog, {
      toValue: step,
      useNativeDriver: false,
      tension: 60, friction: 8,
    }).start()
  }, [step])

  const lineWidth = prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
  const dotScale0 = step === 0 ? 1.15 : 1
  const dotScale1 = step === 1 ? 1.15 : 1

  return (
    <View style={sb.wrap}>
      <View style={sb.track}>
        <Animated.View style={[sb.fill, { width: lineWidth }]} />
      </View>
      <View style={[sb.dotWrap, { left: 0 }]}>
        <Animated.View style={[sb.dot, {
          backgroundColor: STEP_COLORS[0],
          borderColor: STEP_COLORS[0],
          transform: [{ scale: dotScale0 }],
          shadowColor: STEP_COLORS[0],
        }]}>
          <Text style={sb.dotNum}>{step > 0 ? '✓' : '١'}</Text>
        </Animated.View>
        <Text style={[sb.dotLabel, { color: STEP_COLORS[0] }]}>التفاصيل</Text>
      </View>
      <View style={[sb.dotWrap, { right: 0 }]}>
        <Animated.View style={[sb.dot, {
          backgroundColor: step === 1 ? STEP_COLORS[1] : COLORS.surfaceBg,
          borderColor: step === 1 ? STEP_COLORS[1] : COLORS.border,
          transform: [{ scale: dotScale1 }],
          shadowColor: STEP_COLORS[1],
          shadowOpacity: step === 1 ? 0.6 : 0,
        }]}>
          <Text style={[sb.dotNum, { color: step === 1 ? '#fff' : COLORS.textMuted }]}>٢</Text>
        </Animated.View>
        <Text style={[sb.dotLabel, { color: step === 1 ? STEP_COLORS[1] : COLORS.textMuted }]}>الخيارات</Text>
      </View>
    </View>
  )
}

const sb = StyleSheet.create({
  wrap:    { paddingHorizontal: 40, paddingVertical: SPACING.lg, position: 'relative', alignItems: 'center' },
  track:   { height: 3, backgroundColor: COLORS.border, borderRadius: 2, width: '100%' },
  fill:    { height: '100%', backgroundColor: STEP_COLORS[0], borderRadius: 2 },
  dotWrap: { position: 'absolute', top: SPACING.lg - 2, alignItems: 'center', gap: 4 },
  dot: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 8, elevation: 5,
  },
  dotNum:   { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
  dotLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, marginTop: 40 },
})

// ─── Animated Currency Selector ──────────────────

function CurrencySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const currencies = Object.keys(CURRENCY_PALETTE)
  const idx        = currencies.indexOf(value)
  const itemW      = (SW - SPACING.lg * 2 - SPACING.sm * (currencies.length - 1)) / currencies.length
  const animX      = useRef(new Animated.Value(0)).current
  const col        = CURRENCY_PALETTE[value]

  useEffect(() => {
    Animated.spring(animX, {
      toValue: idx * (itemW + SPACING.sm),
      useNativeDriver: true, tension: 70, friction: 9,
    }).start()
  }, [idx])

  return (
    <View>
      <View style={cs.wrap}>
        <Animated.View style={[cs.pill, {
          width: itemW,
          backgroundColor: col.bg,
          borderColor: col.border,
          shadowColor: col.glow,
          transform: [{ translateX: animX }],
        }]} />
        {currencies.map((cur, i) => {
          const c      = CURRENCY_PALETTE[cur]
          const active = cur === value
          return (
            <TouchableOpacity
              key={cur}
              style={[cs.item, { width: itemW }]}
              onPress={() => onChange(cur)}
              activeOpacity={0.8}
            >
              <Text style={cs.flag}>{c.flag}</Text>
              <Text style={[cs.code, active && { color: c.text, fontWeight: FONT_WEIGHT.bold }]}>{cur}</Text>
              <Text style={[cs.name, active && { color: c.text }]}>{c.name.split(' ')[0]}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
      <View style={[cs.activeBadge, { borderColor: col.border, backgroundColor: col.bg }]}>
        <Text style={[cs.activeTxt, { color: col.text }]}>
          {col.flag} {col.name} — {value}
        </Text>
      </View>
    </View>
  )
}

const cs = StyleSheet.create({
  wrap: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 3, position: 'relative',
    overflow: 'hidden', gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  pill: {
    position: 'absolute', top: 3, left: 3,
    height: 72, borderRadius: RADIUS.md, borderWidth: 1,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 4,
    zIndex: 0,
  },
  item: { alignItems: 'center', paddingVertical: SPACING.sm, gap: 3, zIndex: 1, minHeight: 78 },
  flag: { fontSize: 22 },
  code: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, fontWeight: FONT_WEIGHT.medium },
  name: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },
  activeBadge: {
    borderRadius: RADIUS.md, borderWidth: 1,
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    alignItems: 'center',
  },
  activeTxt: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
})

// ─── Animated Expiry Picker ───────────────────────

function ExpiryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const items  = EXPIRY_PALETTE
  const idx    = items.findIndex(e => e.value === value)
  const itemW  = (SW - SPACING.lg * 2 - SPACING.sm * (items.length - 1)) / items.length
  const animX  = useRef(new Animated.Value(0)).current
  const col    = items[idx] ?? items[0]
  const scaleAnims = useRef(items.map(() => new Animated.Value(1))).current

  useEffect(() => {
    Animated.spring(animX, {
      toValue: idx * (itemW + SPACING.sm),
      useNativeDriver: true, tension: 70, friction: 9,
    }).start()
    Animated.sequence([
      Animated.timing(scaleAnims[idx], { toValue: 1.12, duration: 120, useNativeDriver: true }),
      Animated.spring(scaleAnims[idx], { toValue: 1, useNativeDriver: true, tension: 120, friction: 6 }),
    ]).start()
  }, [idx])

  return (
    <View>
      <View style={ep.wrap}>
        <Animated.View style={[ep.pill, {
          width: itemW,
          backgroundColor: col.bg,
          borderColor: col.border,
          shadowColor: col.glow,
          transform: [{ translateX: animX }],
        }]} />
        {items.map((opt, i) => {
          const active = opt.value === value
          return (
            <TouchableOpacity
              key={opt.value}
              style={[ep.item, { width: itemW }]}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.8}
            >
              <Animated.View style={{ alignItems: 'center', gap: 4, transform: [{ scale: scaleAnims[i] }] }}>
                <Text style={ep.icon}>{opt.icon}</Text>
                <Text style={[ep.label, active && { color: opt.text, fontWeight: FONT_WEIGHT.bold }]}>
                  {opt.label}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          )
        })}
      </View>
      <View style={[ep.desc, { borderColor: col.border + '50', backgroundColor: col.bg }]}>
        <Text style={[ep.descTxt, { color: col.text }]}>
          {col.value === '0'
            ? '∞ لا ينتهي هذا الرابط أبداً'
            : `⏱ ينتهي بعد ${col.label} من الإنشاء`}
        </Text>
      </View>
    </View>
  )
}

const ep = StyleSheet.create({
  wrap: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 3, position: 'relative', overflow: 'hidden', gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  pill: {
    position: 'absolute', top: 3, left: 3,
    height: 68, borderRadius: RADIUS.md, borderWidth: 1,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 10, elevation: 5,
    zIndex: 0,
  },
  item: { alignItems: 'center', paddingVertical: SPACING.md, zIndex: 1, minHeight: 74 },
  icon:  { fontSize: 22 },
  label: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  desc: {
    borderRadius: RADIUS.md, borderWidth: 1,
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    alignItems: 'center',
  },
  descTxt: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },
})

// ─── Form Types ──────────────────────────────────

interface LinkForm {
  title: string; amount: string; isVariableAmount: boolean
  minAmount: string; maxAmount: string; description: string
  currency: string; expiresInHours: string
  showQrOnLanding: boolean; allowCustomNote: boolean
}

// ─── Main Screen ─────────────────────────────────

export default function CreatePaymentLinkScreen() {
  const router = useRouter()
  const tabBarHeight = useTabBarHeight()
  const [creating, setCreating] = useState(false)
  const [step, setStep]         = useState<0 | 1>(0)

  const [form, setForm] = useState<LinkForm>({
    title: '', amount: '', isVariableAmount: false,
    minAmount: '', maxAmount: '', description: '',
    currency: 'SAR', expiresInHours: '24',
    showQrOnLanding: true, allowCustomNote: false,
  })
  const set = (k: keyof LinkForm, v: any) => setForm(p => ({ ...p, [k]: v }))

  const canNext = form.title.trim().length > 0 &&
    (form.isVariableAmount ? form.minAmount.trim().length > 0 : form.amount.trim().length > 0)

  const handleCreate = async () => {
    setCreating(true)
    try {
      const payload: any = {
        title: form.title.trim(), currency: form.currency,
        description: form.description.trim() || undefined,
        expiresInHours: parseInt(form.expiresInHours) || undefined,
      }
      if (form.isVariableAmount) {
        payload.amount = parseFloat(form.minAmount)
        payload.minAmount = parseFloat(form.minAmount)
        payload.maxAmount = form.maxAmount ? parseFloat(form.maxAmount) : undefined
      } else {
        payload.amount = parseFloat(form.amount)
      }
      await paymentLinksApi.create(payload)
      Alert.alert('✅ تم الإنشاء', 'تم إنشاء رابط الدفع بنجاح', [
        { text: 'عرض الروابط', onPress: () => router.back() },
      ])
    } catch (err: unknown) {
      Alert.alert('خطأ', err instanceof Error ? err.message : 'حدث خطأ غير متوقع')
    } finally { setCreating(false) }
  }

  const col = CURRENCY_PALETTE[form.currency]

  return (
    <SafeAreaView style={s.safe}>
      <InnerHeader title="إنشاء رابط دفع" accentColor={COLORS.primaryLight} />
      <StepBar step={step} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 ? (
          <View style={{ gap: SPACING.lg }}>
            {/* Title */}
            <Field label="عنوان الرابط" required>
              <TextInput
                value={form.title} onChangeText={v => set('title', v)}
                placeholder="مثال: تصميم متجر إلكتروني"
                placeholderTextColor={COLORS.textMuted}
                style={s.input} textAlign={isRTL ? 'right' : 'left'}
              />
            </Field>

            {/* Currency */}
            <Field label="العملة">
              <CurrencySelector value={form.currency} onChange={v => set('currency', v)} />
            </Field>

            {/* Variable toggle */}
            <View style={[s.toggleRow, isRTL && s.rev]}>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>مبلغ متغير</Text>
                <Text style={s.toggleHint}>يختار العميل المبلغ بنفسه</Text>
              </View>
              <Switch
                value={form.isVariableAmount} onValueChange={v => set('isVariableAmount', v)}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>

            {/* Amount */}
            {form.isVariableAmount ? (
              <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: SPACING.md }]}>
                <Field label="الحد الأدنى" style={{ flex: 1 }}>
                  <TextInput value={form.minAmount} onChangeText={v => set('minAmount', v)}
                    placeholder="100" placeholderTextColor={COLORS.textMuted}
                    style={s.input} keyboardType="decimal-pad" textAlign={isRTL ? 'right' : 'left'} />
                </Field>
                <Field label="الأقصى" style={{ flex: 1 }}>
                  <TextInput value={form.maxAmount} onChangeText={v => set('maxAmount', v)}
                    placeholder="∞" placeholderTextColor={COLORS.textMuted}
                    style={s.input} keyboardType="decimal-pad" textAlign={isRTL ? 'right' : 'left'} />
                </Field>
              </View>
            ) : (
              <Field label="المبلغ" required>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: SPACING.sm }}>
                  <TextInput
                    value={form.amount} onChangeText={v => set('amount', v)}
                    placeholder="0.00" placeholderTextColor={COLORS.textMuted}
                    style={[s.input, { flex: 1 }]} keyboardType="decimal-pad"
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                  <View style={[s.currTag, { backgroundColor: col.bg, borderColor: col.border }]}>
                    <Text style={[s.currTagTxt, { color: col.text }]}>{col.flag} {form.currency}</Text>
                  </View>
                </View>
              </Field>
            )}

            {/* Description */}
            <Field label="الوصف (اختياري)">
              <TextInput
                value={form.description} onChangeText={v => set('description', v)}
                placeholder="وصف مختصر للخدمة..."
                placeholderTextColor={COLORS.textMuted}
                style={[s.input, { minHeight: 80, paddingTop: 14 }]}
                multiline numberOfLines={3}
                textAlign={isRTL ? 'right' : 'left'} textAlignVertical="top"
              />
            </Field>
          </View>
        ) : (
          <View style={{ gap: SPACING.lg }}>
            {/* Expiry */}
            <Field label="مدة الصلاحية">
              <ExpiryPicker value={form.expiresInHours} onChange={v => set('expiresInHours', v)} />
            </Field>

            {/* Elite options */}
            <View style={s.eliteBox}>
              <View style={[s.eliteHead, isRTL && s.rev]}>
                <Text style={s.eliteBadge}>✦ Elite</Text>
                <Text style={s.eliteTitle}>خيارات متقدمة</Text>
              </View>
              <ToggleRow label="QR Code في صفحة الدفع" hint="يمكّن العميل من مشاركة الرابط"
                value={form.showQrOnLanding} onChange={v => set('showQrOnLanding', v)} />
              <View style={{ height: 1, backgroundColor: COLORS.border }} />
              <ToggleRow label="ملاحظة من العميل" hint="العميل يكتب ملاحظة مع الدفعة"
                value={form.allowCustomNote} onChange={v => set('allowCustomNote', v)} />
            </View>

            {/* Summary */}
            <View style={s.summaryBox}>
              <Text style={s.summaryTitle}>ملخص الرابط</Text>
              {[
                { label: 'العنوان', value: form.title },
                { label: 'المبلغ', value: form.isVariableAmount ? `${form.minAmount}–${form.maxAmount||'∞'} ${form.currency}` : `${form.amount} ${form.currency}` },
                { label: 'العملة', value: `${col.flag} ${col.name}` },
                { label: 'الصلاحية', value: EXPIRY_PALETTE.find(e=>e.value===form.expiresInHours)?.label ?? '-' },
              ].map(row => (
                <View key={row.label} style={[s.sumRow, isRTL && s.rev]}>
                  <Text style={s.sumLabel}>{row.label}</Text>
                  <Text style={s.sumValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Buttons */}
        <View style={[s.btnRow, isRTL && s.rev]}>
          {step === 1 && (
            <TouchableOpacity style={s.btnBack} onPress={() => setStep(0)} activeOpacity={0.8}>
              <Text style={s.btnBackTxt}>← رجوع</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.btnPrimary, !canNext && step === 0 && s.btnOff]}
            onPress={step === 0 ? () => { if (canNext) setStep(1) } : handleCreate}
            disabled={creating || (step === 0 && !canNext)}
            activeOpacity={0.85}
          >
            {creating
              ? <ActivityIndicator color={COLORS.white} size="small" />
              : <Text style={s.btnPrimaryTxt}>{step === 0 ? 'التالي ←' : '✓ إنشاء الرابط'}</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Helpers ─────────────────────────────────────

function Field({ label, required, children, style }: { label:string; required?:boolean; children:React.ReactNode; style?:any }) {
  return (
    <View style={[{ gap: SPACING.sm }, style]}>
      <Text style={s.fieldLabel}>{label}{required && <Text style={{ color: COLORS.danger }}> *</Text>}</Text>
      {children}
    </View>
  )
}

function ToggleRow({ label, hint, value, onChange }: { label:string; hint:string; value:boolean; onChange:(v:boolean)=>void }) {
  return (
    <View style={[s.toggleRow, isRTL && s.rev, { paddingVertical: SPACING.sm }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.toggleLabel}>{label}</Text>
        <Text style={s.toggleHint}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor={COLORS.white} />
    </View>
  )
}

// ─── Styles ──────────────────────────────────────

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.deepBg },
  scroll:  { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  rev:     { flexDirection: 'row-reverse' },

  fieldLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary, textAlign: isRTL ? 'right' : 'left' },

  input: {
    backgroundColor: COLORS.surfaceBg,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg, paddingVertical: 14,
    color: COLORS.textPrimary, fontSize: FONT_SIZE.base,
  },

  currTag: {
    paddingHorizontal: SPACING.md, borderRadius: RADIUS.md,
    justifyContent: 'center', borderWidth: 1,
  },
  currTagTxt: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },

  toggleRow:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  toggleLabel: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium, color: COLORS.textPrimary },
  toggleHint:  { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },

  eliteBox: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.5)',
    padding: SPACING.lg, gap: SPACING.md,
    shadowColor: 'rgba(139,92,246,0.4)',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 5,
  },
  eliteHead:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  eliteBadge: { backgroundColor: 'rgba(139,92,246,0.2)', color: '#C4B5FD', fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full, overflow: 'hidden' },
  eliteTitle: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },

  summaryBox: {
    backgroundColor: COLORS.surfaceBg,
    borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  summaryTitle: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sumLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  sumValue: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.medium },

  btnRow:      { flexDirection: isRTL ? 'row-reverse' : 'row', gap: SPACING.md, marginTop: SPACING.xl },
  btnBack:     { flex: 1, paddingVertical: 14, borderRadius: RADIUS.lg, alignItems: 'center', backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border },
  btnBackTxt:  { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary },
  btnPrimary:  { flex: 2, paddingVertical: 14, borderRadius: RADIUS.lg, alignItems: 'center', backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 7 },
  btnPrimaryTxt: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.white },
  btnOff:      { backgroundColor: COLORS.border, shadowOpacity: 0 },
})