// app/(merchant)/profile.tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  I18nManager,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { merchantApi } from '../../services/api'

const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  firstName:   string
  lastName:    string
  email:       string
  phone:       string
  company:     string
  merchantId:  string
  country:     string
  timezone:    string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_PROFILE: ProfileData = {
  firstName:   'Ahmet',
  lastName:    'Kaya',
  email:       'ahmet.kaya@zyrix.co',
  phone:       '+90 545 221 0888',
  company:     'Zyrix Global Teknoloji A.Ş.',
  merchantId:  'ZRX-10042',
  country:     'Türkiye',
  timezone:    'Europe/Istanbul (UTC+3)',
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials =
    (firstName[0] ?? '').toUpperCase() + (lastName[0] ?? '').toUpperCase()
  return (
    <View style={avatar.container}>
      <Text style={avatar.initials}>{initials}</Text>
      <TouchableOpacity style={avatar.editBadge} activeOpacity={0.75}>
        <Text style={avatar.editIcon}>✎</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  editable = true,
  keyboardType = 'default',
  autoCapitalize = 'words',
}: {
  label: string
  value: string
  onChangeText?: (v: string) => void
  editable?: boolean
  keyboardType?: 'default' | 'email-address' | 'phone-pad'
  autoCapitalize?: 'none' | 'words' | 'sentences'
}) {
  return (
    <View style={field.wrapper}>
      <Text style={[field.label, isRTL && field.labelRTL]}>{label}</Text>
      <TextInput
        style={[
          field.input,
          isRTL && field.inputRTL,
          !editable && field.inputDisabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={COLORS.textMuted}
        textAlign={isRTL ? 'right' : 'left'}
      />
    </View>
  )
}

// ─── Read-only info row ───────────────────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={[info.row, isRTL && info.rowRTL]}>
      <Text style={info.label}>{label}</Text>
      <Text style={[info.value, mono && info.valueMono]}>{value}</Text>
    </View>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={[section.title, isRTL && section.titleRTL]}>{title}</Text>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { t } = useTranslation()

  const [profile, setProfile] = useState<ProfileData>(INITIAL_PROFILE)
  const [editing, setEditing]   = useState(false)
  const [draft,   setDraft]     = useState<ProfileData>(INITIAL_PROFILE)
  const [saving,  setSaving]    = useState(false)
  const [loading, setLoading]   = useState(true)

  const fetchProfile = async () => {
    try {
      const data = await merchantApi.getProfile()
      const mapped: ProfileData = {
        firstName: data.name?.split(' ')[0] || '',
        lastName: data.name?.split(' ').slice(1).join(' ') || '',
        email: data.email || '',
        phone: data.phone || '',
        company: data.company || '',
        merchantId: data.merchantId || '',
        country: 'Türkiye',
        timezone: 'Europe/Istanbul (UTC+3)',
      }
      setProfile(mapped)
      setDraft(mapped)
    } catch (err) { console.warn(err) }
    finally { setLoading(false) }
  }

  React.useEffect(() => { fetchProfile() }, [])

  const set = (key: keyof ProfileData) => (val: string) =>
    setDraft((prev: any) => ({ ...prev, [key]: val }))

  const handleEdit = () => {
    setDraft(profile)
    setEditing(true)
  }

  const handleCancel = () => {
    setEditing(false)
    setDraft(profile)
  }

  const handleSave = () => {
    // Basic validation
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      Alert.alert('✗', t('profile.validation_name'))
      return
    }
    if (!draft.email.includes('@')) {
      Alert.alert('✗', t('profile.validation_email'))
      return
    }

    setSaving(true)
    // Simulate API call
    setTimeout(() => {
      setProfile(draft)
      setEditing(false)
      setSaving(false)
      Alert.alert('✓', t('profile.updated'))
    }, 800)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Page header ── */}
          <View style={styles.pageHeader}>
            <View style={[styles.headerRow, isRTL && styles.headerRowRTL]}>
              <Text style={[styles.pageTitle, isRTL && styles.textRight]}>
                {t('profile.title')}
              </Text>
              {!editing ? (
                <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
                  <Text style={styles.editBtnText}>✎  {t('profile.edit')}</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.editActions, isRTL && styles.editActionsRTL]}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                    <Text style={styles.cancelBtnText}>{t('profile.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    <Text style={styles.saveBtnText}>
                      {saving ? '...' : t('profile.save')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={styles.body}>

            {/* ── Avatar ── */}
            <View style={styles.avatarSection}>
              <Avatar firstName={profile.firstName} lastName={profile.lastName} />
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={styles.fullName}>
                  {profile.firstName} {profile.lastName}
                </Text>
                <View style={styles.merchantPill}>
                  <Text style={styles.merchantPillText}>{profile.merchantId}</Text>
                </View>
              </View>
            </View>

            {/* ── Personal info — editable ── */}
            <SectionHeader title={t('profile.personal_info')} />
            <View style={styles.card}>
              <Field
                label={t('profile.first_name')}
                value={editing ? draft.firstName : profile.firstName}
                onChangeText={set('firstName')}
                editable={editing}
              />
              <View style={styles.fieldDivider} />
              <Field
                label={t('profile.last_name')}
                value={editing ? draft.lastName : profile.lastName}
                onChangeText={set('lastName')}
                editable={editing}
              />
              <View style={styles.fieldDivider} />
              <Field
                label={t('profile.email')}
                value={editing ? draft.email : profile.email}
                onChangeText={set('email')}
                editable={editing}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.fieldDivider} />
              <Field
                label={t('profile.phone')}
                value={editing ? draft.phone : profile.phone}
                onChangeText={set('phone')}
                editable={editing}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
            </View>

            {/* ── Merchant info — read-only ── */}
            <SectionHeader title={t('profile.merchant_info')} />
            <View style={styles.infoCard}>
              <InfoRow label={t('profile.merchantId')} value={profile.merchantId} mono />
              <View style={styles.fieldDivider} />
              <InfoRow label={t('profile.company_label')}      value={profile.company} />
              <View style={styles.fieldDivider} />
              <InfoRow label={t('profile.country')}        value={profile.country} />
              <View style={styles.fieldDivider} />
              <InfoRow label={t('settings.language')} value={profile.timezone} />
            </View>

            {/* ── Danger zone ── */}
            <SectionHeader title={t('profile.account')} />
            <View style={styles.dangerCard}>
              <TouchableOpacity
                style={[styles.dangerRow, isRTL && styles.dangerRowRTL]}
                onPress={() => Alert.alert(t('profile.close_account'), t('common.coming_soon'))}
                activeOpacity={0.7}
              >
                <Text style={styles.dangerIcon}>⚠</Text>
                <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={styles.dangerLabel}>{t('profile.close_account')}</Text>
                  <Text style={styles.dangerSublabel}>
                    {t('profile.close_account_sub')}
                  </Text>
                </View>
                <Text style={[styles.dangerChevron, isRTL && { transform: [{ scaleX: -1 }] }]}>
                  ›
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
  },
  scrollContent: {
    paddingBottom: 48,
  },

  // Header
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.darkBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRowRTL: {
    flexDirection: 'row-reverse',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  textRight: {
    textAlign: 'right',
  },

  // Edit / save buttons
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editActionsRTL: {
    flexDirection: 'row-reverse',
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBg,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  saveBtnDisabled: {
    opacity: 0.55,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Body
  body: {
    padding: 16,
  },

  // Avatar section
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  fullName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  merchantPill: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  merchantPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: 'monospace',
  },

  // Cards
  card: {
    backgroundColor: COLORS.cardBgLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 4,
  },
  infoCard: {
    backgroundColor: COLORS.cardBgLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  // Danger zone
  dangerCard: {
    backgroundColor: COLORS.cardBgLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.dangerBg,
    overflow: 'hidden',
    marginBottom: 4,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  dangerRowRTL: {
    flexDirection: 'row-reverse',
  },
  dangerIcon: {
    fontSize: 20,
  },
  dangerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.danger,
    marginBottom: 2,
  },
  dangerSublabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  dangerChevron: {
    fontSize: 20,
    color: COLORS.danger,
    fontWeight: '300',
  },
})

const avatar = StyleSheet.create({
  container: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  initials: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    lineHeight: 80,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.cardBgLight,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
})

const field = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  labelRTL: {
    textAlign: 'right',
  },
  input: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
    paddingVertical: 0,
  },
  inputRTL: {
    textAlign: 'right',
  },
  inputDisabled: {
    color: COLORS.textSecondary,
  },
})

const info = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  valueMono: {
    fontFamily: 'monospace',
    color: COLORS.primary,
  },
})

const section = StyleSheet.create({
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  titleRTL: {
    textAlign: 'right',
    marginLeft: 0,
    marginRight: 4,
  },
})
