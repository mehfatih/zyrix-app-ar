/**
 * Zyrix App — TabHeader Component
 * هيدر للصفحات الرئيسية في الـ tab bar
 * بدون زر رجوع — فقط عنوان + زر القائمة الجانبية
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, ScrollView, I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONT_SIZE, FONT_WEIGHT, SPACING } from '../constants/theme';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';

const isRTL = I18nManager.isRTL;

function MenuIcon({ color = COLORS.white }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Line x1="3" y1="6"  x2="21" y2="6"  stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="18" x2="21" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function SideMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { t }  = useTranslation();
  const { user } = useAuth();

  const menuItems = [
    { icon: '🏠', label: t('tabs.dashboard'),         route: '/(merchant)/dashboard' },
    { icon: '💳', label: t('tabs.transactions'),       route: '/(merchant)/transactions' },
    { icon: '💰', label: t('tabs.balance'),            route: '/(merchant)/balance' },
    { icon: '📊', label: t('tabs.analytics'),          route: '/(merchant)/analytics' },
    { icon: '🔗', label: t('dashboard.payment_links'), route: '/(merchant)/payment-links' },
    { icon: '🔔', label: t('notifications.title'),     route: '/(merchant)/notifications' },
    { icon: '⚠️', label: t('disputes.title'),          route: '/(merchant)/disputes' },
    { icon: '↩',  label: t('refunds.title'),           route: '/(merchant)/refunds' },
    { icon: '🏦', label: t('settlements.title'),       route: '/(merchant)/settlements' },
    { icon: '💵', label: 'كاش COD',                    route: '/(merchant)/cod' },
    { icon: '💱', label: 'أسعار الصرف',                route: '/(merchant)/fx' },
    { icon: '🎯', label: 'أهداف الإيرادات',            route: '/(merchant)/revenue-goals' },
    { icon: '📄', label: 'الفواتير',                   route: '/(merchant)/invoices' },
    { icon: '🔄', label: 'الاشتراكات',                 route: '/(merchant)/subscriptions' },
    { icon: '🔒', label: t('twofa.title'),             route: '/(merchant)/2fa-setup' },
    { icon: '🔑', label: t('change_password.title'),   route: '/(merchant)/change-password' },
    { icon: '❓', label: t('help.title'),              route: '/(merchant)/help' },
    { icon: '⚙️', label: t('tabs.settings'),           route: '/(merchant)/settings' },
    { icon: '👤', label: t('profile.title'),           route: '/(merchant)/profile' },
  ];

  const handleNavigate = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 200);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={sm.overlay} activeOpacity={1} onPress={onClose} />
      <View style={sm.panel}>
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
            <Text style={sm.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={sm.divider} />
        <ScrollView style={sm.scroll} showsVerticalScrollIndicator={false}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx} style={sm.item}
              onPress={() => handleNavigate(item.route)}
              activeOpacity={0.7}
            >
              <Text style={sm.itemIcon}>{item.icon}</Text>
              <Text style={sm.itemLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

interface TabHeaderProps {
  title: string;
  accentColor?: string;
}

export function TabHeader({ title, accentColor }: TabHeaderProps) {
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);

  const borderColor = accentColor ? `${accentColor}40` : COLORS.border;

  return (
    <>
      <View style={[
        h.container,
        { paddingTop: insets.top + 4, borderBottomColor: borderColor },
      ]}>
        <View style={h.row}>
          {/* عنوان الصفحة */}
          <Text style={[h.title, accentColor && { color: accentColor }]} numberOfLines={1}>
            {title}
          </Text>

          {/* زر القائمة فقط — بدون زر رجوع */}
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={h.iconBtn}
            activeOpacity={0.7}
          >
            <MenuIcon color={accentColor ?? COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </>
  );
}

const h = StyleSheet.create({
  container: {
    backgroundColor: COLORS.deepBg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    height: 48,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
});

const sm = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  panel: {
    position: 'absolute', top: 0, right: 0, bottom: 0,
    width: '78%',
    backgroundColor: COLORS.deepBg,
    shadowColor: '#000', shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 20,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBubble: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  logoLetter: { fontSize: 18, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.white },
  brandName:  { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, letterSpacing: 1 },
  merchantId: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2, fontFamily: 'monospace' },
  closeBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeTxt:   { fontSize: 14, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.bold },
  divider:    { height: 1, backgroundColor: COLORS.border, marginHorizontal: 20, marginBottom: 8 },
  scroll:     { flex: 1 },
  item: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  itemIcon:  { fontSize: 20, width: 28, textAlign: 'center' },
  itemLabel: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.medium, textAlign: 'right' },
});

export default TabHeader;
