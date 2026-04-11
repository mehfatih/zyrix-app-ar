import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const CHANNELS = [
  { key: 'PUSH',      icon: 'notifications',    labelAr: 'إشعارات Push',  color: '#6366F1' },
  { key: 'EMAIL',     icon: 'mail',             labelAr: 'البريد الإلكتروني', color: '#10B981' },
  { key: 'WHATSAPP',  icon: 'logo-whatsapp',    labelAr: 'واتساب',         color: '#25D366' },
  { key: 'SMS',       icon: 'chatbubble',       labelAr: 'رسائل SMS',      color: '#F59E0B' },
];

const EVENT_TYPES = ['PAYMENT_RECEIVED','PAYMENT_FAILED','INVOICE_DUE','SUBSCRIPTION_RENEWED','PAYOUT_READY'];

export default function AdvancedNotificationsScreen() {
  const router = useRouter();
  const [channels, setChannels] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'channels'|'templates'|'logs'>('channels');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [chRes, tmRes, logRes] = await Promise.all([
        api.advancedNotifications.getChannels(),
        api.advancedNotifications.getTemplates(),
        api.advancedNotifications.getLogs(),
      ]);
      setChannels((chRes as any).data?.channels ?? []);
      setTemplates((tmRes as any).data?.templates ?? []);
      setLogs((logRes as any).data?.logs ?? []);
      setStats((logRes as any).data?.stats ?? []);
    } catch { } finally { setLoading(false); }
  };

  const toggleChannel = async (channelKey: string, current: boolean) => {
    try {
      await api.advancedNotifications.upsertChannel({ channel: channelKey, enabled: !current });
      setChannels(prev => prev.map(c => c.channel === channelKey ? { ...c, enabled: !current } : c));
    } catch { }
  };

  const getChannelState = (key: string) => {
    const found = channels.find(c => c.channel === key);
    return found ? found.enabled : true;
  };

  const getStatusColor = (s: string) => s === 'delivered' ? '#10B981' : s === 'failed' ? '#EF4444' : '#6366F1';

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <ActivityIndicator color="#6366F1" style={{ flex: 1 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>الإشعارات المتقدمة</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['channels','templates','logs'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab===t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab===t && s.tabTextActive]}>
              {t==='channels'?'القنوات':t==='templates'?'القوالب':'السجلات'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {/* ── Channels ── */}
        {tab === 'channels' && (
          <>
            <Text style={s.sectionTitle}>قنوات الإشعار</Text>
            {CHANNELS.map(ch => (
              <View key={ch.key} style={s.card}>
                <View style={[s.channelIcon, { backgroundColor: ch.color + '22' }]}>
                  <Ionicons name={ch.icon as any} size={22} color={ch.color} />
                </View>
                <Text style={s.channelLabel}>{ch.labelAr}</Text>
                <Switch
                  value={getChannelState(ch.key)}
                  onValueChange={v => toggleChannel(ch.key, !v)}
                  trackColor={{ false: '#334155', true: '#6366F1' }}
                  thumbColor="#fff"
                />
              </View>
            ))}

            {/* Stats */}
            {stats.length > 0 && (
              <>
                <Text style={[s.sectionTitle, { marginTop: 20 }]}>إحصائيات التسليم</Text>
                {stats.map((st: any) => (
                  <View key={st.channel} style={s.statRow}>
                    <Text style={s.statLabel}>{st.channel}</Text>
                    <Text style={s.statVal}>إجمالي: {st.total}</Text>
                    <Text style={[s.statVal, { color: '#10B981' }]}>وصل: {st.delivered}</Text>
                    <Text style={[s.statVal, { color: '#EF4444' }]}>فشل: {st.failed}</Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {/* ── Templates ── */}
        {tab === 'templates' && (
          <>
            <Text style={s.sectionTitle}>قوالب الإشعار ({templates.length})</Text>
            {templates.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="document-text-outline" size={40} color="#475569" />
                <Text style={s.emptyText}>لا توجد قوالب بعد</Text>
              </View>
            )}
            {templates.map((t: any) => (
              <View key={t.id} style={s.card}>
                <View style={{ flex: 1 }}>
                  <Text style={s.tmplName}>{t.name}</Text>
                  <Text style={s.tmplMeta}>{t.event_type} · {t.channel}</Text>
                  <Text style={s.tmplBody} numberOfLines={2}>{t.body_ar}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: t.active ? '#10B98122' : '#EF444422' }]}>
                  <Text style={[s.badgeText, { color: t.active ? '#10B981' : '#EF4444' }]}>
                    {t.active ? 'فعّال' : 'معطل'}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── Logs ── */}
        {tab === 'logs' && (
          <>
            <Text style={s.sectionTitle}>سجل الإشعارات ({logs.length})</Text>
            {logs.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="list-outline" size={40} color="#475569" />
                <Text style={s.emptyText}>لا توجد سجلات</Text>
              </View>
            )}
            {logs.map((log: any) => (
              <View key={log.id} style={s.logRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.logEvent}>{log.event_type}</Text>
                  <Text style={s.logRecipient}>{log.recipient} · {log.channel}</Text>
                  <Text style={s.logDate}>{new Date(log.sent_at).toLocaleString('ar')}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: getStatusColor(log.status) + '22' }]}>
                  <Text style={[s.badgeText, { color: getStatusColor(log.status) }]}>{log.status}</Text>
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
  tabs:          { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#1E293B', borderRadius: 12, padding: 4, marginBottom: 8 },
  tab:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive:     { backgroundColor: '#6366F1' },
  tabText:       { fontSize: 13, color: '#94A3B8' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  scroll:        { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle:  { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginBottom: 12, marginTop: 8 },
  card:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 10, gap: 12 },
  channelIcon:   { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  channelLabel:  { flex: 1, fontSize: 15, fontWeight: '600', color: '#F8FAFC' },
  statRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12 },
  statLabel:     { flex: 1, fontSize: 13, fontWeight: '600', color: '#F8FAFC' },
  statVal:       { fontSize: 12, color: '#94A3B8' },
  tmplName:      { fontSize: 14, fontWeight: '700', color: '#F8FAFC', marginBottom: 2 },
  tmplMeta:      { fontSize: 11, color: '#6366F1', marginBottom: 4 },
  tmplBody:      { fontSize: 12, color: '#94A3B8' },
  logRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 8 },
  logEvent:      { fontSize: 13, fontWeight: '600', color: '#F8FAFC', marginBottom: 2 },
  logRecipient:  { fontSize: 12, color: '#94A3B8' },
  logDate:       { fontSize: 11, color: '#475569', marginTop: 2 },
  badge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:     { fontSize: 11, fontWeight: '600' },
  emptyCard:     { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#1E293B', borderRadius: 14, gap: 12 },
  emptyText:     { fontSize: 14, color: '#475569' },
});