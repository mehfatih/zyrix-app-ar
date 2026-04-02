/**
 * Zyrix App — OTP Verification Screen
 * 6-digit code input with countdown timer.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT, LAYOUT } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth, DEMO_USER } from '../../hooks/useAuth';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { t, isRTL } = useTranslation();
  const { signIn } = useAuth();

  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [error, setError] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t: number) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Auto-submit when all digits filled
  useEffect(() => {
    const fullCode = code.join('');
    if (fullCode.length === OTP_LENGTH && !code.includes('')) {
      handleVerify(fullCode);
    }
  }, [code]);

  const handleChange = (text: string, index: number) => {
    if (error) setError('');
    const newCode = [...code];

    if (text.length > 1) {
      // Handle paste
      const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      digits.forEach((d, i) => {
        if (i + index < OTP_LENGTH) newCode[i + index] = d;
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newCode[index] = text.replace(/\D/g, '');
    setCode(newCode);
    if (text && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (fullCode: string) => {
    // Demo: accept any 6-digit code
    if (fullCode.length === OTP_LENGTH) {
      try {
        await signIn('demo-token-' + Date.now(), DEMO_USER);
        router.replace('/(merchant)/dashboard');
      } catch (_e) {
        setError(t('auth.invalidOtp'));
      }
    } else {
      setError(t('auth.invalidOtp'));
    }
  };

  const handleResend = () => {
    if (timer > 0) return;
    setTimer(RESEND_SECONDS);
    setCode(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>{isRTL ? '→' : '←'}</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={[styles.title, isRTL && styles.textRTL]}>
          {t('auth.otpTitle')}
        </Text>
        <Text style={[styles.subtitle, isRTL && styles.textRTL]}>
          {t('auth.otpSubtitle', { phone: phone ?? '' })}
        </Text>

        {/* OTP Cells */}
        <View style={styles.otpRow}>
          {code.map((digit: string, index: number) => (
            <TextInput
              key={index}
              ref={(ref: any) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpCell,
                digit && styles.otpCellFilled,
                error && styles.otpCellError,
              ]}
              value={digit}
              onChangeText={(text: string) => handleChange(text, index)}
              onKeyPress={({ nativeEvent }: any) =>
                handleKeyPress(nativeEvent.key, index)
              }
              keyboardType="number-pad"
              maxLength={index === 0 ? OTP_LENGTH : 1}
              autoFocus={index === 0}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Error */}
        {error !== '' && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Timer / Resend */}
        <View style={styles.resendRow}>
          {timer > 0 ? (
            <Text style={styles.timerText}>
              {t('auth.resendIn', { seconds: String(timer) })}
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendText}>{t('auth.resend')}</Text>
            </TouchableOpacity>
          )}
        </View>
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
    paddingTop: SPACING['5xl'],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING['3xl'],
  },
  backText: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textPrimary,
  },
  title: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING['3xl'],
    lineHeight: 22,
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  otpCell: {
    width: LAYOUT.otpCellSize,
    height: LAYOUT.otpCellSize,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBg,
    textAlign: 'center',
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  otpCellFilled: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  otpCellError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  timerText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  resendText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primaryLight,
  },
});
