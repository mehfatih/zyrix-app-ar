import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { FONT_WEIGHT } from '../../constants/theme';
import { approvalOptimizationApi } from '../../services/api';

interface Config {
  smart3dsEnabled: boolean;
  exemptionThreshold: number;
  frictionlessCountries: string[];
  challengeCountries: string[];
  autoRoutingEnabled: boolean;
  retryOnSoftDecline: boolean;
  softDeclineCodes: string[];
}
interface Stats {
  total: number; approved: number; declined: number; approvalRate: number;
  threeDsUsed: number; rerouted: number; retried: number; retrySuccess: number; retryRate: number;
  declineBreakdown: Record<string, number>; threeDsBreakdown: Record<string, number>;
}
interface SlaItem {
  id: string; gatewayId: string; gatewayName: string; gatewayCode: string;
  slaUptimeTarget: number; slaResponseTarget: number; slaSuccessTarget: number;
  currentUptimeRate: number; currentResponseAvg: number; currentSuccessRate: number;
  slaBreached: boolean;
}

const FLAGS: Record<string, string> = { SA: '🇸🇦', AE: '🇦🇪', TR: '🇹🇷', KW: '🇰🇼', QA: '🇶🇦', EG: '🇪🇬', IQ: '🇮🇶' };
const COUNTRIES_ALL = ['SA', 'AE', 'TR', 'KW', 'QA', 'EG', 'IQ'];
const SOFT_CODES_ALL = ['INSUFFICIENT_FUNDS', 'DO_NOT_HONOR', 'TRY_AGAIN', 'REFER_TO_BANK', 'TIMEOUT'];

export default function ApprovalOptimizationScreen() {
  const [activeTab, setActiveTab] = useState<'config' | 'stats' | 'sla'>('config');
  const [config, setConfig] = useState<Config | null>(null);
  const [stats, setStats]   = useState<Stats | null>(null);
  const [sla, setSla]       = useState<SlaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localConfig, setLocalConfig] = useState<Config | null>(null);

  const defaultConfig: Config = {
    smart3dsEnabled: true, exemptionThreshold: 100,
    frictionlessCountries: ['SA', 'AE', 'KW'],
    challengeCountries: ['IQ', 'EG'],
    autoRoutingEnabled: true, retryOnSoftDecline: true,
    softDeclineCodes: ['INSUFFICIENT_FUNDS', 'DO_NOT_HONOR'],
  };

  const load = useCallback(async () => {
    try {
      const [configRes, statsRes, slaRes] = await Promise.all([
        approvalOptimizationApi.getConfig(),
        approvalOptimizationApi.stats(),
        approvalOptimizationApi.listSla(),
      ]);
      const c = configRes?.config || defaultConfig;
      setConfig(c);
      setLocalConfig({ ...c });
      setStats(statsRes || null);
      setSla(slaRes?.sla || []);
    } catch (_e) {
      setLocalConfig(defaultConfig);
    }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const handleSaveConfig = async () => {
    if (!localConfig) return;
    setSaving(true);
    try { await approvalOptimizationApi.updateConfig(localConfig); setConfig({ ...localConfig }); }
    catch (_e) {}
    finally { setSaving(false); }
  };

  const toggleCountry = (country: string, field: 'frictionlessCountries' | 'challengeCountries') => {
    if (!localConfig) return;
    const list = localConfig[field];
    setLocalConfig({ ...localConfig, [field]: list.includes(country) ? list.filter(c => c !== country) : [...list, country] });
  };

  const toggleSoftCode = (code: string) => {
    if (!localConfig) return;
    const list = localConfig.softDeclineCodes;
    setLocalConfig({ ...localConfig, softDeclineCodes: list.includes(code) ? list.filter(c => c !== code) : [...list, code] });
  };

  const handleCheckSla = async (gatewayId: string) => {
    try { await approvalOptimizationApi.checkSla(gatewayId); load(); } catch (_e) {}
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Approval Optimization</Text>
          <Text style={s.subtitle}>رفع معدل الموافقة الذكي</Text>
        </View>
        {stats && (
          <View style={s.rateBadge}>
            <Text style={s.rateVal}>{stats.approvalRate}%</Text>
            <Text style={s.rateLabel}>Approval</Text>
          </View>
        )}
      </View>

      <View style={s.tabs}>
        {(['config', 'stats', 'sla'] as const).map(tab => (
          <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'config' ? '⚙️ إعداد' : tab === 'stats' ? '📊 أداء' : '🎯 SLA'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}>

        {activeTab === 'config' && localConfig && (
          <>
            {/* Smart 3DS */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>🔐 Smart 3DS Control</Text>
              <View style={s.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>تفعيل Smart 3DS</Text>
                  <Text style={s.toggleDesc}>يختار بين Frictionless / Challenge / Exemption تلقائياً</Text>
                </View>
                <TouchableOpacity onPress={() => setLocalConfig({ ...localConfig, smart3dsEnabled: !localConfig.smart3dsEnabled })}>
                  <View style={[s.toggle, localConfig.smart3dsEnabled && s.toggleOn]}>
                    <View style={[s.toggleThumb, localConfig.smart3dsEnabled && s.toggleThumbOn]} />
                  </View>
                </TouchableOpacity>
              </View>
              {localConfig.smart3dsEnabled && (
                <>
                  <View style={s.fieldRow}>
                    <Text style={s.fieldLabel}>حد الإعفاء TRA (SAR)</Text>
                    <View style={s.inlineVal}>
                      <Text style={s.inlineValText}>{localConfig.exemptionThreshold}</Text>
                    </View>
                  </View>
                  <Text style={s.subLabel}>🟢 دول Frictionless (بدون challenge)</Text>
                  <View style={s.countryGrid}>
                    {COUNTRIES_ALL.map(c => (
                      <TouchableOpacity key={c} style={[s.countryChip, localConfig.frictionlessCountries.includes(c) && s.countryChipGreen]} onPress={() => toggleCountry(c, 'frictionlessCountries')}>
                        <Text>{FLAGS[c]}</Text>
                        <Text style={[s.countryCode, localConfig.frictionlessCountries.includes(c) && { color: '#10B981' }]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={s.subLabel}>🔴 دول Challenge إجباري</Text>
                  <View style={s.countryGrid}>
                    {COUNTRIES_ALL.map(c => (
                      <TouchableOpacity key={c} style={[s.countryChip, localConfig.challengeCountries.includes(c) && s.countryChipRed]} onPress={() => toggleCountry(c, 'challengeCountries')}>
                        <Text>{FLAGS[c]}</Text>
                        <Text style={[s.countryCode, localConfig.challengeCountries.includes(c) && { color: '#EF4444' }]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>

            {/* Auto Routing */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>🔀 Auto Gateway Routing</Text>
              <View style={s.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>توجيه تلقائي حسب الدولة</Text>
                  <Text style={s.toggleDesc}>SA→Tap | AE→Stripe | TR→iyzico</Text>
                </View>
                <TouchableOpacity onPress={() => setLocalConfig({ ...localConfig, autoRoutingEnabled: !localConfig.autoRoutingEnabled })}>
                  <View style={[s.toggle, localConfig.autoRoutingEnabled && s.toggleOn]}>
                    <View style={[s.toggleThumb, localConfig.autoRoutingEnabled && s.toggleThumbOn]} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Soft Decline Retry */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>🔄 Soft Decline Retry</Text>
              <View style={s.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>إعادة محاولة الرفض الناعم</Text>
                  <Text style={s.toggleDesc}>يُعيد المحاولة عند رموز رفض محددة</Text>
                </View>
                <TouchableOpacity onPress={() => setLocalConfig({ ...localConfig, retryOnSoftDecline: !localConfig.retryOnSoftDecline })}>
                  <View style={[s.toggle, localConfig.retryOnSoftDecline && s.toggleOn]}>
                    <View style={[s.toggleThumb, localConfig.retryOnSoftDecline && s.toggleThumbOn]} />
                  </View>
                </TouchableOpacity>
              </View>
              {localConfig.retryOnSoftDecline && (
                <>
                  <Text style={s.subLabel}>رموز الرفض القابلة للإعادة</Text>
                  <View style={s.codeGrid}>
                    {SOFT_CODES_ALL.map(code => (
                      <TouchableOpacity key={code} style={[s.codeChip, localConfig.softDeclineCodes.includes(code) && s.codeChipActive]} onPress={() => toggleSoftCode(code)}>
                        <Text style={[s.codeText, localConfig.softDeclineCodes.includes(code) && s.codeTextActive]}>{code.replace(/_/g, ' ')}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>

            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveConfig} disabled={saving}>
              <Text style={s.saveBtnText}>{saving ? '⏳ جاري الحفظ...' : '✅ حفظ الإعدادات'}</Text>
            </TouchableOpacity>
          </>
        )}

        {activeTab === 'stats' && stats && (
          <>
            <View style={s.heroCard}>
              <Text style={s.heroLabel}>معدل الموافقة</Text>
              <Text style={s.heroVal}>{stats.approvalRate}%</Text>
              <View style={s.heroBar}><View style={[s.heroFill, { width: `${stats.approvalRate}%` as any }]} /></View>
              <Text style={s.heroSub}>{stats.approved} موافق / {stats.declined} مرفوض</Text>
            </View>
            <View style={s.statsGrid}>
              {[
                { label: '3DS مستخدم', value: stats.threeDsUsed, icon: '🔐', color: '#3B82F6' },
                { label: 'إعادة توجيه', value: stats.rerouted, icon: '🔀', color: '#8B5CF6' },
                { label: 'إعادة محاولة', value: stats.retried, icon: '🔄', color: '#F59E0B' },
                { label: 'نجاح الإعادة', value: `${stats.retryRate}%`, icon: '✅', color: '#10B981' },
              ].map(({ label, value, icon, color }) => (
                <View key={label} style={s.statCard}>
                  <Text style={s.statIcon}>{icon}</Text>
                  <Text style={[s.statVal, { color }]}>{value}</Text>
                  <Text style={s.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
            {Object.keys(stats.declineBreakdown || {}).length > 0 && (
              <View style={s.breakdownCard}>
                <Text style={s.breakdownTitle}>أسباب الرفض</Text>
                {Object.entries(stats.declineBreakdown).sort((a, b) => Number(b[1]) - Number(a[1])).map(([code, count]) => (
                  <View key={code} style={s.breakdownRow}>
                    <Text style={s.breakdownKey}>{code.replace(/_/g, ' ')}</Text>
                    <Text style={[s.breakdownCount, { color: '#EF4444' }]}>{String(count)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {activeTab === 'sla' && (
          <>
            <Text style={s.slaNote}>يتتبع Zyrix أداء كل Gateway ويُنبّه عند خرق الـ SLA المحدد</Text>
            {sla.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>🎯</Text>
                <Text style={s.emptyTitle}>لا توجد SLA configs</Text>
                <Text style={s.emptyDesc}>أضف Gateways أولاً من شاشة Gateway Routing</Text>
              </View>
            ) : sla.map(item => (
              <View key={item.id} style={[s.slaCard, item.slaBreached && s.slaCardBreached]}>
                <View style={s.slaTop}>
                  <View>
                    <Text style={s.slaGwName}>{item.gatewayName}</Text>
                    <Text style={s.slaGwCode}>{item.gatewayCode}</Text>
                  </View>
                  {item.slaBreached
                    ? <View style={s.breachedBadge}><Text style={s.breachedText}>⚠️ خرق SLA</Text></View>
                    : <View style={s.okBadge}><Text style={s.okText}>✅ طبيعي</Text></View>
                  }
                </View>
                <View style={s.slaMetrics}>
                  {[
                    { label: 'نجاح', cur: `${Number(item.currentSuccessRate).toFixed(1)}%`, target: `${item.slaSuccessTarget}%`, ok: Number(item.currentSuccessRate) >= Number(item.slaSuccessTarget) },
                    { label: 'استجابة', cur: `${item.currentResponseAvg}ms`, target: `<${item.slaResponseTarget}ms`, ok: Number(item.currentResponseAvg) <= Number(item.slaResponseTarget) },
                    { label: 'Uptime', cur: `${Number(item.currentUptimeRate).toFixed(1)}%`, target: `${item.slaUptimeTarget}%`, ok: Number(item.currentUptimeRate) >= Number(item.slaUptimeTarget) },
                  ].map(({ label, cur, target, ok }) => (
                    <View key={label} style={s.slaMetric}>
                      <Text style={s.slaMetricLabel}>{label}</Text>
                      <Text style={[s.slaMetricVal, { color: ok ? '#10B981' : '#EF4444' }]}>{cur}</Text>
                      <Text style={s.slaMetricTarget}>{target}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity style={s.checkBtn} onPress={() => handleCheckSla(item.gatewayId)}>
                  <Text style={s.checkBtnText}>🔍 تحقق الآن</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const BG = '#0A1228';
const CARD_BG = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.08)';

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: BG },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: CARD_BG, justifyContent: 'center', alignItems: 'center' },
  backIcon:     { color: '#fff', fontSize: 22, lineHeight: 26 },
  title:        { color: '#fff', fontSize: 18, fontWeight: FONT_WEIGHT.bold },
  subtitle:     { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  rateBadge:    { alignItems: 'center', backgroundColor: 'rgba(59,130,246,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  rateVal:      { color: '#93C5FD', fontSize: 18, fontWeight: FONT_WEIGHT.bold },
  rateLabel:    { color: 'rgba(147,197,253,0.7)', fontSize: 10 },
  tabs:         { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, backgroundColor: CARD_BG, borderRadius: 12, padding: 4 },
  tab:          { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive:    { backgroundColor: COLORS.primary },
  tabText:      { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: FONT_WEIGHT.medium },
  tabTextActive: { color: '#fff', fontWeight: FONT_WEIGHT.semibold },
  scroll:       { flex: 1 },
  scrollContent: { padding: 20 },
  section:      { backgroundColor: CARD_BG, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: BORDER, gap: 12 },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: FONT_WEIGHT.bold },
  toggleRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleLabel:  { color: '#fff', fontSize: 14, fontWeight: FONT_WEIGHT.medium },
  toggleDesc:   { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  toggle:       { width: 44, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn:     { backgroundColor: COLORS.primary },
  toggleThumb:  { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.5)' },
  toggleThumbOn: { backgroundColor: '#fff', transform: [{ translateX: 20 }] },
  fieldRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel:   { color: 'rgba(255,255,255,0.7)', fontSize: 13, flex: 1 },
  inlineVal:    { backgroundColor: 'rgba(59,130,246,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  inlineValText: { color: '#93C5FD', fontSize: 14, fontWeight: FONT_WEIGHT.semibold },
  subLabel:     { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: FONT_WEIGHT.medium },
  countryGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  countryChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER },
  countryChipGreen: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10B981' },
  countryChipRed:   { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#EF4444' },
  countryCode:  { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: FONT_WEIGHT.medium },
  codeGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  codeChip:     { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER },
  codeChipActive: { backgroundColor: 'rgba(59,130,246,0.2)', borderColor: COLORS.primary },
  codeText:     { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  codeTextActive: { color: '#93C5FD', fontWeight: FONT_WEIGHT.semibold },
  saveBtn:      { backgroundColor: COLORS.primary, paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText:  { color: '#fff', fontSize: 15, fontWeight: FONT_WEIGHT.bold },
  heroCard:     { backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  heroLabel:    { color: 'rgba(147,197,253,0.7)', fontSize: 14 },
  heroVal:      { color: '#fff', fontSize: 48, fontWeight: FONT_WEIGHT.bold, marginVertical: 4 },
  heroBar:      { width: '100%', height: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden', marginVertical: 8 },
  heroFill:     { height: '100%', backgroundColor: COLORS.primary, borderRadius: 5 },
  heroSub:      { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard:     { width: '47%', backgroundColor: CARD_BG, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  statIcon:     { fontSize: 22, marginBottom: 6 },
  statVal:      { color: '#fff', fontSize: 22, fontWeight: FONT_WEIGHT.bold },
  statLabel:    { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2, textAlign: 'center' },
  breakdownCard: { backgroundColor: CARD_BG, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  breakdownTitle: { color: '#fff', fontSize: 14, fontWeight: FONT_WEIGHT.semibold, marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  breakdownKey: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  breakdownCount: { color: '#fff', fontSize: 13, fontWeight: FONT_WEIGHT.semibold },
  slaNote:      { color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  slaCard:      { backgroundColor: CARD_BG, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  slaCardBreached: { borderColor: 'rgba(239,68,68,0.4)' },
  slaTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  slaGwName:    { color: '#fff', fontSize: 15, fontWeight: FONT_WEIGHT.semibold },
  slaGwCode:    { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  breachedBadge: { backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  breachedText: { color: '#EF4444', fontSize: 12, fontWeight: FONT_WEIGHT.semibold },
  okBadge:      { backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  okText:       { color: '#10B981', fontSize: 12, fontWeight: FONT_WEIGHT.semibold },
  slaMetrics:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  slaMetric:    { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, alignItems: 'center' },
  slaMetricLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginBottom: 4 },
  slaMetricVal: { fontSize: 14, fontWeight: FONT_WEIGHT.bold },
  slaMetricTarget: { color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 },
  checkBtn:     { backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  checkBtnText: { color: '#93C5FD', fontSize: 13, fontWeight: FONT_WEIGHT.semibold },
  empty:        { alignItems: 'center', paddingVertical: 48 },
  emptyIcon:    { fontSize: 48, marginBottom: 16 },
  emptyTitle:   { color: '#fff', fontSize: 18, fontWeight: FONT_WEIGHT.semibold, marginBottom: 8 },
  emptyDesc:    { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center' },
});