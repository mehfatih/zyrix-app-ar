import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const PROVIDERS: Record<string, { color: string; icon: string }> = {
  HUBSPOT:    { color: '#FF7A59', icon: 'business' },
  SALESFORCE: { color: '#00A1E0', icon: 'cloud' },
  ZAPIER:     { color: '#FF4A00', icon: 'flash' },
  ZOHO:       { color: '#E42527', icon: 'briefcase' },
  CUSTOM:     { color: '#6366F1', icon: 'code-slash' },
};

export default function CRMIntegrationScreen() {
  const router = useRouter();
  const [connections, setConnections] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'connections'|'logs'>('connections');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cRes, lRes] = await Promise.all([
        api.crmIntegration.getConnections(),
        api.crmIntegration.getSyncLogs(),
      ]);
      setConnections((cRes as any).data?.connections ?? []);
      setLogs((lRes as any).data?.logs ?? []);
    } catch { } finally { setLoading(false); }
  };

  const syncNow = async (id: string) => {
    try {
      await api.crmIntegration.sync(id, { event_type: 'MANUAL_SYNC', payload: {} });
      loadData();
    } catch { }
  };

  const deleteConnection = async (id: string) => {
    try {
      await api.crmIntegration.deleteConnection(id);
      setConnections(prev => prev.filter(c => c.id !== id));
    } catch { }
  };

  const statusColor = (s: string) => s === 'active' ? '#10B981' : s === 'error' ? '#EF4444' : '#F59E0B';

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <ActivityIndicator color="#6366F1" style={{ flex: 1 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>تكامل CRM</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        <View style={s.summaryBox}>
          <Text style={s.sumNum}>{connections.length}</Text>
          <Text style={s.sumLbl}>اتصالات</Text>
        </View>
        <View style={s.summaryBox}>
          <Text style={[s.sumNum, { color: '#10B981' }]}>
            {connections.filter(c => c.status === 'active').length}
          </Text>
          <Text style={s.sumLbl}>نشطة</Text>
        </View>
        <View style={s.summaryBox}>
          <Text style={s.sumNum}>{logs.length}</Text>
          <Text style={s.sumLbl}>عمليات sync</Text>
        </View>
      </View>

      <View style={s.tabs}>
        {(['connections','logs'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab===t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab===t && s.tabTextActive]}>
              {t==='connections' ? 'الاتصالات' : 'سجل المزامنة'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {tab === 'connections' && (
          <>
            <Text style={s.sectionTitle}>الاتصالات المربوطة ({connections.length})</Text>
            {connections.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="link-outline" size={44} color="#475569" />
                <Text style={s.emptyTitle}>لا توجد اتصالات</Text>
                <Text style={s.emptyText}>اربط HubSpot أو Salesforce أو Zapier</Text>
              </View>
            )}
            {connections.map((c: any) => {
              const pInfo = PROVIDERS[c.provider] ?? PROVIDERS.CUSTOM;
              return (
                <View key={c.id} style={s.card}>
                  <View style={[s.provIcon, { backgroundColor: pInfo.color + '22' }]}>
                    <Ionicons name={pInfo.icon as any} size={22} color={pInfo.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.connName}>{c.label}</Text>
                    <Text style={s.connProvider}>{c.provider}</Text>
                    {c.last_sync_at && (
                      <Text style={s.connSync}>
                        آخر مزامنة: {new Date(c.last_sync_at).toLocaleString('ar')}
                      </Text>
                    )}
                  </View>
                  <View style={{ gap: 8, alignItems: 'flex-end' }}>
                    <View style={[s.badge, { backgroundColor: statusColor(c.status) + '22' }]}>
                      <Text style={[s.badgeText, { color: statusColor(c.status) }]}>{c.status}</Text>
                    </View>
                    <TouchableOpacity onPress={() => syncNow(c.id)}>
                      <Ionicons name="sync-outline" size={18} color="#6366F1" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => deleteConnection(c.id)} style={{ marginLeft: 4 }}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* Available Providers */}
            <Text style={[s.sectionTitle, { marginTop: 20 }]}>الأنظمة المتاحة</Text>
            <View style={s.providerGrid}>
              {Object.entries(PROVIDERS).map(([key, val]) => (
                <View key={key} style={s.providerCard}>
                  <View style={[s.provIcon, { backgroundColor: val.color + '22' }]}>
                    <Ionicons name={val.icon as any} size={20} color={val.color} />
                  </View>
                  <Text style={s.provName}>{key}</Text>
                  <View style={[s.badge, { backgroundColor: '#6366F122', marginTop: 4 }]}>
                    <Text style={[s.badgeText, { color: '#6366F1' }]}>Elite</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {tab === 'logs' && (
          <>
            <Text style={s.sectionTitle}>سجل المزامنة ({logs.length})</Text>
            {logs.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="list-outline" size={40} color="#475569" />
                <Text style={s.emptyText}>لا توجد سجلات</Text>
              </View>
            )}
            {logs.map((log: any) => (
              <View key={log.id} style={s.logRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.connName}>{log.event_type}</Text>
                  <Text style={s.connSync}>{new Date(log.synced_at).toLocaleString('ar')}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: log.status==='success' ? '#10B98122' : '#EF444422' }]}>
                  <Text style={[s.badgeText, { color: log.status==='success' ? '#10B981' : '#EF4444' }]}>
                    {log.status}
                  </Text>
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
  summaryRow:    { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, gap: 10 },
  summaryBox:    { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 14, alignItems: 'center' },
  sumNum:        { fontSize: 22, fontWeight: '700', color: '#F8FAFC' },
  sumLbl:        { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  tabs:          { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#1E293B', borderRadius: 12, padding: 4, marginBottom: 8 },
  tab:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive:     { backgroundColor: '#6366F1' },
  tabText:       { fontSize: 13, color: '#94A3B8' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  scroll:        { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle:  { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginBottom: 12, marginTop: 8 },
  card:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 10, gap: 12 },
  provIcon:      { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  connName:      { fontSize: 14, fontWeight: '700', color: '#F8FAFC', marginBottom: 2 },
  connProvider:  { fontSize: 11, color: '#6366F1' },
  connSync:      { fontSize: 11, color: '#475569', marginTop: 2 },
  logRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 8 },
  badge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:     { fontSize: 11, fontWeight: '600' },
  emptyCard:     { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#1E293B', borderRadius: 14, gap: 10 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  emptyText:     { fontSize: 13, color: '#475569', textAlign: 'center' },
  providerGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  providerCard:  { width: '30%', backgroundColor: '#1E293B', borderRadius: 12, padding: 12, alignItems: 'center', gap: 6 },
  provName:      { fontSize: 10, fontWeight: '600', color: '#94A3B8' },
});