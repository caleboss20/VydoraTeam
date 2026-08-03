/**
 * Soft CapCut-style leave confirm — only when leaving the live editor
 * might interrupt work or a live session. Not a Zoom "end call" dialog.
 */
import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useTheme, ThemeColors } from '../Contexts/ThemeContext';

export type LeaveEditorReason =
  | 'live_session'
  | 'upload_busy'
  | 'export_busy'
  | 'generic';

type Props = {
  visible: boolean;
  reason: LeaveEditorReason;
  teammateCount?: number;
  onStay: () => void;
  onLeave: () => void;
};

function copyFor(reason: LeaveEditorReason, teammateCount: number) {
  switch (reason) {
    case 'live_session':
      return {
        title: 'Leave editor?',
        body:
          teammateCount > 0
            ? `${teammateCount} teammate${teammateCount === 1 ? '' : 's'} ${
                teammateCount === 1 ? 'is' : 'are'
              } still editing with you. Your timeline stays saved — they’ll see you go offline.`
            : 'You’re in a live session. Your timeline stays saved.',
      };
    case 'upload_busy':
      return {
        title: 'Uploads still running',
        body: 'Clips are still uploading. Leaving now may interrupt that. Stay until uploads finish, or leave anyway.',
      };
    case 'export_busy':
      return {
        title: 'Export in progress',
        body: 'An export is still running. Leaving the editor won’t cancel a server export, but you won’t see progress here.',
      };
    default:
      return {
        title: 'Leave editor?',
        body: 'Your timeline is autosaved. You can reopen this project anytime.',
      };
  }
}

export function LeaveEditorSheet({
  visible,
  reason,
  teammateCount = 0,
  onStay,
  onLeave,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const copy = copyFor(reason, teammateCount);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onStay}
    >
      <Pressable style={styles.backdrop} onPress={onStay}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.iconWrap}>
            <Ionicons name="exit-outline" size={scale(22)} color={colors.accent} />
          </View>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>
          <TouchableOpacity
            style={styles.leaveBtn}
            onPress={onLeave}
            activeOpacity={0.85}
          >
            <Text style={styles.leaveText}>Leave editor</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onStay} activeOpacity={0.7} hitSlop={8}>
            <Text style={styles.stayText}>Stay</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: scale(18),
      borderTopRightRadius: scale(18),
      paddingHorizontal: scale(22),
      paddingTop: verticalScale(22),
      paddingBottom: verticalScale(36),
      alignItems: 'center',
    },
    iconWrap: {
      width: scale(44),
      height: scale(44),
      borderRadius: scale(22),
      backgroundColor: 'rgba(245,197,24,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: verticalScale(12),
    },
    title: {
      color: c.text,
      fontSize: moderateScale(17),
      fontWeight: '800',
      marginBottom: verticalScale(8),
    },
    body: {
      color: c.textSecondary,
      fontSize: moderateScale(13),
      lineHeight: 19,
      textAlign: 'center',
      marginBottom: verticalScale(20),
      paddingHorizontal: scale(8),
    },
    leaveBtn: {
      alignSelf: 'stretch',
      backgroundColor: c.accent,
      borderRadius: scale(12),
      paddingVertical: verticalScale(13),
      alignItems: 'center',
      marginBottom: verticalScale(12),
    },
    leaveText: {
      color: c.accentOn,
      fontWeight: '800',
      fontSize: moderateScale(15),
    },
    stayText: {
      color: c.textSecondary,
      fontWeight: '600',
      fontSize: moderateScale(14),
      paddingVertical: verticalScale(6),
    },
  });
}
