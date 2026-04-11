import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Animated, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { setupApi } from "../../services/api";

// ── Cache Store بسيط في الـ memory ──
const CACHE: Record<string, { data: any; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

export function getCached(key: string): any | null {
  const entry = CACHE[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { delete CACHE[key]; return null; }
  return entry.data;
}

export function setCache(key: string, data: any): void {
  CACHE[key] = { data, ts: Date.now() };
}

export function clearCache(key?: string): void {
  if (key) delete CACHE[key];
  else Object.keys(CACHE).forEach(k => delete CACHE[k]);
}

// ── Hook: Skeleton Loading ──
export function useSkeletonPulse() {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return anim;
}

// ── Skeleton Component ──
export function SkeletonRow({ width: w = "100%", height: h = 20, radius = 6, style }: {
  width?: number | string; height?: number; radius?: number; style?: any;
}) {
  const opacity = useSkeletonPulse();
  return (
    <Animated.View style={[{ width: w as any, height: h, borderRadius: radius, backgroundColor: "#1a1a1a", opacity }, style]} />
  );
}

// ── Hook: Cached API Call با قياس الأداء ──
export function useCachedApi<T>(
  key: string,
  fetcher: () => Promise<T>,
  deps: any[] = []
): { data: T | null; loading: boolean; loadTime: number; fromCache: boolean; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadTime, setLoadTime] = useState(0);
  const [fromCache, setFromCache] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const start = Date.now();
    const cached = getCached(key);
    if (cached) {
      setData(cached);
      setFromCache(true);
      setLoadTime(Date.now() - start);
      setLoading(false);
      return;
    }
    try {
      const result = await fetcher();
      setCache(key, result);
      setData(result);
      setFromCache(false);
      const elapsed = Date.now() - start;
      setLoadTime(elapsed);
      try {
        await setupApi.logPerf(key, elapsed, false);
      } catch (_) {}
    } catch (_) {
      setLoading(false);
    }
    setLoading(false);
  }, [key, ...deps]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, loadTime, fromCache, refetch: fetch };
}

// ── شاشة Speed Dashboard ──
export default function SpeedOptimizationScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [cacheSize, setCacheSize] = useState(0);

  useEffect(() => {
    loadStats();
    setCacheSize(Object.keys(CACHE).length);
  }, []);

  const loadStats = async () => {
    try {
      const res = await setupApi.getPerfStats();
      if (res?.data) setStats(res.data);
    } catch (_) {}
    setLoadingStats(false);
  };

  const handleClearCache = () => {
    clearCache();
    setCacheSize(0);
  };

  const getSpeedColor = (ms: number) => {
    if (ms < 300) return "#22c55e";
    if (ms < 800) return "#f59e0b";
    return "#ef4444";
  };

  const getSpeedLabel = (ms: number) => {
    if (ms < 300) return "⚡ سريع";
    if (ms < 800) return "🟡 مقبول";
    return "🔴 بطيء";
  };

  return (
    <SafeAreaView style={sp.container}>
      <View style={sp.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={sp.back}>→</Text>
        </TouchableOpacity>
        <Text style={sp.title}>⚡ أداء التطبيق</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={sp.content}>
        {/* KPIs */}
        <View style={sp.kpiRow}>
          <View style={sp.kpiCard}>
            <Text style={sp.kpiValue}>{Object.keys(CACHE).length}</Text>
            <Text style={sp.kpiLabel}>عناصر مخزنة</Text>
          </View>
          <View style={sp.kpiCard}>
            <Text style={[sp.kpiValue, { color: "#22c55e" }]}>
              {stats.length > 0
                ? `${Math.round(stats.reduce((s, r) => s + r.avg_ms, 0) / stats.length)}ms`
                : "—"}
            </Text>
            <Text style={sp.kpiLabel}>متوسط التحميل</Text>
          </View>
          <View style={sp.kpiCard}>
            <Text style={[sp.kpiValue, { color: "#7C3AED" }]}>
              {stats.reduce((s, r) => s + (r.cached_loads || 0), 0)}
            </Text>
            <Text style={sp.kpiLabel}>تحميل من Cache</Text>
          </View>
        </View>

        {/* Cache Control */}
        <View style={sp.section}>
          <Text style={sp.sectionTitle}>📦 إدارة الـ Cache</Text>
          <TouchableOpacity style={sp.clearBtn} onPress={handleClearCache}>
            <Text style={sp.clearBtnText}>🗑️ مسح الـ Cache ({Object.keys(CACHE).length} عنصر)</Text>
          </TouchableOpacity>
        </View>

        {/* Performance Table */}
        <View style={sp.section}>
          <Text style={sp.sectionTitle}>📊 أداء الشاشات</Text>
          {loadingStats ? (
            <>
              <SkeletonRow height={50} radius={10} style={{ marginBottom: 8 }} />
              <SkeletonRow height={50} radius={10} style={{ marginBottom: 8 }} />
              <SkeletonRow height={50} radius={10} />
            </>
          ) : stats.length === 0 ? (
            <Text style={sp.emptyText}>لا توجد بيانات بعد — استخدم التطبيق لتظهر الإحصائيات</Text>
          ) : (
            stats.map((row, i) => (
              <View key={i} style={sp.statRow}>
                <View style={sp.statLeft}>
                  <Text style={sp.statScreen}>{row.screen_key}</Text>
                  <Text style={sp.statMeta}>{row.total_loads} تحميل · {row.cached_loads} من Cache</Text>
                </View>
                <View style={sp.statRight}>
                  <Text style={[sp.statMs, { color: getSpeedColor(row.avg_ms) }]}>{row.avg_ms}ms</Text>
                  <Text style={sp.statLabel}>{getSpeedLabel(row.avg_ms)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Skeleton Demo */}
        <View style={sp.section}>
          <Text style={sp.sectionTitle}>🦴 Skeleton Loading — مثال</Text>
          <View style={sp.skeletonDemo}>
            <SkeletonRow width={48} height={48} radius={24} />
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonRow width="70%" height={16} />
              <SkeletonRow width="50%" height={12} />
            </View>
          </View>
          <View style={[sp.skeletonDemo, { marginTop: 8 }]}>
            <SkeletonRow width={48} height={48} radius={24} />
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonRow width="85%" height={16} />
              <SkeletonRow width="40%" height={12} />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const sp = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#0a0a0a" },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#111" },
  back:         { color: "#7C3AED", fontSize: 20 },
  title:        { fontSize: 18, fontWeight: "700", color: "#fff" },
  content:      { padding: 20, gap: 16, paddingBottom: 40 },
  kpiRow:       { flexDirection: "row", gap: 10 },
  kpiCard:      { flex: 1, backgroundColor: "#111", borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#1a1a1a" },
  kpiValue:     { fontSize: 22, fontWeight: "700", color: "#fff" },
  kpiLabel:     { fontSize: 11, color: "#555", marginTop: 4, textAlign: "center" },
  section:      { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#666", textAlign: "right" },
  clearBtn:     { backgroundColor: "#1a0a0a", borderWidth: 1, borderColor: "#ef4444", borderRadius: 12, padding: 14, alignItems: "center" },
  clearBtnText: { color: "#ef4444", fontWeight: "600" },
  statRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#111", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#1a1a1a" },
  statLeft:     { flex: 1 },
  statScreen:   { color: "#fff", fontSize: 13, fontWeight: "500", textAlign: "right" },
  statMeta:     { color: "#555", fontSize: 11, textAlign: "right", marginTop: 2 },
  statRight:    { alignItems: "flex-end" },
  statMs:       { fontSize: 18, fontWeight: "700" },
  statLabel:    { fontSize: 11, color: "#555" },
  emptyText:    { color: "#444", textAlign: "center", fontSize: 13, padding: 20 },
  skeletonDemo: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#111", borderRadius: 12, padding: 14 },
});