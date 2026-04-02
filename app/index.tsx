/**
 * Zyrix App — Entry Point
 * TEMP: Auth disabled — direct access to merchant dashboard.
 * TODO: Restore auth check when login system is ready.
 */

import { Redirect } from 'expo-router';
// import { View, ActivityIndicator, StyleSheet } from 'react-native';
// import { useAuth } from '../hooks/useAuth';
// import { COLORS } from '../constants/colors';

export default function Index() {
  // ============================================================
  // ORIGINAL AUTH LOGIC — uncomment when ready:
  // ============================================================
  // const { isLoading, isAuthenticated } = useAuth();
  //
  // if (isLoading) {
  //   return (
  //     <View style={styles.container}>
  //       <ActivityIndicator size="large" color={COLORS.primary} />
  //     </View>
  //   );
  // }
  //
  // if (isAuthenticated) {
  //   return <Redirect href="/(merchant)/dashboard" />;
  // }
  //
  // return <Redirect href="/(auth)/login" />;
  // ============================================================

  // TEMP: Skip auth, go directly to dashboard
  return <Redirect href="/(merchant)/dashboard" />;
}

// ============================================================
// ORIGINAL STYLES — uncomment when restoring auth:
// ============================================================
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: COLORS.darkBg,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
// });