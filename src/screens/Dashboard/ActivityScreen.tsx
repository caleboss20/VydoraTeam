
import React from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ms, s, vs } from 'react-native-size-matters'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNotification } from '../Contexts/notificatinContext'
import { Notification, NotificationType } from '../types'
// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg: '#111111',
  surface: '#1A1A1A',
  accent: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  textLink: '#F5C518',
  divider: '#2A2A2A',
  filterActive: '#F5C518',
  filterActiveTxt: '#000000',
  filterInactive: '#1E1E1E',
  filterInactiveTxt: '#CCCCCC',
  unreadDot: '#F5C518',
} as const
// ─── Filter Tabs (mapped to real NotificationType) ──────────────────────────
type FilterTab = 'All' | 'Comments' | 'Invites' | 'Clips'
const FILTER_TABS: FilterTab[] = ['All', 'Comments', 'Invites', 'Clips']
const FILTER_TO_TYPE: Record<FilterTab, NotificationType | null> = {
  All: null,
  Comments: 'comment',
  Invites: 'invite',
  Clips: 'clip_upload',
}
// ─── Icon + color per real notification type ────────────────────────────────
const TYPE_ICON: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  comment: 'chatbubble-outline',
  invite: 'person-add-outline',
  clip_upload: 'cloud-upload-outline',
  role_change: 'swap-horizontal-outline',
}
const TYPE_COLOR: Record<NotificationType, string> = {
  comment: '#3DBFBF',
  invite: '#9B59B6',
  clip_upload: '#E0A95C',
  role_change: '#E05C5C',
}
// ─── Helper: relative time ───────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  // TWEAK: createdAt currently mock string like "2h ago" already —
  // if backend sends ISO date later, replace this with real diffing logic
  return dateStr
}
// ─── Sub-component ───────────────────────────────────────────────────────────
const NotifCard: React.FC<{
  item: Notification
  onPress: () => void
}> = ({ item, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.avatarCol}>
      <View style={[styles.unreadDot, { opacity: item.read ? 0 : 1 }]} />
      <View style={[styles.avatar, { backgroundColor: TYPE_COLOR[item.type] }]}>
        <Ionicons name={TYPE_ICON[item.type]} size={ms(16)} color="#fff" />
      </View>
    </View>
    <View style={styles.cardContent}>
      <View style={styles.cardTopRow}>
        <Text style={styles.nameText}>{item.title}</Text>
        <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
      </View>
      <Text style={styles.actionText}>{item.message}</Text>
    </View>
  </TouchableOpacity>
)
// ─── Main Screen ─────────────────────────────────────────────────────────────
const ActivityScreen: React.FC = () => {
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotification()
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>('All')
  const filtered = notifications.filter((n) => {
    const wantedType = FILTER_TO_TYPE[activeFilter]
    if (wantedType === null) return true
    return n.type === wantedType
  })
  const handleCardPress = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    // TWEAK: navigate to notification.projectId once project navigation
    // from notifications is wired (e.g. navigation.navigate('projectdetail', { id: notification.projectId }))
  }
  return (
    <SafeAreaView style={styles.container}>
      <View>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllRead}>Mark all read</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerDivider} />
        {/* ── Filter Pills ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveFilter(tab)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive
                      ? C.filterActive
                      : C.filterInactive,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: isActive ? C.filterActiveTxt : C.filterInactiveTxt,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
        {/* ── Notification List ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {isLoading && notifications.length === 0 && (
            <Text style={styles.emptyText}>Loading notifications...</Text>
          )}
          {!isLoading && filtered.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={ms(40)} color={C.textSecondary} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>
                You'll see comments, invites and updates here as they happen
              </Text>
            </View>
          )}
          {filtered.map((item, index) => (
            <View key={item.id}>
              <NotifCard item={item} onPress={() => handleCardPress(item)} />
              {index < filtered.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}
export default ActivityScreen
// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(18),
    paddingTop: vs(24),
    paddingBottom: vs(14),
  },
  headerTitle: {
    color: C.textPrimary,
    fontSize: ms(22),
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  markAllRead: {
    color: C.accent,
    fontSize: ms(13),
    fontWeight: '600',
  },
  headerDivider: {
    height: 1,
    backgroundColor: C.divider,
    marginHorizontal: s(0),
  },
  // Filter pills
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: s(16),
    paddingVertical: vs(14),
    gap: s(18),
    marginBottom:s(20),
  },
  filterPill: {
    paddingHorizontal: s(16),
    paddingVertical: vs(7),
    borderRadius: ms(20),
  },
  filterText: {
    fontSize: ms(13),
  },
  emptyText:{

  },
  // List
  listContent: {
    paddingHorizontal: s(16),
    paddingBottom: vs(24),
    gap:s(20),
  },
  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: vs(14),
    gap: s(14),
  },
  avatarCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  unreadDot: {
    width: ms(7),
    height: ms(7),
    borderRadius: ms(4),
    backgroundColor: C.unreadDot,
  },
  avatar: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: ms(13),
    fontWeight: '700',
  },
  typeBadge: {
    position: 'absolute',
    bottom: -ms(2),
    right: -ms(2),
    width: ms(16),
    height: ms(16),
    borderRadius: ms(8),
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.bg,
  },
  cardContent: {
    flex: 1,
    gap: vs(3),
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameText: {
    color: C.textPrimary,
    fontSize: ms(14),
    fontWeight: '700',
  },
  timeText: {
    color: C.textSecondary,
    fontSize: ms(11),
  },
  actionText: {
    color: C.textSecondary,
    fontSize: ms(12),
    lineHeight: ms(18),
  },
  projectLink: {
    color: C.textLink,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: C.divider,
  },

  //empty state//
   emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: vs(100),
    paddingHorizontal: s(32),
  },
  emptyTitle: {
    color: C.textPrimary,
    fontSize: ms(23),
    fontWeight: '600',
    marginTop: vs(12),
  },
  emptySubtitle: {
    color: C.textSecondary,
    fontSize: ms(13),
    textAlign: 'center',
    marginTop: vs(10),
    lineHeight: ms(19),
  },
})