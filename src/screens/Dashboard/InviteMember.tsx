
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Platform,
Clipboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ms, s, vs } from "react-native-size-matters";
import { useMember } from '../Contexts/memberContext';
import { useProject } from '../Contexts/projectContext';
import { useInvite } from '../Contexts/InviteContext';
import { useAppPalette } from '../Contexts/ThemeContext';
// ---------------------------------------------------------------------------
// Vydora — Invite Member screen
// Collaborative video editor. Dark theme, single yellow accent.
// Full screen (not a modal) — pushed onto the stack from the project view.
// ---------------------------------------------------------------------------
let COLORS = {
  bg: '#1A1A1A',
  surface: '#262626',
  surfaceAlt: '#2E2E2E',
  border: '#3A3A3A',
  yellow: '#F2C200',
  yellowDim: 'rgba(242, 194, 0, 0.12)',
  text: '#FFFFFF',
  textMuted: '#9A9A9A',
  textFaint: '#6B6B6B',
  danger: '#FF6B6B',
  online: '#3DD68C',
};
type Role = 'editor' | 'viewer' | 'admin';
interface RoleOption {
  key: Role;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}
const ROLE_OPTIONS: RoleOption[] = [
  { key: 'editor', label: 'Editor', desc: 'Can edit, comment, and export', icon: 'create-outline' },
  { key: 'viewer', label: 'Viewer', desc: 'Can view and comment only', icon: 'eye-outline' },
  { key: 'admin', label: 'Admin', desc: 'Full access including settings', icon: 'people-outline' },
];
type InviteStatus = 'idle' | 'sending' | 'sent';
function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
export default function InviteMemberScreen({ navigation }: any) {
  const p = useAppPalette();
  COLORS = {
    ...COLORS,
    bg: p.background,
    surface: p.surface,
    surfaceAlt: p.card,
    border: p.border,
    yellow: p.yellow,
    text: p.textPrimary,
    textMuted: p.textSecondary,
    textFaint: p.textMuted,
    danger: p.danger,
    online: p.online ?? COLORS.online,
  };
  styles = makeInviteStyles(COLORS);
  const { inviteMember } = useMember();
  const {sendInvite,isLoading,error,lastInviteLink}=useInvite()
  const { currentProject } = useProject();
  const projectId = currentProject?.id;
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState(false);
  const [role, setRole] = useState<Role>('editor');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<InviteStatus>('idle');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const isAddingRef = useRef(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const sendScale = useRef(new Animated.Value(1)).current;
  const checkAnim = useRef(new Animated.Value(1)).current;
  // Deep link token === projectId (backend invite accept flow).
  const inviteLink = projectId ? `vydora://invite/${projectId}` : 'vydora://invite';
  const shake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };
  const addEmailFromDraft = () => {
    if (isAddingRef.current) return;
    const value = draft.trim().replace(/,$/, '');
    if (!value) return;
    isAddingRef.current = true;
    if (!isValidEmail(value)) {
      setDraftError(true);
      shake();
      isAddingRef.current = false;
      return;
    }
    if (emails.includes(value)) {
      setDraftError(true);
      shake();
      Alert.alert('Already added', 'This email has already been entered.');
      isAddingRef.current = false;
      return;
    }
    setEmails((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setDraft('');
    setDraftError(false);
    setTimeout(() => {
      isAddingRef.current = false;
    }, 0);
  };
  const removeEmail = (target: string) => {
    setEmails((prev) => prev.filter((e) => e !== target));
  };
  const handleDraftChange = (text: string) => {
    setDraftError(false);
    // Pressing comma also commits the chip, mirroring "press Enter after each email"
    if (text.endsWith(',')) {
      setDraft(text);
      setTimeout(() => addEmailFromDraft(), 0);
      return;
    }
    setDraft(text);
  };
  const handleCopyLink = async () => {
    await Clipboard.setString(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const handleSend = async () => {
    if (emails.length === 0) {
      shake();
      return;
    }
    if (status !== 'idle') return;
    if (!projectId) {
      Alert.alert('No project selected', 'Could not find the current project to invite members to.');
      return;
    }
    Animated.sequence([
      Animated.timing(sendScale, { toValue: 0.96, duration: 90, useNativeDriver: true }),
      Animated.timing(sendScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    setStatus('sending');
    try {
      // inviteMember handles one email at a time — fire all invites in this batch together
      const results = await Promise.all(
        emails.map((email) => inviteMember(projectId, email, role))
      );
      const awaitingHost = results.filter((m) => m.status === 'PENDING_APPROVAL').length;
      setStatus('sent');
      checkAnim.setValue(0);
      Animated.spring(checkAnim, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
      if (awaitingHost > 0) {
        Alert.alert(
          'Waiting for host',
          awaitingHost === results.length
            ? 'Your invite request was sent to the project Owner. They’ll Admit or Decline — like Zoom’s waiting room.'
            : `${awaitingHost} invite(s) need Owner approval. The rest were sent.`
        );
      }
      setTimeout(() => {
        setStatus('idle');
        setEmails([]);
        setMessage('');
      }, 3200);
    } catch (e: any) {
      setStatus('idle');
      Alert.alert('Invite failed', e?.message || 'Something went wrong sending these invites. Please try again.');
    }
  };
  const handleClose = () => {
    if (navigation?.goBack) navigation.goBack();
  };
  const sendDisabled = emails.length === 0 || status !== 'idle';
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleClose}
          hitSlop={12}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        >
          <Ionicons name="close" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Invite Member</Text>
        <Pressable
          onPress={handleSend}
          hitSlop={12}
          disabled={sendDisabled}
          style={({ pressed }) => [pressed && !sendDisabled && styles.iconButtonPressed]}
        >
          <Text style={[styles.headerAction, sendDisabled && styles.headerActionDisabled]}>
            {status === 'sending' ? 'Sending…' : status === 'sent' ? 'Sent' : 'Send'}
          </Text>
        </Pressable>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Email addresses */}
        <Text style={styles.sectionLabel}>EMAIL ADDRESSES</Text>
        <Animated.View
          style={[
            styles.emailBox,
            draftError && styles.emailBoxError,
            {
              transform: [
                {
                  translateX: shakeAnim.interpolate({
                    inputRange: [-1, 1],
                    outputRange: [-6, 6],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.chipWrap}>
            {emails.map((email) => (
              <View key={email} style={styles.chip}>
                <Text style={styles.chipText}>{email}</Text>
                <Pressable onPress={() => removeEmail(email)} hitSlop={8} style={styles.chipClose}>
                  <Ionicons name="close" size={14} color={COLORS.yellow} />
                </Pressable>
              </View>
            ))}
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={handleDraftChange}
              onSubmitEditing={addEmailFromDraft}
              placeholder={emails.length === 0 ? 'Add more…' : 'Add more…'}
              placeholderTextColor={COLORS.textFaint}
              style={styles.chipInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="done"
              onBlur={addEmailFromDraft}
            />
          </View>
          <Text style={[styles.hintText, draftError && styles.hintTextError]}>
            {draftError ? 'Enter a valid, unique email' : 'Press Enter after each email'}
          </Text>
        </Animated.View>
        {/* Role */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>ROLE</Text>
        <View style={{ gap: 10 }}>
          {ROLE_OPTIONS.map((opt) => {
            const selected = role === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setRole(opt.key)}
                style={({ pressed }) => [
                  styles.roleCard,
                  selected && styles.roleCardSelected,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={[styles.roleIconWrap, selected && styles.roleIconWrapSelected]}>
                  <Ionicons
                    name={opt.icon}
                    size={18}
                    color={selected ? COLORS.yellow : COLORS.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleLabel}>{opt.label}</Text>
                  <Text style={styles.roleDesc}>{opt.desc}</Text>
                </View>
                <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                  {selected && (
                    <Ionicons name="checkmark" size={14} color={COLORS.bg} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
        {/* Personal message — TWEAK: UI-only for now, not sent to backend (inviteMember has no message param) */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>PERSONAL MESSAGE (OPTIONAL)</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          multiline
          placeholder="Write a short note…"
          placeholderTextColor={COLORS.textFaint}
          style={styles.messageBox}
          maxLength={200}
        />
        <Text style={styles.charCount}>{message.length}/200</Text>
        {/* Invite link — TWEAK: static mocked link, not generated per-project yet */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>OR SHARE INVITE LINK</Text>
        <View style={styles.linkRow}>
          <Ionicons name="link-outline" size={16} color={COLORS.textMuted} />
          <Text style={styles.linkText} numberOfLines={1}>
            {inviteLink}
          </Text>
          <Pressable onPress={handleCopyLink} hitSlop={8}>
            <Text style={styles.copyText}>{copied ? 'Copied!' : 'Copy'}</Text>
          </Pressable>
        </View>
        {/* Send button */}
        <Animated.View style={{ transform: [{ scale: sendScale }], marginTop: 28 }}>
          <Pressable
            onPress={handleSend}
            disabled={sendDisabled}
            style={({ pressed }) => [
              styles.sendButton,
              sendDisabled && styles.sendButtonDisabled,
              pressed && !sendDisabled && { opacity: 0.9 },
            ]}
          >
            {status === 'sent' ? (
              <Animated.View
                style={{
                  transform: [{ scale: checkAnim }],
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color={COLORS.bg} />
                <Text style={styles.sendButtonText}>Invites sent</Text>
              </Animated.View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="paper-plane" size={18} color={COLORS.bg} />
                <Text style={styles.sendButtonText}>
                  {status === 'sending'
                    ? 'Sending…'
                    : `Send invite${emails.length > 1 ? 's' : ''}${
                        emails.length ? ` (${emails.length})` : ''
                      }`}
                </Text>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}


function makeInviteStyles(COLORS: {
  bg: string; surface: string; surfaceAlt: string; border: string; yellow: string; yellowDim: string; text: string; textMuted: string; textFaint: string; danger: string; online: string;
}) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  iconButtonPressed: {
    backgroundColor: COLORS.surfaceAlt,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  headerAction: {
    color: COLORS.yellow,
    fontSize: 15,
    fontWeight: '700',
  },
  headerActionDisabled: {
    color: COLORS.textFaint,
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(61, 214, 140, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.online,
  },
  liveBannerText: {
    color: COLORS.online,
    fontSize: 12,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  emailBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emailBoxError: {
    borderColor: COLORS.danger,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.yellowDim,
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 7,
    gap: 6,
  },
  chipText: {
    color: COLORS.yellow,
    fontSize: 13,
    fontWeight: '600',
  },
  chipClose: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInput: {
    color: COLORS.text,
    fontSize: 14,
    minWidth: 90,
    paddingVertical: 6,
    flexGrow: 1,
  },
  hintText: {
    color: COLORS.textFaint,
    fontSize: s(11),
    marginTop: 8,
  },
  hintTextError: {
    color: COLORS.danger,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: s(12),
  },
  roleCardSelected: {
    backgroundColor: COLORS.yellowDim,
    borderColor: COLORS.yellow,
  },
  roleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconWrapSelected: {
    backgroundColor: 'rgba(242, 194, 0, 0.18)',
  },
  roleLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  roleDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },
  messageBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: s(12),
    padding: 14,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  charCount: {
    color: COLORS.textFaint,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 10,
  },
  linkText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 13,
  },
  copyText: {
    color: COLORS.yellow,
    fontSize: s(13),
    fontWeight: '700',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.yellow,
    borderRadius: s(14),
    paddingVertical: s(14),
    marginTop:s(20),
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(242, 194, 0, 0.35)',
  },
  sendButtonText: {
    color: COLORS.bg,
    fontSize: s(14),
    fontWeight: '800',
  },
});
}
let styles = makeInviteStyles(COLORS);
