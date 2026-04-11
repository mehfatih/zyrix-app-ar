import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import {
  View, Text, StyleSheet, Platform, TouchableOpacity,
  Dimensions, Modal, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { FONT_WEIGHT } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useDeepLinking } from '../../hooks/useDeepLinking';
import { notificationsApi } from '../../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Quick Pay Sheet ────────────────────────────────────────────────────────
function QuickPaySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { t } = useTranslation();

  const actions = [
    { icon: '🔗', label: t('payment_links.create_link') || 'رابط دفع جديد',   route: '/(merchant)/create-payment-link' },
    { icon: '📄', label: t('invoices.new_invoice')      || 'فاتورة جديدة',     route: '/(merchant)/invoices' },
    { icon: '📦', label: t('drawer.cod')                || 'طلب COD',          route: '/(merchant)/cod' },
    { icon: '📷', label: 'QR سريع',                                            route: '/(merchant)/payment-links' },
  ];

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheet.overlay} onPress={onClose} />
      <View style={sheet.container}>
        <View style={sheet.handle} />
        <Text style={sheet.title}>إجراء سريع</Text>
        <View style={sheet.grid}>
          {actions.map((a) => (
            <TouchableOpacity
              key={a.route}
              style={sheet.actionBtn}
              onPress={() => { onClose(); router.push(a.route as any); }}
              activeOpacity={0.75}
            >
              <Text style={sheet.actionIcon}>{a.icon}</Text>
              <Text style={sheet.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  container:   { backgroundColor: '#0F1E35', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle:      { width: 40, height: 4, backgroundColor: '#334155', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:       { color: '#E2E8F0', fontSize: 16, fontWeight: FONT_WEIGHT.semibold, textAlign: 'center', marginBottom: 20 },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  actionBtn:   { width: (SCREEN_WIDTH - 80) / 2, backgroundColor: '#1E293B', borderRadius: 16, padding: 18, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#334155' },
  actionIcon:  { fontSize: 28 },
  actionLabel: { color: '#94A3B8', fontSize: 12, textAlign: 'center', fontWeight: FONT_WEIGHT.medium },
});

// ─── Custom Tab Bar ──────────────────────────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [paySheetVisible, setPaySheetVisible] = useState(false);

  const pillBottom = Platform.select({
    ios:     insets.bottom + 8,
    android: insets.bottom + 10,
    default: 10,
  });

  // RTL order: rightmost tab first
  const tabConfig = [
    { name: 'dashboard',    icon: '🏠', label: t('tabs.dashboard')  || 'الرئيسية'  },
    { name: 'growth',       icon: '🌱', label: t('tabs.growth')     || 'النمو'     },
    { name: '__pay__',      icon: '+',  label: t('tabs.pay')        || 'دفع'       },
    { name: 'reports',      icon: '📊', label: t('tabs.reports')    || 'التقارير'  },
    { name: 'transfers',    icon: '🔄', label: t('tabs.transfers')  || 'التحويلات' },
  ];

  const visibleRoutes = state.routes.filter(r =>
    ['dashboard', 'growth', 'reports', 'transfers'].includes(r.name)
  );

  return (
    <>
      <QuickPaySheet visible={paySheetVisible} onClose={() => setPaySheetVisible(false)} />

      <View style={[tabBarS.wrapper, { bottom: pillBottom }]}>
        <View style={tabBarS.pill}>
          {tabConfig.map((tc) => {

            // ── Centre FAB ──────────────────────────────────────────────
            if (tc.name === '__pay__') {
              return (
                <View key="__pay__" style={tabBarS.fabWrap}>
                  <TouchableOpacity
                    style={tabBarS.fab}
                    onPress={() => setPaySheetVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={tabBarS.fabIcon}>+</Text>
                  </TouchableOpacity>
                  <Text style={tabBarS.fabLabel}>{tc.label}</Text>
                </View>
              );
            }

            // ── Regular tab ─────────────────────────────────────────────
            const route = visibleRoutes.find(r => r.name === tc.name);
            if (!route) return null;
            const index   = state.routes.indexOf(route);
            const focused = state.index === index;

            return (
              <TouchableOpacity
                key={tc.name}
                style={[tabBarS.item, focused && tabBarS.itemFocused]}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress', target: route.key, canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
                activeOpacity={0.7}
              >
                <Text style={tabBarS.icon}>{tc.icon}</Text>
                <Text style={[tabBarS.label, focused && tabBarS.labelFocused]} numberOfLines={1}>
                  {tc.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  );
}

const tabBarS = StyleSheet.create({
  wrapper:      { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  pill:         {
    flexDirection: 'row', width: '100%', height: 68, borderRadius: 34,
    backgroundColor: 'rgba(10, 18, 40, 0.97)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.40, shadowRadius: 16, elevation: 16,
    paddingHorizontal: 8, alignItems: 'center',
  },
  item:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 4, borderRadius: 24, gap: 3 },
  itemFocused:  { backgroundColor: 'rgba(99, 102, 241, 0.18)' },
  icon:         { fontSize: 20 },
  label:        { fontSize: 10, fontWeight: FONT_WEIGHT.medium, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.2, textAlign: 'center' },
  labelFocused: { color: '#A5B4FC', fontWeight: FONT_WEIGHT.semibold },

  // FAB
  fabWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: -18 },
  fab:       {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#4F46E5',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(10,18,40,0.97)',
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 10,
  },
  fabIcon:   { fontSize: 26, color: '#fff', lineHeight: 30 },
  fabLabel:  { fontSize: 10, color: '#A5B4FC', fontWeight: FONT_WEIGHT.semibold, textAlign: 'center' },
});

// ─── Merchant Layout ─────────────────────────────────────────────────────────
export default function MerchantLayout() {
  usePushNotifications();
  useDeepLinking();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await notificationsApi.list();
        setUnreadCount(res.unreadCount);
      } catch (_e) {}
    };
    fetch();
    const iv = setInterval(fetch, 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>

      {/* ── Main Tabs (5 tabs → 4 real routes + FAB) ── */}
      <Tabs.Screen name="dashboard"  />
      <Tabs.Screen name="growth"     />
      <Tabs.Screen name="reports"    />
      <Tabs.Screen name="transfers"  />

      {/* ── Hidden Screens ── */}
      <Tabs.Screen name="transaction-detail"    options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="settlements"           options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="refunds"               options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="disputes"              options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="profile"               options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="notifications"         options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="payment-links"         options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="onboarding"            options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="subscriptions"         options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="revenue-goals"         options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="expenses"              options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="invoices"              options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="transfers"             options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="api-keys"              options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="webhooks"              options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="cod"                   options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="fx"                    options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="2fa-setup"             options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="change-password"       options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="search"                options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="help"                  options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="multi-user"            options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="failed-transactions"   options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="reconciliation"        options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="customers"             options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="customer-detail"       options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="feature-flags"         options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="wallets"               options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="analytics"             options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="balance"               options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="settings"              options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="transactions"          options={{ tabBarButton: () => null }} />

      {/* ── Layer 2: Payment Optimization ── */}
      <Tabs.Screen name="gateway-routing"       options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="cross-retry"           options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="bin-intelligence"      options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="dynamic-checkout"      options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="fraud-detection"       options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="tokenization"          options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="chargeback-prevention" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="approval-optimization" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="payment-methods"       options={{ tabBarButton: () => null }} />

      {/* ── Layer 3: Revenue & Finance ── */}
      <Tabs.Screen name="financial-reports"     options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="payout-scheduling"     options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="commission-engine"     options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="tax-engine"            options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="revenue-recovery"      options={{ tabBarButton: () => null }} />

      {/* ── Layer 4: Analytics & Intelligence ── */}
      <Tabs.Screen name="realtime-dashboard"    options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="conversion-funnel"     options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="success-rate-analysis" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="revenue-breakdown"     options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="customer-clv"          options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="cohort-analysis"       options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="smart-insights"        options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="predictive-analytics"  options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="alerts-engine"         options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="ab-testing"            options={{ tabBarButton: () => null }} />

      {/* ── Layer 6: Growth & Automation ── */}
      <Tabs.Screen name="advanced-notifications" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="payment-reminders"      options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="crm-integration"        options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="marketing-automation"   options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="affiliate-system"       options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="team-accounts"          options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="permissions-engine"     options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="marketplace-split"      options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="partner-dashboard"      options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="growth-experiments"     options={{ tabBarButton: () => null }} />

      {/* ── UX Layer 5 ── */}
      <Tabs.Screen name="guided-setup"          options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="empty-states"          options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="mobile-ui"             options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="speed-optimization"    options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="multi-language"        options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="micro-interactions"    options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="embedded-help"         options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="dark-premium-ui"       options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="accessibility"         options={{ tabBarButton: () => null }} />

      {/* ── Hosted Checkout ── */}
      <Tabs.Screen name="hosted-checkout"       options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="hosted-checkout-detail" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="create-hosted-checkout" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="create-payment-link"   options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="payment-link-detail"   options={{ tabBarButton: () => null }} />

    </Tabs>
  );
}