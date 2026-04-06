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
  TextInput,
} from 'react-native'
import { useRouter } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { useAuth } from '../../hooks/useAuth'
import { merchantApi } from '../../services/api'
import Icon, { type IconName } from '../../components/Icon'
import { InnerHeader } from '../../components/InnerHeader';

const isRTL = I18nManager.isRTL

type Language = 'ar' | 'en'

interface ToggleState {
  pushNotifications: boolean
  emailReports: boolean
  smsAlerts: boolean
  twoFactor: boolean
  biometric: boolean
  autoLogout: boolean
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={[sh.text, isRTL && sh.textRTL]}>{title}</Text>
}

function SettingRow({ iconName, label, sublabel, onPress, rightElement, destructive, showChevron = true, bgColor }: {
  iconName: IconName; label: string; sublabel?: string; onPress?: () => void;
  rightElement?: React.ReactNode; destructive?: boolean; showChevron?: boolean; bgColor?: string;
}) {
  return (
    <TouchableOpacity style={[rowS.container, isRTL && rowS.containerRTL]} onPress={onPress} activeOpacity={onPress ? 0.65 : 1}>
      <View style={[rowS.iconBubble, destructive && rowS.iconBubbleDestructive]}>
        <Icon name={iconName} size={16} color={destructive ? COLORS.danger : COLORS.textSecondary} />
      </View>
      <View style={[rowS.labels, isRTL && rowS.labelsRTL]}>
        <Text style={[rowS.label, destructive && rowS.labelDestructive]}>{label}</Text>
        {sublabel ? <Text style={rowS.sublabel}>{sublabel}</Text> : null}
      </View>
      <View style={[rowS.right, isRTL && rowS.rightRTL]}>
        {rightElement ?? (showChevron && <Text style={[rowS.chevron, isRTL && rowS.chevronRTL]}>›</Text>)}
      </View>
    </TouchableOpacity>
  )
}

function Divider() { return <View style={divS.line} /> }

function SettingsGroup({ children, bgColor }: { children: React.ReactNode; bgColor?: string }) {
  return <View style={[grpS.container, bgColor ? { backgroundColor: bgColor } : null]}>{children}</View>
}

function LanguagePicker({ current, onChange }: { current: Language; onChange: (lang: Language) => void }) {
  const langs: { key: Language; label: string; flag: string }[] = [
    { key: 'ar', label: 'العربية', flag: '🇸🇦' },
    { key: 'en', label: 'English', flag: '🇬🇧' },
  ]
  return (
    <View style={[lpS.row, isRTL && lpS.rowRTL]}>
      {langs.map((l) => (
        <TouchableOpacity key={l.key} style={[lpS.btn, current === l.key && lpS.btnActive]} onPress={() => onChange(l.key)}>
          <Text style={lpS.flag}>{l.flag}</Text>
          <Text style={[lpS.label, current === l.key && lpS.labelActive]}>{l.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function SupportChat({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [msg, setMsg] = useState('')
  const [messages, setMessages] = useState<{ from: 'user' | 'support'; text: string }[]>([
    { from: 'support', text: 'مرحباً بك في دعم زايركس! كيف يمكننا مساعدتك؟' },
  ])

  if (!visible) return null

  const send = () => {
    if (!msg.trim()) return
    setMessages(prev => [...prev, { from: 'user', text: msg.trim() }])
    setMsg('')
    setTimeout(() => {
      setMessages(prev => [...prev, { from: 'support', text: 'شكراً لتواصلك. سيتم الرد عليك من قبل فريق الدعم قريباً.' }])
    }, 1000)
  }

  return (
    <View style={chatS.overlay}>
      <View style={chatS.container}>
        <View style={chatS.header}>
          <Text style={chatS.headerTitle}>دردشة الدعم</Text>
          <TouchableOpacity onPress={onClose}><Text style={chatS.closeBtn}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView style={chatS.messages}>
          {messages.map((m, i) => (
            <View key={i} style={[chatS.bubble, m.from === 'user' ? chatS.bubbleUser : chatS.bubbleSupport]}>
              <Text style={[chatS.bubbleText, m.from === 'user' && { color: COLORS.white }]}>{m.text}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={chatS.inputRow}>
          <TextInput style={chatS.input} value={msg} onChangeText={setMsg} placeholder="اكتب رسالتك..." placeholderTextColor={COLORS.textMuted} textAlign="right" />
          <TouchableOpacity style={chatS.sendBtn} onPress={send}><Text style={{ color: COLORS.white, fontWeight: '700' }}>إرسال</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export default function SettingsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { signOut } = useAuth()
  const [language, setLanguage] = useState<Language>('ar')
  const [showChat, setShowChat] = useState(false)
  const [toggles, setToggles] = useState<ToggleState>({
    pushNotifications: true, emailReports: true, smsAlerts: false,
    twoFactor: true, biometric: false, autoLogout: true,
  })

  const setToggle = (key: keyof ToggleState) => (val: boolean) =>
    setToggles((prev: any) => ({ ...prev, [key]: val }))

  const handleLanguageChange = async (lang: Language) => {
    setLanguage(lang)
    try { await merchantApi.updateProfile({ language: lang }) } catch {}
  }

  const handleLogout = () => {
    Alert.alert(t('settings.logout'), t('settings.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.logout'), style: 'destructive', onPress: async () => { await signOut(); router.replace('/(auth)/login') } },
    ])
  }

  const handleApiKeys = () => router.push('/(merchant)/api-keys' as any)
  const handleWebhooks = () => Alert.alert('قريباً', t('common.coming_soon'))

  return (
    <SafeAreaView style={styles.safeArea}>
      <InnerHeader title={t('settings.title')} accentColor="#F59E0B" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.body}>

          <SectionHeader title={t('settings.language')} />
          <SettingsGroup bgColor="rgba(26, 86, 219, 0.1)">
            <View style={styles.langPickerWrapper}>
              <LanguagePicker current={language} onChange={handleLanguageChange} />
            </View>
          </SettingsGroup>

          <SettingsGroup bgColor="rgba(139, 92, 246, 0.1)">
            <SettingRow iconName="zap" label={t('common.coming_soon')} sublabel="الوضع الليلي" showChevron={false}
              rightElement={<Switch value={false} disabled trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor={COLORS.textMuted} />} />
          </SettingsGroup>

          <SectionHeader title={t('settings.notifications')} />
          <SettingsGroup bgColor="rgba(5, 150, 105, 0.1)">
            <SettingRow iconName="bell" label={t('settings.notifications')} sublabel="دائماً" showChevron={false}
              rightElement={<Switch value={toggles.pushNotifications} onValueChange={setToggle('pushNotifications')} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor={COLORS.textPrimary} />} />
            <Divider />
            <SettingRow iconName="mail" label={t('settings.email_reports')} sublabel={t('settings.email_reports')} showChevron={false}
              rightElement={<Switch value={toggles.emailReports} onValueChange={setToggle('emailReports')} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor={COLORS.textPrimary} />} />
            <Divider />
            <SettingRow iconName="message-square" label={t('settings.sms_alerts')} sublabel={t('settings.sms_alerts_sub')} showChevron={false}
              rightElement={<Switch value={toggles.smsAlerts} onValueChange={setToggle('smsAlerts')} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor={COLORS.textPrimary} />} />
          </SettingsGroup>

          <SectionHeader title={t('settings.security')} />
          <SettingsGroup bgColor="rgba(217, 119, 6, 0.1)">
            <SettingRow iconName="lock" label={t('settings.two_factor')} sublabel={toggles.twoFactor ? t('settings.two_factor_active') : t('settings.two_factor_inactive')} showChevron={false}
              rightElement={<Switch value={toggles.twoFactor} onValueChange={setToggle('twoFactor')} trackColor={{ false: COLORS.border, true: COLORS.success }} thumbColor={COLORS.textPrimary} />} />
            <Divider />
            <SettingRow iconName="fingerprint" label={t('settings.biometric')} sublabel={t('settings.security')} showChevron={false}
              rightElement={<Switch value={toggles.biometric} onValueChange={setToggle('biometric')} trackColor={{ false: COLORS.border, true: COLORS.success }} thumbColor={COLORS.textPrimary} />} />
            <Divider />
            <SettingRow iconName="clock" label={t('settings.auto_logout')} sublabel={t('settings.auto_logout_sub')} showChevron={false}
              rightElement={<Switch value={toggles.autoLogout} onValueChange={setToggle('autoLogout')} trackColor={{ false: COLORS.border, true: COLORS.success }} thumbColor={COLORS.textPrimary} />} />
            <Divider />
            <SettingRow iconName="key" label={t('settings.change_password')} onPress={() => Alert.alert(t('settings.security'), t('common.coming_soon'))} />
          </SettingsGroup>

          <SectionHeader title={t('settings.integration')} />
          <SettingsGroup bgColor="rgba(13, 148, 136, 0.1)">
            <SettingRow iconName="settings" label={t('settings.apiKeys')} sublabel={t('settings.api_keys_sub')} onPress={handleApiKeys} />
            <Divider />
            <SettingRow iconName="link" label={t('settings.webhooks')} sublabel={t('notifications.title')} onPress={handleWebhooks} />
          </SettingsGroup>

          <SectionHeader title={t('settings.support')} />
          <SettingsGroup bgColor="rgba(99, 102, 241, 0.1)">
            <SettingRow iconName="message-square" label={t('settings.support_label')} onPress={() => setShowChat(true)} />
            <Divider />
            <SettingRow iconName="info" label={t('settings.version_label')} sublabel="1.0.0 (build 42)" showChevron={false} />
          </SettingsGroup>

          <SettingsGroup bgColor="rgba(220, 38, 38, 0.08)">
            <SettingRow iconName="log-out" label={t('settings.logout')} onPress={handleLogout} destructive showChevron={false} />
          </SettingsGroup>

        </View>
      </ScrollView>

      <SupportChat visible={showChat} onClose={() => setShowChat(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.darkBg },
  scrollContent: { paddingBottom: 120 },
  pageHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: COLORS.deepBg, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4, textAlign: 'center' },
  merchantId: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  textRight: { textAlign: 'right' },
  body: { padding: 16, gap: 4 },
  langPickerWrapper: { paddingHorizontal: 16, paddingVertical: 12 },
})

const sh = StyleSheet.create({
  text: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 6, marginLeft: 4 },
  textRTL: { textAlign: 'right', marginLeft: 0, marginRight: 4 },
})

const grpS = StyleSheet.create({
  container: { backgroundColor: COLORS.cardBg, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 4 },
})

const rowS = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  containerRTL: { flexDirection: 'row-reverse' },
  iconBubble: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.surfaceBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  iconBubbleDestructive: { backgroundColor: COLORS.dangerBg, borderColor: COLORS.dangerBg },
  icon: { fontSize: 16 },
  labels: { flex: 1, gap: 1 },
  labelsRTL: { alignItems: 'flex-end' },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.textPrimary },
  labelDestructive: { color: COLORS.danger, fontWeight: '600' },
  sublabel: { fontSize: 11, color: COLORS.textMuted },
  right: { alignItems: 'flex-end' },
  rightRTL: { alignItems: 'flex-start' },
  chevron: { fontSize: 18, color: COLORS.textMuted, fontWeight: '300' },
  chevronRTL: { transform: [{ scaleX: -1 }] },
})

const divS = StyleSheet.create({
  line: { height: 1, backgroundColor: COLORS.border, marginLeft: 58 },
})

const lpS = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  rowRTL: { flexDirection: 'row-reverse' },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cardBg, gap: 6 },
  btnActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(26, 86, 219, 0.2)' },
  flag: { fontSize: 16 },
  label: { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary },
  labelActive: { color: COLORS.primaryLight, fontWeight: '700' },
})

const chatS = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container: { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn: { fontSize: 18, color: COLORS.textMuted, padding: 4 },
  messages: { padding: 16, maxHeight: 300 },
  bubble: { padding: 12, borderRadius: 12, marginBottom: 8, maxWidth: '80%' },
  bubbleSupport: { backgroundColor: COLORS.surfaceBg, alignSelf: 'flex-end' },
  bubbleUser: { backgroundColor: COLORS.primary, alignSelf: 'flex-start' },
  bubbleText: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 20 },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  input: { flex: 1, backgroundColor: COLORS.surfaceBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
})