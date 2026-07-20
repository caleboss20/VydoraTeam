/**
 * Blank colored sheets — intro/outro title cards with text + animation.
 * e.g. “Welcome to Amalife Clinic” for 5s, then jump into footage.
 */
import React, { useState } from 'react';
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
import type { TextAnimationType, TitleCardSettings } from '../types';
import { TEXT_ANIM_IN_PRESETS } from '../services/textAnimPresets';
import { useAppPalette } from '../Contexts/ThemeContext';


let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
};

const PAGE_COLORS = [
  '#000000',
  '#FFFFFF',
  '#0B0D13',
  '#1E3A5F',
  '#0D47A1',
  '#1565C0',
  '#4DA6FF',
  '#00695C',
  '#10B981',
  '#F5C518',
  '#FF4D6D',
  '#7C3AED',
  '#4A148C',
  '#37474F',
];

const DURATIONS = [2, 3, 5, 8, 10];

type InsertWhere = 'start' | 'before' | 'after' | 'end';

interface TitleCardPanelProps {
  visible: boolean;
  onAdd: (card: TitleCardSettings, durationMs: number, where: InsertWhere) => void;
  onClose: () => void;
}

export default function TitleCardPanel({
  visible,
  onAdd,
  onClose,
}: TitleCardPanelProps) {
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

  const [title, setTitle] = useState('Welcome to Amalife Clinic');
  const [subtitle, setSubtitle] = useState('');
  const [bg, setBg] = useState('#000000');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [durationSec, setDurationSec] = useState(5);
  const [anim, setAnim] = useState<TextAnimationType>('bounce');
  const [where, setWhere] = useState<InsertWhere>('start');
  const [fontSize, setFontSize] = useState(42);

  if (!visible) return null;

  const lightBg = ['#FFFFFF', '#F5C518'].includes(bg.toUpperCase());
  const autoText = lightBg ? '#0B0D13' : '#FFFFFF';

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Title card</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={scale(20)} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: verticalScale(20) }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hint}>
          Blank colored page with your message — put Welcome at the start,
          Thank you at the end. Music keeps playing; bounce/fade the text.
        </Text>

        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Main title"
          placeholderTextColor={COLORS.textSecondary}
        />
        <TextInput
          style={[styles.input, styles.inputSm]}
          value={subtitle}
          onChangeText={setSubtitle}
          placeholder="Subtitle (optional)"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={styles.section}>PAGE COLOR</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.swatchRow}
        >
          {PAGE_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.swatch,
                { backgroundColor: c },
                bg.toLowerCase() === c.toLowerCase() && styles.swatchOn,
              ]}
              onPress={() => {
                setBg(c);
                setTextColor(
                  ['#FFFFFF', '#F5C518'].includes(c.toUpperCase())
                    ? '#0B0D13'
                    : '#FFFFFF'
                );
              }}
            />
          ))}
        </ScrollView>

        <Text style={styles.section}>TEXT COLOR</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.swatchRow}
        >
          {['#FFFFFF', '#0B0D13', '#F5C518', '#4DA6FF', '#FF4D6D', autoText].map(
            (c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.swatch,
                  { backgroundColor: c },
                  textColor.toLowerCase() === c.toLowerCase() && styles.swatchOn,
                ]}
                onPress={() => setTextColor(c)}
              />
            )
          )}
        </ScrollView>

        <Text style={styles.section}>DURATION</Text>
        <View style={styles.row}>
          {DURATIONS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, durationSec === d && styles.chipOn]}
              onPress={() => setDurationSec(d)}
            >
              <Text style={[styles.chipText, durationSec === d && styles.chipTextOn]}>
                {d}s
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.sliderRow}>
          <Text style={styles.label}>Custom</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={15}
            step={0.5}
            value={durationSec}
            onValueChange={setDurationSec}
            minimumTrackTintColor={COLORS.yellow}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.yellow}
          />
          <Text style={styles.val}>{durationSec.toFixed(1)}s</Text>
        </View>

        <View style={styles.sliderRow}>
          <Text style={styles.label}>Size</Text>
          <Slider
            style={styles.slider}
            minimumValue={22}
            maximumValue={72}
            value={fontSize}
            onValueChange={setFontSize}
            minimumTrackTintColor={COLORS.yellow}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.yellow}
          />
          <Text style={styles.val}>{Math.round(fontSize)}</Text>
        </View>

        <Text style={styles.section}>TEXT ANIMATION</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.swatchRow}
        >
          {TEXT_ANIM_IN_PRESETS.filter((p) =>
            ['none', 'fade', 'bounce', 'pop', 'elastic', 'typewriter', 'reveal', 'ghost'].includes(
              p.id
            )
          ).map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.chip, anim === p.id && styles.chipOn]}
              onPress={() => setAnim(p.id)}
            >
              <Text style={[styles.chipText, anim === p.id && styles.chipTextOn]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.section}>PLACE ON TIMELINE</Text>
        <View style={styles.row}>
          {(
            [
              { id: 'start' as const, label: 'Start' },
              { id: 'before' as const, label: 'Before clip' },
              { id: 'after' as const, label: 'After clip' },
              { id: 'end' as const, label: 'End' },
            ]
          ).map((w) => (
            <TouchableOpacity
              key={w.id}
              style={[styles.chip, where === w.id && styles.chipOn]}
              onPress={() => setWhere(w.id)}
            >
              <Text style={[styles.chipText, where === w.id && styles.chipTextOn]}>
                {w.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.preview, { backgroundColor: bg }]}>
          <Text
            style={{
              color: textColor,
              fontSize: moderateScale(Math.min(22, fontSize * 0.45)),
              fontWeight: '800',
              textAlign: 'center',
              paddingHorizontal: scale(12),
            }}
          >
            {title || 'Title'}
          </Text>
          {!!subtitle && (
            <Text
              style={{
                color: textColor,
                opacity: 0.75,
                fontSize: moderateScale(11),
                marginTop: verticalScale(6),
                textAlign: 'center',
              }}
            >
              {subtitle}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.primary}
          onPress={() => {
            if (!title.trim()) return;
            onAdd(
              {
                backgroundColor: bg,
                title: title.trim(),
                subtitle: subtitle.trim() || undefined,
                textColor,
                fontSize: Math.round(fontSize),
                animationIn: anim,
                animationLoop: anim === 'bounce' || anim === 'pulse' ? 'pulse' : 'none',
              },
              Math.round(durationSec * 1000),
              where
            );
          }}
        >
          <Ionicons name="add" size={scale(16)} color="#0B0D13" />
          <Text style={styles.primaryText}>Add title card</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function __makeStyles() {
  return StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: scale(16),
    borderTopRightRadius: scale(16),
    maxHeight: verticalScale(460),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  body: { maxHeight: verticalScale(400), paddingHorizontal: scale(16) },
  hint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    lineHeight: moderateScale(16),
    marginTop: verticalScale(10),
    marginBottom: verticalScale(10),
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textPrimary,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    fontSize: moderateScale(14),
    fontWeight: '600',
    marginBottom: verticalScale(8),
  },
  inputSm: { fontWeight: '400', fontSize: moderateScale(12) },
  section: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
    fontWeight: '700',
    letterSpacing: 0.7,
    marginTop: verticalScale(10),
    marginBottom: verticalScale(8),
  },
  swatchRow: { gap: scale(8), paddingBottom: verticalScale(4) },
  swatch: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  swatchOn: { borderColor: COLORS.yellow, borderWidth: 2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  chip: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipOn: {
    borderColor: COLORS.yellow,
    backgroundColor: 'rgba(245,197,24,0.12)',
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  chipTextOn: { color: COLORS.yellow },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: verticalScale(6),
  },
  label: {
    color: COLORS.textSecondary,
    width: scale(52),
    fontSize: moderateScale(11),
  },
  slider: { flex: 1, height: verticalScale(28) },
  val: {
    color: COLORS.textPrimary,
    width: scale(40),
    textAlign: 'right',
    fontWeight: '700',
    fontSize: moderateScale(11),
  },
  preview: {
    marginTop: verticalScale(14),
    borderRadius: scale(12),
    minHeight: verticalScale(88),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  primary: {
    marginTop: verticalScale(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: COLORS.yellow,
    borderRadius: scale(12),
    paddingVertical: verticalScale(12),
  },
  primaryText: {
    color: '#0B0D13',
    fontWeight: '800',
    fontSize: moderateScale(13),
  },
});
}
let styles = __makeStyles();

