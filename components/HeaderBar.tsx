/**
 * Zyrix App — HeaderBar Component
 * Fixed header with: Menu (hamburger) | Logo/Title | Phone + Messages icons
 * RTL-aware: icons flip sides for Arabic layout.
 * Phase 6 Task 6.1
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  Alert,
  I18nManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../constants/theme';
import { useTranslation } from '../hooks/useTranslation';

const SUPPORT_PHONE = '+966500000000';

function PhoneIcon({ size = 22, color = COLORS.white }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function MessagesIcon({ size = 22, color = COLORS.white }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Line x1="8" y1="9" x2="16" y2="9" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="8" y1="13" x2="13" y2="13" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function MenuIcon({ size = 22, color = COLORS.white }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="3" y1="6"  x2="21" y2="6"  stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="18" x2="21" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function SearchHeaderIcon({ size = 20, color = COLORS.white }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={2} />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

interface HeaderBarProps {
  onMenuPress?: () => void;
  onSearchPress?: () => void;
  onMessagesPress?: () => void;
  unreadMessages?: number;
}

export function HeaderBar({
  onMenuPress,
  onSearchPress,
  onMessagesPress,
  unreadMessages = 0,
}: HeaderBarProps) {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useTranslation();

  const handleCallSupport = () => {
    const phoneUrl = `tel:${SUPPORT_PHONE}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert(t('header.call_error_title'), t('header.call_error_message'));
        }
      })
      .catch(() => {
        Alert.alert(t('header.call_error_title'), t('header.call_error_message'));
      });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + SPACING.xs }]}>
      <View style={[styles.content, isRTL && styles.contentRTL]}>
        <TouchableOpacity
          onPress={onMenuPress}
          style={styles.iconButton}
          activeOpacity={0.7}
          accessibilityLabel={t('header.menu')}
          accessibilityRole="button"
        >
          <MenuIcon size={22} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <View style={styles.logoMini}>
            <Text style={styles.logoLetter}>Z</Text>
          </View>
          <Text style={styles.titleText}>Zyrix</Text>
        </View>

        <View style={[styles.rightIcons, isRTL && styles.rightIconsRTL]}>
          <TouchableOpacity
            onPress={onSearchPress}
            style={styles.iconButton}
            activeOpacity={0.7}
            accessibilityLabel={t('header.search')}
            accessibilityRole="button"
          >
            <SearchHeaderIcon size={20} color={COLORS.primaryLight} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCallSupport}
            style={styles.iconButton}
            activeOpacity={0.7}
            accessibilityLabel={t('header.call_support')}
            accessibilityRole="button"
          >
            <PhoneIcon size={20} color={COLORS.primaryLight} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onMessagesPress}
            style={styles.iconButton}
            activeOpacity={0.7}
            accessibilityLabel={t('header.messages')}
            accessibilityRole="button"
          >
            <MessagesIcon size={20} color={COLORS.primaryLight} />
            {unreadMessages > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.borderBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.deepBg, paddingBottom: 0 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, height: 52 },
  contentRTL: { flexDirection: 'row-reverse' },
  titleContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  logoMini: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { fontSize: 14, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.white },
  titleText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, letterSpacing: 1.5 },
  iconButton: { width: 36, height: 36, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  rightIcons: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  rightIconsRTL: { flexDirection: 'row-reverse' },
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: COLORS.danger, borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: COLORS.deepBg },
  badgeText: { color: COLORS.white, fontSize: 9, fontWeight: '700' },
  borderBottom: { height: 1, backgroundColor: COLORS.border, opacity: 0.5 },
});