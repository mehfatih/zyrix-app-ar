/**
 * Zyrix App — Search Screen
 * Global search across all sections, transactions, settlements, disputes, and refunds.
 * Phase 6 Task 6.2
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  I18nManager,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { COLORS } from '../../constants/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';
import { useSearch, SearchResult, SearchResultType } from '../../hooks/useSearch';

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
  const isRTL = I18nManager.isRTL;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      <Path
        d="M9 18l6-6-6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Type Label & Color ──────────────────────────

function getTypeInfo(type: SearchResultType, t: (key: string) => string): { label: string; color: string } {
  switch (type) {
    case 'section':
      return { label: t('search.type_section'), color: COLORS.primaryLight };
    case 'transaction':
      return { label: t('search.type_transaction'), color: COLORS.successLight };
    case 'settlement':
      return { label: t('search.type_settlement'), color: COLORS.info };
    case 'dispute':
      return { label: t('search.type_dispute'), color: COLORS.warningLight };
    case 'refund':
      return { label: t('search.type_refund'), color: COLORS.dangerLight };
    default:
      return { label: '', color: COLORS.textMuted };
  }
}

// ─── Result Item ─────────────────────────────────

function ResultItem({
  item,
  onPress,
  t,
}: {
  item: SearchResult;
  onPress: (item: SearchResult) => void;
  t: (key: string) => string;
}) {
  const typeInfo = getTypeInfo(item.type, t);

  return (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resultIcon}>
        <Text style={styles.resultIconText}>{item.icon}</Text>
      </View>

      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>

      <View style={styles.resultMeta}>
        <View style={[styles.typeBadge, { backgroundColor: `${typeInfo.color}20` }]}>
          <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>
            {typeInfo.label}
          </Text>
        </View>
        <ArrowIcon size={16} color={COLORS.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Component ──────────────────────────────

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useTranslation();
  const { query, results, loading, search, clear } = useSearch();
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus input on mount
  useEffect(() => {
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timeout);
  }, []);

  // Debounced search
  const handleTextChange = useCallback((text: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      search(text);
    }, 300);
  }, [search]);

  // Navigate to result
  const handleResultPress = useCallback((item: SearchResult) => {
    Keyboard.dismiss();
    if (item.route) {
      router.push(item.route as any);
    }
  }, [router]);

  // Go back
  const handleClose = useCallback(() => {
    clear();
    router.back();
  }, [clear, router]);

  // Clear input
  const handleClear = useCallback(() => {
    inputRef.current?.clear();
    clear();
    inputRef.current?.focus();
  }, [clear]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search Header */}
      <View style={[styles.searchHeader, isRTL && styles.searchHeaderRTL]}>
        <View style={[styles.searchInputContainer, isRTL && styles.searchInputContainerRTL]}>
          <SearchIcon size={18} color={COLORS.textMuted} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, isRTL && styles.searchInputRTL]}
            placeholder={t('search.placeholder')}
            placeholderTextColor={COLORS.inputPlaceholder}
            onChangeText={handleTextChange}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
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

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primaryLight} />
          <Text style={styles.loadingText}>{t('search.searching')}</Text>
        </View>
      ) : query.length > 0 && results.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>{t('search.no_results')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('search.no_results_hint')}
          </Text>
        </View>
      ) : query.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔎</Text>
          <Text style={styles.emptyTitle}>{t('search.start_typing')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('search.start_typing_hint')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ResultItem item={item} onPress={handleResultPress} t={t} />
          )}
          contentContainerStyle={styles.resultsList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  // ─── Search Header ──────
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchInputContainerRTL: {
    flexDirection: 'row-reverse',
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    paddingVertical: 0,
  },
  searchInputRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  clearButton: {
    padding: SPACING.xs,
  },
  cancelButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  cancelText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primaryLight,
    fontWeight: FONT_WEIGHT.medium,
  },
  // ─── Loading ────────────
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  // ─── Empty State ────────
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING['3xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  // ─── Results List ───────
  resultsList: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING['3xl'],
  },
  resultItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  resultIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultIconText: {
    fontSize: 20,
  },
  resultContent: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  resultSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  resultMeta: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  typeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.semibold,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
});
