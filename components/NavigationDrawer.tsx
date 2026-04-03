/**
 * Zyrix App — NavigationDrawer Component
 * Slide-in sidebar with all app sections for quick navigation.
 * RTL-aware: slides from right in Arabic, left in English.
 * Phase 6 Task 6.3
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  I18nManager,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../constants/theme';
import { useTranslation } from '../hooks/useTranslation';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78;

// ─── Close Icon ──────────────────────────────────

function CloseIcon({ size = 22, color = COLORS.white }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Menu Item Types ─────────────────────────────

interface MenuItem {
  id: string;
  icon: string;
  titleKey: string;
  route: string;
  dividerAfter?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', icon: '🏠', titleKey: 'tabs.dashboard', route: '/(merchant)/dashboard' },
  { id: 'transactions', icon: '💳', titleKey: 'tabs.transactions', route: '/(merchant)/transactions' },
  { id: 'balance', icon: '💰', titleKey: 'tabs.balance', route: '/(merchant)/balance' },
  { id: 'analytics', icon: '📊', titleKey: 'tabs.analytics', route: '/(merchant)/analytics' },
  { id: 'settings', icon: '⚙️', titleKey: 'tabs.settings', route: '/(merchant)/settings', dividerAfter: true },
  { id: 'settlements', icon: '🏦', titleKey: 'settlements.title', route: '/(merchant)/settlements' },
  { id: 'disputes', icon: '⚠️', titleKey: 'disputes.title', route: '/(merchant)/disputes' },
  { id: 'refunds', icon: '↩️', titleKey: 'refunds.title', route: '/(merchant)/refunds' },
  { id: 'expenses', icon: '📋', titleKey: 'expenses.title', route: '/(merchant)/expenses' },
  { id: 'invoices', icon: '🧾', titleKey: 'invoices.title', route: '/(merchant)/invoices', dividerAfter: true },
  { id: 'notifications', icon: '🔔', titleKey: 'notifications.title', route: '/(merchant)/notifications' },
  { id: 'profile', icon: '👤', titleKey: 'profile.title', route: '/(merchant)/profile' },
];

// ─── Props ───────────────────────────────────────

interface NavigationDrawerProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  activeRoute?: string;
}

// ─── Component ───────────────────────────────────

export function NavigationDrawer({
  visible,
  onClose,
  onNavigate,
  activeRoute,
}: NavigationDrawerProps) {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useTranslation();
  const slideAnim = useRef(new Animated.Value(isRTL ? DRAWER_WIDTH : -DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: isRTL ? DRAWER_WIDTH : -DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, isRTL]);

  const handleItemPress = (route: string) => {
    onNavigate(route);
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.fullScreen}>
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlayAnim },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          isRTL ? styles.drawerRTL : styles.drawerLTR,
          {
            width: DRAWER_WIDTH,
            transform: [{ translateX: slideAnim }],
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.drawerHeader, isRTL && styles.drawerHeaderRTL]}>
          <View style={[styles.headerLeft, isRTL && styles.headerLeftRTL]}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>Z</Text>
            </View>
            <View>
              <Text style={styles.brandName}>Zyrix</Text>
              <Text style={styles.brandSub}>{t('drawer.merchant_panel')}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <CloseIcon size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.headerDivider} />

        {/* Menu Items */}
        <ScrollView
          style={styles.menuScroll}
          contentContainerStyle={styles.menuContent}
          showsVerticalScrollIndicator={false}
        >
          {MENU_ITEMS.map((item) => {
            const isActive = activeRoute === item.route;
            return (
              <React.Fragment key={item.id}>
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    isRTL && styles.menuItemRTL,
                    isActive && styles.menuItemActive,
                  ]}
                  onPress={() => handleItemPress(item.route)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.menuLabel,
                      isActive && styles.menuLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {t(item.titleKey)}
                  </Text>
                  {isActive && <View style={styles.activeDot} />}
                </TouchableOpacity>
                {item.dividerAfter && <View style={styles.menuDivider} />}
              </React.Fragment>
            );
          })}
        </ScrollView>

        {/* Footer */}
        <View style={styles.drawerFooter}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerText}>Zyrix v1.0</Text>
          <Text style={styles.footerSubText}>© 2026 Zyrix Global Technology</Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────

const styles = StyleSheet.create({
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  // ─── Drawer Position ──────
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.deepBg,
    borderColor: COLORS.border,
  },
  drawerLTR: {
    left: 0,
    borderRightWidth: 1,
  },
  drawerRTL: {
    right: 0,
    borderLeftWidth: 1,
  },
  // ─── Header ───────────────
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  drawerHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  headerLeftRTL: {
    flexDirection: 'row-reverse',
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.white,
  },
  brandName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  brandSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.lg,
  },
  // ─── Menu ─────────────────
  menuScroll: {
    flex: 1,
  },
  menuContent: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.md,
    marginVertical: 1,
  },
  menuItemRTL: {
    flexDirection: 'row-reverse',
  },
  menuItemActive: {
    backgroundColor: 'rgba(26, 86, 219, 0.12)',
  },
  menuIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  menuLabelActive: {
    color: COLORS.primaryLight,
    fontWeight: FONT_WEIGHT.semibold,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primaryLight,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.sm,
    marginHorizontal: SPACING.md,
  },
  // ─── Footer ───────────────
  drawerFooter: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  footerDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  footerText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  footerSubText: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.6,
  },
});
