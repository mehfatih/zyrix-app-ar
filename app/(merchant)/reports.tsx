import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { FONT_WEIGHT } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';

interface HubItem {
  icon: string;
  label: string;
  sub: string;
  route: string;
  accent: string;
  bg: string;
}

const GROUPS: { title: string; items: HubItem[] }[] = [
  {
    title: 'مباشر',
    items: [
      { icon: '⚡', label: 'لوحة Real-time',    sub: 'مباشر · كل 30 ثانية',          route: '/(merchant)/realtime-dashboard',    accent: '#34D399', bg: '#0D2A1F' },
      { icon: '🔔', label: 'التنبيهات',          sub: 'حدود · Drop Alerts',            route: '/(merchant)/alerts-engine',         accent: '#F59E0B', bg: '#2A1E08' },
    ],
  },
  {
    title: 'أسبوعياً',
    items: [
      { icon: '📊', label: 'التقارير المالية',   sub: 'P&L · CashFlow · Export',       route: '/(merchant)/financial-reports',     accent: '#60A5FA', bg: '#0E1F3A' },
      { icon: '🎯', label: 'قمع التحويل',        sub: 'Click → Payment steps',         route: '/(merchant)/conversion-funnel',     accent: '#6366F1', bg: '#1E1B4B' },
      { icon: '✅', label: 'معدل النجاح',        sub: 'حسب البنك · الدولة · الطريقة', route: '/(merchant)/success-rate-analysis', accent: '#10B981', bg: '#0D2A1F' },
      { icon: '💰', label: 'تفكيك الإيراد',      sub: 'المنتج · الدولة · القناة',     route: '/(merchant)/revenue-breakdown',     accent: '#A78BFA', bg: '#1A1040' },
    ],
  },
  {
    title: 'شهرياً',
    items: [
      { icon: '👤', label: 'قيمة العميل CLV',    sub: 'LTV · Segments · Cohorts',      route: '/(merchant)/customer-clv',          accent: '#F472B6', bg: '#2A0F1E' },
      { icon: '📈', label: 'تحليل المجموعات',    sub: 'Cohort · Retention · Churn',    route: '/(merchant)/cohort-analysis',       accent: '#06B6D4', bg: '#0E2A3A' },
      { icon: '💡', label: 'الرؤى الذكية',       sub: 'AI Insights · توصيات تلقائية', route: '/(merchant)/smart-insights',        accent: '#34D399', bg: '#0D2A1F' },
      { icon: '🔮', label: 'التحليل التنبؤي',    sub: 'Forecast · Revenue · Churn',    route: '/(merchant)/predictive-analytics',  accent: '#F97316', bg: '#2A1208' },
    ],
  },
  {
    title: 'اختبار وتحسين',
    items: [
      { icon: '🧪', label: 'اختبار A/B',          sub: 'Test · Compare · Deploy',       route: '/(merchant)/ab-testing',            accent: '#EC4899', bg: '#2A0F1E' },
      { icon: '📉', label: 'التحليلات الكاملة',   sub: 'Analytics Hub · All Metrics',   route: '/(merchant)/analytics',             accent: '#38BDF8', bg: '#0E1F3A' },
    ],
  },
];

export default function ReportsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={s.header}>
        <Text style={s.headerTitle}>التقارير</Text>
        <Text style={s.headerSub}>تحليلات · رؤى · توقعات · A/B</Text>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {GROUPS.map((group) => (
          <View key={group.title} style={s.group}>
            <Text style={s.groupTitle}>{group.title}</Text>
            <View style={s.grid}>
              {group.items.map((item) => (
                <TouchableOpacity
                  key={item.route}
                  style={[s.card, { backgroundColor: item.bg, borderColor: item.accent + '44' }]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.75}
                >
                  <Text style={s.cardIcon}>{item.icon}</Text>
                  <Text style={[s.cardLabel, { color: item.accent }]}>{item.label}</Text>
                  <Text style={s.cardSub}>{item.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.background },
  header:      { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: FONT_WEIGHT.bold, color: '#F1F5F9' },
  headerSub:   { fontSize: 13, color: '#64748B', marginTop: 2 },
  body:        { paddingHorizontal: 16 },
  group:       { marginBottom: 24 },
  groupTitle:  { fontSize: 12, fontWeight: FONT_WEIGHT.semibold, color: '#6366F1', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card:        { width: '47%', borderRadius: 16, padding: 14, borderWidth: 1, gap: 6 },
  cardIcon:    { fontSize: 24 },
  cardLabel:   { fontSize: 14, fontWeight: FONT_WEIGHT.semibold },
  cardSub:     { fontSize: 11, color: '#64748B', lineHeight: 15 },
});