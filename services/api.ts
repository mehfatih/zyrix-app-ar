import type { ApiTransaction, ApiSettlement, ApiDispute, ApiRefund, ApiNotification, MerchantProfile } from '../types';
import { USE_DEMO_DATA, demoDashboard, demoBalance, demoTransactionsList, demoAnalytics, demoSettlements, demoDisputes, demoRefunds, demoNotifications, demoProfile, demoPaymentLinks, demoSubscriptions } from './demoData';
/**
 * Zyrix App — API Service
 * Connects all screens to the real backend.
 * When USE_DEMO_DATA is true, returns realistic demo data instead.
 * Replace BASE_URL with your production API URL.
 */

import * as SecureStore from 'expo-secure-store';

// ─── Configuration ───────────────────────────────
const BASE_URL = 'https://zyrix-backend-production.up.railway.app';
const TOKEN_KEY = 'zyrix_auth_token';

// ─── HTTP Client ─────────────────────────────────
async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ─── Auth API ────────────────────────────────────
export const authApi = {
  requestOtp: (phone: string) =>
    request<{ success: boolean; expiresIn: number }>('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, code: string) =>
    request<{
      success: boolean;
      token: string;
      user: {
        id: string;
        merchantId: string;
        name: string;
        phone: string;
        email: string | null;
        company: string;
        language: string;
      };
    }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),

  getMe: () =>
    request<{
      id: string;
      merchantId: string;
      name: string;
      phone: string;
      email: string | null;
      company: string;
      language: string;
      iban: string | null;
    }>('/api/merchant/profile'),
};

// ─── Transactions API ────────────────────────────
export const transactionsApi = {
  list: (params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
  }) => {
    if (USE_DEMO_DATA) return Promise.resolve(demoTransactionsList as any);
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    const qs = query.toString();
    return request<{
      transactions: ApiTransaction[];
      pagination: { page: number; limit: number; total: number; pages: number };
      stats: { totalVolume: number; totalCount: number; successRate: string };
    }>(`/api/transactions${qs ? `?${qs}` : ''}`);
  },

  getById: (txId: string) =>
    request<ApiTransaction>(`/api/transactions/${txId}`),
};

// ─── Balance API ─────────────────────────────────
export const balanceApi = {
  get: () => {
    if (USE_DEMO_DATA) return Promise.resolve(demoBalance as any);
    return request<{
      available: number;
      incoming: number;
      outgoing: number;
      iban: string;
      company: string;
      nextSettlement: {
        id: string;
        date: string;
        net: number;
        commission: number;
      } | null;
    }>('/api/balance');
  },
};

// ─── Settlements API ─────────────────────────────
export const settlementsApi = {
  list: (params?: { status?: string; days?: number; page?: number }) => {
    if (USE_DEMO_DATA) return Promise.resolve(demoSettlements as any);
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.days) query.set('days', String(params.days));
    if (params?.page) query.set('page', String(params.page));
    const qs = query.toString();
    return request<{
      settlements: ApiSettlement[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/api/settlements${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string) =>
    request<ApiSettlement>(`/api/settlements/${id}`),
};

// ─── Disputes API ────────────────────────────────
export const disputesApi = {
  list: () => {
    if (USE_DEMO_DATA) return Promise.resolve(demoDisputes as any);
    return request<{ disputes: ApiDispute[] }>('/api/disputes');
  },

  respond: (disputeId: string, response: string) =>
    request<ApiDispute>(`/api/disputes/${disputeId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response }),
    }),
};

// ─── Refunds API ─────────────────────────────────
export const refundsApi = {
  list: (status?: string) => {
    if (USE_DEMO_DATA) return Promise.resolve(demoRefunds as any);
    const qs = status ? `?status=${status}` : '';
    return request<{ refunds: ApiRefund[] }>(`/api/refunds${qs}`);
  },

  create: (transactionId: string, amount: number, reason: string) =>
    request<ApiRefund>('/api/refunds', {
      method: 'POST',
      body: JSON.stringify({ transactionId, amount, reason }),
    }),
};

// ─── Notifications API ───────────────────────────
export const notificationsApi = {
  list: () => {
    if (USE_DEMO_DATA) return Promise.resolve(demoNotifications as any);
    return request<{ notifications: ApiNotification[]; unreadCount: number }>('/api/notifications');
  },

  markAllRead: () =>
    request<{ success: boolean }>('/api/notifications/read-all', { method: 'PUT' }),

  markRead: (id: string) =>
    request<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'PUT' }),
};

// ─── Merchant API ────────────────────────────────
export const merchantApi = {
  getProfile: () => {
    if (USE_DEMO_DATA) return Promise.resolve(demoProfile as any);
    return request<MerchantProfile>('/api/merchant/profile');
  },

  updateProfile: (data: { name?: string; email?: string; company?: string; language?: string }) =>
    request<MerchantProfile>('/api/merchant/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  registerPushToken: (token: string, platform: 'ios' | 'android') =>
    request<{ success: boolean }>('/api/merchant/push-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    }),
};

// ─── Dashboard Aggregate ─────────────────────────
export const dashboardApi = {
  getData: async () => {
    if (USE_DEMO_DATA) return demoDashboard as any;

    const [txData, balance, disputes, notifications] = await Promise.all([
      transactionsApi.list({ limit: 4 }),
      balanceApi.get(),
      disputesApi.list(),
      notificationsApi.list(),
    ]);

    const openDisputes = disputes.disputes.filter(
      (d: ApiDispute) => d.status === 'open',
    ).length;

    return {
      kpis: {
        totalVolume: txData.stats.totalVolume,
        successRate: txData.stats.successRate,
        todayTx: txData.stats.totalCount,
        openDisputes,
      },
      recentTransactions: txData.transactions,
      balance,
      unreadNotifications: notifications.unreadCount,
    };
  },
};

// ─── Analytics API ───────────────────────────────
export const analyticsApi = {
  getData: (range: '7d' | '30d' | '90d' = '30d') => {
    if (USE_DEMO_DATA) return Promise.resolve(demoAnalytics(range) as any);
    return request<{
      range: string;
      kpi: {
        volume: number;
        successRate: number;
        avgTx: number;
        customers: number;
      };
      volume: { label: string; value: number }[];
      successRate: { label: string; value: number }[];
      methods: { label: string; value: number }[];
      countries: { label: string; value: number }[];
    }>(`/api/analytics?range=${range}`);
  },
};

// ─── Payment Links API ──────────────────────────
export const paymentLinksApi = {
  list: (status?: string) => {
    if (USE_DEMO_DATA) return Promise.resolve(demoPaymentLinks as any);
    const qs = status ? `?status=${status}` : '';
    return request<{ links: Array<{
      id: string; linkId: string; amount: string; currency: string;
      title: string; description: string | null; status: string;
      expiresAt: string | null; paidAt: string | null; createdAt: string;
      paymentUrl?: string;
    }> }>(`/api/payment-links${qs}`);
  },

  create: (data: { amount: number; title: string; currency?: string; description?: string; expiresInHours?: number }) =>
    request<{
      id: string; linkId: string; amount: string; currency: string;
      title: string; status: string; paymentUrl: string; createdAt: string;
    }>('/api/payment-links', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cancel: (linkId: string) =>
    request<{ id: string; status: string }>(`/api/payment-links/${linkId}/cancel`, { method: 'PUT' }),
};

// ─── Subscriptions API ──────────────────────────
export const subscriptionsApi = {
  list: (status?: string) => {
    if (USE_DEMO_DATA) return Promise.resolve(demoSubscriptions as any);
    const qs = status ? `?status=${status}` : '';
    return request<{ subscriptions: Array<{
      id: string; subscriptionId: string; customerName: string;
      amount: string; currency: string; interval: string; title: string;
      status: string; nextBillingDate: string; billingCount: number; createdAt: string;
    }> }>(`/api/subscriptions${qs}`);
  },

  create: (data: { customerName: string; amount: number; interval: string; title: string; customerEmail?: string; customerPhone?: string }) =>
    request<{ subscriptionId: string; status: string }>('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  pause: (subId: string) =>
    request<{ status: string }>(`/api/subscriptions/${subId}/pause`, { method: 'PUT' }),

  resume: (subId: string) =>
    request<{ status: string }>(`/api/subscriptions/${subId}/resume`, { method: 'PUT' }),

  cancel: (subId: string) =>
    request<{ status: string }>(`/api/subscriptions/${subId}/cancel`, { method: 'PUT' }),
};

// ─── Export API ─────────────────────────────────
export const exportApi = {
  transactions: (params?: { format?: string; from?: string; to?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.format) query.set('format', params.format);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return `/api/export/transactions${qs ? `?${qs}` : ''}`;
  },
};

// ─── Revenue Goals API ──────────────────────────
export const revenueGoalsApi = {
  list: () => request<{ goals: Array<{
    id: string; targetAmount: string; currentAmount: number; currency: string;
    period: string; status: string; progress: number; daysLeft: number;
    startDate: string; endDate: string;
  }> }>('/api/revenue-goals'),

  create: (data: { targetAmount: number; period: string; currency?: string }) =>
    request<{ id: string }>('/api/revenue-goals', { method: 'POST', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/api/revenue-goals/${id}`, { method: 'DELETE' }),
};

// ─── Expenses API ───────────────────────────────
export const expensesApi = {
  list: (params?: { category?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    const qs = q.toString();
    return request<{
      expenses: Array<{ id: string; amount: string; currency: string; category: string; title: string; description: string | null; date: string; recurring: boolean }>;
      summary: { totalExpenses: number; totalRevenue: number; netProfit: number; byCategory: Array<{ category: string; total: number; count: number }> };
    }>(`/api/expenses${qs ? `?${qs}` : ''}`);
  },

  create: (data: { amount: number; category: string; title: string; description?: string; date?: string; recurring?: boolean }) =>
    request<{ id: string }>('/api/expenses', { method: 'POST', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/api/expenses/${id}`, { method: 'DELETE' }),
};

// ─── Invoices API ───────────────────────────────
export const invoicesApi = {
  list: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return request<{ invoices: Array<{
      id: string; invoiceId: string; customerName: string; items: string;
      subtotal: string; tax: string; total: string; currency: string;
      status: string; dueDate: string | null; createdAt: string;
    }> }>(`/api/invoices${qs}`);
  },

  getById: (id: string) => request<{
    id: string; invoiceId: string; customerName: string; items: string;
    subtotal: string; tax: string; total: string; status: string;
    merchant: { name: string; company: string; iban: string | null };
  }>(`/api/invoices/${id}`),

  create: (data: { customerName: string; items: Array<{ description: string; quantity: number; unitPrice: number }>; taxRate?: number; customerEmail?: string; dueDate?: string; notes?: string }) =>
    request<{ invoiceId: string }>('/api/invoices', { method: 'POST', body: JSON.stringify(data) }),

  send: (invoiceId: string) =>
    request<{ status: string }>(`/api/invoices/${invoiceId}/send`, { method: 'PUT' }),

  markPaid: (invoiceId: string) =>
    request<{ status: string }>(`/api/invoices/${invoiceId}/mark-paid`, { method: 'PUT' }),
};

// ─── Transfers API ──────────────────────────────
export const transfersApi = {
  list: () => request<{
    sent: Array<{ id: string; transferId: string; amount: string; currency: string; description: string | null; status: string; createdAt: string; toMerchant: { merchantId: string; name: string } }>;
    received: Array<{ id: string; transferId: string; amount: string; currency: string; description: string | null; status: string; createdAt: string; fromMerchant: { merchantId: string; name: string } }>;
  }>('/api/transfers'),

  create: (data: { toMerchantId: string; amount: number; description?: string }) =>
    request<{ transferId: string }>('/api/transfers', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Default Export ─────────────────────────────
export default {
  auth: authApi,
  transactions: transactionsApi,
  balance: balanceApi,
  settlements: settlementsApi,
  disputes: disputesApi,
  refunds: refundsApi,
  notifications: notificationsApi,
  merchant: merchantApi,
  dashboard: dashboardApi,
  analytics: analyticsApi,
  paymentLinks: paymentLinksApi,
  subscriptions: subscriptionsApi,
  export: exportApi,
  revenueGoals: revenueGoalsApi,
  expenses: expensesApi,
  invoices: invoicesApi,
  transfers: transfersApi,
};