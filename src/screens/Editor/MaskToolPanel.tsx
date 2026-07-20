/**
 * CapCut-style Mask tool — shapes, feather, invert, split presets, follow motion.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Slider from '@react-native-community/slider';
import type {
  MediaOverlay,
  OverlayMask,
  OverlayMaskShape,
  TextOverlay,
} from '../types';
import { useAppPalette } from '../Contexts/ThemeContext';
import {
  DEFAULT_OVERLAY_MASK,
  MASK_PRESETS,
  MASK_SHAPES,
  ensureMask,
  maskWithShape,
  buildMaskKeyframe,
} from '../services/maskPresets';

let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  danger: '#E85D5D',
};

interface MaskToolPanelProps {
  visible: boolean;
  selectedOverlay: MediaOverlay | null;
  /** CapCut text-behind-subject reveal target. */
  selectedText?: TextOverlay | null;
  playheadMs?: number;
  tracking?: boolean;
  onChange: (changes: Partial<Omit<MediaOverlay, 'id'>>) => void;
  onTextMaskChange?: (mask: OverlayMask) => void;
  onFollowTrack: () => void;
  onClearFollow: () => void;
  onClose: () => void;
}

export default function MaskToolPanel({
  visible,
  selectedOverlay,
  selectedText = null,
  playheadMs = 0,
  tracking = false,
  onChange,
  onTextMaskChange,
  onFollowTrack,
  onClearFollow,
  onClose,
}: MaskToolPanelProps) {
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

  if (!visible) return null;

  const target = selectedOverlay ?? selectedText;
  const isText = !selectedOverlay && !!selectedText;
  const mask = ensureMask(target?.mask);
  const enabled = !!target && mask.enabled && mask.shape !== 'none';

  const commitMask = (next: OverlayMask, layout?: Partial<Pick<MediaOverlay, 'x' | 'y' | 'scale'>>) => {
    if (selectedOverlay) {
      onChange({ mask: next, ...layout });
    } else if (selectedText && onTextMaskChange) {
      onTextMaskChange(next);
    }
  };

  const patchMask = (partial: Partial<OverlayMask>) => {
    if (!target) return;
    const next = { ...ensureMask(target.mask), ...partial };
    if (next.shape === 'none') next.enabled = false;
    else next.enabled = true;
    commitMask(next);
  };

  const setShape = (shape: OverlayMaskShape) => {
    if (!target) return;
    if (shape === 'none') {
      commitMask({ ...DEFAULT_OVERLAY_MASK, enabled: false, shape: 'none' });
      return;
    }
    commitMask(
      maskWithShape(shape, {
        feather: mask.feather,
        invert: mask.invert,
        centerX: mask.centerX,
        centerY: mask.centerY,
        scale: mask.scale,
        rotation: mask.rotation,
        followMotion: mask.followMotion,
        keyframes: mask.keyframes,
      })
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Mask</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>

      {!target ? (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={scale(28)} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Select text or overlay</Text>
          <Text style={styles.emptyHint}>
            CapCut-style: mask a photo/PiP, or mask text with Split + keyframes to
            reveal behind a walking subject.
          </Text>
        </View>
      ) : selectedOverlay?.type === 'emoji' ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Masks need media</Text>
          <Text style={styles.emptyHint}>
            Switch to a photo, PiP video, or a text layer.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {isText && (
            <Text style={styles.banner}>
              Text reveal mode — use Split / Linear, Invert, then Add mask keyframe
              as the subject walks.
            </Text>
          )}
          <Text style={styles.section}>LOOKS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetRow}
          >
            {(isText
              ? MASK_PRESETS.filter((p) =>
                  ['none', 'split_lr', 'split_diag', 'linear_wipe', 'soft_cloud', 'circle_pip'].includes(
                    p.id
                  )
                )
              : MASK_PRESETS
            ).map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.presetChip}
                onPress={() => {
                  const applied = p.apply();
                  if (applied.mask) commitMask(applied.mask as OverlayMask, applied);
                }}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={p.icon as keyof typeof Ionicons.glyphMap}
                  size={scale(16)}
                  color={COLORS.yellow}
                />
                <Text style={styles.presetLabel}>{p.label}</Text>
                <Text style={styles.presetHint} numberOfLines={2}>
                  {p.hint}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.section}>SHAPE</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.shapeRow}
          >
            {MASK_SHAPES.map((s) => {
              const sel = mask.shape === s.id && (s.id === 'none' ? !enabled : enabled);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.shapeChip, sel && styles.shapeChipOn]}
                  onPress={() => setShape(s.id)}
                >
                  <Ionicons
                    name={s.icon as keyof typeof Ionicons.glyphMap}
                    size={scale(16)}
                    color={sel ? COLORS.yellow : COLORS.textSecondary}
                  />
                  <Text style={[styles.shapeLabel, sel && styles.shapeLabelOn]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {enabled && (
            <>
              <View style={styles.sliderRow}>
                <Text style={styles.sliderLabel}>Feather</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={0.7}
                  value={mask.feather}
                  onValueChange={(feather) => patchMask({ feather })}
                  minimumTrackTintColor={COLORS.yellow}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.yellow}
                />
                <Text style={styles.sliderValue}>{Math.round(mask.feather * 100)}</Text>
              </View>

              <View style={styles.sliderRow}>
                <Text style={styles.sliderLabel}>Size</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.2}
                  maximumValue={1.55}
                  value={mask.scale}
                  onValueChange={(scaleVal) => patchMask({ scale: scaleVal })}
                  minimumTrackTintColor={COLORS.yellow}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.yellow}
                />
                <Text style={styles.sliderValue}>{mask.scale.toFixed(2)}</Text>
              </View>

              <View style={styles.sliderRow}>
                <Text style={styles.sliderLabel}>Rotate</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={-180}
                  maximumValue={180}
                  value={mask.rotation}
                  onValueChange={(rotation) => patchMask({ rotation })}
                  minimumTrackTintColor={COLORS.yellow}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.yellow}
                />
                <Text style={styles.sliderValue}>{Math.round(mask.rotation)}°</Text>
              </View>

              <View style={styles.sliderRow}>
                <Text style={styles.sliderLabel}>Center X</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.1}
                  maximumValue={0.9}
                  value={mask.centerX}
                  onValueChange={(centerX) => patchMask({ centerX })}
                  minimumTrackTintColor={COLORS.textSecondary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.yellow}
                />
              </View>
              <View style={styles.sliderRow}>
                <Text style={styles.sliderLabel}>Center Y</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.1}
                  maximumValue={0.9}
                  value={mask.centerY}
                  onValueChange={(centerY) => patchMask({ centerY })}
                  minimumTrackTintColor={COLORS.textSecondary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.yellow}
                />
              </View>

              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggle, mask.invert && styles.toggleOn]}
                  onPress={() => patchMask({ invert: !mask.invert })}
                >
                  <Ionicons
                    name="contrast-outline"
                    size={scale(14)}
                    color={mask.invert ? COLORS.yellow : COLORS.textSecondary}
                  />
                  <Text style={[styles.toggleText, mask.invert && styles.toggleTextOn]}>
                    Invert
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggle, mask.followMotion && styles.toggleOn]}
                  onPress={() => patchMask({ followMotion: !mask.followMotion })}
                >
                  <Ionicons
                    name="locate-outline"
                    size={scale(14)}
                    color={mask.followMotion ? COLORS.yellow : COLORS.textSecondary}
                  />
                  <Text
                    style={[styles.toggleText, mask.followMotion && styles.toggleTextOn]}
                  >
                    Follow motion
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.kfRow}>
                <TouchableOpacity
                  style={styles.kfBtn}
                  onPress={() => {
                    const kf = buildMaskKeyframe(mask, Math.round(playheadMs));
                    const kfs = [...(mask.keyframes ?? [])]
                      .filter((k) => Math.abs(k.timeMs - kf.timeMs) > 40)
                      .concat(kf)
                      .sort((a, b) => a.timeMs - b.timeMs);
                    patchMask({ keyframes: kfs });
                  }}
                >
                  <Ionicons name="diamond" size={scale(13)} color="#0B0D13" />
                  <Text style={styles.kfBtnText}>Mask keyframe</Text>
                </TouchableOpacity>
                <Text style={styles.kfCount}>
                  {(mask.keyframes?.length ?? 0) === 0
                    ? 'Walk the line with diamonds'
                    : `${mask.keyframes!.length} mask kf`}
                </Text>
                {(mask.keyframes?.length ?? 0) > 0 && (
                  <TouchableOpacity
                    onPress={() => patchMask({ keyframes: undefined })}
                    hitSlop={6}
                  >
                    <Text style={styles.clear}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {mask.followMotion && !isText && (
                <View style={styles.followBlock}>
                  <Text style={styles.followHint}>
                    Tracks the subject and keeps this mask locked to the overlay —
                    CapCut-style follow.
                  </Text>
                  <TouchableOpacity
                    style={[styles.primary, tracking && styles.primaryDisabled]}
                    onPress={onFollowTrack}
                    disabled={tracking}
                  >
                    {tracking ? (
                      <ActivityIndicator color="#0B0D13" />
                    ) : (
                      <>
                        <Ionicons name="locate" size={scale(15)} color="#0B0D13" />
                        <Text style={styles.primaryText}>Track & follow</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  {(selectedOverlay?.keyframes?.length ?? 0) > 0 && (
                    <TouchableOpacity onPress={onClearFollow} hitSlop={8}>
                      <Text style={styles.clear}>Clear track keyframes</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={styles.clearMask}
                onPress={() =>
                  commitMask({ ...DEFAULT_OVERLAY_MASK, enabled: false, shape: 'none' })
                }
              >
                <Text style={styles.clearMaskText}>Remove mask</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function __makeStyles() {
  return StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: scale(16),
    borderTopRightRadius: scale(16),
    maxHeight: verticalScale(420),
    paddingBottom: verticalScale(12),
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
  body: { maxHeight: verticalScale(360) },
  bodyContent: { paddingBottom: verticalScale(20) },
  empty: {
    padding: scale(24),
    alignItems: 'center',
    gap: verticalScale(8),
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: moderateScale(14),
  },
  emptyHint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(12),
    textAlign: 'center',
    lineHeight: moderateScale(18),
  },
  banner: {
    color: COLORS.yellow,
    fontSize: moderateScale(11),
    lineHeight: moderateScale(16),
    paddingHorizontal: scale(16),
    marginTop: verticalScale(10),
  },
  section: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: verticalScale(12),
    marginBottom: verticalScale(8),
    paddingHorizontal: scale(16),
  },
  kfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingHorizontal: scale(16),
    marginTop: verticalScale(12),
  },
  kfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    backgroundColor: COLORS.yellow,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    borderRadius: scale(14),
  },
  kfBtnText: {
    color: '#0B0D13',
    fontSize: moderateScale(11),
    fontWeight: '700',
  },
  kfCount: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
    flex: 1,
  },
  presetRow: {
    paddingHorizontal: scale(12),
    gap: scale(8),
  },
  presetChip: {
    width: scale(108),
    backgroundColor: COLORS.surface,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: scale(10),
    gap: verticalScale(4),
  },
  presetLabel: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: moderateScale(11),
  },
  presetHint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(9),
    lineHeight: moderateScale(12),
  },
  shapeRow: {
    paddingHorizontal: scale(12),
    gap: scale(8),
  },
  shapeChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: verticalScale(4),
    minWidth: scale(58),
  },
  shapeChipOn: {
    borderColor: COLORS.yellow,
    backgroundColor: 'rgba(245,197,24,0.08)',
  },
  shapeLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
    fontWeight: '600',
  },
  shapeLabelOn: { color: COLORS.yellow },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    marginTop: verticalScale(6),
    gap: scale(8),
  },
  sliderLabel: {
    color: COLORS.textSecondary,
    width: scale(58),
    fontSize: moderateScale(11),
  },
  slider: { flex: 1, height: verticalScale(28) },
  sliderValue: {
    color: COLORS.textSecondary,
    width: scale(36),
    textAlign: 'right',
    fontSize: moderateScale(11),
  },
  toggleRow: {
    flexDirection: 'row',
    gap: scale(8),
    paddingHorizontal: scale(16),
    marginTop: verticalScale(12),
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  toggleOn: {
    borderColor: COLORS.yellow,
    backgroundColor: 'rgba(245,197,24,0.1)',
  },
  toggleText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  toggleTextOn: { color: COLORS.yellow },
  followBlock: {
    paddingHorizontal: scale(16),
    marginTop: verticalScale(10),
    gap: verticalScale(8),
  },
  followHint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    lineHeight: moderateScale(16),
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    backgroundColor: COLORS.yellow,
    borderRadius: scale(10),
    paddingVertical: verticalScale(11),
  },
  primaryDisabled: { opacity: 0.6 },
  primaryText: {
    color: '#0B0D13',
    fontWeight: '800',
    fontSize: moderateScale(13),
  },
  clear: {
    color: COLORS.danger,
    textAlign: 'center',
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  clearMask: {
    marginTop: verticalScale(14),
    alignItems: 'center',
  },
  clearMaskText: {
    color: COLORS.danger,
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
});
}
let styles = __makeStyles();

