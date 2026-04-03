/**
 * Zyrix App — Login Screen
 * Phone number OR Email login with tab switcher.
 * Phase 6 Task 6.5: Added email login option.
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
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { COLORS } from '../../constants/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT, LAYOUT } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';

// ─── Icons ───────────────────────────────────────

function PhoneTabIcon({ size = 18, color = COLORS.white }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="2" width="14" height="20" rx="2" stroke={color} strokeWidth={2} />
      <Circle cx="12" cy="18" r="1" fill={color} />
    </Svg>
  );
}

function EmailTabIcon({ size = 18, color = COLORS.white }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 6l-10 7L2 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Types ───────────────────────────────────────

type LoginMethod = 'phone' | 'email';

// ─── Component ───────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const [method, setMethod] = useState<LoginMethod>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (method === 'phone') {
      const cleaned = phone.replace(/\s/g, '');
      if (cleaned.length < 7) {
        setError(t('auth.invalidPhone'));
        return;
      }
      setError('');
      // TEMP: Bypass OTP - go directly to dashboard
      router.replace('/(merchant)/dashboard');
    } else {
      // Email login
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError(t('auth.invalidEmail'));
        return;
      }
      setError('');
      // Navigate to OTP with email param
      router.push({ pathname: '/(auth)/otp', params: { email: email.trim(), method: 'email' } });
    }
  };

  const isButtonDisabled = method === 'phone' ? phone.length < 7 : email.trim().length < 5;

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

        {/* Method Tabs */}
        <View style={[styles.tabRow, isRTL && styles.tabRowRTL]}>
          <TouchableOpacity
            style={[styles.tab, method === 'phone' && styles.tabActive]}
            onPress={() => { setMethod('phone'); setError(''); }}
            activeOpacity={0.7}
          >
            <PhoneTabIcon
              size={16}
              color={method === 'phone' ? COLORS.white : COLORS.textMuted}
            />
            <Text style={[styles.tabText, method === 'phone' && styles.tabTextActive]}>
              {t('auth.phoneTab')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, method === 'email' && styles.tabActive]}
            onPress={() => { setMethod('email'); setError(''); }}
            activeOpacity={0.7}
          >
            <EmailTabIcon
              size={16}
              color={method === 'email' ? COLORS.white : COLORS.textMuted}
            />
            <Text style={[styles.tabText, method === 'email' && styles.tabTextActive]}>
              {t('auth.emailTab')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input area */}
        {method === 'phone' ? (
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
                onChangeText={(text: string) => {
                  setPhone(text);
                  if (error) setError('');
                }}
                keyboardType="phone-pad"
                autoFocus
                maxLength={15}
              />
            </View>
          </View>
        ) : (
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, isRTL && styles.textRTL]}>
              {t('auth.emailLabel')}
            </Text>
            <TextInput
              style={[styles.emailInput, isRTL && styles.inputRTL]}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={COLORS.inputPlaceholder}
              value={email}
              onChangeText={(text: string) => {
                setEmail(text);
                if (error) setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <Text style={[styles.emailHint, isRTL && styles.textRTL]}>
              {t('auth.emailHint')}
            </Text>
          </View>
        )}

        {/* Error */}
        {error !== '' && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Continue button */}
        <TouchableOpacity
          style={[styles.button, isButtonDisabled && styles.buttonDisabled]}
          onPress={handleContinue}
          activeOpacity={0.8}
          disabled={isButtonDisabled}
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
    marginBottom: SPACING['2xl'],
  },
  textRTL: {
    writingDirection: 'rtl',
  },
  // ─── Tabs ───────────────
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: SPACING['2xl'],
    gap: 3,
  },
  tabRowRTL: {
    flexDirection: 'row-reverse',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    gap: SPACING.sm,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.semibold,
  },
  // ─── Inputs ─────────────
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
  emailInput: {
    height: LAYOUT.inputHeight,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  emailHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  errorText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.danger,
    marginBottom: SPACING.md,
    textAlign: 'center',
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
