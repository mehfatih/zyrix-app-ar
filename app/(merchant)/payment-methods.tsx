/**
 * Zyrix App — Payment Methods Screen
 * 📁 app/(merchant)/payment-methods.tsx
 */

import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  I18nManager, SafeAreaView, ActivityIndicator, RefreshControl, Switch, Alert,
} from 'react-native'
import { COLORS } from '../../constants/colors'
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme'
import { InnerHeader } from '../../components/InnerHeader'
import { useTabBarHeight } from '../../hooks/useTabBarHeight'

const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────────────────

interface PaymentMethodItem {
  method: string
  nameAr: string
  nameEn: string
  icon: string
  popular: boolean
  isActive: boolean
  status: string
  isDefault: boolean
  feePercent: number | null
  feeFixed: number | null
}

// ─── Demo Data ────────────────────────────────────────────────

const DEMO_METHODS: PaymentMethodItem[] = [
  { method: 'CREDIT_CARD',   nameAr: 'بطاقة ائتمانية',       nameEn: 'Credit Card',      icon: '💳', popular: true,  isActive: true,  status: 'ACTIVE',   isDefault: true,  feePercent: 2.5,  feeFixed: null },
  { method: 'DEBIT_CARD',    nameAr: 'بطاقة مدى',            nameEn: 'Debit Card',       icon: '💳', popular: true,  isActive: true,  status: 'ACTIVE',   isDefault: false, feePercent: 1.5,  feeFixed: null },
  { method: 'APPLE_PAY',     nameAr: 'Apple Pay',             nameEn: 'Apple Pay',        icon: '🍎', popular: true,  isActive: false, status: 'INACTIVE', isDefault: false, feePercent: 2.0,  feeFixed: null },
  { method: 'GOOGLE_PAY',    nameAr: 'Google Pay',            nameEn: 'Google Pay',       icon: '🔵', popular: true,  isActive: false, status: 'INACTIVE', isDefault: false, feePercent: 2.0,  feeFixed: null },
  { method: 'BANK_TRANSFER', nameAr: 'تحويل بنكي',           nameEn: 'Bank Transfer',    icon: '🏦', popular: false, isActive: true,  status: 'ACTIVE',   isDefault: false, feePercent: null, feeFixed: 5.0  },
  { method: 'STC_PAY',       nameAr: 'STC Pay',               nameEn: 'STC Pay',          icon: '📱', popular: true,  isActive: true,  status: 'ACTIVE',   isDefault: false, feePercent: 1.8,  feeFixed: null },
  { method: 'MADA',          nameAr: 'مدى',                   nameEn: 'Mada',             icon: '💚', popular: true,  isActive: true,  status: 'ACTIVE',   isDefault: false, feePercent: 1.5,  feeFixed: null },
  { method: 'TAMARA',        nameAr: 'تمارا (اشتري الآن)',   nameEn: 'Tamara (BNPL)',    icon: '🟣', popular: false, isActive: false, status: 'INACTIVE', isDefault: false, feePercent: 3.5,  feeFixed: null },
  { method: 'TABBY',         nameAr: 'تابي (اشتري الآن)',    nameEn: 'Tabby (BNPL)',     icon: '🟡', popular: false, isActive: false, status: 'INACTIVE', isDefault: false, feePercent: 3.5,  feeFixed: null },
  { method: 'CRYPTO',        nameAr: 'كريبتو',                nameEn: 'Crypto',           icon: '₿',  popular: false, isActive: false, status: 'INACTIVE', isDefault: false, feePercent: 1.0,  feeFixed: null },
  { method: 'COD',           nameAr: 'الدفع عند الاستلام',   nameEn: 'Cash on Delivery', icon: '📦', popular: false, isActive: false, status: 'INACTIVE', isDefault: false, feePercent: null, feeFixed: null },
  { method: 'WALLET',        nameAr: 'محفظة إلكترونية',      nameEn: 'E-Wallet',         icon: '👛', popular: false, isActive: false, status: 'INACTIVE', isDefault: false, feePercent: 1.5,  feeFixed: null },
]

// ─── Method Card ──────────────────────────────────────────────

function MethodCard({ item, onToggle, toggling }: {
  item: PaymentMethodItem
  onToggle: (method: string, current: boolean) => void
  toggling: string | null
}) {
  const isToggling = toggling === item.method

  const accentColor = item.isActive ? '#10B981' : COLORS.textMuted
  const cardBg = item.isActive
    ? 'rgba(16,185,129,0.06)'
    : COLORS.cardBg

  return (
    <View style={[
      styles.methodCard,
      { backgroundColor: cardBg, borderColor: item.isActive ? 'rgba(16,185,129,0.3)' : COLORS.border }
    ]}>
      <View style={[styles.methodRow, isRTL && styles.rev]}>

        {/* Icon */}
        <View style={[styles.methodIconWrap, {
          backgroundColor: item.isActive ? 'rgba(16,185,129,0.15)' : COLORS.surfaceBg,
          borderColor: item.isActive ? 'rgba(16,185,129,0.3)' : COLORS.border,
        }]}>
          <Text style={styles.methodIcon}>{item.icon}</Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <View style={[styles.methodNameRow, isRTL && styles.rev]}>
            <Text style={styles.methodName}>{item.nameAr}</Text>
            {item.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>شائع</Text>
              </View>
            )}
            {item.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>افتراضي</Text>
              </View>
            )}
          </View>
          <Text style={styles.methodNameEn}>{item.nameEn}</Text>
          {(item.feePercent !== null || item.feeFixed !== null) && (
            <Text style={[styles.feeText, { color: accentColor }]}>
              {item.feePercent !== null
                ? `رسوم: ${item.feePercent}%`
                : `رسوم ثابتة: ${item.feeFixed} ر.س`
              }
            </Text>
          )}
        </View>

        {/* Toggle */}
        {isToggling
          ? <ActivityIndicator size="small" color={COLORS.primary} />
          : <Switch
              value={item.isActive}
              onValueChange={() => onToggle(item.method, item.isActive)}
              trackColor={{ false: COLORS.border, true: '#10B981' }}
              thumbColor={COLORS.white}
            />
        }
      </View>

      {/* Active indicator bar */}
      {item.isActive && (
        <View style={styles.activeBar} />
      )}
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────

export default function PaymentMethodsScreen() {
  const tabBarHeight = useTabBarHeight()
  const [methods, setMethods] = useState<PaymentMethodItem[]>(DEMO_METHODS)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const fetchData = useCallback(async () => {
    try {
      // TODO: replace with paymentMethodsApi.list()
      setMethods(DEMO_METHODS)
    } catch {
      setMethods(DEMO_METHODS)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const onRefresh = () => { setRefreshing(true); fetchData() }

  const handleToggle = async (method: string, currentActive: boolean) => {
    setToggling(method)
    try {
      // TODO: replace with paymentMethodsApi.toggle(method)
      await new Promise(r => setTimeout(r, 500))
      setMethods(prev =>
        prev.map(m => m.method === method
          ? { ...m, isActive: !m.isActive, status: !m.isActive ? 'ACTIVE' : 'INACTIVE' }
          : m
        )
      )
    } catch {
      Alert.alert('خطأ', 'فشل تغيير حالة طريقة الدفع')
    } finally {
      setToggling(null)
    }
  }

  const activeCount = methods.filter(m => m.isActive).length

  const filteredMethods = methods.filter(m => {
    if (activeFilter === 'active')   return m.isActive
    if (activeFilter === 'inactive') return !m.isActive
    return true
  })

  const popularMethods  = filteredMethods.filter(m => m.popular)
  const otherMethods    = filteredMethods.filter(m => !m.popular)

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <InnerHeader title="طرق الدفع" accentColor="#10B981" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <InnerHeader title="طرق الدفع" accentColor="#10B981" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={[styles.summaryRow, isRTL && styles.rev]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>{activeCount}</Text>
              <Text style={styles.summaryLabel}>طريقة مفعّلة</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{methods.length - activeCount}</Text>
              <Text style={styles.summaryLabel}>غير مفعّلة</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{methods.length}</Text>
              <Text style={styles.summaryLabel}>إجمالي</Text>
            </View>
          </View>

          {/* Active methods pills */}
          <View style={[styles.activePills, isRTL && styles.rev]}>
            {methods.filter(m => m.isActive).map(m => (
              <View key={m.method} style={styles.activePill}>
                <Text style={styles.activePillIcon}>{m.icon}</Text>
                <Text style={styles.activePillText}>{m.nameAr}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={[styles.filterRow, isRTL && styles.rev]}>
          {([
            { key: 'all',      label: 'الكل'          },
            { key: 'active',   label: 'المفعّلة'       },
            { key: 'inactive', label: 'غير المفعّلة'   },
          ] as const).map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterBtn, activeFilter === f.key && styles.filterBtnActive]}
              onPress={() => setActiveFilter(f.key)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.filterBtnText,
                activeFilter === f.key && styles.filterBtnTextActive,
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Popular Methods */}
        {popularMethods.length > 0 && (
          <>
            <View style={[styles.sectionHeader, isRTL && styles.rev]}>
              <Text style={styles.sectionTitle}>الطرق الشائعة</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>
                  {popularMethods.filter(m => m.isActive).length}/{popularMethods.length}
                </Text>
              </View>
            </View>
            {popularMethods.map(item => (
              <MethodCard
                key={item.method}
                item={item}
                onToggle={handleToggle}
                toggling={toggling}
              />
            ))}
          </>
        )}

        {/* Other Methods */}
        {otherMethods.length > 0 && (
          <>
            <View style={[styles.sectionHeader, isRTL && styles.rev]}>
              <Text style={styles.sectionTitle}>طرق أخرى</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>
                  {otherMethods.filter(m => m.isActive).length}/{otherMethods.length}
                </Text>
              </View>
            </View>
            {otherMethods.map(item => (
              <MethodCard
                key={item.method}
                item={item}
                onToggle={handleToggle}
                toggling={toggling}
              />
            ))}
          </>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={[styles.infoText, isRTL && { textAlign: 'right' }]}>
            الطرق المفعّلة ستظهر تلقائياً في صفحات Hosted Checkout الخاصة بك. بعض الطرق تتطلب إعداداً إضافياً.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.deepBg },
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  rev:    { flexDirection: 'row-reverse' },

  // Summary
  summaryCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryValue:   { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.textPrimary },
  summaryLabel:   { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  summaryDivider: { width: 1, height: 32, backgroundColor: COLORS.border },

  activePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  activePillIcon: { fontSize: 12 },
  activePillText: { fontSize: 10, color: '#10B981', fontWeight: FONT_WEIGHT.semibold },

  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBtnActive: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: 'rgba(16,185,129,0.4)',
  },
  filterBtnText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textMuted,
  },
  filterBtnTextActive: {
    color: '#10B981',
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
  },
  sectionBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    backgroundColor: COLORS.surfaceBg,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionBadgeText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHT.semibold,
  },

  // Method Card
  methodCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  methodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  methodIcon: { fontSize: 22 },
  methodNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  methodName:   { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  methodNameEn: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  feeText:      { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, marginTop: 2 },

  popularBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  popularText: { fontSize: 9, color: '#F59E0B', fontWeight: FONT_WEIGHT.bold },

  defaultBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    backgroundColor: 'rgba(26,86,219,0.15)',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(26,86,219,0.3)',
  },
  defaultText: { fontSize: 9, color: COLORS.primaryLight, fontWeight: FONT_WEIGHT.bold },

  activeBar: {
    height: 2,
    backgroundColor: '#10B981',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    borderRadius: 1,
  },

  // Info Box
  infoBox: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    backgroundColor: 'rgba(8,145,178,0.08)',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(8,145,178,0.2)',
    alignItems: 'flex-start',
  },
  infoIcon: { fontSize: 18 },
  infoText: { flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.info, lineHeight: 18 },
})