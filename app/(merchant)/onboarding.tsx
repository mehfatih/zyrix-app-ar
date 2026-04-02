import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  I18nManager, SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { merchantApi } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'

const isRTL = I18nManager.isRTL

export default function OnboardingScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { completeOnboarding } = useAuth()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    company: '',
    taxId: '',
    iban: '',
    name: '',
    email: '',
  })

  const steps = [
    { key: 'step1_title', fields: ['company', 'name', 'email'] },
    { key: 'step2_title', fields: ['iban', 'taxId'] },
    { key: 'step3_title', fields: [] },
  ]

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      await merchantApi.updateProfile({
        name: form.name || undefined,
        email: form.email || undefined,
        company: form.company || undefined,
      })
      router.replace('/(merchant)/dashboard')
    } catch (err: unknown) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : '')
    }
    setLoading(false)
  }

  const handleSkip = () => {
    router.replace('/(merchant)/dashboard')
  }

  const updateField = (key: string, value: string) => {
    setForm((prev: any) => ({ ...prev, [key]: value }))
  }

  const renderField = (key: string) => {
    const labels: Record<string, string> = {
      company: t('onboarding.company_name'),
      name: t('profile.first_name'),
      email: t('profile.email'),
      iban: t('onboarding.iban'),
      taxId: t('onboarding.tax_id'),
    }
    return (
      <View key={key} style={styles.fieldWrap}>
        <Text style={[styles.fieldLabel, isRTL && styles.rtl]}>{labels[key] || key}</Text>
        <TextInput
          style={[styles.input, isRTL && styles.inputRTL]}
          value={form[key as keyof typeof form]}
          onChangeText={(v: string) => updateField(key, v)}
          placeholderTextColor={COLORS.textMuted}
          placeholder={labels[key]}
          keyboardType={key === 'email' ? 'email-address' : 'default'}
          autoCapitalize={key === 'email' ? 'none' : 'words'}
        />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Progress */}
        <View style={styles.progressWrap}>
          {steps.map((_, i) => (
            <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
          ))}
        </View>

        {/* Header */}
        <Text style={[styles.welcomeText, isRTL && styles.rtl]}>
          {step === 0 ? t('onboarding.welcome') : t(`onboarding.${steps[step]?.key}`)}
        </Text>
        <Text style={[styles.stepTitle, isRTL && styles.rtl]}>
          {t(`onboarding.${steps[step]?.key}`)}
        </Text>

        {/* Fields */}
        <View style={styles.fieldsWrap}>
          {steps[step]?.fields.map(renderField)}
          {step === steps.length - 1 && (
            <View style={styles.summaryWrap}>
              <Text style={[styles.summaryTitle, isRTL && styles.rtl]}>
                {t('onboarding.welcome')}
              </Text>
              {form.company ? <Text style={styles.summaryItem}>{form.company}</Text> : null}
              {form.name ? <Text style={styles.summaryItem}>{form.name}</Text> : null}
              {form.email ? <Text style={styles.summaryItem}>{form.email}</Text> : null}
              {form.iban ? <Text style={styles.summaryItem}>IBAN: {form.iban}</Text> : null}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={[styles.actions, isRTL && styles.actionsRTL]}>
          {step > 0 ? (
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Text style={styles.backBtnText}>{t('onboarding.back')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.backBtn} onPress={handleSkip}>
              <Text style={styles.backBtnText}>{t('onboarding.skip')}</Text>
            </TouchableOpacity>
          )}

          {step < steps.length - 1 ? (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>{t('onboarding.next')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.nextBtn} onPress={handleFinish} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.nextBtnText}>{t('onboarding.finish')}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.deepBg },
  scroll: { padding: 24, paddingTop: 40 },
  progressWrap: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.border },
  progressDotActive: { backgroundColor: COLORS.primary, width: 28 },
  welcomeText: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  stepTitle: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 32 },
  rtl: { textAlign: 'right' },
  fieldsWrap: { gap: 16, marginBottom: 40 },
  fieldWrap: {},
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  input: { backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: COLORS.textPrimary, fontSize: 16 },
  inputRTL: { textAlign: 'right' },
  summaryWrap: { backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  summaryItem: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 6 },
  actions: { flexDirection: 'row', gap: 12 },
  actionsRTL: { flexDirection: 'row-reverse' },
  backBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.surfaceBg },
  backBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
  nextBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.primary },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
})
