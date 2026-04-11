import type { ApiTransaction, ApiSettlement, ApiDispute, ApiRefund, ApiNotification, MerchantProfile } from '../types';
import { USE_DEMO_DATA, demoDashboard, demoBalance, demoTransactionsList, demoAnalytics, demoSettlements, demoDisputes, demoRefunds, demoNotifications, demoProfile, demoPaymentLinks, demoSubscriptions } from './demoData';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://zyrix-backend-production.up.railway.app';
const TOKEN_KEY = 'zyrix_auth_token';

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };
  const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const authApi = {
  requestOtp: (phone: string) =>
    request<{ success: boolean; expiresIn: number }>('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),
  verifyOtp: (phone: string, code: string) =>
    request<{ success: boolean; token: string; user: { id: string; merchantId: string; name: string; phone: string; email: string | null; company: string; language: string } }>('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, code }) }),
  getMe: () =>
    request<{ id: string; merchantId: string; name: string; phone: string; email: string | null; company: string; language: string; iban: string | null }>('/api/merchant/profile'),
};

export const transactionsApi = {
  list: (params?: { status?: string; search?: string; page?: number; limit?: number; from?: string; to?: string }) => {
    if (USE_DEMO_DATA) return Promise.resolve(demoTransactionsList as any);
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    const qs = query.toString();
    return request<{ transactions: ApiTransaction[]; pagination: { page: number; limit: number; total: number; pages: number }; stats: { totalVolume: number; totalCount: number; successRate: string } }>(`/api/transactions${qs ? `?${qs}` : ''}`);
  },
  getById: (txId: string) => request<ApiTransaction>(`/api/transactions/${txId}`),
};

export const balanceApi = {
  get: () => {
    if (USE_DEMO_DATA) return Promise.resolve(demoBalance as any);
    return request<{ available: number; incoming: number; outgoing: number; iban: string; company: string; nextSettlement: { id: string; date: string; net: number; commission: number } | null }>('/api/balance');
  },
};

export const settlementsApi = {
  list: (params?: { status?: string; days?: number; page?: number }) => {
    if (USE_DEMO_DATA) return Promise.resolve(demoSettlements as any);
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.days) query.set('days', String(params.days));
    if (params?.page) query.set('page', String(params.page));
    const qs = query.toString();
    return request<{ settlements: ApiSettlement[]; pagination: { page: number; limit: number; total: number; pages: number } }>(`/api/settlements${qs ? `?${qs}` : ''}`);
  },
  getById: (id: string) => request<ApiSettlement>(`/api/settlements/${id}`),
};

export const disputesApi = {
  list: () => {
    if (USE_DEMO_DATA) return Promise.resolve(demoDisputes as any);
    return request<{ disputes: ApiDispute[] }>('/api/disputes');
  },
  respond: (disputeId: string, response: string) =>
    request<ApiDispute>(`/api/disputes/${disputeId}/respond`, { method: 'POST', body: JSON.stringify({ response }) }),
};

export const refundsApi = {
  list: (status?: string) => {
    if (USE_DEMO_DATA) return Promise.resolve(demoRefunds as any);
    const qs = status ? `?status=${status}` : '';
    return request<{ refunds: ApiRefund[] }>(`/api/refunds${qs}`);
  },
  create: (transactionId: string, amount: number, reason: string) =>
    request<ApiRefund>('/api/refunds', { method: 'POST', body: JSON.stringify({ transactionId, amount, reason }) }),
};

export const notificationsApi = {
  list: () => {
    if (USE_DEMO_DATA) return Promise.resolve(demoNotifications as any);
    return request<{ notifications: ApiNotification[]; unreadCount: number }>('/api/notifications');
  },
  markAllRead: () => request<{ success: boolean }>('/api/notifications/read-all', { method: 'PUT' }),
  markRead: (id: string) => request<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'PUT' }),
};

export const merchantApi = {
  getProfile: () => {
    if (USE_DEMO_DATA) return Promise.resolve(demoProfile as any);
    return request<MerchantProfile>('/api/merchant/profile');
  },
  updateProfile: (data: { name?: string; email?: string; company?: string; language?: string }) =>
    request<MerchantProfile>('/api/merchant/profile', { method: 'PUT', body: JSON.stringify(data) }),
  registerPushToken: (token: string, platform: 'ios' | 'android') =>
    request<{ success: boolean }>('/api/merchant/push-token', { method: 'POST', body: JSON.stringify({ token, platform }) }),
  deleteAccount: () =>
    request<{ success: boolean }>('/api/merchant/account', { method: 'DELETE' }),
};

export const dashboardApi = {
  getData: async () => {
    if (USE_DEMO_DATA) return demoDashboard as any;
    const [txData, balance, disputes, notifications] = await Promise.all([
      transactionsApi.list({ limit: 4 }),
      balanceApi.get(),
      disputesApi.list(),
      notificationsApi.list(),
    ]);
    const openDisputes = disputes.disputes.filter((d: ApiDispute) => d.status === 'open').length;
    return {
      kpis: { totalVolume: txData.stats.totalVolume, successRate: txData.stats.successRate, todayTx: txData.stats.totalCount, openDisputes },
      recentTransactions: txData.transactions,
      balance,
      unreadNotifications: notifications.unreadCount,
    };
  },
};

export const analyticsApi = {
  getData: (range: '7d' | '30d' | '90d' = '30d') => {
    if (USE_DEMO_DATA) return Promise.resolve(demoAnalytics(range) as any);
    return request<any>(`/api/analytics?range=${range}`);
  },
};

export const paymentLinksApi = {
  list: () => {
    if (USE_DEMO_DATA) return Promise.resolve(demoPaymentLinks as any);
    return request<any>('/api/payment-links');
  },
  getById: (id: string) => request<any>(`/api/payment-links/${id}`),
  create: (data: any) => request<any>('/api/payment-links', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/api/payment-links/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/api/payment-links/${id}`, { method: 'DELETE' }),
  toggle: (id: string) => request<any>(`/api/payment-links/${id}/toggle`, { method: 'PATCH' }),
};

export const subscriptionsApi = {
  list: () => {
    if (USE_DEMO_DATA) return Promise.resolve(demoSubscriptions as any);
    return request<any>('/api/subscriptions');
  },
  create: (data: any) => request<any>('/api/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/api/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cancel: (id: string) => request<any>(`/api/subscriptions/${id}/cancel`, { method: 'POST' }),
  triggerRetry: (id: string) => request<any>(`/api/subscriptions/${id}/retry`, { method: 'POST' }),
  getRetryStatus: (id: string) => request<any>(`/api/subscriptions/${id}/retry-status`),
  sendDunning: (id: string, step: number, channel: string = 'PUSH') =>
    request<any>(`/api/subscriptions/${id}/dunning`, { method: 'POST', body: JSON.stringify({ step, channel }) }),
  getDunningHistory: (id: string) => request<any>(`/api/subscriptions/${id}/dunning-history`),
  getChurnScore: (id: string) => request<any>(`/api/subscriptions/${id}/churn-score`),
  getChurnOverview: () => request<any>('/api/subscriptions/churn/overview'),
};

export const exportApi = {
  transactions: (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return request<any>(`/api/transactions/export${q ? `?${q}` : ''}`);
  },
};

export const revenueGoalsApi = {
  list: () => request<any>(`/api/revenue-goals`),
  create: (data: any) => request<any>(`/api/revenue-goals`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/api/revenue-goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/api/revenue-goals/${id}`, { method: 'DELETE' }),
  syncProgress: (id: string) => request<any>(`/api/revenue-goals/${id}/sync`, { method: 'POST' }),
  syncAll: () => request<any>(`/api/revenue-goals/sync-all`, { method: 'POST' }),
  getForecast: (id: string) => request<any>(`/api/revenue-goals/${id}/forecast`),
};

export const expensesApi = {
  list: (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return request<any>(`/api/expenses${q ? `?${q}` : ''}`);
  },
  create: (data: any) => request<any>('/api/expenses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/api/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/api/expenses/${id}`, { method: 'DELETE' }),
  summary: () => request<any>('/api/expenses/summary'),
  getAnalytics: () => request<any>('/api/expenses/analytics'),
  autoImport: (days: number = 30) => request<any>('/api/expenses/auto-import', { method: 'POST', body: JSON.stringify({ days }) }),
  refreshAnalytics: () => request<any>('/api/expenses/refresh-analytics', { method: 'POST' }),
};

export const invoicesApi = {
  list: () => request<any>('/api/invoices'),
  getById: (id: string) => request<any>(`/api/invoices/${id}`),
  create: (data: any) => request<any>('/api/invoices', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  send: (id: string) => request<any>(`/api/invoices/${id}/send`, { method: 'POST' }),
  markPaid: (id: string) => request<any>(`/api/invoices/${id}/mark-paid`, { method: 'POST' }),
  delete: (id: string) => request<any>(`/api/invoices/${id}`, { method: 'DELETE' }),
  generateEInvoice: (id: string, taxRate: number) => request<any>(`/api/invoices/${id}/einvoice/generate`, { method: 'POST', body: JSON.stringify({ taxRate }) }),
  getEInvoice: (id: string) => request<any>(`/api/invoices/${id}/einvoice`),
  sendReminder: (id: string, triggerDay: number, channel: string = 'PUSH') => request<any>(`/api/invoices/${id}/reminders/send`, { method: 'POST', body: JSON.stringify({ triggerDay, channel }) }),
  getReminders: (id: string) => request<any>(`/api/invoices/${id}/reminders`),
  getOverdueSummary: () => request<any>('/api/invoices/overdue-summary'),
};

export const transfersApi = {
  list: () => request<any>('/api/transfers'),
  create: (data: any) => request<any>('/api/transfers', { method: 'POST', body: JSON.stringify(data) }),
};

export const apiKeysApi = {
  list: () => request<any>('/api/api-keys'),
  create: (name: string) => request<any>('/api/api-keys', { method: 'POST', body: JSON.stringify({ name }) }),
  revoke: (id: string) => request<any>(`/api/api-keys/${id}`, { method: 'DELETE' }),
};

export const webhooksApi = {
  list: () => request<any>('/api/webhooks'),
  create: (data: any) => request<any>('/api/webhooks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/api/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/api/webhooks/${id}`, { method: 'DELETE' }),
  toggle: (id: string) => request<any>(`/api/webhooks/${id}/toggle`, { method: 'PATCH' }),
};

export const codApi = {
  list: (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return request<any>(`/api/cod${q ? `?${q}` : ''}`);
  },
  create: (data: any) => request<any>('/api/cod', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string, data?: any) =>
    request<any>(`/api/cod/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, ...data }) }),
};

export const fxApi = {
  getRates: () => request<any>('/api/fx/rates'),
  convert: (from: string, to: string, amount: number) =>
    request<any>('/api/fx/convert', { method: 'POST', body: JSON.stringify({ from, to, amount }) }),
};

export const teamApi = {
  list: () => request<any>('/api/team'),
  invite: (data: any) => request<any>('/api/team/invite', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (id: string, role: string) => request<any>(`/api/team/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  remove: (id: string) => request<any>(`/api/team/${id}`, { method: 'DELETE' }),
};

export const hostedCheckoutApi = {
  list: () => request<any>('/api/hosted-checkout'),
  getById: (id: string) => request<any>(`/api/hosted-checkout/${id}`),
  create: (data: any) => request<any>('/api/hosted-checkout', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/api/hosted-checkout/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggle: (id: string) => request<any>(`/api/hosted-checkout/${id}/toggle`, { method: 'PATCH' }),
};

export const paymentMethodsApi = {
  list: () => request<any>('/api/payment-methods'),
  update: (method: string, data: any) => request<any>(`/api/payment-methods/${method}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export const retryApi = {
  list: () => request<any>('/api/retry'),
  retry: (transactionId: string) => request<any>(`/api/retry/${transactionId}`, { method: 'POST' }),
};

export const reconciliationApi = {
  list: () => request<any>('/api/reconciliation'),
  generate: (data: any) => request<any>('/api/reconciliation/generate', { method: 'POST', body: JSON.stringify(data) }),
};

const DEMO_CUSTOMERS = {
  customers: [
    { id: 'c1', customerId: 'c1', name: 'محمد العمري',     phone: '0501234567', email: 'mohammed@example.com', city: 'الرياض', country: 'SA', tags: ['VIP'],   totalSpent: 12500, totalOrders: 18, avgOrderValue: 694,  refundCount: 0, lastSeenAt: new Date(Date.now() - 1*86400000).toISOString(),  firstSeenAt: new Date(Date.now() - 180*86400000).toISOString(), rfm: { R: 5, F: 5, M: 5, score: 5,   segment: 'VIP',     daysSinceLast: 1  } },
    { id: 'c2', customerId: 'c2', name: 'سارة الأحمدي',   phone: '0559876543', email: 'sara@example.com',     city: 'جدة',    country: 'SA', tags: ['VIP'],   totalSpent: 6800,  totalOrders: 11, avgOrderValue: 618,  refundCount: 1, lastSeenAt: new Date(Date.now() - 5*86400000).toISOString(),  firstSeenAt: new Date(Date.now() - 120*86400000).toISOString(), rfm: { R: 5, F: 4, M: 4, score: 4.3, segment: 'loyal',   daysSinceLast: 5  } },
    { id: 'c3', customerId: 'c3', name: 'عمر الشمري',     phone: '0512345678', email: null,                   city: 'الدمام', country: 'SA', tags: [],        totalSpent: 3200,  totalOrders: 6,  avgOrderValue: 533,  refundCount: 2, lastSeenAt: new Date(Date.now() - 8*86400000).toISOString(),  firstSeenAt: new Date(Date.now() - 90*86400000).toISOString(),  rfm: { R: 4, F: 4, M: 3, score: 3.7, segment: 'loyal',   daysSinceLast: 8  } },
    { id: 'c4', customerId: 'c4', name: 'فاطمة الزهراني', phone: '0569876543', email: 'fatima@example.com',   city: 'مكة',    country: 'SA', tags: ['جديد'],  totalSpent: 450,   totalOrders: 1,  avgOrderValue: 450,  refundCount: 0, lastSeenAt: new Date(Date.now() - 3*86400000).toISOString(),  firstSeenAt: new Date(Date.now() - 3*86400000).toISOString(),   rfm: { R: 5, F: 1, M: 2, score: 2.7, segment: 'new',     daysSinceLast: 3  } },
    { id: 'c5', customerId: 'c5', name: 'خالد الرشيدي',   phone: '0534567890', email: null,                   city: 'الرياض', country: 'SA', tags: [],        totalSpent: 890,   totalOrders: 3,  avgOrderValue: 297,  refundCount: 0, lastSeenAt: new Date(Date.now() - 45*86400000).toISOString(), firstSeenAt: new Date(Date.now() - 200*86400000).toISOString(), rfm: { R: 2, F: 3, M: 2, score: 2.3, segment: 'at_risk', daysSinceLast: 45 } },
    { id: 'c6', customerId: 'c6', name: 'نورة المالكي',   phone: '0541234567', email: 'noura@example.com',    city: 'جدة',    country: 'SA', tags: [],        totalSpent: 220,   totalOrders: 2,  avgOrderValue: 110,  refundCount: 1, lastSeenAt: new Date(Date.now() - 75*86400000).toISOString(), firstSeenAt: new Date(Date.now() - 250*86400000).toISOString(), rfm: { R: 1, F: 2, M: 1, score: 1.3, segment: 'lost',    daysSinceLast: 75 } },
    { id: 'c7', customerId: 'c7', name: 'أحمد القحطاني',  phone: '0578901234', email: 'ahmed@example.com',    city: 'أبها',   country: 'SA', tags: ['VIP'],   totalSpent: 9400,  totalOrders: 14, avgOrderValue: 671,  refundCount: 0, lastSeenAt: new Date(Date.now() - 4*86400000).toISOString(),  firstSeenAt: new Date(Date.now() - 365*86400000).toISOString(), rfm: { R: 5, F: 5, M: 5, score: 5,   segment: 'VIP',     daysSinceLast: 4  } },
    { id: 'c8', customerId: 'c8', name: 'ريم العتيبي',    phone: '0503456789', email: null,                   city: 'الرياض', country: 'SA', tags: [],        totalSpent: 1750,  totalOrders: 4,  avgOrderValue: 438,  refundCount: 0, lastSeenAt: new Date(Date.now() - 12*86400000).toISOString(), firstSeenAt: new Date(Date.now() - 60*86400000).toISOString(),  rfm: { R: 4, F: 3, M: 3, score: 3.3, segment: 'active',  daysSinceLast: 12 } },
  ],
  pagination: { page: 1, limit: 20, total: 8, pages: 1 },
  stats: {
    totalCustomers: 8, totalRevenue: 35210, totalOrders: 59, avgLTV: 4401.25, churnRate: 25,
    segmentCounts: { VIP: 2, loyal: 2, new: 1, at_risk: 1, lost: 1, active: 1 },
    topCustomers: [
      { id: 'c1', name: 'محمد العمري',   totalSpent: 12500, segment: 'VIP'    },
      { id: 'c7', name: 'أحمد القحطاني', totalSpent: 9400,  segment: 'VIP'    },
      { id: 'c2', name: 'سارة الأحمدي',  totalSpent: 6800,  segment: 'loyal'  },
      { id: 'c3', name: 'عمر الشمري',    totalSpent: 3200,  segment: 'loyal'  },
      { id: 'c8', name: 'ريم العتيبي',   totalSpent: 1750,  segment: 'active' },
    ],
    cohort: [
      { month: '2024-10', count: 1 }, { month: '2024-11', count: 2 },
      { month: '2024-12', count: 1 }, { month: '2025-01', count: 2 },
      { month: '2025-02', count: 1 }, { month: '2025-03', count: 1 },
    ],
  },
};

const DEMO_CUSTOMER_DETAIL = (id: string) => {
  const base = DEMO_CUSTOMERS.customers.find(c => c.id === id) || DEMO_CUSTOMERS.customers[0];
  return {
    customer: {
      ...base,
      notes: 'عميل منتظم ومحترم — دائماً يدفع في الوقت',
      recommendations: [
        { type: 'loyalty', priority: 'high',   titleAr: 'مرشح لبرنامج الولاء',    descAr: 'نشاط منتظم — أضفه لبرنامج النقاط',         action: 'loyalty' },
        { type: 'upsell',  priority: 'medium', titleAr: 'فرصة upsell',             descAr: 'ينفق بانتظام — عرّفه على خدماتك المتميزة', action: 'upsell'  },
      ],
      recentTransactions: [
        { id: 'tx1', amount: 850,  currency: 'SAR', status: 'success', createdAt: new Date(Date.now() - 2*86400000).toISOString(),  method: 'mada' },
        { id: 'tx2', amount: 1200, currency: 'SAR', status: 'success', createdAt: new Date(Date.now() - 15*86400000).toISOString(), method: 'visa' },
        { id: 'tx3', amount: 340,  currency: 'SAR', status: 'success', createdAt: new Date(Date.now() - 30*86400000).toISOString(), method: 'mada' },
      ],
      spendTrend: [
        { month: '2024-10', amount: 1200 }, { month: '2024-11', amount: 2100 },
        { month: '2024-12', amount: 1800 }, { month: '2025-01', amount: 3200 },
        { month: '2025-02', amount: 1900 }, { month: '2025-03', amount: 2300 },
      ],
    },
  };
};

export const customersApi = {
  list: (params?: { segment?: string; search?: string; sort?: string; page?: number; limit?: number }) => {
    if (USE_DEMO_DATA) return Promise.resolve(DEMO_CUSTOMERS as any);
    const q = new URLSearchParams();
    if (params?.segment) q.set('segment', params.segment);
    if (params?.search)  q.set('search',  params.search);
    if (params?.sort)    q.set('sort',    params.sort);
    if (params?.page)    q.set('page',    String(params.page));
    if (params?.limit)   q.set('limit',   String(params.limit));
    const qs = q.toString();
    return request<typeof DEMO_CUSTOMERS>(`/api/customers${qs ? `?${qs}` : ''}`);
  },
  getById: (customerId: string) => {
    if (USE_DEMO_DATA) return Promise.resolve(DEMO_CUSTOMER_DETAIL(customerId) as any);
    return request<ReturnType<typeof DEMO_CUSTOMER_DETAIL>>(`/api/customers/${customerId}`);
  },
  summary: () => {
    if (USE_DEMO_DATA) return Promise.resolve({ totalCustomers: 8, newThisMonth: 1, totalRevenue: 35210, avgLTV: 4401.25, churnRate: 25, segments: { VIP: 2, loyal: 2, new: 1, at_risk: 1, lost: 1, active: 1 } } as any);
    return request<any>('/api/customers/summary');
  },
  create: (data: { name: string; phone?: string; email?: string; city?: string; country?: string; tags?: string[]; notes?: string }) =>
    request<{ customer: any }>('/api/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (customerId: string, data: any) =>
    request<{ customer: any }>(`/api/customers/${customerId}`, { method: 'PUT', body: JSON.stringify(data) }),
};

export const featureFlagsApi = {
  list: () =>
    request<{ success: boolean; data: { flags: Array<{ id: string; key: string; label: string; description: string; category: string; enabled: boolean; requiresExternalSetup: boolean }>; grouped: Record<string, any[]> } }>('/api/feature-flags'),
  map: () =>
    request<{ success: boolean; data: Record<string, boolean> }>('/api/feature-flags/map'),
  update: (key: string, enabled: boolean) =>
    request<{ success: boolean; data: any }>(`/api/feature-flags/${key}`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
  bulkUpdate: (updates: { key: string; enabled: boolean }[]) =>
    request<{ success: boolean; data: any[] }>('/api/feature-flags/bulk', { method: 'PATCH', body: JSON.stringify({ updates }) }),
};

export const walletsApi = {
  list: () => request<any>('/api/wallets'),
  get: (currency: string) => request<any>(`/api/wallets/${currency}`),
  convert: (fromCurrency: string, toCurrency: string, amount: number) =>
    request<any>('/api/wallets/convert', { method: 'POST', body: JSON.stringify({ fromCurrency, toCurrency, amount }) }),
  toggle: (currency: string) => request<any>(`/api/wallets/${currency}/toggle`, { method: 'PATCH' }),
  rates: () => request<any>('/api/wallets/rates'),
  createSubWallet: (currency: string, data: any) =>
    request<any>(`/api/wallets/${currency}/sub-wallets`, { method: 'POST', body: JSON.stringify(data) }),
  allocateToSubWallet: (currency: string, subWalletId: string, amount: number) =>
    request<any>(`/api/wallets/${currency}/sub-wallets/${subWalletId}/allocate`, { method: 'POST', body: JSON.stringify({ amount }) }),
  deleteSubWallet: (currency: string, subWalletId: string) =>
    request<any>(`/api/wallets/${currency}/sub-wallets/${subWalletId}`, { method: 'DELETE' }),
  getCashflowAlerts: () => request<any>('/api/wallets/cashflow-alerts'),
  setCashflowAlert: (currency: string, threshold: number, alertType: string = 'LOW_BALANCE') =>
    request<any>('/api/wallets/cashflow-alerts', { method: 'POST', body: JSON.stringify({ currency, threshold, alertType }) }),
};

export const gatewayRoutingApi = {
  listGateways: () => request<any>('/api/gateway-routing/gateways'),
  createGateway: (data: any) => request<any>('/api/gateway-routing/gateways', { method: 'POST', body: JSON.stringify(data) }),
  updateGateway: (id: string, data: any) => request<any>(`/api/gateway-routing/gateways/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteGateway: (id: string) => request<any>(`/api/gateway-routing/gateways/${id}`, { method: 'DELETE' }),
  getConfig: () => request<any>('/api/gateway-routing/config'),
  updateConfig: (data: any) => request<any>('/api/gateway-routing/config', { method: 'PATCH', body: JSON.stringify(data) }),
  listRules: () => request<any>('/api/gateway-routing/rules'),
  createRule: (data: any) => request<any>('/api/gateway-routing/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (id: string, data: any) => request<any>(`/api/gateway-routing/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRule: (id: string) => request<any>(`/api/gateway-routing/rules/${id}`, { method: 'DELETE' }),
  routeTransaction: (data: any) => request<any>('/api/gateway-routing/route', { method: 'POST', body: JSON.stringify(data) }),
  recordEvent: (data: any) => request<any>('/api/gateway-routing/events', { method: 'POST', body: JSON.stringify(data) }),
  getAnalytics: (days?: number) => request<any>(`/api/gateway-routing/analytics${days ? `?days=${days}` : ''}`),
};

export const crossRetryApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page)   q.set('page',   String(params.page));
    if (params?.limit)  q.set('limit',  String(params.limit));
    const qs = q.toString();
    return request<any>(`/api/cross-retry${qs ? `?${qs}` : ''}`);
  },
  get: (retryId: string) => request<any>(`/api/cross-retry/${retryId}`),
  initiate: (data: any) => request<any>('/api/cross-retry/initiate', { method: 'POST', body: JSON.stringify(data) }),
  recordAttempt: (retryId: string, data: any) => request<any>(`/api/cross-retry/${retryId}/attempt`, { method: 'POST', body: JSON.stringify(data) }),
  cancel: (retryId: string) => request<any>(`/api/cross-retry/${retryId}/cancel`, { method: 'PATCH' }),
  getStats: (days?: number) => request<any>(`/api/cross-retry/stats${days ? `?days=${days}` : ''}`),
};

export const binApi = {
  lookup: (bin: string) => request<any>('/api/bin/lookup', { method: 'POST', body: JSON.stringify({ bin }) }),
  getHistory: (limit?: number) => request<any>(`/api/bin/history${limit ? `?limit=${limit}` : ''}`),
  getStats: (days?: number) => request<any>(`/api/bin/stats${days ? `?days=${days}` : ''}`),
  addRecord: (data: any) => request<any>('/api/bin/records', { method: 'POST', body: JSON.stringify(data) }),
};

export const dynamicCheckoutApi = {
  list: () => request<any>('/api/dynamic-checkout'),
  create: (data: any) => request<any>('/api/dynamic-checkout', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: string) => request<any>(`/api/dynamic-checkout/${id}`),
  update: (id: string, data: any) => request<any>(`/api/dynamic-checkout/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/api/dynamic-checkout/${id}`, { method: 'DELETE' }),
  createRule: (checkoutId: string, data: any) => request<any>(`/api/dynamic-checkout/${checkoutId}/rules`, { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (checkoutId: string, ruleId: string, data: any) => request<any>(`/api/dynamic-checkout/${checkoutId}/rules/${ruleId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRule: (checkoutId: string, ruleId: string) => request<any>(`/api/dynamic-checkout/${checkoutId}/rules/${ruleId}`, { method: 'DELETE' }),
  resolve: (checkoutId: string, data: any) => request<any>(`/api/dynamic-checkout/${checkoutId}/resolve`, { method: 'POST', body: JSON.stringify(data) }),
  getAnalytics: (checkoutId: string, days?: number) => request<any>(`/api/dynamic-checkout/${checkoutId}/analytics${days ? `?days=${days}` : ''}`),
};

export const fraudApi = {
  analyze: (data: any) => request<any>('/api/fraud/analyze', { method: 'POST', body: JSON.stringify(data) }),
  listEvents: (params?: { riskLevel?: string; reviewed?: boolean; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.riskLevel !== undefined) q.set('riskLevel', params.riskLevel);
    if (params?.reviewed  !== undefined) q.set('reviewed',  String(params.reviewed));
    if (params?.page)  q.set('page',  String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return request<any>(`/api/fraud/events${qs ? `?${qs}` : ''}`);
  },
  reviewEvent: (id: string, reviewNote?: string) => request<any>(`/api/fraud/events/${id}/review`, { method: 'PATCH', body: JSON.stringify({ reviewNote }) }),
  listRules: () => request<any>('/api/fraud/rules'),
  createRule: (data: any) => request<any>('/api/fraud/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (id: string, data: any) => request<any>(`/api/fraud/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRule: (id: string) => request<any>(`/api/fraud/rules/${id}`, { method: 'DELETE' }),
  getStats: (days?: number) => request<any>(`/api/fraud/stats${days ? `?days=${days}` : ''}`),
};

export const analyticsIntelligenceApi = {
  getDashboard: (range?: '7d' | '30d' | '90d') => request<any>(`/api/analytics/intelligence/dashboard${range ? `?range=${range}` : ''}`),
  getFunnel: (range?: '7d' | '30d' | '90d') => request<any>(`/api/analytics/intelligence/funnel${range ? `?range=${range}` : ''}`),
  getSuccessRate: (range?: '7d' | '30d' | '90d') => request<any>(`/api/analytics/intelligence/success-rate${range ? `?range=${range}` : ''}`),
  getCustomerAnalytics: (range?: '30d' | '90d' | '365d') => request<any>(`/api/analytics/intelligence/customers${range ? `?range=${range}` : ''}`),
  getInsights: () => request<any>('/api/analytics/intelligence/insights'),
  getForecast: (months?: number) => request<any>(`/api/analytics/intelligence/forecast${months ? `?months=${months}` : ''}`),
  getAlerts: () => request<any>('/api/analytics/intelligence/alerts'),
  createAlert: (data: any) => request<any>('/api/analytics/intelligence/alerts', { method: 'POST', body: JSON.stringify(data) }),
  updateAlert: (id: string, data: any) => request<any>(`/api/analytics/intelligence/alerts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAlert: (id: string) => request<any>(`/api/analytics/intelligence/alerts/${id}`, { method: 'DELETE' }),
  checkAlerts: () => request<any>('/api/analytics/intelligence/alerts/check', { method: 'POST' }),
};

export const growthApi = {
  getReminders: () => request<any>('/api/growth/reminders'),
  createReminder: (data: any) => request<any>('/api/growth/reminders', { method: 'POST', body: JSON.stringify(data) }),
  sendReminder: (id: string) => request<any>(`/api/growth/reminders/${id}/send`, { method: 'POST' }),
  deleteReminder: (id: string) => request<any>(`/api/growth/reminders/${id}`, { method: 'DELETE' }),
  getRecovery: () => request<any>('/api/growth/recovery'),
  retryRecovery: (txId: string) => request<any>(`/api/growth/recovery/retry/${txId}`, { method: 'POST' }),
  getCRMCustomers: (params?: any) => { const q = new URLSearchParams(params).toString(); return request<any>(`/api/growth/crm/customers${q ? `?${q}` : ''}`); },
  updateCRMCustomer: (id: string, data: any) => request<any>(`/api/growth/crm/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  exportCRM: () => request<any>('/api/growth/crm/export', { method: 'POST' }),
  getAffiliates: () => request<any>('/api/growth/affiliates'),
  createAffiliate: (data: any) => request<any>('/api/growth/affiliates', { method: 'POST', body: JSON.stringify(data) }),
  getAffiliateStats: (id: string) => request<any>(`/api/growth/affiliates/${id}/stats`),
  updateAffiliate: (id: string, data: any) => request<any>(`/api/growth/affiliates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAffiliate: (id: string) => request<any>(`/api/growth/affiliates/${id}`, { method: 'DELETE' }),
  getPermissions: () => request<any>('/api/growth/permissions'),
  checkPermission: (email: string, permission: string) => request<any>('/api/growth/permissions/check', { method: 'POST', body: JSON.stringify({ email, permission }) }),
  getMarketplace: () => request<any>('/api/growth/marketplace'),
  createVendor: (data: any) => request<any>('/api/growth/marketplace/vendor', { method: 'POST', body: JSON.stringify(data) }),
  calculateSplit: (data: any) => request<any>('/api/growth/split/calculate', { method: 'POST', body: JSON.stringify(data) }),
  getSplitRules: () => request<any>('/api/growth/split/rules'),
  createSplitRule: (data: any) => request<any>('/api/growth/split/rules', { method: 'POST', body: JSON.stringify(data) }),
};

export const tokenizationApi = {
  list: (params?: { customerId?: string }) => {
    const q = params?.customerId ? `?customerId=${params.customerId}` : '';
    return request<any>(`/api/tokenization${q}`);
  },
  create: (data: any) => request<any>('/api/tokenization', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: string) => request<any>(`/api/tokenization/${id}`),
  update: (id: string, data: any) => request<any>(`/api/tokenization/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/api/tokenization/${id}`, { method: 'DELETE' }),
  charge: (id: string, data: any) => request<any>(`/api/tokenization/${id}/charge`, { method: 'POST', body: JSON.stringify(data) }),
  stats: () => request<any>('/api/tokenization/stats'),
};

export const chargebackApi = {
  listAlerts: (params?: { status?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page)   q.set('page',   String(params.page));
    if (params?.limit)  q.set('limit',  String(params.limit));
    const qs = q.toString();
    return request<any>(`/api/chargeback/alerts${qs ? `?${qs}` : ''}`);
  },
  analyze: (data: any) => request<any>('/api/chargeback/analyze', { method: 'POST', body: JSON.stringify(data) }),
  resolveAlert: (id: string, data?: any) => request<any>(`/api/chargeback/alerts/${id}/resolve`, { method: 'PATCH', body: JSON.stringify(data || {}) }),
  listRules: () => request<any>('/api/chargeback/rules'),
  createRule: (data: any) => request<any>('/api/chargeback/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (id: string, data: any) => request<any>(`/api/chargeback/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRule: (id: string) => request<any>(`/api/chargeback/rules/${id}`, { method: 'DELETE' }),
  stats: (days?: number) => request<any>(`/api/chargeback/stats${days ? `?days=${days}` : ''}`),
};

export const approvalOptimizationApi = {
  getConfig: () => request<any>('/api/approval-optimization/config'),
  updateConfig: (data: any) => request<any>('/api/approval-optimization/config', { method: 'PATCH', body: JSON.stringify(data) }),
  analyze: (data: any) => request<any>('/api/approval-optimization/analyze', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id: string, data: any) => request<any>(`/api/approval-optimization/events/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  stats: (days?: number) => request<any>(`/api/approval-optimization/stats${days ? `?days=${days}` : ''}`),
  listSla: () => request<any>('/api/approval-optimization/sla'),
  upsertSla: (data: any) => request<any>('/api/approval-optimization/sla', { method: 'POST', body: JSON.stringify(data) }),
  checkSla: (gatewayId: string) => request<any>(`/api/approval-optimization/sla/${gatewayId}/check`, { method: 'POST' }),
};

export const commissionApi = {
  listRules: () => request<any>('/api/commission/rules'),
  createRule: (data: any) => request<any>('/api/commission/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (id: string, data: any) => request<any>(`/api/commission/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRule: (id: string) => request<any>(`/api/commission/rules/${id}`, { method: 'DELETE' }),
  calculate: (ruleId: string, amount: number, options?: any) =>
    request<any>('/api/commission/calculate', { method: 'POST', body: JSON.stringify({ ruleId, amount, ...options }) }),
  bulkCalculate: (ruleId: string, transactions: any[]) =>
    request<any>('/api/commission/bulk-calculate', { method: 'POST', body: JSON.stringify({ ruleId, transactions }) }),
  getHistory: (limit?: number) => request<any>(`/api/commission/history${limit ? `?limit=${limit}` : ''}`),
  getSummary: () => request<any>('/api/commission/summary'),
  listPartners: () => request<any>('/api/commission/partners'),
  createPartner: (data: any) => request<any>('/api/commission/partners', { method: 'POST', body: JSON.stringify(data) }),
};

export const taxApi = {
  listRules: () => request<any>('/api/tax/rules'),
  upsertRule: (data: any) => request<any>('/api/tax/rules', { method: 'POST', body: JSON.stringify(data) }),
  calculate: (amount: number, country: string, options?: any) =>
    request<any>('/api/tax/calculate', { method: 'POST', body: JSON.stringify({ amount, country, ...options }) }),
  bulkCalculate: (transactions: any[], country: string) =>
    request<any>('/api/tax/bulk-calculate', { method: 'POST', body: JSON.stringify({ transactions, country }) }),
  getPeriodReport: (year: number, month?: number) =>
    request<any>(`/api/tax/period-report?year=${year}${month ? `&month=${month}` : ''}`),
  getCountryRates: () => request<any>('/api/tax/country-rates'),
};

export const recoveryApi = {
  listCampaigns: () => request<any>('/api/recovery/campaigns'),
  createCampaign: (data: any) => request<any>('/api/recovery/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  updateCampaign: (id: string, data: any) => request<any>(`/api/recovery/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCampaign: (id: string) => request<any>(`/api/recovery/campaigns/${id}`, { method: 'DELETE' }),
  sendCampaign: (id: string) => request<any>(`/api/recovery/campaigns/${id}/send`, { method: 'POST' }),
  getAttempts: (campaignId: string, limit?: number) =>
    request<any>(`/api/recovery/campaigns/${campaignId}/attempts${limit ? `?limit=${limit}` : ''}`),
  markRecovered: (attemptId: string, amount: number) =>
    request<any>(`/api/recovery/attempts/${attemptId}/recovered`, { method: 'PATCH', body: JSON.stringify({ amount }) }),
  getStats: () => request<any>('/api/recovery/stats'),
};

export const financialReportsApi = {
  list: () => request<any>('/api/financial-reports'),
  generate: (data: any) => request<any>('/api/financial-reports/generate', { method: 'POST', body: JSON.stringify(data) }),
  getQuickPNL: (range?: string) => request<any>(`/api/financial-reports/quick-pnl${range ? `?range=${range}` : ''}`),
  getById: (id: string) => request<any>(`/api/financial-reports/${id}`),
  delete: (id: string) => request<any>(`/api/financial-reports/${id}`, { method: 'DELETE' }),
};

export const payoutSchedulingApi = {
  list: () => request<any>('/api/payout-scheduling'),
  create: (data: any) => request<any>('/api/payout-scheduling', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/api/payout-scheduling/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/api/payout-scheduling/${id}`, { method: 'DELETE' }),
  execute: (id: string) => request<any>(`/api/payout-scheduling/${id}/execute`, { method: 'POST' }),
  getHistory: (limit?: number) => request<any>(`/api/payout-scheduling/history${limit ? `?limit=${limit}` : ''}`),
  getCashflowInsights: () => request<any>('/api/payout-scheduling/cashflow-insights'),
};

// ─── Layer 4 Phase 1 ─────────────────────────────────────────

export const realtimeDashboardApi = {
  getLive: () => request<any>('/api/realtime-dashboard/live'),
  getSummary: () => request<any>('/api/realtime-dashboard/summary'),
  getDrillDown: (dimension: string, period?: string) => {
    const q = new URLSearchParams({ dimension });
    if (period) q.set('period', period);
    return request<any>(`/api/realtime-dashboard/drill-down?${q.toString()}`);
  },
  recordMetric: (metric: string, value: number, currency?: string, metadata?: any) =>
    request<any>('/api/realtime-dashboard/record', { method: 'POST', body: JSON.stringify({ metric, value, currency, metadata }) }),
};

export const conversionFunnelApi = {
  getOverview: (days?: number) => request<any>(`/api/conversion-funnel/overview${days ? `?days=${days}` : ''}`),
  getByChannel: (days?: number) => request<any>(`/api/conversion-funnel/by-channel${days ? `?days=${days}` : ''}`),
  getByCountry: (days?: number) => request<any>(`/api/conversion-funnel/by-country${days ? `?days=${days}` : ''}`),
  getByDevice: (days?: number) => request<any>(`/api/conversion-funnel/by-device${days ? `?days=${days}` : ''}`),
  getDropAnalysis: (days?: number) => request<any>(`/api/conversion-funnel/drop-analysis${days ? `?days=${days}` : ''}`),
  trackEvent: (data: { sessionId: string; stage: string; channel?: string; country?: string; device?: string; currency?: string; amount?: number }) =>
    request<any>('/api/conversion-funnel/event', { method: 'POST', body: JSON.stringify(data) }),
};

export const successRateApi = {
  getOverview: (days?: number) => request<any>(`/api/success-rate/overview${days ? `?days=${days}` : ''}`),
  getByBank: (days?: number) => request<any>(`/api/success-rate/by-bank${days ? `?days=${days}` : ''}`),
  getByCountry: (days?: number) => request<any>(`/api/success-rate/by-country${days ? `?days=${days}` : ''}`),
  getByMethod: (days?: number) => request<any>(`/api/success-rate/by-method${days ? `?days=${days}` : ''}`),
  getFailureReasons: (days?: number) => request<any>(`/api/success-rate/failure-reasons${days ? `?days=${days}` : ''}`),
};

export const revenueBreakdownApi = {
  getOverview: (days?: number) => request<any>(`/api/revenue-breakdown/overview${days ? `?days=${days}` : ''}`),
  getByMethod: (days?: number) => request<any>(`/api/revenue-breakdown/by-method${days ? `?days=${days}` : ''}`),
  getByCountry: (days?: number) => request<any>(`/api/revenue-breakdown/by-country${days ? `?days=${days}` : ''}`),
  getByCustomer: (days?: number, limit?: number) => {
    const q = new URLSearchParams();
    if (days)  q.set('days',  String(days));
    if (limit) q.set('limit', String(limit));
    const qs = q.toString();
    return request<any>(`/api/revenue-breakdown/by-customer${qs ? `?${qs}` : ''}`);
  },
  getByChannel: (days?: number) => request<any>(`/api/revenue-breakdown/by-channel${days ? `?days=${days}` : ''}`),
  getTimeline: (days?: number, granularity?: string) => {
    const q = new URLSearchParams();
    if (days)        q.set('days',        String(days));
    if (granularity) q.set('granularity', granularity);
    const qs = q.toString();
    return request<any>(`/api/revenue-breakdown/timeline${qs ? `?${qs}` : ''}`);
  },
};

export const customerCLVApi = {
  getOverview: () => request<any>('/api/customer-clv/overview'),
  getSegments: () => request<any>('/api/customer-clv/segments'),
  getCohorts: (months?: number) => request<any>(`/api/customer-clv/cohorts${months ? `?months=${months}` : ''}`),
  getTop: (limit?: number, sortBy?: string) => {
    const q = new URLSearchParams();
    if (limit)  q.set('limit',  String(limit));
    if (sortBy) q.set('sortBy', sortBy);
    const qs = q.toString();
    return request<any>(`/api/customer-clv/top${qs ? `?${qs}` : ''}`);
  },
  predict: (customerId: string) => request<any>(`/api/customer-clv/predict/${customerId}`),
};

// ─── Layer 4 Phase 2 ─────────────────────────────────────────

export const cohortAnalysisApi = {
  getRetention: (months?: number) => request<any>(`/api/cohort-analysis/retention${months ? `?months=${months}` : ''}`),
  getRevenue: (months?: number) => request<any>(`/api/cohort-analysis/revenue${months ? `?months=${months}` : ''}`),
  getChurn: () => request<any>('/api/cohort-analysis/churn'),
};

export const smartInsightsApi = {
  get: (refresh?: boolean) => request<any>(`/api/smart-insights${refresh ? '?refresh=true' : ''}`),
  markRead: (id: string) => request<any>(`/api/smart-insights/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request<any>('/api/smart-insights/read-all', { method: 'PATCH' }),
};

export const predictiveAnalyticsApi = {
  getRevenueForecast: (months?: number) => request<any>(`/api/predictive-analytics/revenue-forecast${months ? `?months=${months}` : ''}`),
  getCustomerForecast: () => request<any>('/api/predictive-analytics/customer-forecast'),
  getTransactionForecast: () => request<any>('/api/predictive-analytics/transaction-forecast'),
  getScenarios: () => request<any>('/api/predictive-analytics/scenarios'),
};

export const alertsEngineApi = {
  listRules: () => request<any>('/api/alerts-engine/rules'),
  createRule: (data: { name: string; metric: string; operator: string; threshold: number; windowMinutes?: number; channel?: string }) =>
    request<any>('/api/alerts-engine/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (id: string, data: any) => request<any>(`/api/alerts-engine/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRule: (id: string) => request<any>(`/api/alerts-engine/rules/${id}`, { method: 'DELETE' }),
  check: () => request<any>('/api/alerts-engine/check', { method: 'POST' }),
  listEvents: (params?: { unreadOnly?: boolean; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.unreadOnly) q.set('unreadOnly', 'true');
    if (params?.limit)      q.set('limit', String(params.limit));
    const qs = q.toString();
    return request<any>(`/api/alerts-engine/events${qs ? `?${qs}` : ''}`);
  },
  markEventRead: (id: string) => request<any>(`/api/alerts-engine/events/${id}/read`, { method: 'PATCH' }),
  markAllEventsRead: () => request<any>('/api/alerts-engine/events/read-all', { method: 'PATCH' }),
};

export const abTestingApi = {
  list: () => request<any>('/api/ab-testing'),
  create: (data: { name: string; description?: string; type?: string; trafficSplit?: number; variants?: any[]; startDate?: string; endDate?: string }) =>
    request<any>('/api/ab-testing', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: string) => request<any>(`/api/ab-testing/${id}`),
  updateStatus: (id: string, status: string, winnerVariant?: string) =>
    request<any>(`/api/ab-testing/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, winnerVariant }) }),
  delete: (id: string) => request<any>(`/api/ab-testing/${id}`, { method: 'DELETE' }),
  trackEvent: (data: { testId: string; variantId: string; sessionId?: string; event: string; value?: number }) =>
    request<any>('/api/ab-testing/event', { method: 'POST', body: JSON.stringify(data) }),
  getResults: (id: string) => request<any>(`/api/ab-testing/${id}/results`),
};

// ─── Layer 5 ─────────────────────────────────────────────────

export const onboardingApi = {
  getStatus: () => request<any>('/api/onboarding'),
  updateStep: (data: { step: number; data: any }) =>
    request<any>('/api/onboarding/step', { method: 'POST', body: JSON.stringify(data) }),
  complete: () =>
    request<any>('/api/onboarding/complete', { method: 'POST' }),
  autoFill: () =>
    request<any>('/api/onboarding/auto-fill', { method: 'POST' }),
};

export const setupApi = {
  getProgress: () => request<any>('/api/setup-progress'),
  completeTask: (taskKey: string) =>
    request<any>('/api/setup-progress/task', { method: 'POST', body: JSON.stringify({ taskKey }) }),
  updateWizardStep: (step: number) =>
    request<any>('/api/setup-progress/wizard-step', { method: 'POST', body: JSON.stringify({ step }) }),
  dismiss: () =>
    request<any>('/api/setup-progress/dismiss', { method: 'POST' }),
  getUiPrefs: () =>
    request<any>('/api/setup-progress/ui-prefs'),
  updateUiPrefs: (data: { haptics_enabled?: boolean; gesture_nav?: boolean; offline_cache?: boolean; compact_mode?: boolean; theme?: string }) =>
    request<any>('/api/setup-progress/ui-prefs', { method: 'PATCH', body: JSON.stringify(data) }),
  logPerf: (screenKey: string, loadTimeMs: number, cached: boolean) =>
    request<any>('/api/setup-progress/perf-log', { method: 'POST', body: JSON.stringify({ screen_key: screenKey, load_time_ms: loadTimeMs, cached }) }),
  getPerfStats: () =>
    request<any>('/api/setup-progress/perf-stats'),
  logEmptyAction: (screenKey: string, actionTaken: string) =>
    request<any>('/api/setup-progress/empty-action', { method: 'POST', body: JSON.stringify({ screen_key: screenKey, action_taken: actionTaken }) }),
};


// ─── Layer 5 Batch 2 ─────────────────────────────────────────

export const uxApi = {
  getLang: () => request<any>('/api/ux-layer/lang'),
  updateLang: (data: { language?: string; rtl?: boolean; date_format?: string; currency_format?: string }) =>
    request<any>('/api/ux-layer/lang', { method: 'PATCH', body: JSON.stringify(data) }),
  logInteraction: (eventType: string, screenKey?: string, metadata?: any) =>
    request<any>('/api/ux-layer/interaction', { method: 'POST', body: JSON.stringify({ event_type: eventType, screen_key: screenKey, metadata }) }),
  getInteractionStats: () => request<any>('/api/ux-layer/interaction/stats'),
  logHelpSearch: (query: string, resultsCount: number, clickedArticle?: string) =>
    request<any>('/api/ux-layer/help/search', { method: 'POST', body: JSON.stringify({ query, results_count: resultsCount, clicked_article: clickedArticle }) }),
  getTopHelpSearches: () => request<any>('/api/ux-layer/help/top-searches'),
  getDesignPrefs: () => request<any>('/api/ux-layer/design'),
  updateDesignPrefs: (data: { accent_color?: string; font_size?: string; border_radius?: string }) =>
    request<any>('/api/ux-layer/design', { method: 'PATCH', body: JSON.stringify(data) }),
  getA11yPrefs: () => request<any>('/api/ux-layer/a11y'),
  updateA11yPrefs: (data: { high_contrast?: boolean; large_text?: boolean; reduce_motion?: boolean; screen_reader_hints?: boolean }) =>
    request<any>('/api/ux-layer/a11y', { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Layer 6B ─────────────────────────────────────────────────

export const teamAccountsApi = {
  getAccount: () => request<any>('/api/team-accounts'),
  getMembers: () => request<any>('/api/team-accounts/members'),
  inviteMember: (data: { name: string; email: string; phone?: string; role?: string }) =>
    request<any>('/api/team-accounts/members', { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (id: string, data: { name?: string; role?: string; status?: string }) =>
    request<any>(`/api/team-accounts/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeMember: (id: string) =>
    request<any>(`/api/team-accounts/members/${id}`, { method: 'DELETE' }),
  getActivityLogs: (limit?: number) =>
    request<any>(`/api/team-accounts/activity${limit ? `?limit=${limit}` : ''}`),
};

export const permissionsEngineApi = {
  getRoles: () => request<any>('/api/permissions/roles'),
  createRole: (data: { name: string; description?: string; permissions: string[] }) =>
    request<any>('/api/permissions/roles', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (id: string, data: any) =>
    request<any>(`/api/permissions/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRole: (id: string) =>
    request<any>(`/api/permissions/roles/${id}`, { method: 'DELETE' }),
  getGrants: (memberId: string) =>
    request<any>(`/api/permissions/grants/${memberId}`),
  upsertGrant: (data: { member_id: string; resource: string; action: string; granted: boolean; role_id?: string; granted_by?: string }) =>
    request<any>('/api/permissions/grants', { method: 'POST', body: JSON.stringify(data) }),
  checkPermission: (data: { member_id: string; resource: string; action: string }) =>
    request<any>('/api/permissions/check', { method: 'POST', body: JSON.stringify(data) }),
  assignRole: (memberId: string, role_id: string) =>
    request<any>(`/api/permissions/members/${memberId}/assign-role`, { method: 'POST', body: JSON.stringify({ role_id }) }),
};

export const marketplaceSplitApi = {
  getVendors: () => request<any>('/api/marketplace/vendors'),
  createVendor: (data: { name: string; email: string; phone?: string; iban?: string; commission_rate?: number }) =>
    request<any>('/api/marketplace/vendors', { method: 'POST', body: JSON.stringify(data) }),
  updateVendor: (id: string, data: any) =>
    request<any>(`/api/marketplace/vendors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVendor: (id: string) =>
    request<any>(`/api/marketplace/vendors/${id}`, { method: 'DELETE' }),
  getSplitRules: () => request<any>('/api/marketplace/split-rules'),
  createSplitRule: (data: { name: string; type?: string; splits: any[] }) =>
    request<any>('/api/marketplace/split-rules', { method: 'POST', body: JSON.stringify(data) }),
  deleteSplitRule: (id: string) =>
    request<any>(`/api/marketplace/split-rules/${id}`, { method: 'DELETE' }),
  processSplit: (data: { rule_id: string; gross_amount: number; transaction_id?: string; vendor_id?: string }) =>
    request<any>('/api/marketplace/process', { method: 'POST', body: JSON.stringify(data) }),
  getLogs: (limit?: number) =>
    request<any>(`/api/marketplace/logs${limit ? `?limit=${limit}` : ''}`),
};

export const partnerDashboardApi = {
  getPartners: () => request<any>('/api/partners'),
  createPartner: (data: { name: string; email: string; type?: string; commission_rate?: number }) =>
    request<any>('/api/partners', { method: 'POST', body: JSON.stringify(data) }),
  updatePartner: (id: string, data: any) =>
    request<any>(`/api/partners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePartner: (id: string) =>
    request<any>(`/api/partners/${id}`, { method: 'DELETE' }),
  getMetrics: (id: string) =>
    request<any>(`/api/partners/${id}/metrics`),
  recordMetric: (id: string, data: { period: string; gmv?: number; transactions?: number; new_merchants?: number; commission_earned?: number }) =>
    request<any>(`/api/partners/${id}/metrics`, { method: 'POST', body: JSON.stringify(data) }),
  addSubMerchant: (id: string, data: { sub_merchant_name: string; sub_merchant_email: string }) =>
    request<any>(`/api/partners/${id}/sub-merchants`, { method: 'POST', body: JSON.stringify(data) }),
};

export const growthExperimentsApi = {
  getExperiments: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return request<any>(`/api/growth-experiments${qs}`);
  },
  createExperiment: (data: { name: string; hypothesis?: string; type?: string; traffic_split?: number; target_metric?: string; start_date?: string; end_date?: string; variants?: any[] }) =>
    request<any>('/api/growth-experiments', { method: 'POST', body: JSON.stringify(data) }),
  getExperiment: (id: string) =>
    request<any>(`/api/growth-experiments/${id}`),
  updateStatus: (id: string, status: string, winner_variant?: string) =>
    request<any>(`/api/growth-experiments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, winner_variant }) }),
  deleteExperiment: (id: string) =>
    request<any>(`/api/growth-experiments/${id}`, { method: 'DELETE' }),
  trackEvent: (data: { experiment_id: string; variant_id: string; event_type: string; session_id?: string; value?: number; metadata?: any }) =>
    request<any>('/api/growth-experiments/events', { method: 'POST', body: JSON.stringify(data) }),
  getResults: (id: string) =>
    request<any>(`/api/growth-experiments/${id}/results`),
};

// ─── Default Export ───────────────────────────────────────────
export default {
  auth:                    authApi,
  transactions:            transactionsApi,
  balance:                 balanceApi,
  settlements:             settlementsApi,
  disputes:                disputesApi,
  refunds:                 refundsApi,
  notifications:           notificationsApi,
  merchant:                merchantApi,
  dashboard:               dashboardApi,
  analytics:               analyticsApi,
  analyticsIntelligence:   analyticsIntelligenceApi,
  paymentLinks:            paymentLinksApi,
  subscriptions:           subscriptionsApi,
  export:                  exportApi,
  revenueGoals:            revenueGoalsApi,
  expenses:                expensesApi,
  invoices:                invoicesApi,
  transfers:               transfersApi,
  apiKeys:                 apiKeysApi,
  webhooks:                webhooksApi,
  cod:                     codApi,
  fx:                      fxApi,
  team:                    teamApi,
  hostedCheckout:          hostedCheckoutApi,
  paymentMethods:          paymentMethodsApi,
  retry:                   retryApi,
  reconciliation:          reconciliationApi,
  customers:               customersApi,
  featureFlags:            featureFlagsApi,
  wallets:                 walletsApi,
  gatewayRouting:          gatewayRoutingApi,
  crossRetry:              crossRetryApi,
  bin:                     binApi,
  dynamicCheckout:         dynamicCheckoutApi,
  fraud:                   fraudApi,
  growth:                  growthApi,
  tokenization:            tokenizationApi,
  chargeback:              chargebackApi,
  approvalOptimization:    approvalOptimizationApi,
  payoutScheduling:        payoutSchedulingApi,
  commission:              commissionApi,
  tax:                     taxApi,
  recovery:                recoveryApi,
  financialReports:        financialReportsApi,
  realtimeDashboard:       realtimeDashboardApi,
  conversionFunnel:        conversionFunnelApi,
  successRate:             successRateApi,
  revenueBreakdown:        revenueBreakdownApi,
  customerCLV:             customerCLVApi,
  cohortAnalysis:          cohortAnalysisApi,
  smartInsights:           smartInsightsApi,
  predictiveAnalytics:     predictiveAnalyticsApi,
  alertsEngine:            alertsEngineApi,
  abTesting:               abTestingApi,
  onboarding:              onboardingApi,
  setup:                   setupApi,
  ux:                      uxApi,
  // ── Layer 6A ──
  advancedNotifications:   advancedNotificationsApi,
  paymentReminders:        paymentRemindersApi,
  crmIntegration:          crmIntegrationApi,
  marketingAutomation:     marketingAutomationApi,
  affiliateSystem:         affiliateSystemApi,
  // ── Layer 6B ──
  teamAccounts:            teamAccountsApi,
  permissionsEngine:       permissionsEngineApi,
  marketplaceSplit:        marketplaceSplitApi,
  partnerDashboard:        partnerDashboardApi,
  growthExperiments:       growthExperimentsApi,
};