/**
 * Zyrix App — Search Screen
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Keyboard, I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { COLORS } from '../../constants/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';
import { useSearch, SearchResult, SearchResultType } from '../../hooks/useSearch';

// ─── ألوان مميزة لكل نتيجة حسب نوعها ────────────
const TYPE_COLORS: Record<string, { bg: string; badge: string; text: string }> = {
  section:     { bg: 'rgba(26, 86, 219, 0.08)',  badge: 'rgba(26, 86, 219, 0.18)',  text: '#60A5FA' },
  transaction: { bg: 'rgba(5, 150, 105, 0.08)',  badge: 'rgba(5, 150, 105, 0.18)',  text: '#34D399' },
  settlement:  { bg: 'rgba(8, 145, 178, 0.08)',  badge: 'rgba(8, 145, 178, 0.18)',  text: '#22D3EE' },
  dispute:     { bg: 'rgba(217, 119, 6, 0.08)',  badge: 'rgba(217, 119, 6, 0.18)',  text: '#FCD34D' },
  refund:      { bg: 'rgba(220, 38, 38, 0.08)',  badge: 'rgba(220, 38, 38, 0.18)',  text: '#F87171' },
};

function getTypeColors(type: string) {
  return TYPE_COLORS[type] ?? TYPE_COLORS['section'];
}

// ─── SVG Icons ───────────────────────────────────

function SearchIcon({ size = 20, color = COLORS.textMuted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={2} />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function CloseIcon({ size = 20, color = COLORS.textMuted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ArrowIcon({ size = 18, color = COLORS.textMuted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Type Label ──────────────────────────────────

function getTypeLabel(type: SearchResultType, t: (key: string) => string): string {
  switch (type) {
    case 'section':     return t('search.type_section');
    case 'transaction': return t('search.type_transaction');
    case 'settlement':  return t('search.type_settlement');
    case 'dispute':     return t('search.type_dispute');
    case 'refund':      return t('search.type_refund');
    default:            return '';
  }
}

// ─── Result Item ─────────────────────────────────

function ResultItem({ item, onPress, t }: { item: SearchResult; onPress: (item: SearchResult) => void; t: (key: string) => string }) {
  const tc = getTypeColors(item.type);
  const label = getTypeLabel(item.type, t);

  return (
    <TouchableOpacity
      style={[styles.resultItem, { backgroundColor: tc.bg }]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.resultIcon, { backgroundColor: tc.badge }]}>
        <Text style={styles.resultIconText}>{item.icon}</Text>
      </View>
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>{item.subtitle}</Text>
      </View>
      <View style={styles.resultMeta}>
        <View style={[styles.typeBadge, { backgroundColor: tc.badge }]}>
          <Text style={[styles.typeBadgeText, { color: tc.text }]}>{label}</Text>
        </View>
        <ArrowIcon size={16} color={tc.text} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useTranslation();
  const { query, results, loading, search, clear } = useSearch();
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => { inputRef.current?.focus(); }, 300);
    return () => clearTimeout(timeout);
  }, []);

  const handleTextChange = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { search(text); }, 300);
  }, [search]);

  const handleResultPress = useCallback((item: SearchResult) => {
    Keyboard.dismiss();
    if (item.route) router.push(item.route as any);
  }, [router]);

  const handleClose = useCallback(() => { clear(); router.back(); }, [clear, router]);
  const handleClear = useCallback(() => { inputRef.current?.clear(); clear(); inputRef.current?.focus(); }, [clear]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search Header */}
      <View style={[styles.searchHeader, isRTL && styles.searchHeaderRTL]}>
        <View style={[styles.searchInputContainer, isRTL && styles.searchInputContainerRTL]}>
          <SearchIcon size={18} color={COLORS.primaryLight} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, isRTL && styles.searchInputRTL]}
            placeholder={t('search.placeholder')}
            placeholderTextColor={COLORS.inputPlaceholder}
            onChangeText={handleTextChange}
            returnKeyType="search"
            autoCorrect={false} autoCapitalize="none"
            selectionColor={COLORS.primaryLight}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <CloseIcon size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </View>

      {/* States */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="small" color={COLORS.primaryLight} />
          <Text style={styles.emptySubtitle}>{t('search.searching')}</Text>
        </View>
      ) : query.length > 0 && results.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>{t('search.no_results')}</Text>
          <Text style={styles.emptySubtitle}>{t('search.no_results_hint')}</Text>
        </View>
      ) : query.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔎</Text>
          <Text style={styles.emptyTitle}>{t('search.start_typing')}</Text>
          <Text style={styles.emptySubtitle}>{t('search.start_typing_hint')}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ResultItem item={item} onPress={handleResultPress} t={t} />}
          contentContainerStyle={styles.resultsList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.darkBg },
  searchHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    gap: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  searchHeaderRTL: { flexDirection: 'row-reverse' },
  searchInputContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md, height: 44,
    borderWidth: 1, borderColor: COLORS.primaryLight + '40', gap: SPACING.sm,
  },
  searchInputContainerRTL: { flexDirection: 'row-reverse' },
  searchInput: {
    flex: 1, fontSize: FONT_SIZE.base, color: COLORS.textPrimary,
    textAlign: I18nManager.isRTL ? 'right' : 'left', paddingVertical: 0,
  },
  searchInputRTL: { textAlign: 'right', writingDirection: 'rtl' },
  clearButton: { padding: SPACING.xs },
  cancelButton: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xs },
  cancelText: { fontSize: FONT_SIZE.sm, color: COLORS.primaryLight, fontWeight: FONT_WEIGHT.medium },
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING['3xl'],
  },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.lg },
  emptyTitle: {
    fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary, marginBottom: SPACING.sm, textAlign: 'center',
  },
  emptySubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  resultsList: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING['3xl'] },
  resultItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center', paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md, borderRadius: RADIUS.md,
    gap: SPACING.md,
  },
  resultIcon: {
    width: 42, height: 42, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  resultIconText: { fontSize: 20 },
  resultContent: { flex: 1, gap: 2 },
  resultTitle: {
    fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  resultSubtitle: {
    fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  resultMeta: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center', gap: SPACING.sm,
  },
  typeBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.sm },
  typeBadgeText: { fontSize: 10, fontWeight: FONT_WEIGHT.semibold },
  separator: { height: SPACING.xs },
});