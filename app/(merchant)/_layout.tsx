/**
 * Zyrix App — Merchant Tab Layout v2
 * Premium tab bar with SVG icons and accent glow.
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
import { Icon } from '../../components/Icon';

function TabIcon({ iconName, label, focused, badge }: { iconName: string; label: string; focused: boolean; badge?: number }) {
  return (
    <View style={styles.tabItem}>
      <View>
        {/* Glow dot behind active icon */}
        {focused && <View style={styles.activeGlow} />}
        <Icon
          name={iconName}
          size={22}
          color={focused ? COLORS.tabActive : COLORS.tabInactive}
          strokeWidth={focused ? 2.2 : 1.6}
        />
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
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon iconName="home" label={t('tabs.dashboard')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon iconName="credit-card" label={t('tabs.transactions')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="balance"
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon iconName="wallet" label={t('tabs.balance')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon iconName="bar-chart" label={t('tabs.analytics')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon iconName="settings" label={t('tabs.settings')} focused={focused} />
          ),
        }}
      />
      {/* Hidden screens */}
      <Tabs.Screen name="transaction-detail" options={{ href: null }} />
      <Tabs.Screen name="settlements" options={{ href: null }} />
      <Tabs.Screen name="refunds" options={{ href: null }} />
      <Tabs.Screen name="disputes" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="payment-links" options={{ href: null }} />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
      <Tabs.Screen name="subscriptions" options={{ href: null }} />
      <Tabs.Screen name="revenue-goals" options={{ href: null }} />
      <Tabs.Screen name="expenses" options={{ href: null }} />
      <Tabs.Screen name="invoices" options={{ href: null }} />
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
    gap: 3,
  },
  activeGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 212, 170, 0.12)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.tabInactive,
    marginTop: 1,
  },
  tabLabelActive: {
    color: COLORS.tabActive,
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
