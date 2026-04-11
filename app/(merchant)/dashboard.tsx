/**
 * Zyrix App — Dashboard Screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Modal, Dimensions, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BarChart } from 'react-native-chart-kit';
import { COLORS } from '../../constants/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT, LAYOUT } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';
import { useCurrency } from '../../hooks/useCurrency';
import { useAuth } from '../../hooks/useAuth';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import { dashboardApi, analyticsApi } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { CurrencyPicker } from '../../components/CurrencyPicker';
import { HeaderBar } from '../../components/HeaderBar';
import type { ChartPeriod, CurrencyCode, ApiTransaction } from '../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

const KPI_THEMES = [
  {
    bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.40)',
    accent: '#06B6D4', iconBg: 'rgba(6, 182, 212, 0.22)',
    shades: ['rgba(6,182,212,0.35)', 'rgba(6,182,212,0.60)', 'rgba(6,182,212,1.00)'],
  },
  {
    bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.40)',
    accent: '#10B981', iconBg: 'rgba(16, 185, 129, 0.22)',
    shades: ['rgba(16,185,129,0.35)', 'rgba(16,185,129,0.60)', 'rgba(16,185,129,1.00)'],
  },
  {
    bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.40)',
    accent: '#EC4899', iconBg: 'rgba(236, 72, 153, 0.22)',
    shades: ['rgba(236,72,153,0.35)', 'rgba(236,72,153,0.60)', 'rgba(236,72,153,1.00)'],
  },
  {
    bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.40)',
    accent: '#F59E0B', iconBg: 'rgba(245, 158, 11, 0.22)',
    shades: ['rgba(245,158,11,0.35)', 'rgba(245,158,11,0.60)', 'rgba(245,158,11,1.00)'],
  },
];

const KPI_COMPARE_DATA = [
  { months: ['يناير', 'فبراير', 'مارس'], values: [64200, 78500, 86131], unit: 'ر.س', label: 'حجم المبيعات — آخر 3 أشهر' },
  { months: ['يناير', 'فبراير', 'مارس'], values: [48.2, 53.1, 56.7],   unit: '%',   label: 'نسبة النجاح — آخر 3 أشهر' },
  { months: ['يناير', 'فبراير', 'مارس'], values: [210, 268, 312],       unit: '',    label: 'عدد المعاملات — آخر 3 أشهر' },
  { months: ['يناير', 'فبراير', 'مارس'], values: [7, 4, 2],             unit: '',    label: 'النزاعات المفتوحة — آخر 3 أشهر' },
];

interface DashboardData {
  kpis: { totalVolume: number; successRate: string; todayTx: number; openDisputes: number };
  recentTransactions: ApiTransaction[];
  balance: { available: number; incoming: number; outgoing: number };
  unreadNotifications: number;
}

function ColoredKpiCard({
  label, value, icon, themeIndex, selected, onPress,
}: {
  label: string; value: string; icon: string;
  themeIndex: number; selected: boolean; onPress: () => void;
}) {
  const theme = KPI_THEMES[themeIndex];
  return (
    <TouchableOpacity
      style={[
        kpiS.card,
        { backgroundColor: theme.bg, borderColor: selected ? theme.accent : theme.border },
        selected && kpiS.cardSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={kpiS.iconRow}>
        <View style={[kpiS.iconBubble, { backgroundColor: theme.iconBg }]}>
          <Text style={kpiS.iconText}>{icon}</Text>
        </View>
        <Text style={kpiS.label} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[kpiS.value, { color: theme.accent }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <View style={[kpiS.accentBar, { backgroundColor: theme.accent, height: selected ? 4 : 3, opacity: selected ? 1 : 0.6 }]} />
      {selected && <View style={[kpiS.selDot, { backgroundColor: theme.accent }]} />}
    </TouchableOpacity>
  );
}

const kpiS = StyleSheet.create({
  card:        { flex: 1, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1.5, overflow: 'hidden', minHeight: 105 },
  cardSelected:{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6 },
  iconRow:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm },
  iconBubble:  { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconText:    { fontSize: 14 },
  label:       { flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },
  value:       { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.bold, marginBottom: SPACING.sm },
  accentBar:   { position: 'absolute', bottom: 0, left: 0, right: 0, borderRadius: 2 },
  selDot:      { position: 'absolute', top: 8, left: 8, width: 7, height: 7, borderRadius: 4 },
});

function PivotCompareChart({ themeIndex }: { themeIndex: number }) {
  const theme  = KPI_THEMES[themeIndex];
  const data   = KPI_COMPARE_DATA[themeIndex];
  const shades = theme.shades;

  const formatY = (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n)) return v;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
    if (data.unit === '%') return `${n}%`;
    return String(n);
  };

  const chartData = {
    labels: data.months,
    datasets: [{ data: data.values, colors: shades.map((shade) => (_opacity: number) => shade) }],
  };

  const config = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: COLORS.cardBg,
    backgroundGradientTo:   COLORS.cardBg,
    color: (_opacity = 1) => theme.accent,
    labelColor: () => COLORS.textSecondary,
    strokeWidth: 0,
    decimalPlaces: data.unit === '%' ? 1 : 0,
    propsForBackgroundLines: { strokeDasharray: '4,4', stroke: COLORS.border, strokeWidth: 1 },
    formatYLabel: formatY,
  };

  const change     = data.values[2] - data.values[1];
  const changePct  = data.values[1] !== 0 ? ((change / data.values[1]) * 100).toFixed(1) : '0';
  const isPositive = themeIndex === 3 ? change <= 0 : change >= 0;

  return (
    <View style={[pivS.container, { borderColor: theme.border }]}>
      <View style={pivS.headerRow}>
        <View style={[pivS.dot, { backgroundColor: theme.accent }]} />
        <Text style={[pivS.title, { color: theme.accent }]}>{data.label}</Text>
        <View style={[pivS.changeBadge, { backgroundColor: isPositive ? 'rgba(16,185,129,0.15)' : 'rgba(220,38,38,0.15)' }]}>
          <Text style={[pivS.changeText, { color: isPositive ? '#10B981' : '#F87171' }]}>
            {isPositive ? '▲' : '▼'} {Math.abs(parseFloat(changePct))}%
          </Text>
        </View>
      </View>
      <View style={pivS.legendRow}>
        {data.months.map((month, i) => (
          <View key={i} style={pivS.legendItem}>
            <View style={[pivS.legendDot, { backgroundColor: shades[i] }]} />
            <Text style={pivS.legendText}>{month}</Text>
          </View>
        ))}
      </View>
      <BarChart
        data={chartData}
        width={SCREEN_WIDTH - LAYOUT.screenPaddingH * 2 - SPACING.lg * 2}
        height={160}
        chartConfig={config}
        withCustomBarColorFromData flatColor showValuesOnTopOfBars withInnerLines
        style={pivS.chart}
        yAxisLabel="" yAxisSuffix={data.unit === '%' ? '%' : ''} fromZero
      />
      <View style={pivS.summaryRow}>
        {data.values.map((val, i) => (
          <View key={i} style={[
            pivS.summaryCell,
            i < 2 && { borderRightWidth: 1, borderRightColor: COLORS.border },
            i === 2 && { backgroundColor: `${theme.accent}10` },
          ]}>
            <Text style={pivS.sumLabel}>{data.months[i]}</Text>
            <Text style={[pivS.sumValue, { color: i === 2 ? theme.accent : COLORS.textSecondary }]}>
              {data.unit === '%' ? `${val}%` : val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(val)}
              {data.unit !== '' && data.unit !== '%' ? ` ${data.unit}` : ''}
            </Text>
          </View>
        ))}
      </View>
      <View style={[pivS.insightRow, { borderTopColor: theme.border }]}>
        <Text style={[pivS.insightText, { color: COLORS.textMuted }]}>
          💡 {isPositive
            ? `تحسّن بنسبة ${Math.abs(parseFloat(changePct))}% مقارنةً بالشهر الماضي`
            : `تراجع بنسبة ${Math.abs(parseFloat(changePct))}% مقارنةً بالشهر الماضي`}
        </Text>
      </View>
    </View>
  );
}

const pivS = StyleSheet.create({
  container:   { borderRadius: RADIUS.lg, borderWidth: 1.5, backgroundColor: COLORS.cardBg, overflow: 'hidden', marginTop: SPACING.md },
  headerRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xs, gap: SPACING.sm },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  title:       { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  changeBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  changeText:  { fontSize: 11, fontWeight: FONT_WEIGHT.bold },
  legendRow:   { flexDirection: 'row', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, gap: SPACING.lg },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendText:  { fontSize: 10, color: COLORS.textMuted },
  chart:       { marginLeft: -SPACING.sm, borderRadius: RADIUS.md },
  summaryRow:  { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  summaryCell: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm },
  sumLabel:    { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginBottom: 3 },
  sumValue:    { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  insightRow:  { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderTopWidth: 1 },
  insightText: { fontSize: FONT_SIZE.xs, lineHeight: 18 },
});

// ─── Side Menu — منظم باحترافية ──────────────────

interface MenuItem {
  icon: string;
  label: string;
  route: string;
  badge?: string;
}

interface MenuSection {
  title: string;
  accent: string;
  items: MenuItem[];
}

function SideMenu({ visible, onClose, unreadCount }: {
  visible: boolean;
  onClose: () => void;
  unreadCount: number;
}) {
  const router   = useRouter();
  const { user } = useAuth();

  // ─── القائمة مرتبة حسب أولوية التاجر ────────────
  // ─── القائمة مرتبة حسب تكرار الاستخدام ─────────────
  const sections: MenuSection[] = [
    {
      title: '⚡ يومياً',
      accent: '#6366F1',
      items: [
        { icon: '🔗', label: 'روابط الدفع',            route: '/(merchant)/payment-links' },
        { icon: '💳', label: 'المعاملات',              route: '/(merchant)/transactions' },
        { icon: '🔔', label: 'الإشعارات',              route: '/(merchant)/notifications', badge: unreadCount > 0 ? String(unreadCount) : undefined },
      ],
    },
    {
      title: '💰 المالية',
      accent: '#10B981',
      items: [
        { icon: '💵', label: 'الرصيد والمحافظ',        route: '/(merchant)/balance' },
        { icon: '🏦', label: 'التسويات',               route: '/(merchant)/settlements' },
        { icon: '📄', label: 'الفواتير',               route: '/(merchant)/invoices' },
        { icon: '📊', label: 'المصروفات',              route: '/(merchant)/expenses' },
        { icon: '🎯', label: 'أهداف الإيراد',          route: '/(merchant)/revenue-goals' },
        { icon: '↩️',  label: 'المستردات',              route: '/(merchant)/refunds' },
        { icon: '⚠️', label: 'النزاعات',               route: '/(merchant)/disputes' },
      ],
    },
    {
      title: '🌱 النمو',
      accent: '#34D399',
      items: [
        { icon: '🔄', label: 'الاشتراكات',             route: '/(merchant)/subscriptions' },
        { icon: '👥', label: 'العملاء',                route: '/(merchant)/customers' },
        { icon: '🤝', label: 'CRM',                    route: '/(merchant)/crm-integration' },
        { icon: '📢', label: 'التسويق',                route: '/(merchant)/marketing-automation' },
        { icon: '🌐', label: 'نظام الإحالة',           route: '/(merchant)/affiliate-system' },
        { icon: '🏪', label: 'Marketplace',            route: '/(merchant)/marketplace-split' },
        { icon: '🤝', label: 'الشركاء',               route: '/(merchant)/partner-dashboard' },
      ],
    },
    {
      title: '📊 التقارير',
      accent: '#60A5FA',
      items: [
        { icon: '📈', label: 'التحليلات',              route: '/(merchant)/analytics' },
        { icon: '📋', label: 'التقارير المالية',        route: '/(merchant)/financial-reports' },
        { icon: '🎯', label: 'قمع التحويل',            route: '/(merchant)/conversion-funnel' },
        { icon: '💡', label: 'الرؤى الذكية',           route: '/(merchant)/smart-insights' },
        { icon: '🔮', label: 'التحليل التنبؤي',        route: '/(merchant)/predictive-analytics' },
      ],
    },
    {
      title: '🔄 التحويلات',
      accent: '#F97316',
      items: [
        { icon: '💱', label: 'أسعار الصرف',            route: '/(merchant)/fx' },
        { icon: '🛒', label: 'الدفع عند الاستلام COD', route: '/(merchant)/cod' },
        { icon: '🏪', label: 'صفحة الدفع المستضافة',  route: '/(merchant)/hosted-checkout' },
        { icon: '💳', label: 'طرق الدفع',              route: '/(merchant)/payment-methods' },
        { icon: '📋', label: 'المطابقة',               route: '/(merchant)/reconciliation' },
      ],
    },
    {
      title: '⚙️ الإعدادات',
      accent: '#64748B',
      items: [
        { icon: '👤', label: 'الملف الشخصي',           route: '/(merchant)/profile' },
        { icon: '👥', label: 'إدارة الفريق',           route: '/(merchant)/multi-user' },
        { icon: '🔑', label: 'مفاتيح API',             route: '/(merchant)/api-keys' },
        { icon: '🔗', label: 'Webhooks',               route: '/(merchant)/webhooks' },
        { icon: '🔒', label: 'الأمان',                 route: '/(merchant)/2fa-setup' },
      ],
    },
  ]

  const handleNavigate = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 200);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={sm.overlay} activeOpacity={1} onPress={onClose} />
      <View style={sm.panel}>

        {/* Header */}
        <View style={sm.header}>
          <View style={sm.logoRow}>
            <View style={sm.logoBubble}>
              <Text style={sm.logoLetter}>Z</Text>
            </View>
            <View>
              <Text style={sm.brandName}>Zyrix</Text>
              <Text style={sm.merchantId}>{user?.merchantId ?? 'ZRX-10042'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={sm.closeBtn}>
            <Text style={sm.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={sm.divider} />

        <ScrollView style={sm.scrollArea} showsVerticalScrollIndicator={false}>
          {sections.map((section, sIdx) => (
            <View key={sIdx}>
              {/* Section Header */}
              <View style={[sm.sectionHeader, { borderLeftColor: section.accent }]}>
                <Text style={[sm.sectionTitle, { color: section.accent }]}>{section.title}</Text>
              </View>

              {/* Section Items */}
              {section.items.map((item, iIdx) => (
                <TouchableOpacity
                  key={iIdx}
                  style={sm.item}
                  onPress={() => handleNavigate(item.route)}
                  activeOpacity={0.7}
                >
                  <Text style={sm.itemIcon}>{item.icon}</Text>
                  <Text style={sm.itemLabel}>{item.label}</Text>
                  {item.badge && (
                    <View style={sm.badge}>
                      <Text style={sm.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <Text style={sm.arrow}>›</Text>
                </TouchableOpacity>
              ))}

              {sIdx < sections.length - 1 && <View style={sm.sectionDivider} />}
            </View>
          ))}



          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { currency, setCurrency, format, convert } = useCurrency('SAR');
  const { user } = useAuth();
  const tabBarHeight = useTabBarHeight();
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [chartPeriod]                 = useState<ChartPeriod>('7d');
  const [dashData, setDashData]       = useState<DashboardData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [_error, setError]            = useState<string | null>(null);
  const [selectedKpi, setSelectedKpi] = useState<number>(0);
  const BASE_CURRENCY: CurrencyCode   = 'SAR';

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const data = await dashboardApi.getData();
      try {
        const analytics = await analyticsApi.getData(chartPeriod);
        void analytics;
      } catch (_e) {}
      setDashData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally { setLoading(false); setRefreshing(false); }
  }, [chartPeriod, t]);

  useEffect(() => { fetchData(); }, [chartPeriod]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };
  const formatAmount = useCallback(
    (amount: number) => format(convert(amount, BASE_CURRENCY, currency), currency),
    [convert, format, currency],
  );

  const quickActions = [
    { icon: '🔗', label: 'رابط دفع جديد',  route: '/(merchant)/payment-links' },
    { icon: '💳', label: 'المعاملات',       route: '/(merchant)/transactions'  },
    { icon: '📊', label: 'التقارير',        route: '/(merchant)/reports'       },
    { icon: '💱', label: 'أسعار الصرف',    route: '/(merchant)/fx'            },
  ];

  const kpiCards = [
    { label: t('dashboard.totalVolume'),  value: formatAmount(dashData?.kpis?.totalVolume ?? 0), icon: '💳', themeIndex: 0 },
    { label: t('dashboard.successRate'),  value: `${dashData?.kpis?.successRate ?? '0'}%`,        icon: '✅', themeIndex: 1 },
    { label: t('dashboard.todayTx'),      value: String(dashData?.kpis?.todayTx ?? 0),            icon: '📋', themeIndex: 2 },
    { label: t('dashboard.openDisputes'), value: String(dashData?.kpis?.openDisputes ?? 0),       icon: '⚠️', themeIndex: 3 },
  ];

  if (loading && !dashData) {
    return (
      <View style={styles.container}>
        <HeaderBar onMenuPress={() => setMenuVisible(true)} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderBar
        onMenuPress={() => setMenuVisible(true)}
        onMessagesPress={() => router.push('/(merchant)/notifications')}
        unreadMessages={dashData?.unreadNotifications ?? 0}
      />
      <SideMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        unreadCount={dashData?.unreadNotifications ?? 0}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <CurrencyPicker selected={currency} onSelect={setCurrency} codes={['SAR', 'AED', 'KWD', 'QAR', 'USD']} />

        <View style={styles.kpiGrid}>
          <View style={[styles.kpiRow, isRTL && styles.kpiRowRTL]}>
            {kpiCards.slice(0, 2).map((card, i) => (
              <ColoredKpiCard key={i} label={card.label} value={card.value} icon={card.icon}
                themeIndex={card.themeIndex} selected={selectedKpi === i} onPress={() => setSelectedKpi(i)} />
            ))}
          </View>
          <View style={[styles.kpiRow, isRTL && styles.kpiRowRTL]}>
            {kpiCards.slice(2, 4).map((card, i) => (
              <ColoredKpiCard key={i + 2} label={card.label} value={card.value} icon={card.icon}
                themeIndex={card.themeIndex} selected={selectedKpi === i + 2} onPress={() => setSelectedKpi(i + 2)} />
            ))}
          </View>
        </View>

        <PivotCompareChart themeIndex={selectedKpi} />

        <View style={styles.quickActionsContainer}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('dashboard.quick_actions')}</Text>
          <View style={[styles.quickGrid, isRTL && styles.quickGridRTL]}>
            {quickActions.map((qa, idx) => (
              <TouchableOpacity key={idx} style={styles.quickBtn} onPress={() => router.push(qa.route as any)} activeOpacity={0.7}>
                <Text style={styles.quickIcon}>{qa.icon}</Text>
                <Text style={styles.quickLabel} numberOfLines={1}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('dashboard.recentTransactions')}</Text>
          <TouchableOpacity onPress={() => router.push('/(merchant)/transactions')}>
            <Text style={styles.viewAllText}>{t('dashboard.viewAll')}</Text>
          </TouchableOpacity>
        </View>

        {(dashData?.recentTransactions ?? []).map((tx: ApiTransaction) => (
          <TouchableOpacity key={tx.id} style={[styles.txRow, isRTL && styles.txRowRTL]} activeOpacity={0.7}>
            <View style={[styles.txLeft, isRTL && styles.txLeftRTL]}>
              <Text style={styles.txFlag}>{tx.countryFlag ?? '🌍'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txName, isRTL && styles.textRTL]} numberOfLines={1}>{tx.customerName ?? 'Customer'}</Text>
                <Text style={[styles.txDate, isRTL && styles.textRTL]}>{new Date(tx.createdAt).toLocaleDateString('ar-SA')}</Text>
              </View>
            </View>
            <View style={[styles.txRight, isRTL && styles.txRightRTL]}>
              <Text style={[styles.txAmount, { color: tx.isCredit ? COLORS.success : COLORS.danger }]}>
                {tx.isCredit ? '+' : '-'}{formatAmount(parseFloat(tx.amount))}
              </Text>
              <StatusBadge status={tx.status} />
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.settlementCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('dashboard.nextSettlement')}</Text>
          <View style={[styles.settlementRow, isRTL && styles.settlementRowRTL]}>
            <View>
              <Text style={styles.settlementLabel}>23.03.2026</Text>
              <Text style={styles.settlementPeriod}>16–22 Mar</Text>
            </View>
            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
              <Text style={styles.settlementAmount}>{formatAmount(2042.45)}</Text>
              <StatusBadge status="pending" />
            </View>
          </View>
        </View>

        <View style={{ height: tabBarHeight }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:             { flex: 1, backgroundColor: COLORS.darkBg },
  scrollView:            { flex: 1 },
  scrollContent:         { paddingHorizontal: LAYOUT.screenPaddingH, paddingTop: SPACING.lg },
  textRTL:               { textAlign: 'right', writingDirection: 'rtl' },
  kpiGrid:               { gap: SPACING.sm, marginTop: SPACING.lg },
  kpiRow:                { flexDirection: 'row', gap: SPACING.sm },
  kpiRowRTL:             { flexDirection: 'row-reverse' },
  quickActionsContainer: { marginTop: SPACING.xl },
  quickGrid:             { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  quickGridRTL:          { flexDirection: 'row-reverse' },
  quickBtn:              { flex: 1, backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, paddingVertical: SPACING.md, alignItems: 'center', gap: 4 },
  quickIcon:             { fontSize: 22 },
  quickLabel:            { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },
  sectionHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.xl, marginBottom: SPACING.md },
  sectionHeaderRTL:      { flexDirection: 'row-reverse' },
  sectionTitle:          { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  viewAllText:           { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: COLORS.primaryLight },
  txRow:                 { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  txRowRTL:              { flexDirection: 'row-reverse' },
  txLeft:                { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.sm },
  txLeftRTL:             { flexDirection: 'row-reverse' },
  txFlag:                { fontSize: 24 },
  txName:                { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: COLORS.textPrimary },
  txDate:                { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  txRight:               { alignItems: 'flex-end', gap: SPACING.xs },
  txRightRTL:            { alignItems: 'flex-start' },
  txAmount:              { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  settlementCard:        { backgroundColor: 'rgba(13, 148, 136, 0.12)', borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(13, 148, 136, 0.35)', marginTop: SPACING.xl },
  settlementRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.md },
  settlementRowRTL:      { flexDirection: 'row-reverse' },
  settlementLabel:       { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  settlementPeriod:      { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  settlementAmount:      { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.success, marginBottom: SPACING.xs },
});

const sm = StyleSheet.create({
  overlay:        { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  panel:          { position: 'absolute', top: 0, right: 0, bottom: 0, width: SCREEN_WIDTH * 0.82, backgroundColor: COLORS.deepBg, shadowColor: '#000', shadowOffset: { width: -3, height: 0 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 20 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  logoRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBubble:     { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  logoLetter:     { fontSize: 20, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.white },
  brandName:      { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, letterSpacing: 1 },
  merchantId:     { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2, fontFamily: 'monospace' },
  closeBtn:       { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeBtnText:   { fontSize: 14, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.bold },
  divider:        { height: 1, backgroundColor: COLORS.border, marginHorizontal: 20, marginBottom: 8 },
  scrollArea:     { flex: 1 },

  // Section Headers
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6, borderLeftWidth: 3, marginLeft: 10 },
  sectionTitle:   { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },

  // Items
  item:           { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13, gap: 12 },
  itemIcon:       { fontSize: 18, width: 26, textAlign: 'center' },
  itemLabel:      { flex: 1, fontSize: 14, color: COLORS.textPrimary, fontWeight: '500', textAlign: 'right' },
  arrow:          { fontSize: 16, color: 'rgba(255,255,255,0.2)', fontWeight: '300' },

  // Badge
  badge:          { backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText:      { color: '#fff', fontSize: 10, fontWeight: '800' },

  // Section Divider
  sectionDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 20, marginTop: 8 },

  // Settings Button
  settingsBtn:    { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, marginTop: 8, gap: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  settingsIcon:   { fontSize: 18, width: 26, textAlign: 'center' },
  settingsLabel:  { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600', textAlign: 'right' },
});