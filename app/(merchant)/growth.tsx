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
    title: 'يومياً',
    items: [
      { icon: '🔗', label: 'روابط الدفع',     sub: 'إنشاء · مشاركة · QR',         route: '/(merchant)/payment-links',        accent: '#6366F1', bg: '#1E1B4B' },
      { icon: '📄', label: 'الفواتير',         sub: 'إنشاء · ZATCA · تذكيرات',      route: '/(merchant)/invoices',             accent: '#06B6D4', bg: '#0E2A3A' },
      { icon: '🔔', label: 'تذكيرات الدفع',   sub: 'تسلسلات تلقائية',              route: '/(merchant)/payment-reminders',    accent: '#F59E0B', bg: '#2A1E08' },
    ],
  },
  {
    title: 'أسبوعياً',
    items: [
      { icon: '🔄', label: 'الاشتراكات',       sub: 'Smart Retry · Dunning',         route: '/(merchant)/subscriptions',        accent: '#10B981', bg: '#0D2A1F' },
      { icon: '👥', label: 'العملاء',           sub: 'RFM · Segmentation · CLV',      route: '/(merchant)/customers',            accent: '#8B5CF6', bg: '#1E1040' },
      { icon: '🤝', label: 'CRM',               sub: 'HubSpot · Zapier · Zoho',       route: '/(merchant)/crm-integration',      accent: '#EC4899', bg: '#2A0F1E' },
    ],
  },
  {
    title: 'النمو والتوسع',
    items: [
      { icon: '📢', label: 'التسويق',           sub: 'حملات · Triggers · Segments',   route: '/(merchant)/marketing-automation', accent: '#F97316', bg: '#2A1208' },
      { icon: '🌐', label: 'نظام الإحالة',      sub: 'Affiliate · Tracking · Payouts', route: '/(merchant)/affiliate-system',    accent: '#34D399', bg: '#0D2A1F' },
      { icon: '🏪', label: 'Marketplace',        sub: 'Split · Vendors · Settlements', route: '/(merchant)/marketplace-split',   accent: '#60A5FA', bg: '#0E1F3A' },
      { icon: '🤝', label: 'لوحة الشركاء',      sub: 'Distributors · Revenue Share',  route: '/(merchant)/partner-dashboard',   accent: '#A78BFA', bg: '#1A1040' },
      { icon: '🧪', label: 'تجارب النمو',       sub: 'A/B Tests · Loops · Metrics',   route: '/(merchant)/growth-experiments',  accent: '#F472B6', bg: '#2A0F1E' },
    ],
  },
];

export default function GrowthScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={s.header}>
        <Text style={s.headerTitle}>النمو</Text>
        <Text style={s.headerSub}>روابط · اشتراكات · عملاء · تسويق</Text>
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