/**
 * Color grade panel — brightness / contrast / saturation / temperature.
 * Neutral = 0. Yellow only on the Done check + slider thumbs.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Slider from '@react-native-community/slider';
import { ColorGrade, DEFAULT_COLOR_GRADE } from '../types';
import { useAppPalette } from '../Contexts/ThemeContext';


let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
};

interface ColorGradePanelProps {
  visible: boolean;
  grade?: ColorGrade;
  onChange: (partial: Partial<ColorGrade>) => void;
  onReset: () => void;
  onClose: () => void;
  keyframeCount?: number;
  onAddKeyframe?: () => void;
  onClearKeyframes?: () => void;
}

function GradeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2)}</Text>
      </View>
      <Slider
        minimumValue={-1}
        maximumValue={1}
        step={0.01}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={COLORS.textSecondary}
        maximumTrackTintColor={COLORS.border}
        thumbTintColor={COLORS.yellow}
      />
    </View>
  );
}

export default function ColorGradePanel({
  visible,
  grade = DEFAULT_COLOR_GRADE,
  onChange,
  onReset,
  onClose,
  keyframeCount = 0,
  onAddKeyframe,
  onClearKeyframes,
}: ColorGradePanelProps) {
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
  const g = { ...DEFAULT_COLOR_GRADE, ...grade };
  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Color</Text>
        <View style={{ flexDirection: 'row', gap: scale(12), alignItems: 'center' }}>
          <TouchableOpacity onPress={onReset} hitSlop={8}>
            <Text style={styles.reset}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
          </TouchableOpacity>
        </View>
      </View>
      <GradeRow label="Brightness" value={g.brightness} onChange={(brightness) => onChange({ brightness })} />
      <GradeRow label="Contrast" value={g.contrast} onChange={(contrast) => onChange({ contrast })} />
      <GradeRow label="Saturation" value={g.saturation} onChange={(saturation) => onChange({ saturation })} />
      <GradeRow label="Temperature" value={g.temperature} onChange={(temperature) => onChange({ temperature })} />
      {onAddKeyframe && (
        <View style={styles.kfRow}>
          <TouchableOpacity style={styles.kfBtn} onPress={onAddKeyframe}>
            <Ionicons name="diamond" size={scale(12)} color="#0B0D13" />
            <Text style={styles.kfBtnText}>Add keyframe</Text>
          </TouchableOpacity>
          <Text style={styles.kfCount}>
            {keyframeCount === 0 ? 'No keyframes' : `${keyframeCount} kf`}
          </Text>
          {keyframeCount > 0 && onClearKeyframes && (
            <TouchableOpacity onPress={onClearKeyframes} hitSlop={6}>
              <Text style={styles.reset}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function __makeStyles() {
  return StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(16),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  title: { color: COLORS.textPrimary, fontSize: moderateScale(15), fontWeight: '700' },
  reset: { color: COLORS.textSecondary, fontSize: moderateScale(12), fontWeight: '600' },
  row: { marginTop: verticalScale(4) },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: COLORS.textSecondary, fontSize: moderateScale(11) },
  value: { color: COLORS.textPrimary, fontSize: moderateScale(11), fontWeight: '600' },
  kfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginTop: verticalScale(12),
  },
  kfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: COLORS.yellow,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    borderRadius: scale(8),
  },
  kfBtnText: { color: '#0B0D13', fontSize: moderateScale(11), fontWeight: '700' },
  kfCount: { color: COLORS.textSecondary, fontSize: moderateScale(11) },
});
}
let styles = __makeStyles();

