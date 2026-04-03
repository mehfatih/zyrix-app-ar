/**
 * Zyrix App — Toast / Snackbar Component
 * Replaces all ugly Alert.alert() popups with a sleek auto-dismissing notification.
 *
 * Usage:
 *   import { ToastProvider, useToast } from '../components/Toast'
 *
 *   // Wrap your app root:
 *   <ToastProvider> ... </ToastProvider>
 *
 *   // In any screen:
 *   const { showToast } = useToast()
 *   showToast('تم النسخ!', 'success')
 *   showToast('قريباً', 'info')
 *   showToast('حدث خطأ', 'error')
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  I18nManager,
  TouchableOpacity,
} from 'react-native'
import { COLORS } from '../constants/colors'

const isRTL = I18nManager.isRTL
const SCREEN_WIDTH = Dimensions.get('window').width

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastMessage {
  id: number
  text: string
  type: ToastType
  duration: number
}

interface ToastContextValue {
  showToast: (text: string, type?: ToastType, duration?: number) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
})

export const useToast = () => useContext(ToastContext)

// ─── Toast Item ───────────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(-20)).current

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start()

    // Auto dismiss
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss(toast.id))
    }, toast.duration)

    return () => clearTimeout(timer)
  }, [])

  const icon = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  }[toast.type]

  const bgColor = {
    success: '#0D9B5C',
    error: '#E53935',
    info: '#1E88E5',
    warning: '#F9A825',
  }[toast.type]

  return (
    <Animated.View
      style={[
        toastStyles.container,
        { backgroundColor: bgColor, opacity, transform: [{ translateY }] },
      ]}
    >
      <TouchableOpacity
        style={[toastStyles.inner, isRTL && toastStyles.innerRTL]}
        activeOpacity={0.8}
        onPress={() => onDismiss(toast.id)}
      >
        <View style={toastStyles.iconCircle}>
          <Text style={toastStyles.icon}>{icon}</Text>
        </View>
        <Text style={[toastStyles.text, isRTL && toastStyles.textRTL]}>
          {toast.text}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────

let _idCounter = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback(
    (text: string, type: ToastType = 'success', duration: number = 2200) => {
      const id = ++_idCounter
      setToasts((prev) => [...prev.slice(-2), { id, text, type, duration }])
    },
    [],
  )

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast overlay — positioned at top, above all content */}
      <View style={toastStyles.overlay} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </View>
    </ToastContext.Provider>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const toastStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
    pointerEvents: 'box-none',
  },
  container: {
    marginBottom: 8,
    borderRadius: 12,
    width: SCREEN_WIDTH - 48,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  innerRTL: {
    flexDirection: 'row-reverse',
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  textRTL: {
    textAlign: 'right',
  },
})
