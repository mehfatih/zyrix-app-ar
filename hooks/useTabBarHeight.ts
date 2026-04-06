/**
 * Zyrix App — useTabBarHeight Hook
 * يحسب الـ padding المطلوب تحت كل صفحة عشان الـ pill tab bar ما يغطيش المحتوى
 * استخدام: const tabBarHeight = useTabBarHeight()
 * ثم: contentContainerStyle={{ paddingBottom: tabBarHeight }}
 */

import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();

  // ارتفاع الـ pill = 72
  // المسافة من الأسفل = pillBottom في _layout.tsx
  // iOS: insets.bottom + 8
  // Android: insets.bottom + 10
  // + مسافة إضافية مريحة = 16

  const pillHeight = 72;
  const pillBottom = Platform.select({
    ios: insets.bottom + 8,
    android: insets.bottom + 10,
    default: 10,
  }) ?? 10;

  return pillHeight + pillBottom + 16;
}