/**
 * Edit an existing AI/manual caption overlay without regenerating.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Slider from '@react-native-community/slider';
import { useAppPalette } from '../Contexts/ThemeContext';
import { TextOverlay } from '../types';

let COLORS: Record<string, string> = {
  background: '#151821',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  border: '#2A2A2E',
  danger: '#E85D5D',
};

interface CaptionEditPanelProps {
  visible: boolean;
  overlay: TextOverlay | null;
  onChange: (patch: Partial<TextOverlay>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function CaptionEditPanel({
  visible,
  overlay,
  onChange,
  onDelete,
  onClose,
}: CaptionEditPanelProps) {
  const p = useAppPalette();
  COLORS = {
    ...COLORS,
    background: p.background,
    surface: p.surface,
    border: p.border,
    yellow: p.yellow,
    textPrimary: p.textPrimary,
    textSecondary: p.textSecondary,
    danger: p.danger,
  };
  styles = makeStyles();
  const [text, setText] = useState(overlay?.text ?? '');

  useEffect(() => {
    setText(overlay?.text ?? '');
  }, [overlay?.id, overlay?.text]);

  if (!visible) return null;

  if (!overlay) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit caption</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          Tap a caption on the preview (or generate captions first).
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit caption</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ maxHeight: verticalScale(240) }}>
        <Text style={styles.label}>Text</Text>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          onBlur={() => onChange({ text: text.trim() || overlay.text })}
          multiline
          placeholderTextColor={COLORS.textSecondary}
        />
        <Text style={styles.label}>
          Start · {(overlay.startMs / 1000).toFixed(1)}s
        </Text>
        <Slider
          minimumValue={0}
          maximumValue={Math.max(overlay.startMs + overlay.durationMs, 1000)}
          step={50}
          value={overlay.startMs}
          onSlidingComplete={(v) => onChange({ startMs: Math.round(v) })}
          minimumTrackTintColor={COLORS.yellow}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.yellow}
        />
        <Text style={styles.label}>
          Duration · {(overlay.durationMs / 1000).toFixed(1)}s
        </Text>
        <Slider
          minimumValue={400}
          maximumValue={12000}
          step={50}
          value={overlay.durationMs}
          onSlidingComplete={(v) => onChange({ durationMs: Math.round(v) })}
          minimumTrackTintColor={COLORS.yellow}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.yellow}
        />
        <Text style={styles.label}>Size · {overlay.fontSize ?? 28}</Text>
        <Slider
          minimumValue={14}
          maximumValue={72}
          step={1}
          value={overlay.fontSize ?? 28}
          onSlidingComplete={(v) => onChange({ fontSize: Math.round(v) })}
          minimumTrackTintColor={COLORS.yellow}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.yellow}
        />
        <View style={styles.row}>
          {['#FFFFFF', '#F5C518', '#4DA6FF', '#FF4D6D', '#000000'].map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.swatch,
                { backgroundColor: c },
                overlay.color === c && styles.swatchOn,
              ]}
              onPress={() => onChange({ color: c })}
            />
          ))}
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={scale(16)} color={COLORS.danger} />
          <Text style={styles.deleteText}>Delete caption</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: COLORS.background,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      padding: scale(14),
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(8),
    },
    title: {
      color: COLORS.textPrimary,
      fontWeight: '800',
      fontSize: moderateScale(15),
    },
    hint: { color: COLORS.textSecondary, fontSize: moderateScale(12) },
    label: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      fontWeight: '600',
      marginTop: verticalScale(8),
      marginBottom: verticalScale(4),
    },
    input: {
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: scale(10),
      color: COLORS.textPrimary,
      padding: scale(10),
      minHeight: verticalScale(56),
      textAlignVertical: 'top',
    },
    row: { flexDirection: 'row', gap: scale(8), marginTop: verticalScale(10) },
    swatch: {
      width: scale(28),
      height: scale(28),
      borderRadius: scale(14),
      borderWidth: 2,
      borderColor: 'transparent',
    },
    swatchOn: { borderColor: COLORS.yellow },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(8),
      marginTop: verticalScale(14),
      paddingVertical: verticalScale(8),
    },
    deleteText: {
      color: COLORS.danger,
      fontWeight: '700',
      fontSize: moderateScale(12),
    },
  });
}
let styles = makeStyles();
