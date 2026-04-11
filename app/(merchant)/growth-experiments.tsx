import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const STATUS_COLORS: Record<string, string> = {
  draft: '#94A3B8', running: '#10B981', paused: '#F59E0B',
  completed: '#6366F1', archived: '#475569',
};
const STATUS_AR: Record<string, string> = {
  draft: 'مسودة', running: 'جاري', paused: 'متوقف',
  completed: 'مكتمل', archived: 'مؤرشف',
};
const TYPE_COLORS: Record<string, string> = {
  FEATURE_FLAG: '#6366F1', PRICING: '#10B981', UI: '#3B82F6',
  FLOW: '#F59E0B', MESSAGING: '#8B5CF6',
};

export default function GrowthExperimentsScreen() {
  const router = useRouter();
  const [experiments, setExperiments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.growthExperiments.getExperiments();
      setExperiments((res as any).data?.experiments ?? []);
      setStats((res as any).data?.stats ?? null);
    } catch { } finally { setLoading(false); }
  };

  const loadDetail = async (exp: any) => {
    setSelected(exp);
    try {
      setDetailLoading(true);
      const res = await api.growthExperiments.getExperiment(exp.id);
      setVariants((res as any).data?.variants ?? []);
    } catch { } finally { setDetailLoading(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.growthExperiments.updateStatus(id, status);
      setExperiments(prev => prev.map(e => e.id === id ? { ...e, status } : e));
      if (selected?.id === id) setSelected((prev: any) => ({ ...prev, status }));
    } catch { }
  };

  const getWinner = (variants: any[]) => {
    if (!variants.length) return null;
    return variants.reduce((a, b) =>
      Number(a.conversion_rate ?? 0) > Number(b.conversion_rate ?? 0) ? a : b
    );
  };

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator color="#6366F1" style={{ flex: 1 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => { if (selected) { setSelected(null); return; } router.back(); }}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{selected ? selected.name : 'تجارب النمو'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {!selected ? (
        <ScrollView contentContainerStyle={s.scroll}>
          {stats && (
            <View style={s.statsRow}>
              <View style={s.statBox}>
                <Text style={s.statNum}>{stats.total ?? 0}</Text>
                <Text style={s.statLbl}>إجمالي</Text>
              </View>
              <View style={s.statBox}>
                <Text style={[s.statNum, { color: '#10B981' }]}>{stats.running ?? 0}</Text>
                <Text style={s.statLbl}>جاري</Text>
              </View>
              <View style={s.statBox}>
                <Text style={[s.statNum, { color: '#6366F1' }]}>{stats.completed ?? 0}</Text>
                <Text style={s.statLbl}>مكتمل</Text>
              </View>
            </View>
          )}

          <Text style={s.sectionTitle}>التجارب ({experiments.length})</Text>
          {experiments.length === 0 && (
            <View style={s.emptyCard}>
              <Ionicons name="flask-outline" size={44} color="#475569" />
              <Text style={s.emptyTitle}>لا توجد تجارب</Text>
              <Text style={s.emptyText}>ابدأ تجربة A/B لتحسين معدلات التحويل</Text>
            </View>
          )}
          {experiments.map((exp: any) => (
            <TouchableOpacity key={exp.id} style={s.card} onPress={() => loadDetail(exp)}>
              <View style={[s.expIcon, { backgroundColor: (TYPE_COLORS[exp.type] ?? '#6366F1') + '22' }]}>
                <Ionicons name="flask" size={18} color={TYPE_COLORS[exp.type] ?? '#6366F1'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{exp.name}</Text>
                <Text style={s.cardMeta}>{exp.type} · {exp.traffic_split}% ترافيك</Text>
                <Text style={s.cardMeta}>هدف: {exp.target_metric}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={[s.badge, { backgroundColor: (STATUS_COLORS[exp.status] ?? '#94A3B8') + '22' }]}>
                  <Text style={[s.badgeText, { color: STATUS_COLORS[exp.status] ?? '#94A3B8' }]}>
                    {STATUS_AR[exp.status] ?? exp.status}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#475569" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          {/* Hypothesis */}
          {selected.hypothesis && (
            <View style={s.hypothesisCard}>
              <Text style={s.hypothesisLabel}>الفرضية</Text>
              <Text style={s.hypothesisText}>{selected.hypothesis}</Text>
            </View>
          )}

          {/* Status Controls */}
          <View style={s.controlRow}>
            {selected.status === 'draft' && (
              <TouchableOpacity style={[s.controlBtn, { backgroundColor: '#10B98122' }]}
                onPress={() => updateStatus(selected.id, 'running')}>
                <Ionicons name="play" size={16} color="#10B981" />
                <Text style={[s.controlBtnText, { color: '#10B981' }]}>تشغيل</Text>
              </TouchableOpacity>
            )}
            {selected.status === 'running' && (
              <TouchableOpacity style={[s.controlBtn, { backgroundColor: '#F59E0B22' }]}
                onPress={() => updateStatus(selected.id, 'paused')}>
                <Ionicons name="pause" size={16} color="#F59E0B" />
                <Text style={[s.controlBtnText, { color: '#F59E0B' }]}>إيقاف مؤقت</Text>
              </TouchableOpacity>
            )}
            {(selected.status === 'running' || selected.status === 'paused') && (
              <TouchableOpacity style={[s.controlBtn, { backgroundColor: '#6366F122' }]}
                onPress={() => updateStatus(selected.id, 'completed')}>
                <Ionicons name="checkmark" size={16} color="#6366F1" />
                <Text style={[s.controlBtnText, { color: '#6366F1' }]}>إنهاء</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Variants */}
          <Text style={s.sectionTitle}>المتغيرات</Text>
          {detailLoading ? <ActivityIndicator color="#6366F1" /> : (
            <>
              {variants.map((v: any, i: number) => {
                const winner = getWinner(variants);
                const isWinner = winner?.id === v.id && variants.length > 1;
                const cr = Number(v.conversion_rate ?? 0);
                return (
                  <View key={v.id} style={[s.variantCard, isWinner && s.variantWinner]}>
                    <View style={s.variantHeader}>
                      <Text style={s.variantName}>{v.name}</Text>
                      {isWinner && (
                        <View style={s.winnerBadge}>
                          <Ionicons name="trophy" size={12} color="#F59E0B" />
                          <Text style={s.winnerText}>الفائز</Text>
                        </View>
                      )}
                      <Text style={s.variantWeight}>{v.traffic_weight}%</Text>
                    </View>
                    <View style={s.variantMetrics}>
                      <View style={s.variantMetric}>
                        <Text style={s.vmVal}>{(v.impressions ?? 0).toLocaleString()}</Text>
                        <Text style={s.vmLabel}>مشاهدة</Text>
                      </View>
                      <View style={s.variantMetric}>
                        <Text style={s.vmVal}>{(v.conversions ?? 0).toLocaleString()}</Text>
                        <Text style={s.vmLabel}>تحويل</Text>
                      </View>
                      <View style={s.variantMetric}>
                        <Text style={[s.vmVal, { color: isWinner ? '#10B981' : '#F8FAFC' }]}>{cr}%</Text>
                        <Text style={s.vmLabel}>معدل</Text>
                      </View>
                      <View style={s.variantMetric}>
                        <Text style={s.vmVal}>{Number(v.revenue ?? 0).toFixed(0)}</Text>
                        <Text style={s.vmLabel}>SAR</Text>
                      </View>
                    </View>
                    {/* Progress bar */}
                    <View style={s.progressBg}>
                      <View style={[s.progressFill, {
                        width: `${Math.min(cr * 5, 100)}%` as any,
                        backgroundColor: isWinner ? '#10B981' : '#6366F1'
                      }]} />
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#0F172A' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle:    { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },
  scroll:         { paddingHorizontal: 20, paddingBottom: 40 },
  statsRow:       { flexDirection: 'row', marginBottom: 16, gap: 10 },
  statBox:        { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 14, alignItems: 'center' },
  statNum:        { fontSize: 22, fontWeight: '700', color: '#F8FAFC' },
  statLbl:        { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  sectionTitle:   { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginBottom: 12, marginTop: 8 },
  card:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 10, gap: 12 },
  expIcon:        { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle:      { fontSize: 14, fontWeight: '700', color: '#F8FAFC', marginBottom: 2 },
  cardMeta:       { fontSize: 11, color: '#94A3B8' },
  badge:          { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:      { fontSize: 11, fontWeight: '600' },
  hypothesisCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 14 },
  hypothesisLabel:{ fontSize: 11, color: '#6366F1', marginBottom: 4 },
  hypothesisText: { fontSize: 13, color: '#F8FAFC', lineHeight: 20 },
  controlRow:     { flexDirection: 'row', gap: 10, marginBottom: 16 },
  controlBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  controlBtnText: { fontSize: 13, fontWeight: '600' },
  variantCard:    { backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'transparent' },
  variantWinner:  { borderColor: '#10B981' },
  variantHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  variantName:    { flex: 1, fontSize: 15, fontWeight: '700', color: '#F8FAFC' },
  winnerBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F59E0B22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  winnerText:     { fontSize: 11, fontWeight: '600', color: '#F59E0B' },
  variantWeight:  { fontSize: 13, color: '#94A3B8' },
  variantMetrics: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  variantMetric:  { alignItems: 'center' },
  vmVal:          { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  vmLabel:        { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  progressBg:     { height: 4, backgroundColor: '#334155', borderRadius: 2, overflow: 'hidden' },
  progressFill:   { height: 4, borderRadius: 2 },
  emptyCard:      { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#1E293B', borderRadius: 14, gap: 10 },
  emptyTitle:     { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  emptyText:      { fontSize: 13, color: '#475569', textAlign: 'center' },
});