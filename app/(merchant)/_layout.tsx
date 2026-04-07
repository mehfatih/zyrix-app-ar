/**
 * Zyrix App — Merchant Tab Layout
 * Pill-shaped floating tab bar (Telegram style)
 */

import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { FONT_WEIGHT } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useDeepLinking } from '../../hooks/useDeepLinking';
import { notificationsApi } from '../../services/api';

function TabIcon({ icon, label, focused, badge }: {
  icon: string; label: string; focused: boolean; badge?: number;
}) {
  return (
    <View style={[tabS.item, focused && tabS.itemFocused]}>
      <View style={tabS.iconWrap}>
        <Text style={tabS.icon}>{icon}</Text>
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
    paddingHorizontal: 6,
    borderRadius: 24,
    gap: 3,
    flex: 1,
  },
  itemFocused: {
    backgroundColor: 'rgba(59, 130, 246, 0.20)',
  },
  iconWrap: { position: 'relative' },
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
  badge: {
    position: 'absolute',
    top: -4, right: -8,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    minWidth: 15, height: 15,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: 'rgba(10,18,40,0.97)',
  },
  badgeText: { color: COLORS.white, fontSize: 8, fontWeight: '700' },
});

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

  const pillBottom = Platform.select({
    ios: insets.bottom + 8,
    android: insets.bottom + 10,
    default: 10,
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: pillBottom,
          height: 68,
          borderRadius: 34,
          backgroundColor: 'rgba(10, 18, 40, 0.97)',
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.40,
          shadowRadius: 16,
          elevation: 16,
          paddingHorizontal: 8,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: COLORS.primaryLight,
        tabBarInactiveTintColor: COLORS.tabInactive,
        tabBarItemStyle: {
          paddingVertical: 0,
          paddingHorizontal: 0,
          marginHorizontal: 2,
        },
      }}
    >
      {/*
        الترتيب في الكود = من اليسار لليمين على الشاشة
        settings  → أقصى اليسار
        dashboard → أقصى اليمين
      */}
      <Tabs.Screen name="settings"     options={{ tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" label={t('tabs.settings')}     focused={focused} /> }} />
      <Tabs.Screen name="analytics"    options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📊" label={t('tabs.analytics')}    focused={focused} /> }} />
      <Tabs.Screen name="balance"      options={{ tabBarIcon: ({ focused }) => <TabIcon icon="💰" label={t('tabs.balance')}      focused={focused} /> }} />
      <Tabs.Screen name="transactions" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="💳" label={t('tabs.transactions')} focused={focused} /> }} />
      <Tabs.Screen name="dashboard"    options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🏠" label={t('tabs.dashboard')}    focused={focused} /> }} />

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