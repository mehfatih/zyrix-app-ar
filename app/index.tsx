/**
 * Zyrix App — Entry Point
 * Auth enabled — redirects based on authentication state.
 */
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../constants/colors';

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(merchant)/dashboard" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});