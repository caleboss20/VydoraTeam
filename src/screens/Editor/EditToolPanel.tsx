import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
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
const SPEED_PRESETS = [0.5, 0.75, 0.9, 1,1.2, 1.5];
const TEXT_COLORS = ['#FFFFFF', '#e7e55c', '#FF4D6D', '#4DA6FF', '#4DFF88', '#000000'];


interface EditToolPanelProps {
  visible: boolean;
  toolLabel: string | null;
  onClose: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  speed: number;
  onSpeedChange: (s: number) => void;
  // ── ADDED for text tool ──
  textValue?: string;
  onTextChange?: (text: string) => void;
  textColor?: string;
  onTextColorChange?: (color: string) => void;
  fontSize?: number;
  onFontSizeChange?: (size: number) => void;
  onAddText?: (text: string) => void;
  isEditingExistingOverlay?: boolean;
  onDeleteOverlay?: () => void;
}
export default function EditToolPanel({
  visible,
  toolLabel,
  onClose,
  volume,
  onVolumeChange,
  speed,
  onSpeedChange,
  textValue = '',
  onTextChange,
  textColor = '#FFFFFF',
  onTextColorChange,
  fontSize = 24,
  onFontSizeChange,
  onAddText,
  isEditingExistingOverlay = false,
  onDeleteOverlay,
}: EditToolPanelProps) {
  const [draftText, setDraftText] = useState(textValue);
  // keep draft in sync if the selected overlay changes while panel is open
  useEffect(() => {
    setDraftText(textValue);
  }, [textValue]);
  if (!visible || !toolLabel) return null;
  const handleDone = () => {
    if (toolLabel === 'Text') {
      if (isEditingExistingOverlay) {
        onTextChange?.(draftText);
      } else if (draftText.trim().length > 0) {
        onAddText?.(draftText.trim());
      }
    }
    onClose();
  };
  return (
  <KeyboardAvoidingView 
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  keyboardVerticalOffset={Platform.OS === 'ios' ?verticalScale(80) : 0}
  >
      <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>{toolLabel}</Text>
        <TouchableOpacity onPress={handleDone} hitSlop={8}>
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
        {toolLabel === 'Text' && (
          <View>
            <TextInput
              style={styles.textInput}
              placeholder="Type your text..."
              placeholderTextColor={COLORS.textSecondary}
              value={draftText}
              onChangeText={setDraftText}
              autoFocus
              multiline
              maxLength={120}
            />
            <View style={styles.colorRow}>
              {TEXT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => onTextColorChange?.(c)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    textColor === c && styles.colorSwatchActive,
                  ]}
                />
              ))}
            </View>
            <View style={styles.sliderRow}>
              <Ionicons name="text-outline" size={scale(18)} color={COLORS.textSecondary} />
              <Slider
                style={{ flex: 1, marginHorizontal: scale(12) }}
                minimumValue={12}
                maximumValue={48}
                value={fontSize}
                onValueChange={onFontSizeChange}
                minimumTrackTintColor={COLORS.yellow}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.yellow}
              />
              <Text style={styles.valueText}>{Math.round(fontSize)}</Text>
            </View>
            {isEditingExistingOverlay && (
              <TouchableOpacity style={styles.deleteBtn} onPress={onDeleteOverlay}>
                <Ionicons name="trash-outline" size={scale(16)} color="#FF4D6D" />
                <Text style={styles.deleteBtnText}>Delete text</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {toolLabel !== 'Audio' && toolLabel !== 'Speed' && toolLabel !== 'Text' && (
          <Text style={styles.comingSoon}>{toolLabel} panel coming soon</Text>
        )}
      </View>
    </View>
  </KeyboardAvoidingView>
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
  sliderRow: { flexDirection: 'row', alignItems: 'center', marginTop: verticalScale(12) },
  valueText: { color: COLORS.textPrimary, fontSize: moderateScale(13), width: scale(42), textAlign: 'right' },
  comingSoon: { color: COLORS.textSecondary, fontSize: moderateScale(13), textAlign: 'center' },
  presetRow: { flexDirection: 'row', justifyContent: 'space-between' },
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
  presetBtnActive: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
  presetText: { color: COLORS.textSecondary, fontSize: moderateScale(13), fontWeight: '600' },
  presetTextActive: { color: COLORS.textPrimary },
  textInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(10),
    color: COLORS.textPrimary,
    padding: scale(12),
    fontSize: moderateScale(15),
    minHeight: verticalScale(60),
    textAlignVertical: 'top',
  },
  colorRow: { flexDirection: 'row', marginTop: verticalScale(12), gap: scale(10) },
  colorSwatch: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  colorSwatchActive: { borderWidth: 2, borderColor: COLORS.yellow },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    marginTop: verticalScale(14),
    paddingVertical: verticalScale(8),
  },
  deleteBtnText: { color: '#FF4D6D', fontSize: moderateScale(13), fontWeight: '600' },
});