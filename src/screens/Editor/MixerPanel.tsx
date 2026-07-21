/**
 * Multi-track mixer — levels, duck, and deep clip audio FX (denoise / EQ / gate).
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Slider from '@react-native-community/slider';
import { useAppPalette } from '../Contexts/ThemeContext';
import type { ClipAudioFx } from '../types';
import { DEFAULT_AUDIO_FX } from '../types';
import { AUDIO_FX_PRESETS } from '../services/audioFxPresets';

let COLORS: Record<string, string> = {
  background: '#151821',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  border: '#2A2A2E',
  surface: '#1A1D27',
};

interface MixerPanelProps {
  visible: boolean;
  clipVolume: number;
  musicVolume: number;
  voiceoverVolume: number;
  duckEnabled: boolean;
  duckLevel: number;
  audioFx?: ClipAudioFx;
  hasClip: boolean;
  onClipVolume: (v: number) => void;
  onMusicVolume: (v: number) => void;
  onVoiceoverVolume: (v: number) => void;
  onDuckEnabled: (v: boolean) => void;
  onDuckLevel: (v: number) => void;
  onAudioFxChange?: (fx: Partial<ClipAudioFx>) => void;
  onClose: () => void;
}

export default function MixerPanel({
  visible,
  clipVolume,
  musicVolume,
  voiceoverVolume,
  duckEnabled,
  duckLevel,
  audioFx,
  hasClip,
  onClipVolume,
  onMusicVolume,
  onVoiceoverVolume,
  onDuckEnabled,
  onDuckLevel,
  onAudioFxChange,
  onClose,
}: MixerPanelProps) {
  const p = useAppPalette();
  COLORS = {
    ...COLORS,
    background: p.background,
    border: p.border,
    yellow: p.yellow,
    textPrimary: p.textPrimary,
    textSecondary: p.textSecondary,
    surface: p.surface ?? COLORS.surface,
  };
  styles = makeStyles();
  if (!visible) return null;

  const fx = { ...DEFAULT_AUDIO_FX, ...audioFx };
  const db = (n: number) => ((n ?? 0) * 12).toFixed(0);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Mixer</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: verticalScale(16) }}
      >
        <Text style={styles.section}>LEVELS</Text>
        <Fader label="Clip" value={clipVolume} onChange={onClipVolume} />
        <Fader label="Music" value={musicVolume} onChange={onMusicVolume} />
        <Fader
          label="Voiceover"
          value={voiceoverVolume}
          onChange={onVoiceoverVolume}
        />
        <View style={styles.duckRow}>
          <Text style={styles.label}>Duck music under VO</Text>
          <Switch
            value={duckEnabled}
            onValueChange={onDuckEnabled}
            trackColor={{ true: COLORS.yellow, false: COLORS.border }}
          />
        </View>
        {duckEnabled && (
          <Fader label="Duck level" value={duckLevel} onChange={onDuckLevel} max={1} />
        )}

        <Text style={styles.section}>CLEAN & ENHANCE</Text>
        {!hasClip ? (
          <Text style={styles.hint}>Select a clip to edit denoise / EQ.</Text>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetRow}
            >
              {AUDIO_FX_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={styles.preset}
                  onPress={() => onAudioFxChange?.(preset.fx)}
                >
                  <Text style={styles.presetText}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.duckRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Enhance speech</Text>
                <Text style={styles.hint}>Presence + compress (export)</Text>
              </View>
              <Switch
                value={!!fx.enhanceSpeech}
                onValueChange={(enhanceSpeech) =>
                  onAudioFxChange?.({ enhanceSpeech })
                }
                trackColor={{ true: COLORS.yellow, false: COLORS.border }}
              />
            </View>
            {!!fx.enhanceSpeech && (
              <Fader
                label={`Enhance strength · ${Math.round((fx.enhanceStrength ?? 0.75) * 100)}%`}
                value={fx.enhanceStrength ?? 0.75}
                onChange={(enhanceStrength) =>
                  onAudioFxChange?.({ enhanceStrength })
                }
                max={1}
              />
            )}
            <Fader
              label={`Denoise · ${Math.round((fx.noiseReduction ?? 0) * 100)}%`}
              value={fx.noiseReduction ?? 0}
              onChange={(noiseReduction) =>
                onAudioFxChange?.({ noiseReduction })
              }
              max={1}
            />
            <Fader
              label={`De-esser · ${Math.round((fx.deEsser ?? 0) * 100)}%`}
              value={fx.deEsser ?? 0}
              onChange={(deEsser) => onAudioFxChange?.({ deEsser })}
              max={1}
            />
            <Fader
              label={`Noise gate · ${Math.round((fx.gate ?? 0) * 100)}%`}
              value={fx.gate ?? 0}
              onChange={(gate) => onAudioFxChange?.({ gate })}
              max={1}
            />

            <Text style={styles.section}>FULL EQ</Text>
            <EqFader
              label={`Sub · ${db(fx.eqSub ?? 0)} dB`}
              value={fx.eqSub ?? 0}
              onChange={(eqSub) => onAudioFxChange?.({ eqSub })}
            />
            <EqFader
              label={`Low · ${db(fx.eqLow ?? 0)} dB`}
              value={fx.eqLow ?? 0}
              onChange={(eqLow) => onAudioFxChange?.({ eqLow })}
            />
            <EqFader
              label={`Mid · ${db(fx.eqMid ?? 0)} dB`}
              value={fx.eqMid ?? 0}
              onChange={(eqMid) => onAudioFxChange?.({ eqMid })}
            />
            <EqFader
              label={`Presence · ${db(fx.eqPresence ?? 0)} dB`}
              value={fx.eqPresence ?? 0}
              onChange={(eqPresence) => onAudioFxChange?.({ eqPresence })}
            />
            <EqFader
              label={`High · ${db(fx.eqHigh ?? 0)} dB`}
              value={fx.eqHigh ?? 0}
              onChange={(eqHigh) => onAudioFxChange?.({ eqHigh })}
            />
            <EqFader
              label={`Air · ${db(fx.eqAir ?? 0)} dB`}
              value={fx.eqAir ?? 0}
              onChange={(eqAir) => onAudioFxChange?.({ eqAir })}
            />

            <View style={styles.duckRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Compressor</Text>
                <Text style={styles.hint}>Even out loud / quiet speech</Text>
              </View>
              <Switch
                value={!!fx.compressor}
                onValueChange={(compressor) =>
                  onAudioFxChange?.({ compressor })
                }
                trackColor={{ true: COLORS.yellow, false: COLORS.border }}
              />
            </View>
            {!!fx.compressor && (
              <>
                <Fader
                  label={`Threshold · ${(fx.compThreshold ?? -18).toFixed(0)} dB`}
                  value={fx.compThreshold ?? -18}
                  onChange={(compThreshold) =>
                    onAudioFxChange?.({ compThreshold })
                  }
                  min={-40}
                  max={-5}
                />
                <Fader
                  label={`Ratio · ${(fx.compRatio ?? 3).toFixed(1)}:1`}
                  value={fx.compRatio ?? 3}
                  onChange={(compRatio) => onAudioFxChange?.({ compRatio })}
                  min={1.5}
                  max={8}
                />
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Fader({
  label,
  value,
  onChange,
  min = 0,
  max = 2,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={{ marginBottom: verticalScale(6) }}>
      <Text style={styles.label}>{label}</Text>
      <Slider
        minimumValue={min}
        maximumValue={max}
        value={value}
        onSlidingComplete={onChange}
        onValueChange={onChange}
        minimumTrackTintColor={COLORS.yellow}
        maximumTrackTintColor={COLORS.border}
        thumbTintColor={COLORS.yellow}
      />
    </View>
  );
}

function EqFader({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={{ marginBottom: verticalScale(4) }}>
      <Text style={styles.label}>{label}</Text>
      <Slider
        minimumValue={-1}
        maximumValue={1}
        step={0.05}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={COLORS.yellow}
        maximumTrackTintColor={COLORS.border}
        thumbTintColor={COLORS.yellow}
      />
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: COLORS.background,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      paddingHorizontal: scale(14),
      paddingTop: scale(10),
      maxHeight: verticalScale(360),
    },
    scroll: { maxHeight: verticalScale(310) },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: verticalScale(6),
    },
    title: {
      color: COLORS.textPrimary,
      fontWeight: '800',
      fontSize: moderateScale(15),
    },
    section: {
      color: COLORS.yellow,
      fontWeight: '800',
      fontSize: moderateScale(10),
      letterSpacing: 0.8,
      marginTop: verticalScale(10),
      marginBottom: verticalScale(6),
    },
    label: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      fontWeight: '600',
    },
    hint: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(10),
      opacity: 0.85,
      marginBottom: verticalScale(4),
    },
    duckRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: verticalScale(6),
      marginBottom: verticalScale(4),
    },
    presetRow: {
      gap: scale(8),
      paddingBottom: verticalScale(6),
    },
    preset: {
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: scale(16),
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(6),
    },
    presetText: {
      color: COLORS.textPrimary,
      fontSize: moderateScale(11),
      fontWeight: '700',
    },
  });
}
let styles = makeStyles();
