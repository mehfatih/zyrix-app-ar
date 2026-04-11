import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const TYPE_COLORS: Record<string, string> = {
  RESELLER: '#6366F1', AGENT: '#10B981', INTEGRATOR: '#3B82F6', WHITE_LABEL: '#8B5CF6',
};
const TYPE_AR: Record<string, string> = {
  RESELLER: 'موزع', AGENT: 'وكيل', INTEGRATOR: 'مطور', WHITE_LABEL: 'White Label',
};

export default function PartnerDashboardScreen() {
  const router = useRouter();
  const [partners, setPartners] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [subMerchants, setSubMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.partnerDashboard.getPartners();
      setPartners((res as any).data?.partners ?? []);
      setStats((res as any).data?.stats ?? null);
    } catch { } finally { setLoading(false); }
  };

  const loadPartnerDetail = async (partner: any) => {
    setSelectedPartner(partner);
    try {
      setDetailLoading(true);
      const res = await api.partnerDashboard.getMetrics(partner.id);
      setMetrics((res as any).data?.metrics ?? []);
      setSubMerchants((res as any).data?.subMerchants ?? []);
    } catch { } finally { setDetailLoading(false); }
  };

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator color="#6366F1" style={{ flex: 1 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => {
          if (selectedPartner) { setSelectedPartner(null); return; }
          router.back();
        }}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {selectedPartner ? selectedPartner.name : 'لوحة الشركاء'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {!selectedPartner ? (
        <ScrollView contentContainerStyle={s.scroll}>
          {/* Stats */}
          {stats && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 10 }}>
              {[
                { label: 'شركاء', val: stats.total_partners ?? 0, color: '#6366F1' },
                { label: 'عملاء فرعيين', val: stats.total_sub_merchants ?? 0, color: '#3B82F6' },
                { label: 'GMV', val: `${(stats.total_gmv ?? 0).toFixed(0)} SAR`, color: '#10B981' },
                { label: 'عمولة', val: `${(stats.total_commission ?? 0).toFixed(0)} SAR`, color: '#F59E0B' },
              ].map(k => (
                <View key={k.label} style={s.kpiBox}>
                  <Text style={[s.kpiVal, { color: k.color }]}>{k.val}</Text>
                  <Text style={s.kpiLabel}>{k.label}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          <Text style={s.sectionTitle}>الشركاء ({partners.length})</Text>
          {partners.length === 0 && (
            <View style={s.emptyCard}>
              <Ionicons name="briefcase-outline" size={44} color="#475569" />
              <Text style={s.emptyTitle}>لا يوجد شركاء</Text>
              <Text style={s.emptyText}>أضف موزعين ووكلاء لتوسيع نطاقك</Text>
            </View>
          )}
          {partners.map((p: any) => (
            <TouchableOpacity key={p.id} style={s.card} onPress={() => loadPartnerDetail(p)}>
              <View style={[s.typeIcon, { backgroundColor: (TYPE_COLORS[p.type] ?? '#6366F1') + '22' }]}>
                <Ionicons name="briefcase" size={18} color={TYPE_COLORS[p.type] ?? '#6366F1'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{p.name}</Text>
                <Text style={s.cardMeta}>{p.email}</Text>
                <View style={s.metricsRow}>
                  <Text style={s.metric}>👥 {p.total_merchants} عميل</Text>
                  <Text style={s.metric}>💰 {Number(p.total_revenue ?? 0).toFixed(0)} SAR</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={[s.badge, { backgroundColor: (TYPE_COLORS[p.type] ?? '#6366F1') + '22' }]}>
                  <Text style={[s.badgeText, { color: TYPE_COLORS[p.type] ?? '#6366F1' }]}>
                    {TYPE_AR[p.type] ?? p.type}
                  </Text>
                </View>
                <Text style={s.commText}>{p.commission_rate}%</Text>
                <Ionicons name="chevron-forward" size={16} color="#475569" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          {detailLoading ? (
            <ActivityIndicator color="#6366F1" style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Partner Summary */}
              <View style={s.detailCard}>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>النوع</Text>
                  <Text style={s.detailVal}>{TYPE_AR[selectedPartner.type] ?? selectedPartner.type}</Text>
                </View>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>العمولة</Text>
                  <Text style={[s.detailVal, { color: '#10B981' }]}>{selectedPartner.commission_rate}%</Text>
                </View>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>إجمالي الإيراد</Text>
                  <Text style={[s.detailVal, { color: '#F59E0B' }]}>{Number(selectedPartner.total_revenue ?? 0).toFixed(0)} SAR</Text>
                </View>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>إجمالي العمولة</Text>
                  <Text style={[s.detailVal, { color: '#6366F1' }]}>{Number(selectedPartner.total_commission ?? 0).toFixed(0)} SAR</Text>
                </View>
              </View>

              {/* Metrics */}
              <Text style={s.sectionTitle}>مقاييس الأداء ({metrics.length})</Text>
              {metrics.length === 0 && (
                <View style={[s.emptyCard, { padding: 20 }]}>
                  <Text style={s.emptyText}>لا توجد بيانات بعد</Text>
                </View>
              )}
              {metrics.map((m: any) => (
                <View key={m.id} style={s.metricCard}>
                  <Text style={s.metricPeriod}>{m.period}</Text>
                  <View style={s.metricRow}>
                    <Text style={s.metricItem}>📊 {m.transactions} صفقة</Text>
                    <Text style={s.metricItem}>💰 {Number(m.gmv).toFixed(0)} SAR</Text>
                    <Text style={s.metricItem}>👥 +{m.new_merchants}</Text>
                  </View>
                </View>
              ))}

              {/* Sub-merchants */}
              <Text style={s.sectionTitle}>العملاء الفرعيين ({subMerchants.length})</Text>
              {subMerchants.map((sm: any) => (
                <View key={sm.id} style={s.subCard}>
                  <View style={s.subAvatar}>
                    <Text style={s.subAvatarText}>{sm.sub_merchant_name?.charAt(0) ?? '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{sm.sub_merchant_name}</Text>
                    <Text style={s.cardMeta}>{sm.sub_merchant_email}</Text>
                  </View>
                  <Text style={s.subGMV}>{Number(sm.monthly_gmv).toFixed(0)} SAR</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#0F172A' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle:   { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },
  scroll:        { paddingHorizontal: 20, paddingBottom: 40 },
  kpiBox:        { backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', minWidth: 100 },
  kpiVal:        { fontSize: 16, fontWeight: '700' },
  kpiLabel:      { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  sectionTitle:  { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginBottom: 12, marginTop: 8 },
  card:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 10, gap: 12 },
  typeIcon:      { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle:     { fontSize: 14, fontWeight: '700', color: '#F8FAFC', marginBottom: 2 },
  cardMeta:      { fontSize: 11, color: '#94A3B8' },
  metricsRow:    { flexDirection: 'row', gap: 10, marginTop: 4 },
  metric:        { fontSize: 11, color: '#94A3B8' },
  badge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:     { fontSize: 11, fontWeight: '600' },
  commText:      { fontSize: 13, fontWeight: '700', color: '#10B981' },
  detailCard:    { backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 16, gap: 12 },
  detailRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel:   { fontSize: 13, color: '#94A3B8' },
  detailVal:     { fontSize: 14, fontWeight: '700', color: '#F8FAFC' },
  metricCard:    { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 8 },
  metricPeriod:  { fontSize: 12, fontWeight: '700', color: '#6366F1', marginBottom: 6 },
  metricRow:     { flexDirection: 'row', gap: 12 },
  metricItem:    { fontSize: 12, color: '#94A3B8' },
  subCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 8, gap: 10 },
  subAvatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3B82F622', alignItems: 'center', justifyContent: 'center' },
  subAvatarText: { fontSize: 15, fontWeight: '700', color: '#3B82F6' },
  subGMV:        { fontSize: 13, fontWeight: '700', color: '#10B981' },
  emptyCard:     { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#1E293B', borderRadius: 14, gap: 10 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  emptyText:     { fontSize: 13, color: '#475569', textAlign: 'center' },
});