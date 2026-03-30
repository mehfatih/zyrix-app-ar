/**
 * Zyrix App — Deep Linking from Notifications
 * Routes notification taps to the correct screen.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

// ─── Screen route map ────────────────────────────
const NOTIFICATION_ROUTES: Record<string, string> = {
  payment: '/(merchant)/transactions',
  settlement: '/(merchant)/settlements',
  dispute: '/(merchant)/disputes',
  security: '/(merchant)/settings',
  system: '/(merchant)/notifications',
};

export function useDeepLinking() {
  const router = useRouter();

  useEffect(() => {
    // Handle notification taps when app is open or backgrounded
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;

        if (data?.type && typeof data.type === 'string') {
          const route = NOTIFICATION_ROUTES[data.type];
          if (route) {
            // Small delay to ensure navigation is ready
            setTimeout(() => {
              try {
                router.push(route as any);
              } catch {
                // Navigation not ready, silent fail
              }
            }, 300);
          }
        }

        // Handle specific transaction deep link
        if (data?.txId && typeof data.txId === 'string') {
          setTimeout(() => {
            try {
              router.push(`/(merchant)/transaction-detail?id=${data.txId}` as any);
            } catch {
              // Silent fail
            }
          }, 300);
        }
      },
    );

    // Handle cold start — app opened from killed state via notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data;
        if (data?.type && typeof data.type === 'string') {
          const route = NOTIFICATION_ROUTES[data.type];
          if (route) {
            setTimeout(() => {
              try {
                router.push(route as any);
              } catch {
                // Silent fail
              }
            }, 500);
          }
        }
      }
    });

    return () => subscription.remove();
  }, [router]);
}
