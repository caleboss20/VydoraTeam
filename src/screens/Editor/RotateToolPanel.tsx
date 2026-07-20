/**
 * Cinematic camera tilt — rotate the active clip in degrees (Filmora Dutch angle).
 * Supports snap presets + keyframed “turn the camera” motion.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Slider from '@react-native-community/slider';
import { useAppPalette } from '../Contexts/ThemeContext';


let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  danger: '#E85D5D',
};

const PRESETS: { label: string; deg: number; icon: string }[] = [
  { label: 'Level', deg: 0, icon: 'phone-portrait-outline' },
  { label: 'Dutch −15°', deg: -15, icon: 'phone-landscape-outline' },
  { label: 'Dutch 15°', deg: 15, icon: 'phone-landscape-outline' },
  { label: 'Tilt −45°', deg: -45, icon: 'sync-outline' },
  { label: 'Tilt 45°', deg: 45, icon: 'sync-outline' },
  { label: 'Side 90°', deg: 90, icon: 'phone-landscape-outline' },
  { label: 'Side −90°', deg: -90, icon: 'phone-landscape-outline' },
  { label: 'Upside 180°', deg: 180, icon: 'refresh-outline' },
];

interface RotateToolPanelProps {
  visible: boolean;
  rotation: number;
  keyframeCount?: number;
  onRotationChange: (degrees: number) => void;
  onAddKeyframe: () => void;
  onClearKeyframes: () => void;
  onClose: () => void;
}

export default function RotateToolPanel({
  visible,
  rotation,
  keyframeCount = 0,
  onRotationChange,
  onAddKeyframe,
  onClearKeyframes,
  onClose,
}: RotateToolPanelProps) {
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
        <Text style={styles.title}>Rotate</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        Turn the camera — Dutch angles & cinematic tilts. Frame stays filled
        (no black corners). Add diamonds to animate the turn.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetRow}
      >
        {PRESETS.map((p) => {
          const sel = Math.abs(rotation - p.deg) < 0.5;
          return (
            <TouchableOpacity
              key={p.label}
              style={[styles.preset, sel && styles.presetOn]}
              onPress={() => onRotationChange(p.deg)}
            >
              <Ionicons
                name={p.icon as keyof typeof Ionicons.glyphMap}
                size={scale(16)}
                color={sel ? COLORS.yellow : COLORS.textSecondary}
              />
              <Text style={[styles.presetLabel, sel && styles.presetLabelOn]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>Degrees</Text>
        <Slider
          style={styles.slider}
          minimumValue={-180}
          maximumValue={180}
          step={1}
          value={rotation}
          onValueChange={onRotationChange}
          minimumTrackTintColor={COLORS.yellow}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.yellow}
        />
        <Text style={styles.sliderValue}>{Math.round(rotation)}°</Text>
      </View>

      <View style={styles.nudgeRow}>
        {[-5, -1, 1, 5].map((d) => (
          <TouchableOpacity
            key={d}
            style={styles.nudge}
            onPress={() =>
              onRotationChange(Math.max(-180, Math.min(180, rotation + d)))
            }
          >
            <Text style={styles.nudgeText}>
              {d > 0 ? `+${d}°` : `${d}°`}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.nudge}
          onPress={() => onRotationChange(0)}
        >
          <Text style={styles.nudgeText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.kfRow}>
        <TouchableOpacity style={styles.kfBtn} onPress={onAddKeyframe}>
          <Ionicons name="diamond" size={scale(13)} color="#0B0D13" />
          <Text style={styles.kfBtnText}>Add keyframe</Text>
        </TouchableOpacity>
        <Text style={styles.kfCount}>
          {keyframeCount === 0
            ? 'No camera turns yet'
            : `${keyframeCount} keyframe${keyframeCount === 1 ? '' : 's'}`}
        </Text>
        {keyframeCount > 0 && (
          <TouchableOpacity onPress={onClearKeyframes} hitSlop={6}>
            <Text style={styles.clear}>Clear</Text>
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
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  hint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    lineHeight: moderateScale(16),
    paddingHorizontal: scale(16),
    marginTop: verticalScale(10),
  },
  presetRow: {
    paddingHorizontal: scale(12),
    gap: scale(8),
    marginTop: verticalScale(12),
  },
  preset: {
    alignItems: 'center',
    gap: verticalScale(4),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    minWidth: scale(72),
  },
  presetOn: {
    borderColor: COLORS.yellow,
    backgroundColor: 'rgba(245,197,24,0.1)',
  },
  presetLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(9),
    fontWeight: '600',
  },
  presetLabelOn: { color: COLORS.yellow },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    marginTop: verticalScale(14),
    gap: scale(8),
  },
  sliderLabel: {
    color: COLORS.textSecondary,
    width: scale(58),
    fontSize: moderateScale(11),
  },
  slider: { flex: 1, height: verticalScale(28) },
  sliderValue: {
    color: COLORS.textPrimary,
    width: scale(42),
    textAlign: 'right',
    fontWeight: '700',
    fontSize: moderateScale(12),
  },
  nudgeRow: {
    flexDirection: 'row',
    gap: scale(8),
    paddingHorizontal: scale(16),
    marginTop: verticalScale(10),
  },
  nudge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(8),
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nudgeText: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  kfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingHorizontal: scale(16),
    marginTop: verticalScale(14),
  },
  kfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    backgroundColor: COLORS.yellow,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    borderRadius: scale(14),
  },
  kfBtnText: {
    color: '#0B0D13',
    fontSize: moderateScale(11),
    fontWeight: '700',
  },
  kfCount: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
  },
  clear: {
    color: COLORS.danger,
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
});
}
let styles = __makeStyles();

