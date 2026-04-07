/**
 * Zyrix App — useTabBarHeight Hook
 * يحسب الـ padding المطلوب تحت كل صفحة
 * عشان الـ pill tab bar ما يغطيش المحتوى
 */
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();

  // ارتفاع الـ pill = 68 (متزامن مع _layout)
  const pillHeight = 68;

  // نفس الحساب الموجود في _layout.tsx
  const pillBottom = Platform.select({
    ios: insets.bottom + 8,
    android: insets.bottom + 10,
    default: 10,
  }) ?? 10;

  // + 16 مسافة مريحة فوق الـ pill
  return pillHeight + pillBottom + 16;
}