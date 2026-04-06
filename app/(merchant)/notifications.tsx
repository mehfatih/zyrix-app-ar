// app/(merchant)/notifications.tsx
import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  I18nManager,
  SafeAreaView,
  Alert,
} from 'react-native'
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { notificationsApi } from '../../services/api'
import { InnerHeader } from '../../components/InnerHeader';

const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifType = 'payment' | 'settlement' | 'dispute' | 'refund' | 'security' | 'system'
type FilterKey = 'all' | NotifType

interface Notification {
  id: string
  type: NotifType
  title: string
  body: string
  time: string
  read: boolean
  amount?: number
  currency?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeConfig(type: NotifType): { icon: string; color: string; bg: string } {
  switch (type) {
    case 'payment':    return { icon: '💳', color: COLORS.primary,      bg: COLORS.primaryLight }
    case 'settlement': return { icon: '🏦', color: COLORS.success,      bg: COLORS.successBg }
    case 'dispute':    return { icon: '⚠️',  color: COLORS.warning,      bg: COLORS.warningBg }
    case 'refund':     return { icon: '↩',  color: COLORS.danger,       bg: COLORS.dangerBg  }
    case 'security':   return { icon: '🔐', color: COLORS.products.crypto, bg: COLORS.infoBg           }
    case 'system':     return { icon: '⚙️',  color: COLORS.textMuted,    bg: COLORS.cardBg      }
  }
}

// ─── NotifCard ────────────────────────────────────────────────────────────────

function NotifCard({
  notif,
  onPress,
  onMarkRead,
}: {
  notif: Notification
  onPress: (id: string) => void
  onMarkRead: (id: string) => void
}) {
  const cfg = typeConfig(notif.type)

  return (
    <TouchableOpacity
      style={[cardS.container, !notif.read && cardS.containerUnread]}
      onPress={() => onPress(notif.id)}
      onLongPress={() => onMarkRead(notif.id)}
      activeOpacity={0.72}
    >
      {/* Unread dot */}
      {!notif.read && <View style={cardS.unreadDot} />}

      {/* Icon bubble */}
      <View style={[cardS.iconBubble, { backgroundColor: cfg.bg }]}>
        <Text style={cardS.iconText}>{cfg.icon}</Text>
      </View>

      {/* Content */}
      <View style={[cardS.content, isRTL && cardS.contentRTL]}>
        <View style={[cardS.topRow, isRTL && cardS.topRowRTL]}>
          <Text
            style={[cardS.title, !notif.read && cardS.titleUnread, isRTL && cardS.titleRTL]}
            numberOfLines={1}
          >
            {notif.title}
          </Text>
          <Text style={cardS.time}>{notif.time}</Text>
        </View>

        <Text
          style={[cardS.body, isRTL && cardS.bodyRTL]}
          numberOfLines={2}
        >
          {notif.body}
        </Text>

        {/* Amount pill */}
        {notif.amount !== undefined && (
          <View style={[cardS.amountRow, isRTL && cardS.amountRowRTL]}>
            <View style={[cardS.amountPill, { borderColor: cfg.color }]}>
              <Text style={[cardS.amountText, { color: cfg.color }]}>
                {notif.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                {notif.currency}
              </Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const tabBarHeight = useTabBarHeight();
  const { t } = useTranslation()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<FilterKey>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      const data = await notificationsApi.list()
      setNotifications(data.notifications)
    } catch (err) { console.warn(err) }
    finally { setLoading(false); setRefreshing(false) }
  }

  React.useEffect(() => { fetchData() }, [])
  const onRefresh = () => { setRefreshing(true); fetchData() }

  const unreadCount = notifications.filter((n) => !n.read).length

  const FILTERS: { key: FilterKey; label: string; icon: string }[] = [
    { key: 'all',        label: t('notifications.filter_all'),        icon: '🔔' },
    { key: 'payment',    label: t('notifications.filter_payment'),    icon: '💳' },
    { key: 'settlement', label: t('notifications.filter_settlement'), icon: '🏦' },
    { key: 'dispute',    label: t('notifications.filter_dispute'),    icon: '⚠️'  },
    { key: 'refund',     label: t('notifications.filter_refund'),     icon: '↩'  },
    { key: 'security',   label: t('notifications.filter_security'),   icon: '🔐' },
  ]

  const filtered = useMemo(
    () => notifications.filter((n) => filter === 'all' || n.type === filter),
    [notifications, filter],
  )

  const handlePress = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
    const notif = notifications.find((n) => n.id === id)
    if (notif) Alert.alert(notif.title, notif.body)
  }

  const handleMarkRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }

  const handleMarkAllRead = () => {
    notificationsApi.markAllRead().catch(() => {})
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  // ── Render ──

  const renderHeader = () => (
    <>


      {/* Filter tabs — 2 rows of 3 */}
      <View style={styles.filterWrapper}>
        <View style={styles.filterGrid}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterTab,
                filter === f.key && styles.filterTabActive,
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={styles.filterIcon}>{f.icon}</Text>
              <Text
                style={[
                  styles.filterTabText,
                  filter === f.key && styles.filterTabTextActive,
                ]}
                numberOfLines={1}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔕</Text>
      <Text style={styles.emptyText}>{t('notifications.empty')}</Text>
    </View>
  )

  // Group into unread / earlier
  const unread  = filtered.filter((n) => !n.read)
  const read    = filtered.filter((n) =>  n.read)

  const renderGrouped = () => (
    <>
      {renderHeader()}
      {unread.length > 0 && (
        <>
          <Text style={[styles.groupLabel, isRTL && styles.groupLabelRTL]}>
            {t('notifications.unread')} ({unread.length})
          </Text>
          {unread.map((n) => (
            <NotifCard key={n.id} notif={n} onPress={handlePress} onMarkRead={handleMarkRead} />
          ))}
        </>
      )}
      {read.length > 0 && (
        <>
          <Text style={[styles.groupLabel, isRTL && styles.groupLabelRTL]}>
            {t('notifications.earlier')}
          </Text>
          {read.map((n) => (
            <NotifCard key={n.id} notif={n} onPress={handlePress} onMarkRead={handleMarkRead} />
          ))}
        </>
      )}
      {filtered.length === 0 && renderEmpty()}
    </>
  )

  return (
    <SafeAreaView style={styles.safeArea}>
      <InnerHeader title={t('notifications.title')} accentColor="#3B82F6" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderGrouped()}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  listContent: {
    paddingBottom: tabBarHeight,
  },

  // Header
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.deepBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRowRTL: {
    flexDirection: 'row-reverse',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleRowRTL: {
    flexDirection: 'row-reverse',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  badge: {
    backgroundColor: COLORS.danger,
    borderRadius: 20,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryLight,
  },

  // Filters — 2 rows x 3 columns grid
  filterWrapper: {
    backgroundColor: COLORS.surfaceBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  filterTab: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    width: '30%',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: COLORS.primaryLight,
  },
  filterIcon: {
    fontSize: 14,
  },
  filterTabText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },

  // Group labels
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 6,
    marginLeft: 20,
  },
  groupLabelRTL: {
    textAlign: 'right',
    marginLeft: 0,
    marginRight: 20,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
})

const cardS = StyleSheet.create({
  container: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
    position: 'relative',
  },
  containerUnread: {
    backgroundColor: COLORS.surfaceBg,
  },
  unreadDot: {
    position: 'absolute',
    top: 18,
    left: isRTL ? undefined : 6,
    right: isRTL ? 6 : undefined,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primaryLight,
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  contentRTL: {
    alignItems: 'flex-end',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  topRowRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    flex: 1,
  },
  titleUnread: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  titleRTL: {
    textAlign: 'right',
  },
  time: {
    fontSize: 11,
    color: COLORS.textMuted,
    flexShrink: 0,
  },
  body: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  bodyRTL: {
    textAlign: 'right',
  },
  amountRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  amountRowRTL: {
    flexDirection: 'row-reverse',
  },
  amountPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  amountText: {
    fontSize: 12,
    fontWeight: '700',
  },
})