/**
 * Interactive crop overlay — pan/zoom against a thumbnail frame.
 * Uses RN Animated + PanResponder (no Reanimated/worklets) so Expo Go stays stable.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { CROP_RATIO_PRESETS, getCropPresetById } from '../services/cropService';
import { useAppPalette } from '../Contexts/ThemeContext';

let COLORS: Record<string, string> = {
  background: '#0B0D13',
  border: '#222633',
  yellow: '#e7e55c',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const STAGE_HEIGHT = SCREEN_HEIGHT * 0.62;
const STAGE_WIDTH = SCREEN_WIDTH;

interface CropOverlayProps {
  visible: boolean;
  clipUri: string;
  cropRatioId: string;
  initialOffsetX?: number;
  initialOffsetY?: number;
  initialZoom?: number;
  onConfirm: (cropData: {
    cropRatioId: string;
    cropOffsetX: number;
    cropOffsetY: number;
    cropZoom: number;
  }) => void;
  onClose: () => void;
}

function getBoxDimensions(ratioValue: number) {
  let boxWidth = STAGE_WIDTH * 0.9;
  let boxHeight = boxWidth / ratioValue;
  const maxHeight = STAGE_HEIGHT * 0.9;
  if (boxHeight > maxHeight) {
    boxHeight = maxHeight;
    boxWidth = boxHeight * ratioValue;
  }
  return { boxWidth, boxHeight };
}

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

export default function CropOverlay({
  visible,
  clipUri,
  cropRatioId,
  initialOffsetX = 0.5,
  initialOffsetY = 0.5,
  initialZoom = 1,
  onConfirm,
  onClose,
}: CropOverlayProps) {
  const __palette = useAppPalette();
  COLORS = {
    ...COLORS,
    background: __palette.background,
    border: __palette.border,
    yellow: __palette.yellow,
    textPrimary: __palette.textPrimary,
    textSecondary: __palette.textSecondary,
  };
  styles = __makeStyles();

  const [activeRatioId, setActiveRatioId] = useState(cropRatioId);
  const [frameUri, setFrameUri] = useState<string | null>(null);
  const preset = getCropPresetById(activeRatioId);
  const { boxWidth, boxHeight } = getBoxDimensions(preset.ratioValue);

  const offsetX = useRef(initialOffsetX).current;
  const offsetY = useRef(initialOffsetY).current;
  const zoom = useRef(initialZoom).current;
  // Mutable live values (refs) + Animated mirrors for transform.
  const live = useRef({
    offsetX: initialOffsetX,
    offsetY: initialOffsetY,
    zoom: initialZoom,
    startOffsetX: initialOffsetX,
    startOffsetY: initialOffsetY,
    startZoom: initialZoom,
    startDistance: 0,
  });
  const animX = useRef(new Animated.Value(0)).current;
  const animY = useRef(new Animated.Value(0)).current;
  const animZoom = useRef(new Animated.Value(initialZoom)).current;

  const syncAnim = () => {
    const L = live.current;
    animX.setValue((0.5 - L.offsetX) * boxWidth);
    animY.setValue((0.5 - L.offsetY) * boxHeight);
    animZoom.setValue(L.zoom);
  };

  useEffect(() => {
    live.current.offsetX = initialOffsetX;
    live.current.offsetY = initialOffsetY;
    live.current.zoom = initialZoom;
    syncAnim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialOffsetX, initialOffsetY, initialZoom, boxWidth, boxHeight]);

  useEffect(() => {
    setActiveRatioId(cropRatioId);
  }, [cropRatioId, visible]);

  useEffect(() => {
    if (!visible || !clipUri) return;
    let cancelled = false;
    (async () => {
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(clipUri, {
          time: 0,
        });
        if (!cancelled) setFrameUri(uri);
      } catch (e) {
        console.log('Crop preview thumbnail failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, clipUri]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const L = live.current;
          L.startOffsetX = L.offsetX;
          L.startOffsetY = L.offsetY;
          L.startZoom = L.zoom;
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            L.startDistance = Math.sqrt(dx * dx + dy * dy) || 1;
          } else {
            L.startDistance = 0;
          }
        },
        onPanResponderMove: (evt, gesture) => {
          const L = live.current;
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const base = L.startDistance || dist;
            L.zoom = clamp((L.startZoom * dist) / base, 1, 3);
          } else {
            const dx = gesture.dx / STAGE_WIDTH;
            const dy = gesture.dy / STAGE_HEIGHT;
            L.offsetX = clamp(L.startOffsetX - dx, 0, 1);
            L.offsetY = clamp(L.startOffsetY - dy, 0, 1);
          }
          syncAnim();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boxWidth, boxHeight]
  );

  // silence unused — kept for API parity / future keyframe seeding
  void offsetX;
  void offsetY;
  void zoom;

  const handleConfirm = () => {
    const L = live.current;
    onConfirm({
      cropRatioId: activeRatioId,
      cropOffsetX: L.offsetX,
      cropOffsetY: L.offsetY,
      cropZoom: L.zoom,
    });
  };

  if (!visible) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={scale(24)} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crop</Text>
        <TouchableOpacity onPress={handleConfirm} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(24)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>

      <View style={styles.stage}>
        <View style={[styles.cropBox, { width: boxWidth, height: boxHeight }]}>
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.imageWrapper,
              {
                transform: [
                  { scale: animZoom },
                  { translateX: animX },
                  { translateY: animY },
                ],
              },
            ]}
          >
            {frameUri ? (
              <Image
                source={{ uri: frameUri }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imageFallback} />
            )}
          </Animated.View>

          <View style={styles.gridOverlay} pointerEvents="none">
            <View style={[styles.gridLineVertical, { left: '33.33%' }]} />
            <View style={[styles.gridLineVertical, { left: '66.66%' }]} />
            <View style={[styles.gridLineHorizontal, { top: '33.33%' }]} />
            <View style={[styles.gridLineHorizontal, { top: '66.66%' }]} />
          </View>

          <View
            style={[styles.cornerHandle, styles.cornerTL]}
            pointerEvents="none"
          />
          <View
            style={[styles.cornerHandle, styles.cornerTR]}
            pointerEvents="none"
          />
          <View
            style={[styles.cornerHandle, styles.cornerBL]}
            pointerEvents="none"
          />
          <View
            style={[styles.cornerHandle, styles.cornerBR]}
            pointerEvents="none"
          />
        </View>
        <Text style={styles.hint}>Drag to pan · pinch to zoom</Text>
      </View>

      <View style={styles.switcherRow}>
        {CROP_RATIO_PRESETS.map((p) => {
          const isActive = p.id === activeRatioId;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.switcherItem, isActive && styles.switcherItemActive]}
              onPress={() => setActiveRatioId(p.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="crop-outline"
                size={scale(14)}
                color={isActive ? COLORS.yellow : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.switcherText,
                  isActive && styles.switcherTextActive,
                ]}
                numberOfLines={1}
              >
                {p.ratioLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function __makeStyles() {
  return StyleSheet.create({
    wrapper: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: COLORS.background,
      zIndex: 999,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: scale(16),
      paddingTop: verticalScale(50),
      paddingBottom: verticalScale(14),
    },
    headerTitle: {
      color: COLORS.textPrimary,
      fontSize: moderateScale(16),
      fontWeight: '600',
    },
    stage: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000000',
    },
    cropBox: {
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: COLORS.yellow,
      position: 'relative',
    },
    imageWrapper: {
      width: '100%',
      height: '100%',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imageFallback: {
      width: '100%',
      height: '100%',
      backgroundColor: COLORS.border,
    },
    hint: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      marginTop: verticalScale(12),
    },
    gridOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    gridLineVertical: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 1,
      backgroundColor: 'rgba(255,255,255,0.4)',
    },
    gridLineHorizontal: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.4)',
    },
    cornerHandle: {
      position: 'absolute',
      width: scale(16),
      height: scale(16),
      borderColor: COLORS.yellow,
    },
    cornerTL: { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3 },
    cornerTR: { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3 },
    cornerBL: { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3 },
    cornerBR: {
      bottom: -1,
      right: -1,
      borderBottomWidth: 3,
      borderRightWidth: 3,
    },
    switcherRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(16),
      gap: scale(8),
    },
    switcherItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: scale(10),
      paddingVertical: verticalScale(6),
      borderRadius: scale(20),
      borderWidth: 1,
      borderColor: COLORS.border,
      gap: scale(4),
    },
    switcherItemActive: {
      borderColor: COLORS.yellow,
    },
    switcherText: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(10),
    },
    switcherTextActive: {
      color: COLORS.yellow,
      fontWeight: '600',
    },
  });
}
let styles = __makeStyles();
