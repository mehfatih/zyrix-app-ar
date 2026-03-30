import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { COLORS } from '../constants/colors'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)
  const [slideAnim] = useState(new Animated.Value(-50))

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !(state.isConnected && state.isInternetReachable !== false)
      setIsOffline(offline)
      Animated.timing(slideAnim, {
        toValue: offline ? 0 : -50,
        duration: 300,
        useNativeDriver: true,
      }).start()
    })
    return () => unsubscribe()
  }, [slideAnim])

  if (!isOffline) return null

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.text}>⚠️ No Internet Connection</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.danger,
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  text: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
})
