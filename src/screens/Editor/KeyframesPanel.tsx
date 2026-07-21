/**
 * CapCut-style keyframe strip — add/clear volume & opacity diamonds at playhead.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useAppPalette } from '../Contexts/ThemeContext';

let COLORS: Record<string, string> = {
  background: '#151821',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  border: '#2A2A2E',
};

interface KeyframesPanelProps {
  visible: boolean;
  playheadLabel: string;
  volumeCount: number;
  opacityCount: number;
  onAddVolume: () => void;
  onAddOpacity: () => void;
  onClearVolume: () => void;
  onClearOpacity: () => void;
  onClose: () => void;
}

export default function KeyframesPanel({
  visible,
  playheadLabel,
  volumeCount,
  opacityCount,
  onAddVolume,
  onAddOpacity,
  onClearVolume,
  onClearOpacity,
  onClose,
}: KeyframesPanelProps) {
  const p = useAppPalette();
  COLORS = {
    ...COLORS,
    background: p.background,
    border: p.border,
    yellow: p.yellow,
    textPrimary: p.textPrimary,
    textSecondary: p.textSecondary,
  };
  styles = makeStyles();
  if (!visible) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Keyframes</Text>
          <Text style={styles.sub}>Playhead {playheadLabel}</Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      <Row
        label="Volume"
        count={volumeCount}
        onAdd={onAddVolume}
        onClear={onClearVolume}
      />
      <Row
        label="Opacity"
        count={opacityCount}
        onAdd={onAddOpacity}
        onClear={onClearOpacity}
      />
      <Text style={styles.hint}>
        Diamonds appear on the clip timeline. Ease is linear in preview; export
        interpolates per frame.
      </Text>
    </View>
  );
}

function Row({
  label,
  count,
  onAdd,
  onClear,
}: {
  label: string;
  count: number;
  onAdd: () => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>
        {label} · {count}
      </Text>
      <View style={styles.rowBtns}>
        <TouchableOpacity style={styles.btn} onPress={onAdd}>
          <Text style={styles.btnText}>Add ◆</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnGhost} onPress={onClear}>
          <Text style={styles.btnGhostText}>Clear</Text>
        </TouchableOpacity>
      </View>
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
      marginBottom: verticalScale(10),
    },
    title: {
      color: COLORS.textPrimary,
      fontWeight: '800',
      fontSize: moderateScale(15),
    },
    sub: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      marginTop: 2,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: verticalScale(8),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    rowLabel: {
      color: COLORS.textPrimary,
      fontWeight: '600',
      fontSize: moderateScale(13),
    },
    rowBtns: { flexDirection: 'row', gap: scale(8) },
    btn: {
      backgroundColor: COLORS.yellow,
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(6),
      borderRadius: scale(8),
    },
    btnText: { color: '#1A0E00', fontWeight: '800', fontSize: moderateScale(11) },
    btnGhost: {
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(6),
      borderRadius: scale(8),
    },
    btnGhostText: {
      color: COLORS.textSecondary,
      fontWeight: '600',
      fontSize: moderateScale(11),
    },
    hint: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      marginTop: verticalScale(10),
      lineHeight: moderateScale(15),
    },
  });
}
let styles = makeStyles();
