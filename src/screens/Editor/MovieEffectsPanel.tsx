/**
 * Movie looks — one-tap flashback / dream / rewind / slow-mo bundles.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useAppPalette } from '../Contexts/ThemeContext';
import {
  MOVIE_EFFECT_PRESETS,
  MovieEffectId,
} from '../services/movieEffectsService';

let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
};

interface MovieEffectsPanelProps {
  visible: boolean;
  selectedId?: MovieEffectId;
  onApply: (id: MovieEffectId) => void;
  onClose: () => void;
}

export default function MovieEffectsPanel({
  visible,
  selectedId = 'none',
  onApply,
  onClose,
}: MovieEffectsPanelProps) {
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
        <Text style={styles.title}>Movie</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        One-tap cinematic looks — reverse, grade, blur, and speed baked together.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {MOVIE_EFFECT_PRESETS.map((p) => {
          const sel = selectedId === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.chip, sel && styles.chipActive]}
              onPress={() => onApply(p.id)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={p.icon as keyof typeof Ionicons.glyphMap}
                size={scale(18)}
                color={sel ? COLORS.yellow : COLORS.textSecondary}
              />
              <Text style={[styles.chipLabel, sel && styles.chipLabelActive]}>
                {p.label}
              </Text>
              <Text style={styles.chipHint} numberOfLines={2}>
                {p.hint}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
    marginBottom: verticalScale(6),
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(15),
    fontWeight: '700',
  },
  hint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    marginBottom: verticalScale(10),
    lineHeight: moderateScale(16),
  },
  row: { gap: scale(8), paddingRight: scale(8) },
  chip: {
    width: scale(108),
    padding: scale(10),
    borderRadius: scale(12),
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: verticalScale(4),
    minHeight: verticalScale(96),
  },
  chipActive: { borderColor: COLORS.yellow },
  chipLabel: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  chipLabelActive: { color: COLORS.yellow },
  chipHint: { color: COLORS.textSecondary, fontSize: moderateScale(9) },
});
}
let styles = __makeStyles();

