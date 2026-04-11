import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const ROLE_COLORS: Record<string, string> = {
  owner: '#F59E0B', admin: '#EF4444', manager: '#6366F1',
  accountant: '#10B981', viewer: '#94A3B8', custom: '#8B5CF6',
};
const ROLE_AR: Record<string, string> = {
  owner: 'المالك', admin: 'مدير', manager: 'مشرف',
  accountant: 'محاسب', viewer: 'مشاهد', custom: 'مخصص',
};
const STATUS_COLORS: Record<string, string> = {
  active: '#10B981', inactive: '#94A3B8', pending: '#F59E0B', suspended: '#EF4444',
};

export default function TeamAccountsScreen() {
  const router = useRouter();
  const [account, setAccount] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'members'|'activity'>('members');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tRes, aRes] = await Promise.all([
        api.teamAccounts.getAccount(),
        api.teamAccounts.getActivityLogs(),
      ]);
      setAccount((tRes as any).data?.account);
      setMembers((tRes as any).data?.members ?? []);
      setLogs((aRes as any).data?.logs ?? []);
      const m = (tRes as any).data?.members ?? [];
      setStats({
        total: m.length,
        active: m.filter((x: any) => x.status === 'active').length,
        pending: m.filter((x: any) => x.status === 'pending').length,
      });
    } catch { } finally { setLoading(false); }
  };

  const removeMember = async (id: string, role: string) => {
    if (role === 'owner') return;
    try {
      await api.teamAccounts.removeMember(id);
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch { }
  };

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator color="#6366F1" style={{ flex: 1 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>إدارة الفريق</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Plan Card */}
      {account && (
        <View style={s.planCard}>
          <View style={s.planLeft}>
            <Text style={s.planLabel}>الخطة الحالية</Text>
            <Text style={s.planName}>{account.plan?.toUpperCase()}</Text>
          </View>
          <View style={s.planRight}>
            <Text style={s.planStat}>{members.length} / {account.max_members}</Text>
            <Text style={s.planStatLabel}>أعضاء</Text>
          </View>
        </View>
      )}

      {/* Stats */}
      {stats && (
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{stats.total}</Text>
            <Text style={s.statLbl}>إجمالي</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statNum, { color: '#10B981' }]}>{stats.active}</Text>
            <Text style={s.statLbl}>نشط</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statNum, { color: '#F59E0B' }]}>{stats.pending}</Text>
            <Text style={s.statLbl}>معلق</Text>
          </View>
        </View>
      )}

      <View style={s.tabs}>
        {(['members','activity'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab===t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab===t && s.tabTextActive]}>
              {t === 'members' ? `الأعضاء (${members.length})` : 'سجل النشاط'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {tab === 'members' && (
          <>
            {members.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="people-outline" size={44} color="#475569" />
                <Text style={s.emptyTitle}>لا يوجد أعضاء</Text>
                <Text style={s.emptyText}>ادعُ زملاءك للعمل معاً</Text>
              </View>
            )}
            {members.map((m: any) => (
              <View key={m.id} style={s.card}>
                <View style={[s.avatar, { backgroundColor: (ROLE_COLORS[m.role] ?? '#6366F1') + '22' }]}>
                  <Text style={[s.avatarText, { color: ROLE_COLORS[m.role] ?? '#6366F1' }]}>
                    {m.name?.charAt(0) ?? '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.memberName}>{m.name}</Text>
                  <Text style={s.memberEmail}>{m.email}</Text>
                  <View style={s.roleRow}>
                    <View style={[s.roleBadge, { backgroundColor: (ROLE_COLORS[m.role] ?? '#6366F1') + '22' }]}>
                      <Text style={[s.roleBadgeText, { color: ROLE_COLORS[m.role] ?? '#6366F1' }]}>
                        {ROLE_AR[m.role] ?? m.role}
                      </Text>
                    </View>
                    <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[m.status] ?? '#94A3B8' }]} />
                  </View>
                </View>
                {m.role !== 'owner' && (
                  <TouchableOpacity onPress={() => removeMember(m.id, m.role)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}

        {tab === 'activity' && (
          <>
            <Text style={s.sectionTitle}>آخر الأنشطة</Text>
            {logs.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="time-outline" size={40} color="#475569" />
                <Text style={s.emptyText}>لا توجد أنشطة</Text>
              </View>
            )}
            {logs.map((log: any) => (
              <View key={log.id} style={s.logRow}>
                <View style={s.logIcon}>
                  <Ionicons name="flash" size={14} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.logAction}>{log.action}</Text>
                  <Text style={s.logMember}>{log.member_name ?? log.member_id}</Text>
                  <Text style={s.logDate}>{new Date(log.performed_at).toLocaleString('ar')}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#0F172A' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle:   { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },
  planCard:      { marginHorizontal: 20, marginBottom: 12, backgroundColor: '#1E293B', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  planLeft:      { flex: 1 },
  planLabel:     { fontSize: 11, color: '#94A3B8' },
  planName:      { fontSize: 20, fontWeight: '700', color: '#6366F1', marginTop: 2 },
  planRight:     { alignItems: 'flex-end' },
  planStat:      { fontSize: 22, fontWeight: '700', color: '#F8FAFC' },
  planStatLabel: { fontSize: 11, color: '#94A3B8' },
  statsRow:      { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, gap: 10 },
  statBox:       { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 14, alignItems: 'center' },
  statNum:       { fontSize: 20, fontWeight: '700', color: '#F8FAFC' },
  statLbl:       { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  tabs:          { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#1E293B', borderRadius: 12, padding: 4, marginBottom: 8 },
  tab:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive:     { backgroundColor: '#6366F1' },
  tabText:       { fontSize: 13, color: '#94A3B8' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  scroll:        { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle:  { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginBottom: 12, marginTop: 8 },
  card:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 10, gap: 12 },
  avatar:        { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontSize: 18, fontWeight: '700' },
  memberName:    { fontSize: 14, fontWeight: '700', color: '#F8FAFC', marginBottom: 2 },
  memberEmail:   { fontSize: 11, color: '#94A3B8', marginBottom: 6 },
  roleRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleBadge:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
  statusDot:     { width: 7, height: 7, borderRadius: 4 },
  logRow:        { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 8, gap: 10 },
  logIcon:       { width: 28, height: 28, borderRadius: 8, backgroundColor: '#6366F122', alignItems: 'center', justifyContent: 'center' },
  logAction:     { fontSize: 13, fontWeight: '600', color: '#F8FAFC', marginBottom: 2 },
  logMember:     { fontSize: 11, color: '#6366F1' },
  logDate:       { fontSize: 11, color: '#475569', marginTop: 2 },
  emptyCard:     { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#1E293B', borderRadius: 14, gap: 10 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  emptyText:     { fontSize: 13, color: '#475569', textAlign: 'center' },
});