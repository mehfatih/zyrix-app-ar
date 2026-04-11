import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const STATUS_COLORS: Record<string, string> = {
  active: '#10B981', inactive: '#94A3B8', suspended: '#EF4444',
};
const PAYOUT_STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B', processing: '#3B82F6', completed: '#10B981', failed: '#EF4444',
};

export default function AffiliateSystemScreen() {
  const router = useRouter();
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'affiliates'|'payouts'>('affiliates');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [aRes, pRes] = await Promise.all([
        api.affiliateSystem.getAffiliates(),
        api.affiliateSystem.getPayouts(),
      ]);
      setAffiliates((aRes as any).data?.affiliates ?? []);
      setPayouts((pRes as any).data?.payouts ?? []);
      setStats((aRes as any).data?.stats ?? null);
    } catch { } finally { setLoading(false); }
  };

  const completePayout = async (id: string) => {
    try {
      await api.affiliateSystem.completePayout(id);
      setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'completed' } : p));
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
        <Text style={s.headerTitle}>نظام الشركاء</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats */}
      {stats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.kpiScroll} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
          {[
            { label: 'شركاء', val: stats.total_affiliates ?? 0, color: '#6366F1' },
            { label: 'إحالات', val: (stats.total_referrals ?? 0).toLocaleString(), color: '#3B82F6' },
            { label: 'إيراد', val: `${(stats.total_revenue ?? 0).toLocaleString()} SAR`, color: '#10B981' },
            { label: 'عمولة', val: `${(stats.total_commission ?? 0).toFixed(0)} SAR`, color: '#F59E0B' },
            { label: 'معلق', val: `${(stats.pending_payout ?? 0).toFixed(0)} SAR`, color: '#EF4444' },
          ].map(kpi => (
            <View key={kpi.label} style={s.kpiBox}>
              <Text style={[s.kpiVal, { color: kpi.color }]}>{kpi.val}</Text>
              <Text style={s.kpiLabel}>{kpi.label}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={s.tabs}>
        {(['affiliates','payouts'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab===t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab===t && s.tabTextActive]}>
              {t==='affiliates' ? `الشركاء (${affiliates.length})` : `المدفوعات (${payouts.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {tab === 'affiliates' && (
          <>
            <Text style={s.sectionTitle}>قائمة الشركاء</Text>
            {affiliates.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="people-outline" size={44} color="#475569" />
                <Text style={s.emptyTitle}>لا يوجد شركاء بعد</Text>
                <Text style={s.emptyText}>أضف شركاءك لتتبع الإحالات والعمولات</Text>
              </View>
            )}
            {affiliates.map((a: any) => (
              <View key={a.id} style={s.card}>
                {/* Avatar */}
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{a.name?.charAt(0) ?? '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{a.name}</Text>
                  <Text style={s.cardMeta}>{a.email}</Text>
                  <View style={s.codeRow}>
                    <Ionicons name="link" size={11} color="#6366F1" />
                    <Text style={s.code}>{a.referral_code}</Text>
                  </View>
                  <View style={s.metricsRow}>
                    <Text style={s.metric}>📊 {a.total_referrals} إحالة</Text>
                    <Text style={s.metric}>💰 {Number(a.total_commission ?? 0).toFixed(0)} SAR</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View style={[s.badge, { backgroundColor: (STATUS_COLORS[a.status] ?? '#94A3B8') + '22' }]}>
                    <Text style={[s.badgeText, { color: STATUS_COLORS[a.status] ?? '#94A3B8' }]}>
                      {a.status === 'active' ? 'نشط' : a.status === 'inactive' ? 'غير نشط' : 'موقوف'}
                    </Text>
                  </View>
                  <Text style={s.commText}>
                    {a.commission_value}{a.commission_type === 'PERCENTAGE' ? '%' : ' SAR'}
                  </Text>
                  {Number(a.pending_payout ?? 0) > 0 && (
                    <Text style={s.pendingText}>⏳ {Number(a.pending_payout).toFixed(0)} SAR</Text>
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'payouts' && (
          <>
            <Text style={s.sectionTitle}>سجل المدفوعات</Text>
            {payouts.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="wallet-outline" size={44} color="#475569" />
                <Text style={s.emptyTitle}>لا توجد مدفوعات</Text>
                <Text style={s.emptyText}>ستظهر هنا مدفوعات الشركاء</Text>
              </View>
            )}
            {payouts.map((p: any) => (
              <View key={p.id} style={s.card}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{p.affiliate_name}</Text>
                  <Text style={[s.cardMeta, { fontSize: 16, fontWeight: '700', color: '#F8FAFC', marginTop: 4 }]}>
                    {Number(p.amount).toLocaleString()} SAR
                  </Text>
                  <Text style={s.cardMeta}>{p.method}</Text>
                  <Text style={s.dateText}>{new Date(p.created_at).toLocaleDateString('ar')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <View style={[s.badge, { backgroundColor: (PAYOUT_STATUS_COLORS[p.status] ?? '#94A3B8') + '22' }]}>
                    <Text style={[s.badgeText, { color: PAYOUT_STATUS_COLORS[p.status] ?? '#94A3B8' }]}>
                      {p.status === 'pending' ? 'معلق' : p.status === 'processing' ? 'جاري' : p.status === 'completed' ? 'مكتمل' : 'فشل'}
                    </Text>
                  </View>
                  {p.status === 'pending' && (
                    <TouchableOpacity style={s.payBtn} onPress={() => completePayout(p.id)}>
                      <Text style={s.payBtnText}>تأكيد الدفع</Text>
                    </TouchableOpacity>
                  )}
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
  kpiBox:        { backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', minWidth: 90 },
  kpiVal:        { fontSize: 16, fontWeight: '700' },
  kpiLabel:      { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  tabs:          { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#1E293B', borderRadius: 12, padding: 4, marginBottom: 8 },
  tab:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive:     { backgroundColor: '#6366F1' },
  tabText:       { fontSize: 13, color: '#94A3B8' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  scroll:        { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle:  { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginBottom: 12, marginTop: 8 },
  card:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 10, gap: 12 },
  avatar:        { width: 42, height: 42, borderRadius: 21, backgroundColor: '#6366F133', alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontSize: 18, fontWeight: '700', color: '#6366F1' },
  cardTitle:     { fontSize: 14, fontWeight: '700', color: '#F8FAFC', marginBottom: 2 },
  cardMeta:      { fontSize: 11, color: '#94A3B8' },
  codeRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  code:          { fontSize: 12, fontWeight: '700', color: '#6366F1', letterSpacing: 1 },
  metricsRow:    { flexDirection: 'row', gap: 10, marginTop: 4 },
  metric:        { fontSize: 11, color: '#94A3B8' },
  badge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:     { fontSize: 11, fontWeight: '600' },
  commText:      { fontSize: 12, fontWeight: '700', color: '#10B981' },
  pendingText:   { fontSize: 11, color: '#F59E0B' },
  payBtn:        { backgroundColor: '#10B98122', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  payBtnText:    { fontSize: 12, fontWeight: '600', color: '#10B981' },
  dateText:      { fontSize: 11, color: '#475569', marginTop: 2 },
  emptyCard:     { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#1E293B', borderRadius: 14, gap: 10 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  emptyText:     { fontSize: 13, color: '#475569', textAlign: 'center' },
});