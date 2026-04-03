/**
 * Zyrix App — useSearch Hook
 * Global search across transactions, settlements, disputes, refunds, and app sections.
 * Phase 6 Task 6.2
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from './useTranslation';
import { transactionsApi, settlementsApi, disputesApi, refundsApi } from '../services/api';
import type { ApiTransaction, ApiSettlement, ApiDispute, ApiRefund } from '../types';

// ─── Search Result Types ─────────────────────────

export type SearchResultType = 'section' | 'transaction' | 'settlement' | 'dispute' | 'refund';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  icon: string;
  /** Route to navigate to */
  route?: string;
  /** Extra params for navigation */
  params?: Record<string, string>;
}

// ─── App Sections (always searchable) ────────────

interface AppSection {
  id: string;
  route: string;
  icon: string;
  titleKey: string;
  keywords: string[];
}

const APP_SECTIONS: AppSection[] = [
  { id: 'sec_dashboard', route: '/(merchant)/dashboard', icon: '🏠', titleKey: 'tabs.dashboard', keywords: ['dashboard', 'home', 'الرئيسية', 'لوحة', 'رئيسي'] },
  { id: 'sec_transactions', route: '/(merchant)/transactions', icon: '💳', titleKey: 'tabs.transactions', keywords: ['transactions', 'payments', 'المعاملات', 'مدفوعات', 'عمليات'] },
  { id: 'sec_balance', route: '/(merchant)/balance', icon: '💰', titleKey: 'tabs.balance', keywords: ['balance', 'money', 'الرصيد', 'رصيد', 'حساب'] },
  { id: 'sec_analytics', route: '/(merchant)/analytics', icon: '📊', titleKey: 'tabs.analytics', keywords: ['analytics', 'reports', 'التحليلات', 'تحليل', 'تقارير'] },
  { id: 'sec_settings', route: '/(merchant)/settings', icon: '⚙️', titleKey: 'tabs.settings', keywords: ['settings', 'الإعدادات', 'إعدادات', 'ضبط'] },
  { id: 'sec_settlements', route: '/(merchant)/settlements', icon: '🏦', titleKey: 'settlements.title', keywords: ['settlements', 'التسويات', 'تسوية', 'إيداع'] },
  { id: 'sec_disputes', route: '/(merchant)/disputes', icon: '⚠️', titleKey: 'disputes.title', keywords: ['disputes', 'النزاعات', 'نزاع', 'شكوى'] },
  { id: 'sec_refunds', route: '/(merchant)/refunds', icon: '↩️', titleKey: 'refunds.title', keywords: ['refunds', 'المستردات', 'استرداد', 'رد'] },
  { id: 'sec_notifications', route: '/(merchant)/notifications', icon: '🔔', titleKey: 'notifications.title', keywords: ['notifications', 'الإشعارات', 'إشعار', 'تنبيه'] },
  { id: 'sec_expenses', route: '/(merchant)/expenses', icon: '📋', titleKey: 'expenses.title', keywords: ['expenses', 'المصروفات', 'مصروف'] },
  { id: 'sec_invoices', route: '/(merchant)/invoices', icon: '🧾', titleKey: 'invoices.title', keywords: ['invoices', 'الفواتير', 'فاتورة'] },
  { id: 'sec_profile', route: '/(merchant)/profile', icon: '👤', titleKey: 'profile.title', keywords: ['profile', 'الملف', 'حساب', 'بيانات'] },
];

// ─── Hook ────────────────────────────────────────

export function useSearch() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Search sections (instant, no API call)
  const searchSections = useCallback((q: string): SearchResult[] => {
    const lower = q.toLowerCase().trim();
    if (!lower) return [];

    return APP_SECTIONS.filter((section) => {
      const title = t(section.titleKey).toLowerCase();
      return (
        title.includes(lower) ||
        section.keywords.some((kw) => kw.includes(lower))
      );
    }).map((section) => ({
      id: section.id,
      type: 'section' as SearchResultType,
      title: t(section.titleKey),
      subtitle: t('search.go_to_section'),
      icon: section.icon,
      route: section.route,
    }));
  }, [t]);

  // Search transactions
  const searchTransactions = useCallback(async (q: string): Promise<SearchResult[]> => {
    try {
      const res = await transactionsApi.list();
      const txs = res.transactions || [];
      const lower = q.toLowerCase();

      return txs
        .filter((tx: ApiTransaction) => {
          const searchable = [
            tx.txId || '',
            tx.customerName || '',
            tx.amount || '',
            tx.status || '',
            tx.method || '',
          ].join(' ').toLowerCase();
          return searchable.includes(lower);
        })
        .slice(0, 5)
        .map((tx: ApiTransaction) => ({
          id: `tx_${tx.id}`,
          type: 'transaction' as SearchResultType,
          title: tx.customerName || tx.txId || t('common.noData'),
          subtitle: `${tx.amount} • ${tx.status}`,
          icon: '💳',
          route: '/(merchant)/transaction-detail',
          params: { id: tx.id },
        }));
    } catch {
      return [];
    }
  }, [t]);

  // Search settlements
  const searchSettlements = useCallback(async (q: string): Promise<SearchResult[]> => {
    try {
      const res = await settlementsApi.list();
      const items = res.settlements || [];
      const lower = q.toLowerCase();

      return items
        .filter((s: ApiSettlement) => {
          const searchable = [
            s.settlementId || '',
            s.net || '',
            s.status || '',
          ].join(' ').toLowerCase();
          return searchable.includes(lower);
        })
        .slice(0, 3)
        .map((s: ApiSettlement) => ({
          id: `stl_${s.id}`,
          type: 'settlement' as SearchResultType,
          title: s.settlementId || t('common.noData'),
          subtitle: `${s.net} • ${s.status}`,
          icon: '🏦',
          route: '/(merchant)/settlements',
        }));
    } catch {
      return [];
    }
  }, [t]);

  // Search disputes
  const searchDisputes = useCallback(async (q: string): Promise<SearchResult[]> => {
    try {
      const res = await disputesApi.list();
      const items = res.disputes || [];
      const lower = q.toLowerCase();

      return items
        .filter((d: ApiDispute) => {
          const searchable = [
            d.disputeId || '',
            d.reason || '',
            d.amount || '',
            d.status || '',
          ].join(' ').toLowerCase();
          return searchable.includes(lower);
        })
        .slice(0, 3)
        .map((d: ApiDispute) => ({
          id: `dsp_${d.id}`,
          type: 'dispute' as SearchResultType,
          title: d.disputeId || t('common.noData'),
          subtitle: `${d.amount} • ${d.reason}`,
          icon: '⚠️',
          route: '/(merchant)/disputes',
        }));
    } catch {
      return [];
    }
  }, [t]);

  // Search refunds
  const searchRefunds = useCallback(async (q: string): Promise<SearchResult[]> => {
    try {
      const res = await refundsApi.list();
      const items = res.refunds || [];
      const lower = q.toLowerCase();

      return items
        .filter((r: ApiRefund) => {
          const searchable = [
            r.refundId || '',
            r.customerName || '',
            r.amount || '',
            r.reason || '',
            r.status || '',
          ].join(' ').toLowerCase();
          return searchable.includes(lower);
        })
        .slice(0, 3)
        .map((r: ApiRefund) => ({
          id: `ref_${r.id}`,
          type: 'refund' as SearchResultType,
          title: r.customerName || r.refundId || t('common.noData'),
          subtitle: `${r.amount} • ${r.reason}`,
          icon: '↩️',
          route: '/(merchant)/refunds',
        }));
    } catch {
      return [];
    }
  }, [t]);

  // Main search function
  const search = useCallback(async (q: string) => {
    setQuery(q);

    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Sections search is instant
      const sectionResults = searchSections(q);

      // API searches run in parallel
      const [txResults, stlResults, dspResults, refResults] = await Promise.all([
        searchTransactions(q),
        searchSettlements(q),
        searchDisputes(q),
        searchRefunds(q),
      ]);

      setResults([
        ...sectionResults,
        ...txResults,
        ...stlResults,
        ...dspResults,
        ...refResults,
      ]);
    } catch {
      setResults(searchSections(q));
    } finally {
      setLoading(false);
    }
  }, [searchSections, searchTransactions, searchSettlements, searchDisputes, searchRefunds]);

  // Clear search
  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setLoading(false);
  }, []);

  return {
    query,
    results,
    loading,
    search,
    clear,
  };
}
