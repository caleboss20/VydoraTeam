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
import { ClipTransition, ClipTransitionType } from '../types';

const COLORS = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#e7e55c',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
};

const TRANSITIONS: { type: ClipTransitionType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'none', label: 'None', icon: 'remove-outline' },
  { type: 'crossfade', label: 'Crossfade', icon: 'layers-outline' },
  { type: 'wipe', label: 'Wipe', icon: 'arrow-forward-outline' },
  { type: 'slide', label: 'Slide', icon: 'swap-horizontal-outline' },
  { type: 'zoom', label: 'Zoom', icon: 'scan-outline' },
];

interface TransitionPanelProps {
  visible: boolean;
  transition: ClipTransition | undefined;
  onSelect: (transition: ClipTransition) => void;
  onClose: () => void;
}

export default function TransitionPanel({
  visible,
  transition,
  onSelect,
  onClose,
}: TransitionPanelProps) {
  if (!visible) return null;

  const current = transition ?? { type: 'none' as ClipTransitionType, durationMs: 500 };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Transition</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {TRANSITIONS.map((item) => {
            const isSelected = current.type === item.type;
            return (
              <TouchableOpacity
                key={item.type}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() =>
                  onSelect({
                    type: item.type,
                    durationMs: item.type === 'none' ? 0 : current.durationMs || 500,
                  })
                }
              >
                <Ionicons
                  name={item.icon}
                  size={scale(18)}
                  color={isSelected ? COLORS.textPrimary : COLORS.textSecondary}
                />
                <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {current.type !== 'none' && (
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>Duration</Text>
            <Slider
              style={{ flex: 1, marginHorizontal: scale(12) }}
              minimumValue={200}
              maximumValue={1500}
              step={50}
              value={current.durationMs || 500}
              onValueChange={(v) => onSelect({ ...current, durationMs: Math.round(v) })}
              minimumTrackTintColor={COLORS.yellow}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.yellow}
            />
            <Text style={styles.valueText}>{((current.durationMs || 500) / 1000).toFixed(1)}s</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: verticalScale(8),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(15),
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(8),
  },
  scrollContent: {
    gap: scale(10),
    paddingVertical: verticalScale(4),
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: scale(72),
    gap: verticalScale(4),
  },
  chipSelected: {
    borderColor: COLORS.yellow,
    backgroundColor: 'rgba(245, 197, 24, 0.12)',
  },
  chipLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
    fontWeight: '600',
  },
  chipLabelSelected: {
    color: COLORS.textPrimary,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(10),
  },
  sliderLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(12),
    width: scale(56),
  },
  valueText: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(11),
    width: scale(36),
    textAlign: 'right',
  },
});
