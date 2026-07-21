/**
 * Inline bottom panel for Audio / Speed / Text tools.
 *
 * Text tool (CapCut-style):
 *   - Type directly on the video preview; this panel is styles only
 *   - Text color + background pill swatches
 *   - Entrance animation presets (fade / typewriter / pop / …)
 *   - Font-size slider; Delete when editing an existing overlay
 *
 * Speed tool:
 *   - Constant rate presets + CapCut-style speed curves + Reverse toggle
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Slider from '@react-native-community/slider';
import {
  SpeedCurveId,
  TextAnimationType,
  TextBlendMode,
  ClipAudioFx,
  DEFAULT_AUDIO_FX,
} from '../types';
import { SPEED_CURVE_PRESETS } from '../services/speedCurves';
import { useAppPalette } from '../Contexts/ThemeContext';
import {
  TEXT_ANIM_IN_PRESETS,
  TEXT_ANIM_OUT_PRESETS,
  TEXT_ANIM_LOOP_PRESETS,
  TEXT_BLEND_MODES,
} from '../services/textAnimPresets';

let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#e7e55c',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
};
const SPEED_PRESETS = [0.5, 0.75, 0.9, 1, 1.2, 1.5];
/** Glyph colors shown as round swatches under "Text color". */
const TEXT_COLORS = [
  '#FFFFFF',
  '#F5C518',
  '#FF4D6D',
  '#FF8A3D',
  '#4DA6FF',
  '#00D4FF',
  '#4DFF88',
  '#B44DFF',
  '#FF4DB8',
  '#000000',
  '#C0C0C0',
  '#8B4513',
];
/** Pill fill colors under "Background". Ban icon = no pill (undefined). */
const TEXT_BG_COLORS = ['#000000', '#FFFFFF', '#F5C518', '#FF4D6D', '#4DA6FF', '#10B981', '#7C3AED'];
const TEXT_FONTS = [
  'System',
  'Serif',
  'Mono',
  'Impact',
  'Comic',
  'Georgia',
  'Arial',
  'Verdana',
] as const;


interface EditToolPanelProps {
  visible: boolean;
  toolLabel: string | null;
  onClose: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  opacity?: number;
  onOpacityChange?: (v: number) => void;
  volumeKeyframeCount?: number;
  onAddVolumeKeyframe?: () => void;
  onClearVolumeKeyframes?: () => void;
  opacityKeyframeCount?: number;
  onAddOpacityKeyframe?: () => void;
  onClearOpacityKeyframes?: () => void;
  /** Per-clip NR / EQ / compressor / speech enhance. */
  audioFx?: ClipAudioFx;
  onAudioFxChange?: (fx: Partial<ClipAudioFx>) => void;
  speed: number;
  onSpeedChange: (s: number) => void;
  /** CapCut curve preset; 'none' = use constant speed. */
  speedCurve?: SpeedCurveId;
  onSpeedCurveChange?: (curve: SpeedCurveId) => void;
  reversed?: boolean;
  onReversedChange?: (reversed: boolean) => void;
  // ── Text tool (styles for the on-video text box) ──
  textColor?: string;
  onTextColorChange?: (color: string) => void;
  /** CapCut-style pill behind the glyphs; undefined = transparent. */
  backgroundColor?: string | undefined;
  onBackgroundColorChange?: (color: string | undefined) => void;
  fontSize?: number;
  onFontSizeChange?: (size: number) => void;
  fontFamily?: string;
  onFontFamilyChange?: (family: string) => void;
  animationIn?: TextAnimationType;
  onAnimationInChange?: (anim: TextAnimationType) => void;
  animationOut?: TextAnimationType;
  onAnimationOutChange?: (anim: TextAnimationType) => void;
  animationLoop?: TextAnimationType;
  onAnimationLoopChange?: (anim: TextAnimationType) => void;
  animationDurationMs?: number;
  onAnimationDurationChange?: (ms: number) => void;
  blendMode?: TextBlendMode;
  onBlendModeChange?: (mode: TextBlendMode) => void;
  textOpacity?: number;
  onTextOpacityChange?: (v: number) => void;
  isEditingExistingOverlay?: boolean;
  onDeleteOverlay?: () => void;
}
export default function EditToolPanel({
  visible,
  toolLabel,
  onClose,
  volume,
  onVolumeChange,
  opacity = 1,
  onOpacityChange,
  volumeKeyframeCount = 0,
  onAddVolumeKeyframe,
  onClearVolumeKeyframes,
  opacityKeyframeCount = 0,
  onAddOpacityKeyframe,
  onClearOpacityKeyframes,
  audioFx,
  onAudioFxChange,
  speed,
  onSpeedChange,
  speedCurve = 'none',
  onSpeedCurveChange,
  reversed = false,
  onReversedChange,
  textColor = '#FFFFFF',
  onTextColorChange,
  backgroundColor,
  onBackgroundColorChange,
  fontSize = 24,
  onFontSizeChange,
  fontFamily = 'System',
  onFontFamilyChange,
  animationIn = 'fade',
  onAnimationInChange,
  animationOut = 'none',
  onAnimationOutChange,
  animationLoop = 'none',
  onAnimationLoopChange,
  animationDurationMs = 500,
  onAnimationDurationChange,
  blendMode = 'normal',
  onBlendModeChange,
  textOpacity = 1,
  onTextOpacityChange,
  isEditingExistingOverlay = false,
  onDeleteOverlay,
}: EditToolPanelProps) {
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

  const [animTab, setAnimTab] = useState<'in' | 'out' | 'loop'>('in');
  if (!visible || !toolLabel) return null;
  const handleDone = () => {
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
          <ScrollView style={{ maxHeight: verticalScale(320) }} showsVerticalScrollIndicator={false}>
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
            {onAddVolumeKeyframe && (
              <View style={styles.kfRow}>
                <TouchableOpacity style={styles.kfBtn} onPress={onAddVolumeKeyframe}>
                  <Ionicons name="diamond" size={scale(12)} color="#0B0D13" />
                  <Text style={styles.kfBtnText}>Volume keyframe</Text>
                </TouchableOpacity>
                <Text style={styles.kfCount}>
                  {volumeKeyframeCount === 0 ? 'None' : `${volumeKeyframeCount} kf`}
                </Text>
                {volumeKeyframeCount > 0 && onClearVolumeKeyframes && (
                  <TouchableOpacity onPress={onClearVolumeKeyframes} hitSlop={6}>
                    <Text style={styles.clearKf}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={styles.rowLabel}>Opacity over time</Text>
            <View style={styles.sliderRow}>
              <Ionicons name="eye-outline" size={scale(18)} color={COLORS.textSecondary} />
              <Slider
                style={{ flex: 1, marginHorizontal: scale(12) }}
                minimumValue={0}
                maximumValue={1}
                value={opacity}
                onValueChange={(v) => onOpacityChange?.(v)}
                minimumTrackTintColor={COLORS.yellow}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.yellow}
              />
              <Text style={styles.valueText}>{Math.round(opacity * 100)}%</Text>
            </View>
            {onAddOpacityKeyframe && (
              <View style={styles.kfRow}>
                <TouchableOpacity style={styles.kfBtn} onPress={onAddOpacityKeyframe}>
                  <Ionicons name="diamond" size={scale(12)} color="#0B0D13" />
                  <Text style={styles.kfBtnText}>Opacity keyframe</Text>
                </TouchableOpacity>
                <Text style={styles.kfCount}>
                  {opacityKeyframeCount === 0 ? 'None' : `${opacityKeyframeCount} kf`}
                </Text>
                {opacityKeyframeCount > 0 && onClearOpacityKeyframes && (
                  <TouchableOpacity onPress={onClearOpacityKeyframes} hitSlop={6}>
                    <Text style={styles.clearKf}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={styles.rowLabel}>Clean & enhance</Text>
            <View style={styles.fxRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fxTitle}>Enhance speech</Text>
                <Text style={styles.fxHint}>Presence + compress (export)</Text>
              </View>
              <Switch
                value={!!(audioFx?.enhanceSpeech ?? DEFAULT_AUDIO_FX.enhanceSpeech)}
                onValueChange={(enhanceSpeech) => onAudioFxChange?.({ enhanceSpeech })}
                trackColor={{ false: COLORS.border, true: COLORS.yellow }}
                thumbColor="#fff"
              />
            </View>
            {!!(audioFx?.enhanceSpeech ?? DEFAULT_AUDIO_FX.enhanceSpeech) && (
              <>
                <Text style={styles.fxHint}>
                  Enhance strength{' '}
                  {Math.round((audioFx?.enhanceStrength ?? 0.75) * 100)}%
                </Text>
                <Slider
                  minimumValue={0}
                  maximumValue={1}
                  step={0.05}
                  value={audioFx?.enhanceStrength ?? 0.75}
                  onValueChange={(enhanceStrength) =>
                    onAudioFxChange?.({ enhanceStrength })
                  }
                  minimumTrackTintColor={COLORS.textSecondary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.yellow}
                />
              </>
            )}
            <Text style={styles.fxHint}>
              Denoise {Math.round((audioFx?.noiseReduction ?? 0) * 100)}%
            </Text>
            <Slider
              minimumValue={0}
              maximumValue={1}
              step={0.05}
              value={audioFx?.noiseReduction ?? 0}
              onValueChange={(noiseReduction) => onAudioFxChange?.({ noiseReduction })}
              minimumTrackTintColor={COLORS.textSecondary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.yellow}
            />
            <Text style={styles.fxHint}>
              De-esser {Math.round((audioFx?.deEsser ?? 0) * 100)}%
            </Text>
            <Slider
              minimumValue={0}
              maximumValue={1}
              step={0.05}
              value={audioFx?.deEsser ?? 0}
              onValueChange={(deEsser) => onAudioFxChange?.({ deEsser })}
              minimumTrackTintColor={COLORS.textSecondary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.yellow}
            />
            <Text style={styles.fxHint}>
              Noise gate {Math.round((audioFx?.gate ?? 0) * 100)}%
            </Text>
            <Slider
              minimumValue={0}
              maximumValue={1}
              step={0.05}
              value={audioFx?.gate ?? 0}
              onValueChange={(gate) => onAudioFxChange?.({ gate })}
              minimumTrackTintColor={COLORS.textSecondary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.yellow}
            />

            <Text style={styles.rowLabel}>Full EQ</Text>
            {(
              [
                ['eqSub', 'Sub', audioFx?.eqSub ?? 0],
                ['eqLow', 'Low', audioFx?.eqLow ?? 0],
                ['eqMid', 'Mid', audioFx?.eqMid ?? 0],
                ['eqPresence', 'Presence', audioFx?.eqPresence ?? 0],
                ['eqHigh', 'High', audioFx?.eqHigh ?? 0],
                ['eqAir', 'Air', audioFx?.eqAir ?? 0],
              ] as const
            ).map(([key, label, val]) => (
              <View key={key}>
                <Text style={styles.fxHint}>
                  {label} {(val * 12).toFixed(0)} dB
                </Text>
                <Slider
                  minimumValue={-1}
                  maximumValue={1}
                  step={0.05}
                  value={val}
                  onValueChange={(v) => onAudioFxChange?.({ [key]: v })}
                  minimumTrackTintColor={COLORS.textSecondary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.yellow}
                />
              </View>
            ))}

            <View style={styles.fxRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fxTitle}>Compressor</Text>
                <Text style={styles.fxHint}>Even out loud / quiet speech</Text>
              </View>
              <Switch
                value={!!audioFx?.compressor}
                onValueChange={(compressor) => onAudioFxChange?.({ compressor })}
                trackColor={{ false: COLORS.border, true: COLORS.yellow }}
                thumbColor="#fff"
              />
            </View>
            {!!audioFx?.compressor && (
              <>
                <Text style={styles.fxHint}>
                  Threshold {Math.round(audioFx.compThreshold ?? -18)} dB
                </Text>
                <Slider
                  minimumValue={-40}
                  maximumValue={-5}
                  step={1}
                  value={audioFx.compThreshold ?? -18}
                  onValueChange={(compThreshold) => onAudioFxChange?.({ compThreshold })}
                  minimumTrackTintColor={COLORS.textSecondary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.yellow}
                />
                <Text style={styles.fxHint}>
                  Ratio {(audioFx.compRatio ?? 3).toFixed(1)}:1
                </Text>
                <Slider
                  minimumValue={1.5}
                  maximumValue={8}
                  step={0.5}
                  value={audioFx.compRatio ?? 3}
                  onValueChange={(compRatio) => onAudioFxChange?.({ compRatio })}
                  minimumTrackTintColor={COLORS.textSecondary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.yellow}
                />
              </>
            )}
            <Text style={[styles.fxHint, { marginBottom: verticalScale(8) }]}>
              Mix changes bake on export. Preview uses volume only.
            </Text>
          </ScrollView>
        )}
        {toolLabel === 'Speed' && (
          <View>
            <Text style={styles.rowLabel}>Constant</Text>
            <View style={styles.presetRow}>
              {SPEED_PRESETS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.presetBtn,
                    speed === s && speedCurve === 'none' && styles.presetBtnActive,
                  ]}
                  onPress={() => {
                    onSpeedCurveChange?.('none');
                    onSpeedChange(s);
                  }}
                >
                  <Text
                    style={[
                      styles.presetText,
                      speed === s && speedCurve === 'none' && styles.presetTextActive,
                    ]}
                  >
                    {s}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.rowLabel}>Curves</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.curveRow}
            >
              {SPEED_CURVE_PRESETS.filter((p) => p.id !== 'none').map((p) => {
                const sel = speedCurve === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.curveChip, sel && styles.curveChipActive]}
                    onPress={() => onSpeedCurveChange?.(p.id)}
                  >
                    <Ionicons
                      name={p.icon as keyof typeof Ionicons.glyphMap}
                      size={scale(14)}
                      color={sel ? COLORS.background : COLORS.yellow}
                    />
                    <View>
                      <Text style={[styles.curveLabel, sel && styles.curveLabelActive]}>
                        {p.label}
                      </Text>
                      <Text style={[styles.curveHint, sel && styles.curveHintActive]}>
                        {p.hint}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.reverseBtn, reversed && styles.reverseBtnActive]}
              onPress={() => onReversedChange?.(!reversed)}
            >
              <Ionicons
                name="swap-horizontal-outline"
                size={scale(16)}
                color={reversed ? COLORS.background : COLORS.textPrimary}
              />
              <Text style={[styles.reverseBtnText, reversed && styles.reverseBtnTextActive]}>
                Reverse {reversed ? 'on' : 'off'}
              </Text>
            </TouchableOpacity>
            {reversed && (
              <Text style={styles.reverseNote}>
                Preview plays forward; reverse is baked into the export.
              </Text>
            )}
          </View>
        )}
        {toolLabel === 'Text' && (
          <ScrollView
            style={{ maxHeight: verticalScale(340) }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.onVideoHint}>
              Type on the video preview. Use the controls below for font and style.
            </Text>
            <Text style={styles.rowLabel}>Text color</Text>
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

            <Text style={styles.rowLabel}>Background</Text>
            <View style={styles.colorRow}>
              <TouchableOpacity
                onPress={() => onBackgroundColorChange?.(undefined)}
                style={[
                  styles.colorSwatch,
                  styles.noneSwatch,
                  !backgroundColor && styles.colorSwatchActive,
                ]}
              >
                <Ionicons name="ban-outline" size={scale(14)} color={COLORS.textSecondary} />
              </TouchableOpacity>
              {TEXT_BG_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => onBackgroundColorChange?.(c)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    backgroundColor === c && styles.colorSwatchActive,
                  ]}
                />
              ))}
            </View>

            <Text style={styles.rowLabel}>Motion (Alight-style)</Text>
            <View style={styles.animTabs}>
              {(
                [
                  { id: 'in' as const, label: 'In' },
                  { id: 'out' as const, label: 'Out' },
                  { id: 'loop' as const, label: 'Loop' },
                ]
              ).map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.animTab, animTab === tab.id && styles.animTabOn]}
                  onPress={() => setAnimTab(tab.id)}
                >
                  <Text
                    style={[
                      styles.animTabText,
                      animTab === tab.id && styles.animTabTextOn,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.curveRow}
            >
              {(animTab === 'in'
                ? TEXT_ANIM_IN_PRESETS
                : animTab === 'out'
                  ? TEXT_ANIM_OUT_PRESETS
                  : TEXT_ANIM_LOOP_PRESETS
              ).map((p) => {
                const sel =
                  animTab === 'in'
                    ? animationIn === p.id
                    : animTab === 'out'
                      ? animationOut === p.id
                      : animationLoop === p.id;
                return (
                  <TouchableOpacity
                    key={`${animTab}-${p.id}`}
                    style={[styles.animChip, sel && styles.animChipActive]}
                    onPress={() => {
                      if (animTab === 'in') onAnimationInChange?.(p.id);
                      else if (animTab === 'out') onAnimationOutChange?.(p.id);
                      else onAnimationLoopChange?.(p.id);
                    }}
                  >
                    <Ionicons
                      name={p.icon as keyof typeof Ionicons.glyphMap}
                      size={scale(14)}
                      color={sel ? COLORS.background : COLORS.yellow}
                    />
                    <Text style={[styles.animChipText, sel && styles.animChipTextActive]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.sliderRow}>
              <Text style={styles.miniLabel}>Duration</Text>
              <Slider
                style={{ flex: 1, marginHorizontal: scale(8) }}
                minimumValue={0.2}
                maximumValue={1.5}
                value={animationDurationMs / 1000}
                onValueChange={(s) =>
                  onAnimationDurationChange?.(Math.round(s * 1000))
                }
                minimumTrackTintColor={COLORS.yellow}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.yellow}
              />
              <Text style={styles.valueText}>
                {(animationDurationMs / 1000).toFixed(1)}s
              </Text>
            </View>

            <Text style={styles.rowLabel}>Blending & opacity</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.curveRow}
            >
              {TEXT_BLEND_MODES.map((m) => {
                const sel = blendMode === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.animChip, sel && styles.animChipActive]}
                    onPress={() => onBlendModeChange?.(m.id)}
                  >
                    <Text style={[styles.animChipText, sel && styles.animChipTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.sliderRow}>
              <Ionicons name="grid-outline" size={scale(16)} color={COLORS.textSecondary} />
              <Slider
                style={{ flex: 1, marginHorizontal: scale(12) }}
                minimumValue={0.05}
                maximumValue={1}
                value={textOpacity}
                onValueChange={onTextOpacityChange}
                minimumTrackTintColor="#A78BFA"
                maximumTrackTintColor={COLORS.border}
                thumbTintColor="#A78BFA"
              />
              <Text style={styles.valueText}>{Math.round(textOpacity * 100)}%</Text>
            </View>

            <View style={styles.sliderRow}>
              <Ionicons name="text-outline" size={scale(18)} color={COLORS.textSecondary} />
              <Slider
                style={{ flex: 1, marginHorizontal: scale(12) }}
                minimumValue={14}
                maximumValue={120}
                step={1}
                value={fontSize}
                onValueChange={(v) => onFontSizeChange?.(Math.round(v))}
                minimumTrackTintColor={COLORS.yellow}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.yellow}
              />
              <Text style={styles.valueText}>{Math.round(fontSize)}</Text>
            </View>

            <Text style={styles.rowLabel}>Font</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.curveRow}
            >
              {TEXT_FONTS.map((f) => {
                const sel = (fontFamily || 'System') === f;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[styles.animChip, sel && styles.animChipActive]}
                    onPress={() => onFontFamilyChange?.(f)}
                  >
                    <Text style={[styles.animChipText, sel && styles.animChipTextActive]}>{f}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {isEditingExistingOverlay && (
              <TouchableOpacity style={styles.deleteBtn} onPress={onDeleteOverlay}>
                <Ionicons name="trash-outline" size={scale(16)} color="#FF4D6D" />
                <Text style={styles.deleteBtnText}>Delete text</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
        {toolLabel !== 'Audio' && toolLabel !== 'Speed' && toolLabel !== 'Text' && (
          <Text style={styles.comingSoon}>{toolLabel} panel coming soon</Text>
        )}
      </View>
    </View>
  </KeyboardAvoidingView>
  );
}
function __makeStyles() {
  return StyleSheet.create({
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
  animTabs: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: verticalScale(8),
  },
  animTab: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  animTabOn: {
    borderColor: COLORS.yellow,
    backgroundColor: 'rgba(245,197,24,0.12)',
  },
  animTabText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  animTabTextOn: { color: COLORS.yellow },
  miniLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    width: scale(58),
  },
  sliderRow: { flexDirection: 'row', alignItems: 'center', marginTop: verticalScale(12) },
  valueText: { color: COLORS.textPrimary, fontSize: moderateScale(13), width: scale(42), textAlign: 'right' },
  kfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginTop: verticalScale(8),
  },
  kfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: COLORS.yellow,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    borderRadius: scale(8),
  },
  kfBtnText: { color: '#0B0D13', fontSize: moderateScale(11), fontWeight: '700' },
  kfCount: { color: COLORS.textSecondary, fontSize: moderateScale(11) },
  clearKf: { color: COLORS.yellow, fontSize: moderateScale(11), fontWeight: '600' },
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
  onVideoHint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(12),
    lineHeight: moderateScale(17),
    marginBottom: verticalScale(4),
  },
  rowLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
    marginTop: verticalScale(12),
    letterSpacing: 0.4,
  },
  colorRow: { flexDirection: 'row', marginTop: verticalScale(8), gap: scale(10) },
  noneSwatch: {
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatch: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  colorSwatchActive: { borderWidth: 2, borderColor: COLORS.yellow },
  curveRow: {
    gap: scale(8),
    paddingVertical: verticalScale(8),
    paddingRight: scale(8),
  },
  curveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(12),
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: scale(160),
  },
  curveChipActive: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },
  curveLabel: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  curveLabelActive: { color: COLORS.background },
  curveHint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(9),
  },
  curveHintActive: { color: 'rgba(11,13,19,0.7)' },
  animChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  animChipActive: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },
  animChipText: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  animChipTextActive: { color: COLORS.background },
  reverseBtn: {
    marginTop: verticalScale(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: verticalScale(10),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  reverseBtnActive: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },
  reverseBtnText: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(13),
    fontWeight: '700',
  },
  reverseBtnTextActive: { color: COLORS.background },
  reverseNote: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
    marginTop: verticalScale(6),
    textAlign: 'center',
  },
  fxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: verticalScale(8),
  },
  fxTitle: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  fxHint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
    marginTop: 2,
    marginBottom: verticalScale(2),
  },
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
}
let styles = __makeStyles();

