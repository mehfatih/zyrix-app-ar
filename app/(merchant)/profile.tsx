// app/(merchant)/profile.tsx
import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, I18nManager, SafeAreaView, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { merchantApi } from '../../services/api'
import { useRouter } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'

const isRTL = I18nManager.isRTL

interface ProfileData {
  firstName: string; lastName: string; email: string; phone: string;
  company: string; merchantId: string; country: string; timezone: string;
}

const INITIAL_PROFILE: ProfileData = {
  firstName: 'محمد', lastName: 'فاتح', email: 'meh.fatih77@gmail.com', phone: '+90 545 221 0888',
  company: 'Zyrix Global Technology', merchantId: 'ZRX-10042', country: 'المملكة العربية السعودية', timezone: 'Asia/Riyadh (UTC+3)',
}

function Avatar({ firstName, lastName, onEdit }: { firstName: string; lastName: string; onEdit: () => void }) {
  const initials = (firstName[0] ?? '').toUpperCase() + (lastName[0] ?? '').toUpperCase()
  return (
    <View style={av.container}>
      <View style={av.circle}><Text style={av.initials}>{initials}</Text></View>
      <TouchableOpacity style={av.editBadge} onPress={onEdit} activeOpacity={0.75}>
        <Text style={av.editIcon}>✏️</Text>
      </TouchableOpacity>
    </View>
  )
}

function CompactField({ label, value, onChangeText, editable = true, keyboardType = 'default' as any }: {
  label: string; value: string; onChangeText?: (v: string) => void; editable?: boolean; keyboardType?: any;
}) {
  return (
    <View style={fd.wrapper}>
      <Text style={fd.label}>{label}</Text>
      <TextInput style={[fd.input, !editable && fd.inputDisabled]} value={value} onChangeText={onChangeText}
        editable={editable} keyboardType={keyboardType} textAlign="right" placeholderTextColor={COLORS.textMuted} />
    </View>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={ir.row}>
      <Text style={ir.value}>{value}</Text>
      <Text style={ir.label}>{label}</Text>
    </View>
  )
}

export default function ProfileScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { signOut } = useAuth()
  const [profile, setProfile] = useState<ProfileData>(INITIAL_PROFILE)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ProfileData>(INITIAL_PROFILE)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deletingAccount, setDeletingAccount] = useState(false)

  const fetchProfile = async () => {
    try {
      const data = await merchantApi.getProfile()
      const mapped: ProfileData = {
        firstName: data.name?.split(' ')[0] || 'محمد', lastName: data.name?.split(' ').slice(1).join(' ') || 'فاتح',
        email: data.email || '', phone: data.phone || '', company: data.company || 'Zyrix Global Technology',
        merchantId: data.merchantId || 'ZRX-10042', country: 'المملكة العربية السعودية', timezone: 'Asia/Riyadh (UTC+3)',
      }
      setProfile(mapped); setDraft(mapped)
    } catch (_e) {} finally { setLoading(false) }
  }

  React.useEffect(() => { fetchProfile() }, [])

  const set = (key: keyof ProfileData) => (val: string) =>
    setDraft((prev: any) => ({ ...prev, [key]: val }))

  const handleSave = () => {
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      Alert.alert('✗', t('profile.validation_name'))
      return
    }
    if (!draft.email.includes('@')) {
      Alert.alert('✗', t('profile.validation_email'))
      return
    }
    setSaving(true)
    setTimeout(() => {
      setProfile(draft)
      setEditing(false)
      setSaving(false)
      Alert.alert('✓', t('profile.updated'))
    }, 800)
  }

  const handleCloseAccount = () => {
    Alert.alert(
      t('profile.close_account'),
      t('profile.close_account_sub'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.close_account'),
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true)
            try {
              await merchantApi.deleteAccount()
              await signOut()
              router.replace('/(auth)/login')
            } catch (_e) {
              Alert.alert('✗', t('common.error') ?? 'حدث خطأ، حاول مرة أخرى')
            } finally {
              setDeletingAccount(false)
            }
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView style={st.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Avatar + name */}
          <View style={st.avatarSection}>
            <Avatar firstName={profile.firstName} lastName={profile.lastName} onEdit={() => { setDraft(profile); setEditing(true) }} />
            <Text style={st.fullName}>{profile.firstName} {profile.lastName}</Text>
            <View style={st.merchantPill}><Text style={st.merchantPillText}>{profile.merchantId}</Text></View>
            {!editing ? (
              <TouchableOpacity style={st.editBtn} onPress={() => { setDraft(profile); setEditing(true) }}>
                <Text style={st.editBtnText}>✏️  {t('profile.edit')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={st.editActions}>
                <TouchableOpacity style={st.cancelBtn} onPress={() => setEditing(false)}>
                  <Text style={st.cancelBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
                  <Text style={st.saveBtnText}>{saving ? '...' : t('profile.save')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Personal info */}
          <Text style={st.sectionTitle}>{t('profile.personal_info')}</Text>
          <View style={[st.card, { backgroundColor: 'rgba(26, 86, 219, 0.08)', borderColor: 'rgba(26, 86, 219, 0.2)' }]}>
            <CompactField label={t('profile.first_name')} value={editing ? draft.firstName : profile.firstName} onChangeText={set('firstName')} editable={editing} />
            <CompactField label={t('profile.last_name')} value={editing ? draft.lastName : profile.lastName} onChangeText={set('lastName')} editable={editing} />
            <CompactField label={t('profile.email')} value={editing ? draft.email : profile.email} onChangeText={set('email')} editable={editing} keyboardType="email-address" />
            <CompactField label={t('profile.phone')} value={editing ? draft.phone : profile.phone} onChangeText={set('phone')} editable={editing} keyboardType="phone-pad" />
          </View>

          {/* Merchant info */}
          <Text style={st.sectionTitle}>{t('profile.merchant_info')}</Text>
          <View style={[st.card, { backgroundColor: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.2)' }]}>
            <InfoRow label={t('profile.merchantId')} value={profile.merchantId} />
            <InfoRow label={t('profile.company_label')} value={profile.company} />
            <InfoRow label={t('profile.country')} value={profile.country} />
            <InfoRow label={t('profile.timezone') ?? 'المنطقة الزمنية'} value={profile.timezone} />
          </View>

          {/* Account / Danger zone */}
          <Text style={st.sectionTitle}>{t('profile.account')}</Text>
          <TouchableOpacity
            style={[st.card, { backgroundColor: 'rgba(220, 38, 38, 0.08)', borderColor: 'rgba(220, 38, 38, 0.2)' }]}
            onPress={handleCloseAccount}
            disabled={deletingAccount}
            activeOpacity={0.7}
          >
            <View style={[st.dangerRow, isRTL && st.dangerRowRTL]}>
              <Text style={st.dangerIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={st.dangerLabel}>{t('profile.close_account')}</Text>
                <Text style={st.dangerSub}>{t('profile.close_account_sub')}</Text>
              </View>
              <Text style={st.dangerChevron}>{deletingAccount ? '...' : '›'}</Text>
            </View>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.darkBg },
  scroll: { paddingBottom: 40, paddingHorizontal: 16 },
  avatarSection: { alignItems: 'center', paddingTop: 16, paddingBottom: 12, gap: 8 },
  fullName: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  merchantPill: { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 3 },
  merchantPillText: { fontSize: 12, fontWeight: '700', color: COLORS.primaryLight, fontFamily: 'monospace' },
  editBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary, marginTop: 4 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cardBg },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.primary },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.6, marginTop: 16, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  dangerRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  dangerRowRTL: { flexDirection: 'row-reverse' },
  dangerIcon: { fontSize: 18 },
  dangerLabel: { fontSize: 14, fontWeight: '600', color: COLORS.danger, marginBottom: 2 },
  dangerSub: { fontSize: 11, color: COLORS.textMuted },
  dangerChevron: { fontSize: 20, color: COLORS.danger },
})

const av = StyleSheet.create({
  container: { position: 'relative', width: 70, height: 70 },
  circle: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 24, fontWeight: '800', color: COLORS.white },
  editBadge: { position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.cardBg, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  editIcon: { fontSize: 11 },
})

const fd = StyleSheet.create({
  wrapper: { paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  label: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, marginBottom: 3, textAlign: isRTL ? 'right' : 'left' },
  input: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500', paddingVertical: 2 },
  inputDisabled: { color: COLORS.textSecondary },
})

const ir = StyleSheet.create({
  row: { flexDirection: isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  label: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  value: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
})