/**
 * Zyrix App — Type Definitions
 * All shared types for the application.
 */

// ─── Auth ────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  merchantId: string;
  language: AppLanguage;
  avatar?: string;
}

export type AppLanguage = 'ar' | 'en' | 'tr';

// ─── Transactions ────────────────────────────────
export type TransactionStatus = 'success' | 'pending' | 'failed';
export type TransactionMethod = 'Credit card' | 'Bank transfer' | 'Digital wallet' | 'Fraud blocked' | 'Crypto';

export interface Transaction {
  id: string;
  date: string;
  name: string;
  method: TransactionMethod;
  flag: string;
  country: string;
  amount: number;
  currency: CurrencyCode;
  isCredit: boolean;
  status: TransactionStatus;
}

export interface TransactionDetail extends Transaction {
  customerEmail?: string;
  customerPhone?: string;
  orderId?: string;
  description?: string;
  fee?: number;
  net?: number;
  metadata?: Record<string, string>;
}

// ─── Balance ─────────────────────────────────────
export interface Balance {
  available: number;
  iban: string;
  company: string;
  nextSettlement: string;
  net: number;
  commission: number;
}

// ─── Settlements ─────────────────────────────────
export type SettlementStatus = 'pending' | 'settled' | 'failed';

export interface Settlement {
  id: string;
  date: string;
  period: string;
  count: number;
  gross: number;
  commission: number;
  net: number;
  status: SettlementStatus;
}

// ─── Disputes ────────────────────────────────────
export interface Dispute {
  id: string;
  orderId: string;
  amount: number;
  reason: string;
  deadline: string;
  urgent: boolean;
}

// ─── Currency ────────────────────────────────────
export type CurrencyCode = 'USD' | 'SAR' | 'AED' | 'KWD' | 'QAR' | 'EUR';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  flag: string;
  name: string;
}

// ─── KPI ─────────────────────────────────────────
export interface KpiItem {
  label: string;
  value: string | number;
  change?: number; // percentage, e.g. 18.3 = +18.3%
  changeLabel?: string;
  icon?: string;
  color?: string;
}

// ─── Chart ───────────────────────────────────────
export type ChartPeriod = '7d' | '30d' | '90d';

export interface ChartDataPoint {
  label: string;
  value: number;
}

// ─── Navigation ──────────────────────────────────
export type MerchantTabRoute =
  | 'dashboard'
  | 'transactions'
  | 'balance'
  | 'analytics'
  | 'settings';

export interface TabItem {
  route: MerchantTabRoute;
  labelKey: string; // i18n key
  icon: string;
}

// ─── Notification ────────────────────────────────
export type NotificationType = 'payment' | 'settlement' | 'dispute' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  date: string;
  read: boolean;
}

// ─── Settings ────────────────────────────────────
export interface NotificationPreferences {
  payments: boolean;
  settlements: boolean;
  disputes: boolean;
  marketing: boolean;
}

export interface SecuritySettings {
  twoFactor: boolean;
  biometric: boolean;
}

// ─── API Keys ────────────────────────────────────
export interface ApiKey {
  id: string;
  label: string;
  maskedKey: string;
  createdAt: string;
  lastUsed?: string;
  active: boolean;
}

// ─── Refund ──────────────────────────────────────
export type RefundStatus = 'processing' | 'completed' | 'rejected';

export interface Refund {
  id: string;
  transactionId: string;
  amount: number;
  currency: CurrencyCode;
  reason: string;
  status: RefundStatus;
  requestedAt: string;
  completedAt?: string;
}

// ─── API Response Types ──────────────────────────
export interface ApiTransaction {
  id: string;
  txId: string;
  merchantId: string;
  amount: string;
  currency: string;
  method: string;
  status: TransactionStatus;
  isCredit: boolean;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  cardLast4: string | null;
  country: string | null;
  countryFlag: string | null;
  description: string | null;
  fee: string | null;
  net: string | null;
  createdAt: string;
  updatedAt: string;
  refunds?: ApiRefund[];
  disputes?: ApiDispute[];
}

export interface ApiSettlement {
  id: string;
  settlementId: string;
  merchantId: string;
  periodStart: string;
  periodEnd: string;
  txCount: number;
  gross: string;
  commission: string;
  net: string;
  status: SettlementStatus;
  settledAt: string | null;
  createdAt: string;
}

export interface ApiDispute {
  id: string;
  disputeId: string;
  merchantId: string;
  transactionId: string;
  amount: string;
  reason: string;
  status: string;
  urgent: boolean;
  deadline: string;
  response: string | null;
  resolvedAt: string | null;
  createdAt: string;
  transaction?: { txId: string; amount: string; currency: string };
}

export interface ApiRefund {
  id: string;
  refundId: string;
  merchantId: string;
  transactionId: string;
  amount: string;
  currency: string;
  reason: string;
  status: RefundStatus;
  customerName: string | null;
  requestedAt: string;
  completedAt: string | null;
  transaction?: { txId: string; customerName: string | null };
}

export interface ApiNotification {
  id: string;
  merchantId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data: string | null;
  createdAt: string;
}

export interface MerchantProfile {
  id: string;
  merchantId: string;
  name: string;
  phone: string;
  email: string | null;
  company: string;
  language: string;
  avatar: string | null;
  iban: string | null;
  createdAt: string;
}
