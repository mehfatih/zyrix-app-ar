import React from 'react'
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { COLORS } from '../constants/colors'

interface QRCodeModalProps {
  visible: boolean
  onClose: () => void
  value: string
  title?: string
  subtitle?: string
}

export function QRCodeModal({ visible, onClose, value, title, subtitle }: QRCodeModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {title && <Text style={styles.title}>{title}</Text>}
          <View style={styles.qrWrapper}>
            <QRCode
              value={value || 'https://zyrix.co'}
              size={220}
              color={COLORS.darkBg}
              backgroundColor={COLORS.white}
              logo={undefined}
            />
          </View>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <Text style={styles.value} numberOfLines={2}>{value}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>إغلاق</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: COLORS.white, borderRadius: 20, padding: 32, alignItems: 'center', width: 300 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.darkBg, marginBottom: 8, textAlign: 'center' },
  qrWrapper: { padding: 16, backgroundColor: COLORS.white, borderRadius: 12, marginBottom: 16 },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 4, textAlign: 'center' },
  value: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', fontFamily: 'monospace', marginBottom: 16 },
  closeBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 40, paddingVertical: 12, borderRadius: 10 },
  closeBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
})