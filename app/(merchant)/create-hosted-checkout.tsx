/**
 * Zyrix App — Create Hosted Checkout Screen
 * 📁 app/(merchant)/create-hosted-checkout.tsx
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  I18nManager, SafeAreaView, ActivityIndicator, Alert, Switch,
  Animated,
} from 'react-native'
import { useRouter } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme'
import { InnerHeader } from '../../components/InnerHeader'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'

const isRTL = I18nManager.isRTL

// ─── Palettes ─────────────────────────────────────────────────

const BRAND_COLORS = [
  { value: '#1A56DB', label: 'أزرق',   bg: 'rgba(26,86,219,0.15)'   },
  { value: '#059669', label: 'أخضر',   bg: 'rgba(5,150,105,0.15)'   },
  { value: '#7C3AED', label: 'بنفسجي', bg: 'rgba(124,58,237,0.15)'  },
  { value: '#D97706', label: 'ذهبي',   bg: 'rgba(217,119,6,0.15)'   },
  { value: '#DC2626', label: 'أحمر',   bg: 'rgba(220,38,38,0.15)'   },
  { value: '#0891B2', label: 'سماوي',  bg: 'rgba(8,145,178,0.15)'   },
]

const CURRENCIES = [
  { value: 'SAR', flag: '🇸🇦', label: 'ريال سعودي' },
  { value: 'AED', flag: '🇦🇪', label: 'درهم'       },
  { value: 'KWD', flag: '🇰🇼', label: 'دينار'      },
  { value: 'QAR', flag: '🇶🇦', label: 'ريال قطري'  },
  { value: 'USD', flag: '🇺🇸', label: 'دولار'      },
]

const STEP_COLORS = ['#7C3AED', '#059669', '#1A56DB']

// ─── Step Bar ─────────────────────────────────────────────────

function StepBar({ step }: { step: number }) {
  const prog = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.spring(prog, {
      toValue: step,
      useNativeDriver: false,
      tension: 60, friction: 8,
    }).start()
  }, [step])

  const lineWidth = prog.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['0%', '50%', '100%'],
  })

  const steps = ['الأساسيات', 'التصميم', 'الإعدادات']

  return (
    <View style={sb.wrap}>
      <View style={sb.track}>
        <Animated.View style={[sb.fill, { width: lineWidth }]} />
      </View>
      {steps.map((label, i) => (
        <View key={i} style={[sb.dotWrap, { left: i === 0 ? 0 : i === 1 ? '50%' : '100%', transform: [{ translateX: i === 0 ? 0 : i === 1 ? -17 : -34 }] }]}>
          <View style={[sb.dot, {
            backgroundColor: step >= i ? STEP_COLORS[i] : COLORS.surfaceBg,
            borderColor: step >= i ? STEP_COLORS[i] : COLORS.border,
          }]}>
            <Text style={[sb.dotNum, { color: step >= i ? COLORS.white : COLORS.textMuted }]}>
              {step > i ? '✓' : String(i + 1)}
            </Text>
          </View>
          <Text style={[sb.dotLabel, { color: step >= i ? STEP_COLORS[i] : COLORS.textMuted }]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  )
}

const sb = StyleSheet.create({
  wrap:     { paddingHorizontal: 40, paddingVertical: SPACING.lg, position: 'relative', alignItems: 'center' },
  track:    { height: 3, backgroundColor: COLORS.border, borderRadius: 2, width: '100%' },
  fill:     { height: '100%', backgroundColor: STEP_COLORS[0], borderRadius: 2 },
  dotWrap:  { position: 'absolute', top: SPACING.lg - 2, alignItems: 'center', gap: 4 },
  dot:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  dotNum:   { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  dotLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, marginTop: 38 },
})

// ─── Field Helper ─────────────────────────────────────────────

function Field({ label, required, children, style }: {
  label: string; required?: boolean; children: React.ReactNode; style?: any
}) {
  return (
    <View style={[{ gap: SPACING.sm }, style]}>
      <Text style={s.fieldLabel}>
        {label}{required && <Text style={{ color: COLORS.danger }}> *</Text>}
      </Text>
      {children}
    </View>
  )
}

function ToggleRow({ label, hint, value, onChange }: {
  label: string; hint: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <View style={[s.toggleRow, isRTL && s.rev, { paddingVertical: SPACING.sm }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.toggleLabel}>{label}</Text>
        <Text style={s.toggleHint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: COLORS.border, true: COLORS.primary }}
        thumbColor={COLORS.white}
      />
    </View>
  )
}

// ─── Form Interface ───────────────────────────────────────────

interface CheckoutForm {
  name: string
  description: string
  currency: string
  brandColor: string
  theme: 'DARK' | 'LIGHT'
  requirePhone: boolean
  requireAddress: boolean
  allowNote: boolean
  successUrl: string
  cancelUrl: string
}

// ─── Main Screen ──────────────────────────────────────────────

export default function CreateHostedCheckoutScreen() {
  const router = useRouter()
  const tabBarHeight = useTabBarHeight()
  const [creating, setCreating] = useState(false)
  const [step, setStep] = useState(0)

  const [form, setForm] = useState<CheckoutForm>({
    name: '', description: '', currency: 'SAR',
    brandColor: '#1A56DB', theme: 'DARK',
    requirePhone: false, requireAddress: false, allowNote: false,
    successUrl: '', cancelUrl: '',
  })

  const set = (k: keyof CheckoutForm, v: any) =>
    setForm(p => ({ ...p, [k]: v }))

  const canNext0 = form.name.trim().length > 0
  const canNext1 = true

  const handleCreate = async () => {
    setCreating(true)
    try {
      // TODO: replace with hostedCheckoutApi.create(form)
      await new Promise(r => setTimeout(r, 1000))
      Alert.alert('✅ تم الإنشاء', 'تم إنشاء صفحة الدفع بنجاح', [
        { text: 'عرض الصفحات', onPress: () => router.back() },
      ])
    } catch (err: unknown) {
      Alert.alert('خطأ', err instanceof Error ? err.message : 'حدث خطأ غير متوقع')
    } finally {
      setCreating(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <InnerHeader title="إنشاء Hosted Checkout" accentColor="#7C3AED" />
      <StepBar step={step} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Step 0: الأساسيات ── */}
        {step === 0 && (
          <View style={{ gap: SPACING.lg }}>
            <Field label="اسم صفحة الدفع" required>
              <TextInput
                value={form.name}
                onChangeText={v => set('name', v)}
                placeholder="مثال: متجر الإلكترونيات"
                placeholderTextColor={COLORS.textMuted}
                style={s.input}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </Field>

            <Field label="الوصف (اختياري)">
              <TextInput
                value={form.description}
                onChangeText={v => set('description', v)}
                placeholder="وصف مختصر لصفحة الدفع..."
                placeholderTextColor={COLORS.textMuted}
                style={[s.input, { minHeight: 80, paddingTop: 14 }]}
                multiline
                numberOfLines={3}
                textAlign={isRTL ? 'right' : 'left'}
                textAlignVertical="top"
              />
            </Field>

            <Field label="العملة الافتراضية">
              <View style={[s.currencyGrid, isRTL && s.rev]}>
                {CURRENCIES.map(c => (
                  <TouchableOpacity
                    key={c.value}
                    style={[s.currencyBtn, form.currency === c.value && {
                      borderColor: form.brandColor,
                      backgroundColor: form.brandColor + '20',
                    }]}
                    onPress={() => set('currency', c.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.currencyFlag}>{c.flag}</Text>
                    <Text style={[s.currencyCode, form.currency === c.value && { color: form.brandColor, fontWeight: FONT_WEIGHT.bold }]}>
                      {c.value}
                    </Text>
                    <Text style={s.currencyLabel}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>
          </View>
        )}

        {/* ── Step 1: التصميم ── */}
        {step === 1 && (
          <View style={{ gap: SPACING.lg }}>
            <Field label="لون العلامة التجارية">
              <View style={[s.colorGrid, isRTL && s.rev]}>
                {BRAND_COLORS.map(c => (
                  <TouchableOpacity
                    key={c.value}
                    style={[s.colorBtn, { backgroundColor: c.bg, borderColor: c.value },
                      form.brandColor === c.value && { borderWidth: 3 }
                    ]}
                    onPress={() => set('brandColor', c.value)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.colorCircle, { backgroundColor: c.value }]} />
                    <Text style={[s.colorLabel, { color: c.value }]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>

            <Field label="المظهر">
              <View style={[s.themeRow, isRTL && s.rev]}>
                {(['DARK', 'LIGHT'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.themeBtn, form.theme === t && {
                      borderColor: form.brandColor,
                      backgroundColor: form.brandColor + '15',
                    }]}
                    onPress={() => set('theme', t)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.themeIcon}>{t === 'DARK' ? '🌙' : '☀️'}</Text>
                    <Text style={[s.themeLabel, form.theme === t && { color: form.brandColor }]}>
                      {t === 'DARK' ? 'داكن' : 'فاتح'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>

            {/* Preview */}
            <View style={[s.previewCard, { borderColor: form.brandColor + '50' }]}>
              <View style={[s.previewHeader, { backgroundColor: form.brandColor }]}>
                <Text style={s.previewHeaderText}>معاينة صفحة الدفع</Text>
              </View>
              <View style={[s.previewBody, { backgroundColor: form.theme === 'DARK' ? '#0A1628' : '#F8FAFC' }]}>
                <View style={[s.previewCircle, { backgroundColor: form.brandColor }]}>
                  <Text style={{ fontSize: 20 }}>💳</Text>
                </View>
                <Text style={[s.previewName, { color: form.theme === 'DARK' ? COLORS.white : '#0F172A' }]}>
                  {form.name || 'اسم صفحة الدفع'}
                </Text>
                <View style={[s.previewBtn, { backgroundColor: form.brandColor }]}>
                  <Text style={s.previewBtnText}>ادفع الآن</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Step 2: الإعدادات ── */}
        {step === 2 && (
          <View style={{ gap: SPACING.lg }}>
            <View style={s.settingsBox}>
              <Text style={s.settingsTitle}>بيانات العميل</Text>
              <ToggleRow
                label="رقم الهاتف إلزامي"
                hint="يُطلب من العميل إدخال رقم هاتفه"
                value={form.requirePhone}
                onChange={v => set('requirePhone', v)}
              />
              <View style={{ height: 1, backgroundColor: COLORS.border }} />
              <ToggleRow
                label="العنوان إلزامي"
                hint="يُطلب من العميل إدخال عنوانه"
                value={form.requireAddress}
                onChange={v => set('requireAddress', v)}
              />
              <View style={{ height: 1, backgroundColor: COLORS.border }} />
              <ToggleRow
                label="ملاحظة من العميل"
                hint="يمكن للعميل إضافة ملاحظة مع الدفع"
                value={form.allowNote}
                onChange={v => set('allowNote', v)}
              />
            </View>

            <Field label="رابط النجاح (اختياري)">
              <TextInput
                value={form.successUrl}
                onChangeText={v => set('successUrl', v)}
                placeholder="https://yoursite.com/success"
                placeholderTextColor={COLORS.textMuted}
                style={s.input}
                textAlign={isRTL ? 'right' : 'left'}
                autoCapitalize="none"
                keyboardType="url"
              />
            </Field>

            <Field label="رابط الإلغاء (اختياري)">
              <TextInput
                value={form.cancelUrl}
                onChangeText={v => set('cancelUrl', v)}
                placeholder="https://yoursite.com/cancel"
                placeholderTextColor={COLORS.textMuted}
                style={s.input}
                textAlign={isRTL ? 'right' : 'left'}
                autoCapitalize="none"
                keyboardType="url"
              />
            </Field>

            {/* Summary */}
            <View style={s.summaryBox}>
              <Text style={s.summaryTitle}>ملخص</Text>
              {[
                { label: 'الاسم',    value: form.name        || '-' },
                { label: 'العملة',   value: form.currency            },
                { label: 'المظهر',   value: form.theme === 'DARK' ? '🌙 داكن' : '☀️ فاتح' },
                { label: 'الهاتف',   value: form.requirePhone   ? '✅ إلزامي' : '— اختياري' },
                { label: 'العنوان',  value: form.requireAddress ? '✅ إلزامي' : '— اختياري' },
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
          {step > 0 && (
            <TouchableOpacity style={s.btnBack} onPress={() => setStep(s => s - 1)} activeOpacity={0.8}>
              <Text style={s.btnBackTxt}>← رجوع</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.btnPrimary,
              step === 0 && !canNext0 && s.btnOff,
              { backgroundColor: STEP_COLORS[step] },
            ]}
            onPress={step < 2 ? () => setStep(s => s + 1) : handleCreate}
            disabled={creating || (step === 0 && !canNext0)}
            activeOpacity={0.85}
          >
            {creating
              ? <ActivityIndicator color={COLORS.white} size="small" />
              : <Text style={s.btnPrimaryTxt}>
                  {step < 2 ? 'التالي ←' : '✓ إنشاء صفحة الدفع'}
                </Text>
            }
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.deepBg },
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  rev:    { flexDirection: 'row-reverse' },

  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    textAlign: isRTL ? 'right' : 'left',
  },

  input: {
    backgroundColor: COLORS.surfaceBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.base,
  },

  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  currencyBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceBg,
    gap: 3,
    minWidth: 70,
  },
  currencyFlag:  { fontSize: 22 },
  currencyCode:  { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, fontWeight: FONT_WEIGHT.medium },
  currencyLabel: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },

  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  colorBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    gap: 6,
    minWidth: 80,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },

  themeRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  themeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceBg,
    gap: SPACING.sm,
  },
  themeIcon:  { fontSize: 28 },
  themeLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textMuted },

  previewCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  previewHeader: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  previewHeaderText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    letterSpacing: 1,
  },
  previewBody: {
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  previewCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
  },
  previewBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.sm,
  },
  previewBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },

  settingsBox: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  settingsTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },

  toggleRow:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  toggleLabel: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium, color: COLORS.textPrimary },
  toggleHint:  { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },

  summaryBox: {
    backgroundColor: COLORS.surfaceBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  sumRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  sumLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  sumValue: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.medium },

  btnRow:      { flexDirection: isRTL ? 'row-reverse' : 'row', gap: SPACING.md, marginTop: SPACING.xl },
  btnBack:     { flex: 1, paddingVertical: 14, borderRadius: RADIUS.lg, alignItems: 'center', backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border },
  btnBackTxt:  { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary },
  btnPrimary:  { flex: 2, paddingVertical: 14, borderRadius: RADIUS.lg, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 7 },
  btnPrimaryTxt: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.white },
  btnOff:      { backgroundColor: COLORS.border, shadowOpacity: 0 },
})