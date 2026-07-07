// components/Collab
// components/CollaborationSidebar.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Dimensions,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useMember } from '../Contexts/memberContext';
import { useComment } from '../Contexts/commentContext';
import { useAuth } from '../Contexts/Authcontext';
const COLORS = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  purple: '#6C5CE7',
  gold: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  textMuted: '#4F5E7B',
  online: '#10B981',
};
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.86;
// ─── Local type — move to global types.ts once backend activity logging exists ───
interface ActivityEvent {
  id: string;
  actorName: string;
  action: string;
  timestamp: string;
}
const MOCK_ACTIONS = [
  'adjusted playback speed to 2x',
  'changed crop format to 1:1',
  'changed crop format to 16:9',
  'added a text overlay',
  'trimmed a clip',
];
// ─── Simulated presence hook — swap internals for real socket payload later ───
function useSimulatedPresence(projectId: string, members: any[]) {
  const { setMemberOnline } = useMember();
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  useEffect(() => {
    if (!members.length) return;
    const interval = setInterval(() => {
      const target = members[Math.floor(Math.random() * members.length)];
      if (!target) return;
      // flip presence occasionally
      if (Math.random() > 0.6) {
        setMemberOnline(projectId, target.userId, !target.online);
      }
      // drop a fake activity event
      const action = MOCK_ACTIONS[Math.floor(Math.random() * MOCK_ACTIONS.length)];
      setActivity((prev) => [
        {
          id: `${Date.now()}`,
          actorName: target.name,
          action,
          timestamp: 'Just now',
        },
        ...prev,
      ].slice(0, 20));
    }, 6000);
    return () => clearInterval(interval);
  }, [members, projectId]);
  return activity;
}
interface CollaborationSidebarProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  clipId?: string;
}
export default function CollaborationSidebar({
  visible,
  onClose,
  projectId,
  clipId,
}: CollaborationSidebarProps) {
  const { getMembersForProject } = useMember();
  const { getCommentsForClip, addComment } = useComment();
  const { user } = useAuth();
  const members = getMembersForProject(projectId);
  const comments = clipId ? getCommentsForClip(projectId, clipId) : [];
  const activity = useSimulatedPresence(projectId, members);
  const [tab, setTab] = useState<'chat' | 'activity'>('chat');
  const [message, setMessage] = useState('');
  const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : SIDEBAR_WIDTH,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [visible]);
  const handleSend = async () => {
    if (!message.trim() || !clipId) return;
    await addComment(projectId, clipId, message.trim());
    setMessage('');
  };
  if (!visible) return null;
  const onlineCount = members.filter((m) => m.online).length;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.sidebar,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="chatbubble-outline" size={scale(18)} color={COLORS.purple} />
            <Text style={styles.headerTitle}>Collaboration Desk</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={scale(22)} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        {/* Active members */}
        <View style={styles.activeSection}>
          <View style={styles.activeSectionHeader}>
            <Text style={styles.sectionLabel}>ACTIVE IN PROJECT</Text>
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineBadgeText}>{onlineCount} online</Text>
            </View>
          </View>
          <ScrollView style={{ maxHeight: verticalScale(140) }}>
            {members.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <View style={[styles.avatar, { backgroundColor: m.color }]}>
                  <Text style={styles.avatarText}>{m.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>
                    {m.name} {m.userId === user?.id ? '(You)' : ''}
                  </Text>
                  <Text style={styles.memberRole}>{m.role}</Text>
                </View>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: m.online ? COLORS.online : COLORS.textMuted },
                  ]}
                />
              </View>
            ))}
          </ScrollView>
        </View>
        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'chat' && styles.tabBtnActive]}
            onPress={() => setTab('chat')}
          >
            <Text style={[styles.tabText, tab === 'chat' && styles.tabTextActive]}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'activity' && styles.tabBtnActive]}
            onPress={() => setTab('activity')}
          >
            <Text style={[styles.tabText, tab === 'activity' && styles.tabTextActive]}>Activity</Text>
          </TouchableOpacity>
        </View>
        {/* Body */}
        {tab === 'chat' ? (
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: verticalScale(8) }}>
            {comments.map((c) => (
              <View key={c.id} style={styles.activityRow}>
                <View style={[styles.avatarSmall, { backgroundColor: c.color }]}>
                  <Text style={styles.avatarTextSmall}>{c.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityText}>
                    <Text style={styles.activityActor}>{c.author} </Text>
                    {c.text}
                  </Text>
                  <Text style={styles.activityTime}>{c.timestamp}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: verticalScale(8) }}>
            {activity.map((a) => (
              <View key={a.id} style={styles.activityRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityText}>
                    <Text style={styles.activityActor}>{a.actorName} </Text>
                    {a.action}
                  </Text>
                  <Text style={styles.activityTime}>{a.timestamp}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
        {/* Chat input — only relevant on chat tab */}
        {tab === 'chat' && (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Leave a comment/feedback..."
              placeholderTextColor={COLORS.textMuted}
              value={message}
              onChangeText={setMessage}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend} hitSlop={8}>
              <Ionicons name="send" size={scale(16)} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
}


const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: COLORS.background,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    paddingTop: verticalScale(50),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  headerTitle: { color: COLORS.textPrimary, fontSize: moderateScale(16), fontWeight: '700' },
  activeSection: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  sectionLabel: { color: COLORS.textMuted, fontSize: moderateScale(11), fontWeight: '700', letterSpacing: 0.5 },
  onlineBadge: {
    backgroundColor: COLORS.purple,
    borderRadius: scale(10),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
  },
  onlineBadgeText: { color: COLORS.textPrimary, fontSize: moderateScale(10), fontWeight: '600' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(6),
    gap: scale(10),
  },
  avatar: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: moderateScale(12), fontWeight: '700' },
  memberName: { color: COLORS.textPrimary, fontSize: moderateScale(13), fontWeight: '600' },
  memberRole: { color: COLORS.textSecondary, fontSize: moderateScale(11) },
  statusDot: { width: scale(8), height: scale(8), borderRadius: scale(4) },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(10),
    gap: scale(8),
  },
  tabBtn: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    borderRadius: scale(14),
    backgroundColor: COLORS.surface,
  },
  tabBtnActive: { backgroundColor: COLORS.purple },
  tabText: { color: COLORS.textSecondary, fontSize: moderateScale(12), fontWeight: '600' },
  tabTextActive: { color: COLORS.textPrimary },
  body: { flex: 1, paddingHorizontal: scale(16), paddingTop: verticalScale(10) },
  activityRow: {
    flexDirection: 'row',
    gap: scale(8),
    paddingVertical: verticalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarSmall: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextSmall: { color: '#FFF', fontSize: moderateScale(10), fontWeight: '700' },
  activityText: { color: COLORS.textSecondary, fontSize: moderateScale(13) },
  activityActor: { color: COLORS.textPrimary, fontWeight: '700' },
  activityTime: { color: COLORS.textMuted, fontSize: moderateScale(10), marginTop: verticalScale(2) },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(12),
    gap: scale(8),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: scale(18),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    color: COLORS.textPrimary,
    fontSize: moderateScale(13),
  },
  sendBtn: {
    backgroundColor: COLORS.purple,
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    alignItems: 'center',
    justifyContent: 'center',
  },
});