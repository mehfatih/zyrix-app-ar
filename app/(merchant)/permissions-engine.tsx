import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const ROLE_COLORS: Record<string, string> = {
  admin: '#EF4444', manager: '#6366F1', accountant: '#10B981',
  viewer: '#94A3B8', custom: '#8B5CF6',
};

export default function PermissionsEngineScreen() {
  const router = useRouter();
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.permissionsEngine.getRoles();
      const r = (res as any).data?.roles ?? [];
      setRoles(r);
      if (r.length) setSelectedRole(r[0]);
    } catch { } finally { setLoading(false); }
  };

  const getPermissions = (role: any): string[] => {
    try {
      return Array.isArray(role.permissions)
        ? role.permissions
        : JSON.parse(role.permissions ?? '[]');
    } catch { return []; }
  };

  const getPermColor = (perm: string) => {
    if (perm === '*') return '#EF4444';
    if (perm.includes(':*')) return '#F59E0B';
    if (perm.includes(':read')) return '#10B981';
    return '#6366F1';
  };

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator color="#6366F1" style={{ flex: 1 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>محرك الصلاحيات</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.sectionTitle}>الأدوار المتاحة ({roles.length})</Text>

        {/* Role cards */}
        {roles.map((role: any) => {
          const perms = getPermissions(role);
          const isSelected = selectedRole?.id === role.id;
          return (
            <TouchableOpacity
              key={role.id}
              style={[s.roleCard, isSelected && s.roleCardSelected]}
              onPress={() => setSelectedRole(role)}
            >
              <View style={s.roleHeader}>
                <View style={[s.roleIcon, { backgroundColor: (ROLE_COLORS[role.name] ?? '#6366F1') + '22' }]}>
                  <Ionicons name="shield-checkmark" size={18} color={ROLE_COLORS[role.name] ?? '#6366F1'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.roleName}>{role.name}</Text>
                  {role.description && <Text style={s.roleDesc}>{role.description}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.permCount}>{perms.length} صلاحية</Text>
                  {role.is_system && (
                    <View style={s.systemBadge}>
                      <Text style={s.systemBadgeText}>نظام</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Permissions preview */}
              {isSelected && (
                <View style={s.permsContainer}>
                  <Text style={s.permsTitle}>الصلاحيات:</Text>
                  <View style={s.permsList}>
                    {perms.map((perm: string, i: number) => (
                      <View key={i} style={[s.permChip, { backgroundColor: getPermColor(perm) + '22' }]}>
                        <Text style={[s.permChipText, { color: getPermColor(perm) }]}>{perm}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Resources Guide */}
        <Text style={[s.sectionTitle, { marginTop: 24 }]}>الموارد المتاحة</Text>
        <View style={s.resourceGrid}>
          {[
            { name: 'transactions', icon: 'swap-horizontal', color: '#6366F1' },
            { name: 'invoices', icon: 'document-text', color: '#10B981' },
            { name: 'customers', icon: 'people', color: '#3B82F6' },
            { name: 'analytics', icon: 'bar-chart', color: '#F59E0B' },
            { name: 'settlements', icon: 'wallet', color: '#8B5CF6' },
            { name: 'reports', icon: 'stats-chart', color: '#EF4444' },
            { name: 'expenses', icon: 'receipt', color: '#EC4899' },
            { name: 'team', icon: 'people-circle', color: '#14B8A6' },
          ].map(r => (
            <View key={r.name} style={s.resourceCard}>
              <View style={[s.resourceIcon, { backgroundColor: r.color + '22' }]}>
                <Ionicons name={r.icon as any} size={18} color={r.color} />
              </View>
              <Text style={s.resourceName}>{r.name}</Text>
              <View style={s.actionRow}>
                {['read','*'].map(a => (
                  <View key={a} style={[s.actionChip, { backgroundColor: getPermColor(`${r.name}:${a}`) + '22' }]}>
                    <Text style={[s.actionChipText, { color: getPermColor(`${r.name}:${a}`) }]}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: '#0F172A' },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle:       { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },
  scroll:            { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle:      { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginBottom: 12, marginTop: 8 },
  roleCard:          { backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'transparent' },
  roleCardSelected:  { borderColor: '#6366F1' },
  roleHeader:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roleIcon:          { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  roleName:          { fontSize: 15, fontWeight: '700', color: '#F8FAFC', textTransform: 'capitalize' },
  roleDesc:          { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  permCount:         { fontSize: 12, color: '#6366F1', fontWeight: '600' },
  systemBadge:       { backgroundColor: '#F59E0B22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  systemBadgeText:   { fontSize: 10, color: '#F59E0B', fontWeight: '600' },
  permsContainer:    { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  permsTitle:        { fontSize: 11, color: '#94A3B8', marginBottom: 8 },
  permsList:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  permChip:          { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  permChipText:      { fontSize: 11, fontWeight: '600' },
  resourceGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  resourceCard:      { width: '47%', backgroundColor: '#1E293B', borderRadius: 12, padding: 12, gap: 6 },
  resourceIcon:      { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  resourceName:      { fontSize: 12, fontWeight: '600', color: '#F8FAFC' },
  actionRow:         { flexDirection: 'row', gap: 4 },
  actionChip:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  actionChipText:    { fontSize: 10, fontWeight: '600' },
});