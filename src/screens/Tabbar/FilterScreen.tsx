import { useTheme } from "../Contexts/ThemeContext";
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  GestureResponderEvent,
} from 'react-native';
import {  SafeAreaView,} from "react-native-safe-area-context"
import { Ionicons } from '@expo/vector-icons';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
let COLORS: Record<string, string> = {
  bg: '#111111',
  surface: '#1C1C1C',
  inputBg: '#1E1E1E',
  yellow: '#F5C518',
  text: '#FFFFFF',
  textMuted: '#888888',
  label: '#AAAAAA',
  border: '#2A2A2A',
  presetBg: '#222222',
  compareBg: '#1A1A1A',
};
const PRESETS = ['Original', 'Golden', 'Vivid', 'Mono'];
interface Adjust {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
}
interface SliderRowProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  onChange: (v: number) => void;
}
function SliderRow({ label, icon, value, onChange }: SliderRowProps) {
  const SLIDER_WIDTH = SCREEN_WIDTH - 32 - 28; // padding + icon width
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{Math.round(value * 100)}%</Text>
      </View>
      <View style={styles.sliderRow}>
        <Ionicons name={icon} size={18} color={COLORS.textMuted} style={styles.sliderIcon} />
        <TouchableOpacity
          style={styles.sliderTrack}
          onPress={(e: GestureResponderEvent) => {
            const ratio = e.nativeEvent.locationX / (SLIDER_WIDTH);
            onChange(Math.min(1, Math.max(0, ratio)));
          }}
        >
          <View style={[styles.sliderFill, { width: `${value * 100}%` }]} />
          <View style={[styles.sliderThumb, { left: `${value * 100}%` }]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
interface Props {
  navigation?: { goBack: () => void };
}
export default function FilterScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  COLORS = {
    ...COLORS,
    bg: colors.background,
    surface: colors.surface,
    text: colors.text,
    textPrimary: colors.text,
    textSecondary: colors.textSecondary,
    textMuted: colors.textMuted,
    textDim: colors.textMuted,
    textTertiary: colors.textMuted,
    border: colors.border,
    trackBg: colors.surface,
    btnBg: colors.iconBg,
    sheet: colors.surface,
    compareBg: colors.surface,
    yellow: colors.accent,
    accent: colors.accent,
    accentYellow: colors.accent,
    pillBg: colors.iconBg,
    trackEmpty: colors.border,
  };
  styles = makeStyles();

  const [preset, setPreset] = useState('Golden');
  const [compareOn, setCompareOn] = useState(false);
  const [adjust, setAdjust] = useState<Adjust>({
    brightness: 0.58,
    contrast: 0.50,
    saturation: 0.70,
    warmth: 0.64,
  });
  function setVal(key: keyof Adjust) {
    return (v: number) => setAdjust(prev => ({ ...prev, [key]: v }));
  }
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.topLeft}>
          <Ionicons name="close" size={20} color={COLORS.text} />
          <Text style={styles.topTitle}>Filters</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={styles.doneBtn}>Done</Text>
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Video Preview ── */}
        <View style={styles.preview}>
          <TouchableOpacity style={styles.playCircle}>
            <Ionicons name="play" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.previewTime}>00:24 / 01:12</Text>
          <Text style={styles.previewName}>Project.mp4</Text>
        </View>
        {/* ── Presets ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PRESETS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.presetRow}>
              {PRESETS.map(p => (
                <TouchableOpacity
                  key={p}
                  style={styles.presetItem}
                  onPress={() => setPreset(p)}
                >
                  <View style={[
                    styles.presetThumb,
                    preset === p && styles.presetThumbActive,
                  ]} />
                  <Text style={[
                    styles.presetLabel,
                    preset === p && styles.presetLabelActive,
                  ]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
        {/* ── Adjust ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ADJUST</Text>
          <SliderRow
            label="Brightness"
            icon="sunny-outline"
            value={adjust.brightness}
            onChange={setVal('brightness')}
          />
          <SliderRow
            label="Contrast"
            icon="aperture-outline"
            value={adjust.contrast}
            onChange={setVal('contrast')}
          />
          <SliderRow
            label="Saturation"
            icon="water-outline"
            value={adjust.saturation}
            onChange={setVal('saturation')}
          />
          <SliderRow
            label="Warmth"
            icon="flash-outline"
            value={adjust.warmth}
            onChange={setVal('warmth')}
          />
        </View>
        {/* ── Compare with original ── */}
        <TouchableOpacity
          style={styles.compareRow}
          onPress={() => setCompareOn(v => !v)}
          activeOpacity={0.8}
        >
          <Ionicons name="eye-outline" size={20} color={COLORS.textMuted} />
          <View style={styles.compareText}>
            <Text style={styles.compareTitle}>Compare with original</Text>
            <Text style={styles.compareSubtitle}>Hold to preview before/after</Text>
          </View>
          {/* Toggle */}
          <View style={[styles.toggle, compareOn && styles.toggleOn]}>
            <View style={[styles.toggleThumb, compareOn && styles.toggleThumbOn]} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
function makeStyles() {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: 32 },
  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topTitle: { color: COLORS.text, fontSize: 17, fontWeight: '600' },
  doneBtn: { color: COLORS.yellow, fontSize: 15, fontWeight: '600' },
  // Preview
  preview: {
    marginHorizontal: 16,
    marginTop: 16,
    height: 200,
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  playCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTime: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  previewName: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  // Section
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionLabel: {
    color: COLORS.label,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  // Presets
  presetRow: { flexDirection: 'row', gap: 12 },
  presetItem: { alignItems: 'center', gap: 8 },
  presetThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: COLORS.presetBg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetThumbActive: {
    borderColor: COLORS.yellow,
  },
  presetLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  presetLabelActive: {
    color: COLORS.yellow,
    fontWeight: '600',
  },
  // Sliders
  sliderBlock: {
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  sliderValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sliderIcon: {
    width: 22,
  },
  sliderTrack: {
    flex: 1,
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    justifyContent: 'center',
  },
  sliderFill: {
    height: 3,
    backgroundColor: COLORS.yellow,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.yellow,
    marginLeft: -8,
    top: -6.5,
  },
  // Compare
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: COLORS.compareBg,
    borderRadius: 12,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  compareText: { flex: 1 },
  compareTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  compareSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  // Toggle
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: COLORS.yellow },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.text,
    alignSelf: 'flex-start',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
});
}
let styles = makeStyles();
