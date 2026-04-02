/**
 * Zyrix — Biometric Authentication Hook
 * Wraps expo-local-authentication for fingerprint/face ID.
 */
import { useEffect, useState, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIO_ENABLED_KEY = '@zyrix_biometric_enabled';

export function useBiometric() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsAvailable(compatible && enrolled);

      if (compatible) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('face');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
        }
      }

      const stored = await AsyncStorage.getItem(BIO_ENABLED_KEY);
      setIsEnabled(stored === 'true');
    })();
  }, []);

  const toggleBiometric = useCallback(async (enable: boolean) => {
    if (enable && isAvailable) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) {
        await AsyncStorage.setItem(BIO_ENABLED_KEY, 'true');
        setIsEnabled(true);
        return true;
      }
      return false;
    } else {
      await AsyncStorage.setItem(BIO_ENABLED_KEY, 'false');
      setIsEnabled(false);
      return true;
    }
  }, [isAvailable]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isEnabled || !isAvailable) return true; // Skip if not enabled
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access Zyrix',
      cancelLabel: 'Cancel',
      disableDeviceFallback: true,
    });
    return result.success;
  }, [isEnabled, isAvailable]);

  return { isAvailable, isEnabled, biometricType, toggleBiometric, authenticate };
}
