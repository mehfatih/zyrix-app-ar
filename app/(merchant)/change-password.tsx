/**
 * Zyrix App — Change Password Screen
 * Dedicated screen with current password, new password, and confirm password fields.
 * Phase 6 Task 6.4
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line } from 'react-native-svg';
import { COLORS } from '../../constants/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';

// ─── SVG Icons ───────────────────────────────────

function BackIcon({ size = 22, color = COLORS.white }: { size?: number; color?: string }) {
  const isRTL = I18nManager.isRTL;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function EyeIcon({ size = 20, color = COLORS.textMuted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function EyeOffIcon({ size = 20, color = COLORS.textMuted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="1" y1="1" x2="23" y2="23" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function LockIcon({ size = 48, color = COLORS.primaryLight }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 11V7a5 5 0 0110 0v4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Password Input Component ────────────────────

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  isRTL,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  isRTL: boolean;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{label}</Text>
      <View style={[styles.inputRow, isRTL && styles.inputRowRTL, error ? styles.inputError : null]}>
        <TextInput
          style={[styles.input, isRTL && styles.inputRTL]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.inputPlaceholder}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor={COLORS.primaryLight}
        />
        <TouchableOpacity
          onPress={() => setVisible(!visible)}
          style={styles.eyeButton}
          activeOpacity={0.7}
        >
          {visible ? (
            <EyeIcon size={18} color={COLORS.textMuted} />
          ) : (
            <EyeOffIcon size={18} color={COLORS.textMuted} />
          )}
        </TouchableOpacity>
      </View>
      {error ? (
        <Text style={[styles.errorText, isRTL && styles.textRTL]}>{error}</Text>
      ) : null}
    </View>
  );
}

// ─── Main Component ──────────────────────────────

export default function ChangePasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useTranslation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword.trim()) {
      newErrors.current = t('change_password.error_current_required');
    }
    if (!newPassword.trim()) {
      newErrors.new = t('change_password.error_new_required');
    } else if (newPassword.length < 8) {
      newErrors.new = t('change_password.error_min_length');
    }
    if (!confirmPassword.trim()) {
      newErrors.confirm = t('change_password.error_confirm_required');
    } else if (newPassword !== confirmPassword) {
      newErrors.confirm = t('change_password.error_mismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentPassword, newPassword, confirmPassword, t]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // await authApi.changePassword({ currentPassword, newPassword });
      await new Promise((resolve) => setTimeout(resolve, 1500));

      Alert.alert(
        t('change_password.success_title'),
        t('change_password.success_message'),
        [{ text: t('common.confirm'), onPress: () => router.back() }],
      );
    } catch (_err) {
      Alert.alert(
        t('common.error'),
        t('change_password.error_failed'),
      );
    } finally {
      setLoading(false);
    }
  }, [validate, currentPassword, newPassword, t, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <BackIcon size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('change_password.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <LockIcon size={40} color={COLORS.primaryLight} />
            </View>
            <Text style={styles.subtitle}>{t('change_password.subtitle')}</Text>
          </View>

          {/* Fields */}
          <PasswordField
            label={t('change_password.current_password')}
            value={currentPassword}
            onChangeText={(text) => {
              setCurrentPassword(text);
              if (errors.current) setErrors((prev) => ({ ...prev, current: '' }));
            }}
            placeholder={t('change_password.current_placeholder')}
            isRTL={isRTL}
            error={errors.current}
          />

          <PasswordField
            label={t('change_password.new_password')}
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              if (errors.new) setErrors((prev) => ({ ...prev, new: '' }));
            }}
            placeholder={t('change_password.new_placeholder')}
            isRTL={isRTL}
            error={errors.new}
          />

          <PasswordField
            label={t('change_password.confirm_password')}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: '' }));
            }}
            placeholder={t('change_password.confirm_placeholder')}
            isRTL={isRTL}
            error={errors.confirm}
          />

          {/* Password Requirements */}
          <View style={styles.requirements}>
            <Text style={[styles.requirementsTitle, isRTL && styles.textRTL]}>
              {t('change_password.requirements_title')}
            </Text>
            <Text style={[styles.requirementItem, isRTL && styles.textRTL]}>
              {t('change_password.req_min_length')}
            </Text>
            <Text style={[styles.requirementItem, isRTL && styles.textRTL]}>
              {t('change_password.req_uppercase')}
            </Text>
            <Text style={[styles.requirementItem, isRTL && styles.textRTL]}>
              {t('change_password.req_number')}
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.submitText}>{t('change_password.submit')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  flex: {
    flex: 1,
  },
  // ─── Header ─────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  // ─── Content ────────────
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING['2xl'],
    paddingBottom: SPACING['4xl'],
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: SPACING['3xl'],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(26, 86, 219, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  // ─── Fields ─────────────
  fieldContainer: {
    marginBottom: SPACING.xl,
  },
  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  textRTL: {
    textAlign: 'right',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: SPACING.md,
    height: 50,
  },
  inputRowRTL: {
    flexDirection: 'row-reverse',
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    paddingVertical: 0,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  inputRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  eyeButton: {
    padding: SPACING.sm,
  },
  errorText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.danger,
    marginTop: SPACING.xs,
  },
  // ─── Requirements ───────
  requirements: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING['2xl'],
  },
  requirementsTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  requirementItem: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  // ─── Submit ─────────────
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.white,
  },
});
