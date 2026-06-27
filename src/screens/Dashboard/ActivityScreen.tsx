
import React, { useState } from 'react'
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
// ─── Types ───────────────────────────────────────────────────────────────────
type FilterTab = 'All' | 'Mentions' | 'Comments' | 'Invites'
type NotifType = 'comment' | 'invite' | 'resolve' | 'mention' | 'export' | 'upload'
type Notification = {
  id: string
  name: string
  initials: string
  avatarColor: string
  type: NotifType
  action: string
  project: string
  time: string
  unread: boolean
}
// ─── Icon map per notification type ─────────────────────────────────────────
const TYPE_ICON: Record<NotifType, keyof typeof Ionicons.glyphMap> = {
  comment: 'chatbubble-outline',
  invite: 'person-add-outline',
  resolve: 'checkmark-outline',
  mention: 'at-outline',
  export: 'download-outline',
  upload: 'cloud-upload-outline',
}
// ─── Mock Data ───────────────────────────────────────────────────────────────
const NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    name: 'Maya Alvarez',
    initials: 'MA',
    avatarColor: '#E05C5C',
    type: 'comment',
    action: 'commented on your clip at 0:24',
    project: 'Summer campaign',
    time: '5 min ago',
    unread: true,
  },
  {
    id: '2',
    name: 'Jay Reyes',
    initials: 'JR',
    avatarColor: '#3DBFBF',
    type: 'invite',
    action: 'invited you to collaborate on',
    project: 'Product launch teaser',
    time: '32 min ago',
    unread: true,
  },
  {
    id: '3',
    name: 'Sam Khan',
    initials: 'SK',
    avatarColor: '#9B59B6',
    type: 'resolve',
    action: 'resolved a comment you made in',
    project: 'Behind the scenes',
    time: '1 hr ago',
    unread: true,
  },
  {
    id: '4',
    name: 'Maya Alvarez',
    initials: 'MA',
    avatarColor: '#E05C5C',
    type: 'mention',
    action: 'mentioned you in a comment in',
    project: 'Summer campaign',
    time: '3 hr ago',
    unread: false,
  },
  {
    id: '5',
    name: 'Jay Reyes',
    initials: 'JR',
    avatarColor: '#3DBFBF',
    type: 'export',
    action: 'exported a new version of',
    project: 'Product launch teaser',
    time: 'Yesterday',
    unread: false,
  },
  {
    id: '6',
    name: 'Sam Khan',
    initials: 'SK',
    avatarColor: '#9B59B6',
    type: 'upload',
    action: 'uploaded 3 new clips to',
    project: 'Summer campaign',
    time: 'Yesterday',
    unread: false,
  },
]

const FILTER_TABS: FilterTab[] = ['All', 'Mentions', 'Comments', 'Invites']
// ─── Sub-components ──────────────────────────────────────────────────────────
type NotifCardProps = {
  item: Notification
}
const NotifCard: React.FC<NotifCardProps> = ({ item }) => (
  <View style={styles.card}>
    {/* Unread dot + Avatar */}
    <View style={styles.avatarCol}>
      <View
        style={[
          styles.unreadDot,
          { opacity: item.unread ? 1 : 0 },
        ]}
      />
      <View
        style={[styles.avatar, { backgroundColor: item.avatarColor }]}
      >
        <Text style={styles.avatarText}>{item.initials}</Text>
        {/* Type badge icon */}
        <View style={styles.typeBadge}>
          <Ionicons
            name={TYPE_ICON[item.type]}
            size={ms(9)}
            color="#fff"
          />
        </View>
      </View>
    </View>
    {/* Text content */}
    <View style={styles.cardContent}>
      <View style={styles.cardTopRow}>
        <Text style={styles.nameText}>{item.name}</Text>
        <Text style={styles.timeText}>{item.time}</Text>
      </View>
      <Text style={styles.actionText}>
        {item.action}{' '}
        <Text style={styles.projectLink}>{item.project}</Text>
      </Text>
    </View>
  </View>
)
// ─── Main Screen ─────────────────────────────────────────────────────────────
const ActivityScreen: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All')
  const filtered = NOTIFICATIONS.filter((n) => {
    if (activeFilter === 'All') return true
    if (activeFilter === 'Mentions') return n.type === 'mention'
    if (activeFilter === 'Comments') return n.type === 'comment'
    if (activeFilter === 'Invites') return n.type === 'invite'
    return true
  })
  return (
  <SafeAreaView style={styles.container}>
      <View >
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity>
          <Text style={styles.markAllRead}>Mark all read</Text>
        </TouchableOpacity>
      </View>
      {/* ── Divider ── */}
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
                    color: isActive
                      ? C.filterActiveTxt
                      : C.filterInactiveTxt,
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
        {filtered.map((item, index) => (
          <View key={item.id}>
            <NotifCard item={item} />
            {index < filtered.length - 1 && (
              <View style={styles.divider} />
            )}
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
    gap: s(8),
  },
  filterPill: {
    paddingHorizontal: s(16),
    paddingVertical: vs(7),
    borderRadius: ms(20),
  },
  filterText: {
    fontSize: ms(13),
  },
  // List
  listContent: {
    paddingHorizontal: s(16),
    paddingBottom: vs(24),
  },
  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: vs(14),
    gap: s(12),
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
})