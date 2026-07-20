import { useTheme } from "../Contexts/ThemeContext";

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView,} from "react-native-safe-area-context"
import { Ionicons } from '@expo/vector-icons';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
let COLORS: Record<string, string> = {
  bg: '#111111',
  surface: '#1C1C1C',
  surfaceAlt: '#252525',
  yellow: '#F5C518',
  text: '#FFFFFF',
  textMuted: '#888888',
  label: '#AAAAAA',
  border: '#2A2A2A',
  inputBg: '#1E1E1E',
  chipBg: '#2A2A2A',
  chipActive: '#F5C518',
};
const FONTS = ['Display', 'Sans', 'Serif', 'Mono'];
const ANIMATIONS = ['None', 'Fade', 'Slide', 'Pop'];
const TEXT_COLORS = ['#F5C518', '#FFFFFF', '#1A1A1A', '#FF6B6B', '#3ECFCF', '#8B5CF6', '#60B8FF'];
type Alignment = 'left' | 'center' | 'right';
interface Props {
  navigation?: { goBack: () => void };
}
export default function AddTextScreen({ navigation }: Props) {
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

  const [caption, setCaption] = useState('Project');
  const [font, setFont] = useState('Display');
  const [alignment, setAlignment] = useState<Alignment>('center');
  const [size, setSize] = useState(0.64);
  const [color, setColor] = useState('#F5C518');
  const [animation, setAnimation] = useState('Fade');
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.topLeft}>
          <Ionicons name="close" size={20} color={COLORS.text} />
          <Text style={styles.topTitle}>Add text</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={styles.doneBtn}>Done</Text>
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Preview ── */}
        <View style={styles.preview}>
          <Text style={[styles.previewText, { color, fontFamily: font === 'Serif' ? 'serif' : font === 'Mono' ? 'monospace' : undefined }]}>
            {caption || 'Project'}
          </Text>
          <View style={[styles.previewUnderline, { backgroundColor: color }]} />
        </View>
        {/* ── Caption Text ── */}
        <View style={styles.section}>
          <Text style={styles.label}>CAPTION TEXT</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={caption}
              onChangeText={setCaption}
              placeholderTextColor={COLORS.textMuted}
              selectionColor={COLORS.yellow}
            />
            <Ionicons name="text" size={18} color={COLORS.textMuted} />
          </View>
        </View>
        {/* ── Font ── */}
        <View style={styles.section}>
          <Text style={styles.label}>FONT</Text>
          <View style={styles.chipRow}>
            {FONTS.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, font === f && styles.chipActive]}
                onPress={() => setFont(f)}
              >
                <Text style={[styles.chipText, font === f && styles.chipTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {/* ── Position ── */}
        <View style={styles.section}>
          <Text style={styles.label}>POSITION</Text>
          <View style={styles.positionRow}>
            <View style={styles.alignBtns}>
              {(['left', 'center', 'right'] as Alignment[]).map(a => (
                <TouchableOpacity
                  key={a}
                  style={[styles.alignBtn, alignment === a && styles.alignBtnActive]}
                  onPress={() => setAlignment(a)}
                >
                  <Ionicons
                    name={
                      a === 'left'
                        ? 'align-left-outline' as keyof typeof Ionicons.glyphMap
                        : a === 'center'
                        ? 'menu-outline' as keyof typeof Ionicons.glyphMap
                        : 'align-right-outline' as keyof typeof Ionicons.glyphMap
                    }
                    size={18}
                    color={alignment === a ? '#000' : COLORS.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.positionDropdown}>
              <Text style={styles.positionDropdownText}>Bottom safe area</Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
        {/* ── Size ── */}
        <View style={styles.section}>
          <View style={styles.sizeHeader}>
            <Text style={styles.labelInline}>Size</Text>
            <Text style={styles.sizeValue}>{Math.round(size * 100)}%</Text>
          </View>
          <TouchableOpacity
            style={styles.sliderTrack}
            onPress={e => {
              const ratio = e.nativeEvent.locationX / (SCREEN_WIDTH - 32);
              setSize(Math.min(1, Math.max(0, ratio)));
            }}
          >
            <View style={[styles.sliderFill, { width: `${size * 100}%` }]} />
            <View style={[styles.sliderThumb, { left: `${size * 100}%` }]} />
          </TouchableOpacity>
        </View>
        {/* ── Color ── */}
        <View style={styles.section}>
          <Text style={styles.label}>COLOR</Text>
          <View style={styles.colorRow}>
            {TEXT_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  color === c && styles.colorDotActive,
                ]}
              />
            ))}
          </View>
        </View>
        {/* ── Animation ── */}
        <View style={styles.section}>
          <Text style={styles.label}>ANIMATION</Text>
          <View style={styles.chipRow}>
            {ANIMATIONS.map(a => (
              <TouchableOpacity
                key={a}
                style={[styles.chip, animation === a && styles.chipActive]}
                onPress={() => setAnimation(a)}
              >
                <Text style={[styles.chipText, animation === a && styles.chipTextActive]}>
                  {a}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
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
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topTitle: { color: COLORS.text, fontSize: 17, fontWeight: '600' },
  doneBtn: { color: COLORS.yellow, fontSize: 15, fontWeight: '600' },
  // Preview
  preview: {
    marginHorizontal: 16,
    height: 180,
    backgroundColor: '#0A0A0A',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  previewText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  previewUnderline: {
    width: 80,
    height: 2,
    borderRadius: 1,
    marginTop: 6,
  },
  // Section
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  label: {
    color: COLORS.label,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  labelInline: {
    color: COLORS.label,
    fontSize: 13,
  },
  // Input
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
  },
  // Chips
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.chipBg,
  },
  chipActive: { backgroundColor: COLORS.yellow },
  chipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#000', fontWeight: '700' },
  // Position row
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  alignBtns: { flexDirection: 'row', gap: 6 },
  alignBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alignBtnActive: { backgroundColor: COLORS.yellow },
  positionDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  positionDropdownText: { color: COLORS.textMuted, fontSize: 12 },
  // Size slider
  sizeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sizeValue: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
  sliderTrack: {
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
  // Colors
  colorRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  colorDotActive: {
    borderWidth: 2.5,
    borderColor: COLORS.text,
  },
});
}
let styles = makeStyles();
