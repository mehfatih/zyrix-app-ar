/**
 * Zyrix App — Entry Point
 * TEMP: Auth disabled — goes directly to dashboard
 */
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(merchant)/dashboard" />;
}