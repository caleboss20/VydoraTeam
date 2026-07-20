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
import { useMessage } from '../Contexts/messageContext';
import { useAuth } from '../Contexts/Authcontext';
const COLORS = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#c39a07',
  gold: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  textMuted: '#4F5E7B',
  online: '#10B981',
};
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.86;
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
  const { getCommentsForProject } = useComment();
  const {
    getMessagesForProject,
    fetchMessages,
    sendMessage,
    markProjectRead,
  } = useMessage();
  const { user } = useAuth();
  const members = getMembersForProject(projectId);
  // Chat = project-wide group chat; Activity = real clip comments/feedback.
  const messages = getMessagesForProject(projectId);
  const comments = getCommentsForProject(projectId);
  const [tab, setTab] = useState<'chat' | 'activity'>('chat');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const chatScrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : SIDEBAR_WIDTH,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [visible]);
  // Load history + clear the unread badge whenever the panel opens.
  useEffect(() => {
    if (visible && projectId) {
      fetchMessages(projectId);
      markProjectRead(projectId);
    }
  }, [visible, projectId]);
  // Clear unread as new messages stream in while the panel is open.
  useEffect(() => {
    if (visible && projectId) markProjectRead(projectId);
  }, [messages.length, visible, projectId]);
  // Keep the chat pinned to the newest message.
  useEffect(() => {
    if (visible && tab === 'chat') {
      requestAnimationFrame(() => chatScrollRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length, visible, tab]);
  const handleSend = async () => {
    const text = message.trim();
    if (!text || sending) return;
    setMessage('');
    try {
      setSending(true);
      await sendMessage(projectId, text);
    } catch {
      // Restore the text so the user can retry on failure.
      setMessage(text);
    } finally {
      setSending(false);
    }
  };
  if (!visible) return null;
  const onlineCount = members.filter((m) => m.online).length;
  return (
    <View style={[StyleSheet.absoluteFill,{zIndex:999,elevation:999}]} pointerEvents="box-none">
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
            <Ionicons name="chatbubble-outline" size={scale(18)} color={COLORS.yellow} />
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
          <ScrollView
            ref={chatScrollRef}
            style={styles.body}
            contentContainerStyle={{ paddingBottom: verticalScale(8) }}
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.length === 0 ? (
              <Text style={styles.emptyHint}>
                No messages yet. Say hi to your team.
              </Text>
            ) : (
              messages.map((m) => {
                const mine = m.userId === user?.id;
                return (
                  <View key={m.id} style={styles.activityRow}>
                    <View style={[styles.avatarSmall, { backgroundColor: m.color }]}>
                      <Text style={styles.avatarTextSmall}>{m.initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityText}>
                        <Text style={styles.activityActor}>
                          {mine ? 'You' : m.author}{' '}
                        </Text>
                        {m.text}
                      </Text>
                      <Text style={styles.activityTime}>{m.timestamp}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        ) : (
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: verticalScale(8) }}>
            {comments.length === 0 ? (
              <Text style={styles.emptyHint}>
                No clip feedback yet. Comments on clips show up here.
              </Text>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={styles.activityRow}>
                  <View style={[styles.avatarSmall, { backgroundColor: c.color }]}>
                    <Text style={styles.avatarTextSmall}>{c.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityText}>
                      <Text style={styles.activityActor}>{c.author} </Text>
                      {c.text}
                      {c.timecodeLabel ? (
                        <Text style={styles.activityTime}> @ {c.timecodeLabel}</Text>
                      ) : null}
                    </Text>
                    <Text style={styles.activityTime}>{c.timestamp}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
        {/* Chat input — only relevant on chat tab */}
        {tab === 'chat' && (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Message your team..."
              placeholderTextColor={COLORS.textMuted}
              value={message}
              onChangeText={setMessage}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!sending}
            />
            <TouchableOpacity
              style={[styles.sendBtn, sending && { opacity: 0.5 }]}
              onPress={handleSend}
              disabled={sending}
              hitSlop={8}
            >
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
    backgroundColor: COLORS.yellow,
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
  tabBtnActive: { backgroundColor: COLORS.yellow },
  tabText: { color: COLORS.textSecondary, fontSize: moderateScale(12), fontWeight: '600' },
  tabTextActive: { color: COLORS.textPrimary },
  body: { flex: 1, paddingHorizontal: scale(16), paddingTop: verticalScale(10) },
  emptyHint: {
    color: COLORS.textMuted,
    fontSize: moderateScale(12),
    textAlign: 'center',
    marginTop: verticalScale(24),
    paddingHorizontal: scale(16),
  },
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
    backgroundColor: COLORS.yellow,
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    alignItems: 'center',
    justifyContent: 'center',
  },
});