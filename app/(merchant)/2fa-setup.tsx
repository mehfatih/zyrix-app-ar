/**
 * Zyrix App — Enhanced 2FA Setup Screen
 * Multiple 2FA methods: SMS, Email, Authenticator App, Backup Codes.
 * Phase 6 Task 6.6
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  I18nManager,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line, Rect, Circle } from 'react-native-svg';
import { COLORS } from '../../constants/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';

// ─── SVG Icons ───────────────────────────────────

function BackIcon({ size = 22, color = COLORS.white }: { size?: number; color?: string }) {
  const isRTL = I18nManager.isRTL;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ShieldIcon({ size = 40, color = COLORS.primaryLight }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color}
        strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronIcon({ size = 18, color = COLORS.textMuted }: { size?: number; color?: string }) {
  const isRTL = I18nManager.isRTL;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── 2FA Method Types ────────────────────────────

interface TwoFAMethod {
  id: string;
  icon: string;
  titleKey: string;
  descKey: string;
  enabled: boolean;
  recommended?: boolean;
}

// ─── Backup Codes Component ──────────────────────

function BackupCodesModal({
  codes,
  visible,
  onClose,
  t,
  isRTL,
}: {
  codes: string[];
  visible: boolean;
  onClose: () => void;
  t: (key: string) => string;
  isRTL: boolean;
}) {
  if (!visible) return null;

  return (
    <View style={modalStyles.overlay}>
      <View style={modalStyles.container}>
        <Text style={modalStyles.title}>{t('twofa.backup_codes_title')}</Text>
        <Text style={[modalStyles.description, isRTL && { textAlign: 'right' }]}>
          {t('twofa.backup_codes_desc')}
        </Text>

        <View style={modalStyles.codesGrid}>
          {codes.map((code, index) => (
            <View key={index} style={modalStyles.codeItem}>
              <Text style={modalStyles.codeNumber}>{index + 1}.</Text>
              <Text style={modalStyles.codeText}>{code}</Text>
            </View>
          ))}
        </View>

        <Text style={[modalStyles.warning, isRTL && { textAlign: 'right' }]}>
          {t('twofa.backup_codes_warning')}
        </Text>

        <TouchableOpacity style={modalStyles.button} onPress={onClose} activeOpacity={0.8}>
          <Text style={modalStyles.buttonText}>{t('twofa.backup_codes_done')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Component ──────────────────────────────

export default function TwoFASetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useTranslation();

  const [methods, setMethods] = useState<TwoFAMethod[]>([
    { id: 'sms', icon: '📱', titleKey: 'twofa.method_sms', descKey: 'twofa.method_sms_desc', enabled: true },
    { id: 'email', icon: '📧', titleKey: 'twofa.method_email', descKey: 'twofa.method_email_desc', enabled: false },
    { id: 'authenticator', icon: '🔐', titleKey: 'twofa.method_authenticator', descKey: 'twofa.method_authenticator_desc', enabled: false, recommended: true },
    { id: 'backup', icon: '🗝️', titleKey: 'twofa.method_backup', descKey: 'twofa.method_backup_desc', enabled: false },
  ]);

  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes] = useState([
    'ZYRIX-8K4M-2N7P',
    'ZYRIX-3F9L-5Q1R',
    'ZYRIX-6W2X-8T4V',
    'ZYRIX-1J7H-9C3D',
    'ZYRIX-4B6N-2M8K',
    'ZYRIX-7P3Q-5L1F',
    'ZYRIX-9T5V-3W7X',
    'ZYRIX-2D8C-6H4J',
  ]);
  const [loading, setLoading] = useState<string | null>(null);

  const toggleMethod = useCallback(async (id: string) => {
    setLoading(id);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (id === 'authenticator') {
      const method = methods.find((m) => m.id === id);
      if (!method?.enabled) {
        // Show setup instructions for authenticator
        Alert.alert(
          t('twofa.authenticator_setup_title'),
          t('twofa.authenticator_setup_desc'),
          [
            { text: t('common.cancel'), style: 'cancel', onPress: () => setLoading(null) },
            {
              text: t('twofa.authenticator_setup_confirm'),
              onPress: () => {
                setMethods((prev) =>
                  prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
                );
                setLoading(null);
              },
            },
          ],
        );
        return;
      }
    }

    if (id === 'backup') {
      const method = methods.find((m) => m.id === id);
      if (!method?.enabled) {
        setShowBackupCodes(true);
      }
    }

    setMethods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
    setLoading(null);
  }, [methods, t]);

  const handleGenerateNewCodes = useCallback(() => {
    Alert.alert(
      t('twofa.regenerate_title'),
      t('twofa.regenerate_desc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => setShowBackupCodes(true),
        },
      ],
    );
  }, [t]);

  const enabledCount = methods.filter((m) => m.enabled).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <BackIcon size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('twofa.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon + Status */}
        <View style={styles.statusSection}>
          <View style={styles.iconCircle}>
            <ShieldIcon size={36} color={COLORS.primaryLight} />
          </View>
          <Text style={styles.statusTitle}>{t('twofa.status_title')}</Text>
          <View style={[styles.statusBadge, enabledCount > 0 ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusBadgeText, enabledCount > 0 ? styles.statusActiveText : styles.statusInactiveText]}>
              {enabledCount > 0
                ? t('twofa.status_active', { count: String(enabledCount) })
                : t('twofa.status_inactive')}
            </Text>
          </View>
          <Text style={[styles.statusDesc, isRTL && { textAlign: 'right' }]}>
            {t('twofa.description')}
          </Text>
        </View>

        {/* Methods */}
        <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>
          {t('twofa.methods_title')}
        </Text>

        {methods.map((method) => (
          <View key={method.id} style={styles.methodCard}>
            <View style={[styles.methodRow, isRTL && styles.methodRowRTL]}>
              <Text style={styles.methodIcon}>{method.icon}</Text>
              <View style={styles.methodContent}>
                <View style={[styles.methodTitleRow, isRTL && styles.methodTitleRowRTL]}>
                  <Text style={[styles.methodTitle, isRTL && { textAlign: 'right' }]}>
                    {t(method.titleKey)}
                  </Text>
                  {method.recommended && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>{t('twofa.recommended')}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.methodDesc, isRTL && { textAlign: 'right' }]}>
                  {t(method.descKey)}
                </Text>
              </View>
              {loading === method.id ? (
                <ActivityIndicator size="small" color={COLORS.primaryLight} />
              ) : (
                <Switch
                  value={method.enabled}
                  onValueChange={() => toggleMethod(method.id)}
                  trackColor={{ false: COLORS.border, true: COLORS.success }}
                  thumbColor={COLORS.white}
                />
              )}
            </View>

            {/* Backup codes: show generate button when enabled */}
            {method.id === 'backup' && method.enabled && (
              <TouchableOpacity
                style={[styles.generateButton, isRTL && styles.generateButtonRTL]}
                onPress={handleGenerateNewCodes}
                activeOpacity={0.7}
              >
                <Text style={styles.generateText}>{t('twofa.view_backup_codes')}</Text>
                <ChevronIcon size={16} color={COLORS.primaryLight} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={[styles.infoText, isRTL && { textAlign: 'right' }]}>
            {t('twofa.info_tip')}
          </Text>
        </View>
      </ScrollView>

      {/* Backup Codes Modal */}
      <BackupCodesModal
        codes={backupCodes}
        visible={showBackupCodes}
        onClose={() => setShowBackupCodes(false)}
        t={t}
        isRTL={isRTL}
      />
    </View>
  );
}

// ─── Main Styles ─────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.darkBg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, height: 52,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerRTL: { flexDirection: 'row-reverse' },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary, textAlign: 'center',
  },
  headerSpacer: { width: 36 },
  scrollContent: {
    paddingHorizontal: SPACING.xl, paddingTop: SPACING['2xl'],
    paddingBottom: SPACING['4xl'],
  },
  // ─── Status ─────────────
  statusSection: { alignItems: 'center', marginBottom: SPACING['3xl'] },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(26,86,219,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
  },
  statusTitle: {
    fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary, marginBottom: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full, marginBottom: SPACING.md,
  },
  statusActive: { backgroundColor: COLORS.successBg },
  statusInactive: { backgroundColor: COLORS.dangerBg },
  statusBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  statusActiveText: { color: COLORS.successLight },
  statusInactiveText: { color: COLORS.dangerLight },
  statusDesc: {
    fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
    textAlign: 'center', lineHeight: 20,
  },
  // ─── Methods ────────────
  sectionTitle: {
    fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary, marginBottom: SPACING.md,
  },
  methodCard: {
    backgroundColor: COLORS.cardBg, borderRadius: RADIUS.md,
    padding: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  methodRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
  },
  methodRowRTL: { flexDirection: 'row-reverse' },
  methodIcon: { fontSize: 24, width: 32, textAlign: 'center' },
  methodContent: { flex: 1 },
  methodTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginBottom: 2,
  },
  methodTitleRowRTL: { flexDirection: 'row-reverse' },
  methodTitle: {
    fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
  },
  methodDesc: {
    fontSize: FONT_SIZE.xs, color: COLORS.textMuted, lineHeight: 18,
  },
  recommendedBadge: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  recommendedText: {
    fontSize: 9, fontWeight: FONT_WEIGHT.semibold, color: COLORS.primaryLight,
  },
  generateButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: SPACING.md, paddingTop: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.divider, gap: SPACING.xs,
  },
  generateButtonRTL: { flexDirection: 'row-reverse' },
  generateText: {
    fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium,
    color: COLORS.primaryLight,
  },
  // ─── Info ───────────────
  infoCard: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    backgroundColor: 'rgba(8,145,178,0.1)',
    borderRadius: RADIUS.md, padding: SPACING.lg,
    marginTop: SPACING.md, gap: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(8,145,178,0.2)',
  },
  infoIcon: { fontSize: 20 },
  infoText: {
    flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.info, lineHeight: 18,
  },
});

// ─── Modal Styles ────────────────────────────────

const modalStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: '88%', backgroundColor: COLORS.deepBg,
    borderRadius: RADIUS.xl, padding: SPACING['2xl'],
    borderWidth: 1, borderColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary, textAlign: 'center', marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
    textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 20,
  },
  codesGrid: {
    backgroundColor: COLORS.cardBg, borderRadius: RADIUS.md,
    padding: SPACING.lg, marginBottom: SPACING.lg,
  },
  codeItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.xs, gap: SPACING.sm,
  },
  codeNumber: {
    fontSize: FONT_SIZE.xs, color: COLORS.textMuted, width: 20,
  },
  codeText: {
    fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary, fontFamily: 'monospace', letterSpacing: 1,
  },
  warning: {
    fontSize: FONT_SIZE.xs, color: COLORS.warningLight,
    textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 18,
  },
  button: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    height: 46, alignItems: 'center', justifyContent: 'center',
  },
  buttonText: {
    fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.white,
  },
});
