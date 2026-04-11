/**
 * Zyrix App — Feature Flags Screen
 * تفعيل وتعطيل ميزات التطبيق
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, ActivityIndicator, I18nManager, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import { InnerHeader } from '../../components/InnerHeader';
import { featureFlagsApi } from '../../services/api';

const isRTL = I18nManager.isRTL;

// ─── Types ────────────────────────────────────────────────────
interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description: string;
  category: string;
  enabled: boolean;
  requiresExternalSetup: boolean;
}

// ─── Category config ──────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { labelAr: string; icon: string; color: string }> = {
  core:         { labelAr: 'الميزات الأساسية',   icon: '🏗️', color: COLORS.primary },
  payments:     { labelAr: 'المدفوعات',           icon: '💳', color: '#059669' },
  optimization: { labelAr: 'تحسين الأداء',        icon: '⚡', color: '#D97706' },
};

export default function FeatureFlagsScreen() {
  const router = useRouter();

  const [flags, setFlags]       = useState<FeatureFlag[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  // ─── Load ─────────────────────────────────────────────────
  const loadFlags = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await featureFlagsApi.list();
      setFlags(res.data.flags);
    } catch {
      Alert.alert('', 'تعذر تحميل الإعدادات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadFlags(); }, []);

  // ─── Toggle ───────────────────────────────────────────────
  const handleToggle = async (flag: FeatureFlag) => {
    if (flag.requiresExternalSetup && !flag.enabled) {
      Alert.alert(
        'يتطلب إعداداً خارجياً',
        'هذه الميزة تحتاج ربط بوابة دفع أو خدمة خارجية قبل تفعيلها. هل تريد المتابعة؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'تفعيل على أي حال', onPress: () => doToggle(flag) },
        ]
      );
      return;
    }
    doToggle(flag);
  };

  const doToggle = async (flag: FeatureFlag) => {
    setToggling(flag.key);
    const newVal = !flag.enabled;
    setFlags(prev => prev.map(f => f.key === flag.key ? { ...f, enabled: newVal } : f));
    try {
      await featureFlagsApi.update(flag.key, newVal);
      Alert.alert('', `${flag.label} ${newVal ? 'مفعّل ✅' : 'معطّل'}`);
    } catch {
      setFlags(prev => prev.map(f => f.key === flag.key ? { ...f, enabled: !newVal } : f));
      Alert.alert('', 'تعذر تحديث الإعداد');
    } finally {
      setToggling(null);
    }
  };

  // ─── Group by category ────────────────────────────────────
  const grouped = flags.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {} as Record<string, FeatureFlag[]>);

  const categoryOrder = ['core', 'payments', 'optimization'];
  const enabledCount  = flags.filter(f => f.enabled).length;

  // ─── Render ───────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <InnerHeader title="إدارة الميزات" accentColor={COLORS.primary} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <InnerHeader title="إدارة الميزات" accentColor={COLORS.primary} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadFlags(true); }}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Summary */}
        <View style={s.summaryCard}>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={s.summaryNum}>{enabledCount}</Text>
              <Text style={s.summaryLbl}>مفعّل</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryNum, { color: '#64748B' }]}>{flags.length - enabledCount}</Text>
              <Text style={s.summaryLbl}>معطّل</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryNum, { color: '#D97706' }]}>{flags.filter(f => f.requiresExternalSetup && !f.enabled).length}</Text>
              <Text style={s.summaryLbl}>يحتاج ربط</Text>
            </View>
          </View>
        </View>

        {/* Info box */}
        <View style={s.infoBox}>
          <Text style={s.infoIcon}>💡</Text>
          <Text style={s.infoText}>
            يمكنك تفعيل أو تعطيل أي ميزة مؤقتاً. الميزات التي تحتاج ربطاً خارجياً ستظهر تحذيراً عند التفعيل.
          </Text>
        </View>

        {/* Categories */}
        {categoryOrder.map(cat => {
          const catFlags = grouped[cat];
          if (!catFlags?.length) return null;
          const cfg = CATEGORY_CONFIG[cat] || { labelAr: cat, icon: '⚙️', color: COLORS.primary };

          return (
            <View key={cat} style={s.section}>
              {/* Category header */}
              <View style={s.catHeader}>
                <Text style={s.catIcon}>{cfg.icon}</Text>
                <Text style={[s.catLabel, { color: cfg.color }]}>{cfg.labelAr}</Text>
                <View style={[s.catBadge, { backgroundColor: cfg.color + '20' }]}>
                  <Text style={[s.catBadgeText, { color: cfg.color }]}>
                    {catFlags.filter(f => f.enabled).length}/{catFlags.length}
                  </Text>
                </View>
              </View>

              {/* Flags */}
              {catFlags.map((flag, idx) => (
                <View
                  key={flag.key}
                  style={[
                    s.flagCard,
                    idx === 0 && s.flagCardFirst,
                    idx === catFlags.length - 1 && s.flagCardLast,
                  ]}
                >
                  <View style={s.flagLeft}>
                    <View style={s.flagTitleRow}>
                      <Text style={s.flagLabel}>{flag.label}</Text>
                      {flag.requiresExternalSetup && (
                        <View style={s.extBadge}>
                          <Text style={s.extBadgeText}>ربط خارجي</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.flagDesc} numberOfLines={2}>{flag.description}</Text>
                  </View>

                  <View style={s.flagRight}>
                    {toggling === flag.key ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <Switch
                        value={flag.enabled}
                        onValueChange={() => handleToggle(flag)}
                        trackColor={{ false: '#334155', true: COLORS.primary + '80' }}
                        thumbColor={flag.enabled ? COLORS.primary : '#64748B'}
                        ios_backgroundColor="#334155"
                      />
                    )}
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.background },
  scroll:  { flex: 1 },
  content: { padding: SPACING.md },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryRow:     { flexDirection: 'row', alignItems: 'center' },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryNum:     { fontSize: 24, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },
  summaryLbl:     { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  summaryDivider: { width: 1, height: 36, backgroundColor: COLORS.border },

  infoBox: {
    flexDirection: isRTL ? 'row' : 'row-reverse',
    backgroundColor: '#1E3A5F',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: 10,
    alignItems: 'flex-start',
  },
  infoIcon: { fontSize: 18 },
  infoText: { flex: 1, fontSize: 13, color: '#93C5FD', lineHeight: 20, textAlign: isRTL ? 'right' : 'left' },

  section:      { marginBottom: SPACING.lg },
  catHeader:    { flexDirection: isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8, paddingHorizontal: 4 },
  catIcon:      { fontSize: 18 },
  catLabel:     { fontSize: 15, fontWeight: FONT_WEIGHT.bold, flex: 1, textAlign: isRTL ? 'right' : 'left' },
  catBadge:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  catBadgeText: { fontSize: 12, fontWeight: FONT_WEIGHT.semibold },

  flagCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    flexDirection: isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 0,
  },
  flagCardFirst: { borderTopWidth: 1, borderTopLeftRadius: RADIUS.md, borderTopRightRadius: RADIUS.md },
  flagCardLast:  { borderBottomLeftRadius: RADIUS.md, borderBottomRightRadius: RADIUS.md },

  flagLeft:      { flex: 1 },
  flagTitleRow:  { flexDirection: isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 4 },
  flagLabel:     { fontSize: 15, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text, textAlign: isRTL ? 'right' : 'left' },
  flagDesc:      { fontSize: 12, color: COLORS.textMuted, textAlign: isRTL ? 'right' : 'left', lineHeight: 18 },
  flagRight:     { width: 52, alignItems: 'center' },

  extBadge:     { backgroundColor: '#D9770620', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  extBadgeText: { fontSize: 10, color: '#D97706', fontWeight: FONT_WEIGHT.semibold },
});