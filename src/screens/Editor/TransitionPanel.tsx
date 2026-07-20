import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { ClipTransition, ClipTransitionType } from '../types';

const COLORS = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
};

type TransitionPreset = {
  id: ClipTransitionType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

// CapCut-style transition picker between two clips.
const PRESETS: TransitionPreset[] = [
  { id: 'none', label: 'None', icon: 'ban-outline' },
  { id: 'crossfade', label: 'Crossfade', icon: 'contrast-outline' },
  { id: 'wipe', label: 'Wipe', icon: 'swap-horizontal-outline' },
  { id: 'slide', label: 'Slide', icon: 'arrow-forward-outline' },
  { id: 'zoom', label: 'Zoom', icon: 'expand-outline' },
];

const DURATIONS = [300, 500, 1000];

interface TransitionPanelProps {
  visible: boolean;
  transition?: ClipTransition;
  onChange: (transition: ClipTransition | undefined) => void;
  onClose: () => void;
}

export default function TransitionPanel({
  visible,
  transition,
  onChange,
  onClose,
}: TransitionPanelProps) {
  if (!visible) return null;

  const selectedType: ClipTransitionType = transition?.type ?? 'none';
  const selectedDuration = transition?.durationMs ?? 500;

  const selectType = (type: ClipTransitionType) => {
    if (type === 'none') {
      onChange(undefined);
    } else {
      onChange({ type, durationMs: selectedDuration });
    }
  };

  const selectDuration = (durationMs: number) => {
    if (selectedType === 'none') return;
    onChange({ type: selectedType, durationMs });
  };

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
          {PRESETS.map((preset) => {
            const isSelected = selectedType === preset.id;
            return (
              <TouchableOpacity
                key={preset.id}
                style={styles.presetItem}
                onPress={() => selectType(preset.id)}
                activeOpacity={0.8}
              >
                <View
                  style={[styles.thumbnailBox, isSelected && styles.thumbnailBoxActive]}
                >
                  <Ionicons
                    name={preset.icon}
                    size={scale(22)}
                    color={isSelected ? COLORS.yellow : COLORS.textSecondary}
                  />
                </View>
                <Text
                  style={[styles.presetLabel, isSelected && styles.presetLabelActive]}
                  numberOfLines={1}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Duration — hidden for "None" since there is nothing to time */}
        {selectedType !== 'none' && (
          <View style={styles.durationRow}>
            <Text style={styles.durationLabel}>Duration</Text>
            {DURATIONS.map((d) => {
              const isActive = selectedDuration === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.durationChip, isActive && styles.durationChipActive]}
                  onPress={() => selectDuration(d)}
                >
                  <Text
                    style={[styles.durationChipText, isActive && styles.durationChipTextActive]}
                  >
                    {d / 1000}s
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    paddingTop: verticalScale(14),
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    gap: scale(14),
  },
  presetItem: {
    alignItems: 'center',
    width: scale(76),
  },
  thumbnailBox: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(10),
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailBoxActive: {
    borderColor: COLORS.yellow,
  },
  presetLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(9),
    marginTop: verticalScale(6),
    textAlign: 'center',
  },
  presetLabelActive: {
    color: COLORS.yellow,
    fontWeight: '600',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(16),
    marginTop: verticalScale(14),
  },
  durationLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    marginRight: scale(6),
  },
  durationChip: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(5),
    borderRadius: scale(14),
    backgroundColor: COLORS.surface,
  },
  durationChipActive: {
    backgroundColor: COLORS.yellow,
  },
  durationChipText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  durationChipTextActive: {
    color: '#13151c',
  },
});
