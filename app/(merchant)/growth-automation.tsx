// app/(merchant)/growth-automation.tsx
// ✅ 32 — Payment Reminders
// ✅ 33 — Revenue Recovery
// ✅ 34 — CRM Integration
// ✅ 36 — Affiliate System
// ✅ 37+38 — Team Accounts + Permissions
// ✅ 39 — Marketplace Support
// ✅ 40 — Split Payments

import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  I18nManager, SafeAreaView, ActivityIndicator, RefreshControl,
  TextInput, Alert,
} from 'react-native'
import { InnerHeader } from '../../components/InnerHeader'
import { COLORS } from '../../constants/colors'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'
import { SmartEmptyState } from '../../components/SmartEmptyState'

const isRTL = I18nManager.isRTL
const BASE   = 'https://zyrix-backend-production.up.railway.app'

// ─── API helpers ──────────────────────────────────────────────
import * as SecureStore from 'expo-secure-store'
async function growthRequest(path: string, opts: RequestInit = {}) {
  const token = await SecureStore.getItemAsync('zyrix_auth_token')
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) },
  })
  return res.json()
}

// ─── Tab Config ───────────────────────────────────────────────
type TabKey = 'reminders' | 'recovery' | 'crm' | 'affiliates' | 'permissions' | 'marketplace' | 'split'
const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: 'reminders',   icon: '⏰', label: 'تذكيرات' },
  { key: 'recovery',    icon: '💰', label: 'استرداد' },
  { key: 'crm',         icon: '👥', label: 'CRM' },
  { key: 'affiliates',  icon: '🤝', label: 'شركاء' },
  { key: 'permissions', icon: '🔐', label: 'صلاحيات' },
  { key: 'marketplace', icon: '🏪', label: 'سوق' },
  { key: 'split',       icon: '✂️', label: 'تقسيم' },
]

// ─── Shared Components ────────────────────────────────────────
function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <View style={[c.card, accent && { borderColor: `${accent}40` }]}>
      {children}
    </View>
  )
}
const c = StyleSheet.create({
  card: { backgroundColor: COLORS.cardBg, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 10 },
})

function SectionTitle({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={[st.row, isRTL && st.rowRTL]}>
      <Text style={st.icon}>{icon}</Text>
      <Text style={st.title}>{title}</Text>
    </View>
  )
}
const st = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 },
  rowRTL:{ flexDirection: 'row-reverse' },
  icon:  { fontSize: 16 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
})

function PrimaryBtn({ label, onPress, color = COLORS.primary, loading = false }: {
  label: string; onPress: () => void; color?: string; loading?: boolean
}) {
  return (
    <TouchableOpacity style={[pb.btn, { backgroundColor: color }]} onPress={onPress} disabled={loading} activeOpacity={0.85}>
      {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={pb.txt}>{label}</Text>}
    </TouchableOpacity>
  )
}
const pb = StyleSheet.create({
  btn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  txt: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
})

function InputField({ label, value, onChangeText, placeholder, keyboard = 'default' }: any) {
  return (
    <View style={inf.wrap}>
      <Text style={inf.label}>{label}</Text>
      <TextInput style={inf.input} value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor={COLORS.textMuted}
        keyboardType={keyboard} textAlign={isRTL ? 'right' : 'left'} />
    </View>
  )
}
const inf = StyleSheet.create({
  wrap:  { marginBottom: 10 },
  label: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 5 },
  input: { backgroundColor: COLORS.surfaceBg, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.textPrimary, fontSize: 14 },
})

// ─── 32. Reminders Tab ────────────────────────────────────────
function RemindersTab() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState({ name: '', triggerType: 'overdue_invoice', channel: 'whatsapp', triggerDays: '3' })

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await growthRequest('/api/growth/reminders'); setData(r.data) } catch (_e) {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [])

  const create = async () => {
    try { await growthRequest('/api/growth/reminders', { method: 'POST', body: JSON.stringify(form) }); setShowForm(false); load() } catch (_e) {}
  }

  const sendNow = async (id: string, name: string) => {
    try {
      const r = await growthRequest(`/api/growth/reminders/${id}/send`, { method: 'POST' })
      Alert.alert('✅ تم الإرسال', `تم إرسال ${r.data?.sent || 0} تذكير لـ "${name}"`)
    } catch (_e) {}
  }

  const del = async (id: string) => {
    try { await growthRequest(`/api/growth/reminders/${id}`, { method: 'DELETE' }); load() } catch (_e) {}
  }

  if (loading) return <View style={tab.centered}><ActivityIndicator color={COLORS.primary} /></View>

  const CHANNELS: Record<string, string> = { whatsapp: '💬 واتساب', email: '📧 إيميل', sms: '📱 SMS', push: '🔔 Push' }
  const TRIGGERS: Record<string, string> = { overdue_invoice: 'فاتورة متأخرة', abandoned_link: 'رابط متروك', failed_payment: 'دفعة فاشلة' }

  return (
    <View style={tab.container}>
      <PrimaryBtn label="+ تذكير جديد" onPress={() => setShowForm(!showForm)} />

      {showForm && (
        <Card accent="#06B6D4">
          <SectionTitle title="تذكير جديد" icon="⏰" />
          <InputField label="اسم التذكير" value={form.name} onChangeText={(v: string) => setForm(p => ({ ...p, name: v }))} placeholder="مثال: تذكير الفاتورة المتأخرة" />
          <InputField label="بعد كم يوم؟" value={form.triggerDays} onChangeText={(v: string) => setForm(p => ({ ...p, triggerDays: v }))} keyboard="numeric" />
          <Text style={inf.label}>نوع التذكير</Text>
          <View style={[row.row, isRTL && row.rowRTL]}>
            {Object.entries(TRIGGERS).map(([k, v]) => (
              <TouchableOpacity key={k} style={[chip.btn, form.triggerType === k && chip.active]} onPress={() => setForm(p => ({ ...p, triggerType: k }))}>
                <Text style={[chip.txt, form.triggerType === k && chip.activeTxt]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[inf.label, { marginTop: 8 }]}>القناة</Text>
          <View style={[row.row, isRTL && row.rowRTL]}>
            {Object.entries(CHANNELS).map(([k, v]) => (
              <TouchableOpacity key={k} style={[chip.btn, form.channel === k && chip.active]} onPress={() => setForm(p => ({ ...p, channel: k }))}>
                <Text style={[chip.txt, form.channel === k && chip.activeTxt]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <PrimaryBtn label="حفظ" onPress={create} />
        </Card>
      )}

      {(!data?.reminders?.length) ? (
        <SmartEmptyState type="generic" customTitle="لا تذكيرات" customDesc="أنشئ تذكيراً تلقائياً لمتابعة الفواتير والمدفوعات" showCta={false} />
      ) : data.reminders.map((r: any) => (
        <Card key={r.id} accent="#06B6D4">
          <View style={[row.row, isRTL && row.rowRTL, { justifyContent: 'space-between' }]}>
            <View>
              <Text style={rmd.name}>{r.name}</Text>
              <Text style={rmd.sub}>{TRIGGERS[r.triggerType] || r.triggerType} · {CHANNELS[r.channel] || r.channel} · {r.triggerDays} أيام</Text>
            </View>
            <View style={[row.row, isRTL && row.rowRTL]}>
              <TouchableOpacity style={rmd.sendBtn} onPress={() => sendNow(r.id, r.name)}>
                <Text style={rmd.sendTxt}>إرسال</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => del(r.id)}><Text style={{ fontSize: 18 }}>🗑️</Text></TouchableOpacity>
            </View>
          </View>
        </Card>
      ))}

      {data?.history?.length > 0 && (
        <Card>
          <SectionTitle title="سجل الإرسال" icon="📋" />
          {data.history.slice(0, 5).map((h: any, i: number) => (
            <View key={i} style={[row.row, isRTL && row.rowRTL, { marginBottom: 6, justifyContent: 'space-between' }]}>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{h.reminderName}</Text>
              <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '700' }}>{h.recipientCount} مستقبل</Text>
            </View>
          ))}
        </Card>
      )}
    </View>
  )
}

// ─── 33. Recovery Tab ─────────────────────────────────────────
function RecoveryTab() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    growthRequest('/api/growth/recovery')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const retry = async (txId: string) => {
    try {
      await growthRequest(`/api/growth/recovery/retry/${txId}`, { method: 'POST' })
      Alert.alert('✅', 'تم بدء محاولة الاسترداد')
    } catch (_e) {}
  }

  if (loading) return <View style={tab.centered}><ActivityIndicator color={COLORS.primary} /></View>
  const d = data || { totalRecoverable: 0, failedTransactions: [], overdueInvoices: [], summary: {} }

  return (
    <View style={tab.container}>
      <Card accent="#10B981">
        <View style={[row.row, isRTL && row.rowRTL, { justifyContent: 'space-around' }]}>
          {[
            { label: 'قابل للاسترداد', value: `${(d.totalRecoverable / 1000).toFixed(1)}k ر.س`, color: '#10B981' },
            { label: 'معاملات فاشلة', value: String(d.summary?.failedCount || 0), color: '#EF4444' },
            { label: 'فواتير متأخرة', value: String(d.summary?.overdueCount || 0), color: '#F59E0B' },
          ].map((s, i) => (
            <View key={i} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {d.failedTransactions?.length > 0 && (
        <Card>
          <SectionTitle title="معاملات فاشلة — قابلة للاسترداد" icon="💳" />
          {d.failedTransactions.map((tx: any, i: number) => (
            <View key={i} style={[rcv.row, isRTL && rcv.rowRTL]}>
              <View style={{ flex: 1 }}>
                <Text style={rcv.name}>{tx.customerName}</Text>
                <Text style={rcv.sub}>{tx.transactionId}</Text>
              </View>
              <Text style={rcv.amount}>{Number(tx.amount).toFixed(0)} {tx.currency}</Text>
              <TouchableOpacity style={rcv.btn} onPress={() => retry(tx.id)}>
                <Text style={rcv.btnTxt}>إعادة</Text>
              </TouchableOpacity>
            </View>
          ))}
        </Card>
      )}

      {d.overdueInvoices?.length > 0 && (
        <Card>
          <SectionTitle title="فواتير متأخرة" icon="📄" />
          {d.overdueInvoices.map((inv: any, i: number) => (
            <View key={i} style={[rcv.row, isRTL && rcv.rowRTL]}>
              <View style={{ flex: 1 }}>
                <Text style={rcv.name}>{inv.customerName}</Text>
                <Text style={rcv.sub}>{inv.invoiceId}</Text>
              </View>
              <Text style={[rcv.amount, { color: '#F59E0B' }]}>{Number(inv.total).toFixed(0)} {inv.currency}</Text>
            </View>
          ))}
        </Card>
      )}

      {!d.failedTransactions?.length && !d.overdueInvoices?.length && (
        <SmartEmptyState type="generic" customTitle="لا فرص استرداد" customDesc="كل مدفوعاتك تعمل بشكل ممتاز" showCta={false} />
      )}
    </View>
  )
}

// ─── 34. CRM Tab ──────────────────────────────────────────────
function CRMTab() {
  const [data, setData]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    growthRequest(`/api/growth/crm/customers?limit=20`)
      .then(r => setData(r.data?.customers || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const updateTag = async (id: string, tags: string[]) => {
    try { await growthRequest(`/api/growth/crm/customers/${id}`, { method: 'PATCH', body: JSON.stringify({ tags }) }) } catch (_e) {}
  }

  if (loading) return <View style={tab.centered}><ActivityIndicator color={COLORS.primary} /></View>

  const filtered = data.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  )

  const SEG_COLORS: Record<string, string> = { VIP: '#F59E0B', loyal: '#10B981', active: '#06B6D4', new: '#8B5CF6', at_risk: '#F97316', lost: '#EF4444' }

  return (
    <View style={tab.container}>
      <InputField label="" value={search} onChangeText={setSearch} placeholder="🔍 بحث في العملاء..." />
      {filtered.length === 0 ? (
        <SmartEmptyState type="customers" showCta={false} />
      ) : filtered.map((c: any, i: number) => {
        const seg = c.rfm?.segment || 'active'
        const segColor = SEG_COLORS[seg] || COLORS.primary
        return (
          <Card key={c.id || i} accent={segColor}>
            <View style={[row.row, isRTL && row.rowRTL, { justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}>
                <View style={[row.row, isRTL && row.rowRTL]}>
                  <Text style={crm.name}>{c.name}</Text>
                  <View style={[crm.segBadge, { backgroundColor: `${segColor}20` }]}>
                    <Text style={[crm.segTxt, { color: segColor }]}>{seg}</Text>
                  </View>
                </View>
                <Text style={crm.sub}>{c.phone} {c.city ? `· ${c.city}` : ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[crm.spent, { color: segColor }]}>{Number(c.totalSpent || 0).toFixed(0)} ر.س</Text>
                <Text style={crm.orders}>{c.totalOrders || 0} طلب</Text>
              </View>
            </View>
            {c.notes ? <Text style={crm.notes}>📝 {c.notes}</Text> : null}
          </Card>
        )
      })}
    </View>
  )
}

// ─── 36. Affiliates Tab ───────────────────────────────────────
function AffiliatesTab() {
  const [data, setData]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState({ name: '', email: '', commissionType: 'percent', commissionValue: '5' })

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await growthRequest('/api/growth/affiliates'); setData(r.data?.affiliates || []) } catch (_e) {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [])

  const create = async () => {
    try { await growthRequest('/api/growth/affiliates', { method: 'POST', body: JSON.stringify({ ...form, commissionValue: Number(form.commissionValue) }) }); setShowForm(false); load() } catch (_e) {}
  }

  const del = async (id: string) => {
    try { await growthRequest(`/api/growth/affiliates/${id}`, { method: 'DELETE' }); load() } catch (_e) {}
  }

  if (loading) return <View style={tab.centered}><ActivityIndicator color={COLORS.primary} /></View>

  return (
    <View style={tab.container}>
      <PrimaryBtn label="+ شريك جديد" onPress={() => setShowForm(!showForm)} color="#F59E0B" />

      {showForm && (
        <Card accent="#F59E0B">
          <SectionTitle title="شريك جديد" icon="🤝" />
          <InputField label="الاسم" value={form.name} onChangeText={(v: string) => setForm(p => ({ ...p, name: v }))} placeholder="اسم الشريك" />
          <InputField label="البريد الإلكتروني" value={form.email} onChangeText={(v: string) => setForm(p => ({ ...p, email: v }))} placeholder="email@example.com" keyboard="email-address" />
          <InputField label="نسبة العمولة (%)" value={form.commissionValue} onChangeText={(v: string) => setForm(p => ({ ...p, commissionValue: v }))} keyboard="numeric" />
          <PrimaryBtn label="إنشاء الشريك" onPress={create} color="#F59E0B" />
        </Card>
      )}

      {data.length === 0 ? (
        <SmartEmptyState type="generic" customTitle="لا شركاء بعد" customDesc="أضف شركاء تسويقيين لزيادة مبيعاتك" showCta={false} />
      ) : data.map((a: any, i: number) => (
        <Card key={a.id || i} accent="#F59E0B">
          <View style={[row.row, isRTL && row.rowRTL, { justifyContent: 'space-between' }]}>
            <View>
              <Text style={aff.name}>{a.name}</Text>
              <Text style={aff.code}>🔗 {a.code}</Text>
              <Text style={aff.sub}>{a.email}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={aff.comm}>{a.commissionValue}%</Text>
              <Text style={aff.stats}>{a.totalConversions} تحويل</Text>
              <Text style={[aff.earnings, { color: '#10B981' }]}>{Number(a.totalEarnings || 0).toFixed(0)} ر.س</Text>
              <TouchableOpacity onPress={() => del(a.id)}><Text>🗑️</Text></TouchableOpacity>
            </View>
          </View>
        </Card>
      ))}
    </View>
  )
}

// ─── 37+38. Permissions Tab ────────────────────────────────────
function PermissionsTab() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    growthRequest('/api/growth/permissions')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <View style={tab.centered}><ActivityIndicator color={COLORS.primary} /></View>

  const ROLE_COLORS: Record<string, string> = { ADMIN: '#EF4444', MANAGER: '#F59E0B', ACCOUNTANT: '#06B6D4', VIEWER: '#94A3B8' }
  const ROLE_LABELS: Record<string, string> = { ADMIN: 'مدير كامل', MANAGER: 'مدير', ACCOUNTANT: 'محاسب', VIEWER: 'مشاهد' }
  const PERM_LABELS: Record<string, string> = {
    view: '👁️ مشاهدة', create: '➕ إنشاء', edit: '✏️ تعديل', delete: '🗑️ حذف',
    export: '📤 تصدير', manage_team: '👥 إدارة الفريق', manage_settings: '⚙️ الإعدادات',
  }

  return (
    <View style={tab.container}>
      <Card accent="#EF4444">
        <SectionTitle title="تعريف الأدوار والصلاحيات" icon="🔐" />
        {Object.entries(data?.roleDefinitions || {}).map(([role, perms]: [string, any]) => (
          <View key={role} style={perm.roleRow}>
            <View style={[perm.roleBadge, { backgroundColor: `${ROLE_COLORS[role] || COLORS.primary}20` }]}>
              <Text style={[perm.roleLabel, { color: ROLE_COLORS[role] || COLORS.primary }]}>{ROLE_LABELS[role] || role}</Text>
            </View>
            <View style={perm.permsWrap}>
              {perms.map((p: string) => (
                <View key={p} style={perm.permChip}>
                  <Text style={perm.permTxt}>{PERM_LABELS[p] || p}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle title="أعضاء الفريق" icon="👥" />
        {(!data?.members?.length) ? (
          <Text style={{ color: COLORS.textMuted, textAlign: 'center', padding: 16 }}>لا أعضاء بعد — اذهب لإدارة الفريق</Text>
        ) : data.members.map((m: any, i: number) => (
          <View key={i} style={[perm.memberRow, isRTL && perm.memberRowRTL]}>
            <View style={{ flex: 1 }}>
              <Text style={perm.memberName}>{m.name}</Text>
              <Text style={perm.memberEmail}>{m.email}</Text>
            </View>
            <View style={[perm.roleBadge, { backgroundColor: `${ROLE_COLORS[m.role] || COLORS.primary}20` }]}>
              <Text style={[perm.roleLabel, { color: ROLE_COLORS[m.role] || COLORS.primary }]}>{ROLE_LABELS[m.role] || m.role}</Text>
            </View>
          </View>
        ))}
      </Card>
    </View>
  )
}

// ─── 39. Marketplace Tab ──────────────────────────────────────
function MarketplaceTab() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState({ name: '', email: '', commissionPercent: '10' })

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await growthRequest('/api/growth/marketplace'); setData(r.data) } catch (_e) {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [])

  const createVendor = async () => {
    try { await growthRequest('/api/growth/marketplace/vendor', { method: 'POST', body: JSON.stringify({ ...form, commissionPercent: Number(form.commissionPercent) }) }); setShowForm(false); load() } catch (_e) {}
  }

  if (loading) return <View style={tab.centered}><ActivityIndicator color={COLORS.primary} /></View>

  return (
    <View style={tab.container}>
      <Card accent="#8B5CF6">
        <SectionTitle title="دعم السوق المتعدد البائعين" icon="🏪" />
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 10 }}>
          أضف بائعين متعددين وحدد عمولة لكل منهم. المدفوعات تُوزَّع تلقائياً.
        </Text>
        <PrimaryBtn label="+ بائع جديد" onPress={() => setShowForm(!showForm)} color="#8B5CF6" />
      </Card>

      {showForm && (
        <Card accent="#8B5CF6">
          <InputField label="اسم البائع" value={form.name} onChangeText={(v: string) => setForm(p => ({ ...p, name: v }))} placeholder="اسم المتجر أو البائع" />
          <InputField label="البريد الإلكتروني" value={form.email} onChangeText={(v: string) => setForm(p => ({ ...p, email: v }))} placeholder="vendor@example.com" keyboard="email-address" />
          <InputField label="العمولة (%)" value={form.commissionPercent} onChangeText={(v: string) => setForm(p => ({ ...p, commissionPercent: v }))} keyboard="numeric" />
          <PrimaryBtn label="إضافة البائع" onPress={createVendor} color="#8B5CF6" />
        </Card>
      )}

      {(!data?.vendors?.length) ? (
        <SmartEmptyState type="generic" customTitle="لا بائعين" customDesc="أضف بائعين لتفعيل السوق المتعدد" showCta={false} />
      ) : data.vendors.map((v: any, i: number) => (
        <Card key={v.id || i} accent="#8B5CF6">
          <View style={[row.row, isRTL && row.rowRTL, { justifyContent: 'space-between' }]}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }}>{v.name}</Text>
              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>{v.email}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#8B5CF6' }}>{v.commissionPercent}%</Text>
              <Text style={{ fontSize: 11, color: COLORS.textMuted }}>عمولة</Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  )
}

// ─── 40. Split Payments Tab ────────────────────────────────────
function SplitTab() {
  const [rules, setRules]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [calcAmount, setCalcAmount] = useState('1000')
  const [result, setResult]   = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [ruleName, setRuleName] = useState('')

  useEffect(() => {
    growthRequest('/api/growth/split/rules')
      .then(r => setRules(r.data?.rules || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const calculate = async () => {
    try {
      const r = await growthRequest('/api/growth/split/calculate', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(calcAmount),
          currency: 'SAR',
          vendors: [
            { vendorId: 'v1', name: 'البائع الأول', type: 'percent', value: 60 },
            { vendorId: 'v2', name: 'البائع الثاني', type: 'percent', value: 30 },
          ],
        }),
      })
      setResult(r.data)
    } catch (_e) {}
  }

  if (loading) return <View style={tab.centered}><ActivityIndicator color={COLORS.primary} /></View>

  return (
    <View style={tab.container}>
      <Card accent="#06B6D4">
        <SectionTitle title="حاسبة تقسيم المدفوعات" icon="✂️" />
        <InputField label="المبلغ الإجمالي (ر.س)" value={calcAmount} onChangeText={setCalcAmount} keyboard="numeric" />
        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>مثال: 60% للبائع الأول، 30% للثاني، 10% للمنصة</Text>
        <PrimaryBtn label="احسب التقسيم" onPress={calculate} />
        {result && (
          <View style={{ marginTop: 12, gap: 6 }}>
            {result.splits?.map((s: any, i: number) => (
              <View key={i} style={[split.row, isRTL && split.rowRTL]}>
                <Text style={split.vendor}>{s.vendorName}</Text>
                <Text style={split.amount}>{s.amount} {s.currency}</Text>
              </View>
            ))}
            <View style={[split.row, isRTL && split.rowRTL, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 6, marginTop: 4 }]}>
              <Text style={[split.vendor, { color: COLORS.primary }]}>المنصة (Zyrix)</Text>
              <Text style={[split.amount, { color: COLORS.primary }]}>{result.platformAmount} {result.currency}</Text>
            </View>
          </View>
        )}
      </Card>

      {rules.length > 0 && (
        <Card>
          <SectionTitle title="قواعد التقسيم المحفوظة" icon="📋" />
          {rules.map((r: any, i: number) => (
            <View key={i} style={[row.row, isRTL && row.rowRTL, { justifyContent: 'space-between', marginBottom: 6 }]}>
              <Text style={{ fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' }}>{r.name}</Text>
              <Text style={{ fontSize: 11, color: r.isActive ? '#10B981' : COLORS.textMuted }}>{r.isActive ? '🟢 نشط' : '⭕ متوقف'}</Text>
            </View>
          ))}
        </Card>
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────
const tab   = StyleSheet.create({ container: { gap: 0 }, centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 } })
const row   = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, rowRTL: { flexDirection: 'row-reverse' } })
const chip  = StyleSheet.create({ btn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceBg }, active: { borderColor: '#06B6D4', backgroundColor: 'rgba(6,182,212,0.1)' }, txt: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' }, activeTxt: { color: '#06B6D4' } })
const rmd   = StyleSheet.create({ name: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }, sub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 }, sendBtn: { backgroundColor: '#06B6D4', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }, sendTxt: { color: COLORS.white, fontSize: 12, fontWeight: '700' } })
const rcv   = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border }, rowRTL: { flexDirection: 'row-reverse' }, name: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary }, sub: { fontSize: 11, color: COLORS.textMuted }, amount: { fontSize: 13, fontWeight: '800', color: '#EF4444' }, btn: { backgroundColor: '#10B981', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }, btnTxt: { color: COLORS.white, fontSize: 12, fontWeight: '700' } })
const crm   = StyleSheet.create({ name: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }, sub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 }, segBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }, segTxt: { fontSize: 10, fontWeight: '700' }, spent: { fontSize: 15, fontWeight: '800' }, orders: { fontSize: 11, color: COLORS.textMuted }, notes: { fontSize: 12, color: COLORS.textMuted, marginTop: 6, fontStyle: 'italic' } })
const aff   = StyleSheet.create({ name: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }, code: { fontSize: 11, color: '#F59E0B', fontWeight: '600', marginTop: 2 }, sub: { fontSize: 11, color: COLORS.textMuted }, comm: { fontSize: 16, fontWeight: '800', color: '#F59E0B' }, stats: { fontSize: 11, color: COLORS.textMuted }, earnings: { fontSize: 12, fontWeight: '700' } })
const perm  = StyleSheet.create({ roleRow: { marginBottom: 12 }, roleBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 6 }, roleLabel: { fontSize: 12, fontWeight: '700' }, permsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 }, permChip: { backgroundColor: COLORS.surfaceBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }, permTxt: { fontSize: 11, color: COLORS.textSecondary }, memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }, memberRowRTL: { flexDirection: 'row-reverse' }, memberName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary }, memberEmail: { fontSize: 11, color: COLORS.textMuted } })
const split = StyleSheet.create({ row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, rowRTL: { flexDirection: 'row-reverse' }, vendor: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' }, amount: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary } })

// ─── Main Screen ──────────────────────────────────────────────
export default function GrowthAutomationScreen() {
  const tabBarHeight           = useTabBarHeight()
  const [activeTab, setActiveTab] = useState<TabKey>('reminders')

  return (
    <SafeAreaView style={s.safe}>
      <InnerHeader title="النمو والأتمتة" accentColor="#10B981" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll} contentContainerStyle={s.tabContent}>
        {TABS.map(tb => (
          <TouchableOpacity key={tb.key} style={[s.tabBtn, activeTab === tb.key && s.tabBtnActive]} onPress={() => setActiveTab(tb.key)}>
            <Text style={s.tabIcon}>{tb.icon}</Text>
            <Text style={[s.tabLabel, activeTab === tb.key && s.tabLabelActive]}>{tb.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabBarHeight + 16 }]} showsVerticalScrollIndicator={false}>
        <View style={s.body}>
          {activeTab === 'reminders'   && <RemindersTab />}
          {activeTab === 'recovery'    && <RecoveryTab />}
          {activeTab === 'crm'         && <CRMTab />}
          {activeTab === 'affiliates'  && <AffiliatesTab />}
          {activeTab === 'permissions' && <PermissionsTab />}
          {activeTab === 'marketplace' && <MarketplaceTab />}
          {activeTab === 'split'       && <SplitTab />}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.darkBg },
  tabScroll:     { maxHeight: 56, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabContent:    { paddingHorizontal: 12, gap: 6, alignItems: 'center', paddingVertical: 8 },
  tabBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.cardBg },
  tabBtnActive:  { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.12)' },
  tabIcon:       { fontSize: 13 },
  tabLabel:      { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  tabLabelActive:{ color: '#10B981' },
  scroll:        {},
  body:          { padding: 16 },
})