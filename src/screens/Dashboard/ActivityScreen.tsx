
import React from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ms, s, vs } from 'react-native-size-matters'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useNotification } from '../Contexts/notificatinContext'
import { useProject } from '../Contexts/projectContext'
import { useAuth } from '../Contexts/Authcontext'
import { projectService } from '../services/projectservice'
import { Notification, NotificationType } from '../types'

// Matches the Notifications Figma: dark feed, yellow accents, real events only.
const C = {
  bg: '#111111',
  accent: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  divider: '#2A2A2A',
  filterActive: '#F5C518',
  filterActiveTxt: '#000000',
  filterInactive: '#1E1E1E',
  filterInactiveTxt: '#CCCCCC',
  unreadDot: '#F5C518',
} as const

/** Design filters — Mentions reserved until @mentions exist (stays empty). */
type FilterTab = 'All' | 'Mentions' | 'Comments' | 'Invites'
const FILTER_TABS: FilterTab[] = ['All', 'Mentions', 'Comments', 'Invites']

const AVATAR_COLORS = [
  '#E05C5C',
  '#3DBFBF',
  '#9B59B6',
  '#E0A95C',
  '#4CAF50',
  '#5C7CE0',
]

const TYPE_PROJECT_ICON: Record<
  NotificationType,
  keyof typeof Ionicons.glyphMap
> = {
  comment: 'chatbubble-outline',
  invite: 'people-outline',
  clip_upload: 'cloud-upload-outline',
  role_change: 'checkmark-circle-outline',
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function colorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i) * 17) % 997
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function timeAgo(dateStr: string): string {
  const ts = Date.parse(dateStr)
  if (Number.isNaN(ts)) return ''
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600)
    return h === 1 ? '1 hr ago' : `${h} hr ago`
  }
  if (diffSec < 86400 * 2) return 'Yesterday'
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`
  return new Date(ts).toLocaleDateString()
}

function matchesFilter(n: Notification, tab: FilterTab): boolean {
  if (tab === 'All') return true
  // Mentions: no backend type yet — never invent rows.
  if (tab === 'Mentions') return false
  if (tab === 'Comments') return n.type === 'comment'
  if (tab === 'Invites') return n.type === 'invite'
  return true
}

const NotifCard: React.FC<{
  item: Notification
  onPress: () => void
}> = ({ item, onPress }) => {
  const name = item.title?.trim() || 'Someone'
  const initials = initialsFromName(name)
  const avatarBg = colorFromName(name)
  const projectLabel = item.projectName?.trim()

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatarCol}>
        <View style={[styles.unreadDot, { opacity: item.read ? 0 : 1 }]} />
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <Text style={styles.nameText} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
        </View>

        <Text style={styles.actionText}>{item.message}</Text>

        {!!projectLabel && (
          <View style={styles.projectRow}>
            <Ionicons
              name={TYPE_PROJECT_ICON[item.type]}
              size={ms(13)}
              color={C.accent}
            />
            <Text style={styles.projectLink} numberOfLines={1}>
              {projectLabel}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const ActivityScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const { token } = useAuth()
  const { projects, setCurrentProject } = useProject()
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
  } = useNotification()
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>('All')
  const [refreshing, setRefreshing] = React.useState(false)

  useFocusEffect(
    React.useCallback(() => {
      fetchNotifications()
    }, [fetchNotifications])
  )

  // Strictly API rows — no placeholders, demos, or invented activity.
  const filtered = notifications.filter((n) => matchesFilter(n, activeFilter))

  const openProject = async (projectId: string, preferTeam = false) => {
    try {
      let project = projects.find((p) => p.id === projectId)
      if (!project && token) {
        project = await projectService.getProjectById(projectId, token)
      }
      if (!project) {
        Alert.alert('Project unavailable', 'This project could not be opened.')
        return
      }
      setCurrentProject(project)
      if (preferTeam) {
        navigation.navigate('teammember', { projectId: project.id })
      } else {
        navigation.navigate('projectdetail')
      }
    } catch (e: any) {
      Alert.alert('Couldn’t open', e?.message || 'Try again from Projects.')
    }
  }

  const handleCardPress = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    if (!notification.projectId) return
    const preferTeam =
      notification.type === 'invite' || notification.type === 'role_change'
    await openProject(notification.projectId, preferTeam)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchNotifications()
    } finally {
      setRefreshing(false)
    }
  }

  const showEmpty = !isLoading && filtered.length === 0

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity
            onPress={markAllAsRead}
            disabled={notifications.length === 0}
          >
            <Text
              style={[
                styles.markAllRead,
                notifications.length === 0 && styles.markAllReadDisabled,
              ]}
            >
              Mark all read
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerDivider} />

        {/* Fixed-height strip — horizontal ScrollView must not stretch tall */}
        <View style={styles.filterWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
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
        </View>

        <ScrollView
          style={styles.listScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.accent}
            />
          }
        >
          {isLoading && notifications.length === 0 && (
            <Text style={styles.emptyText}>Loading…</Text>
          )}

          {showEmpty && (
            <View style={styles.emptyState}>
              <Ionicons
                name="notifications-off-outline"
                size={ms(40)}
                color={C.textSecondary}
              />
              <Text style={styles.emptyTitle}>
                {activeFilter === 'All'
                  ? 'No notifications yet'
                  : `No ${activeFilter.toLowerCase()} yet`}
              </Text>
              <Text style={styles.emptySubtitle}>
                When teammates invite you, comment, or upload clips, it shows up
                here.
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
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
  markAllReadDisabled: {
    opacity: 0.35,
  },
  headerDivider: {
    height: 1,
    backgroundColor: C.divider,
    marginBottom: vs(12),
  },
  filterWrap: {
    height: vs(44),
    marginBottom: vs(4),
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(18),
    gap: s(8),
    height: vs(44),
  },
  filterPill: {
    height: vs(32),
    paddingHorizontal: s(14),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  filterText: {
    fontSize: ms(12),
    lineHeight: ms(16),
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: s(18),
    paddingBottom: vs(40),
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    paddingVertical: vs(14),
    gap: s(12),
  },
  avatarCol: {
    alignItems: 'center',
    width: s(44),
  },
  unreadDot: {
    width: s(6),
    height: s(6),
    borderRadius: s(3),
    backgroundColor: C.unreadDot,
    marginBottom: vs(4),
  },
  avatar: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: ms(13),
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
    paddingRight: s(2),
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(3),
    gap: s(8),
  },
  nameText: {
    color: C.textPrimary,
    fontSize: ms(14),
    fontWeight: '700',
    flex: 1,
  },
  timeText: {
    color: C.textSecondary,
    fontSize: ms(11),
  },
  actionText: {
    color: C.textSecondary,
    fontSize: ms(13),
    lineHeight: ms(18),
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    marginTop: vs(6),
  },
  projectLink: {
    color: C.accent,
    fontSize: ms(13),
    fontWeight: '600',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: C.divider,
    marginLeft: s(56),
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: vs(72),
    paddingHorizontal: s(28),
  },
  emptyTitle: {
    color: C.textPrimary,
    fontSize: ms(16),
    fontWeight: '700',
    marginTop: vs(14),
  },
  emptySubtitle: {
    color: C.textSecondary,
    fontSize: ms(13),
    textAlign: 'center',
    marginTop: vs(6),
    lineHeight: ms(18),
  },
  emptyText: {
    color: C.textSecondary,
    textAlign: 'center',
    marginTop: vs(40),
  },
})
