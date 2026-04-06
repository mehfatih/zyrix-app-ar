/**
 * Zyrix App — Merchant Tab Layout
 * Pill-shaped floating tab bar (Telegram style)
 */

import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT, SPACING } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useDeepLinking } from '../../hooks/useDeepLinking';
import { notificationsApi } from '../../services/api';

// ─── Tab Icon ────────────────────────────────────

function TabIcon({
  icon, label, focused, badge,
}: {
  icon: string; label: string; focused: boolean; badge?: number;
}) {
  return (
    <View style={[tabS.item, focused && tabS.itemFocused]}>
      <View style={tabS.iconWrap}>
        <Text style={[tabS.icon, focused && tabS.iconFocused]}>{icon}</Text>
        {badge !== undefined && badge > 0 && (
          <View style={tabS.badge}>
            <Text style={tabS.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[tabS.label, focused && tabS.labelFocused]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const tabS = StyleSheet.create({
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 2,
    minWidth: 56,
  },
  itemFocused: {
    backgroundColor: `${COLORS.primary}25`,
  },
  iconWrap: { position: 'relative' },
  icon: { fontSize: 22, opacity: 0.45 },
  iconFocused: { opacity: 1 },
  label: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.tabInactive,
    letterSpacing: 0.2,
  },
  labelFocused: {
    color: COLORS.primaryLight,
    fontWeight: FONT_WEIGHT.semibold,
  },
  badge: {
    position: 'absolute',
    top: -4, right: -8,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    minWidth: 15, height: 15,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: COLORS.deepBg,
  },
  badgeText: { color: COLORS.white, fontSize: 8, fontWeight: '700' },
});

// ─── Layout ──────────────────────────────────────

export default function MerchantLayout() {
  usePushNotifications();
  useDeepLinking();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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

  // ارتفاع الـ pill + المسافة من الأسفل
  const pillBottom = Platform.select({
    ios:     insets.bottom + 8,
    android: insets.bottom + 12,
    default: 12,
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          // الحجم والشكل
          height: 64,
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: pillBottom,
          borderRadius: 32,
          // ألوان
          backgroundColor: COLORS.deepBg,
          borderTopWidth: 0,
          // ظل
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 12,
          // مسافات داخلية
          paddingHorizontal: 4,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: COLORS.tabActive,
        tabBarInactiveTintColor: COLORS.tabInactive,
        // مسافة للمحتوى تحت الـ pill
        tabBarItemStyle: {
          borderRadius: 28,
          marginVertical: 6,
          marginHorizontal: 2,
        },
      }}
    >
      {/* ── Visible Tabs ── */}
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🏠" label={t('tabs.dashboard')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="💳" label={t('tabs.transactions')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="balance"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="💰" label={t('tabs.balance')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="📊" label={t('tabs.analytics')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="⚙️" label={t('tabs.settings')} focused={focused} />
          ),
        }}
      />

      {/* ── Hidden Screens ── */}
      <Tabs.Screen name="transaction-detail" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="settlements"        options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="refunds"            options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="disputes"           options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="profile"            options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="notifications"      options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="payment-links"      options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="onboarding"         options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="subscriptions"      options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="revenue-goals"      options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="expenses"           options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="invoices"           options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="transfers"          options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="api-keys"           options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="webhooks"           options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="cod"                options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="fx"                 options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="2fa-setup"          options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="change-password"    options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="search"             options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="help"               options={{ tabBarButton: () => null }} />
    </Tabs>
  );
}