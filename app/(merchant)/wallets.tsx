/**
 * Zyrix App — Multi-Currency Wallets Screen
 * محافظ متعددة العملات
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, I18nManager, RefreshControl, Modal,
  TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import { InnerHeader } from '../../components/InnerHeader';
import { walletsApi } from '../../services/api';

const isRTL = I18nManager.isRTL;

// ─── Demo Data ────────────────────────────────────────────────
const DEMO_WALLETS = {
  wallets: [
    { id: 'w1', currency: 'SAR', balance: 12500.00, lockedBalance: 0, available: 12500.00, isActive: true, usdValue: 3333.33, meta: { flag: '🇸🇦', nameAr: 'ريال سعودي',   symbol: 'ر.س' } },
    { id: 'w2', currency: 'USD', balance: 3200.00,  lockedBalance: 0, available: 3200.00,  isActive: true, usdValue: 3200.00, meta: { flag: '🇺🇸', nameAr: 'دولار أمريكي', symbol: '$'   } },
    { id: 'w3', currency: 'AED', balance: 4800.00,  lockedBalance: 0, available: 4800.00,  isActive: true, usdValue: 1307.10, meta: { flag: '🇦🇪', nameAr: 'درهم إماراتي', symbol: 'د.إ' } },
    { id: 'w4', currency: 'TRY', balance: 28000.00, lockedBalance: 0, available: 28000.00, isActive: true, usdValue: 869.57,  meta: { flag: '🇹🇷', nameAr: 'ليرة تركية',  symbol: '₺'   } },
    { id: 'w5', currency: 'EUR', balance: 0,        lockedBalance: 0, available: 0,        isActive: false, usdValue: 0,      meta: { flag: '🇪🇺', nameAr: 'يورو',         symbol: '€'   } },
    { id: 'w6', currency: 'KWD', balance: 0,        lockedBalance: 0, available: 0,        isActive: false, usdValue: 0,      meta: { flag: '🇰🇼', nameAr: 'دينار كويتي', symbol: 'د.ك' } },
    { id: 'w7', currency: 'QAR', balance: 0,        lockedBalance: 0, available: 0,        isActive: false, usdValue: 0,      meta: { flag: '🇶🇦', nameAr: 'ريال قطري',   symbol: 'ر.ق' } },
    { id: 'w8', currency: 'IQD', balance: 0,        lockedBalance: 0, available: 0,        isActive: false, usdValue: 0,      meta: { flag: '🇮🇶', nameAr: 'دينار عراقي', symbol: 'ع.د' } },
  ],
  totalUSD: 8709.99,
  activeCount: 4,
};

type Wallet = typeof DEMO_WALLETS.wallets[0];

export default function WalletsScreen() {

  const [wallets, setWallets]         = useState<Wallet[]>([]);
  const [totalUSD, setTotalUSD]       = useState(0);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [converting, setConverting]   = useState(false);

  // Convert form
  const [fromCcy, setFromCcy]   = useState('SAR');
  const [toCcy, setToCcy]       = useState('USD');
  const [amount, setAmount]     = useState('');
  const [preview, setPreview]   = useState<{ rate: number; result: number } | null>(null);

  // ─── Load ───────────────────────────────────────────────────
  const loadWallets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await walletsApi.list();
      setWallets(res.data.wallets);
      setTotalUSD(res.data.totalUSD);
    } catch {
      setWallets(DEMO_WALLETS.wallets as any);
      setTotalUSD(DEMO_WALLETS.totalUSD);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadWallets(); }, []);

  // ─── Preview conversion ─────────────────────────────────────
  useEffect(() => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setPreview(null);
      return;
    }
    walletsApi.rates().then(res => {
      const rate = res.data.rates[`${fromCcy}_${toCcy}`] || 1;
      setPreview({ rate, result: Math.round(Number(amount) * rate * 0.995 * 100) / 100 });
    }).catch(() => setPreview(null));
  }, [fromCcy, toCcy, amount]);

  // ─── Convert ────────────────────────────────────────────────
  const handleConvert = async () => {
    if (!amount || Number(amount) <= 0) {
      Alert.alert('', 'أدخل المبلغ');
      return;
    }
    setConverting(true);
    try {
      const res = await walletsApi.convert(fromCcy, toCcy, Number(amount));
      Alert.alert('', `تم: ${amount} ${fromCcy} → ${res.data.to.amount} ${toCcy} ✅`);
      setShowConvert(false);
      setAmount('');
      loadWallets(true);
    } catch (e: any) {
      Alert.alert('', e.message || 'فشل التحويل');
    } finally {
      setConverting(false);
    }
  };

  const activeWallets   = wallets.filter(w => w.isActive);
  const inactiveWallets = wallets.filter(w => !w.isActive);

  // ─── Render ─────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <InnerHeader title="المحافظ" accentColor="#059669" />
        <View style={s.center}><ActivityIndicator size="large" color="#059669" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <InnerHeader title="المحافظ" accentColor="#059669" />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadWallets(true); }} tintColor="#059669" />}
      >
        {/* Total */}
        <View style={s.totalCard}>
          <Text style={s.totalLabel}>إجمالي الرصيد (USD)</Text>
          <Text style={s.totalValue}>${totalUSD.toLocaleString('en', { minimumFractionDigits: 2 })}</Text>
          <Text style={s.totalSub}>{activeWallets.length} محفظة نشطة</Text>
        </View>

        {/* Convert Button */}
        <TouchableOpacity style={s.convertBtn} onPress={() => setShowConvert(true)}>
          <Text style={s.convertBtnIcon}>🔄</Text>
          <Text style={s.convertBtnText}>تحويل بين المحافظ</Text>
        </TouchableOpacity>

        {/* Active Wallets */}
        <Text style={s.sectionTitle}>المحافظ النشطة</Text>
        {activeWallets.map(w => (
          <WalletCard key={w.id} wallet={w} />
        ))}

        {/* Inactive Wallets */}
        {inactiveWallets.length > 0 && (
          <>
            <Text style={s.sectionTitle}>محافظ غير مفعّلة</Text>
            {inactiveWallets.map(w => (
              <WalletCard key={w.id} wallet={w} inactive />
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Convert Modal */}
      <Modal visible={showConvert} transparent animationType="slide">
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.header}>
              <Text style={m.title}>تحويل بين المحافظ</Text>
              <TouchableOpacity onPress={() => setShowConvert(false)}>
                <Text style={m.close}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* From */}
            <Text style={m.label}>من</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={m.ccyRow}>
              {activeWallets.map(w => (
                <TouchableOpacity
                  key={w.currency}
                  style={[m.ccyBtn, fromCcy === w.currency && m.ccyBtnActive]}
                  onPress={() => setFromCcy(w.currency)}
                >
                  <Text style={m.ccyFlag}>{w.meta.flag}</Text>
                  <Text style={[m.ccyCode, fromCcy === w.currency && m.ccyCodeActive]}>{w.currency}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* To */}
            <Text style={m.label}>إلى</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={m.ccyRow}>
              {wallets.filter(w => w.currency !== fromCcy).map(w => (
                <TouchableOpacity
                  key={w.currency}
                  style={[m.ccyBtn, toCcy === w.currency && m.ccyBtnActive]}
                  onPress={() => setToCcy(w.currency)}
                >
                  <Text style={m.ccyFlag}>{w.meta.flag}</Text>
                  <Text style={[m.ccyCode, toCcy === w.currency && m.ccyCodeActive]}>{w.currency}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Amount */}
            <Text style={m.label}>المبلغ</Text>
            <TextInput
              style={m.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder={`المبلغ بـ ${fromCcy}`}
              placeholderTextColor={COLORS.textMuted}
              textAlign="right"
            />

            {/* Preview */}
            {preview && (
              <View style={m.preview}>
                <Text style={m.previewText}>
                  سعر الصرف: 1 {fromCcy} = {preview.rate.toFixed(4)} {toCcy}
                </Text>
                <Text style={m.previewResult}>
                  ستستلم ≈ {preview.result.toLocaleString()} {toCcy}
                </Text>
                <Text style={m.previewFee}>رسوم التحويل: 0.5%</Text>
              </View>
            )}

            <TouchableOpacity
              style={[m.confirmBtn, converting && { opacity: 0.6 }]}
              onPress={handleConvert}
              disabled={converting}
            >
              {converting
                ? <ActivityIndicator color="#fff" />
                : <Text style={m.confirmText}>تأكيد التحويل</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Wallet Card ──────────────────────────────────────────────
function WalletCard({ wallet, inactive }: { wallet: Wallet; inactive?: boolean }) {
  return (
    <View style={[wc.card, inactive && wc.cardInactive]}>
      <View style={wc.left}>
        <View style={[wc.flagBox, inactive && wc.flagBoxInactive]}>
          <Text style={wc.flag}>{wallet.meta.flag}</Text>
        </View>
        <View>
          <Text style={[wc.name, inactive && wc.nameInactive]}>{wallet.meta.nameAr}</Text>
          <Text style={wc.code}>{wallet.currency}</Text>
        </View>
      </View>
      <View style={wc.right}>
        {inactive ? (
          <Text style={wc.inactiveLabel}>غير مفعّل</Text>
        ) : (
          <>
            <Text style={wc.balance}>
              {wallet.balance.toLocaleString('en', { minimumFractionDigits: 2 })} {wallet.meta.symbol}
            </Text>
            <Text style={wc.usd}>≈ ${wallet.usdValue.toLocaleString('en', { minimumFractionDigits: 2 })}</Text>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.background },
  scroll:       { flex: 1 },
  content:      { padding: SPACING.md },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  totalCard:    { backgroundColor: '#064E3B', borderRadius: RADIUS.lg, padding: 24, alignItems: 'center', marginBottom: SPACING.md },
  totalLabel:   { color: '#6EE7B7', fontSize: 13, marginBottom: 6 },
  totalValue:   { color: '#fff', fontSize: 32, fontWeight: FONT_WEIGHT.bold },
  totalSub:     { color: '#A7F3D0', fontSize: 12, marginTop: 4 },
  convertBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#059669', borderRadius: RADIUS.md, padding: 14, marginBottom: SPACING.lg, gap: 8 },
  convertBtnIcon: { fontSize: 18 },
  convertBtnText: { color: '#fff', fontSize: 15, fontWeight: FONT_WEIGHT.semibold },
  sectionTitle: { fontSize: 13, fontWeight: FONT_WEIGHT.bold, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' },
});

const wc = StyleSheet.create({
  card:          { backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 16, flexDirection: isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardInactive:  { opacity: 0.5 },
  left:          { flexDirection: isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 12 },
  flagBox:       { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1E3A5F', alignItems: 'center', justifyContent: 'center' },
  flagBoxInactive: { backgroundColor: '#1E293B' },
  flag:          { fontSize: 22 },
  name:          { fontSize: 15, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text, textAlign: isRTL ? 'right' : 'left' },
  nameInactive:  { color: COLORS.textMuted },
  code:          { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  right:         { alignItems: isRTL ? 'flex-start' : 'flex-end' },
  balance:       { fontSize: 16, fontWeight: FONT_WEIGHT.bold, color: '#059669' },
  usd:           { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  inactiveLabel: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' },
});

const m = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title:         { fontSize: 18, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  close:         { fontSize: 20, color: COLORS.textMuted, padding: 4 },
  label:         { fontSize: 13, color: COLORS.textMuted, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' },
  ccyRow:        { marginBottom: 16 },
  ccyBtn:        { alignItems: 'center', padding: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginRight: 8, minWidth: 64 },
  ccyBtnActive:  { borderColor: '#059669', backgroundColor: '#05966920' },
  ccyFlag:       { fontSize: 20, marginBottom: 4 },
  ccyCode:       { fontSize: 12, color: COLORS.textMuted, fontWeight: FONT_WEIGHT.semibold },
  ccyCodeActive: { color: '#059669' },
  input:         { backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 14, fontSize: 16, color: COLORS.text, marginBottom: 16 },
  preview:       { backgroundColor: '#064E3B20', borderRadius: RADIUS.md, padding: 14, marginBottom: 16 },
  previewText:   { fontSize: 13, color: COLORS.textMuted, textAlign: isRTL ? 'right' : 'left' },
  previewResult: { fontSize: 16, fontWeight: FONT_WEIGHT.bold, color: '#059669', marginTop: 4, textAlign: isRTL ? 'right' : 'left' },
  previewFee:    { fontSize: 11, color: COLORS.textMuted, marginTop: 4, textAlign: isRTL ? 'right' : 'left' },
  confirmBtn:    { backgroundColor: '#059669', borderRadius: RADIUS.md, padding: 16, alignItems: 'center' },
  confirmText:   { color: '#fff', fontSize: 16, fontWeight: FONT_WEIGHT.bold },
});