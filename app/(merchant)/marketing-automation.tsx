import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const STATUS_COLORS: Record<string, string> = {
  draft: '#94A3B8', active: '#10B981', paused: '#F59E0B',
  completed: '#6366F1', archived: '#475569',
};
const STATUS_AR: Record<string, string> = {
  draft: 'مسودة', active: 'نشط', paused: 'متوقف',
  completed: 'مكتمل', archived: 'مؤرشف',
};
const TYPE_COLORS: Record<string, string> = {
  EMAIL: '#6366F1', WHATSAPP: '#25D366', SMS: '#F59E0B', PUSH: '#3B82F6', MULTI: '#8B5CF6',
};

export default function MarketingAutomationScreen() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'campaigns'|'automations'>('campaigns');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cRes, aRes] = await Promise.all([
        api.marketingAutomation.getCampaigns(),
        api.marketingAutomation.getAutomations(),
      ]);
      setCampaigns((cRes as any).data?.campaigns ?? []);
      setAutomations((aRes as any).data?.automations ?? []);
      setStats((cRes as any).data?.stats ?? null);
    } catch { } finally { setLoading(false); }
  };

  const toggleAutomation = async (id: string) => {
    try {
      await api.marketingAutomation.toggleAutomation(id);
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
    } catch { }
  };

  const sendCampaign = async (id: string) => {
    try {
      await api.marketingAutomation.sendCampaign(id, { recipients_count: 100 });
      loadData();
    } catch { }
  };

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
        <Text style={s.headerTitle}>التسويق الآلي</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* KPIs */}
      {stats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.kpiScroll} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
          {[
            { label: 'حملات', val: stats.total ?? 0, color: '#6366F1' },
            { label: 'أُرسل', val: (stats.total_sent ?? 0).toLocaleString(), color: '#3B82F6' },
            { label: 'فُتح', val: (stats.total_opens ?? 0).toLocaleString(), color: '#10B981' },
            { label: 'نسبة الفتح', val: `${stats.avg_open_rate ?? 0}%`, color: '#F59E0B' },
            { label: 'تحويل', val: stats.total_conversions ?? 0, color: '#8B5CF6' },
          ].map(kpi => (
            <View key={kpi.label} style={s.kpiBox}>
              <Text style={[s.kpiVal, { color: kpi.color }]}>{kpi.val}</Text>
              <Text style={s.kpiLabel}>{kpi.label}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={s.tabs}>
        {(['campaigns','automations'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab===t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab===t && s.tabTextActive]}>
              {t==='campaigns' ? `الحملات (${campaigns.length})` : `الأتمتة (${automations.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {tab === 'campaigns' && (
          <>
            <Text style={s.sectionTitle}>الحملات التسويقية</Text>
            {campaigns.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="megaphone-outline" size={44} color="#475569" />
                <Text style={s.emptyTitle}>لا توجد حملات</Text>
                <Text style={s.emptyText}>أنشئ حملتك التسويقية الأولى</Text>
              </View>
            )}
            {campaigns.map((c: any) => (
              <View key={c.id} style={s.card}>
                <View style={[s.typeDot, { backgroundColor: TYPE_COLORS[c.type] ?? '#6366F1' }]}>
                  <Ionicons name="megaphone" size={14} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{c.name}</Text>
                  <Text style={s.cardMeta}>{c.type} · {c.trigger_type}</Text>
                  <View style={s.metricsRow}>
                    <Text style={s.metric}>📤 {c.sent_count}</Text>
                    <Text style={s.metric}>👁 {c.open_count}</Text>
                    <Text style={s.metric}>🖱 {c.click_count}</Text>
                    <Text style={s.metric}>✅ {c.conversion_count}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <View style={[s.badge, { backgroundColor: (STATUS_COLORS[c.status] ?? '#94A3B8') + '22' }]}>
                    <Text style={[s.badgeText, { color: STATUS_COLORS[c.status] ?? '#94A3B8' }]}>
                      {STATUS_AR[c.status] ?? c.status}
                    </Text>
                  </View>
                  {c.status === 'draft' && (
                    <TouchableOpacity style={s.sendBtn} onPress={() => sendCampaign(c.id)}>
                      <Text style={s.sendBtnText}>إرسال</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'automations' && (
          <>
            <Text style={s.sectionTitle}>قواعد الأتمتة</Text>
            {automations.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="git-network-outline" size={44} color="#475569" />
                <Text style={s.emptyTitle}>لا توجد أتمتة</Text>
                <Text style={s.emptyText}>أنشئ قاعدة تشغّل تلقائياً بناءً على سلوك العميل</Text>
              </View>
            )}
            {automations.map((a: any) => (
              <View key={a.id} style={s.card}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{a.name}</Text>
                  <Text style={s.cardMeta}>Trigger: {a.trigger_event}</Text>
                  <Text style={s.cardMeta}>تشغيل: {a.run_count} مرة</Text>
                </View>
                <TouchableOpacity
                  style={[s.toggleBtn, { backgroundColor: a.active ? '#10B98122' : '#33415522' }]}
                  onPress={() => toggleAutomation(a.id)}
                >
                  <Ionicons
                    name={a.active ? 'pause-circle' : 'play-circle'}
                    size={20}
                    color={a.active ? '#10B981' : '#94A3B8'}
                  />
                </TouchableOpacity>
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
  kpiScroll:     { maxHeight: 80, marginBottom: 8 },
  kpiBox:        { backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', minWidth: 80 },
  kpiVal:        { fontSize: 18, fontWeight: '700' },
  kpiLabel:      { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  tabs:          { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#1E293B', borderRadius: 12, padding: 4, marginBottom: 8 },
  tab:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive:     { backgroundColor: '#6366F1' },
  tabText:       { fontSize: 13, color: '#94A3B8' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  scroll:        { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle:  { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginBottom: 12, marginTop: 8 },
  card:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 10, gap: 12 },
  typeDot:       { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle:     { fontSize: 14, fontWeight: '700', color: '#F8FAFC', marginBottom: 2 },
  cardMeta:      { fontSize: 11, color: '#94A3B8' },
  metricsRow:    { flexDirection: 'row', gap: 8, marginTop: 4 },
  metric:        { fontSize: 11, color: '#94A3B8' },
  badge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:     { fontSize: 11, fontWeight: '600' },
  sendBtn:       { backgroundColor: '#6366F1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  sendBtnText:   { fontSize: 12, fontWeight: '600', color: '#fff' },
  toggleBtn:     { padding: 8, borderRadius: 10 },
  emptyCard:     { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#1E293B', borderRadius: 14, gap: 10 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  emptyText:     { fontSize: 13, color: '#475569', textAlign: 'center' },
});