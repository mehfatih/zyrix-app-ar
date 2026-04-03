// app/(merchant)/settings.tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  I18nManager,
  SafeAreaView,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { useAuth } from '../../hooks/useAuth'
import { merchantApi } from '../../services/api'

const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────────────────────────────────

type Language = 'ar' | 'en'

interface ToggleState {
  pushNotifications: boolean
  emailReports:      boolean
  smsAlerts:         boolean
  twoFactor:         boolean
  biometric:         boolean
  autoLogout:        boolean
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={[sectionHeader.text, isRTL && sectionHeader.textRTL]}>
      {title}
    </Text>
  )
}

function SettingRow({
  icon,
  label,
  sublabel,
  onPress,
  rightElement,
  destructive,
  showChevron = true,
}: {
  icon: string
  label: string
  sublabel?: string
  onPress?: () => void
  rightElement?: React.ReactNode
  destructive?: boolean
  showChevron?: boolean
}) {
  return (
    <TouchableOpacity
      style={[row.container, isRTL && row.containerRTL]}
      onPress={onPress}
      activeOpacity={onPress ? 0.65 : 1}
    >
      {/* Icon bubble */}
      <View style={[row.iconBubble, destructive && row.iconBubbleDestructive]}>
        <Text style={row.icon}>{icon}</Text>
      </View>

      {/* Labels */}
      <View style={[row.labels, isRTL && row.labelsRTL]}>
        <Text style={[row.label, destructive && row.labelDestructive]}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={row.sublabel}>{sublabel}</Text>
        ) : null}
      </View>

      {/* Right element or chevron */}
      <View style={[row.right, isRTL && row.rightRTL]}>
        {rightElement ?? (
          showChevron && (
            <Text style={[row.chevron, isRTL && row.chevronRTL]}>›</Text>
          )
        )}
      </View>
    </TouchableOpacity>
  )
}

function Divider() {
  return <View style={dividerStyle.line} />
}

function SettingsGroup({ children }: { children: React.ReactNode }) {
  return <View style={group.container}>{children}</View>
}

// ─── Language picker ──────────────────────────────────────────────────────────

function LanguagePicker({
  current,
  onChange,
}: {
  current: Language
  onChange: (lang: Language) => void
}) {
  return (
    <View style={[langPicker.row, isRTL && langPicker.rowRTL]}>
      <TouchableOpacity
        style={[langPicker.btn, current === 'ar' && langPicker.btnActive]}
        onPress={() => onChange('ar')}
      >
        <Text style={[langPicker.label, current === 'ar' && langPicker.labelActive]}>
          🇸🇦 العربية
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[langPicker.btn, current === 'en' && langPicker.btnActive]}
        onPress={() => onChange('en')}
      >
        <Text style={[langPicker.label, current === 'en' && langPicker.labelActive]}>
          🇬🇧 EN
        </Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { signOut } = useAuth()

  const [language, setLanguage] = useState<Language>('ar')
  const [darkMode, setDarkMode] = useState(true)
  const [toggles, setToggles] = useState<ToggleState>({
    pushNotifications: true,
    emailReports:      true,
    smsAlerts:         false,
    twoFactor:         true,
    biometric:         false,
    autoLogout:        true,
  })

  const setToggle = (key: keyof ToggleState) => (val: boolean) =>
    setToggles((prev) => ({ ...prev, [key]: val }))

  const handleLanguageChange = async (lang: Language) => {
    setLanguage(lang)
    try {
      await merchantApi.updateProfile({ language: lang })
    } catch (err) {
      console.warn('Failed to update language:', err)
    }
    Alert.alert(
      t('settings.language'),
      t('common.coming_soon'),
    )
  }

  const handleLogout = () => {
    Alert.alert(
      t('settings.logout'),
      t('settings.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logout'),
          style: 'destructive',
          onPress: async () => {
            await signOut()
            router.replace('/(auth)/login')
          },
        },
      ],
    )
  }

  const handleChangePassword = () =>
    router.push('/(merchant)/change-password')

  const handleApiKeys = () =>
    Alert.alert(t('settings.apiKeys'), t('common.coming_soon'))

  const handleWebhooks = () =>
    Alert.alert(t('settings.webhooks'), t('common.coming_soon'))

  const handleSupport = () =>
    Alert.alert('Support', 'info@zyrix.co · +90 545 221 0888')

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Page header — compact with logo */}
        <View style={styles.pageHeader}>
          <View style={[styles.headerRow, isRTL && styles.headerRowRTL]}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>Z</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.pageTitle, isRTL && styles.textRight]}>
                {t('settings.title')}
              </Text>
              <Text style={[styles.merchantId, isRTL && styles.textRight]}>
                ZRX-10042 · Zyrix Global Technology
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>

          {/* ── Language (compact toggle) ── */}
          <SectionHeader title={t('settings.language')} />
          <SettingsGroup>
            <View style={styles.langPickerWrapper}>
              <LanguagePicker
                current={language}
                onChange={handleLanguageChange}
              />
            </View>
          </SettingsGroup>

          {/* ── Appearance ── */}
          <SectionHeader title="🎨" />
          <SettingsGroup>
            <SettingRow
              icon="🌙"
              label={darkMode ? 'Dark Mode' : 'Light Mode'}
              sublabel={t('common.coming_soon')}
              showChevron={false}
              rightElement={
                <Switch
                  value={darkMode}
                  onValueChange={(val) => {
                    setDarkMode(val)
                    Alert.alert('Theme', t('common.coming_soon'))
                  }}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              }
            />
          </SettingsGroup>

          {/* ── Notifications ── */}
          <SectionHeader title={t('settings.notifications')} />
          <SettingsGroup>
            <SettingRow
              icon="🔔"
              label={t('settings.notifications')}
              sublabel={t('notifications.payment')}
              showChevron={false}
              rightElement={
                <Switch
                  value={toggles.pushNotifications}
                  onValueChange={setToggle('pushNotifications')}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              }
            />
            <Divider />
            <SettingRow
              icon="📧"
              label={t('settings.email_reports')}
              sublabel={t('settings.email_reports_sub')}
              showChevron={false}
              rightElement={
                <Switch
                  value={toggles.emailReports}
                  onValueChange={setToggle('emailReports')}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              }
            />
            <Divider />
            <SettingRow
              icon="💬"
              label={t('settings.sms_alerts')}
              sublabel={t('settings.sms_alerts_sub')}
              showChevron={false}
              rightElement={
                <Switch
                  value={toggles.smsAlerts}
                  onValueChange={setToggle('smsAlerts')}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              }
            />
          </SettingsGroup>

          {/* ── Security ── */}
          <SectionHeader title={t('settings.security')} />
          <SettingsGroup>
            <SettingRow
              icon="🔐"
              label={t('settings.twoFactor')}
              sublabel={toggles.twoFactor ? t('settings.twoFactor_active') : t('settings.twoFactor_inactive')}
              showChevron={false}
              rightElement={
                <Switch
                  value={toggles.twoFactor}
                  onValueChange={setToggle('twoFactor')}
                  trackColor={{ false: COLORS.border, true: COLORS.success }}
                  thumbColor={COLORS.white}
                />
              }
            />
            <Divider />
            <SettingRow
              icon="🛡️"
              label={t('settings.manage_2fa')}
              sublabel={t('settings.manage_2fa_sub')}
              onPress={() => router.push('/(merchant)/2fa-setup')}
            />
            <Divider />
            <SettingRow
              icon="👆"
              label={t('settings.biometric')}
              sublabel={t('settings.security')}
              showChevron={false}
              rightElement={
                <Switch
                  value={toggles.biometric}
                  onValueChange={setToggle('biometric')}
                  trackColor={{ false: COLORS.border, true: COLORS.success }}
                  thumbColor={COLORS.white}
                />
              }
            />
            <Divider />
            <SettingRow
              icon="⏱"
              label={t('settings.auto_logout')}
              sublabel={t('settings.auto_logout_sub')}
              showChevron={false}
              rightElement={
                <Switch
                  value={toggles.autoLogout}
                  onValueChange={setToggle('autoLogout')}
                  trackColor={{ false: COLORS.border, true: COLORS.success }}
                  thumbColor={COLORS.white}
                />
              }
            />
            <Divider />
            <SettingRow
              icon="🔑"
              label={t('settings.change_password')}
              onPress={handleChangePassword}
            />
          </SettingsGroup>

          {/* ── Developer / Integration ── */}
          <SectionHeader title={t('settings.integration')} />
          <SettingsGroup>
            <SettingRow
              icon="⚙️"
              label={t('settings.apiKeys')}
              sublabel={t('settings.apiKeys')}
              onPress={handleApiKeys}
            />
            <Divider />
            <SettingRow
              icon="🔗"
              label={t('settings.webhooks')}
              sublabel={t('notifications.title')}
              onPress={handleWebhooks}
            />
          </SettingsGroup>

          {/* ── About / Support ── */}
          <SectionHeader title={t('settings.support')} />
          <SettingsGroup>
            <SettingRow
              icon="💬"
              label={t('common.coming_soon')}
              sublabel="info@zyrix.co"
              onPress={handleSupport}
            />
            <Divider />
            <SettingRow
              icon="📋"
              label={t('settings.version_label')}
              sublabel="1.0.0 (build 42)"
              showChevron={false}
            />
          </SettingsGroup>

          {/* ── Logout ── */}
          <SettingsGroup>
            <SettingRow
              icon="🚪"
              label={t('settings.logout')}
              onPress={handleLogout}
              destructive
              showChevron={false}
            />
          </SettingsGroup>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRowRTL: {
    flexDirection: 'row-reverse',
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerInfo: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  merchantId: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  textRight: {
    textAlign: 'right',
  },
  body: {
    padding: 16,
    gap: 4,
  },
  langPickerWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
})

const sectionHeader = StyleSheet.create({
  text: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 6,
    marginLeft: 4,
  },
  textRTL: {
    textAlign: 'right',
    marginLeft: 0,
    marginRight: 4,
  },
})

const group = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
})

const row = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconBubbleDestructive: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBg,
  },
  icon: {
    fontSize: 16,
  },
  labels: {
    flex: 1,
    gap: 1,
  },
  labelsRTL: {
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  labelDestructive: {
    color: COLORS.danger,
    fontWeight: '600',
  },
  sublabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  right: {
    alignItems: 'flex-end',
  },
  rightRTL: {
    alignItems: 'flex-start',
  },
  chevron: {
    fontSize: 20,
    color: COLORS.textMuted,
    fontWeight: '300',
  },
  chevronRTL: {
    transform: [{ scaleX: -1 }],
  },
})

const dividerStyle = StyleSheet.create({
  line: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: 62,
  },
})

const langPicker = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceBg,
    gap: 6,
  },
  btnActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}20`,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  labelActive: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
})
