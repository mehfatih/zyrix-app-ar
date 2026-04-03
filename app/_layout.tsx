/**
 * Zyrix App — Root Layout
 * TEMP: Auth routing disabled — app opens directly to merchant dashboard.
 * AuthProvider kept active because merchant screens use useAuth() hook.
 * TODO: Restore auth routing when login system is ready.
 * Android 15 (API 35): edge-to-edge display, system bar handling.
 */

import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import * as SplashScreen from 'expo-splash-screen';
import { COLORS } from '../constants/colors';
import { FONT_WEIGHT, SPACING } from '../constants/theme';
import { AuthProvider } from '../hooks/useAuth';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineBanner } from '../components/OfflineBanner';
import { ToastProvider } from '../components/Toast';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function AppInit({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Set system UI for Android 15 edge-to-edge
        if (Platform.OS === 'android') {
          await SystemUI.setBackgroundColorAsync(COLORS.darkBg);
          try {
            await NavigationBar.setBackgroundColorAsync(COLORS.tabBarBg);
            await NavigationBar.setButtonStyleAsync('light');
            await NavigationBar.setPositionAsync('absolute');
          } catch (_navErr) {
            // edge-to-edge mode handles navigation bar automatically
          }
        }
        // Simulate asset loading
        await new Promise((resolve) => setTimeout(resolve, 1200));
      } catch (e) {
        console.warn('Init error:', e);
      } finally {
        setIsReady(true);
      }
    };
    init();
  }, []);

  // Hide splash screen directly when ready
  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <OfflineBanner />
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>Z</Text>
        </View>
        <Text style={styles.brandText}>Zyrix</Text>
        <ActivityIndicator
          size="small"
          color={COLORS.primaryLight}
          style={styles.spinner}
        />
      </View>
    );
  }

  return <View style={{ flex: 1 }}>{children}</View>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
          <AppInit>
            <StatusBar style="light" translucent backgroundColor="transparent" />
            <OfflineBanner />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: COLORS.darkBg },
                animation: 'slide_from_right',
                // Android 15: enable predictive back gesture
                ...(Platform.OS === 'android' && { animationMatchesGesture: true }),
              }}
            >
              <Stack.Screen name="index" />
              {/* TEMP: auth screens disabled — direct to dashboard */}
              {/* <Stack.Screen name="(auth)" /> */}
              <Stack.Screen name="(merchant)" />
            </Stack>
          </AppInit>
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  logoText: {
    fontSize: 36,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.white,
  },
  brandText: {
    fontSize: 24,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    letterSpacing: 3,
  },
  spinner: {
    marginTop: SPACING['3xl'],
  },
});