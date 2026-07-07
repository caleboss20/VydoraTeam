import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Slider from '@react-native-community/slider';
const COLORS = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#e7e55c',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
};
const SPEED_PRESETS = [0.5,0.75,0.9, 1, 1.5, 2];
interface EditToolPanelProps {
  visible: boolean;
  toolLabel: string | null;
  onClose: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  speed: number;
  onSpeedChange: (s: number) => void;
}
export default function EditToolPanel({
  visible,
  toolLabel,
  onClose,
  volume,
  onVolumeChange,
  speed,
  onSpeedChange,
}: EditToolPanelProps) {
  if (!visible || !toolLabel) return null;
  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>{toolLabel}</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        {toolLabel === 'Audio' && (
          <View style={styles.sliderRow}>
            <Ionicons name="volume-medium-outline" size={scale(18)} color={COLORS.textSecondary} />
            <Slider
              style={{ flex: 1, marginHorizontal: scale(12) }}
              minimumValue={0}
              maximumValue={1}
              value={volume}
              onValueChange={onVolumeChange}
              minimumTrackTintColor={COLORS.yellow}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.yellow}
            />
            <Text style={styles.valueText}>{Math.round(volume * 100)}%</Text>
          </View>
        )}
        {toolLabel === 'Speed' && (
          <View style={styles.presetRow}>
            {SPEED_PRESETS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.presetBtn, speed === s && styles.presetBtnActive]}
                onPress={() => onSpeedChange(s)}
              >
                <Text style={[styles.presetText, speed === s && styles.presetTextActive]}>
                  {s}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {toolLabel !== 'Audio' && toolLabel !== 'Speed' && (
          <Text style={styles.comingSoon}>{toolLabel} panel coming soon</Text>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(20),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(14),
  },
  title: { color: COLORS.textPrimary, fontSize: moderateScale(15), fontWeight: '700' },
  body: { minHeight: verticalScale(50) },
  sliderRow: { flexDirection: 'row', alignItems: 'center' },
  valueText: { color: COLORS.textPrimary, fontSize: moderateScale(13), width: scale(42), textAlign: 'right' },
  comingSoon: { color: COLORS.textSecondary, fontSize: moderateScale(13), textAlign: 'center' },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  presetBtn: {
    flex: 1,
    marginHorizontal: scale(4),
    paddingVertical: verticalScale(10),
    borderRadius: scale(10),
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  presetBtnActive: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },
  presetText: { color: COLORS.textSecondary, fontSize: moderateScale(13), fontWeight: '600' },
  presetTextActive: { color: COLORS.textPrimary },
});
