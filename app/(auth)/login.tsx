/**
 * Zyrix App — Login Screen
 * Phone number input with country code.
 * TEMP: Bypass OTP for testing
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT, LAYOUT } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';

export default function LoginScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.length < 7) {
      setError(t('auth.invalidPhone'));
      return;
    }
    setError('');
    // TEMP: Bypass OTP - go directly to dashboard
    router.replace('/(merchant)/dashboard');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>Z</Text>
          </View>
          <Text style={styles.brandName}>{t('common.appName')}</Text>
        </View>

        {/* Welcome text */}
        <Text style={[styles.title, isRTL && styles.textRTL]}>
          {t('auth.welcomeTitle')}
        </Text>
        <Text style={[styles.subtitle, isRTL && styles.textRTL]}>
          {t('auth.welcomeSubtitle')}
        </Text>

        {/* Phone input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, isRTL && styles.textRTL]}>
            {t('auth.phoneLabel')}
          </Text>
          <View style={styles.inputRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryFlag}>🇸🇦</Text>
              <Text style={styles.countryCodeText}>+966</Text>
            </View>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder={t('auth.phonePlaceholder')}
              placeholderTextColor={COLORS.inputPlaceholder}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (error) setError('');
              }}
              keyboardType="phone-pad"
              autoFocus
              maxLength={15}
            />
          </View>
          {error !== '' && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>

        {/* Continue button */}
        <TouchableOpacity
          style={[styles.button, phone.length < 7 && styles.buttonDisabled]}
          onPress={handleContinue}
          activeOpacity={0.8}
          disabled={phone.length < 7}
        >
          <Text style={styles.buttonText}>{t('auth.continue')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  content: {
    flex: 1,
    paddingHorizontal: LAYOUT.screenPaddingH,
    justifyContent: 'center',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: SPACING['4xl'],
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  logoText: {
    fontSize: 32,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.white,
  },
  brandName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  title: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING['3xl'],
  },
  textRTL: {
    writingDirection: 'rtl',
  },
  inputGroup: {
    marginBottom: SPACING.xl,
  },
  inputLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  inputRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  countryCode: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: LAYOUT.inputHeight,
    gap: SPACING.xs,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCodeText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
  },
  input: {
    flex: 1,
    height: LAYOUT.inputHeight,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  inputRTL: {
    textAlign: 'right',
  },
  errorText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.danger,
    marginTop: SPACING.xs,
  },
  button: {
    height: LAYOUT.buttonHeight,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.white,
  },
});
