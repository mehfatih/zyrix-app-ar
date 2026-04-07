/**
 * Zyrix App — Merchant Tab Layout
 * expo-router v5 / SDK 53 compatible
 */

import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import {
  View, Text, StyleSheet, Platform, TouchableOpacity, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { COLORS } from '../../constants/colors';
import { FONT_WEIGHT } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useDeepLinking } from '../../hooks/useDeepLinking';
import { notificationsApi } from '../../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Tab Bar مخصص بالكامل ────────────────────────
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const pillBottom = Platform.select({
    ios: insets.bottom + 8,
    android: insets.bottom + 10,
    default: 10,
  });

  const tabConfig = [
    { name: 'settings',     icon: '⚙️', label: t('tabs.settings') },
    { name: 'analytics',    icon: '📊', label: t('tabs.analytics') },
    { name: 'balance',      icon: '💰', label: t('tabs.balance') },
    { name: 'transactions', icon: '💳', label: t('tabs.transactions') },
    { name: 'dashboard',    icon: '🏠', label: t('tabs.dashboard') },
  ];

  // فقط الـ tabs الـ 5 الرئيسية
  const visibleRoutes = state.routes.filter(route =>
    tabConfig.some(tc => tc.name === route.name)
  );

  return (
    <View style={[tabBarS.wrapper, { bottom: pillBottom }]}>
      <View style={tabBarS.pill}>
        {tabConfig.map((tc) => {
          const route = visibleRoutes.find(r => r.name === tc.name);
          if (!route) return null;
          const index = state.routes.indexOf(route);
          const focused = state.index === index;

          return (
            <TouchableOpacity
              key={tc.name}
              style={[tabBarS.item, focused && tabBarS.itemFocused]}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
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
  );
}

const tabBarS = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    width: '100%',
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(10, 18, 40, 0.97)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.40,
    shadowRadius: 16,
    elevation: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 24,
    gap: 3,
  },
  itemFocused: {
    backgroundColor: 'rgba(59, 130, 246, 0.20)',
  },
  icon: { fontSize: 22 },
  label: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.medium,
    color: 'rgba(255,255,255,0.50)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  labelFocused: {
    color: '#93C5FD',
    fontWeight: FONT_WEIGHT.semibold,
  },
});

// ─── Layout ───────────────────────────────────────
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
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="settings"     />
      <Tabs.Screen name="analytics"    />
      <Tabs.Screen name="balance"      />
      <Tabs.Screen name="transactions" />
      <Tabs.Screen name="dashboard"    />

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