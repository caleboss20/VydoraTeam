/**
 * Canva-style floating comment composer — pin on canvas, @mention teammates,
 * Comment / Cancel. Viewers of the project can see comments.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import type { Member, User } from '../types';

interface CommentComposerBubbleProps {
  visible: boolean;
  user: User | null;
  members: Member[];
  /** Playhead label e.g. 0:24 */
  timecodeLabel: string;
  pinX: number;
  pinY: number;
  previewWidth: number;
  previewHeight: number;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (text: string) => void;
}

export default function CommentComposerBubble({
  visible,
  user,
  members,
  timecodeLabel,
  pinX,
  pinY,
  previewWidth,
  previewHeight,
  submitting,
  onCancel,
  onSubmit,
}: CommentComposerBubbleProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setText('');
      const t = setTimeout(() => inputRef.current?.focus(), 180);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const mentionQuery = useMemo(() => {
    const m = text.match(/@([^\s@]*)$/);
    return m ? m[1].toLowerCase() : null;
  }, [text]);

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery == null) return [];
    return members
      .filter((m) => m.status !== 'INVITED' && m.status !== 'PENDING_APPROVAL')
      .filter((m) => m.userId !== user?.id)
      .filter(
        (m) =>
          !mentionQuery ||
          m.name.toLowerCase().includes(mentionQuery) ||
          (m.email ?? '').toLowerCase().includes(mentionQuery)
      )
      .slice(0, 5);
  }, [mentionQuery, members, user?.id]);

  if (!visible) return null;

  const bubbleW = Math.min(scale(280), Math.max(scale(220), previewWidth * 0.72));
  const left = Math.max(
    scale(8),
    Math.min(pinX * previewWidth + scale(14), previewWidth - bubbleW - scale(8))
  );
  const top = Math.max(
    scale(8),
    Math.min(pinY * previewHeight + scale(18), previewHeight - verticalScale(160))
  );

  const canPost = text.trim().length > 0 && !submitting;

  const insertMention = (name: string) => {
    setText((prev) => prev.replace(/@([^\s@]*)$/, `@${name} `));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
    >
      {/* Dim tap-catcher */}
      <TouchableOpacity
        style={styles.scrim}
        activeOpacity={1}
        onPress={onCancel}
      />

      {/* Pin marker */}
      <View
        pointerEvents="none"
        style={[
          styles.pin,
          {
            left: pinX * previewWidth - scale(10),
            top: pinY * previewHeight - scale(10),
          },
        ]}
      >
        <View style={styles.pinDot} />
      </View>

      <View style={[styles.bubble, { left, top, width: bubbleW }]}>
        <View style={styles.authorRow}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatar,
                { backgroundColor: user?.color ?? '#4DA6FF' },
              ]}
            >
              <Text style={styles.avatarText}>
                {(user?.initials ?? user?.name?.slice(0, 2) ?? '?').toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.authorName} numberOfLines={1}>
              {user?.name ?? 'You'}
            </Text>
            <Text style={styles.timecode}>at {timecodeLabel}</Text>
          </View>
        </View>

        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Comment or add others with @"
          placeholderTextColor="#9AA3B5"
          multiline
          maxLength={500}
        />

        {mentionSuggestions.length > 0 && (
          <View style={styles.mentions}>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: verticalScale(110) }}>
              {mentionSuggestions.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.mentionRow}
                  onPress={() => insertMention(m.name)}
                >
                  <View
                    style={[styles.mentionAvatar, { backgroundColor: m.color }]}
                  >
                    <Text style={styles.mentionAvatarText}>{m.initials}</Text>
                  </View>
                  <View>
                    <Text style={styles.mentionName}>{m.name}</Text>
                    {!!m.email && (
                      <Text style={styles.mentionEmail}>{m.email}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={styles.hint}>
          Viewers of this file can see comments and suggestions.
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity onPress={onCancel} hitSlop={8} disabled={submitting}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => canPost && onSubmit(text.trim())}
            disabled={!canPost}
            hitSlop={8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#0B0D13" />
            ) : (
              <Text style={[styles.post, !canPost && styles.postDisabled]}>
                Comment
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    zIndex: 40,
  },
  pin: {
    position: 'absolute',
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4DA6FF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 41,
  },
  pinDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#4DA6FF',
  },
  bubble: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(14),
    padding: scale(12),
    zIndex: 42,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: verticalScale(8),
  },
  avatar: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: moderateScale(10),
    fontWeight: '800',
  },
  authorName: {
    color: '#0B0D13',
    fontSize: moderateScale(13),
    fontWeight: '700',
  },
  timecode: {
    color: '#8F9BB3',
    fontSize: moderateScale(10),
    marginTop: 1,
  },
  input: {
    backgroundColor: '#F3F5F9',
    borderRadius: scale(20),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    color: '#0B0D13',
    fontSize: moderateScale(13),
    minHeight: verticalScale(40),
    maxHeight: verticalScale(90),
  },
  mentions: {
    marginTop: verticalScale(6),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#E6E9F0',
    overflow: 'hidden',
  },
  mentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E6E9F0',
  },
  mentionAvatar: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionAvatarText: {
    color: '#FFF',
    fontSize: moderateScale(9),
    fontWeight: '700',
  },
  mentionName: {
    color: '#0B0D13',
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  mentionEmail: {
    color: '#8F9BB3',
    fontSize: moderateScale(10),
  },
  hint: {
    color: '#8F9BB3',
    fontSize: moderateScale(10),
    marginTop: verticalScale(8),
    lineHeight: moderateScale(14),
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: scale(18),
    marginTop: verticalScale(10),
  },
  cancel: {
    color: '#5B6577',
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  post: {
    color: '#0B0D13',
    fontSize: moderateScale(13),
    fontWeight: '800',
  },
  postDisabled: {
    color: '#C5CAD6',
  },
});
