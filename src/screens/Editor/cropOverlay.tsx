// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
// import { Gesture, GestureDetector } from 'react-native-gesture-handler';
// import Animated, {
//   useSharedValue,
//   useAnimatedStyle,
// } from 'react-native-reanimated';
// import * as VideoThumbnails from 'expo-video-thumbnails';
// import { CropRatioPreset } from '../types';
// import { CROP_RATIO_PRESETS, getCropPresetById } from '../services/cropService';
// const COLORS = {
//   background: '#0B0D13',
//   overlayDim: 'rgba(0,0,0,0.7)',
//   border: '#222633',
//   yellow: '#e7e55c',
//   textPrimary: '#FFFFFF',
//   textSecondary: '#8F9BB3',
// };

// const SCREEN_WIDTH = Dimensions.get('window').width;
// const SCREEN_HEIGHT = Dimensions.get('window').height;

// // The crop box's max footprint on screen — leaves room for the header and
// // bottom ratio-switcher strip so the box never collides with controls.

// const STAGE_HEIGHT = SCREEN_HEIGHT * 0.62;
// const STAGE_WIDTH = SCREEN_WIDTH;
// interface CropOverlayProps {
//   visible: boolean;
//   clipUri: string;
//   cropRatioId: string;          // ratio the overlay opened with (from CropRatioPanel)
//   initialOffsetX?: number;      // 0 to 1, previous focal point if re-opening
//   initialOffsetY?: number;      // 0 to 1
//   initialZoom?: number;         // 1 = no zoom
//   onConfirm: (cropData: {
//     cropRatioId: string;
//     cropOffsetX: number;
//     cropOffsetY: number;
//     cropZoom: number;
//   }) => void;
//   onClose: () => void;
// }
// // Computes the crop box's on-screen width/height for a given ratio,
// // fit within the stage bounds without exceeding either dimension.
// function getBoxDimensions(ratioValue: number) {
//   let boxWidth = STAGE_WIDTH * 0.9;
//   let boxHeight = boxWidth / ratioValue;
//   const maxHeight = STAGE_HEIGHT * 0.9;
//   if (boxHeight > maxHeight) {
//     boxHeight = maxHeight;
//     boxWidth = boxHeight * ratioValue;
//   }
//   return { boxWidth, boxHeight };
// }
// export default function CropOverlay({
//   visible,
//   clipUri,
//   cropRatioId,
//   initialOffsetX = 0.5,
//   initialOffsetY = 0.5,
//   initialZoom = 1,
//   onConfirm,
//   onClose,
// }: CropOverlayProps) {
//   const [activeRatioId, setActiveRatioId] = useState(cropRatioId);
//   const [frameUri, setFrameUri] = useState<string | null>(null);
//   const preset = getCropPresetById(activeRatioId);
//   const { boxWidth, boxHeight } = getBoxDimensions(preset.ratioValue);
//   // Focal point as a fraction (0 to 1) of the frame, and zoom level.
//   // Shared values so gestures can update them on the UI thread.
//   const offsetX = useSharedValue(initialOffsetX);
//   const offsetY = useSharedValue(initialOffsetY);
//   const zoom = useSharedValue(initialZoom);
//   const savedOffsetX = useSharedValue(initialOffsetX);
//   const savedOffsetY = useSharedValue(initialOffsetY);
//   const savedZoom = useSharedValue(initialZoom);
//   // Generate one real frame from the clip to crop against, same approach
//   // as FilterToolPanel — a single representative frame, not a live player,
//   // since positioning doesn't need playback, just a stable image to frame.
//   useEffect(() => {
//     if (!visible || !clipUri) return;
//     let cancelled = false;
//     const generateFrame = async () => {
//       try {
//         const { uri } = await VideoThumbnails.getThumbnailAsync(clipUri, { time: 0 });
//         if (!cancelled) setFrameUri(uri);
//       } catch (e) {
//         console.log('Crop preview thumbnail failed', e);
//       }
//     };
//     generateFrame();
//     return () => {
//       cancelled = true;
//     };
//   }, [visible, clipUri]);
//   // Reset local ratio state whenever the overlay is (re)opened with a
//   // different starting ratio, e.g. reopening crop on a different clip.
//   useEffect(() => {
//     setActiveRatioId(cropRatioId);
//   }, [cropRatioId, visible]);
//   const clamp = (val: number, min: number, max: number) => {
//     'worklet';
//     return Math.min(Math.max(val, min), max);
//   };
//   // Pan moves the focal point within the frame. Bounds are kept loose
//   // (0 to 1) here; visually the image is large enough behind the box that
//   // small over-pans still look reasonable, consistent with "always allow
//   // the person to adjust" rather than hard-locking movement.
//   const panGesture = Gesture.Pan()
//     .onStart(() => {
//       savedOffsetX.value = offsetX.value;
//       savedOffsetY.value = offsetY.value;
//     })
//     .onUpdate((e) => {
//       const dx = e.translationX / STAGE_WIDTH;
//       const dy = e.translationY / STAGE_HEIGHT;
//       offsetX.value = clamp(savedOffsetX.value - dx, 0, 1);
//       offsetY.value = clamp(savedOffsetY.value - dy, 0, 1);
//     });
//   // Pinch adjusts zoom. 1 = fit, up to 3x, never below 1 (no zooming out
//   // past the original frame).
//   const pinchGesture = Gesture.Pinch()
//     .onStart(() => {
//       savedZoom.value = zoom.value;
//     })
//     .onUpdate((e) => {
//       zoom.value = clamp(savedZoom.value * e.scale, 1, 3);
//     });
//   const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);
//   const animatedImageStyle = useAnimatedStyle(() => {
//     return {
//       transform: [
//         { scale: zoom.value },
//         {
//           translateX: (0.5 - offsetX.value) * boxWidth,
//         },
//         {
//           translateY: (0.5 - offsetY.value) * boxHeight,
//         },
//       ],
//     };
//   });
//   const handleSelectRatio = (ratioId: string) => {
//     // Keep the current focal point and zoom — only the box shape changes.
//     // Matches the "always allow the person to adjust, nothing resets"
//     // behavior confirmed for this feature.
//     setActiveRatioId(ratioId);
//   };
//   const handleConfirm = () => {
//     onConfirm({
//       cropRatioId: activeRatioId,
//       cropOffsetX: offsetX.value,
//       cropOffsetY: offsetY.value,
//       cropZoom: zoom.value,
//     });
//   };
//   if (!visible) return null;
//   return (
//     <View style={styles.wrapper}>
//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity onPress={onClose} hitSlop={8}>
//           <Ionicons name="close" size={scale(24)} color={COLORS.textPrimary} />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Crop</Text>
//         <TouchableOpacity onPress={handleConfirm} hitSlop={8}>
//           <Ionicons name="checkmark" size={scale(24)} color={COLORS.yellow} />
//         </TouchableOpacity>
//       </View>
//       {/* Crop stage */}
//       <View style={styles.stage}>
//         <View
//           style={[
//             styles.cropBox,
//             { width: boxWidth, height: boxHeight },
//           ]}
//         >
//           <GestureDetector gesture={composedGesture}>
//             <Animated.View style={[styles.imageWrapper, animatedImageStyle]}>
//               {frameUri ? (
//                 <Image
//                   source={{ uri: frameUri }}
//                   style={styles.image}
//                   resizeMode="cover"
//                 />
//               ) : (
//                 <View style={styles.imageFallback} />
//               )}
//             </Animated.View>
//           </GestureDetector>
//           {/* Grid overlay, rule-of-thirds style */}
//           <View style={styles.gridOverlay} pointerEvents="none">
//             <View style={[styles.gridLineVertical, { left: '33.33%' }]} />
//             <View style={[styles.gridLineVertical, { left: '66.66%' }]} />
//             <View style={[styles.gridLineHorizontal, { top: '33.33%' }]} />
//             <View style={[styles.gridLineHorizontal, { top: '66.66%' }]} />
//           </View>
//           {/* Corner handles (visual indicators; box itself stays ratio-locked) */}
//           <View style={[styles.cornerHandle, styles.cornerTL]} pointerEvents="none" />
//           <View style={[styles.cornerHandle, styles.cornerTR]} pointerEvents="none" />
//           <View style={[styles.cornerHandle, styles.cornerBL]} pointerEvents="none" />
//           <View style={[styles.cornerHandle, styles.cornerBR]} pointerEvents="none" />
//         </View>
//       </View>
//       {/* Compact ratio switcher */}
//       <View style={styles.switcherRow}>
//         {CROP_RATIO_PRESETS.map((p) => {
//           const isActive = p.id === activeRatioId;
//           return (
//             <TouchableOpacity
//               key={p.id}
//               style={[styles.switcherItem, isActive && styles.switcherItemActive]}
//               onPress={() => handleSelectRatio(p.id)}
//               activeOpacity={0.8}
//             >
//               <Ionicons
//                 name="crop-outline"
//                 size={scale(14)}
//                 color={isActive ? COLORS.yellow : COLORS.textSecondary}
//               />
//               <Text
//                 style={[styles.switcherText, isActive && styles.switcherTextActive]}
//                 numberOfLines={1}
//               >
//                 {p.ratioLabel}
//               </Text>
//             </TouchableOpacity>
//           );
//         })}
//       </View>
//     </View>
//   );
// }


// const styles = StyleSheet.create({
//   wrapper: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: COLORS.background,
//     zIndex: 999,
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: scale(16),
//     paddingTop: verticalScale(50),
//     paddingBottom: verticalScale(14),
//   },
//   headerTitle: {
//     color: COLORS.textPrimary,
//     fontSize: moderateScale(16),
//     fontWeight: '600',
//   },
//   stage: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: '#000000',
//   },
//   cropBox: {
//     overflow: 'hidden',
//     borderWidth: 1,
//     borderColor: COLORS.yellow,
//     position: 'relative',
//   },
//   imageWrapper: {
//     width: '100%',
//     height: '100%',
//   },
//   image: {
//     width: '100%',
//     height: '100%',
//   },
//   imageFallback: {
//     width: '100%',
//     height: '100%',
//     backgroundColor: COLORS.border,
//   },
//   gridOverlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//   },
//   gridLineVertical: {
//     position: 'absolute',
//     top: 0,
//     bottom: 0,
//     width: 1,
//     backgroundColor: 'rgba(255,255,255,0.4)',
//   },
//   gridLineHorizontal: {
//     position: 'absolute',
//     left: 0,
//     right: 0,
//     height: 1,
//     backgroundColor: 'rgba(255,255,255,0.4)',
//   },
//   cornerHandle: {
//     position: 'absolute',
//     width: scale(16),
//     height: scale(16),
//     borderColor: COLORS.yellow,
//   },
//   cornerTL: { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3 },
//   cornerTR: { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3 },
//   cornerBL: { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3 },
//   cornerBR: { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3 },
//   switcherRow: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     flexWrap: 'wrap',
//     paddingHorizontal: scale(12),
//     paddingVertical: verticalScale(16),
//     gap: scale(8),
//   },
//   switcherItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: scale(10),
//     paddingVertical: verticalScale(6),
//     borderRadius: scale(20),
//     borderWidth: 1,
//     borderColor: COLORS.border,
//     gap: scale(4),
//   },
//   switcherItemActive: {
//     borderColor: COLORS.yellow,
//   },
//   switcherText: {
//     color: COLORS.textSecondary,
//     fontSize: moderateScale(10),
//   },
//   switcherTextActive: {
//     color: COLORS.yellow,
//     fontWeight: '600',
//   },
// });