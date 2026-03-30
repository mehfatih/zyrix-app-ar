/**
 * Zyrix App — Dashboard Screen
 * Main merchant dashboard with KPIs, chart, recent transactions, and settlement info.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  I18nManager,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { COLORS, chartColorFn } from '../../constants/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT, LAYOUT } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';
import { useCurrency } from '../../hooks/useCurrency';
import { useAuth } from '../../hooks/useAuth';
import { dashboardApi, analyticsApi } from '../../services/api';
import { KpiCard } from '../../components/KpiCard';
import { StatusBadge } from '../../components/StatusBadge';
import { CurrencyPicker } from '../../components/CurrencyPicker';
import type { ChartPeriod, ApiTransaction } from '../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return 'dashboard.greeting';
  if (h < 18) return 'dashboard.greetingAfternoon';
  return 'dashboard.greetingEvening';
}

interface DashboardData {
  kpis: {
    totalVolume: number;
    successRate: string;
    todayTx: number;
    openDisputes: number;
  };
  recentTransactions: ApiTransaction[];
  balance: {
    available: number;
    incoming: number;
    outgoing: number;
  };
  unreadNotifications: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { currency, setCurrency, format } = useCurrency('TRY');
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('7d');
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [chartLabels, setChartLabels] = useState<string[]>(['', '', '', '', '', '', '']);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const data = await dashboardApi.getData();
      try {
        const analytics = await analyticsApi.getData(chartPeriod);
        setChartData(analytics.volume.map((v: { value: number }) => v.value));
        setChartLabels(analytics.volume.map((v: { label: string }) => v.label));
      } catch { /* chart data is non-critical */ }
      setDashData(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('common.error');
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [chartPeriod, t]);

  useEffect(() => { fetchData(); }, [chartPeriod]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const chartConfig = useMemo(
    () => ({
      backgroundColor: COLORS.cardBg,
      backgroundGradientFrom: COLORS.cardBg,
      backgroundGradientTo: COLORS.cardBg,
      color: chartColorFn(COLORS.primary),
      labelColor: () => COLORS.textSecondary,
      strokeWidth: 2,
      decimalPlaces: 0,
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: COLORS.primary,
      },
      propsForBackgroundLines: {
        strokeDasharray: '',
        stroke: COLORS.divider,
        strokeWidth: 1,
      },
    }),
    [],
  );

  const periods: ChartPeriod[] = ['7d', '30d', '90d'];

  const quickActions = [
    { icon: '🔗', label: t('dashboard.payment_links'), route: '/(merchant)/payment-links' },
    { icon: '🔔', label: t('dashboard.notifications_action'), route: '/(merchant)/notifications' },
    { icon: '⚠️', label: t('dashboard.disputes_action'), route: '/(merchant)/disputes' },
    { icon: '🔄', label: t('dashboard.subscriptions'), route: '/(merchant)/subscriptions' },
  ];

  if (loading && !dashData) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* ── Header ── */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, isRTL && styles.textRTL]}>
            {t(getGreetingKey(), { name: user?.name?.split(' ')[0] ?? 'Merchant' })}
          </Text>
          <Text style={[styles.merchantId, isRTL && styles.textRTL]}>
            {user?.merchantId ?? 'ZRX-10042'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.notifButton}
          onPress={() => router.push('/(merchant)/notifications')}
        >
          <Text style={styles.notifIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* ── Currency Picker ── */}
      <CurrencyPicker
        selected={currency}
        onSelect={setCurrency}
        codes={['TRY', 'SAR', 'AED', 'KWD', 'QAR']}
      />

      {/* ── KPI Cards (2x2 grid) ── */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiRow, isRTL && styles.kpiRowRTL]}>
          <KpiCard
            label={t('dashboard.totalVolume')}
            value={format(dashData?.kpis?.totalVolume ?? 0)}
            icon="💳"
            color={COLORS.primary}
          />
          <KpiCard
            label={t('dashboard.successRate')}
            value={`${dashData?.kpis?.successRate ?? '0'}%`}
            icon="✅"
            color={COLORS.success}
          />
        </View>
        <View style={[styles.kpiRow, isRTL && styles.kpiRowRTL]}>
          <KpiCard
            label={t('dashboard.todayTx')}
            value={String(dashData?.kpis?.todayTx ?? 0)}
            icon="📋"
            color={COLORS.info}
          />
          <KpiCard
            label={t('dashboard.openDisputes')}
            value={String(dashData?.kpis?.openDisputes ?? 0)}
            icon="⚠️"
            color={COLORS.warning}
          />
        </View>
      </View>

      {/* ── Quick Actions ── */}
      <View style={styles.quickActionsContainer}>
        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
          {t('dashboard.quick_actions')}
        </Text>
        <View style={[styles.quickGrid, isRTL && styles.quickGridRTL]}>
          {quickActions.map((qa, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.quickBtn}
              onPress={() => router.push(qa.route as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickIcon}>{qa.icon}</Text>
              <Text style={styles.quickLabel} numberOfLines={1}>{qa.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Payment Volume Chart ── */}
      <View style={styles.chartCard}>
        <View style={[styles.chartHeader, isRTL && styles.chartHeaderRTL]}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
            {t('dashboard.paymentVolume')}
          </Text>
          <View style={styles.periodRow}>
            {periods.map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.periodPill,
                  chartPeriod === p && styles.periodPillActive,
                ]}
                onPress={() => setChartPeriod(p)}
              >
                <Text
                  style={[
                    styles.periodText,
                    chartPeriod === p && styles.periodTextActive,
                  ]}
                >
                  {t(`dashboard.period${p}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <LineChart
          data={{
            labels: chartLabels.length > 0 ? chartLabels : [''],
            datasets: [{ data: chartData.length > 0 ? chartData : [0] }],
          }}
          width={SCREEN_WIDTH - SPACING.lg * 4}
          height={180}
          chartConfig={chartConfig}
          bezier
          withInnerLines={false}
          withOuterLines={false}
          withHorizontalLabels
          withVerticalLabels
          style={styles.chart}
        />
      </View>

      {/* ── Recent Transactions ── */}
      <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
          {t('dashboard.recentTransactions')}
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(merchant)/transactions')}
        >
          <Text style={styles.viewAllText}>{t('dashboard.viewAll')}</Text>
        </TouchableOpacity>
      </View>

      {(dashData?.recentTransactions ?? []).map((tx: ApiTransaction) => (
        <TouchableOpacity key={tx.id} style={[styles.txRow, isRTL && styles.txRowRTL]} activeOpacity={0.7}>
          <View style={[styles.txLeft, isRTL && styles.txLeftRTL]}>
            <Text style={styles.txFlag}>{tx.countryFlag ?? '🌍'}</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.txName, isRTL && styles.textRTL]}
                numberOfLines={1}
              >
                {tx.customerName ?? 'Customer'}
              </Text>
              <Text style={[styles.txDate, isRTL && styles.textRTL]}>
                {new Date(tx.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <View style={[styles.txRight, isRTL && styles.txRightRTL]}>
            <Text
              style={[
                styles.txAmount,
                { color: tx.isCredit ? COLORS.success : COLORS.danger },
              ]}
            >
              {tx.isCredit ? '+' : '-'}{format(parseFloat(tx.amount))}
            </Text>
            <StatusBadge status={tx.status} />
          </View>
        </TouchableOpacity>
      ))}

      {/* ── Next Settlement Card ── */}
      <View style={styles.settlementCard}>
        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
          {t('dashboard.nextSettlement')}
        </Text>
        <View style={[styles.settlementRow, isRTL && styles.settlementRowRTL]}>
          <View>
            <Text style={styles.settlementLabel}>23.03.2026</Text>
            <Text style={styles.settlementPeriod}>16–22 Mar</Text>
          </View>
          <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
            <Text style={styles.settlementAmount}>{format(2042.45)}</Text>
            <StatusBadge status="pending" />
          </View>
        </View>
      </View>

      {/* Bottom spacing */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenPaddingH,
    paddingTop: SPACING['5xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  greeting: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  merchantId: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  notifButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notifIcon: {
    fontSize: 18,
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  kpiGrid: {
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  kpiRowRTL: {
    flexDirection: 'row-reverse',
  },
  // ── Quick Actions ──
  quickActionsContainer: {
    marginTop: SPACING.xl,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  quickGridRTL: {
    flexDirection: 'row-reverse',
  },
  quickBtn: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    gap: 4,
  },
  quickIcon: {
    fontSize: 22,
  },
  quickLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
  },
  // ── Chart ──
  chartCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.xl,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  chartHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  periodRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  periodPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  periodPillActive: {
    backgroundColor: `${COLORS.primary}20`,
  },
  periodText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHT.medium,
  },
  periodTextActive: {
    color: COLORS.primaryLight,
    fontWeight: FONT_WEIGHT.semibold,
  },
  chart: {
    borderRadius: RADIUS.md,
    marginLeft: -SPACING.md,
  },
  // ── Section ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  sectionHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  viewAllText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.primaryLight,
  },
  // ── Transaction Row ──
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  txRowRTL: {
    flexDirection: 'row-reverse',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  txLeftRTL: {
    flexDirection: 'row-reverse',
  },
  txFlag: {
    fontSize: 24,
  },
  txName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
  },
  txDate: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  txRightRTL: {
    alignItems: 'flex-start',
  },
  txAmount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  // ── Settlement Card ──
  settlementCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.xl,
  },
  settlementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  settlementRowRTL: {
    flexDirection: 'row-reverse',
  },
  settlementLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  settlementPeriod: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  settlementAmount: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.success,
    marginBottom: SPACING.xs,
  },
});
