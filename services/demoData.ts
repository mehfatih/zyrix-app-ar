/**
 * Zyrix App — Demo Data Service
 * Provides realistic sample data for all screens.
 * Used when backend is unavailable or for demo/review purposes.
 * 
 * Toggle: Set USE_DEMO_DATA = true to use demo data.
 */

// ─── Toggle ──────────────────────────────────────
export const USE_DEMO_DATA = true;

// ─── Helpers ─────────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// ─── Merchants / Customers ───────────────────────
const CUSTOMERS = [
  { name: 'أحمد محمد العلي', country: 'SA', flag: '🇸🇦', email: 'ahmed@example.sa' },
  { name: 'فاطمة حسين', country: 'IQ', flag: '🇮🇶', email: 'fatima@example.iq' },
  { name: 'خالد الراشد', country: 'AE', flag: '🇦🇪', email: 'khaled@example.ae' },
  { name: 'نورا السالم', country: 'KW', flag: '🇰🇼', email: 'noura@example.kw' },
  { name: 'عمر يوسف', country: 'SA', flag: '🇸🇦', email: 'omar@example.sa' },
  { name: 'ليلى الأمين', country: 'QA', flag: '🇶🇦', email: 'layla@example.qa' },
  { name: 'محمد الحربي', country: 'SA', flag: '🇸🇦', email: 'mhd@example.sa' },
  { name: 'سارة القحطاني', country: 'SA', flag: '🇸🇦', email: 'sara@example.sa' },
  { name: 'يوسف إبراهيم', country: 'IQ', flag: '🇮🇶', email: 'youssef@example.iq' },
  { name: 'هند المطيري', country: 'AE', flag: '🇦🇪', email: 'hind@example.ae' },
  { name: 'عبدالله الشمري', country: 'SA', flag: '🇸🇦', email: 'abd@example.sa' },
  { name: 'ريم العتيبي', country: 'KW', flag: '🇰🇼', email: 'reem@example.kw' },
];

const METHODS = ['Credit card', 'Bank transfer', 'Digital wallet', 'Credit card', 'Credit card', 'Bank transfer'];
const STATUSES: Array<'success' | 'pending' | 'failed'> = ['success', 'success', 'success', 'success', 'pending', 'failed'];

// ─── Generate Transactions ───────────────────────
function generateTransactions(count: number = 30) {
  return Array.from({ length: count }, (_, i) => {
    const cust = CUSTOMERS[i % CUSTOMERS.length];
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const amount = randomBetween(50, 5000);
    const fee = Math.round(amount * 0.029 * 100) / 100;
    return {
      id: `tx_${String(i + 1).padStart(4, '0')}`,
      txId: `ZRX-TX-${String(1000 + i)}`,
      merchantId: 'ZRX-10042',
      amount: amount.toFixed(2),
      currency: 'SAR',
      method: METHODS[i % METHODS.length],
      status,
      isCredit: true,
      customerName: cust.name,
      customerEmail: cust.email,
      customerPhone: '+966 5X XXX XXXX',
      cardLast4: String(1000 + Math.floor(Math.random() * 9000)),
      cardBrand: i % 3 === 0 ? 'Visa' : i % 3 === 1 ? 'Mastercard' : 'mada',
      country: cust.country,
      countryFlag: cust.flag,
      description: `طلب #${2000 + i}`,
      fee: fee.toFixed(2),
      net: (amount - fee).toFixed(2),
      createdAt: daysAgo(Math.floor(i / 3)),
      updatedAt: daysAgo(Math.floor(i / 3)),
    };
  });
}

const DEMO_TRANSACTIONS = generateTransactions(30);

// ─── Stats ───────────────────────────────────────
const totalVolume = DEMO_TRANSACTIONS.reduce((s, t) => s + parseFloat(t.amount), 0);
const successCount = DEMO_TRANSACTIONS.filter(t => t.status === 'success').length;

// ─── Dashboard ───────────────────────────────────
export const demoDashboard = {
  kpis: {
    totalVolume: Math.round(totalVolume),
    successRate: ((successCount / DEMO_TRANSACTIONS.length) * 100).toFixed(1),
    todayTx: 12,
    openDisputes: 2,
  },
  recentTransactions: DEMO_TRANSACTIONS.slice(0, 4),
  balance: {
    available: 18450.75,
    incoming: 4200.00,
    outgoing: 1350.50,
  },
  unreadNotifications: 3,
};

// ─── Balance ─────────────────────────────────────
export const demoBalance = {
  available: 18450.75,
  incoming: 4200.00,
  outgoing: 1350.50,
  iban: 'SA03 8000 0000 6080 1016 7519',
  company: 'Zyrix Global Technology',
  nextSettlement: {
    id: 'stl_001',
    date: '2026-04-07',
    net: 4200.00,
    commission: 280.50,
    dateAmount: 4200.00,
  },
};

// ─── Transactions List ───────────────────────────
export const demoTransactionsList = {
  transactions: DEMO_TRANSACTIONS,
  pagination: { page: 1, limit: 50, total: 30, pages: 1 },
  stats: {
    totalVolume: Math.round(totalVolume),
    totalCount: DEMO_TRANSACTIONS.length,
    successRate: ((successCount / DEMO_TRANSACTIONS.length) * 100).toFixed(1),
  },
};

// ─── Analytics ───────────────────────────────────
export function demoAnalytics(range: '7d' | '30d' | '90d') {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const labels = range === '7d'
    ? ['سبت', 'أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع']
    : range === '30d'
      ? ['أسبوع 1', 'أسبوع 2', 'أسبوع 3', 'أسبوع 4']
      : ['يناير', 'فبراير', 'مارس'];

  return {
    range,
    kpi: {
      volume: Math.round(totalVolume * (days / 30)),
      successRate: 87.3,
      avgTx: 342.50,
      customers: Math.round(45 * (days / 30)),
    },
    volume: labels.map(label => ({
      label,
      value: Math.round(randomBetween(2000, 8000)),
    })),
    successRate: labels.map(label => ({
      label,
      value: Math.round(randomBetween(80, 95)),
    })),
    methods: [
      { label: 'بطاقة ائتمان', value: 58 },
      { label: 'تحويل بنكي', value: 22 },
      { label: 'محفظة رقمية', value: 15 },
      { label: 'عملات رقمية', value: 5 },
    ],
    countries: [
      { label: '🇸🇦 السعودية', value: 45 },
      { label: '🇮🇶 العراق', value: 25 },
      { label: '🇦🇪 الإمارات', value: 18 },
      { label: '🇰🇼 الكويت', value: 12 },
    ],
  };
}

// ─── Settlements ─────────────────────────────────
export const demoSettlements = {
  settlements: [
    { id: 'stl_001', settlementId: 'ZRX-STL-001', merchantId: 'ZRX-10042', periodStart: daysAgo(7), periodEnd: daysAgo(1), txCount: 45, gross: '12450.00', commission: '361.05', net: '12088.95', status: 'settled' as const, settledAt: daysAgo(0), createdAt: daysAgo(1) },
    { id: 'stl_002', settlementId: 'ZRX-STL-002', merchantId: 'ZRX-10042', periodStart: daysAgo(14), periodEnd: daysAgo(8), txCount: 38, gross: '9870.50', commission: '286.24', net: '9584.26', status: 'settled' as const, settledAt: daysAgo(7), createdAt: daysAgo(8) },
    { id: 'stl_003', settlementId: 'ZRX-STL-003', merchantId: 'ZRX-10042', periodStart: daysAgo(0), periodEnd: daysAgo(0), txCount: 12, gross: '4200.00', commission: '121.80', net: '4078.20', status: 'pending' as const, settledAt: null, createdAt: daysAgo(0) },
  ],
  pagination: { page: 1, limit: 10, total: 3, pages: 1 },
};

// ─── Disputes ────────────────────────────────────
export const demoDisputes = {
  disputes: [
    { id: 'dsp_001', disputeId: 'ZRX-DSP-001', merchantId: 'ZRX-10042', transactionId: 'tx_0003', amount: '750.00', reason: 'لم يتم استلام المنتج', status: 'open', urgent: true, deadline: daysAgo(-5), response: null, resolvedAt: null, createdAt: daysAgo(3), transaction: { txId: 'ZRX-TX-1002', amount: '750.00', currency: 'SAR' } },
    { id: 'dsp_002', disputeId: 'ZRX-DSP-002', merchantId: 'ZRX-10042', transactionId: 'tx_0008', amount: '320.00', reason: 'منتج تالف', status: 'open', urgent: false, deadline: daysAgo(-12), response: null, resolvedAt: null, createdAt: daysAgo(5), transaction: { txId: 'ZRX-TX-1007', amount: '320.00', currency: 'SAR' } },
    { id: 'dsp_003', disputeId: 'ZRX-DSP-003', merchantId: 'ZRX-10042', transactionId: 'tx_0015', amount: '1200.00', reason: 'عملية غير مصرح بها', status: 'won', urgent: false, deadline: daysAgo(-20), response: 'تم تقديم إثبات التسليم', resolvedAt: daysAgo(2), createdAt: daysAgo(15), transaction: { txId: 'ZRX-TX-1014', amount: '1200.00', currency: 'SAR' } },
  ],
};

// ─── Refunds ─────────────────────────────────────
export const demoRefunds = {
  refunds: [
    { id: 'ref_001', refundId: 'ZRX-REF-001', merchantId: 'ZRX-10042', transactionId: 'tx_0005', amount: '450.00', currency: 'SAR', reason: 'طلب العميل', status: 'completed' as const, customerName: 'عمر يوسف', requestedAt: daysAgo(4), completedAt: daysAgo(2), transaction: { txId: 'ZRX-TX-1004', customerName: 'عمر يوسف' } },
    { id: 'ref_002', refundId: 'ZRX-REF-002', merchantId: 'ZRX-10042', transactionId: 'tx_0012', amount: '180.00', currency: 'SAR', reason: 'منتج معيب', status: 'processing' as const, customerName: 'هند المطيري', requestedAt: daysAgo(1), completedAt: null, transaction: { txId: 'ZRX-TX-1011', customerName: 'هند المطيري' } },
  ],
};

// ─── Notifications ───────────────────────────────
export const demoNotifications = {
  notifications: [
    { id: 'n1', merchantId: 'ZRX-10042', type: 'payment', title: 'دفعة جديدة', body: 'تم استلام 1,250.00 ر.س من أحمد محمد العلي', read: false, amount: 1250, data: null, createdAt: daysAgo(0) },
    { id: 'n2', merchantId: 'ZRX-10042', type: 'payment', title: 'دفعة جديدة', body: 'تم استلام 890.50 ر.س من خالد الراشد', read: false, amount: 890.5, data: null, createdAt: daysAgo(0) },
    { id: 'n3', merchantId: 'ZRX-10042', type: 'dispute', title: 'نزاع جديد', body: 'تم فتح نزاع على العملية ZRX-TX-1002 بقيمة 750.00 ر.س', read: false, amount: 750, data: null, createdAt: daysAgo(1) },
    { id: 'n4', merchantId: 'ZRX-10042', type: 'settlement', title: 'تسوية مكتملة', body: 'تم إيداع 12,088.95 ر.س في حسابك البنكي', read: true, amount: 12088.95, data: null, createdAt: daysAgo(2) },
    { id: 'n5', merchantId: 'ZRX-10042', type: 'security', title: 'تسجيل دخول جديد', body: 'تم تسجيل دخول من جهاز جديد — إسطنبول، تركيا', read: true, amount: 0, data: null, createdAt: daysAgo(3) },
    { id: 'n6', merchantId: 'ZRX-10042', type: 'refund', title: 'استرداد مكتمل', body: 'تم استرداد 450.00 ر.س للعميل عمر يوسف', read: true, amount: 450, data: null, createdAt: daysAgo(4) },
    { id: 'n7', merchantId: 'ZRX-10042', type: 'system', title: 'تحديث النظام', body: 'تم تحديث واجهة API إلى الإصدار 2.1', read: true, amount: 0, data: null, createdAt: daysAgo(5) },
  ],
  unreadCount: 3,
};

// ─── Merchant Profile ────────────────────────────
export const demoProfile: import('../types').MerchantProfile = {
  id: 'usr_001',
  merchantId: 'ZRX-10042',
  name: 'محمد فاتح',
  phone: '+90 545 221 0888',
  email: 'meh.fatih77@gmail.com',
  company: 'Zyrix Global Technology',
  language: 'ar',
  avatar: null,
  iban: 'SA03 8000 0000 6080 1016 7519',
  createdAt: '2025-09-15T00:00:00Z',
};

// ─── Payment Links ───────────────────────────────
export const demoPaymentLinks = {
  links: [
    { id: 'pl_001', linkId: 'ZRX-PL-001', amount: '500.00', currency: 'SAR', title: 'باقة تجميل أساسية', description: 'مجموعة العناية بالبشرة', status: 'active', expiresAt: daysAgo(-30), paidAt: null, createdAt: daysAgo(2), paymentUrl: 'https://pay.zyrix.co/pl/ZRX-PL-001' },
    { id: 'pl_002', linkId: 'ZRX-PL-002', amount: '1200.00', currency: 'SAR', title: 'باقة تجميل متقدمة', description: null, status: 'paid', expiresAt: null, paidAt: daysAgo(1), createdAt: daysAgo(5), paymentUrl: 'https://pay.zyrix.co/pl/ZRX-PL-002' },
    { id: 'pl_003', linkId: 'ZRX-PL-003', amount: '350.00', currency: 'SAR', title: 'استشارة تجميلية', description: 'جلسة استشارة 60 دقيقة', status: 'active', expiresAt: daysAgo(-14), paidAt: null, createdAt: daysAgo(0), paymentUrl: 'https://pay.zyrix.co/pl/ZRX-PL-003' },
  ],
};

// ─── Subscriptions ───────────────────────────────
export const demoSubscriptions = {
  subscriptions: [
    { id: 'sub_001', subscriptionId: 'ZRX-SUB-001', customerName: 'سارة القحطاني', amount: '99.00', currency: 'SAR', interval: 'monthly', title: 'اشتراك العناية الشهري', status: 'active', nextBillingDate: daysAgo(-15), billingCount: 4, createdAt: daysAgo(120) },
    { id: 'sub_002', subscriptionId: 'ZRX-SUB-002', customerName: 'نورا السالم', amount: '249.00', currency: 'SAR', interval: 'monthly', title: 'باقة VIP', status: 'active', nextBillingDate: daysAgo(-8), billingCount: 2, createdAt: daysAgo(60) },
    { id: 'sub_003', subscriptionId: 'ZRX-SUB-003', customerName: 'ريم العتيبي', amount: '49.00', currency: 'SAR', interval: 'monthly', title: 'اشتراك أساسي', status: 'paused', nextBillingDate: daysAgo(-20), billingCount: 6, createdAt: daysAgo(180) },
  ],
};

export default {
  dashboard: demoDashboard,
  balance: demoBalance,
  transactions: demoTransactionsList,
  analytics: demoAnalytics,
  settlements: demoSettlements,
  disputes: demoDisputes,
  refunds: demoRefunds,
  notifications: demoNotifications,
  profile: demoProfile,
  paymentLinks: demoPaymentLinks,
  subscriptions: demoSubscriptions,
};
