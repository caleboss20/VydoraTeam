/**
 * Effects panel — blur / vignette / shake / zoom punch (yellow only on selected).
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Slider from '@react-native-community/slider';
import { ClipEffectId } from '../types';
import { EFFECT_PRESETS } from '../services/effectService';
import { useAppPalette } from '../Contexts/ThemeContext';


let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
};

interface EffectsToolPanelProps {
  visible: boolean;
  effectId?: ClipEffectId;
  intensity?: number;
  onChange: (effectId: ClipEffectId, intensity: number) => void;
  onClose: () => void;
}

export default function EffectsToolPanel({
  visible,
  effectId = 'none',
  intensity = 0.55,
  onChange,
  onClose,
}: EffectsToolPanelProps) {
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
        <Text style={styles.title}>Effects</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {EFFECT_PRESETS.map((p) => {
          const sel = effectId === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.chip, sel && styles.chipActive]}
              onPress={() => onChange(p.id, intensity)}
            >
              <Ionicons
                name={p.icon as keyof typeof Ionicons.glyphMap}
                size={scale(16)}
                color={sel ? COLORS.yellow : COLORS.textSecondary}
              />
              <Text style={[styles.chipLabel, sel && styles.chipLabelActive]}>{p.label}</Text>
              <Text style={styles.chipHint}>{p.hint}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {effectId !== 'none' && (
        <>
          <Text style={styles.sliderLabel}>Intensity {Math.round(intensity * 100)}%</Text>
          <Slider
            minimumValue={0.1}
            maximumValue={1}
            value={intensity}
            onValueChange={(v) => onChange(effectId, v)}
            minimumTrackTintColor={COLORS.yellow}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.yellow}
          />
        </>
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
    marginBottom: verticalScale(10),
  },
  title: { color: COLORS.textPrimary, fontSize: moderateScale(15), fontWeight: '700' },
  row: { gap: scale(8), paddingRight: scale(8) },
  chip: {
    width: scale(100),
    padding: scale(10),
    borderRadius: scale(12),
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: verticalScale(4),
  },
  chipActive: { borderColor: COLORS.yellow },
  chipLabel: { color: COLORS.textPrimary, fontSize: moderateScale(12), fontWeight: '700' },
  chipLabelActive: { color: COLORS.yellow },
  chipHint: { color: COLORS.textSecondary, fontSize: moderateScale(9) },
  sliderLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    marginTop: verticalScale(10),
  },
});
}
let styles = __makeStyles();

