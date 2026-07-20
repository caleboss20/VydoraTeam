/**
 * Motion tracking — opt-in: seed from selected text/emoji position, bake diamonds.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useAppPalette } from '../Contexts/ThemeContext';


let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
};

interface MotionTrackPanelProps {
  visible: boolean;
  targetLabel?: string;
  tracking?: boolean;
  keyframeCount?: number;
  onTrack: () => void;
  onClear: () => void;
  onClose: () => void;
}

export default function MotionTrackPanel({
  visible,
  targetLabel,
  tracking = false,
  keyframeCount = 0,
  onTrack,
  onClear,
  onClose,
}: MotionTrackPanelProps) {
  const __palette = useAppPalette();
  COLORS = {
    ...COLORS,
    background: __palette.background,
    surface: __palette.surface,
    border: __palette.border,
    yellow: __palette.yellow,
    textPrimary: __palette.textPrimary,
    textSecondary: __palette.textSecondary,
    textMuted: __palette.textMuted,
  };
  styles = __makeStyles();

  if (!visible) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Motion track</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        <Text style={styles.hint}>
          Select text, a sticker, or a photo/PiP overlay (masks follow too),
          place it on the subject, then tap Track.
        </Text>
        <Text style={styles.target}>
          Target: {targetLabel ?? 'None selected'}
        </Text>
        <TouchableOpacity
          style={[styles.primary, (!targetLabel || tracking) && styles.primaryDisabled]}
          onPress={onTrack}
          disabled={!targetLabel || tracking}
        >
          {tracking ? (
            <ActivityIndicator color="#0B0D13" />
          ) : (
            <>
              <Ionicons name="locate" size={scale(16)} color="#0B0D13" />
              <Text style={styles.primaryText}>Track subject</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.count}>
          {keyframeCount === 0
            ? 'No track keyframes yet'
            : `${keyframeCount} track keyframe${keyframeCount === 1 ? '' : 's'}`}
        </Text>
        {keyframeCount > 0 && (
          <TouchableOpacity onPress={onClear} hitSlop={8}>
            <Text style={styles.clear}>Clear track</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function __makeStyles() {
  return StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: scale(16),
    borderTopRightRadius: scale(16),
    paddingBottom: verticalScale(16),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(14),
    gap: verticalScale(10),
  },
  hint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(12),
    lineHeight: moderateScale(18),
  },
  target: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(13),
    fontWeight: '500',
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: COLORS.yellow,
    borderRadius: scale(10),
    paddingVertical: verticalScale(12),
  },
  primaryDisabled: { opacity: 0.45 },
  primaryText: {
    color: '#0B0D13',
    fontWeight: '700',
    fontSize: moderateScale(13),
  },
  count: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
  },
  clear: {
    color: COLORS.yellow,
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
});
}
let styles = __makeStyles();

