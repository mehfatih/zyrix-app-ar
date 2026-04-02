/**
 * Zyrix App — Auth Context
 * Uses expo-secure-store for tokens (Android 15 security best practice).
 * AsyncStorage for non-sensitive data only.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../types';

const AUTH_TOKEN_KEY = 'zyrix_auth_token';
const USER_KEY = '@zyrix_user';
const ONBOARDING_DONE_KEY = '@zyrix_onboarding_done';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  needsOnboarding: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  needsOnboarding: boolean;
  completeOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const DEMO_USER: User = {
  id: 'USR-001',
  name: 'Mehmet Fatih',
  phone: '+90 545 221 0888',
  email: 'info@zyrix.co',
  merchantId: 'ZRX-10042',
  language: 'ar',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    token: null,
    needsOnboarding: false,
  });

  useEffect(() => {
    const loadAuth = async () => {
      try {
        // Token in SecureStore, user data in AsyncStorage
        const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
        const userJson = await AsyncStorage.getItem(USER_KEY);
        const onboardingDone = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);

        if (token && userJson) {
          const user: User = JSON.parse(userJson);
          setState({
            isLoading: false,
            isAuthenticated: true,
            needsOnboarding: !onboardingDone,
            user,
            token,
          });
        } else {
          setState((prev: any) => ({ ...prev, isLoading: false }));
        }
      } catch (_e) {
        setState((prev: any) => ({ ...prev, isLoading: false }));
      }
    };
    loadAuth();
  }, []);

  const signIn = useCallback(async (token: string, user: User) => {
    try {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      const onboardingDone = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
      setState({
        isLoading: false,
        isAuthenticated: true,
        needsOnboarding: !onboardingDone,
        user,
        token,
      });
    } catch (e) {
      console.warn('Failed to save auth:', e);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch (e) {
      console.warn('Failed to clear auth:', e);
    }
    setState({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      token: null,
      needsOnboarding: false,
    });
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true');
      setState((prev: any) => ({ ...prev, needsOnboarding: false }));
    } catch (_e) { /* silent */ }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
