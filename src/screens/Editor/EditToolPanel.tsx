import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Slider from '@react-native-community/slider';
const COLORS = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  purple: '#6C5CE7',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
};
interface EditToolPanelProps {
  visible: boolean;
  toolLabel: string | null;
  onClose: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
}
export default function EditToolPanel({
  visible,
  toolLabel,
  onClose,
  volume,
  onVolumeChange,
}: EditToolPanelProps) {
  if (!visible || !toolLabel) return null;
  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>{toolLabel}</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.purple} />
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        {toolLabel === 'Audio' && (
          <View style={styles.sliderRow}>
            <Ionicons name="volume-medium-outline" size={scale(18)} color={COLORS.textSecondary} />
            <Slider
              style={{ flex: 1, marginHorizontal: scale(12) }}
              minimumValue={0}
              maximumValue={2}
              value={volume}
              onValueChange={onVolumeChange}
              minimumTrackTintColor={COLORS.purple}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.purple}
            />
            <Text style={styles.valueText}>{Math.round(volume * 100)}%</Text>
          </View>
        )}
        {toolLabel !== 'Audio' && (
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
});