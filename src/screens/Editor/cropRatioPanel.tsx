import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { CropRatioPreset } from '../types';
import { useAppPalette } from '../Contexts/ThemeContext';

let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#e7e55c',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
};
interface CropRatioPanelProps {
  visible: boolean;
  presets: CropRatioPreset[];
  selectedRatioId?: string;
  onSelectRatio: (ratioId: string) => void;
  onClose: () => void;
}
// Small shape icon representing each ratio, drawn purely with border/aspect
// styling — no images needed since it's just a rectangle outline.
function RatioShape({ ratioValue, isActive }: { ratioValue: number; isActive: boolean }) {
  // ratioValue = width / height. Box height is fixed, width derives from it,
  // clamped so extreme ratios (like 16:9) don't blow out the layout.
  const boxHeight = scale(34);
  const rawWidth = boxHeight * ratioValue;
  const boxWidth = Math.max(scale(14), Math.min(rawWidth, scale(34)));
  return (
    <View style={styles.shapeWrapper}>
      <View
        style={[
          styles.shapeBox,
          {
            width: boxWidth,
            height: boxHeight,
            borderColor: isActive ? COLORS.yellow : COLORS.textSecondary,
          },
        ]}
      />
    </View>
  );
}
export default function CropRatioPanel({
  visible,
  presets,
  selectedRatioId,
  onSelectRatio,
  onClose,
}: CropRatioPanelProps) {
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
        <Text style={styles.title}>Crop</Text>
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
          {presets.map((preset) => {
            const isSelected = selectedRatioId
              ? selectedRatioId === preset.id
              : preset.id === 'original';
            return (
              <TouchableOpacity
                key={preset.id}
                style={styles.presetItem}
                onPress={() => onSelectRatio(preset.id)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.thumbnailBox,
                    isSelected && styles.thumbnailBoxActive,
                  ]}
                >
                  <RatioShape ratioValue={preset.ratioValue} isActive={isSelected} />
                </View>
                <Text
                  style={[styles.presetLabel, isSelected && styles.presetLabelActive]}
                  numberOfLines={1}
                >
                  {preset.label}
                </Text>
                <Text style={styles.presetRatio}>{preset.ratioLabel}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
  shapeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shapeBox: {
    borderWidth: 2,
    borderRadius: scale(2),
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
  presetRatio: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(8),
    opacity: 0.7,
    marginTop: verticalScale(1),
  },
});
}
let styles = __makeStyles();
