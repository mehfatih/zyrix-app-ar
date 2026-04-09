/**
 * Zyrix App — Team Management Screen
 * 📁 app/(merchant)/multi-user.tsx
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  I18nManager, SafeAreaView, ActivityIndicator, RefreshControl,
  Alert, Modal, FlatList,
} from 'react-native'
import { useRouter } from 'expo-router'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { teamApi } from '../../services/api'
import { InnerHeader } from '../../components/InnerHeader'

const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────────────────

type Role   = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'VIEWER'
type Status = 'ACTIVE' | 'INVITED' | 'SUSPENDED'

interface TeamMember {
  id: string
  name: string
  email: string
  role: Role
  status: Status
  joinedAt: string | null
  createdAt: string
}

// ─── Role Config ──────────────────────────────────────────────

const ROLE_CONFIG: Record<Role, { icon: string; color: string; bg: string; border: string; label_ar: string; label_en: string }> = {
  ADMIN:      { icon: '👑', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.35)',  label_ar: 'مدير عام',  label_en: 'Admin'       },
  MANAGER:    { icon: '🎯', color: '#10B981', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.35)',  label_ar: 'مدير',      label_en: 'Manager'     },
  ACCOUNTANT: { icon: '📊', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.35)', label_ar: 'محاسب',     label_en: 'Accountant'  },
  VIEWER:     { icon: '👁️', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)', label_ar: 'مشاهد',     label_en: 'Viewer'      },
}

const STATUS_CONFIG: Record<Status, { color: string; bg: string; label_ar: string; label_en: string }> = {
  ACTIVE:    { color: '#10B981', bg: 'rgba(16,185,129,0.15)', label_ar: 'نشط',   label_en: 'Active'    },
  INVITED:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label_ar: 'مدعو',  label_en: 'Invited'   },
  SUSPENDED: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)',  label_ar: 'موقوف', label_en: 'Suspended' },
}

// ─── Permission Matrix ────────────────────────────────────────

const PERMISSIONS = [
  { label_ar: 'عرض المعاملات',        label_en: 'View Transactions',     ADMIN: true,  MANAGER: true,  ACCOUNTANT: true,  VIEWER: true  },
  { label_ar: 'تصدير التقارير',        label_en: 'Export Reports',        ADMIN: true,  MANAGER: true,  ACCOUNTANT: true,  VIEWER: false },
  { label_ar: 'إصدار المسترجعات',      label_en: 'Issue Refunds',         ADMIN: true,  MANAGER: true,  ACCOUNTANT: false, VIEWER: false },
  { label_ar: 'إدارة روابط الدفع',     label_en: 'Manage Payment Links',  ADMIN: true,  MANAGER: true,  ACCOUNTANT: false, VIEWER: false },
  { label_ar: 'عرض التسويات',          label_en: 'View Settlements',      ADMIN: true,  MANAGER: true,  ACCOUNTANT: true,  VIEWER: false },
  { label_ar: 'الرد على النزاعات',      label_en: 'Respond to Disputes',   ADMIN: true,  MANAGER: true,  ACCOUNTANT: false, VIEWER: false },
  { label_ar: 'إدارة الاشتراكات',       label_en: 'Manage Subscriptions',  ADMIN: true,  MANAGER: true,  ACCOUNTANT: false, VIEWER: false },
  { label_ar: 'عرض مفاتيح API',        label_en: 'View API Keys',         ADMIN: true,  MANAGER: false, ACCOUNTANT: false, VIEWER: false },
  { label_ar: 'إدارة أعضاء الفريق',     label_en: 'Manage Team Members',   ADMIN: true,  MANAGER: false, ACCOUNTANT: false, VIEWER: false },
  { label_ar: 'إعدادات الحساب',         label_en: 'Account Settings',      ADMIN: true,  MANAGER: false, ACCOUNTANT: false, VIEWER: false },
]

// ─── Demo Data ────────────────────────────────────────────────

const DEMO_MEMBERS: TeamMember[] = [
  { id: 'm1', name: 'أحمد محمد العلي', email: 'ahmed@company.com',   role: 'ADMIN',      status: 'ACTIVE',    joinedAt: '2026-01-10', createdAt: '2026-01-10' },
  { id: 'm2', name: 'فاطمة حسين',      email: 'fatima@company.com',  role: 'MANAGER',    status: 'ACTIVE',    joinedAt: '2026-02-14', createdAt: '2026-02-14' },
  { id: 'm3', name: 'خالد الراشد',      email: 'khalid@company.com',  role: 'ACCOUNTANT', status: 'ACTIVE',    joinedAt: '2026-03-01', createdAt: '2026-03-01' },
  { id: 'm4', name: 'نورا السالم',      email: 'nora@company.com',    role: 'VIEWER',     status: 'INVITED',   joinedAt: null,         createdAt: '2026-04-01' },
]

// ─── Member Card ──────────────────────────────────────────────

function MemberCard({
  member,
  onChangeRole,
  onChangStatus,
  onRemove,
}: {
  member: TeamMember
  onChangeRole: (id: string, name: string, currentRole: Role) => void
  onChangStatus: (id: string, name: string, currentStatus: Status) => void
  onRemove: (id: string, name: string) => void
}) {
  const role   = ROLE_CONFIG[member.role]
  const status = STATUS_CONFIG[member.status]

  return (
    <View style={[mc.container, { borderColor: role.border, backgroundColor: role.bg }]}>
      {/* Top row */}
      <View style={[mc.topRow, isRTL && mc.topRowRTL]}>
        <View style={[mc.avatarWrap, { borderColor: role.color + '50', backgroundColor: role.bg }]}>
          <Text style={mc.avatarIcon}>{role.icon}</Text>
        </View>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={mc.name}>{member.name}</Text>
          <Text style={mc.email}>{member.email}</Text>
        </View>
        <View style={[mc.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[mc.statusText, { color: status.color }]}>{status.label_ar}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={mc.divider} />

      {/* Role + joined */}
      <View style={[mc.metaRow, isRTL && mc.metaRowRTL]}>
        <View style={[mc.rolePill, { backgroundColor: role.bg, borderColor: role.border }]}>
          <Text style={mc.roleIcon}>{role.icon}</Text>
          <Text style={[mc.roleLabel, { color: role.color }]}>{role.label_ar}</Text>
        </View>
        <Text style={mc.joinedText}>
          {member.joinedAt
            ? `انضم ${new Date(member.joinedAt).toLocaleDateString('ar-SA')}`
            : `دُعي ${new Date(member.createdAt).toLocaleDateString('ar-SA')}`}
        </Text>
      </View>

      {/* Actions */}
      <View style={[mc.actionsRow, isRTL && mc.actionsRowRTL]}>
        <TouchableOpacity
          style={[mc.actionBtn, { borderColor: role.color + '50' }]}
          onPress={() => onChangeRole(member.id, member.name, member.role)}
        >
          <Text style={[mc.actionBtnText, { color: role.color }]}>تغيير الدور</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[mc.actionBtn, { borderColor: status.color + '50' }]}
          onPress={() => onChangStatus(member.id, member.name, member.status)}
        >
          <Text style={[mc.actionBtnText, { color: status.color }]}>
            {member.status === 'ACTIVE' ? 'إيقاف' : member.status === 'SUSPENDED' ? 'تفعيل' : 'إعادة إرسال'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[mc.actionBtn, mc.removeBtn]}
          onPress={() => onRemove(member.id, member.name)}
        >
          <Text style={mc.removeBtnText}>حذف</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const mc = StyleSheet.create({
  container:     { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, borderWidth: 1.5, overflow: 'hidden', padding: 14 },
  topRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  topRowRTL:     { flexDirection: 'row-reverse' },
  avatarWrap:    { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarIcon:    { fontSize: 20 },
  name:          { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  email:         { fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace' },
  statusBadge:   { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:    { fontSize: 11, fontWeight: '700' },
  divider:       { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 10 },
  metaRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  metaRowRTL:    { flexDirection: 'row-reverse' },
  rolePill:      { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  roleIcon:      { fontSize: 12 },
  roleLabel:     { fontSize: 12, fontWeight: '700' },
  joinedText:    { fontSize: 10, color: COLORS.textMuted },
  actionsRow:    { flexDirection: 'row', gap: 6 },
  actionsRowRTL: { flexDirection: 'row-reverse' },
  actionBtn:     { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  actionBtnText: { fontSize: 11, fontWeight: '700' },
  removeBtn:     { borderColor: 'rgba(239,68,68,0.4)', backgroundColor: 'rgba(239,68,68,0.08)' },
  removeBtnText: { fontSize: 11, fontWeight: '700', color: '#EF4444' },
})

// ─── Permission Matrix Component ─────────────────────────────

function PermissionMatrix() {
  const roles: Role[] = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'VIEWER']
  return (
    <View style={pm.container}>
      {/* Header */}
      <View style={[pm.headerRow, isRTL && pm.headerRowRTL]}>
        <View style={{ flex: 2 }} />
        {roles.map(r => (
          <View key={r} style={pm.headerCell}>
            <Text style={pm.headerIcon}>{ROLE_CONFIG[r].icon}</Text>
            <Text style={[pm.headerLabel, { color: ROLE_CONFIG[r].color }]} numberOfLines={1}>
              {ROLE_CONFIG[r].label_ar}
            </Text>
          </View>
        ))}
      </View>
      {/* Rows */}
      {PERMISSIONS.map((p, i) => (
        <View key={i} style={[pm.row, i % 2 === 0 && pm.rowAlt, isRTL && pm.rowRTL]}>
          <Text style={[pm.permLabel, { flex: 2 }]} numberOfLines={1}>{p.label_ar}</Text>
          {roles.map(r => (
            <View key={r} style={pm.cell}>
              <Text style={[pm.check, { color: p[r] ? '#10B981' : 'rgba(255,255,255,0.12)' }]}>
                {p[r] ? '✓' : '—'}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

const pm = StyleSheet.create({
  container:  { marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  headerRow:  { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 10, paddingHorizontal: 12 },
  headerRowRTL:{ flexDirection: 'row-reverse' },
  headerCell: { flex: 1, alignItems: 'center' },
  headerIcon: { fontSize: 14, marginBottom: 2 },
  headerLabel:{ fontSize: 9, fontWeight: '700' },
  row:        { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 12 },
  rowRTL:     { flexDirection: 'row-reverse' },
  rowAlt:     { backgroundColor: 'rgba(255,255,255,0.025)' },
  permLabel:  { fontSize: 11, color: COLORS.textSecondary, textAlign: isRTL ? 'right' : 'left' },
  cell:       { flex: 1, alignItems: 'center' },
  check:      { fontSize: 14, fontWeight: '700' },
})

// ─── Main Screen ──────────────────────────────────────────────

export default function MultiUserScreen() {
  const { t }        = useTranslation()
  const router       = useRouter()
  const tabBarHeight = useTabBarHeight()

  const [members, setMembers]   = useState<TeamMember[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [showMatrix, setShowMatrix] = useState(false)
  const [inviting, setInviting] = useState(false)

  // Invite form
  const [form, setForm] = useState({ name: '', email: '', role: 'VIEWER' as Role })

  const fetchData = useCallback(async () => {
    try {
      const res = await teamApi.list()
      setMembers(res.data.members.length > 0 ? res.data.members : DEMO_MEMBERS)
    } catch (_e) {
      setMembers(DEMO_MEMBERS)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  // ── Stats ──────────────────────────────────────────────────
  const total     = members.length
  const active    = members.filter(m => m.status === 'ACTIVE').length
  const invited   = members.filter(m => m.status === 'INVITED').length
  const suspended = members.filter(m => m.status === 'SUSPENDED').length

  // ── Invite ─────────────────────────────────────────────────
  const handleInvite = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      Alert.alert('خطأ', 'أدخل الاسم والبريد الإلكتروني')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      Alert.alert('خطأ', 'البريد الإلكتروني غير صحيح')
      return
    }
    setInviting(true)
    try {
      await teamApi.invite({ name: form.name.trim(), email: form.email.trim(), role: form.role })
      setShowInvite(false)
      setForm({ name: '', email: '', role: 'VIEWER' })
      fetchData()
      Alert.alert('✓ تم الإرسال', `تم إرسال دعوة لـ ${form.name}`)
    } catch (e: unknown) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ')
    } finally {
      setInviting(false)
    }
  }

  // ── Change Role ────────────────────────────────────────────
  const handleChangeRole = (id: string, name: string, currentRole: Role) => {
    const roles: Role[] = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'VIEWER']
    const options = roles.filter(r => r !== currentRole).map(r => ({
      text: `${ROLE_CONFIG[r].icon} ${ROLE_CONFIG[r].label_ar}`,
      onPress: async () => {
        try {
          await teamApi.update(id, { role: r })
          fetchData()
        } catch (e: unknown) {
          Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ')
        }
      },
    }))
    Alert.alert(`تغيير دور ${name}`, 'اختر الدور الجديد', [
      ...options,
      { text: 'إلغاء', style: 'cancel' as const },
    ])
  }

  // ── Change Status ──────────────────────────────────────────
  const handleChangeStatus = (id: string, name: string, currentStatus: Status) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    const label     = currentStatus === 'ACTIVE' ? 'إيقاف' : 'تفعيل'
    Alert.alert(
      `${label} ${name}`,
      `هل أنت متأكد من ${label} هذا العضو؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: label,
          style: currentStatus === 'ACTIVE' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await teamApi.update(id, { status: newStatus })
              fetchData()
            } catch (e: unknown) {
              Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ')
            }
          },
        },
      ]
    )
  }

  // ── Remove ─────────────────────────────────────────────────
  const handleRemove = (id: string, name: string) => {
    Alert.alert(
      'حذف عضو الفريق',
      `هل أنت متأكد من حذف "${name}"؟ لا يمكن التراجع.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف', style: 'destructive',
          onPress: async () => {
            try {
              await teamApi.remove(id)
              fetchData()
            } catch (e: unknown) {
              Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ')
            }
          },
        },
      ]
    )
  }

  if (loading) return (
    <SafeAreaView style={st.safe}>
      <InnerHeader title="إدارة الفريق" accentColor="#3B82F6" />
      <View style={st.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={st.safe}>
      <InnerHeader title="إدارة الفريق" accentColor="#3B82F6" />

      <ScrollView
        contentContainerStyle={[st.scroll, { paddingBottom: tabBarHeight + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── KPI Row ─────────────────────────────────────── */}
        <View style={[st.kpiRow, isRTL && st.kpiRowRTL]}>
          {[
            { label: 'إجمالي الأعضاء', value: total,     color: '#3B82F6', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)'  },
            { label: 'نشطون',           value: active,    color: '#10B981', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)'  },
            { label: 'مدعوون',          value: invited,   color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)'  },
            { label: 'موقوفون',         value: suspended, color: '#EF4444', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)'   },
          ].map((kpi, i) => (
            <View key={i} style={[st.kpiCard, { backgroundColor: kpi.bg, borderColor: kpi.border }]}>
              <Text style={st.kpiLabel}>{kpi.label}</Text>
              <Text style={[st.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Role summary ─────────────────────────────────── */}
        <View style={[st.roleRow, isRTL && st.roleRowRTL]}>
          {(['ADMIN','MANAGER','ACCOUNTANT','VIEWER'] as Role[]).map(r => {
            const rc    = ROLE_CONFIG[r]
            const count = members.filter(m => m.role === r).length
            return (
              <View key={r} style={[st.roleCard, { backgroundColor: rc.bg, borderColor: rc.border }]}>
                <Text style={st.roleCardIcon}>{rc.icon}</Text>
                <Text style={[st.roleCardLabel, { color: rc.color }]}>{rc.label_ar}</Text>
                <Text style={[st.roleCardCount, { color: rc.color }]}>{count}</Text>
              </View>
            )
          })}
        </View>

        {/* ── Action buttons ───────────────────────────────── */}
        <View style={[st.actionButtons, isRTL && st.actionButtonsRTL]}>
          <TouchableOpacity style={st.inviteBtn} onPress={() => setShowInvite(true)}>
            <Text style={st.inviteBtnText}>+ دعوة عضو جديد</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.matrixBtn} onPress={() => setShowMatrix(!showMatrix)}>
            <Text style={st.matrixBtnText}>{showMatrix ? 'إخفاء الصلاحيات' : '📋 عرض الصلاحيات'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Permission Matrix ────────────────────────────── */}
        {showMatrix && (
          <View style={st.matrixSection}>
            <Text style={[st.sectionTitle, isRTL && st.textRight]}>مصفوفة الصلاحيات</Text>
            <PermissionMatrix />
          </View>
        )}

        {/* ── Members List ─────────────────────────────────── */}
        <Text style={[st.sectionTitle, st.membersSectionTitle, isRTL && st.textRight]}>
          أعضاء الفريق ({members.length})
        </Text>

        {members.length === 0 ? (
          <View style={st.emptyContainer}>
            <Text style={st.emptyIcon}>👥</Text>
            <Text style={st.emptyText}>لا يوجد أعضاء في الفريق بعد</Text>
            <TouchableOpacity style={st.emptyBtn} onPress={() => setShowInvite(true)}>
              <Text style={st.emptyBtnText}>+ دعوة أول عضو</Text>
            </TouchableOpacity>
          </View>
        ) : (
          members.map(m => (
            <MemberCard
              key={m.id}
              member={m}
              onChangeRole={handleChangeRole}
              onChangStatus={handleChangeStatus}
              onRemove={handleRemove}
            />
          ))
        )}
      </ScrollView>

      {/* ── Invite Modal ─────────────────────────────────────── */}
      <Modal visible={showInvite} transparent animationType="slide" onRequestClose={() => setShowInvite(false)}>
        <View style={md.overlay}>
          <View style={md.container}>
            <View style={md.header}>
              <Text style={md.title}>دعوة عضو جديد</Text>
              <TouchableOpacity onPress={() => setShowInvite(false)}>
                <Text style={md.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={md.body} showsVerticalScrollIndicator={false}>
              {/* Name */}
              <Text style={[md.label, isRTL && md.labelRTL]}>الاسم *</Text>
              <TextInput
                style={md.input}
                value={form.name}
                onChangeText={v => setForm({ ...form, name: v })}
                placeholder="اسم العضو"
                placeholderTextColor={COLORS.textMuted}
                textAlign={isRTL ? 'right' : 'left'}
              />

              {/* Email */}
              <Text style={[md.label, isRTL && md.labelRTL]}>البريد الإلكتروني *</Text>
              <TextInput
                style={md.input}
                value={form.email}
                onChangeText={v => setForm({ ...form, email: v })}
                placeholder="email@company.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                textAlign={isRTL ? 'right' : 'left'}
              />

              {/* Role selector */}
              <Text style={[md.label, isRTL && md.labelRTL]}>الدور</Text>
              <View style={md.roleGrid}>
                {(['ADMIN','MANAGER','ACCOUNTANT','VIEWER'] as Role[]).map(r => {
                  const rc      = ROLE_CONFIG[r]
                  const isActive = form.role === r
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[md.roleOption, isActive && { backgroundColor: rc.bg, borderColor: rc.color }]}
                      onPress={() => setForm({ ...form, role: r })}
                    >
                      <Text style={md.roleOptionIcon}>{rc.icon}</Text>
                      <Text style={[md.roleOptionLabel, isActive && { color: rc.color, fontWeight: '700' }]}>
                        {rc.label_ar}
                      </Text>
                      {isActive && <View style={[md.roleCheck, { backgroundColor: rc.color }]}><Text style={md.roleCheckText}>✓</Text></View>}
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Role description */}
              <View style={[md.roleDesc, { backgroundColor: ROLE_CONFIG[form.role].bg, borderColor: ROLE_CONFIG[form.role].border }]}>
                <Text style={[md.roleDescText, { color: ROLE_CONFIG[form.role].color }]}>
                  {form.role === 'ADMIN'      && 'وصول كامل لكل شيء — الإعدادات والفريق ومفاتيح API وجميع الميزات.'}
                  {form.role === 'MANAGER'    && 'يدير المعاملات والمسترجعات والنزاعات وروابط الدفع والاشتراكات.'}
                  {form.role === 'ACCOUNTANT' && 'يعرض المعاملات والتسويات ويصدّر التقارير. لا يمكنه إجراء تغييرات.'}
                  {form.role === 'VIEWER'     && 'وصول للقراءة فقط للمعاملات. لا تصدير ولا إجراءات.'}
                </Text>
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[md.submitBtn, inviting && { opacity: 0.6 }]}
                onPress={handleInvite}
                disabled={inviting}
              >
                <Text style={md.submitBtnText}>{inviting ? '...' : '📧 إرسال الدعوة'}</Text>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────

const st = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: COLORS.darkBg },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:             { paddingTop: 8 },
  kpiRow:             { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  kpiRowRTL:          { flexDirection: 'row-reverse' },
  kpiCard:            { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 10, alignItems: 'center', gap: 4 },
  kpiLabel:           { fontSize: 8, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center' },
  kpiValue:           { fontSize: 20, fontWeight: '800' },
  roleRow:            { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 14 },
  roleRowRTL:         { flexDirection: 'row-reverse' },
  roleCard:           { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 10, alignItems: 'center', gap: 3 },
  roleCardIcon:       { fontSize: 18 },
  roleCardLabel:      { fontSize: 8, fontWeight: '700' },
  roleCardCount:      { fontSize: 16, fontWeight: '900' },
  actionButtons:      { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  actionButtonsRTL:   { flexDirection: 'row-reverse' },
  inviteBtn:          { flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  inviteBtnText:      { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  matrixBtn:          { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  matrixBtnText:      { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  matrixSection:      { marginBottom: 16 },
  sectionTitle:       { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, paddingHorizontal: 16, marginBottom: 10 },
  membersSectionTitle:{ marginTop: 4 },
  textRight:          { textAlign: 'right' },
  emptyContainer:     { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyIcon:          { fontSize: 48 },
  emptyText:          { fontSize: 15, color: COLORS.textMuted },
  emptyBtn:           { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13 },
  emptyBtnText:       { color: COLORS.white, fontWeight: '700', fontSize: 14 },
})

const md = StyleSheet.create({
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container:       { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:           { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  closeBtn:        { fontSize: 20, color: COLORS.textMuted, padding: 4 },
  body:            { padding: 16 },
  label:           { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6, marginTop: 4 },
  labelRTL:        { textAlign: 'right' },
  input:           { backgroundColor: COLORS.surfaceBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: COLORS.textPrimary, fontSize: 14, marginBottom: 12 },
  roleGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  roleOption:      { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceBg, position: 'relative' },
  roleOptionIcon:  { fontSize: 18 },
  roleOptionLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  roleCheck:       { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  roleCheckText:   { fontSize: 9, color: COLORS.white, fontWeight: '900' },
  roleDesc:        { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  roleDescText:    { fontSize: 13, lineHeight: 20, fontWeight: '500', textAlign: isRTL ? 'right' : 'left' },
  submitBtn:       { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  submitBtnText:   { color: COLORS.white, fontSize: 15, fontWeight: '700' },
})