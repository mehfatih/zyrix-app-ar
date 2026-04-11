import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const TRIGGER_COLORS: Record<string, string> = {
  BEFORE_DUE:  '#6366F1',
  ON_DUE:      '#F59E0B',
  AFTER_DUE:   '#EF4444',
  OVERDUE:     '#DC2626',
};
const TRIGGER_AR: Record<string, string> = {
  BEFORE_DUE:  'قبل الموعد',
  ON_DUE:      'يوم الموعد',
  AFTER_DUE:   'بعد الموعد',
  OVERDUE:     'متأخر',
};
const CHANNEL_AR: Record<string, string> = {
  PUSH: 'Push', EMAIL: 'Email', WHATSAPP: 'واتساب', SMS: 'SMS',
};

export default function PaymentRemindersScreen() {
  const router = useRouter();
  const [rules, setRules] = useState<any[]>([]);
  const [sequences, setSequences] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logStats, setLogStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'rules'|'sequences'|'logs'>('rules');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rRes, sRes, lRes] = await Promise.all([
        api.paymentReminders.getRules(),
        api.paymentReminders.getSequences(),
        api.paymentReminders.getLogs(),
      ]);
      setRules((rRes as any).data?.rules ?? []);
      setSequences((sRes as any).data?.sequences ?? []);
      setLogs((lRes as any).data?.logs ?? []);
      setLogStats((lRes as any).data?.stats ?? null);
    } catch { } finally { setLoading(false); }
  };

  const deleteRule = async (id: string) => {
    try {
      await api.paymentReminders.deleteRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
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
        <Text style={s.headerTitle}>تذكيرات الدفع</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats */}
      {logStats && (
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{logStats.total_sent ?? 0}</Text>
            <Text style={s.statLbl}>إجمالي</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statNum, { color: '#10B981' }]}>{logStats.sent ?? 0}</Text>
            <Text style={s.statLbl}>أُرسل</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statNum, { color: '#EF4444' }]}>{logStats.failed ?? 0}</Text>
            <Text style={s.statLbl}>فشل</Text>
          </View>
        </View>
      )}

      <View style={s.tabs}>
        {(['rules','sequences','logs'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab===t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab===t && s.tabTextActive]}>
              {t==='rules'?'القواعد':t==='sequences'?'التسلسلات':'السجل'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {tab === 'rules' && (
          <>
            <Text style={s.sectionTitle}>قواعد التذكير ({rules.length})</Text>
            {rules.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="alarm-outline" size={40} color="#475569" />
                <Text style={s.emptyText}>لا توجد قواعد بعد</Text>
              </View>
            )}
            {rules.map((r: any) => (
              <View key={r.id} style={s.card}>
                <View style={[s.dot, { backgroundColor: TRIGGER_COLORS[r.trigger_type] ?? '#6366F1' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.ruleName}>{r.name}</Text>
                  <Text style={s.ruleMeta}>
                    {TRIGGER_AR[r.trigger_type]} · {r.trigger_days} يوم · {CHANNEL_AR[r.channel] ?? r.channel}
                  </Text>
                  <Text style={s.ruleBody} numberOfLines={1}>{r.message_ar}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteRule(r.id)}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {tab === 'sequences' && (
          <>
            <Text style={s.sectionTitle}>تسلسلات التذكير ({sequences.length})</Text>
            {sequences.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="git-branch-outline" size={40} color="#475569" />
                <Text style={s.emptyText}>لا توجد تسلسلات</Text>
              </View>
            )}
            {sequences.map((seq: any) => {
              const steps = Array.isArray(seq.steps) ? seq.steps : [];
              return (
                <View key={seq.id} style={s.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.ruleName}>{seq.name}</Text>
                    {seq.description && <Text style={s.ruleMeta}>{seq.description}</Text>}
                    <Text style={s.stepCount}>{steps.length} خطوة</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: '#6366F122' }]}>
                    <Text style={[s.badgeText, { color: '#6366F1' }]}>
                      {seq.active ? 'فعّال' : 'معطل'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {tab === 'logs' && (
          <>
            <Text style={s.sectionTitle}>سجل الإرسال ({logs.length})</Text>
            {logs.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="list-outline" size={40} color="#475569" />
                <Text style={s.emptyText}>لا توجد سجلات</Text>
              </View>
            )}
            {logs.map((log: any) => (
              <View key={log.id} style={s.logRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.ruleName}>{CHANNEL_AR[log.channel] ?? log.channel}</Text>
                  <Text style={s.ruleMeta}>{log.recipient_phone ?? log.recipient_email ?? '—'}</Text>
                  <Text style={s.logDate}>{new Date(log.sent_at).toLocaleString('ar')}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: log.status==='sent' ? '#10B98122' : '#EF444422' }]}>
                  <Text style={[s.badgeText, { color: log.status==='sent' ? '#10B981' : '#EF4444' }]}>
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
  dot:           { width: 8, height: 8, borderRadius: 4 },
  ruleName:      { fontSize: 14, fontWeight: '700', color: '#F8FAFC', marginBottom: 2 },
  ruleMeta:      { fontSize: 11, color: '#6366F1', marginBottom: 2 },
  ruleBody:      { fontSize: 12, color: '#94A3B8' },
  stepCount:     { fontSize: 12, color: '#94A3B8' },
  logRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 8 },
  logDate:       { fontSize: 11, color: '#475569', marginTop: 2 },
  badge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:     { fontSize: 11, fontWeight: '600' },
  emptyCard:     { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#1E293B', borderRadius: 14, gap: 12 },
  emptyText:     { fontSize: 14, color: '#475569' },
});