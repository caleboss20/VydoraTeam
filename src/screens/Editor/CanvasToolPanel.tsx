/**
 * Canva-style canvas tools — blank screen, flip, transparency, free layout,
 * BG remover, and one-tap double exposure.
 */
import React from 'react';
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
import type { BgRemoveSettings, ClipLookOverlay, VideoClip } from '../types';
import { DEFAULT_LOOK_OVERLAY } from '../types';
import { useAppPalette } from '../Contexts/ThemeContext';


let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  danger: '#E85D5D',
  purple: '#A78BFA',
};

const CANVAS_SWATCHES = [
  '#000000',
  '#FFFFFF',
  '#0B0D13',
  '#1A1A2E',
  '#F5C518',
  '#FF4D6D',
  '#4DA6FF',
  '#10B981',
];

const GRADIENT_SWATCHES: [string, string][] = [
  ['#000000', '#F5C518'],
  ['#000000', '#FF4D6D'],
  ['#1A1A2E', '#4DA6FF'],
  ['#000000', '#10B981'],
  ['#2D1B4E', '#F5C518'],
  ['#0B0D13', '#FFFFFF'],
];

interface CanvasToolPanelProps {
  visible: boolean;
  clip: VideoClip | null;
  canvasColor: string;
  onCanvasColorChange: (hex: string) => void;
  onLayoutChange: (patch: {
    layoutX?: number;
    layoutY?: number;
    layoutScale?: number;
    flipH?: boolean;
    flipV?: boolean;
    opacity?: number;
    bgRemove?: BgRemoveSettings;
  }) => void;
  onLookOverlayChange?: (patch: Partial<ClipLookOverlay>) => void;
  onDoubleExposure: () => void;
  /** Nested tools — keeps the bottom toolbar uncluttered. */
  onOpenRotate?: () => void;
  onOpenMask?: () => void;
  onClose: () => void;
}

export default function CanvasToolPanel({
  visible,
  clip,
  canvasColor,
  onCanvasColorChange,
  onLayoutChange,
  onLookOverlayChange,
  onDoubleExposure,
  onOpenRotate,
  onOpenMask,
  onClose,
}: CanvasToolPanelProps) {
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

  const layoutX = clip?.layoutX ?? 0.5;
  const layoutY = clip?.layoutY ?? 0.5;
  const layoutScale = clip?.layoutScale ?? 1;
  const opacity = clip?.opacity ?? 1;
  const flipH = !!clip?.flipH;
  const flipV = !!clip?.flipV;
  const bg = clip?.bgRemove;
  const look = { ...DEFAULT_LOOK_OVERLAY, ...clip?.lookOverlay };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Canvas</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hint}>
          One hub for Canva-style looks. Mask & Rotate open from here (not
          separate toolbar icons) so the bar stays clean.
        </Text>

        {(onOpenRotate || onOpenMask) && (
          <View style={styles.row}>
            {onOpenRotate && (
              <TouchableOpacity style={styles.chip} onPress={onOpenRotate}>
                <Ionicons name="sync-outline" size={scale(16)} color={COLORS.yellow} />
                <Text style={[styles.chipText, styles.chipTextOn]}>Rotate</Text>
              </TouchableOpacity>
            )}
            {onOpenMask && (
              <TouchableOpacity style={styles.chip} onPress={onOpenMask}>
                <Ionicons name="scan-outline" size={scale(16)} color={COLORS.yellow} />
                <Text style={[styles.chipText, styles.chipTextOn]}>Mask</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.section}>BLANK SCREEN</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.swatchRow}
        >
          {CANVAS_SWATCHES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.swatch,
                { backgroundColor: c },
                canvasColor.toLowerCase() === c.toLowerCase() && styles.swatchOn,
              ]}
              onPress={() => onCanvasColorChange(c)}
            />
          ))}
        </ScrollView>

        {clip && onLookOverlayChange && (
          <>
            <Text style={styles.section}>DARK OVERLAY</Text>
            <Text style={styles.subHint}>
              Drag to dim the frame — great for captions and posters.
            </Text>
            <View style={styles.sliderRow}>
              <Ionicons name="moon-outline" size={scale(16)} color={COLORS.yellow} />
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={0.85}
                value={look.darkOpacity ?? 0}
                onValueChange={(darkOpacity) =>
                  onLookOverlayChange({ darkOpacity })
                }
                minimumTrackTintColor={COLORS.yellow}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.yellow}
              />
              <Text style={styles.val}>
                {Math.round((look.darkOpacity ?? 0) * 100)}%
              </Text>
            </View>

            <Text style={styles.section}>GRADIENT COLOR</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.swatchRow}
            >
              {GRADIENT_SWATCHES.map(([a, b]) => {
                const on =
                  (look.gradientColorTop ?? '').toLowerCase() === a.toLowerCase() &&
                  (look.gradientColorBottom ?? '').toLowerCase() === b.toLowerCase();
                return (
                  <TouchableOpacity
                    key={`${a}-${b}`}
                    style={[styles.gradSwatch, on && styles.swatchOn]}
                    onPress={() =>
                      onLookOverlayChange({
                        gradientColorTop: a,
                        gradientColorBottom: b,
                        gradientOpacity: Math.max(
                          look.gradientOpacity ?? 0,
                          0.35
                        ),
                      })
                    }
                  >
                    <View style={[styles.gradHalf, { backgroundColor: a }]} />
                    <View style={[styles.gradHalf, { backgroundColor: b }]} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.sliderRow}>
              <Ionicons name="color-filter-outline" size={scale(16)} color={COLORS.purple} />
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={0.9}
                value={look.gradientOpacity ?? 0}
                onValueChange={(gradientOpacity) =>
                  onLookOverlayChange({ gradientOpacity })
                }
                minimumTrackTintColor={COLORS.purple}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.purple}
              />
              <Text style={styles.val}>
                {Math.round((look.gradientOpacity ?? 0) * 100)}%
              </Text>
            </View>
            <View style={styles.sliderRow}>
              <Text style={styles.label}>Angle</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={90}
                step={90}
                value={(look.gradientAngle ?? 0) >= 45 ? 90 : 0}
                onValueChange={(gradientAngle) =>
                  onLookOverlayChange({ gradientAngle })
                }
                minimumTrackTintColor={COLORS.textSecondary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.yellow}
              />
              <Text style={styles.val}>
                {(look.gradientAngle ?? 0) >= 45 ? 'H' : 'V'}
              </Text>
            </View>
          </>
        )}

        {!clip ? (
          <Text style={styles.empty}>Select a clip on the timeline to place it.</Text>
        ) : (
          <>
            <Text style={styles.section}>TRANSPARENCY</Text>
            <View style={styles.sliderRow}>
              <Ionicons name="grid-outline" size={scale(16)} color={COLORS.purple} />
              <Slider
                style={styles.slider}
                minimumValue={0.05}
                maximumValue={1}
                value={opacity}
                onValueChange={(v) => onLayoutChange({ opacity: v })}
                minimumTrackTintColor={COLORS.purple}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.purple}
              />
              <Text style={styles.val}>{Math.round(opacity * 100)}%</Text>
            </View>

            <Text style={styles.section}>FLIP</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.chip, flipH && styles.chipOn]}
                onPress={() => onLayoutChange({ flipH: !flipH })}
              >
                <Ionicons
                  name="swap-horizontal"
                  size={scale(16)}
                  color={flipH ? COLORS.yellow : COLORS.textSecondary}
                />
                <Text style={[styles.chipText, flipH && styles.chipTextOn]}>
                  Flip H
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, flipV && styles.chipOn]}
                onPress={() => onLayoutChange({ flipV: !flipV })}
              >
                <Ionicons
                  name="swap-vertical"
                  size={scale(16)}
                  color={flipV ? COLORS.yellow : COLORS.textSecondary}
                />
                <Text style={[styles.chipText, flipV && styles.chipTextOn]}>
                  Flip V
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.section}>SIZE & POSITION</Text>
            <Text style={styles.subHint}>
              Drag the preview to move. Size slider shrinks the layer onto the blank canvas.
            </Text>
            <View style={styles.sliderRow}>
              <Text style={styles.label}>Size</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.25}
                maximumValue={2.5}
                value={layoutScale}
                onValueChange={(layoutScale) => onLayoutChange({ layoutScale })}
                minimumTrackTintColor={COLORS.yellow}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.yellow}
              />
              <Text style={styles.val}>{layoutScale.toFixed(2)}×</Text>
            </View>
            <View style={styles.sliderRow}>
              <Text style={styles.label}>X</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.05}
                maximumValue={0.95}
                value={layoutX}
                onValueChange={(layoutX) => onLayoutChange({ layoutX })}
                minimumTrackTintColor={COLORS.textSecondary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.yellow}
              />
            </View>
            <View style={styles.sliderRow}>
              <Text style={styles.label}>Y</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.05}
                maximumValue={0.95}
                value={layoutY}
                onValueChange={(layoutY) => onLayoutChange({ layoutY })}
                minimumTrackTintColor={COLORS.textSecondary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.yellow}
              />
            </View>
            <TouchableOpacity
              style={styles.reset}
              onPress={() =>
                onLayoutChange({
                  layoutX: 0.5,
                  layoutY: 0.5,
                  layoutScale: 1,
                  flipH: false,
                  flipV: false,
                })
              }
            >
              <Text style={styles.resetText}>Reset layout</Text>
            </TouchableOpacity>

            <Text style={styles.section}>BG REMOVER</Text>
            <View style={styles.row}>
              {(
                [
                  { id: 'off', label: 'Off' },
                  { id: 'auto', label: 'Auto' },
                  { id: 'green', label: 'Green' },
                  { id: 'blue', label: 'Blue' },
                ] as const
              ).map((m) => {
                const on =
                  m.id === 'off'
                    ? !bg?.enabled
                    : !!bg?.enabled && bg.mode === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => {
                      if (m.id === 'off') {
                        onLayoutChange({
                          bgRemove: { enabled: false, mode: 'auto' },
                        });
                        return;
                      }
                      onLayoutChange({
                        bgRemove: {
                          enabled: true,
                          mode: m.id,
                          color:
                            m.id === 'green'
                              ? '#00FF00'
                              : m.id === 'blue'
                                ? '#0000FF'
                                : '#00FF00',
                          similarity: 0.28,
                          blend: 0.12,
                        },
                      });
                    }}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {bg?.enabled && (
              <View style={styles.sliderRow}>
                <Text style={styles.label}>Cut</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.08}
                  maximumValue={0.65}
                  value={bg.similarity ?? 0.28}
                  onValueChange={(similarity) =>
                    onLayoutChange({
                      bgRemove: { ...bg, similarity },
                    })
                  }
                  minimumTrackTintColor={COLORS.yellow}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.yellow}
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.primary}
              onPress={onDoubleExposure}
              activeOpacity={0.85}
            >
              <Ionicons name="layers" size={scale(16)} color="#0B0D13" />
              <Text style={styles.primaryText}>Double exposure</Text>
            </TouchableOpacity>
            <Text style={styles.subHint}>
              Ghost layer (big + transparent) behind a sharp foreground — the
              Canva running trick.
            </Text>
          </>
        )}
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
    maxHeight: verticalScale(440),
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
  body: { maxHeight: verticalScale(380) },
  bodyContent: { paddingBottom: verticalScale(24) },
  hint: {
    color: COLORS.textSecondary,
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
    marginTop: verticalScale(14),
    marginBottom: verticalScale(8),
    paddingHorizontal: scale(16),
  },
  subHint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(6),
    lineHeight: moderateScale(14),
  },
  swatchRow: {
    paddingHorizontal: scale(14),
    gap: scale(8),
  },
  swatch: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  swatchOn: {
    borderColor: COLORS.yellow,
    borderWidth: 2,
  },
  gradSwatch: {
    width: scale(36),
    height: scale(28),
    borderRadius: scale(8),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'column',
  },
  gradHalf: { flex: 1 },
  empty: {
    color: COLORS.textSecondary,
    padding: scale(16),
    fontSize: moderateScale(12),
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    gap: scale(8),
    marginBottom: verticalScale(4),
  },
  label: {
    color: COLORS.textSecondary,
    width: scale(36),
    fontSize: moderateScale(11),
  },
  slider: { flex: 1, height: verticalScale(28) },
  val: {
    color: COLORS.textPrimary,
    width: scale(40),
    textAlign: 'right',
    fontSize: moderateScale(11),
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    paddingHorizontal: scale(16),
  },
  chip: {
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
  chipOn: {
    borderColor: COLORS.yellow,
    backgroundColor: 'rgba(245,197,24,0.1)',
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  chipTextOn: { color: COLORS.yellow },
  reset: { alignItems: 'center', marginTop: verticalScale(6) },
  resetText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  primary: {
    marginHorizontal: scale(16),
    marginTop: verticalScale(16),
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

