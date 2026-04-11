import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const STATUS_COLORS: Record<string, string> = {
  active: '#10B981', inactive: '#94A3B8', pending: '#F59E0B', suspended: '#EF4444',
};

export default function MarketplaceSplitScreen() {
  const router = useRouter();
  const [vendors, setVendors] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'vendors'|'rules'|'logs'>('vendors');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vRes, rRes, lRes] = await Promise.all([
        api.marketplaceSplit.getVendors(),
        api.marketplaceSplit.getSplitRules(),
        api.marketplaceSplit.getLogs(),
      ]);
      setVendors((vRes as any).data?.vendors ?? []);
      setRules((rRes as any).data?.rules ?? []);
      setLogs((lRes as any).data?.logs ?? []);
      setStats((vRes as any).data?.stats ?? null);
    } catch { } finally { setLoading(false); }
  };

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator color="#6366F1" style={{ flex: 1 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Marketplace & Split</Text>
        <View style={{ width: 24 }} />
      </View>

      {stats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.kpiScroll} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
          {[
            { label: 'بائعين', val: stats.total_vendors ?? 0, color: '#6366F1' },
            { label: 'إجمالي GMV', val: `${(stats.total_gmv ?? 0).toFixed(0)} SAR`, color: '#10B981' },
            { label: 'معلق', val: `${(stats.total_pending ?? 0).toFixed(0)} SAR`, color: '#F59E0B' },
          ].map(k => (
            <View key={k.label} style={s.kpiBox}>
              <Text style={[s.kpiVal, { color: k.color }]}>{k.val}</Text>
              <Text style={s.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={s.tabs}>
        {(['vendors','rules','logs'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab===t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab===t && s.tabTextActive]}>
              {t==='vendors'?`البائعين (${vendors.length})`:t==='rules'?'قواعد التقسيم':'السجل'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {tab === 'vendors' && (
          <>
            {vendors.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="storefront-outline" size={44} color="#475569" />
                <Text style={s.emptyTitle}>لا يوجد بائعين</Text>
                <Text style={s.emptyText}>أضف بائعين لتوزيع المدفوعات تلقائياً</Text>
              </View>
            )}
            {vendors.map((v: any) => (
              <View key={v.id} style={s.card}>
                <View style={s.vendorAvatar}>
                  <Text style={s.vendorAvatarText}>{v.name?.charAt(0) ?? '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{v.name}</Text>
                  <Text style={s.cardMeta}>{v.email}</Text>
                  <View style={s.metricsRow}>
                    <Text style={s.metric}>💰 {Number(v.total_sales ?? 0).toFixed(0)} SAR</Text>
                    <Text style={s.metric}>⏳ {Number(v.pending_balance ?? 0).toFixed(0)} SAR</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View style={[s.badge, { backgroundColor: (STATUS_COLORS[v.status] ?? '#94A3B8') + '22' }]}>
                    <Text style={[s.badgeText, { color: STATUS_COLORS[v.status] ?? '#94A3B8' }]}>{v.status}</Text>
                  </View>
                  <Text style={s.commRate}>{v.commission_rate}%</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'rules' && (
          <>
            {rules.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="git-branch-outline" size={44} color="#475569" />
                <Text style={s.emptyTitle}>لا توجد قواعد</Text>
                <Text style={s.emptyText}>أنشئ قواعد لتوزيع المدفوعات بين البائعين</Text>
              </View>
            )}
            {rules.map((r: any) => {
              const splits = Array.isArray(r.splits) ? r.splits : [];
              return (
                <View key={r.id} style={s.card}>
                  <View style={[s.ruleIcon, { backgroundColor: r.active ? '#6366F122' : '#33415522' }]}>
                    <Ionicons name="git-merge" size={18} color={r.active ? '#6366F1' : '#475569'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{r.name}</Text>
                    <Text style={s.cardMeta}>{r.type} · {splits.length} أطراف</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: r.active ? '#10B98122' : '#33415522' }]}>
                    <Text style={[s.badgeText, { color: r.active ? '#10B981' : '#475569' }]}>
                      {r.active ? 'فعّال' : 'معطل'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {tab === 'logs' && (
          <>
            {logs.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="list-outline" size={40} color="#475569" />
                <Text style={s.emptyText}>لا توجد سجلات</Text>
              </View>
            )}
            {logs.map((log: any) => (
              <View key={log.id} style={s.card}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{log.vendor_name ?? 'بدون بائع'}</Text>
                  <Text style={s.cardMeta}>
                    إجمالي: {Number(log.gross_amount).toFixed(2)} SAR
                    · مقسم: {Number(log.split_amount).toFixed(2)} SAR
                  </Text>
                  <Text style={s.logDate}>{new Date(log.created_at).toLocaleDateString('ar')}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: log.status==='settled' ? '#10B98122' : '#F59E0B22' }]}>
                  <Text style={[s.badgeText, { color: log.status==='settled' ? '#10B981' : '#F59E0B' }]}>
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
  kpiScroll:     { maxHeight: 80, marginBottom: 8 },
  kpiBox:        { backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', minWidth: 110 },
  kpiVal:        { fontSize: 16, fontWeight: '700' },
  kpiLabel:      { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  tabs:          { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#1E293B', borderRadius: 12, padding: 4, marginBottom: 8 },
  tab:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive:     { backgroundColor: '#6366F1' },
  tabText:       { fontSize: 12, color: '#94A3B8' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  scroll:        { paddingHorizontal: 20, paddingBottom: 40 },
  card:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 10, gap: 12 },
  vendorAvatar:  { width: 42, height: 42, borderRadius: 21, backgroundColor: '#6366F133', alignItems: 'center', justifyContent: 'center' },
  vendorAvatarText: { fontSize: 18, fontWeight: '700', color: '#6366F1' },
  ruleIcon:      { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle:     { fontSize: 14, fontWeight: '700', color: '#F8FAFC', marginBottom: 2 },
  cardMeta:      { fontSize: 11, color: '#94A3B8' },
  metricsRow:    { flexDirection: 'row', gap: 10, marginTop: 4 },
  metric:        { fontSize: 11, color: '#94A3B8' },
  commRate:      { fontSize: 13, fontWeight: '700', color: '#10B981' },
  badge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:     { fontSize: 11, fontWeight: '600' },
  logDate:       { fontSize: 11, color: '#475569', marginTop: 2 },
  emptyCard:     { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#1E293B', borderRadius: 14, gap: 10 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  emptyText:     { fontSize: 13, color: '#475569', textAlign: 'center' },
});