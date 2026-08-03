/**
 * RGB / master color curves + optional .cube LUT import.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Slider from '@react-native-community/slider';
import * as DocumentPicker from 'expo-document-picker';
import { useAppPalette } from '../Contexts/ThemeContext';
import { ColorCurves, DEFAULT_COLOR_CURVES } from '../types';

let COLORS: Record<string, string> = {
  background: '#151821',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  border: '#2A2A2E',
};

interface CurvesLutPanelProps {
  visible: boolean;
  curves?: ColorCurves;
  lutUri?: string;
  lutIntensity?: number;
  onChangeCurves: (c: ColorCurves) => void;
  onChangeLut: (uri: string | undefined, intensity?: number) => void;
  onClose: () => void;
}

export default function CurvesLutPanel({
  visible,
  curves = DEFAULT_COLOR_CURVES,
  lutUri,
  lutIntensity = 1,
  onChangeCurves,
  onChangeLut,
  onClose,
}: CurvesLutPanelProps) {
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

  const set = (key: keyof ColorCurves, v: number) =>
    onChangeCurves({ ...curves, [key]: v });

  const pickLut = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/octet-stream', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      if (!asset.name?.toLowerCase().endsWith('.cube') && !asset.uri.includes('.cube')) {
        Alert.alert('LUT', 'Pick a .cube LUT file for best results.');
      }
      onChangeLut(asset.uri, lutIntensity);
    } catch (e: any) {
      Alert.alert('LUT', e?.message ?? 'Could not open file.');
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Curves + LUT</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      {(['master', 'r', 'g', 'b'] as const).map((k) => (
        <View key={k}>
          <Text style={styles.label}>
            {k.toUpperCase()} · {curves[k].toFixed(2)}
          </Text>
          <Slider
            minimumValue={-1}
            maximumValue={1}
            value={curves[k]}
            onSlidingComplete={(v) => set(k, v)}
            minimumTrackTintColor={COLORS.yellow}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.yellow}
          />
        </View>
      ))}
      <TouchableOpacity style={styles.btn} onPress={pickLut}>
        <Ionicons name="document-outline" size={scale(16)} color={COLORS.yellow} />
        <Text style={styles.btnText}>
          {lutUri ? 'Replace .cube LUT' : 'Import .cube LUT'}
        </Text>
      </TouchableOpacity>
      {!!lutUri && (
        <>
          <Text style={styles.label}>LUT mix · {lutIntensity.toFixed(2)}</Text>
          <Slider
            minimumValue={0}
            maximumValue={1}
            value={lutIntensity}
            onSlidingComplete={(v) => onChangeLut(lutUri, v)}
            minimumTrackTintColor={COLORS.yellow}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.yellow}
          />
          <TouchableOpacity onPress={() => onChangeLut(undefined, 1)}>
            <Text style={styles.clear}>Remove LUT</Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity
        onPress={() => onChangeCurves(DEFAULT_COLOR_CURVES)}
        style={{ marginTop: verticalScale(8) }}
      >
        <Text style={styles.clear}>Reset curves</Text>
      </TouchableOpacity>
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
    label: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      marginTop: verticalScale(4),
    },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(8),
      marginTop: verticalScale(12),
      paddingVertical: verticalScale(10),
    },
    btnText: {
      color: COLORS.yellow,
      fontWeight: '700',
      fontSize: moderateScale(13),
    },
    clear: {
      color: COLORS.textSecondary,
      fontWeight: '600',
      fontSize: moderateScale(12),
    },
  });
}
let styles = makeStyles();
