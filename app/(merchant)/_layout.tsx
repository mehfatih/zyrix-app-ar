/**
 * Zyrix App — Merchant Tab Layout
 * Bottom tab navigation with Android 15 edge-to-edge safe areas.
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

function TabIcon({ icon, label, focused, badge }: { icon: string; label: string; focused: boolean; badge?: number }) {
  return (
    <View style={styles.tabItem}>
      <View>
        <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>
          {icon}
        </Text>
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text
        style={[styles.tabLabel, focused && styles.tabLabelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function MerchantLayout() {
  usePushNotifications();
  useDeepLinking();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await notificationsApi.list();
        setUnreadCount(res.unreadCount);
      } catch (_e) { /* Silent fail for badge */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const tabBarHeight = Platform.select({
    ios: 84,
    android: 64 + insets.bottom,
    default: 64,
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabBarHeight,
            paddingBottom: Platform.OS === 'android' ? insets.bottom + SPACING.xs : 20,
          },
        ],
        tabBarShowLabel: false,
        tabBarActiveTintColor: COLORS.tabActive,
        tabBarInactiveTintColor: COLORS.tabInactive,
      }}
    >
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

      {/* ── Hidden screens — tabBarButton: () => null يمنع ظهور أي أيقونة ── */}
      <Tabs.Screen name="transaction-detail" options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="settlements"        options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="refunds"            options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="disputes"           options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="profile"            options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="notifications"      options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="payment-links"      options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="onboarding"         options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="subscriptions"      options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="revenue-goals"      options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="expenses"           options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="invoices"           options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="transfers"          options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="api-keys"           options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="webhooks"           options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="cod"                options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="fx"                 options={{ href: null, tabBarButton: () => null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.tabBarBg,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
    elevation: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.tabInactive,
  },
  tabLabelActive: {
    color: COLORS.primaryLight,
    fontWeight: FONT_WEIGHT.semibold,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
  },
});