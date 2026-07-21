/**
 * Adjustment layer — time-ranged grade/opacity over the timeline.
 */
import React, { useState } from 'react';
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
import { useAppPalette } from '../Contexts/ThemeContext';
import { AdjustmentLayer, DEFAULT_COLOR_GRADE } from '../types';

let COLORS: Record<string, string> = {
  background: '#151821',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  border: '#2A2A2E',
  danger: '#E85D5D',
};

interface AdjustmentLayerPanelProps {
  visible: boolean;
  layers: AdjustmentLayer[];
  playheadMs: number;
  onAdd: (layer: Omit<AdjustmentLayer, 'id'>) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export default function AdjustmentLayerPanel({
  visible,
  layers,
  playheadMs,
  onAdd,
  onRemove,
  onClose,
}: AdjustmentLayerPanelProps) {
  const p = useAppPalette();
  COLORS = {
    ...COLORS,
    background: p.background,
    border: p.border,
    yellow: p.yellow,
    textPrimary: p.textPrimary,
    textSecondary: p.textSecondary,
    danger: p.danger,
  };
  styles = makeStyles();
  const [brightness, setBrightness] = useState(0.1);
  const [durationSec, setDurationSec] = useState(4);

  if (!visible) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Adjustment layer</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        Adds a non-destructive look over clips from the playhead for a chosen
        duration (baked on export as overlapping grade).
      </Text>
      <Text style={styles.label}>Brightness · {brightness.toFixed(2)}</Text>
      <Slider
        minimumValue={-0.5}
        maximumValue={0.5}
        value={brightness}
        onValueChange={setBrightness}
        minimumTrackTintColor={COLORS.yellow}
        maximumTrackTintColor={COLORS.border}
        thumbTintColor={COLORS.yellow}
      />
      <Text style={styles.label}>Duration · {durationSec.toFixed(1)}s</Text>
      <Slider
        minimumValue={1}
        maximumValue={20}
        value={durationSec}
        onValueChange={setDurationSec}
        minimumTrackTintColor={COLORS.yellow}
        maximumTrackTintColor={COLORS.border}
        thumbTintColor={COLORS.yellow}
      />
      <TouchableOpacity
        style={styles.primary}
        onPress={() =>
          onAdd({
            name: 'Adjust',
            startMs: Math.max(0, Math.round(playheadMs)),
            durationMs: Math.round(durationSec * 1000),
            opacity: 1,
            colorGrade: {
              ...DEFAULT_COLOR_GRADE,
              brightness,
              contrast: 0.08,
            },
          })
        }
      >
        <Text style={styles.primaryText}>Add at playhead</Text>
      </TouchableOpacity>
      <ScrollView style={{ maxHeight: verticalScale(120) }}>
        {layers.length === 0 ? (
          <Text style={styles.empty}>No adjustment layers.</Text>
        ) : (
          layers.map((l) => (
            <View key={l.id} style={styles.row}>
              <Text style={styles.rowText}>
                {l.name || 'Adjust'} · {(l.startMs / 1000).toFixed(1)}s ·{' '}
                {(l.durationMs / 1000).toFixed(1)}s
              </Text>
              <TouchableOpacity onPress={() => onRemove(l.id)}>
                <Ionicons name="trash-outline" size={scale(16)} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))
        )}
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
      marginBottom: verticalScale(8),
    },
    title: {
      color: COLORS.textPrimary,
      fontWeight: '800',
      fontSize: moderateScale(15),
    },
    hint: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      marginBottom: verticalScale(8),
      lineHeight: moderateScale(15),
    },
    label: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      marginTop: verticalScale(6),
    },
    primary: {
      backgroundColor: COLORS.yellow,
      borderRadius: scale(8),
      paddingVertical: verticalScale(10),
      alignItems: 'center',
      marginVertical: verticalScale(10),
    },
    primaryText: { color: '#1A0E00', fontWeight: '800' },
    empty: { color: COLORS.textSecondary },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: verticalScale(8),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    rowText: {
      color: COLORS.textPrimary,
      fontSize: moderateScale(12),
      fontWeight: '600',
    },
  });
}
let styles = makeStyles();
