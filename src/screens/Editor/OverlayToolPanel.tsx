/**
 * Overlay tool panel — CapCut-style multi-track layers above the main video.
 *
 * Add: gallery image/GIF, PiP video, or emoji sticker (no upload for emoji).
 * Edit selected: size / rotation / opacity sliders; Add Keyframe at playhead;
 * Clear Keyframes; Delete. Overlay list lets you reselect layers on the track.
 *
 * Keyframes are stored on MediaOverlay and interpolated in the preview
 * (sampleOverlayTransform) and baked into exports (ExportWorker keyframeExpr).
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import { MediaOverlay, MediaOverlayType, ClipEffectId } from '../types';
import { useAppPalette } from '../Contexts/ThemeContext';
import { STOCK_FX_PRESETS } from '../services/stockFxPresets';


const CHROMA_COLORS = ['#00FF00', '#00FF55', '#0000FF', '#00B140'];

let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  danger: '#E85D5D',
};

/** Starter emoji stickers — drawn as text glyphs; no asset upload needed. */
const EMOJI_STICKERS = [
  '🔥', '😂', '❤️', '👍', '⭐', '🎉', '💯', '😍',
  '😎', '🤯', '👏', '💥', '✨', '🚀', '🎵', '😢',
];

interface OverlayToolPanelProps {
  visible: boolean;
  overlays: MediaOverlay[];
  selectedOverlay: MediaOverlay | null;
  /** Adds media at the playhead; durationMs only known for videos. */
  onAdd: (type: MediaOverlayType, uri: string) => void;
  onSelectOverlay: (overlayId: string | null) => void;
  /** Partial update applied to the selected overlay. */
  onChange: (changes: Partial<Omit<MediaOverlay, 'id'>>) => void;
  onAddKeyframe: () => void;
  onClearKeyframes: () => void;
  onDelete: () => void;
  /** Jump to CapCut-style Mask tool for the selected media overlay. */
  onOpenMask?: () => void;
  /** One-tap atmosphere FX (lightning / grain / dust) on the active clip. */
  onApplyStockFx?: (effectId: ClipEffectId, intensity: number) => void;
  onClose: () => void;
}

export default function OverlayToolPanel({
  visible,
  overlays,
  selectedOverlay,
  onAdd,
  onSelectOverlay,
  onChange,
  onAddKeyframe,
  onClearKeyframes,
  onDelete,
  onOpenMask,
  onApplyStockFx,
  onClose,
}: OverlayToolPanelProps) {
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

  const pickMedia = async (kind: 'image' | 'video') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: kind === 'image' ? ['images'] : ['videos'],
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.length) return;
      onAdd(kind, result.assets[0].uri);
    } catch (e) {
      Alert.alert('Could not open gallery', String(e));
    }
  };

  const keyframeCount = selectedOverlay?.keyframes?.length ?? 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        {selectedOverlay ? (
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={() => onSelectOverlay(null)}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={scale(18)} color={COLORS.textPrimary} />
            <Text style={styles.title}>
              {selectedOverlay.type === 'emoji' ? `Sticker ${selectedOverlay.uri}` : selectedOverlay.type === 'video' ? 'PiP Video' : 'Image'}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.title}>Overlays</Text>
        )}
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={scale(20)} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {selectedOverlay ? (
        // ── Transform editor for the selected overlay ──
        <View style={styles.editorBody}>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>Size</Text>
            <Slider
              style={styles.slider}
              minimumValue={0.3}
              maximumValue={3}
              value={selectedOverlay.scale}
              onValueChange={(scaleVal) => onChange({ scale: scaleVal })}
              minimumTrackTintColor={COLORS.yellow}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.yellow}
            />
            <Text style={styles.sliderValue}>{selectedOverlay.scale.toFixed(1)}x</Text>
          </View>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>Rotate</Text>
            <Slider
              style={styles.slider}
              minimumValue={-180}
              maximumValue={180}
              value={selectedOverlay.rotation}
              onValueChange={(rotation) => onChange({ rotation })}
              minimumTrackTintColor={COLORS.yellow}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.yellow}
            />
            <Text style={styles.sliderValue}>{Math.round(selectedOverlay.rotation)}°</Text>
          </View>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>Opacity</Text>
            <Slider
              style={styles.slider}
              minimumValue={0.1}
              maximumValue={1}
              value={selectedOverlay.opacity}
              onValueChange={(opacity) => onChange({ opacity })}
              minimumTrackTintColor={COLORS.yellow}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.yellow}
            />
            <Text style={styles.sliderValue}>{Math.round(selectedOverlay.opacity * 100)}%</Text>
          </View>

          <View style={styles.flipRow}>
            <TouchableOpacity
              style={[styles.flipChip, selectedOverlay.flipH && styles.flipChipOn]}
              onPress={() => onChange({ flipH: !selectedOverlay.flipH })}
            >
              <Ionicons
                name="swap-horizontal"
                size={scale(14)}
                color={selectedOverlay.flipH ? COLORS.yellow : COLORS.textSecondary}
              />
              <Text style={styles.flipText}>Flip H</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.flipChip, selectedOverlay.flipV && styles.flipChipOn]}
              onPress={() => onChange({ flipV: !selectedOverlay.flipV })}
            >
              <Ionicons
                name="swap-vertical"
                size={scale(14)}
                color={selectedOverlay.flipV ? COLORS.yellow : COLORS.textSecondary}
              />
              <Text style={styles.flipText}>Flip V</Text>
            </TouchableOpacity>
          </View>

          {selectedOverlay.type !== 'emoji' && onOpenMask && (
            <TouchableOpacity style={styles.maskEntry} onPress={onOpenMask} activeOpacity={0.85}>
              <Ionicons name="scan-outline" size={scale(16)} color={COLORS.yellow} />
              <View style={{ flex: 1 }}>
                <Text style={styles.maskEntryTitle}>
                  {selectedOverlay.mask?.enabled && selectedOverlay.mask.shape !== 'none'
                    ? `Mask · ${selectedOverlay.mask.shape}`
                    : 'Mask'}
                </Text>
                <Text style={styles.maskEntryHint}>
                  Shape, feather, split & follow — CapCut-style
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={scale(16)} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          {selectedOverlay.type !== 'emoji' && (
            <View style={styles.chromaBlock}>
              <View style={styles.chromaHeader}>
                <Text style={styles.chromaTitle}>Green screen</Text>
                <TouchableOpacity
                  style={[
                    styles.chromaToggle,
                    selectedOverlay.chromaKey?.enabled && styles.chromaToggleOn,
                  ]}
                  onPress={() =>
                    onChange({
                      chromaKey: selectedOverlay.chromaKey?.enabled
                        ? { ...selectedOverlay.chromaKey, enabled: false }
                        : {
                            enabled: true,
                            color: '#00FF00',
                            similarity: 0.32,
                            blend: 0.12,
                            backgroundUri: selectedOverlay.chromaKey?.backgroundUri,
                          },
                    })
                  }
                >
                  <Text
                    style={[
                      styles.chromaToggleText,
                      selectedOverlay.chromaKey?.enabled && styles.chromaToggleTextOn,
                    ]}
                  >
                    {selectedOverlay.chromaKey?.enabled ? 'On' : 'Off'}
                  </Text>
                </TouchableOpacity>
              </View>
              {selectedOverlay.chromaKey?.enabled && (
                <>
                  <Text style={styles.keyframeHint}>
                    Keys out the screen color on export — plate shows in preview.
                  </Text>
                  <View style={styles.chromaColors}>
                    {CHROMA_COLORS.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.chromaSwatch,
                          { backgroundColor: c },
                          selectedOverlay.chromaKey?.color === c && styles.chromaSwatchOn,
                        ]}
                        onPress={() =>
                          onChange({
                            chromaKey: { ...selectedOverlay.chromaKey!, color: c },
                          })
                        }
                      />
                    ))}
                  </View>
                  <View style={styles.sliderRow}>
                    <Text style={styles.sliderLabel}>Cut</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={0.08}
                      maximumValue={0.7}
                      value={selectedOverlay.chromaKey.similarity}
                      onValueChange={(similarity) =>
                        onChange({
                          chromaKey: { ...selectedOverlay.chromaKey!, similarity },
                        })
                      }
                      minimumTrackTintColor={COLORS.yellow}
                      maximumTrackTintColor={COLORS.border}
                      thumbTintColor={COLORS.yellow}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={async () => {
                      try {
                        const result = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ['images'],
                          quality: 0.9,
                        });
                        if (result.canceled || !result.assets?.[0]?.uri) return;
                        onChange({
                          chromaKey: {
                            ...selectedOverlay.chromaKey!,
                            backgroundUri: result.assets[0].uri,
                          },
                        });
                      } catch (e) {
                        Alert.alert('Could not pick plate', String(e));
                      }
                    }}
                  >
                    <Ionicons name="images-outline" size={scale(16)} color={COLORS.yellow} />
                    <Text style={styles.addBtnText}>
                      {selectedOverlay.chromaKey.backgroundUri
                        ? 'Change background plate'
                        : 'Add background plate'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Keyframe controls — record transform at the playhead, then play to animate */}
          <View style={styles.keyframeRow}>
            <TouchableOpacity style={styles.keyframeBtn} onPress={onAddKeyframe}>
              <Ionicons name="diamond" size={scale(13)} color="#0B0D13" />
              <Text style={styles.keyframeBtnText}>Add keyframe</Text>
            </TouchableOpacity>
            <Text style={styles.keyframeCount}>
              {keyframeCount === 0
                ? 'No keyframes'
                : `${keyframeCount} keyframe${keyframeCount === 1 ? '' : 's'}`}
            </Text>
            {keyframeCount > 0 && (
              <TouchableOpacity onPress={onClearKeyframes} hitSlop={6}>
                <Text style={styles.clearKeyframes}>Clear</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={onDelete} hitSlop={6}>
              <Ionicons name="trash-outline" size={scale(18)} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
          <Text style={styles.keyframeHint}>
            Move the playhead, position the sticker, tap Add keyframe — repeat, then play.
          </Text>
        </View>
      ) : (
        // ── Add media + sticker picker + existing overlays ──
        <View style={styles.pickerBody}>
          <View style={styles.addRow}>
            <TouchableOpacity style={styles.addBtn} onPress={() => pickMedia('image')}>
              <Ionicons name="image-outline" size={scale(18)} color={COLORS.yellow} />
              <Text style={styles.addBtnText}>Photo / GIF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={() => pickMedia('video')}>
              <Ionicons name="videocam-outline" size={scale(18)} color={COLORS.yellow} />
              <Text style={styles.addBtnText}>PiP Video</Text>
            </TouchableOpacity>
          </View>

          {onApplyStockFx ? (
            <>
              <Text style={styles.sectionLabel}>STOCK FX · DRAMA</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.emojiRow}
              >
                {STOCK_FX_PRESETS.map((fx) => (
                  <TouchableOpacity
                    key={fx.id}
                    style={styles.fxChip}
                    onPress={() => onApplyStockFx(fx.effectId, fx.intensity)}
                  >
                    <Ionicons
                      name={fx.icon as keyof typeof Ionicons.glyphMap}
                      size={scale(16)}
                      color={COLORS.yellow}
                    />
                    <Text style={styles.fxChipLabel}>{fx.label}</Text>
                    <Text style={styles.fxChipHint}>{fx.hint}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.emojiRow}
          >
            {EMOJI_STICKERS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiChip}
                onPress={() => onAdd('emoji', emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {overlays.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.overlayList}
            >
              {overlays.map((o) => (
                <TouchableOpacity
                  key={o.id}
                  style={styles.overlayChip}
                  onPress={() => onSelectOverlay(o.id)}
                >
                  {o.type === 'emoji' ? (
                    <Text style={styles.overlayChipEmoji}>{o.uri}</Text>
                  ) : o.type === 'image' ? (
                    <Image source={{ uri: o.uri }} style={styles.overlayChipThumb} />
                  ) : (
                    <View style={styles.overlayChipVideo}>
                      <Ionicons name="videocam" size={scale(14)} color={COLORS.textPrimary} />
                    </View>
                  )}
                  {(o.keyframes?.length ?? 0) > 0 && (
                    <View style={styles.kfBadge}>
                      <Ionicons name="diamond" size={scale(7)} color="#0B0D13" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
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
    paddingBottom: verticalScale(14),
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  // ── Picker mode ──
  pickerBody: {
    paddingTop: verticalScale(12),
    gap: verticalScale(10),
  },
  addRow: {
    flexDirection: 'row',
    gap: scale(10),
    paddingHorizontal: scale(16),
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: verticalScale(11),
    backgroundColor: 'rgba(245,197,24,0.1)',
    borderRadius: scale(12),
  },
  addBtnText: {
    color: COLORS.yellow,
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  emojiRow: {
    paddingHorizontal: scale(16),
    gap: scale(8),
  },
  sectionLabel: {
    color: COLORS.yellow,
    fontSize: moderateScale(10),
    fontWeight: '800',
    letterSpacing: 0.6,
    paddingHorizontal: scale(16),
    marginTop: verticalScale(4),
  },
  fxChip: {
    minWidth: scale(88),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
    borderRadius: scale(12),
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: verticalScale(2),
  },
  fxChipLabel: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(11),
    fontWeight: '700',
  },
  fxChipHint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(9),
  },
  emojiChip: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(10),
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: moderateScale(22),
  },
  overlayList: {
    paddingHorizontal: scale(16),
    gap: scale(8),
  },
  overlayChip: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(10),
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  overlayChipEmoji: {
    fontSize: moderateScale(22),
  },
  overlayChipThumb: {
    width: '100%',
    height: '100%',
  },
  overlayChipVideo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  kfBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: scale(13),
    height: scale(13),
    borderRadius: scale(7),
    backgroundColor: COLORS.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Editor mode ──
  editorBody: {
    paddingTop: verticalScale(10),
    paddingHorizontal: scale(16),
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    width: scale(48),
  },
  slider: {
    flex: 1,
    marginHorizontal: scale(6),
  },
  sliderValue: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(10),
    width: scale(38),
    textAlign: 'right',
  },
  keyframeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginTop: verticalScale(8),
  },
  keyframeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    backgroundColor: COLORS.yellow,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(14),
  },
  keyframeBtnText: {
    color: '#0B0D13',
    fontSize: moderateScale(11),
    fontWeight: '700',
  },
  keyframeCount: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
  },
  clearKeyframes: {
    color: COLORS.danger,
    fontSize: moderateScale(10),
    fontWeight: '600',
  },
  keyframeHint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(9),
    marginTop: verticalScale(8),
  },
  flipRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginTop: verticalScale(8),
  },
  flipChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  flipChipOn: {
    borderColor: COLORS.yellow,
    backgroundColor: 'rgba(245,197,24,0.1)',
  },
  flipText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  maskEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginTop: verticalScale(10),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    borderRadius: scale(12),
    backgroundColor: 'rgba(245,197,24,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.25)',
  },
  maskEntryTitle: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  maskEntryHint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
    marginTop: 2,
  },
  chromaBlock: {
    marginTop: verticalScale(10),
    paddingTop: verticalScale(8),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: verticalScale(8),
  },
  chromaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chromaTitle: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  chromaToggle: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(5),
    borderRadius: scale(12),
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chromaToggleOn: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },
  chromaToggleText: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(11),
    fontWeight: '700',
  },
  chromaToggleTextOn: { color: '#0B0D13' },
  chromaColors: { flexDirection: 'row', gap: scale(8) },
  chromaSwatch: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chromaSwatchOn: { borderColor: '#FFFFFF' },
});
}
let styles = __makeStyles();

