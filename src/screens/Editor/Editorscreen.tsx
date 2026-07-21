import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  StatusBar,
  Alert,
  PanResponder,
  Animated,
  TextInput,
} from "react-native";
import { useMember } from "../Contexts/memberContext";
import CollaborationSidebar from "../components/Editorsidebar";
import WowCoachBar from "../components/WowCoachBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";
import { useVideoPlayer, VideoView } from "expo-video";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio"; // music + VO mix with clip audio
import { useEventListener } from "expo";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as VideoThumbnails from "expo-video-thumbnails";

import { useVideoProject } from "../Contexts/VideoProjectContext";
import { useProject } from "../Contexts/projectContext";
import {
  VideoClip,
  TextOverlay,
  VideoSegment,
  MediaOverlay,
  MediaOverlayType,
  SpeedCurveId,
  DEFAULT_COLOR_GRADE,
  DEFAULT_COLOR_CURVES,
  DEFAULT_LOOK_OVERLAY,
} from "../types";
import BottomToolbar, { ToolSearchModal, EditorTool } from "../Tabbar/editTools";
import FlyerPanel from "./FlyerPanel";
import ConferencePanel from "./ConferencePanel";
import { useComment } from "../Contexts/commentContext";
import { useMessage } from "../Contexts/messageContext";
import { useAuth } from "../Contexts/Authcontext";
import { memberService } from "../services/membersServvice";
import { useProjectSocket } from "../socket/socketconnection";
import { publishCursor, useLiveCursors, useEditToasts } from "../socket/editorSync";
import EditToolPanel from "./EditToolPanel";
import { FILTER_LIST, getFilterById } from "../services/FilterService";
import FilterToolPanel from "./FilterPanelTool";
import CropRatioPanel from "./cropRatioPanel";
import CropOverlay from "./cropOverlay";
import MusicToolPanel from "./MusicToolPanel"; // multi-track music + fades + duck
import TransitionPanel from "./TransitionPanel"; // CapCut-style transition picker between clips
import CaptionsToolPanel from "./CaptionsToolPanel"; // AI auto-captions (Whisper)
import SilenceToolPanel from "./SilenceToolPanel";
import OverlayToolPanel from "./OverlayToolPanel"; // multi-track PiP/stickers/GIFs + keyframes
import OverlayMaskView from "./OverlayMaskView";
import MaskToolPanel from "./MaskToolPanel";
import RotateToolPanel from "./RotateToolPanel";
import CanvasToolPanel from "./CanvasToolPanel";
import TitleCardPanel from "./TitleCardPanel";
import AssembleToolPanel from "./AssembleToolPanel";
import VoiceoverToolPanel from "./VoiceoverToolPanel"; // mic narration on the timeline
import EffectsToolPanel from "./EffectsToolPanel";
import ColorGradePanel from "./ColorGradePanel";
import BeatsToolPanel from "./BeatsToolPanel";
import ShortsToolPanel from "./ShortsToolPanel";
import BrandKitPanel from "./BrandKitPanel";
import MultiCamToolPanel from "./MultiCamToolPanel";
import StabilizeToolPanel from "./StabilizeToolPanel";
import StockToolPanel from "./StockToolPanel";
import MotionTrackPanel from "./MotionTrackPanel";
import MovieEffectsPanel from "./MovieEffectsPanel";
import TemplatesPanel from "./TemplatesPanel";
import AnimationBrowserPanel from "./AnimationBrowserPanel";
import CaptionEditPanel from "./CaptionEditPanel";
import KeyframesPanel from "./KeyframesPanel";
import CompoundPanel from "./CompoundPanel";
import AdjustmentLayerPanel from "./AdjustmentLayerPanel";
import CurvesLutPanel from "./CurvesLutPanel";
import MixerPanel from "./MixerPanel";
import StickersPanel from "./StickersPanel";
import PublishPanel from "./PublishPanel";
import CommentComposerBubble from "./CommentComposerBubble";
import { clipService } from "../services/clipService";
import { editTemplateService, type EditTemplate } from "../services/editTemplateService";
import { curveAverageSpeed } from "../services/speedCurves";
import { getAnimatedTextProps } from "../services/textAnimationUtils";
import { captionService, overlaysToSrt } from "../services/captionService";
import { buildCaptionOverlays, CaptionStyleId } from "../services/captionStylePresets";
import { silenceService } from "../services/silenceService";
import { beatDetectService } from "../services/beatDetectService";
import { shortsService, ShortSuggestion } from "../services/shortsService";
import {
  brandKitService,
  BrandKit,
} from "../services/brandKitService";
import { multicamService } from "../services/multicamService";
import { uploadService } from "../services/uploadService";
import { reframeService } from "../services/reframeService";
import { motionTrackService } from "../services/motionTrackService";
import {
  sampleClipVolume,
  sampleClipOpacity,
  sampleClipColorGrade,
  sampleClipRotation,
  coverScaleForRotation,
  sampleTextPosition,
} from "../services/clipKeyframes";
import { DEFAULT_AUDIO_FX } from "../types";
import { buildAutoMoviePlan } from "../services/autoMovieService";
import { buildKaraokeFromVoiceover } from "../services/voiceoverKaraokeService";
import {
  pickVideosFromGallery,
  pickVideosFromFiles,
  uploadMixVideo,
  type PickedMixVideo,
} from "../services/mixMediaService";
import {
  getTemplateMusicTrack,
  libraryTrackDurationMs,
  pickTemplatePhoto,
} from "../services/filledTemplateService";
import { LinearGradient } from "expo-linear-gradient";
import { CROP_RATIO_PRESETS } from '../services/cropService';
import { getMusicTracks, musicAudibleMs } from "../services/BackgroundmusicService";
import { nearestBeatMarker } from "../services/beatMarkerService";
import { BlurView } from "expo-blur";


//for the exporting//
import { ExportConfirmModal } from "../components/ExportModal";
import { ExportProgressSheet } from "../components/Exportsheet";
import { exportService } from "../services/exportService";
import { getRandomQuote } from "../../../constants/exportQuotes";
import { useAppPalette, useTheme } from '../Contexts/ThemeContext';


let COLORS: Record<string, string> = {
  background: "#0B0D13",
  surface: "#151821",
  // border: '#222633',
  border: "#F5C518",
  yellow: "#F5C518",
  yellowBg: "rgba(245, 197, 24, 0.15)",
  tealAccent: "#10B981",
  textPrimary: "#FFFFFF",
  textSecondary: "#8F9BB3",
  textMuted: "#4F5E7B",
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PX_PER_SECOND = scale(50);
const HANDLE_WIDTH = scale(14);

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

// Unified Clip Trimmer Component
interface ClipTrimmerProps {
  clip: VideoClip;
  thumbnails: string[];
  onTrimEnd: (clipId: string, trimStartMs: number, trimEndMs: number) => void;
  isActive: boolean;
  onPress: () => void;
}

function ClipTrimmer({
  clip,
  thumbnails,
  onTrimEnd,
  isActive,
  onPress,
}: ClipTrimmerProps) {

  
  const clipDurationPx = (clip.durationMs / 1000) * PX_PER_SECOND;
  const trimStartMs = clip.trimStartMs ?? 0;
  const trimEndMs = clip.trimEndMs ?? clip.durationMs;

  const [startPx, setStartPx] = useState((trimStartMs / 1000) * PX_PER_SECOND);
  const [endPx, setEndPx] = useState((trimEndMs / 1000) * PX_PER_SECOND);

  useEffect(() => {
    setStartPx((trimStartMs / 1000) * PX_PER_SECOND);
  }, [trimStartMs]);

  useEffect(() => {
    setEndPx((trimEndMs / 1000) * PX_PER_SECOND);
  }, [trimEndMs]);

  const stateRef = useRef({ startPx, endPx, clipDurationPx, onTrimEnd, clip });
  stateRef.current = { startPx, endPx, clipDurationPx, onTrimEnd, clip };

  const dragStartRef = useRef(0);

  const createPanResponder = (side: "left" | "right") => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const { startPx: sPx, endPx: ePx } = stateRef.current;
        dragStartRef.current = side === "left" ? sPx : ePx;
      },
      onPanResponderMove: (_, gestureState) => {
        const {
          startPx: sPx,
          endPx: ePx,
          clipDurationPx: cDur,
        } = stateRef.current;
        if (side === "left") {
          const next = dragStartRef.current + gestureState.dx;
          setStartPx(Math.max(0, Math.min(next, ePx - HANDLE_WIDTH)));
        } else {
          const next = dragStartRef.current + gestureState.dx;
          setEndPx(Math.min(cDur, Math.max(next, sPx + HANDLE_WIDTH)));
        }
      },
      onPanResponderRelease: () => {
        const {
          startPx: sPx,
          endPx: ePx,
          clip: currentClip,
          onTrimEnd: callback,
        } = stateRef.current;
        const newStartMs = Math.round((sPx / PX_PER_SECOND) * 1000);
        const newEndMs = Math.round((ePx / PX_PER_SECOND) * 1000);
        callback(currentClip.id, newStartMs, newEndMs);
      },
    });
  };

  const leftPanResponder = useRef(createPanResponder("left")).current;
  const rightPanResponder = useRef(createPanResponder("right")).current;

  const clipSeconds = Math.max(1, Math.ceil(clip.durationMs / 1000));
  const isTitle = clip.kind === 'title';
  const isFlyer = clip.kind === 'flyer';
  const titleBg = clip.titleCard?.backgroundColor ?? '#000000';
  const titleLabel = clip.titleCard?.title ?? 'Title';
  const titleFg =
    clip.titleCard?.textColor ??
    (['#FFFFFF', '#F5C518'].includes(titleBg.toUpperCase())
      ? '#0B0D13'
      : '#FFFFFF');

  if (isFlyer && !isActive) {
    const trimStart = clip.trimStartMs ?? 0;
    const trimEnd = clip.trimEndMs ?? clip.durationMs;
    const w = Math.max(
      PX_PER_SECOND * 0.5,
      ((trimEnd - trimStart) / 1000) * PX_PER_SECOND
    );
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={{
          width: w,
          height: verticalScale(46),
          borderRadius: scale(4),
          overflow: 'hidden',
          opacity: 0.85,
          borderWidth: 1,
          borderColor: 'rgba(245,197,24,0.45)',
        }}
      >
        {clip.uri ? (
          <Image
            source={{ uri: clip.uri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: '#222',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: moderateScale(9) }}>
              Flyer
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (isTitle && !isActive) {
    const trimStart = clip.trimStartMs ?? 0;
    const trimEnd = clip.trimEndMs ?? clip.durationMs;
    const w = Math.max(
      PX_PER_SECOND * 0.5,
      ((trimEnd - trimStart) / 1000) * PX_PER_SECOND
    );
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={{
          width: w,
          height: verticalScale(46),
          backgroundColor: titleBg,
          borderRadius: scale(4),
          opacity: 0.75,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: scale(6),
          borderWidth: 1,
          borderColor: 'rgba(245,197,24,0.35)',
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: titleFg,
            fontSize: moderateScale(9),
            fontWeight: '700',
          }}
        >
          {titleLabel}
        </Text>
      </TouchableOpacity>
    );
  }

  if (!isActive) {
  const trimStart = clip.trimStartMs ?? 0;
  const trimEnd = clip.trimEndMs ?? clip.durationMs;
  const startFrame = Math.floor(trimStart / 1000);
  const endFrame = Math.ceil(trimEnd / 1000);
  const visibleThumbnails = thumbnails.slice(startFrame, endFrame);
  const displayThumbs = visibleThumbnails.length > 0 ? visibleThumbnails : thumbnails;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flexDirection: "row",
        position: "relative",
        height: verticalScale(46),
      }}
    >
      {displayThumbs.length > 0 ? (
        displayThumbs.map((uri, i) => (
          <Image
            key={i}
            source={{ uri }}
            style={{
              width: PX_PER_SECOND,
              height: verticalScale(46),
              opacity: 0.6,
            }}
            resizeMode="cover"
          />
        ))
      ) : (
        <View
          style={[
            styles.clipPlaceholder,
            { width: PX_PER_SECOND * Math.max(1, Math.ceil((trimEnd - trimStart) / 1000)) },
          ]}
        >
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300",
            }}
            style={styles.clipPlaceholderImg}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}


  return (
    <View
      style={{
        flexDirection: "row",
        position: "relative",
        height: verticalScale(46),
      }}
    >
      {/* Filmstrip — solid sheet for title cards / still for flyers */}
      {isFlyer ? (
        <View
          style={{
            width: PX_PER_SECOND * clipSeconds,
            height: verticalScale(46),
            overflow: 'hidden',
          }}
        >
          {clip.uri ? (
            <Image
              source={{ uri: clip.uri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                flex: 1,
                backgroundColor: '#333',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Flyer</Text>
            </View>
          )}
        </View>
      ) : isTitle ? (
        <View
          style={{
            width: PX_PER_SECOND * clipSeconds,
            height: verticalScale(46),
            backgroundColor: titleBg,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: scale(8),
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: titleFg,
              fontSize: moderateScale(10),
              fontWeight: '800',
            }}
          >
            {titleLabel}
          </Text>
        </View>
      ) : thumbnails.length > 0 ? (
        thumbnails.map((uri, i) => (
          <Image
            key={i}
            source={{ uri }}
            style={{ width: PX_PER_SECOND, height: verticalScale(46) }}
            resizeMode="cover"
          />
        ))
      ) : (
        <View
          style={[
            styles.clipPlaceholder,
            { width: PX_PER_SECOND * clipSeconds },
          ]}
        >
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300",
            }}
            style={styles.clipPlaceholderImg}
          />
        </View>
      )}

      {/* Dimmed Overlays */}
      <View
        style={[
          styles.dimOverlay,
          {
            left: 0,
            width: startPx,
          },
        ]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.dimOverlay,
          {
            left: endPx,
            width: clipDurationPx - endPx,
          },
        ]}
        pointerEvents="none"
      />

      {/* Selection Border Outline */}
      <View
        style={[
          styles.activeBorderOutline,
          {
            left: startPx,
            width: endPx - startPx,
          },
        ]}
        pointerEvents="none"
      />

      {/* CapCut-style keyframe diamonds (volume = yellow, opacity = teal) */}
      {(clip.volumeKeyframes ?? []).map((kf, i) => {
        const x = (kf.timeMs / 1000) * PX_PER_SECOND;
        if (x < startPx || x > endPx) return null;
        return (
          <View
            key={`v-${i}-${kf.timeMs}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: x - scale(4),
              top: verticalScale(4),
              width: scale(8),
              height: scale(8),
              backgroundColor: COLORS.yellow,
              transform: [{ rotate: '45deg' }],
              borderWidth: 1,
              borderColor: '#111',
              zIndex: 5,
            }}
          />
        );
      })}
      {(clip.opacityKeyframes ?? []).map((kf, i) => {
        const x = (kf.timeMs / 1000) * PX_PER_SECOND;
        if (x < startPx || x > endPx) return null;
        return (
          <View
            key={`o-${i}-${kf.timeMs}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: x - scale(4),
              bottom: verticalScale(4),
              width: scale(8),
              height: scale(8),
              backgroundColor: COLORS.tealAccent,
              transform: [{ rotate: '45deg' }],
              borderWidth: 1,
              borderColor: '#111',
              zIndex: 5,
            }}
          />
        );
      })}

     {/* Left Trim Handle */}
<View
  style={[
    styles.trimHandle,
    styles.leftTrimHandle,
    { transform: [{ translateX: startPx }] },
  ]}
  hitSlop={{ left: scale(15), right: scale(15), top: 0, bottom: 0 }}
  {...leftPanResponder.panHandlers}
>
  <View style={styles.trimHandleBar} />
</View>

{/* Right Trim Handle */}
<View
  style={[
    styles.trimHandle,
    styles.rightTrimHandle,
    { transform: [{ translateX: endPx - HANDLE_WIDTH }] },
  ]}
  hitSlop={{ left: scale(15), right: scale(15), top: 0, bottom: 0 }}
  {...rightPanResponder.panHandlers}
>
  <View style={styles.trimHandleBar} />
</View>


      {/* Right Trim Handle */}
      <View
        style={[
          styles.trimHandle,
          styles.rightTrimHandle,
          { transform: [{ translateX: endPx - HANDLE_WIDTH }] },
        ]}
        {...rightPanResponder.panHandlers}
      >
        <View style={styles.trimHandleBar} />
      </View>
    </View>
  );
}


function DraggableOverlay({
  overlay,
  previewSize,
  localTimeMs,
  isEditing,
  onTap,
  onDragEnd,
  onChangeText,
}: {
  overlay: TextOverlay;
  previewSize: { width: number; height: number };
  /** Clip-local time — drives entrance animation (typewriter / pop / fade…). */
  localTimeMs: number;
  /** CapCut-style: type directly on the preview box. */
  isEditing?: boolean;
  onTap: () => void;
  onDragEnd: (x: number, y: number) => void;
  onChangeText?: (text: string) => void;
}) {
  const sampled = sampleTextPosition(
    overlay.keyframes,
    overlay.x ?? 0.5,
    overlay.y ?? 0.5,
    localTimeMs
  );
  const startXRef = useRef(sampled.x * previewSize.width);
  const startYRef = useRef(sampled.y * previewSize.height);
  const [pos, setPos] = useState({
    x: sampled.x * previewSize.width,
    y: sampled.y * previewSize.height,
  });
  const [dragging, setDragging] = useState(false);
  const movedRef = useRef(false);
  const isEditingRef = useRef(!!isEditing);
  const posRef = useRef(pos);
  const previewSizeRef = useRef(previewSize);
  const onTapRef = useRef(onTap);
  const onDragEndRef = useRef(onDragEnd);
  isEditingRef.current = !!isEditing;
  posRef.current = pos;
  previewSizeRef.current = previewSize;
  onTapRef.current = onTap;
  onDragEndRef.current = onDragEnd;
  useEffect(() => {
    if (dragging) return;
    setPos({
      x: sampled.x * previewSize.width,
      y: sampled.y * previewSize.height,
    });
  }, [sampled.x, sampled.y, previewSize.width, previewSize.height, dragging]);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isEditingRef.current,
      onMoveShouldSetPanResponder: () => !isEditingRef.current,
      onPanResponderGrant: () => {
        startXRef.current = posRef.current.x;
        startYRef.current = posRef.current.y;
        movedRef.current = false;
        setDragging(true);
      },
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4) {
          movedRef.current = true;
        }
        const size = previewSizeRef.current;
        const nextX = Math.max(0, Math.min(size.width, startXRef.current + gesture.dx));
        const nextY = Math.max(0, Math.min(size.height, startYRef.current + gesture.dy));
        setPos({ x: nextX, y: nextY });
      },
      onPanResponderRelease: () => {
        setDragging(false);
        if (movedRef.current) {
          const size = previewSizeRef.current;
          const normX = posRef.current.x / size.width;
          const normY = posRef.current.y / size.height;
          onDragEndRef.current(normX, normY);
        } else {
          onTapRef.current();
        }
      },
    })
  ).current;

  const elapsedMs = Math.max(0, localTimeMs - overlay.startMs);
  const anim = isEditing
    ? {
        opacity: 1,
        transform: [] as { scale?: number; translateY?: number; translateX?: number; rotate?: string }[],
        displayText: overlay.text || "",
        ghost: null as null | { opacity: number; translateX: number; translateY: number },
      }
    : getAnimatedTextProps(overlay, elapsedMs);
  const karaokeWords = isEditing ? undefined : overlay.karaokeWords;
  // Use the stored pt size directly so the slider (14–120) maps 1:1 on preview.
  // (scale() was crushing large sizes and TextInput often ignores live fontSize.)
  const fontPx = Math.max(10, Math.round(overlay.fontSize ?? 24));
  const baseStyle = {
    color: overlay.color ?? "#FFFFFF",
    fontSize: fontPx,
    fontWeight: (overlay.fontWeight === "bold" ? "700" : "400") as "700" | "400",
    fontFamily: overlay.fontFamily,
    textAlign: (overlay.align ?? "center") as "center" | "left" | "right",
  };
  const pillBg = overlay.backgroundColor
    ? `${overlay.backgroundColor}${Math.round((overlay.backgroundOpacity ?? 0.6) * 255)
        .toString(16)
        .padStart(2, "0")}`
    : "transparent";
  const textMasked =
    !isEditing &&
    !!overlay.mask?.enabled &&
    overlay.mask.shape !== "none";
  const maskBoxW = Math.max(160, fontPx * 8);
  const maskBoxH = Math.max(64, fontPx * 2.4);
  const padH = scale(10);
  const padV = verticalScale(6);
  const pillRadius = scale(overlay.backgroundRadius ?? 8);

  // Dual-layer editor: styled Text always reflects size/font/color (RN TextInput
  // often freezes fontSize after the first keystroke). Transparent TextInput on top.
  const editorBox = (
    <View
      style={{
        minWidth: scale(120),
        maxWidth: previewSize.width * 0.85,
        backgroundColor: pillBg === "transparent" ? "rgba(0,0,0,0.25)" : pillBg,
        borderRadius: pillRadius,
        paddingHorizontal: padH,
        paddingVertical: padV,
        borderWidth: 1.5,
        borderColor: COLORS.yellow,
        overflow: "hidden",
      }}
    >
      <Text
        pointerEvents="none"
        allowFontScaling={false}
        style={[
          baseStyle,
          {
            opacity: overlay.text?.length ? 1 : 0,
          },
        ]}
      >
        {overlay.text?.length ? overlay.text : " "}
      </Text>
      {!overlay.text?.length ? (
        <Text
          pointerEvents="none"
          allowFontScaling={false}
          style={[
            baseStyle,
            {
              position: "absolute",
              left: padH,
              right: padH,
              top: padV,
              color: "rgba(255,255,255,0.45)",
            },
          ]}
        >
          Type here
        </Text>
      ) : null}
      <TextInput
        key={`ti-${overlay.id}-fs${fontPx}-ff${overlay.fontFamily ?? "System"}`}
        value={overlay.text ?? ""}
        onChangeText={onChangeText}
        multiline
        autoFocus={isEditing}
        allowFontScaling={false}
        caretHidden={false}
        selectionColor={COLORS.yellow}
        underlineColorAndroid="transparent"
        style={{
          ...StyleSheet.absoluteFillObject,
          ...baseStyle,
          color: "transparent",
          paddingHorizontal: padH,
          paddingVertical: padV,
          textAlignVertical: "top",
          backgroundColor: "transparent",
        }}
      />
    </View>
  );

  const textInner = isEditing ? (
    editorBox
  ) : karaokeWords?.length ? (
    <Text
      allowFontScaling={false}
      style={{
        ...baseStyle,
        backgroundColor: pillBg,
        borderRadius: scale(overlay.backgroundRadius ?? 0),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(5),
        overflow: "hidden",
      }}
    >
      {karaokeWords.map((w, i) => {
        const on =
          localTimeMs >= w.startMs && localTimeMs < Math.max(w.endMs, w.startMs + 80);
        return (
          <Text
            key={`${w.startMs}-${i}`}
            allowFontScaling={false}
            style={{
              color: on
                ? overlay.highlightColor ?? COLORS.yellow
                : overlay.color ?? "#FFFFFF",
              fontSize: fontPx,
              fontWeight: "700",
              fontFamily: overlay.fontFamily,
            }}
          >
            {w.text}
            {i < karaokeWords.length - 1 ? " " : ""}
          </Text>
        );
      })}
    </Text>
  ) : (
    <Text
      allowFontScaling={false}
      style={{
        ...baseStyle,
        backgroundColor: pillBg,
        borderRadius: scale(overlay.backgroundRadius ?? 0),
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
        overflow: "hidden",
      }}
    >
      {anim.displayText || "Text"}
    </Text>
  );

  return (
    <View
      {...(isEditing ? {} : panResponder.panHandlers)}
      style={[
        styles.overlayTextWrapper,
        {
          left: pos.x,
          top: pos.y,
          opacity: anim.opacity,
          transform: anim.transform,
          zIndex: isEditing ? 40 : 12,
        },
      ]}
    >
      {!isEditing && anim.ghost ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            opacity: anim.ghost.opacity,
            transform: [
              { translateX: anim.ghost.translateX },
              { translateY: anim.ghost.translateY },
            ],
          }}
        >
          <Text
            style={{
              ...baseStyle,
              color: overlay.color ?? "#FFFFFF",
            }}
          >
            {anim.displayText}
          </Text>
        </View>
      ) : null}
      {textMasked ? (
        <OverlayMaskView
          width={maskBoxW}
          height={maskBoxH}
          mask={overlay.mask}
          timelineMs={localTimeMs}
        >
          <View
            style={{
              width: maskBoxW,
              height: maskBoxH,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {textInner}
          </View>
        </OverlayMaskView>
      ) : (
        textInner
      )}
    </View>
  );
}




// ── Media overlays: keyframe interpolation ──
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Transform of an overlay at a given timeline time. With no keyframes this is
 * the base transform; with keyframes we interpolate between the two that
 * bracket `timeMs` (clamped to the first/last outside that range).
 */
function sampleOverlayTransform(o: MediaOverlay, timeMs: number) {
  const kfs = o.keyframes ?? [];
  if (kfs.length === 0) {
    return { x: o.x, y: o.y, scale: o.scale, rotation: o.rotation, opacity: o.opacity };
  }
  if (timeMs <= kfs[0].timeMs) return kfs[0];
  const last = kfs[kfs.length - 1];
  if (timeMs >= last.timeMs) return last;
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (timeMs >= a.timeMs && timeMs <= b.timeMs) {
      const t = (timeMs - a.timeMs) / Math.max(1, b.timeMs - a.timeMs);
      return {
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        scale: lerp(a.scale, b.scale, t),
        rotation: lerp(a.rotation, b.rotation, t),
        opacity: lerp(a.opacity, b.opacity, t),
      };
    }
  }
  return last;
}

// Base content size per overlay type — scaled/rotated via the transform.
const OVERLAY_SIZES: Record<MediaOverlayType, { w: number; h: number }> = {
  emoji: { w: scale(56), h: scale(56) },
  image: { w: scale(110), h: scale(110) },
  video: { w: scale(140), h: scale(84) },
};

function DraggableMediaOverlay({
  overlay,
  previewSize,
  timelineMs,
  isSelected,
  pipPlayer,
  onTap,
  onDragEnd,
}: {
  overlay: MediaOverlay;
  previewSize: { width: number; height: number };
  timelineMs: number;
  isSelected: boolean;
  /** Shared PiP player — only passed for the active video overlay. */
  pipPlayer: ReturnType<typeof useVideoPlayer> | null;
  onTap: () => void;
  /** Normalized 0–1 center after drag; caller persists via updateMediaOverlay. */
  onDragEnd: (x: number, y: number) => void;
}) {
  // Selected → base transform so drag/sliders feel live (ignore keyframe lerp).
  // Deselected → sampleOverlayTransform drives CapCut-style keyframe playback.
  const t = isSelected
    ? { x: overlay.x, y: overlay.y, scale: overlay.scale, rotation: overlay.rotation, opacity: overlay.opacity }
    : sampleOverlayTransform(overlay, timelineMs);

  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const pos = dragPos ?? { x: t.x * previewSize.width, y: t.y * previewSize.height };

  // Refs so the once-created PanResponder always sees fresh values.
  const posRef = useRef(pos);
  posRef.current = pos;
  const previewRef = useRef(previewSize);
  previewRef.current = previewSize;
  const cbRef = useRef({ onTap, onDragEnd });
  cbRef.current = { onTap, onDragEnd };
  const dragStartRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartRef.current = posRef.current;
        movedRef.current = false;
      },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4) movedRef.current = true;
        setDragPos({
          x: Math.max(0, Math.min(previewRef.current.width, dragStartRef.current.x + g.dx)),
          y: Math.max(0, Math.min(previewRef.current.height, dragStartRef.current.y + g.dy)),
        });
      },
      onPanResponderRelease: () => {
        if (movedRef.current) {
          const p = posRef.current;
          cbRef.current.onDragEnd(
            p.x / previewRef.current.width,
            p.y / previewRef.current.height,
          );
        } else {
          cbRef.current.onTap();
        }
        setDragPos(null);
      },
    })
  ).current;

  const base = OVERLAY_SIZES[overlay.type];
  const chroma = !!overlay.chromaKey?.enabled;
  const masked =
    !!overlay.mask?.enabled &&
    overlay.mask.shape !== "none" &&
    overlay.type !== "emoji";
  const w = chroma
    ? Math.min(previewSize.width * 0.92, base.w * 2.4)
    : masked
      ? Math.min(previewSize.width * 0.85, base.w * 2.1)
      : base.w;
  const h = chroma
    ? Math.min(previewSize.height * 0.92, base.h * 2.4)
    : masked
      ? Math.min(previewSize.height * 0.85, base.h * 2.1)
      : base.h;

  const media = (
    <>
      {overlay.chromaKey?.enabled && overlay.chromaKey.backgroundUri ? (
        <Image
          source={{ uri: overlay.chromaKey.backgroundUri }}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            borderRadius: scale(8),
          }}
          resizeMode="cover"
        />
      ) : null}
      {overlay.type === "emoji" ? (
        <Text style={{ fontSize: scale(42) }}>{overlay.uri}</Text>
      ) : overlay.type === "image" ? (
        <Image
          source={{ uri: overlay.uri }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius:
              overlay.mask?.shape === "circle" ? w / 2 : scale(8),
          }}
          resizeMode="cover"
        />
      ) : pipPlayer ? (
        <VideoView
          player={pipPlayer}
          style={{ width: "100%", height: "100%", borderRadius: scale(10), overflow: "hidden" }}
          contentFit="cover"
          nativeControls={false}
        />
      ) : (
        <View
          style={{
            width: "100%",
            height: "100%",
            borderRadius: scale(10),
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="videocam" size={scale(22)} color="#FFFFFF" />
        </View>
      )}
    </>
  );

  return (
    <View
      {...panResponder.panHandlers}
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: w,
        height: h,
        marginLeft: -w / 2,
        marginTop: -h / 2,
        alignItems: "center",
        justifyContent: "center",
        opacity: t.opacity,
        transform: [{ rotate: `${t.rotation}deg` }, { scale: t.scale }],
        zIndex: 12,
        borderWidth: isSelected ? 1.5 : 0,
        borderColor: COLORS.yellow,
        borderStyle: "dashed",
        borderRadius: scale(10),
      }}
    >
      {masked ? (
        <OverlayMaskView
          width={w}
          height={h}
          mask={overlay.mask}
          timelineMs={timelineMs}
        >
          {media}
        </OverlayMaskView>
      ) : (
        media
      )}
      {!!overlay.label && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: -scale(20),
            right: -scale(20),
            top: h + scale(4),
            alignItems: "center",
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: "#FFFFFF",
              fontSize: moderateScale(11),
              fontWeight: "800",
              textShadowColor: "rgba(0,0,0,0.75)",
              textShadowRadius: 4,
              textShadowOffset: { width: 0, height: 1 },
            }}
          >
            {overlay.label}
          </Text>
          {!!overlay.role && (
            <Text
              numberOfLines={1}
              style={{
                color: "#93C5FD",
                fontSize: moderateScale(9),
                fontWeight: "600",
                marginTop: 1,
              }}
            >
              {overlay.role}
            </Text>
          )}
        </View>
      )}
      {overlay.chromaKey?.enabled ? (
        <View
          style={{
            position: "absolute",
            top: scale(4),
            right: scale(4),
            backgroundColor: "rgba(0,0,0,0.65)",
            borderRadius: scale(8),
            paddingHorizontal: scale(6),
            paddingVertical: verticalScale(2),
            flexDirection: "row",
            alignItems: "center",
            gap: scale(4),
          }}
        >
          <View
            style={{
              width: scale(8),
              height: scale(8),
              borderRadius: scale(4),
              backgroundColor: overlay.chromaKey.color || "#00FF00",
            }}
          />
          <Text style={{ color: "#fff", fontSize: moderateScale(9), fontWeight: "700" }}>
            KEY
          </Text>
        </View>
      ) : null}
      {masked ? (
        <View
          style={{
            position: "absolute",
            top: scale(4),
            left: scale(4),
            backgroundColor: "rgba(0,0,0,0.65)",
            borderRadius: scale(8),
            paddingHorizontal: scale(6),
            paddingVertical: verticalScale(2),
          }}
        >
          <Text style={{ color: COLORS.yellow, fontSize: moderateScale(9), fontWeight: "700" }}>
            MASK
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function EditorScreen() {
  const __palette = useAppPalette();
  const { isDark } = useTheme();
  COLORS = {
    ...COLORS,
    background: __palette.background,
    surface: __palette.surface,
    // Keep editor chrome accent border yellow in both themes.
    border: __palette.yellow,
    yellow: __palette.yellow,
    textPrimary: __palette.textPrimary,
    textSecondary: __palette.textSecondary,
    textMuted: __palette.textMuted,
  };
  styles = __makeStyles();

  const navigation = useNavigation<any>();
  const route = useRoute<any>();

const {
  currentVideoProject,
  updateClipTrim,
  deleteClip,
  duplicateClip,
  splitClip,
  applyKeepRanges,
  insertClipRange,
  applyAutoMovie,
  addTitleCard,
  moveClip,
  resetClipEdits,
  attachMultiCam,
  cutToMultiCamAngle,
  addFlyer,
  updateStillDuration,
} = useVideoProject();
const { currentProject } = useProject();
  const { getMembersForProject, fetchMembers, getMyRoleForProject, canEditProject } =
    useMember();

  //for the exporting modal//
const [showExportConfirm, setShowExportConfirm] = useState(false);
const [exportState, setExportState] = useState<'idle' | 'exporting' | 'done'>('idle');
const [progress, setProgress] = useState(0);
const [quote, setQuote] = useState(getRandomQuote());
const quoteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

const project = currentVideoProject && currentVideoProject.projectId === currentProject?.id
    ? currentVideoProject
    : null;

const projectId = project?.id;

  const {
    updateClipSpeed,
    updateClipSpeedCurve,
    updateClipReversed,
    updateClipVolume,
    updateClipOpacity,
    addClipVolumeKeyframe,
    clearClipVolumeKeyframes,
    addClipOpacityKeyframe,
    clearClipOpacityKeyframes,
    updateClipRotation,
    addClipRotationKeyframe,
    clearClipRotationKeyframes,
    setCanvasColor,
    updateClipLayout,
    applyDoubleExposure,
    addClipColorGradeKeyframe,
    clearClipColorGradeKeyframes,
    addClipCropKeyframe,
    clearClipCropKeyframes,
    addTextPositionKeyframe,
    clearTextPositionKeyframes,
    appendRemoteClip,
    updateClipMedia,
    addTextOverlay,
    updateTextOverlay,
    removeTextOverlay,
    updateClipFilter,
    updateClipEffect,
    applyMovieEffect,
    applyEditTemplate,
    updateClipColorGrade,
    updateClipStabilize,
    updateClipAutoReframe,
    updateClipAudioFx,
    updateClipLookOverlay,
    updateClipCrop,
    updateClipSegments,
    updateClipTransition,
    addMediaOverlay,
    updateMediaOverlay,
    removeMediaOverlay,
    addOverlayKeyframe,
    clearOverlayKeyframes,
    addMusicTrack,
    updateMusicTrack,
    removeMusicTrack,
    addVoiceover,
    updateVoiceover,
    removeVoiceover,
    addBeatMarker,
    removeBeatMarker,
    clearBeatMarkers,
    mergeBeatMarkers,
    createCompoundGroup,
    ungroupCompound,
    toggleCompoundCollapse,
    addAdjustmentLayer,
    removeAdjustmentLayer,
    updateClipColorCurves,
    updateClipLut,
    setProjectBrandKit,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useVideoProject();

  const { fetchComments, addComment, getCommentsForProject } = useComment();
  const { fetchMessages, markProjectRead, getUnreadForProject } = useMessage();
  const { user, token } = useAuth();

  const collabProjectId = currentProject?.id ?? '';
  const myRole = collabProjectId
    ? getMyRoleForProject(collabProjectId)
    : undefined;
  const isViewer = myRole === 'Viewer';
  // Until roster loads, don't lock the Owner/Editor who just opened the project.
  const canEdit =
    !myRole || myRole === 'Owner' || myRole === 'Editor';
  const [roleRequestBusy, setRoleRequestBusy] = useState(false);

  const requestEditorAccess = useCallback(async () => {
    if (!collabProjectId || !token || roleRequestBusy) return;
    try {
      setRoleRequestBusy(true);
      await memberService.requestRoleUpgrade(collabProjectId, token);
      Alert.alert(
        'Request sent',
        'The Owner got a live notification. You’ll be notified when they Grant Editor or decline.'
      );
    } catch (e: any) {
      const msg = e?.message || '';
      if (/ALREADY_PENDING|already|409/i.test(msg)) {
        Alert.alert(
          'Already requested',
          'Your Editor request is waiting for the Owner.'
        );
      } else {
        Alert.alert('Couldn’t send request', msg || 'Try again.');
      }
    } finally {
      setRoleRequestBusy(false);
    }
  }, [collabProjectId, token, roleRequestBusy]);

  const promptViewerGate = useCallback(() => {
    Alert.alert(
      'Viewer access',
      'You’re a Viewer on this project — you can watch, chat, and leave comments. To cut, add text, or export, ask the Owner to make you an Editor.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Request Editor',
          onPress: () => void requestEditorAccess(),
        },
      ]
    );
  }, [requestEditorAccess]);

  // ── Real-time collaboration ──
  // Opens a STOMP connection for this project: live group chat, presence
  // (online avatars), and clip-comment sync. Presence auto-marks this user
  // online for everyone else on connect.
  useProjectSocket(projectId ?? "");
  const unreadCount = projectId ? getUnreadForProject(projectId) : 0;

  // Figma-style live cursors: teammates' playheads rendered on our timeline.
  const remoteCursors = useLiveCursors();
  const editToast = useEditToasts();

  const openCollabPanel = () => {
    setSidebarVisible(true);
    if (projectId) markProjectRead(projectId);
  };

  //for the video volume//
  const [activeToolLabel, setActiveToolLabel] = useState<string | null>(null);
  const [toolSearchOpen, setToolSearchOpen] = useState(false);
  const [wowActive, setWowActive] = useState(false);
  const [wowStep, setWowStep] = useState<'captions' | 'export' | 'invite'>(
    'captions'
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { isWowPathActive } = await import('../services/wowPathService');
      const active =
        route.params?.wow === true || (await isWowPathActive());
      if (cancelled) return;
      setWowActive(active);
      if (route.params?.initialTool) {
        setActiveToolLabel(String(route.params.initialTool));
      } else if (active) {
        setActiveToolLabel('Captions');
      }
      if (active) setWowStep('captions');
    })();
    return () => {
      cancelled = true;
    };
  }, [route.params?.wow, route.params?.initialTool]);

  const [detectingBeats, setDetectingBeats] = useState(false);
  const canvasDragStart = useRef({ x: 0.5, y: 0.5 });
  const canvasLayoutRef = useRef({
    clipId: '',
    layoutX: 0.5,
    layoutY: 0.5,
    width: 1,
    height: 1,
  });
  const canvasPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          canvasDragStart.current = {
            x: canvasLayoutRef.current.layoutX,
            y: canvasLayoutRef.current.layoutY,
          };
        },
        onPanResponderMove: (_, g) => {
          const { width, height, clipId } = canvasLayoutRef.current;
          if (!clipId || width < 2) return;
          const nx = Math.max(
            0.05,
            Math.min(0.95, canvasDragStart.current.x + g.dx / width)
          );
          const ny = Math.max(
            0.05,
            Math.min(0.95, canvasDragStart.current.y + g.dy / height)
          );
          updateClipLayout(clipId, { layoutX: nx, layoutY: ny });
        },
      }),
    [updateClipLayout]
  );

  //for the selectedoverlay//s
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(
    null,
  );

//for the textoverlay//
  const [previewSize, setPreviewSize] = useState({ width: 1, height: 1 });

//---------for the exporting feature------------//
useEffect(() => {
  return () => {
    if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current);
  };
}, []);
const goToReviewExport = () => {
  if (isViewer || !canEdit) {
    promptViewerGate();
    return;
  }
  if (wowActive) setWowStep('invite');
  navigation.navigate('reviewexport', { wow: wowActive });
};

const handleExportConfirm = () => {
  if (!currentVideoProject) return;
  goToReviewExport();
};



  useEffect(() => {
    if (projectId) {
      fetchMembers(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchComments(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchMessages(projectId);
    }
  }, [projectId]);

  const clips: VideoClip[] = useMemo(
    () =>
      [...(project?.clips ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      ),
    [project?.clips]
  );

  //--------------for the sidebar--------------//
  const [sidebarVisible, setSidebarVisible] = useState(false);
  /** Canva-style comment pin mode on the preview. */
  const [commentPinMode, setCommentPinMode] = useState(false);
  const [commentComposer, setCommentComposer] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(
    null
  );

  const onlineMembers = projectId
    ? getMembersForProject(projectId).filter((m) => m.online)
    : [];
  // Teammates (excluding yourself) currently online — drives the header avatars.
  const onlineOthers = onlineMembers.filter((m) => m.userId !== user?.id);

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const activeClip = clips.find((c) => c.id === selectedClipId) || clips[0];
 
 
  //--------for the video cropping state-------------//
const [cropOverlayVisible, setCropOverlayVisible] = useState(false);
const [pendingCropRatioId, setPendingCropRatioId] = useState<string>('original');

  //--------for media overlays (multi-track PiP/stickers/GIFs)-------------//
  const mediaOverlays = project?.overlays ?? [];
  const [selectedMediaOverlayId, setSelectedMediaOverlayId] = useState<string | null>(null);
  const [motionTracking, setMotionTracking] = useState(false);
  const selectedMediaOverlay =
    mediaOverlays.find((o) => o.id === selectedMediaOverlayId) ?? null;

  // Voiceover narration takes — project-timeline audio track.
  const voiceovers = project?.voiceovers ?? [];
  const [selectedVoiceoverId, setSelectedVoiceoverId] = useState<string | null>(null);
  const [karaokeBusy, setKaraokeBusy] = useState(false);
  const [addVideosBusy, setAddVideosBusy] = useState(false);

  //--------for clip transitions-------------//
  // Which clip's outgoing transition is being edited (tap the circle between clips).
  const [transitionClipId, setTransitionClipId] = useState<string | null>(null);
  // Quick fade / flash / whip / zoom over the preview when playback crosses a transition.
  const transitionFade = useRef(new Animated.Value(0)).current;
  const transitionSlide = useRef(new Animated.Value(0)).current;
  const transitionScale = useRef(new Animated.Value(1)).current;
  const [transitionFlashColor, setTransitionFlashColor] = useState("#000");
  const runTransitionEffect = (
    type: string | undefined,
    durationMs: number
  ) => {
    const d = Math.max(180, durationMs || 500);
    const t = (type || "crossfade").toLowerCase();
    transitionFade.setValue(0);
    transitionSlide.setValue(0);
    transitionScale.setValue(1);

    if (t === "fadewhite") setTransitionFlashColor("#FFFFFF");
    else if (t === "glitch") setTransitionFlashColor("#6B21A8");
    else if (t === "dissolve") setTransitionFlashColor("#1F2937");
    else setTransitionFlashColor("#000000");

    const flashPeak =
      t === "crossfade" || t === "dissolve" ? 0.72 : t === "fadewhite" ? 0.95 : 1;

    // Whip / slide — horizontal push matching export xfade slideleft/right
    if (
      t === "whip" ||
      t === "slide" ||
      t === "smoothleft" ||
      t === "smoothright" ||
      t === "wipe"
    ) {
      const dir = t === "smoothright" ? 1 : -1;
      Animated.parallel([
        Animated.sequence([
          Animated.timing(transitionFade, {
            toValue: flashPeak,
            duration: Math.max(70, d * 0.28),
            useNativeDriver: true,
          }),
          Animated.timing(transitionFade, {
            toValue: 0,
            duration: Math.max(100, d * 0.72),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(transitionSlide, {
          toValue: dir * Math.max(80, previewSize.width * 0.42),
          duration: d,
          useNativeDriver: true,
        }),
      ]).start(() => transitionSlide.setValue(0));
      return;
    }

    // Zoom / circle / radial — scale punch like export zoomxfade
    if (t === "zoom" || t === "circle" || t === "radial") {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(transitionFade, {
            toValue: flashPeak,
            duration: Math.max(80, d / 2),
            useNativeDriver: true,
          }),
          Animated.timing(transitionFade, {
            toValue: 0,
            duration: Math.max(80, d / 2),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(transitionScale, {
            toValue: 1.18,
            duration: Math.max(80, d / 2),
            useNativeDriver: true,
          }),
          Animated.timing(transitionScale, {
            toValue: 1,
            duration: Math.max(80, d / 2),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
      return;
    }

    // Glitch — double flash
    if (t === "glitch" || t === "pixelate") {
      Animated.sequence([
        Animated.timing(transitionFade, {
          toValue: 1,
          duration: 40,
          useNativeDriver: true,
        }),
        Animated.timing(transitionFade, {
          toValue: 0.15,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(transitionFade, {
          toValue: flashPeak,
          duration: Math.max(60, d / 3),
          useNativeDriver: true,
        }),
        Animated.timing(transitionFade, {
          toValue: 0,
          duration: Math.max(80, d / 2),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    // Default crossfade / fadeblack / fadewhite
    Animated.sequence([
      Animated.timing(transitionFade, {
        toValue: flashPeak,
        duration: Math.max(100, d / 2),
        useNativeDriver: true,
      }),
      Animated.timing(transitionFade, {
        toValue: 0,
        duration: Math.max(100, d / 2),
        useNativeDriver: true,
      }),
    ]).start();
  };


  const activeOverlay =
    activeClip?.textOverlays?.find((o) => o.id === selectedOverlayId) ?? null;

  useEffect(() => {
    if (activeClip && selectedClipId !== activeClip.id) {
      setSelectedClipId(activeClip.id);
    }
  }, [activeClip, selectedClipId]);

  const player = useVideoPlayer(activeClip?.uri ?? null, (p: any) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.1;
    // Mix clip audio with background music / VO (don't mute the video bed).
    try {
      p.audioMixingMode = "mixWithOthers";
    } catch {
      /* older expo-video builds */
    }
    try {
      p.muted = false;
    } catch {
      /* ignore */
    }
  });

  // Allow video + music + voiceover to play at the same time.
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
      shouldPlayInBackground: false,
      allowsRecording: false,
    }).catch((e) => console.log("audio mix mode failed", e));
  }, []);

  // ── Background music (multi-track) — play the track under the playhead ──
  const musicTracks = useMemo(
    () => (project ? getMusicTracks(project) : []),
    [project?.musicTracks, project?.backgroundMusic],
  );
  const [selectedMusicTrackId, setSelectedMusicTrackId] = useState<string | null>(null);
  const beatMarkersMs = project?.beatMarkersMs ?? [];

  // Preview player for the voiceover under the playhead (URI swapped via replace).
  const [voPreviewUri, setVoPreviewUri] = useState<string | null>(null);
  const voiceoverPlayer = useAudioPlayer(voPreviewUri);

  // Music URI follows the active track under the playhead (set below once
  // currentPositionMs is known). Seed with first track so the hook mounts.
  const [musicPreviewUri, setMusicPreviewUri] = useState<string | null>(null);
  const musicPlayer = useAudioPlayer(musicPreviewUri);



  const [isPlaying, setIsPlaying] = useState(player.playing ?? false);
  useEventListener(player, "playingChange", (payload) => {
    setIsPlaying(payload.isPlaying);
  });

  // ── PiP video overlay playback ──
  // One shared secondary player drives the first video overlay (muted, looping,
  // follows main play/pause). Keeps things to a single extra decoder instance.
  const pipOverlay = mediaOverlays.find((o) => o.type === "video") ?? null;
  const pipPlayer = useVideoPlayer(pipOverlay?.uri ?? null, (p: any) => {
    p.loop = true;
    p.muted = true;
    try {
      p.audioMixingMode = "mixWithOthers";
    } catch {
      /* ignore */
    }
  });

  const [currentTime, setCurrentTime] = useState(player.currentTime ?? 0);
  const [currentLoadedUri, setCurrentLoadedUri] = useState<string | null>(null);

  // Sync player source on active clip change (title/flyer have no video decoder).
  useEffect(() => {
    if (!activeClip) return;
    if (activeClip.kind === 'title' || activeClip.kind === 'flyer') {
      try {
        player.pause();
      } catch {
        /* ignore */
      }
      setCurrentLoadedUri(null);
      const startMs = activeClip.trimStartMs ?? 0;
      setCurrentTime(startMs / 1000);
      return;
    }
    if (activeClip.uri && activeClip.uri !== currentLoadedUri) {
      player.replace(activeClip.uri);
      setCurrentLoadedUri(activeClip.uri);
      const startMs = activeClip.trimStartMs ?? 0;
      player.currentTime = startMs / 1000;
      setCurrentTime(startMs / 1000);
    }
  }, [activeClip?.id, activeClip?.uri, activeClip?.kind, currentLoadedUri]);

  /** Advance to the next timeline piece (video, title, or flyer). */
  const playClipFromStart = (clip: VideoClip, autoplay: boolean) => {
    setSelectedClipId(clip.id);
    if (clip.kind === 'title' || clip.kind === 'flyer') {
      try {
        player.pause();
      } catch {
        /* ignore */
      }
      setCurrentLoadedUri(null);
      setCurrentTime((clip.trimStartMs ?? 0) / 1000);
      setIsPlaying(autoplay);
      if (autoplay) {
        try {
          musicPlayer.play();
        } catch {
          /* ignore */
        }
      }
      return;
    }
    setIsPlaying(false);
    player.replace(clip.uri);
    setCurrentLoadedUri(clip.uri);
    const nextStart = clip.trimStartMs ?? 0;
    player.currentTime = nextStart / 1000;
    setCurrentTime(nextStart / 1000);
    if (autoplay) {
      player.play();
      try {
        musicPlayer.play();
      } catch {
        /* ignore */
      }
    }
  };

  // Live volume / opacity curves (clip-local playhead).
  const clipLocalMs = currentTime * 1000;
  const liveVolume = activeClip
    ? sampleClipVolume(activeClip, clipLocalMs)
    : 1;
  const liveOpacity = activeClip
    ? sampleClipOpacity(activeClip, clipLocalMs)
    : 1;
  const liveGrade = activeClip
    ? sampleClipColorGrade(activeClip, clipLocalMs)
    : DEFAULT_COLOR_GRADE;
  const liveRotation = activeClip
    ? sampleClipRotation(activeClip, clipLocalMs)
    : 0;
  const liveRotateCover = coverScaleForRotation(liveRotation);

  useEffect(() => {
    if (activeClip) {
      try {
        player.muted = false;
        player.volume = liveVolume;
      } catch {
        /* ignore */
      }
    }
  }, [liveVolume, activeClip?.id, player]);

  //for the real time video speed//
  useEffect(() => {
    if (activeClip) {
      // Curves: preview uses the curve's average speed (true variable speed
      // is baked on export). Constant speed when curve is 'none'.
      const curveId = (activeClip.speedCurve ?? 'none') as SpeedCurveId;
      const base = activeClip.speed ?? 1;
      const rate =
        curveId !== 'none' ? curveAverageSpeed(curveId) : base;
      player.playbackRate = rate;
    }
  }, [activeClip?.speed, activeClip?.speedCurve, player]);
  
  // Handle active clip playback endpoint (video clips only).
useEventListener(player, "timeUpdate", (payload) => {
  if (!activeClip || activeClip.kind === 'title' || activeClip.kind === 'flyer') return;
  const trimEndMs = activeClip.trimEndMs ?? activeClip.durationMs;
  const curTimeMs = payload.currentTime * 1000;
  if (curTimeMs >= trimEndMs) {
    const activeIdx = clips.findIndex((c) => c.id === activeClip.id);
    if (activeIdx !== -1 && activeIdx + 1 < clips.length) {
      const outgoing = activeClip.transitionOut;
      if (outgoing && outgoing.type !== "none") {
        runTransitionEffect(outgoing.type, outgoing.durationMs || 500);
      }
      playClipFromStart(clips[activeIdx + 1], true);
    } else {
      player.pause();
      player.currentTime = trimEndMs / 1000;
      setIsPlaying(false);
    }
  } else {
    setCurrentTime(payload.currentTime);
  }
});

  // Title/flyer clock — no VideoView decoder; advance by wall clock.
  useEffect(() => {
    if (
      !isPlaying ||
      !activeClip ||
      (activeClip.kind !== 'title' && activeClip.kind !== 'flyer')
    )
      return;
    const trimStart = (activeClip.trimStartMs ?? 0) / 1000;
    const trimEnd = (activeClip.trimEndMs ?? activeClip.durationMs) / 1000;
    let t = currentTime;
    if (t < trimStart || t >= trimEnd) t = trimStart;
    const origin = Date.now() - t * 1000;
    const id = setInterval(() => {
      const now = (Date.now() - origin) / 1000;
      if (now >= trimEnd) {
        clearInterval(id);
        const activeIdx = clips.findIndex((c) => c.id === activeClip.id);
        if (activeIdx !== -1 && activeIdx + 1 < clips.length) {
          playClipFromStart(clips[activeIdx + 1], true);
        } else {
          setCurrentTime(trimEnd);
          setIsPlaying(false);
          try {
            musicPlayer.pause();
          } catch {
            /* ignore */
          }
        }
      } else {
        setCurrentTime(now);
      }
    }, 40);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, activeClip?.id, activeClip?.kind]);

const togglePlayback = () => {
  if (activeClip?.kind === 'title' || activeClip?.kind === 'flyer') {
    if (isPlaying) {
      setIsPlaying(false);
      musicPlayer.pause();
      try {
        voiceoverPlayer.pause();
      } catch {
        /* ignore */
      }
    } else {
      const trimStartMs = activeClip.trimStartMs ?? 0;
      const trimEndMs = activeClip.trimEndMs ?? activeClip.durationMs;
      const posMs = currentTime * 1000;
      if (posMs < trimStartMs || posMs >= trimEndMs) {
        setCurrentTime(trimStartMs / 1000);
      }
      setIsPlaying(true);
      musicPlayer.play();
      if (wowActive && wowStep === 'captions') {
        setWowStep('export');
      }
    }
    return;
  }

  const currentlyPlaying = player.playing;
  if (currentlyPlaying) {
    player.pause();
    musicPlayer.pause();
    try { voiceoverPlayer.pause(); } catch { /* ignore */ }
  } else {
    if (activeClip) {
      const trimStartMs = activeClip.trimStartMs ?? 0;
      const trimEndMs = activeClip.trimEndMs ?? activeClip.durationMs;
      const posMs = currentTime * 1000;
      if (posMs < trimStartMs || posMs >= trimEndMs) {
        player.currentTime = trimStartMs / 1000;
        setCurrentTime(trimStartMs / 1000);
      }
    }
    player.play();
    musicPlayer.play();
    if (wowActive && wowStep === 'captions') {
      setWowStep('export');
    }
  }
};


  // Generate Thumbnails
  const [clipThumbnails, setClipThumbnails] = useState<
    Record<string, string[]>
  >({});
  useEffect(() => {
    let cancelled = false;
    const generateAll = async () => {
      for (const clip of clips) {
        if (clipThumbnails[clip.id]) continue;
        if (clip.kind === 'title' || clip.kind === 'flyer' || !clip.uri) {
          setClipThumbnails((prev) => ({ ...prev, [clip.id]: [] }));
          continue;
        }
        const secondsCount = Math.max(1, Math.ceil(clip.durationMs / 1000));
        const uris: string[] = [];
        for (let s = 0; s < secondsCount; s++) {
          if (cancelled) return;
          try {
            const { uri } = await VideoThumbnails.getThumbnailAsync(clip.uri, {
              time: s * 1000,
            });
            uris.push(uri);
          } catch (e) {
            console.log("Thumbnail failed for clip", clip.id, "at", s, e);
          }
          setClipThumbnails((prev) => ({ ...prev, [clip.id]: [...uris] }));
        }
      }
    };
    if (clips.length > 0) generateAll();
    return () => {
      cancelled = true;
    };
  }, [clips, projectId]);

  // Coordinate mapping segments
  const clipTimelineSegments = useMemo(() => {
    let currentStartMs = 0;
    return clips.map((clip) => {
      const start = clip.trimStartMs ?? 0;
      const end = clip.trimEndMs ?? clip.durationMs;
      const duration = end - start;
      const segment = {
        clip,
        timelineStartMs: currentStartMs,
        timelineEndMs: currentStartMs + duration,
        trimmedDurationMs: duration,
      };
      currentStartMs += duration;
      return segment;
    });
  }, [clips]);

  const getClipCumulativeStartMs = (clipId: string) => {
    const seg = clipTimelineSegments.find((s) => s.clip.id === clipId);
    return seg ? seg.timelineStartMs : 0;
  };

  const getTimelinePositionMs = (playerTimeSec: number) => {
    if (!activeClip) return 0;
    const activeSegment = clipTimelineSegments.find(
      (s) => s.clip.id === activeClip.id,
    );
    if (!activeSegment) return 0;
    const start = activeClip.trimStartMs ?? 0;
    const relativeOffsetMs = playerTimeSec * 1000 - start;
    return Math.max(0, activeSegment.timelineStartMs + relativeOffsetMs);
  };

  const totalDurationMs = clipTimelineSegments.reduce(
    (acc, s) => acc + s.trimmedDurationMs,
    0,
  );
  const currentPositionMs = getTimelinePositionMs(currentTime);

  const projectComments = projectId ? getCommentsForProject(projectId) : [];
  const projectMembers = projectId ? getMembersForProject(projectId) : [];
  const canvasPins = useMemo(
    () =>
      projectComments.filter(
        (c) =>
          !c.resolved &&
          typeof c.canvasX === 'number' &&
          typeof c.canvasY === 'number'
      ),
    [projectComments]
  );

  const resolveBackendClipId = async (): Promise<string | null> => {
    if (!projectId || !token) return null;
    const looksUuid =
      !!activeClip?.id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        activeClip.id
      );
    if (looksUuid) return activeClip!.id;
    try {
      const remote = await clipService.getClips(projectId, token);
      if (!remote.length) return null;
      const byUrl = activeClip?.uri
        ? remote.find((c) => c.videoUrl && c.videoUrl === activeClip.uri)
        : undefined;
      return byUrl?.id ?? remote[0].id;
    } catch {
      return null;
    }
  };

  const openCommentAt = (xNorm: number, yNorm: number) => {
    try {
      player.pause();
    } catch {
      /* ignore */
    }
    setIsPlaying(false);
    setCommentComposer({
      x: Math.max(0.05, Math.min(0.95, xNorm)),
      y: Math.max(0.05, Math.min(0.95, yNorm)),
    });
  };

  const handleCommentSubmit = async (text: string) => {
    if (!projectId || !commentComposer) return;
    setCommentSubmitting(true);
    try {
      const clipId = await resolveBackendClipId();
      if (!clipId) {
        Alert.alert(
          'Upload first',
          'Comments need a project clip on the server. Export once or upload so teammates can see it.'
        );
        return;
      }
      await addComment(
        projectId,
        clipId,
        text,
        currentPositionMs / 1000,
        { x: commentComposer.x, y: commentComposer.y }
      );
      setCommentComposer(null);
      setCommentPinMode(false);
    } catch (e: any) {
      Alert.alert('Couldn’t post', e?.message ?? 'Try again.');
    } finally {
      setCommentSubmitting(false);
    }
  };
  const totalSeconds = Math.max(1, Math.ceil(totalDurationMs / 1000));

  // Track under the playhead for music preview (multi-track).
  const activeMusicTrack = useMemo(() => {
    return (
      musicTracks.find((t) => {
        const start = t.startMs ?? 0;
        return (
          currentPositionMs >= start &&
          currentPositionMs < start + musicAudibleMs(t)
        );
      }) ?? null
    );
  }, [musicTracks, currentPositionMs]);

  // Keep music preview URI + play/pause + fades/duck in sync with the timeline.
  useEffect(() => {
    const uri = activeMusicTrack?.uri ?? null;
    if (uri !== musicPreviewUri) {
      setMusicPreviewUri(uri);
      return; // wait for player to remount on next tick
    }
    if (!activeMusicTrack) {
      try {
        if (musicPlayer.playing) musicPlayer.pause();
      } catch {
        /* ignore */
      }
      return;
    }
    const start = activeMusicTrack.startMs ?? 0;
    const trimStart = activeMusicTrack.trimStartMs ?? 0;
    const audible = musicAudibleMs(activeMusicTrack);
    const local = currentPositionMs - start;
    let vol = activeMusicTrack.volume ?? 0.5;
    const fadeIn = activeMusicTrack.fadeInMs ?? 0;
    const fadeOut = activeMusicTrack.fadeOutMs ?? 0;
    if (fadeIn > 0 && local < fadeIn) vol *= Math.max(0, local / fadeIn);
    if (fadeOut > 0 && local > audible - fadeOut) {
      vol *= Math.max(0, (audible - local) / fadeOut);
    }
    const underVo =
      activeMusicTrack.duckUnderVoiceover !== false &&
      voiceovers.some(
        (v) =>
          currentPositionMs >= v.startMs &&
          currentPositionMs < v.startMs + v.durationMs,
      );
    if (underVo) vol *= activeMusicTrack.duckLevel ?? 0.28;
    try {
      musicPlayer.volume = vol;
    } catch {
      /* ignore */
    }

    // Keep clip audio alive whenever music is under the playhead.
    if (activeClip?.kind !== "title") {
      try {
        player.muted = false;
        player.volume = liveVolume;
      } catch {
        /* ignore */
      }
    }

    if (!isPlaying) {
      try {
        if (musicPlayer.playing) musicPlayer.pause();
      } catch {
        /* ignore */
      }
      return;
    }
    const offsetMs = local + trimStart;
    (async () => {
      try {
        const wantSec = Math.max(0, offsetMs) / 1000;
        // Resync when scrubbing or drift > ~350ms so music tracks the playhead.
        let drift = 999;
        try {
          drift = Math.abs((musicPlayer.currentTime ?? wantSec) - wantSec);
        } catch {
          drift = 999;
        }
        if (!musicPlayer.playing || drift > 0.35) {
          await musicPlayer.seekTo(wantSec);
          if (!musicPlayer.playing) musicPlayer.play();
        }
        // Re-assert mix after music starts (OS can duck/mute video otherwise).
        if (activeClip?.kind !== "title") {
          player.muted = false;
          player.volume = liveVolume;
        }
      } catch (e) {
        console.log("music sync failed", e);
      }
    })();
  }, [
    activeMusicTrack?.id,
    activeMusicTrack?.uri,
    activeMusicTrack?.volume,
    activeMusicTrack?.fadeInMs,
    activeMusicTrack?.fadeOutMs,
    activeMusicTrack?.duckUnderVoiceover,
    musicPreviewUri,
    currentPositionMs,
    isPlaying,
    voiceovers,
    liveVolume,
    activeClip?.kind,
    player,
  ]);

  // Voiceover under the playhead — swap preview URI and keep audio in sync.
  const activeVoiceover = useMemo(
    () =>
      voiceovers.find(
        (v) =>
          currentPositionMs >= v.startMs &&
          currentPositionMs < v.startMs + v.durationMs,
      ) ?? null,
    [voiceovers, currentPositionMs],
  );

  useEffect(() => {
    const next = activeVoiceover?.uri ?? null;
    if (next !== voPreviewUri) setVoPreviewUri(next);
  }, [activeVoiceover?.uri, voPreviewUri]);

  useEffect(() => {
    if (activeVoiceover) {
      voiceoverPlayer.volume = activeVoiceover.volume ?? 1;
    }
  }, [activeVoiceover?.id, activeVoiceover?.volume]);

  useEffect(() => {
    if (!activeVoiceover || !voPreviewUri) {
      try { if (voiceoverPlayer.playing) voiceoverPlayer.pause(); } catch { /* ignore */ }
      return;
    }
    const offsetMs = currentPositionMs - activeVoiceover.startMs;
    const sync = async () => {
      try {
        if (isPlaying) {
          await voiceoverPlayer.seekTo(Math.max(0, offsetMs) / 1000);
          if (!voiceoverPlayer.playing) voiceoverPlayer.play();
        } else if (voiceoverPlayer.playing) {
          voiceoverPlayer.pause();
        }
      } catch (e) {
        console.log("voiceover sync failed", e);
      }
    };
    // Seek only when starting play or when the take changes — avoid thrashing.
    if (isPlaying) {
      const t = setTimeout(sync, 40);
      return () => clearTimeout(t);
    }
    try { voiceoverPlayer.pause(); } catch { /* ignore */ }
  }, [isPlaying, activeVoiceover?.id, voPreviewUri]);

  const rulerMarks = useMemo(() => {
    const marks: number[] = [];
    for (let s = 0; s <= totalSeconds; s += 5) marks.push(s);
    return marks;
  }, [totalSeconds]);

  // ── Media overlays visible right now (selected ones always shown for editing) ──
  const activeMediaOverlays = useMemo(() => {
    return mediaOverlays.filter(
      (o) =>
        o.id === selectedMediaOverlayId ||
        (currentPositionMs >= o.startMs &&
          currentPositionMs <= o.startMs + o.durationMs),
    );
  }, [mediaOverlays, currentPositionMs, selectedMediaOverlayId]);

  // Keep the PiP video's play state following the main player + its window.
  useEffect(() => {
    if (!pipOverlay) return;
    const visible =
      currentPositionMs >= pipOverlay.startMs &&
      currentPositionMs <= pipOverlay.startMs + pipOverlay.durationMs;
    try {
      if (isPlaying && visible) {
        if (!pipPlayer.playing) pipPlayer.play();
      } else if (pipPlayer.playing) {
        pipPlayer.pause();
      }
    } catch (e) {
      console.log("PiP sync failed", e);
    }
  }, [isPlaying, currentPositionMs, pipOverlay?.id]);

  // ── Broadcast our own cursor (playhead + selected clip + tool) ──
  // Throttled to ~5/sec while moving, plus a 3s heartbeat so idle editors'
  // markers don't expire on teammates' screens.
  const cursorPayloadRef = useRef<any>(null);
  const lastCursorSentRef = useRef(0);
  useEffect(() => {
    if (!projectId || !user) return;
    cursorPayloadRef.current = {
      userId: user.id,
      name: user.name,
      initials: user.initials,
      color: user.color,
      positionMs: Math.round(currentPositionMs),
      selectedClipId: selectedClipId ?? undefined,
      tool: activeToolLabel ?? undefined,
    };
    const now = Date.now();
    if (now - lastCursorSentRef.current < 200) return;
    lastCursorSentRef.current = now;
    publishCursor(projectId, cursorPayloadRef.current);
  }, [projectId, user, currentPositionMs, selectedClipId, activeToolLabel]);

  useEffect(() => {
    if (!projectId) return;
    const heartbeat = setInterval(() => {
      if (cursorPayloadRef.current) {
        publishCursor(projectId, cursorPayloadRef.current);
      }
    }, 3000);
    return () => clearInterval(heartbeat);
  }, [projectId]);

  const timelineScrollRef = useRef<ScrollView>(null);
  const isScrubbingRef = useRef(false);

  useEffect(() => {
    if (isPlaying && !isScrubbingRef.current) {
      const x = (currentPositionMs / 1000) * PX_PER_SECOND;
      timelineScrollRef.current?.scrollTo({ x, animated: false });
    }
  }, [currentPositionMs, isPlaying]);

  const handleTimelineScroll = (e: any) => {
    if (!isScrubbingRef.current) return;
    const x = e.nativeEvent.contentOffset.x;
    const timelineTimeMs = (x / PX_PER_SECOND) * 1000;

    const activeSegment =
      clipTimelineSegments.find(
        (s) =>
          timelineTimeMs >= s.timelineStartMs &&
          timelineTimeMs <= s.timelineEndMs,
      ) || clipTimelineSegments[0];

    if (activeSegment) {
      const relativeOffsetMs = timelineTimeMs - activeSegment.timelineStartMs;
      const targetClip = activeSegment.clip;
      const targetPlayerTimeSec =
        ((targetClip.trimStartMs ?? 0) + relativeOffsetMs) / 1000;

      if (targetClip.id !== activeClip?.id) {
        setSelectedClipId(targetClip.id);
      }
      if (targetClip.kind === 'title' || targetClip.kind === 'flyer') {
        try {
          player.pause();
        } catch {
          /* ignore */
        }
        setCurrentLoadedUri(null);
        setCurrentTime(targetPlayerTimeSec);
        setIsPlaying(false);
      } else {
        if (targetClip.uri !== currentLoadedUri) {
          player.replace(targetClip.uri);
          setCurrentLoadedUri(targetClip.uri);
        }
        player.currentTime = targetPlayerTimeSec;
        setCurrentTime(targetPlayerTimeSec);
      }
    }
  };

  const handleTrimEnd = (
    clipId: string,
    trimStartMs: number,
    trimEndMs: number,
  ) => {
    updateClipTrim(clipId, trimStartMs, trimEndMs);
  };

  const handleSegmentsChange = (clipId: string, segments: VideoSegment[]) => {
    updateClipSegments(clipId, segments); // new context method, mirrors updateClipTrim
  };


  // Text Overlays selector
  const visibleOverlays = useMemo(() => {
    const list: Array<{
      overlay: TextOverlay;
      left: number;
      width: number;
    }> = [];

    clips.forEach((clip) => {
      const overlays = clip.textOverlays ?? [];
      const trimStart = clip.trimStartMs ?? 0;
      const trimEnd = clip.trimEndMs ?? clip.durationMs;
      const clipDuration = trimEnd - trimStart;
      const cumStart = getClipCumulativeStartMs(clip.id);

      overlays.forEach((o) => {
        const relativeStart = o.startMs - trimStart;
        const relativeEnd = relativeStart + o.durationMs;

        if (relativeEnd > 0 && relativeStart < clipDuration) {
          const visibleStart = Math.max(0, relativeStart);
          const visibleEnd = Math.min(clipDuration, relativeEnd);
          const visibleDur = visibleEnd - visibleStart;

          if (visibleDur > 0) {
            const timelineStart = cumStart + visibleStart;
            list.push({
              overlay: o,
              left: (timelineStart / 1000) * PX_PER_SECOND,
              width: (visibleDur / 1000) * PX_PER_SECOND,
            });
          }
        }
      });
    });

    return list;
  }, [clips, clipTimelineSegments]);

  //get the visible overlays for the active clip at the current time//
  // Keep the selected text box visible while the Text tool is open (even if
  // playhead drifts outside its timing window) so the user can type on-video.
  const activeVisibleOverlays = useMemo(() => {
    if (!activeClip) return [];
    const localTimeMs = currentTime * 1000;
    return (activeClip.textOverlays ?? []).filter((o) => {
      const inWindow =
        localTimeMs >= o.startMs && localTimeMs <= o.startMs + o.durationMs;
      const editing =
        activeToolLabel === "Text" && selectedOverlayId === o.id;
      return inWindow || editing;
    });
  }, [activeClip, currentTime, activeToolLabel, selectedOverlayId]);

  // Toolbar Actions — Split snaps to nearest beat marker (±350ms).
  const handleSplit = () => {
    if (isViewer || !canEdit) {
      promptViewerGate();
      return;
    }
    if (!activeClip) return;
    let timelineMs = currentPositionMs;
    const snap = nearestBeatMarker(beatMarkersMs, timelineMs);
    if (snap != null) timelineMs = snap;
    const activeSegment = clipTimelineSegments.find(
      (s) => s.clip.id === activeClip.id,
    );
    if (!activeSegment) return;
    const splitTimeMs =
      (activeClip.trimStartMs ?? 0) +
      (timelineMs - activeSegment.timelineStartMs);
    splitClip(activeClip.id, splitTimeMs);
    Alert.alert(
      "Clip Split",
      snap != null
        ? "Split snapped to the nearest beat marker."
        : "The clip has been split at the playhead position.",
    );
  };

  const handleDuplicate = () => {
    if (isViewer || !canEdit) {
      promptViewerGate();
      return;
    }
    if (!activeClip) return;
    duplicateClip(activeClip.id);
    Alert.alert("Clip Duplicated", "The clip has been duplicated.");
  };

  const handleDelete = () => {
    if (isViewer || !canEdit) {
      promptViewerGate();
      return;
    }
    if (!activeClip) return;
    deleteClip(activeClip.id);
    Alert.alert("Clip Deleted", "The clip has been removed.");
  };

  /** Multi-pick gallery / files → append on the timeline (mix / join on export). */
  const appendPickedMixVideos = async (picked: PickedMixVideo[]) => {
    if (!picked.length) return;
    const addedIds: string[] = [];
    const pendingUpload: { id: string; item: PickedMixVideo }[] = [];

    for (const item of picked) {
      const id = appendRemoteClip({
        uri: item.uri,
        durationMs: item.durationMs,
        title: item.title,
      });
      if (id) {
        addedIds.push(id);
        pendingUpload.push({ id, item });
      }
    }

    if (addedIds.length) {
      setSelectedClipId(addedIds[addedIds.length - 1]);
      Alert.alert(
        "Videos added",
        `${addedIds.length} clip${addedIds.length === 1 ? "" : "s"} on the timeline. Trim, Split, or reorder in Assemble — export joins them into one video.`
      );
    }

    void (async () => {
      for (const { id, item } of pendingUpload) {
        try {
          const { url, durationMs } = await uploadMixVideo(item);
          updateClipMedia(id, { uri: url, durationMs });
        } catch (e) {
          console.log("mix upload failed", id, e);
        }
      }
    })();
  };

  const handleAddVideosToTimeline = async () => {
    if (isViewer || !canEdit) {
      promptViewerGate();
      return;
    }
    if (!project) {
      Alert.alert("No project", "Open a project before adding videos.");
      return;
    }
    setAddVideosBusy(true);
    try {
      const picked = await pickVideosFromGallery(12);
      await appendPickedMixVideos(picked);
    } finally {
      setAddVideosBusy(false);
    }
  };

  const handleAddVideosFromFiles = async () => {
    if (isViewer || !canEdit) {
      promptViewerGate();
      return;
    }
    if (!project) {
      Alert.alert("No project", "Open a project before adding videos.");
      return;
    }
    setAddVideosBusy(true);
    try {
      const picked = await pickVideosFromFiles();
      await appendPickedMixVideos(picked);
    } finally {
      setAddVideosBusy(false);
    }
  };

  const promptAddVideos = () => {
    if (isViewer || !canEdit) {
      promptViewerGate();
      return;
    }
    Alert.alert("Add videos", "Mix more clips into this timeline.", [
      {
        text: "Camera roll",
        onPress: () => {
          void handleAddVideosToTimeline().catch((e: any) =>
            Alert.alert("Add videos", e?.message ?? "Could not add videos.")
          );
        },
      },
      {
        text: "Files",
        onPress: () => {
          void handleAddVideosFromFiles().catch((e: any) =>
            Alert.alert("Add videos", e?.message ?? "Could not add videos.")
          );
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  /** Starter filled recipe: look + hook + music + 9:16 + optional photo flyer. */
  const handleApplyFilledTemplate = (tpl: EditTemplate) => {
    if (!activeClip) {
      Alert.alert("Select a clip", "Pick a clip first, then apply a template.");
      return;
    }

    const applyCore = (photoUri?: string | null) => {
      applyEditTemplate(activeClip.id, tpl);
      if (tpl.cropRatioId) {
        updateClipCrop(activeClip.id, { cropRatioId: tpl.cropRatioId });
      }

      if (photoUri) {
        const flyerId = addFlyer(
          photoUri,
          tpl.photoSlot?.durationMs ?? 5000,
          tpl.photoSlot?.where === "after" ? "after" : "before",
          activeClip.id,
          tpl.photoSlot?.caption
        );
        if (flyerId) {
          applyEditTemplate(flyerId, tpl);
          if (tpl.cropRatioId) {
            updateClipCrop(flyerId, { cropRatioId: tpl.cropRatioId });
          }
          setSelectedClipId(flyerId);
        }
      }

      const track = getTemplateMusicTrack(tpl);
      if (track) {
        const id = addMusicTrack(
          track.url,
          libraryTrackDurationMs(track),
          0,
          track.title
        );
        const vol = tpl.music?.volume;
        if (vol != null) updateMusicTrack(id, { volume: vol });
      }
    };

    if (!tpl.photoSlot) {
      applyCore(null);
      return;
    }

    Alert.alert(
      "Photo for template",
      "Use your own photo in this recipe (recommended).",
      [
        {
          text: "Pick my photo",
          onPress: () => {
            void pickTemplatePhoto()
              .then((uri) => {
                if (uri) applyCore(uri);
                else
                  applyCore(tpl.photoSlot?.placeholderUri ?? null);
              })
              .catch((e: any) =>
                Alert.alert(
                  "Photo",
                  e?.message ?? "Could not open your photos."
                )
              );
          },
        },
        {
          text: "Use sample",
          onPress: () => applyCore(tpl.photoSlot?.placeholderUri ?? null),
        },
        {
          text: "Look only",
          style: "cancel",
          onPress: () => applyCore(null),
        },
      ]
    );
  };

  const handleToolPress = (
    toolLabel: string,
    overlayId: string | null = null,
  ) => {
    if (isViewer || !canEdit) {
      promptViewerGate();
      return;
    }
    setActiveToolLabel(toolLabel);
    if (toolLabel !== "Text") {
      setSelectedOverlayId(overlayId ?? null);
      return;
    }
    // CapCut-style: tap Text → box appears on the video to type into.
    try {
      player.pause();
    } catch {
      /* ignore */
    }
    if (overlayId) {
      setSelectedOverlayId(overlayId);
      return;
    }
    if (!activeClip) {
      setSelectedOverlayId(null);
      return;
    }
    const localMs = Math.round(currentTime * 1000);
    const atPlayhead = (activeClip.textOverlays ?? []).find(
      (o) => localMs >= o.startMs && localMs <= o.startMs + o.durationMs,
    );
    if (atPlayhead) {
      setSelectedOverlayId(atPlayhead.id);
      return;
    }
    const trimEndMs = activeClip.trimEndMs ?? activeClip.durationMs;
    const remaining = Math.max(2000, trimEndMs - localMs);
    const id = addTextOverlay(activeClip.id, "", localMs, remaining);
    setSelectedOverlayId(id);
  };

  const handleToolPickFromSearch = (tool: EditorTool) => {
    if (tool.action === "duplicate") {
      handleDuplicate();
      return;
    }
    if (tool.action === "delete") {
      handleDelete();
      return;
    }
    if (tool.action === "split" || tool.label === "Split") {
      handleSplit();
      return;
    }
    handleToolPress(tool.label);
  };

  const closeToolPanel = () => {
    if (wowActive && wowStep === 'captions') {
      setWowStep('export');
    }
    setActiveToolLabel(null);
    setSelectedOverlayId(null);
    setSelectedMediaOverlayId(null);
  };

  // ── Media overlay handlers ──
  const handleAddMediaOverlay = (type: MediaOverlayType, uri: string) => {
    // Drop the overlay at the playhead, defaulting to a 4s window (clamped
    // so it never starts beyond the end of the timeline).
    const startMs = Math.max(
      0,
      Math.min(Math.round(currentPositionMs), Math.max(0, totalDurationMs - 1500)),
    );
    const remaining = totalDurationMs - startMs;
    const durationMs = remaining > 0 ? Math.min(4000, remaining) : 4000;
    const id = addMediaOverlay({
      type,
      uri,
      startMs,
      durationMs,
      x: 0.5,
      y: 0.35,
      scale: 1,
      rotation: 0,
      opacity: 1,
    });
    setSelectedMediaOverlayId(id);
  };

  const handleAddOverlayKeyframe = () => {
    if (!selectedMediaOverlay) return;
    addOverlayKeyframe(selectedMediaOverlay.id, {
      timeMs: Math.round(currentPositionMs),
      x: selectedMediaOverlay.x,
      y: selectedMediaOverlay.y,
      scale: selectedMediaOverlay.scale,
      rotation: selectedMediaOverlay.rotation,
      opacity: selectedMediaOverlay.opacity,
    });
  };

  const handleDeleteMediaOverlay = () => {
    if (!selectedMediaOverlayId) return;
    removeMediaOverlay(selectedMediaOverlayId);
    setSelectedMediaOverlayId(null);
  };

const handleSelectCropRatio = (ratioId: string) => {
  setPendingCropRatioId(ratioId);
  // Open interactive pan/zoom overlay; confirm writes ratio + offsets + keyframe.
  setCropOverlayVisible(true);
};

const handleConfirmCrop = (cropData: {
  cropRatioId: string;
  cropOffsetX: number;
  cropOffsetY: number;
  cropZoom: number;
}) => {
  if (activeClip) {
    updateClipCrop(activeClip.id, cropData);
    // Diamond at playhead so pan/zoom can animate over time.
    addClipCropKeyframe(activeClip.id, {
      timeMs: Math.round(currentTime * 1000),
      cropOffsetX: cropData.cropOffsetX,
      cropOffsetY: cropData.cropOffsetY,
      cropZoom: cropData.cropZoom,
    });
  }
  setCropOverlayVisible(false);
};

const handleMotionTrack = async () => {
  if (!activeClip) {
    Alert.alert("Select a clip", "Pick a clip on the timeline first.");
    return;
  }
  const uri = activeClip.uri || "";
  if (!/^https?:\/\//i.test(uri)) {
    Alert.alert(
      "Upload needed",
      "Motion track needs the uploaded clip URL. Wait for upload, then try again."
    );
    return;
  }

  // Prefer selected text overlay; fall back to selected emoji sticker.
  if (activeOverlay) {
    setMotionTracking(true);
    try {
      const seedX = activeOverlay.x ?? 0.5;
      const seedY = activeOverlay.y ?? 0.5;
      const result = await motionTrackService.track(
        uri,
        { x: seedX, y: seedY, timeMs: Math.round(currentTime * 1000) },
        {
          windowStartMs: activeClip.trimStartMs ?? 0,
          windowEndMs: activeClip.trimEndMs ?? activeClip.durationMs,
        }
      );
      updateTextOverlay(activeClip.id, activeOverlay.id, {
        keyframes: result.items,
        x: result.items[0]?.x ?? seedX,
        y: result.items[0]?.y ?? seedY,
      });
      Alert.alert("Tracked", result.message);
    } catch (e: any) {
      Alert.alert("Track failed", e?.message ?? "Could not track subject.");
    } finally {
      setMotionTracking(false);
    }
    return;
  }

  if (selectedMediaOverlay) {
    setMotionTracking(true);
    try {
      const result = await motionTrackService.track(
        uri,
        {
          x: selectedMediaOverlay.x ?? 0.5,
          y: selectedMediaOverlay.y ?? 0.5,
          timeMs: Math.round(currentPositionMs),
        },
        {
          windowStartMs: activeClip.trimStartMs ?? 0,
          windowEndMs: activeClip.trimEndMs ?? activeClip.durationMs,
        }
      );
      const followMask = !!selectedMediaOverlay.mask?.followMotion;
      updateMediaOverlay(selectedMediaOverlay.id, {
        keyframes: result.items.map((p) => ({
          timeMs: p.timeMs,
          x: p.x,
          y: p.y,
          scale: selectedMediaOverlay.scale ?? 1,
          rotation: selectedMediaOverlay.rotation ?? 0,
          opacity: selectedMediaOverlay.opacity ?? 1,
        })),
        x: result.items[0]?.x ?? selectedMediaOverlay.x,
        y: result.items[0]?.y ?? selectedMediaOverlay.y,
        ...(followMask && selectedMediaOverlay.mask
          ? {
              mask: {
                ...selectedMediaOverlay.mask,
                followMotion: true,
                // Keep mask centered on the overlay while the layer follows the subject.
                centerX: 0.5,
                centerY: 0.5,
              },
            }
          : {}),
      });
      Alert.alert(
        followMask ? "Mask following" : "Tracked",
        followMask
          ? "Mask stays locked to the overlay while it tracks the subject."
          : result.message
      );
    } catch (e: any) {
      Alert.alert("Track failed", e?.message ?? "Could not track subject.");
    } finally {
      setMotionTracking(false);
    }
    return;
  }

  Alert.alert(
    "Select a target",
    "Select text, a sticker, or a photo/PiP overlay, place it on the subject, then Track."
  );
};

// ── AI captions ──
// Existing AI captions on the active clip (marked isAiGenerated so they can
// be counted/regenerated/cleared separately from manual text).
const captionOverlays =
  activeClip?.textOverlays?.filter((o) => o.isAiGenerated) ?? [];

const handleClearCaptions = () => {
  if (!activeClip) return;
  captionOverlays.forEach((o) => removeTextOverlay(activeClip.id, o.id));
};

const handleGenerateCaptions = async (
  styleId: CaptionStyleId = "podcast"
): Promise<{ added: number; srt?: string }> => {
  if (!activeClip) throw new Error("Select a clip first.");
  const uri = activeClip.uri || "";
  if (!/^https?:\/\//i.test(uri)) {
    throw new Error(
      "Captions need the uploaded clip. Wait for the upload to finish, then try again."
    );
  }
  const { items, words, srt } = await captionService.generateCaptions(uri);
  if (!items.length && !words.length) {
    throw new Error("No speech detected in this clip.");
  }

  // Regenerating replaces previous AI captions instead of stacking them.
  captionOverlays.forEach((o) => removeTextOverlay(activeClip.id, o.id));

  const drafts = buildCaptionOverlays(
    styleId,
    items,
    words,
    activeClip.durationMs
  );
  if (!drafts.length) throw new Error("No speech detected in this clip.");

  let added = 0;
  for (const d of drafts) {
    const id = addTextOverlay(activeClip.id, d.text, d.startMs, d.durationMs);
    updateTextOverlay(activeClip.id, id, {
      isAiGenerated: true,
      x: d.x,
      y: d.y,
      fontSize: d.fontSize,
      fontWeight: d.fontWeight,
      fontFamily: d.fontFamily,
      color: d.color,
      highlightColor: d.highlightColor,
      karaokeWords: d.karaokeWords,
      backgroundColor: d.backgroundColor,
      backgroundOpacity: d.backgroundOpacity,
      backgroundRadius: d.backgroundRadius,
      animationIn: d.animationIn,
      animationOut: d.animationOut,
      align: d.align,
      speakerId: d.speakerId,
      speakerLabel: d.speakerLabel,
    });
    added++;
  }
  return { added, srt };
};

const handleSyncVoKaraoke = async () => {
  if (!activeClip) throw new Error("Select a photo or video clip first.");
  const vo =
    voiceovers.find((v) => v.id === selectedVoiceoverId) ?? voiceovers[0];
  if (!vo) throw new Error("Record or select a voiceover first.");

  const seg = clipTimelineSegments.find((s) => s.clip.id === activeClip.id);
  if (!seg) throw new Error("Could not place this clip on the timeline.");

  setKaraokeBusy(true);
  try {
    const { drafts } = await buildKaraokeFromVoiceover(
      vo,
      activeClip,
      seg.timelineStartMs
    );
    captionOverlays.forEach((o) => removeTextOverlay(activeClip.id, o.id));
    for (const d of drafts) {
      const id = addTextOverlay(activeClip.id, d.text, d.startMs, d.durationMs);
      updateTextOverlay(activeClip.id, id, {
        isAiGenerated: true,
        x: d.x,
        y: d.y,
        fontSize: d.fontSize,
        fontWeight: d.fontWeight,
        fontFamily: d.fontFamily,
        color: d.color,
        highlightColor: d.highlightColor,
        karaokeWords: d.karaokeWords,
        backgroundColor: d.backgroundColor,
        backgroundOpacity: d.backgroundOpacity,
        backgroundRadius: d.backgroundRadius,
        animationIn: d.animationIn,
        animationOut: d.animationOut,
        align: d.align,
      });
    }
    Alert.alert(
      "Karaoke synced",
      `${drafts.length} bottom caption line${drafts.length === 1 ? "" : "s"} timed to this voiceover.`
    );
  } finally {
    setKaraokeBusy(false);
  }
};

const handleMulticamSyncWithClip = async (camBClipId: string) => {
  if (!activeClip) throw new Error("Select Cam A first.");
  const camB = clips.find((c) => c.id === camBClipId);
  if (!camB) throw new Error("Cam B clip not found.");
  const aUrl = activeClip.uri || "";
  const bUrl = camB.uri || "";
  if (!/^https?:\/\//i.test(aUrl) || !/^https?:\/\//i.test(bUrl)) {
    throw new Error("Both cams need uploaded http URLs before sync.");
  }
  const result = await multicamService.sync(aUrl, bUrl);
  const group = multicamService.buildGroup(activeClip, {
    uri: camB.uri,
    durationMs: camB.durationMs,
    offsetMs: result.offsetMs,
    thumbnailUri: camB.thumbnailUri,
  });
  attachMultiCam(activeClip.id, group);
  return result;
};

const handleMulticamSyncPicked = async (localUri: string) => {
  if (!activeClip) throw new Error("Select Cam A first.");
  const aUrl = activeClip.uri || "";
  if (!/^https?:\/\//i.test(aUrl)) {
    throw new Error("Cam A needs an uploaded URL before sync.");
  }
  const uploaded = await uploadService.uploadVideo(localUri, "cam_b.mp4", "video/mp4");
  const result = await multicamService.sync(aUrl, uploaded.url);
  const durationMs = Math.round((uploaded.durationSeconds ?? 60) * 1000);
  const group = multicamService.buildGroup(activeClip, {
    uri: uploaded.url,
    durationMs,
    offsetMs: result.offsetMs,
  });
  attachMultiCam(activeClip.id, group);
  return result;
};

const handleDirectorCut = (angleId: string) => {
  if (!activeClip) return;
  const seg = clipTimelineSegments.find((s) => s.clip.id === activeClip.id);
  if (!seg) return;
  const localMs =
    (activeClip.trimStartMs ?? 0) + (currentPositionMs - seg.timelineStartMs);
  const ok = cutToMultiCamAngle(activeClip.id, angleId, localMs);
  if (!ok) {
    Alert.alert(
      "Could not cut",
      "That angle window is too short here — nudge the playhead and try again."
    );
  }
};

const handleAnalyzeReframe = async () => {
  if (!activeClip) throw new Error("Select a clip first.");
  const uri = activeClip.uri || "";
  if (!/^https?:\/\//i.test(uri)) {
    throw new Error("Auto-reframe needs an uploaded clip URL.");
  }
  const result = await reframeService.analyze(uri, {
    windowStartMs: activeClip.trimStartMs ?? 0,
    windowEndMs: activeClip.trimEndMs ?? activeClip.durationMs,
  });
  if (!result.items?.length) throw new Error("Could not track a subject.");
  updateClipAutoReframe(activeClip.id, reframeService.fromAnalysis(result));
  return { count: result.items.length, message: result.message };
};

const handleRemoveSilence = async (choices: {
  removeSilence: boolean;
  removeFillers: boolean;
  minSilenceMs: number;
}) => {
  if (!activeClip) throw new Error("Select a clip first.");
  const uri = activeClip.uri || "";
  if (!/^https?:\/\//i.test(uri)) {
    throw new Error(
      "Rough cut needs the uploaded clip. Wait for upload, then try again."
    );
  }
  const trimStart = activeClip.trimStartMs ?? 0;
  const trimEnd = activeClip.trimEndMs ?? activeClip.durationMs;
  const result = await silenceService.roughCut(uri, {
    windowStartMs: trimStart,
    windowEndMs: trimEnd,
    minSilenceMs: choices.minSilenceMs,
    removeSilence: choices.removeSilence,
    removeFillers: choices.removeFillers,
  });
  if (!result.items?.length) {
    throw new Error("Nothing to cut with these options — try different toggles.");
  }
  if (result.removedMs < 120) {
    throw new Error("Almost nothing removed — try a lower silence threshold or enable fillers.");
  }
  const pieces = applyKeepRanges(activeClip.id, result.items);
  if (pieces < 1) throw new Error("Could not apply rough cut.");
  return {
    pieces,
    removedMs: result.removedMs,
    silenceCount: result.silenceCount,
    fillerCount: result.fillerCount,
  };
};

const handleDetectBeats = async (): Promise<number> => {
  if (!activeClip) throw new Error("Select a clip first.");
  const uri = activeClip.uri || "";
  if (!/^https?:\/\//i.test(uri)) {
    throw new Error(
      "Beat detection needs the uploaded clip. Wait for upload, then try again."
    );
  }
  try {
    setDetectingBeats(true);
    const trimStart = activeClip.trimStartMs ?? 0;
    const trimEnd = activeClip.trimEndMs ?? activeClip.durationMs;
    const times = await beatDetectService.detect(uri, {
      windowStartMs: trimStart,
      windowEndMs: trimEnd,
    });
    if (!times.length) throw new Error("No beats detected — try a clip with clearer rhythm.");
    const added = mergeBeatMarkers(times);
    return added > 0 ? added : times.length;
  } finally {
    setDetectingBeats(false);
  }
};

const handleGenerateShorts = async (): Promise<ShortSuggestion[]> => {
  if (!activeClip) throw new Error("Select a clip first.");
  const uri = activeClip.uri || "";
  if (!/^https?:\/\//i.test(uri)) {
    throw new Error(
      "Shorts need the uploaded clip. Wait for upload, then try again."
    );
  }
  const items = await shortsService.suggest(uri);
  if (!items.length) throw new Error("No short-worthy moments found.");
  return items;
};

const handleAddShort = (suggestion: ShortSuggestion) => {
  if (!activeClip) return;
  const id = insertClipRange(activeClip.id, suggestion.startMs, suggestion.endMs);
  if (!id) {
    Alert.alert("Could not add short", "That range is too short or invalid.");
  }
};

const handleApplyBrandKit = async (kit: BrandKit) => {
  if (!activeClip) throw new Error("Select a clip first.");
  const suggestions = brandKitService.applyOverlays(kit);
  const grade = brandKitService.applyColorGrade(kit);
  const trimStart = activeClip.trimStartMs ?? 0;
  const trimEnd = activeClip.trimEndMs ?? activeClip.durationMs;
  const span = Math.max(1000, trimEnd - trimStart);

  for (const s of suggestions) {
    if (s.role === "caption") {
      (activeClip.textOverlays ?? [])
        .filter((o) => o.isAiGenerated)
        .forEach((o) =>
          updateTextOverlay(activeClip.id, o.id, {
            color: s.color,
            backgroundColor: s.backgroundColor,
            backgroundOpacity: s.backgroundOpacity,
            fontSize: s.fontSize,
            fontFamily: s.fontFamily,
            y: s.y,
          })
        );
      continue;
    }
    if (!s.text.trim()) continue;
    const startMs =
      s.role === "intro" ? trimStart : Math.max(trimStart, trimEnd - 3500);
    const durationMs = s.role === "intro" ? Math.min(3500, span) : Math.min(3500, span);
    const id = addTextOverlay(activeClip.id, s.text, startMs, durationMs);
    updateTextOverlay(activeClip.id, id, {
      color: s.color,
      backgroundColor: s.backgroundColor,
      backgroundOpacity: s.backgroundOpacity,
      fontSize: s.fontSize,
      fontFamily: s.fontFamily,
      y: s.y,
      x: 0.5,
      fontWeight: "bold",
      align: "center",
      animationIn: "fade",
    });
  }

  const existing = activeClip.colorGrade ?? DEFAULT_COLOR_GRADE;
  updateClipColorGrade(activeClip.id, {
    contrast: Math.min(1, Math.max(-1, existing.contrast + grade.contrastBoost)),
    saturation: Math.min(1, Math.max(-1, existing.saturation + grade.tintStrength * 0.5)),
    temperature: Math.min(
      1,
      Math.max(-1, existing.temperature + (kit.primaryColor.toLowerCase().includes("f5") ? 0.12 : 0))
    ),
  });
  setProjectBrandKit({
    primaryColor: kit.primaryColor,
    accentColor: kit.accentColor,
    fontFamily: kit.fontFamily,
    updatedAt: new Date().toISOString(),
  });
};

/** Split the active clip at every beat marker that falls inside it. */
const handleAutoBeatCut = (): number => {
  if (!activeClip) {
    Alert.alert("Select a clip", "Pick a clip, then Auto beat-cut.");
    return 0;
  }
  const seg = clipTimelineSegments.find((s) => s.clip.id === activeClip.id);
  if (!seg) return 0;
  const trimStart = activeClip.trimStartMs ?? 0;
  const locals = beatMarkersMs
    .filter(
      (t) => t > seg.timelineStartMs + 200 && t < seg.timelineEndMs - 200
    )
    .map((t) => trimStart + (t - seg.timelineStartMs))
    .sort((a, b) => b - a);
  if (!locals.length) {
    Alert.alert(
      "No markers in clip",
      "Detect or drop beat markers on this clip first."
    );
    return 0;
  }
  for (const localMs of locals) {
    splitClip(activeClip.id, localMs);
  }
  Alert.alert(
    "Beat-cut",
    `Split into ${locals.length + 1} pieces on the beat.`
  );
  return locals.length;
};




  if (!project || clips.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons
            name="film-outline"
            size={scale(40)}
            color={COLORS.textMuted}
          />
          <Text style={styles.emptyStateText}>No clips yet</Text>
          <TouchableOpacity
            onPress={promptAddVideos}
            disabled={addVideosBusy}
          >
            <Text style={{ color: COLORS.yellow, marginTop: verticalScale(8) }}>
              {addVideosBusy ? 'Adding…' : 'Add videos to mix'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />

      {/* Header — CapCut-style: back · Edit · collab */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          hitSlop={8}
        >
          <Ionicons
            name="chevron-back"
            size={scale(24)}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.videoTitle}>Edit</Text>
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: scale(10) }}
        >
          {/* When teammates are online, show their avatars; otherwise a
              hamburger. Both open the real-time collaboration/message panel. */}
          <TouchableOpacity
            style={styles.collabTrigger}
            onPress={openCollabPanel}
            hitSlop={8}
          >
            {onlineOthers.length > 0 ? (
              <View style={styles.avatarStack}>
                {onlineOthers.slice(0, 3).map((m, i) => (
                  <View
                    key={m.id}
                    style={[
                      styles.stackedAvatar,
                      {
                        backgroundColor: m.color,
                        marginLeft: i === 0 ? 0 : -scale(10),
                        overflow: "hidden",
                      },
                    ]}
                  >
                    {m.avatarUrl ? (
                      <Image
                        source={{ uri: m.avatarUrl }}
                        style={{ width: "100%", height: "100%" }}
                      />
                    ) : (
                      <Text style={styles.stackedAvatarText}>{m.initials}</Text>
                    )}
                  </View>
                ))}
                {/* Green presence pulse on the last avatar */}
                <View style={styles.onlinePulse} />
              </View>
            ) : (
              <Ionicons name="menu" size={scale(24)} color={COLORS.textPrimary} />
            )}

            {/* Unread message badge */}
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <CollaborationSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        projectId={projectId ?? ""}
        clipId={activeClip?.id}
      />

      {isViewer ? (
        <View style={styles.viewerBanner}>
          <Ionicons name="eye-outline" size={scale(14)} color={COLORS.yellow} />
          <Text style={styles.viewerBannerText} numberOfLines={1}>
            Viewer · tools are locked
          </Text>
          <TouchableOpacity
            onPress={() => void requestEditorAccess()}
            disabled={roleRequestBusy}
            hitSlop={8}
          >
            <Text style={styles.viewerBannerCta}>
              {roleRequestBusy ? 'Sending…' : 'Request Editor'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {editToast ? (
        <View style={styles.editToast} pointerEvents="none">
          <Ionicons name="people" size={scale(14)} color={COLORS.yellow} />
          <Text style={styles.editToastText} numberOfLines={1}>
            <Text style={styles.editToastName}>{editToast.actorName}</Text>
            {" "}
            {editToast.summary}
          </Text>
        </View>
      ) : null}

      {/* Video Preview — Canva blank canvas + free layout */}
      <View style={styles.previewWrapper}>
        <View 
          onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
      setPreviewSize({ width, height });
     }}
        style={[
          styles.previewContainer,
          {
            backgroundColor:
              currentVideoProject?.canvasColor ?? COLORS.background,
          },
        ]}
        >
          {activeClip?.kind === 'title' ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor:
                    activeClip.titleCard?.backgroundColor ?? '#000000',
                },
              ]}
            />
          ) : activeClip?.kind === 'flyer' ? (
            <Image
              source={{ uri: activeClip.uri }}
              style={[StyleSheet.absoluteFill, { opacity: liveOpacity }]}
              resizeMode="contain"
            />
          ) : activeClip ? (
            (() => {
              canvasLayoutRef.current = {
                clipId: activeClip.id,
                layoutX: activeClip.layoutX ?? 0.5,
                layoutY: activeClip.layoutY ?? 0.5,
                width: previewSize.width,
                height: previewSize.height,
              };
              const lx = activeClip.layoutX ?? 0.5;
              const ly = activeClip.layoutY ?? 0.5;
              const ls = activeClip.layoutScale ?? 1;
              const sx =
                (activeClip.flipH ? -1 : 1) *
                ls *
                liveRotateCover *
                (activeClip.autoReframe?.enabled ? 1.22 : 1);
              const sy =
                (activeClip.flipV ? -1 : 1) *
                ls *
                liveRotateCover *
                (activeClip.autoReframe?.enabled ? 1.22 : 1);
              const tx =
                (lx - 0.5) * previewSize.width +
                (activeClip.autoReframe?.enabled
                  ? (0.5 -
                      reframeService.sampleX(
                        activeClip.autoReframe,
                        currentTime * 1000
                      )) *
                    previewSize.width *
                    0.55
                  : 0);
              const ty = (ly - 0.5) * previewSize.height;
              const dragOn = activeToolLabel === 'Canvas';
              // Live motion FX ≈ ExportWorker lookFilters timing.
              const fxId = activeClip.effectId ?? 'none';
              const fxI = activeClip.effectIntensity ?? 0.55;
              const tSec = currentTime;
              let fxTx = 0;
              let fxTy = 0;
              let fxScale = 1;
              let fxRot = 0;
              if (fxId === 'shake') {
                // Export: sin(t*6)*deg — preview uses similar energy.
                fxTx = Math.sin(tSec * 22) * fxI * 12;
                fxTy = Math.cos(tSec * 27) * fxI * 9;
                fxRot = Math.sin(tSec * 18) * fxI * 2.2;
              } else if (fxId === 'zoomPunch') {
                const pulse = Math.max(0, Math.sin(tSec * 7.2));
                fxScale = 1 + fxI * 0.22 * pulse * pulse;
              } else if (fxId === 'zoomIn') {
                fxScale = 1 + fxI * 0.28 * Math.min(1, tSec / 3.5);
              } else if (fxId === 'zoomOut') {
                fxScale = 1 + fxI * 0.28 * (1 - Math.min(1, tSec / 3.5));
              } else if (fxId === 'panLeft') {
                fxTx = -fxI * previewSize.width * 0.16 * Math.min(1, tSec / 4);
              } else if (fxId === 'panRight') {
                fxTx = fxI * previewSize.width * 0.16 * Math.min(1, tSec / 4);
              } else if (fxId === 'bounce') {
                fxTy = Math.abs(Math.sin(tSec * 9)) * fxI * -22;
              } else if (fxId === 'spin') {
                fxRot = Math.sin(tSec * 5) * fxI * 12;
              }
              return (
                <View
                  style={StyleSheet.absoluteFill}
                  {...(dragOn ? canvasPan.panHandlers : {})}
                >
                  <VideoView
                    style={[
                      styles.videoView,
                      { opacity: liveOpacity },
                      {
                        transform: [
                          { translateX: tx + fxTx },
                          { translateY: ty + fxTy },
                          { rotate: `${liveRotation + fxRot}deg` },
                          { scaleX: sx * fxScale },
                          { scaleY: sy * fxScale },
                        ],
                      },
                    ]}
                    player={player}
                    contentFit="cover"
                    nativeControls={false}
                  />
                  {dragOn && (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        left: lx * previewSize.width - scale(14),
                        top: ly * previewSize.height - scale(14),
                        width: scale(28),
                        height: scale(28),
                        borderRadius: scale(14),
                        backgroundColor: 'rgba(245,197,24,0.85)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 20,
                      }}
                    >
                      <Ionicons name="move" size={scale(16)} color="#0B0D13" />
                    </View>
                  )}
                  {activeClip.bgRemove?.enabled && (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: scale(10),
                        left: scale(10),
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        paddingHorizontal: scale(8),
                        paddingVertical: verticalScale(3),
                        borderRadius: scale(8),
                        zIndex: 20,
                      }}
                    >
                      <Text
                        style={{
                          color: COLORS.yellow,
                          fontSize: moderateScale(9),
                          fontWeight: '800',
                        }}
                      >
                        BG REMOVE
                      </Text>
                    </View>
                  )}
                </View>
              );
            })()
          ) : (
            <View style={[styles.videoView, styles.videoPlaceholder]}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
                }}
                style={styles.placeholderImg}
                resizeMode="cover"
              />
              <View style={styles.tealScrim} />
            </View>
          )}

          {activeClip && activeClip.kind !== 'title' && (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: getFilterById(activeClip.filterId).tintColor,
                  opacity: getFilterById(activeClip.filterId).tintOpacity,
                },
              ]}
            />
          )}

          {activeClip &&
            (() => {
              const look = {
                ...DEFAULT_LOOK_OVERLAY,
                ...activeClip.lookOverlay,
              };
              const dark = look.darkOpacity ?? 0;
              const gop = look.gradientOpacity ?? 0;
              if (dark <= 0.01 && gop <= 0.01) return null;
              const top = look.gradientColorTop ?? '#000000';
              const bot = look.gradientColorBottom ?? '#F5C518';
              const horizontal = (look.gradientAngle ?? 0) >= 45;
              return (
                <>
                  {dark > 0.01 && (
                    <View
                      pointerEvents="none"
                      style={[
                        StyleSheet.absoluteFillObject,
                        { backgroundColor: '#000000', opacity: dark },
                      ]}
                    />
                  )}
                  {gop > 0.01 && (
                    <LinearGradient
                      pointerEvents="none"
                      colors={[top, bot]}
                      start={horizontal ? { x: 0, y: 0.5 } : { x: 0.5, y: 0 }}
                      end={horizontal ? { x: 1, y: 0.5 } : { x: 0.5, y: 1 }}
                      style={[
                        StyleSheet.absoluteFillObject,
                        { opacity: gop * 0.85 },
                      ]}
                    />
                  )}
                </>
              );
            })()}

          {/* Color grade — soft overlays approximating eq / temperature (live keyframes) */}
          {activeClip &&
            (activeClip.kind === 'video' ||
              activeClip.kind === 'flyer' ||
              !activeClip.kind) && (
            <>
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor:
                      (liveGrade.brightness ?? 0) >= 0
                        ? "#FFFFFF"
                        : "#000000",
                    opacity: Math.min(
                      0.35,
                      Math.abs(liveGrade.brightness ?? 0) * 0.35,
                    ),
                  },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor:
                      (liveGrade.temperature ?? 0) >= 0
                        ? "#FF9A3C"
                        : "#3C7CFF",
                    opacity: Math.min(
                      0.22,
                      Math.abs(liveGrade.temperature ?? 0) * 0.22,
                    ),
                  },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor: "#000000",
                    opacity: Math.min(
                      0.25,
                      Math.max(0, -(liveGrade.saturation ?? 0)) * 0.25,
                    ),
                  },
                ]}
              />
            </>
          )}

          {/* Effects preview — blur / vignette (shake & zoom are subtle) */}
          {activeClip?.effectId === "blur" && (
            <BlurView
              intensity={Math.round((activeClip.effectIntensity ?? 0.55) * 55)}
              tint="dark"
              style={[StyleSheet.absoluteFillObject, { zIndex: 2 }]}
              pointerEvents="none"
            />
          )}
          {activeClip?.effectId === "vignette" && (
            <>
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "18%",
                  backgroundColor: `rgba(0,0,0,${0.35 + (activeClip.effectIntensity ?? 0.55) * 0.45})`,
                  zIndex: 2,
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "18%",
                  backgroundColor: `rgba(0,0,0,${0.35 + (activeClip.effectIntensity ?? 0.55) * 0.45})`,
                  zIndex: 2,
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: "10%",
                  backgroundColor: `rgba(0,0,0,${0.25 + (activeClip.effectIntensity ?? 0.55) * 0.35})`,
                  zIndex: 2,
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  right: 0,
                  width: "10%",
                  backgroundColor: `rgba(0,0,0,${0.25 + (activeClip.effectIntensity ?? 0.55) * 0.35})`,
                  zIndex: 2,
                }}
              />
            </>
          )}
          {activeClip?.effectId === "lightning" && (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  zIndex: 3,
                  backgroundColor: "#F8FAFC",
                  // Match ExportWorker: brief flash every ~1.6s (mod(t*10,16) < 1)
                  opacity:
                    (currentTime * 10) % 16 < 1
                      ? 0.28 + (activeClip.effectIntensity ?? 0.7) * 0.55
                      : 0,
                },
              ]}
            />
          )}
          {activeClip?.effectId === "filmGrain" && (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  zIndex: 2,
                  backgroundColor: `rgba(190,180,150,${0.06 + (activeClip.effectIntensity ?? 0.55) * 0.2})`,
                  opacity: 0.45 + Math.sin(currentTime * 24) * 0.2,
                },
              ]}
            />
          )}
          {activeClip?.effectId === "dust" && (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, { zIndex: 2 }]}
            >
              {[0.12, 0.28, 0.45, 0.61, 0.74, 0.88].map((x, i) => {
                const y =
                  ((0.15 + i * 0.13 + currentTime * (0.04 + i * 0.01)) % 1);
                return (
                  <View
                    key={`dust-${i}`}
                    style={{
                      position: "absolute",
                      left: `${x * 100}%`,
                      top: `${y * 100}%`,
                      width: scale(2 + (i % 3)),
                      height: scale(2 + (i % 3)),
                      borderRadius: scale(2),
                      backgroundColor: `rgba(255,245,220,${0.25 + (activeClip.effectIntensity ?? 0.45) * 0.4})`,
                    }}
                  />
                );
              })}
            </View>
          )}

          {/* Transition effect — type-aware flash / whip / zoom when crossing clip boundary */}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: transitionFlashColor,
                opacity: transitionFade,
                transform: [
                  { translateX: transitionSlide },
                  { scale: transitionScale },
                ],
                zIndex: 15,
              },
            ]}
          />

   
      
      {activeVisibleOverlays.map((o) => (
      <DraggableOverlay
        key={o.id}
        overlay={o}
        previewSize={previewSize}
        localTimeMs={currentTime * 1000}
        isEditing={activeToolLabel === "Text" && selectedOverlayId === o.id}
        onTap={() => handleToolPress("Text", o.id)}
        onDragEnd={(x, y) => {
          if (activeClip) updateTextOverlay(activeClip.id, o.id, { x, y });
        }}
        onChangeText={(text) => {
          if (activeClip) updateTextOverlay(activeClip.id, o.id, { text });
        }}
      />
      ))}

      {/* Media overlays — PiP video, images/GIFs, emoji stickers (multi-track) */}
      {activeMediaOverlays.map((o) => (
        <DraggableMediaOverlay
          key={o.id}
          overlay={o}
          previewSize={previewSize}
          timelineMs={currentPositionMs}
          isSelected={o.id === selectedMediaOverlayId}
          pipPlayer={o.type === "video" && o.id === pipOverlay?.id ? pipPlayer : null}
          onTap={() => {
            setSelectedMediaOverlayId(o.id);
            setActiveToolLabel("Overlay");
          }}
          onDragEnd={(x, y) => updateMediaOverlay(o.id, { x, y })}
        />
      ))}

      {/* Canva-style comment pins */}
      {canvasPins.map((c) => (
        <TouchableOpacity
          key={c.id}
          style={{
            position: 'absolute',
            left: (c.canvasX ?? 0.5) * previewSize.width - scale(12),
            top: (c.canvasY ?? 0.5) * previewSize.height - scale(12),
            width: scale(24),
            height: scale(24),
            borderRadius: scale(12),
            backgroundColor: '#FFFFFF',
            borderWidth: 2,
            borderColor: selectedCommentId === c.id ? COLORS.yellow : '#4DA6FF',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30,
          }}
          onPress={() => {
            setSelectedCommentId(c.id);
            Alert.alert(
              c.author,
              `${c.text}${c.timecodeLabel ? `\n\n@ ${c.timecodeLabel}` : ''}`,
              [
                { text: 'OK', style: 'cancel' },
                {
                  text: 'Open desk',
                  onPress: () => setSidebarVisible(true),
                },
              ]
            );
          }}
        >
          <Text style={{ fontSize: moderateScale(9), fontWeight: '800', color: '#0B0D13' }}>
            {c.initials.slice(0, 1)}
          </Text>
        </TouchableOpacity>
      ))}

      {commentPinMode && !commentComposer && (
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, { zIndex: 28 }]}
          activeOpacity={1}
          onPress={(e) => {
            const { locationX, locationY } = e.nativeEvent;
            if (!previewSize.width || !previewSize.height) return;
            openCommentAt(
              locationX / previewSize.width,
              locationY / previewSize.height
            );
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: scale(12),
              alignSelf: 'center',
              left: 0,
              right: 0,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                paddingHorizontal: scale(12),
                paddingVertical: verticalScale(6),
                borderRadius: scale(20),
              }}
            >
              <Text
                style={{
                  color: '#FFF',
                  fontSize: moderateScale(11),
                  fontWeight: '600',
                }}
              >
                Tap anywhere to leave a comment
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      <CommentComposerBubble
        visible={!!commentComposer}
        user={user}
        members={projectMembers}
        timecodeLabel={formatTime(currentPositionMs)}
        pinX={commentComposer?.x ?? 0.5}
        pinY={commentComposer?.y ?? 0.4}
        previewWidth={previewSize.width || 1}
        previewHeight={previewSize.height || 1}
        submitting={commentSubmitting}
        onCancel={() => {
          setCommentComposer(null);
          setCommentPinMode(false);
        }}
        onSubmit={handleCommentSubmit}
      />

          <View style={styles.videoTopBar}>
            <TouchableOpacity
              style={[
                styles.previewChromeBtn,
                commentPinMode && styles.previewChromeBtnAccent,
              ]}
              onPress={() => {
                setCommentPinMode((v) => {
                  const next = !v;
                  if (!next) setCommentComposer(null);
                  return next;
                });
              }}
              hitSlop={8}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={scale(18)}
                color={commentPinMode ? COLORS.yellow : COLORS.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.previewChromeBtn}
              onPress={goToReviewExport}
              hitSlop={8}
            >
              <Ionicons name="share-outline" size={scale(18)} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.previewChromeBtn,
                styles.previewChromeBtnAccent,
                wowActive &&
                  wowStep === 'export' &&
                  styles.previewExportWow,
              ]}
              onPress={goToReviewExport}
              hitSlop={8}
            >
              {wowActive && wowStep === 'export' ? (
                <Text style={styles.previewExportWowText}>Export</Text>
              ) : (
                <Ionicons
                  name="checkmark"
                  size={scale(20)}
                  color={COLORS.yellow}
                />
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.timestampOverlay}>
            <Text style={styles.timestampText}>
              {formatTime(currentPositionMs)}{" "}
              <Text style={styles.timestampMuted}>
                {formatTime(totalDurationMs)}
              </Text>
            </Text>
          </View>
          <View style={styles.videoControlRow}>
            <TouchableOpacity
              style={styles.videoControlIcon}
              hitSlop={8}
              disabled={!canUndo}
              onPress={undo}
            >
              <Ionicons
                name="arrow-undo"
                size={scale(20)}
                color={canUndo ? COLORS.textPrimary : COLORS.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.playButton}
              onPress={togglePlayback}
              hitSlop={8}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={scale(20)}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.videoControlIcon}
              hitSlop={8}
              disabled={!canRedo}
              onPress={redo}
            >
              <Ionicons
                name="arrow-redo"
                size={scale(20)}
                color={canRedo ? COLORS.textPrimary : COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {/* Expand → immersive fullscreen preview */}
          <TouchableOpacity
            style={[styles.videoControlIcon, { position: "absolute", right: scale(12), bottom: verticalScale(12) }]}
            hitSlop={8}
            onPress={() => {
              try {
                player.pause();
                musicPlayer.pause();
              } catch {
                /* ignore */
              }
              navigation.navigate("editorpreview", {
                positionMs: Math.round(currentPositionMs),
              });
            }}
          >
            <Ionicons
              name="scan-outline"
              size={scale(20)}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Multi-track Timeline — vertical scroll so VO/music aren't crushed */}
      <View style={styles.timelineContainer}>
        {/* Playhead Vertical Line */}
        <View style={styles.playheadLine} pointerEvents="none" />

        <ScrollView
          ref={timelineScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          onScrollBeginDrag={() => {
            isScrubbingRef.current = true;
          }}
          onScrollEndDrag={() => {
            isScrubbingRef.current = false;
          }}
          onMomentumScrollEnd={() => {
            isScrubbingRef.current = false;
          }}
          onScroll={handleTimelineScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_WIDTH * 0.35,
            paddingBottom: verticalScale(8),
          }}
        >
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.timelineTracksScroll}
            contentContainerStyle={styles.timelineTracksContent}
            bounces={false}
          >
          <View>
            {/* 1. Ruler Track */}
            <View
              style={[
                styles.rulerContainer,
                { width: totalSeconds * PX_PER_SECOND, marginHorizontal: 0 },
              ]}
            >
              <View style={styles.rulerLine} />
              {rulerMarks.map((s) => (
                <View
                  key={s}
                  style={[
                    styles.rulerMarkContainer,
                    { left: s * PX_PER_SECOND },
                  ]}
                >
                  <View style={styles.rulerTick} />
                  <Text style={styles.rulerMarkText}>{s}s</Text>
                </View>
              ))}
              {/* Beat markers on the ruler */}
              {beatMarkersMs.map((ms) => (
                <View
                  key={`beat-${ms}`}
                  style={[
                    styles.beatMarker,
                    { left: (ms / 1000) * PX_PER_SECOND - 1 },
                  ]}
                />
              ))}
            </View>

            {/* 2. Text Overlays Track */}
            <View
              style={{
                height: verticalScale(34),
                position: "relative",
                width: totalSeconds * PX_PER_SECOND,
                marginBottom: verticalScale(6),
              }}
            >
              {visibleOverlays.length === 0 && (
                <TouchableOpacity
                  style={[styles.aiTextChip, { position: "absolute", left: 0 }]}
                >
                  <View style={styles.aiSparkleIcon}>
                    <Ionicons
                      name="sparkles"
                      size={scale(10)}
                      color="#e9f799"
                    />
                  </View>
                  <Ionicons
                    name="text"
                    size={scale(12)}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.aiTextChipText}>Add text</Text>
                </TouchableOpacity>
              )}
              
            </View>

            {/* 3. Video Clips Track */}
            <View style={[styles.trackRow, { position: "relative" }]}>
              {/* Add videos to mix — multi-pick appends on this timeline */}
              <TouchableOpacity
                style={[
                  styles.addClipTrackBtn,
                  {
                    position: "absolute",
                    left: -scale(34),
                    top: verticalScale(10),
                    opacity: addVideosBusy ? 0.5 : 1,
                  },
                ]}
                disabled={addVideosBusy}
                onPress={promptAddVideos}
              >
                <Ionicons name="add" size={scale(16)} color="#FFFFFF" />
              </TouchableOpacity>

              {clips.map((clip, index) => {
                const isClipActive = activeClip && clip.id === activeClip.id;
                const frames = clipThumbnails[clip.id] ?? [];
                return (
                  <React.Fragment key={clip.id}>
                    <ClipTrimmer
                      clip={clip}
                      thumbnails={frames}
                      isActive={isClipActive}
                      onPress={() => setSelectedClipId(clip.id)}
                      onTrimEnd={handleTrimEnd}
                    />
                    {index < clips.length - 1 && (
                      <TouchableOpacity
                        style={[
                          styles.transitionBtn,
                          clip.transitionOut &&
                            clip.transitionOut.type !== "none" &&
                            styles.transitionBtnActive,
                        ]}
                        onPress={() => setTransitionClipId(clip.id)}
                        hitSlop={6}
                      >
                        <View style={styles.transitionInnerIcon} />
                      </TouchableOpacity>
                    )}
                  </React.Fragment>
                );
              })}
            </View>

            {/* 4. Audio Waveform Track */}
            <View
              style={[
                styles.waveformContainer,
                {
                  marginTop: verticalScale(8),
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.04)",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.08)",
                },
              ]}
            >
              <View
                style={[
                  styles.waveformTrack,
                  { width: totalSeconds * PX_PER_SECOND },
                ]}
              >
                {Array.from({ length: totalSeconds * 4 }).map((_, i) => {
                  const heightFactor =
                    Math.abs(Math.sin(i * 0.15)) * 0.7 +
                    Math.abs(Math.cos(i * 0.4)) * 0.3;
                  const height = 4 + heightFactor * verticalScale(24);
                  return (
                    <View
                      key={i}
                      style={[
                        styles.waveformBar,
                        {
                          height,
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.45)"
                            : "rgba(15,23,42,0.45)",
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </View>

            {/* 5. Media Overlay Track — PiP video, stickers, GIFs */}
            {mediaOverlays.length > 0 && (
              <View
                style={{
                  height: verticalScale(22),
                  position: "relative",
                  width: totalSeconds * PX_PER_SECOND,
                  marginTop: verticalScale(6),
                }}
              >
                {mediaOverlays.map((o) => {
                  const left = (o.startMs / 1000) * PX_PER_SECOND;
                  const width = Math.max(
                    scale(24),
                    (o.durationMs / 1000) * PX_PER_SECOND,
                  );
                  const isSel = o.id === selectedMediaOverlayId;
                  return (
                    <TouchableOpacity
                      key={o.id}
                      style={[
                        styles.overlayTrackBlock,
                        { left, width },
                        isSel && styles.overlayTrackBlockSelected,
                      ]}
                      onPress={() => {
                        setSelectedMediaOverlayId(o.id);
                        setActiveToolLabel("Overlay");
                      }}
                    >
                      <Text style={styles.overlayTrackLabel} numberOfLines={1}>
                        {o.type === "emoji" ? o.uri : o.type === "video" ? "PiP" : "IMG"}
                      </Text>
                      {/* Keyframe diamonds at their timeline positions */}
                      {(o.keyframes ?? []).map((kf, i) => (
                        <View
                          key={i}
                          style={[
                            styles.overlayKeyframeDot,
                            {
                              left: Math.max(
                                2,
                                ((kf.timeMs - o.startMs) / 1000) * PX_PER_SECOND - scale(3),
                              ),
                            },
                          ]}
                        />
                      ))}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* 6. Voiceover track — mic narration takes */}
            {voiceovers.length > 0 && (
              <View
                style={{
                  height: verticalScale(22),
                  position: "relative",
                  width: totalSeconds * PX_PER_SECOND,
                  marginTop: verticalScale(6),
                }}
              >
                {voiceovers.map((v, i) => {
                  const left = (v.startMs / 1000) * PX_PER_SECOND;
                  const width = Math.max(
                    scale(28),
                    (v.durationMs / 1000) * PX_PER_SECOND,
                  );
                  const isSel = v.id === selectedVoiceoverId;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        styles.voiceoverTrackBlock,
                        { left, width },
                        isSel && styles.voiceoverTrackBlockSelected,
                      ]}
                      onPress={() => {
                        setSelectedVoiceoverId(v.id);
                        setActiveToolLabel("Voiceover");
                      }}
                    >
                      <Ionicons
                        name="mic"
                        size={scale(10)}
                        color={isSel ? COLORS.background : "#A78BFA"}
                      />
                      <Text style={styles.voiceoverTrackLabel} numberOfLines={1}>
                        VO {i + 1}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* 7. Music tracks */}
            {musicTracks.length > 0 && (
              <View
                style={{
                  height: verticalScale(22),
                  position: "relative",
                  width: totalSeconds * PX_PER_SECOND,
                  marginTop: verticalScale(6),
                }}
              >
                {musicTracks.map((t, i) => {
                  const id = t.id ?? `legacy-${i}`;
                  const left = ((t.startMs ?? 0) / 1000) * PX_PER_SECOND;
                  const width = Math.max(
                    scale(28),
                    (musicAudibleMs(t) / 1000) * PX_PER_SECOND,
                  );
                  const isSel = id === selectedMusicTrackId;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.musicTrackBlock,
                        { left, width },
                        isSel && styles.musicTrackBlockSelected,
                      ]}
                      onPress={() => {
                        setSelectedMusicTrackId(id);
                        setActiveToolLabel("Music");
                      }}
                    >
                      <Ionicons
                        name="musical-notes"
                        size={scale(10)}
                        color={isSel ? COLORS.background : "#34D399"}
                      />
                      <Text style={styles.musicTrackLabel} numberOfLines={1}>
                        {t.title ?? `Music ${i + 1}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Teammates' live cursors — colored playheads with name tags */}
            {remoteCursors.map((c) => (
              <View
                key={c.actorId}
                style={[
                  styles.remoteCursor,
                  { left: (c.positionMs / 1000) * PX_PER_SECOND },
                ]}
                pointerEvents="none"
              >
                <View style={[styles.remoteCursorTag, { backgroundColor: c.color }]}>
                  <Text style={styles.remoteCursorTagText} numberOfLines={1}>
                    {(c.name || c.initials || "?").split(" ")[0]}
                    {c.tool ? ` · ${c.tool}` : ""}
                  </Text>
                </View>
                <View style={[styles.remoteCursorLine, { backgroundColor: c.color }]} />
              </View>
            ))}
          </View>
          </ScrollView>
        </ScrollView>
      </View>

      {/* Bottom Toolbar — stays visible; tool sheets overlay above it */}
      {wowActive ? (
        <WowCoachBar
          step={wowStep}
          onExport={goToReviewExport}
          onNext={() => setWowStep('export')}
          onSkip={async () => {
            const { markWowPathDone } = await import('../services/wowPathService');
            await markWowPathDone();
            setWowActive(false);
          }}
        />
      ) : null}
      <BottomToolbar
        onSplit={handleSplit}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onToolPress={handleToolPress}
        onOpenSearch={() => setToolSearchOpen(true)}
        readOnly={isViewer || !canEdit}
        onReadOnlyPress={promptViewerGate}
      />
      <ToolSearchModal
        visible={toolSearchOpen}
        onClose={() => setToolSearchOpen(false)}
        onPick={(tool) => {
          if (isViewer || !canEdit) {
            setToolSearchOpen(false);
            promptViewerGate();
            return;
          }
          handleToolPickFromSearch(tool);
        }}
      />

 {/* Tool sheets overlay the bottom of the editor so they don't stack under the toolbar */}
 {activeToolLabel != null ? (
 <View style={styles.toolSheetHost} pointerEvents="box-none">
    {activeToolLabel === 'Filter' ? (
  <FilterToolPanel
          visible={true}
          filters={FILTER_LIST}
          selectedFilterId={activeClip?.filterId}
          onSelectFilter={(filterId) =>
            activeClip && updateClipFilter(activeClip.id, filterId)
          }
          onClose={closeToolPanel}
          clipUri={activeClip?.uri ?? ""}
        />
) : activeToolLabel === 'Crop' ? (
   <CropRatioPanel
    visible={true}
    presets={CROP_RATIO_PRESETS}
    selectedRatioId={activeClip?.cropRatioId}
    onSelectRatio={handleSelectCropRatio}
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Music' ? (
  <MusicToolPanel
    visible={true}
    tracks={musicTracks}
    selectedTrackId={selectedMusicTrackId}
    playheadMs={currentPositionMs}
    onSelectTrack={setSelectedMusicTrackId}
    onAddTrack={(uri, durationMs, startMs, title) => {
      const id = addMusicTrack(uri, durationMs, startMs, title);
      setSelectedMusicTrackId(id);
    }}
    onUpdateTrack={(trackId, changes) => updateMusicTrack(trackId, changes)}
    onRemoveTrack={(trackId) => {
      removeMusicTrack(trackId);
      setSelectedMusicTrackId(null);
    }}
    onAddFootage={(url, durationMs, title) => {
      const id = appendRemoteClip({ uri: url, durationMs, title });
      if (id) setSelectedClipId(id);
    }}
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Stock' ? (
  <StockToolPanel
    visible={true}
    playheadMs={currentPositionMs}
    onAddAudio={(uri, durationMs, startMs, title) => {
      const id = addMusicTrack(uri, durationMs, startMs, title);
      setSelectedMusicTrackId(id);
    }}
    onAddFootage={(track) => {
      const id = appendRemoteClip({
        uri: track.url,
        durationMs: track.durationMs ?? 12_000,
        title: track.title,
        thumbnailUri: track.thumbnailUrl,
      });
      if (id) setSelectedClipId(id);
      Alert.alert('Stock added', `"${track.title}" appended to the timeline.`);
    }}
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Track' ? (
  <MotionTrackPanel
    visible={true}
    targetLabel={
      activeOverlay
        ? activeOverlay.text.slice(0, 28) || 'Text'
        : selectedMediaOverlay
          ? selectedMediaOverlay.type === 'emoji'
            ? selectedMediaOverlay.uri
            : selectedMediaOverlay.type === 'video'
              ? 'PiP video'
              : 'Photo overlay'
          : undefined
    }
    tracking={motionTracking}
    keyframeCount={
      activeOverlay?.keyframes?.length ??
      selectedMediaOverlay?.keyframes?.length ??
      0
    }
    onTrack={handleMotionTrack}
    onClear={() => {
      if (activeClip && activeOverlay) {
        clearTextPositionKeyframes(activeClip.id, activeOverlay.id);
      } else if (selectedMediaOverlayId) {
        clearOverlayKeyframes(selectedMediaOverlayId);
      }
    }}
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Effects' ? (
  <EffectsToolPanel
    visible={true}
    effectId={activeClip?.effectId}
    intensity={activeClip?.effectIntensity}
    onChange={(effectId, intensity) =>
      activeClip && updateClipEffect(activeClip.id, effectId, intensity)
    }
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Movie' ? (
  <MovieEffectsPanel
    visible={true}
    selectedId={activeClip?.movieEffectId ?? 'none'}
    onApply={(id) => activeClip && applyMovieEffect(activeClip.id, id)}
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Templates' ? (
  <TemplatesPanel
    visible={true}
    canSave={!!activeClip}
    onSave={async (name) => {
      if (!activeClip) throw new Error('Select a clip first.');
      await editTemplateService.saveFromClip(activeClip, name);
    }}
    onApply={handleApplyFilledTemplate}
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Color' ? (
  <ColorGradePanel
    visible={true}
    grade={liveGrade}
    onChange={(partial) =>
      activeClip && updateClipColorGrade(activeClip.id, partial)
    }
    onReset={() =>
      activeClip && updateClipColorGrade(activeClip.id, DEFAULT_COLOR_GRADE)
    }
    keyframeCount={activeClip?.colorGradeKeyframes?.length ?? 0}
    onAddKeyframe={() => {
      if (!activeClip) return;
      const grade = {
        ...DEFAULT_COLOR_GRADE,
        ...(activeClip.colorGrade ?? {}),
      };
      addClipColorGradeKeyframe(activeClip.id, {
        timeMs: Math.round(currentTime * 1000),
        grade,
      });
    }}
    onClearKeyframes={() =>
      activeClip && clearClipColorGradeKeyframes(activeClip.id)
    }
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Beats' ? (
  <BeatsToolPanel
    visible={true}
    markers={beatMarkersMs}
    playheadMs={currentPositionMs}
    onAddAtPlayhead={() => addBeatMarker(currentPositionMs)}
    onRemove={(timeMs) => removeBeatMarker(timeMs)}
    onClear={clearBeatMarkers}
    onClose={closeToolPanel}
    onDetectBeats={handleDetectBeats}
    detecting={detectingBeats}
    onAutoCut={handleAutoBeatCut}
  />
) : activeToolLabel === 'Animate' ? (
  <AnimationBrowserPanel
    visible={true}
    hasSelection={!!activeOverlay}
    animationIn={activeOverlay?.animationIn ?? 'none'}
    animationOut={activeOverlay?.animationOut ?? 'none'}
    animationLoop={activeOverlay?.animationLoop ?? 'none'}
    onChangeIn={(id) => {
      if (activeClip && activeOverlay) {
        updateTextOverlay(activeClip.id, activeOverlay.id, { animationIn: id });
      }
    }}
    onChangeOut={(id) => {
      if (activeClip && activeOverlay) {
        updateTextOverlay(activeClip.id, activeOverlay.id, { animationOut: id });
      }
    }}
    onChangeLoop={(id) => {
      if (activeClip && activeOverlay) {
        updateTextOverlay(activeClip.id, activeOverlay.id, { animationLoop: id });
      }
    }}
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Edit caption' ? (
  <CaptionEditPanel
    visible={true}
    overlay={
      activeOverlay?.isAiGenerated
        ? activeOverlay
        : captionOverlays.find((o) => o.id === selectedOverlayId) ??
          captionOverlays[0] ??
          null
    }
    onChange={(patch) => {
      if (!activeClip) return;
      const target =
        activeOverlay?.isAiGenerated
          ? activeOverlay
          : captionOverlays.find((o) => o.id === selectedOverlayId) ??
            captionOverlays[0];
      if (target) updateTextOverlay(activeClip.id, target.id, patch);
    }}
    onDelete={() => {
      if (!activeClip) return;
      const target =
        activeOverlay?.isAiGenerated
          ? activeOverlay
          : captionOverlays.find((o) => o.id === selectedOverlayId) ??
            captionOverlays[0];
      if (target) removeTextOverlay(activeClip.id, target.id);
    }}
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Keyframes' ? (
  <KeyframesPanel
    visible={true}
    playheadLabel={formatTime(Math.round(clipLocalMs))}
    volumeCount={activeClip?.volumeKeyframes?.length ?? 0}
    opacityCount={activeClip?.opacityKeyframes?.length ?? 0}
    onAddVolume={() => {
      if (!activeClip) return;
      addClipVolumeKeyframe(activeClip.id, {
        timeMs: Math.round(clipLocalMs),
        value: activeClip.volume ?? 1,
      });
    }}
    onAddOpacity={() => {
      if (!activeClip) return;
      addClipOpacityKeyframe(activeClip.id, {
        timeMs: Math.round(clipLocalMs),
        value: activeClip.opacity ?? 1,
      });
    }}
    onClearVolume={() =>
      activeClip && clearClipVolumeKeyframes(activeClip.id)
    }
    onClearOpacity={() =>
      activeClip && clearClipOpacityKeyframes(activeClip.id)
    }
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Compound' ? (
  <CompoundPanel
    visible={true}
    clips={clips}
    compounds={currentVideoProject?.compounds ?? []}
    selectedClipId={selectedClipId}
    onGroupSelected={(name) => {
      if (!selectedClipId) {
        Alert.alert('Select a clip', 'Pick a timeline clip first.');
        return;
      }
      createCompoundGroup(selectedClipId, name);
    }}
    onUngroup={ungroupCompound}
    onToggleCollapse={toggleCompoundCollapse}
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Adjust' ? (
  <AdjustmentLayerPanel
    visible={true}
    layers={currentVideoProject?.adjustmentLayers ?? []}
    playheadMs={currentPositionMs}
    onAdd={addAdjustmentLayer}
    onRemove={removeAdjustmentLayer}
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Curves' ? (
  <CurvesLutPanel
    visible={true}
    curves={activeClip?.colorCurves ?? DEFAULT_COLOR_CURVES}
    lutUri={activeClip?.lutUri}
    lutIntensity={activeClip?.lutIntensity}
    onChangeCurves={(c) =>
      activeClip && updateClipColorCurves(activeClip.id, c)
    }
    onChangeLut={(uri, intensity) =>
      activeClip && updateClipLut(activeClip.id, uri, intensity)
    }
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Mixer' ? (
  <MixerPanel
    visible={true}
    clipVolume={liveVolume}
    musicVolume={musicTracks[0]?.volume ?? 1}
    voiceoverVolume={
      (currentVideoProject?.voiceovers ?? []).find(
        (v) => v.id === selectedVoiceoverId
      )?.volume ??
      (currentVideoProject?.voiceovers ?? [])[0]?.volume ??
      1
    }
    duckEnabled={musicTracks[0]?.duckUnderVoiceover !== false}
    duckLevel={musicTracks[0]?.duckLevel ?? 0.28}
    audioFx={activeClip?.audioFx ?? DEFAULT_AUDIO_FX}
    hasClip={!!activeClip && activeClip.kind !== 'title'}
    onClipVolume={(v) =>
      activeClip && updateClipVolume(activeClip.id, v)
    }
    onMusicVolume={(v) => {
      const t = musicTracks[0];
      if (t) updateMusicTrack(t.id, { volume: v });
    }}
    onVoiceoverVolume={(v) => {
      const id =
        selectedVoiceoverId ??
        (currentVideoProject?.voiceovers ?? [])[0]?.id;
      if (id) updateVoiceover(id, { volume: v });
    }}
    onDuckEnabled={(v) => {
      const t = musicTracks[0];
      if (t) updateMusicTrack(t.id, { duckUnderVoiceover: v });
    }}
    onDuckLevel={(v) => {
      const t = musicTracks[0];
      if (t) updateMusicTrack(t.id, { duckLevel: v });
    }}
    onAudioFxChange={(fx) =>
      activeClip && updateClipAudioFx(activeClip.id, fx)
    }
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Stickers' ? (
  <StickersPanel
    visible={true}
    onAdd={(emoji) => handleAddMediaOverlay('emoji', emoji)}
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Publish' ? (
  <PublishPanel
    visible={true}
    projectName={currentVideoProject?.title ?? currentVideoProject?.name ?? 'Vydora edit'}
    onApplyPreset={(cropRatioId) => {
      clips.forEach((c) => updateClipCrop(c.id, { cropRatioId }));
    }}
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Shorts' ? (
  <ShortsToolPanel
    visible={true}
    onGenerate={handleGenerateShorts}
    onAdd={handleAddShort}
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Multi-cam' ? (
  <MultiCamToolPanel
    visible={true}
    activeClip={activeClip}
    otherClips={clips.filter((c) => c.id !== activeClip?.id)}
    playheadLabel={formatTime(currentPositionMs)}
    onSyncWithClip={handleMulticamSyncWithClip}
    onSyncWithPickedVideo={handleMulticamSyncPicked}
    onCutToAngle={handleDirectorCut}
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Stabilize' ? (
  <StabilizeToolPanel
    visible={true}
    stabilize={activeClip?.stabilize}
    autoReframe={activeClip?.autoReframe}
    onStabilizeChange={(s) =>
      activeClip && updateClipStabilize(activeClip.id, s)
    }
    onAnalyzeReframe={handleAnalyzeReframe}
    onDisableReframe={() =>
      activeClip && updateClipAutoReframe(activeClip.id, undefined)
    }
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Brand kit' ? (
  <BrandKitPanel
    visible={true}
    onSave={() => {}}
    onApply={handleApplyBrandKit}
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Captions' ? (
  // AI auto-captions — Whisper transcription → timed text overlays
  <CaptionsToolPanel
    visible={true}
    captionCount={captionOverlays.length}
    onGenerate={handleGenerateCaptions}
    getSrt={() =>
      overlaysToSrt(
        captionOverlays.map((o) => ({
          text: o.text,
          startMs: o.startMs,
          durationMs: o.durationMs,
        }))
      )
    }
    onClearCaptions={handleClearCaptions}
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Rough cut' ? (
  <SilenceToolPanel
    visible={true}
    onApply={handleRemoveSilence}
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Overlay' ? (
  // Multi-track overlays — PiP video, images/GIFs, emoji stickers + keyframes
  <OverlayToolPanel
    visible={true}
    overlays={mediaOverlays}
    selectedOverlay={selectedMediaOverlay}
    onAdd={handleAddMediaOverlay}
    onSelectOverlay={setSelectedMediaOverlayId}
    onChange={(changes) =>
      selectedMediaOverlayId && updateMediaOverlay(selectedMediaOverlayId, changes)
    }
    onAddKeyframe={handleAddOverlayKeyframe}
    onClearKeyframes={() =>
      selectedMediaOverlayId && clearOverlayKeyframes(selectedMediaOverlayId)
    }
    onDelete={handleDeleteMediaOverlay}
    onOpenMask={() => setActiveToolLabel('Mask')}
    onApplyStockFx={(effectId, intensity) => {
      if (!activeClip) {
        Alert.alert('Select a clip', 'Pick a photo or video clip first.');
        return;
      }
      updateClipEffect(activeClip.id, effectId, intensity);
      Alert.alert(
        'FX applied',
        `${effectId === 'lightning' ? 'Lightning' : effectId === 'filmGrain' ? 'Film grain' : 'Dust'} is on this clip. Export bakes the full look.`
      );
    }}
    onClose={closeToolPanel}
  />

) : activeToolLabel === 'Mask' ? (
  <MaskToolPanel
    visible={true}
    selectedOverlay={selectedMediaOverlay}
    selectedText={activeOverlay}
    playheadMs={
      selectedMediaOverlay
        ? currentPositionMs
        : clipLocalMs
    }
    tracking={motionTracking}
    onChange={(changes) =>
      selectedMediaOverlayId && updateMediaOverlay(selectedMediaOverlayId, changes)
    }
    onTextMaskChange={(mask) => {
      if (activeClip && activeOverlay) {
        updateTextOverlay(activeClip.id, activeOverlay.id, { mask });
      }
    }}
    onFollowTrack={handleMotionTrack}
    onClearFollow={() =>
      selectedMediaOverlayId && clearOverlayKeyframes(selectedMediaOverlayId)
    }
    onClose={closeToolPanel}
  />

) : activeToolLabel === 'Rotate' ? (
  <RotateToolPanel
    visible={true}
    rotation={activeClip?.rotation ?? liveRotation}
    keyframeCount={activeClip?.rotationKeyframes?.length ?? 0}
    onRotationChange={(degrees) =>
      activeClip && updateClipRotation(activeClip.id, degrees)
    }
    onAddKeyframe={() => {
      if (!activeClip) return;
      addClipRotationKeyframe(activeClip.id, {
        timeMs: Math.round(clipLocalMs),
        value: activeClip.rotation ?? 0,
      });
    }}
    onClearKeyframes={() =>
      activeClip && clearClipRotationKeyframes(activeClip.id)
    }
    onClose={closeToolPanel}
  />

) : activeToolLabel === 'Canvas' ? (
  <CanvasToolPanel
    visible={true}
    clip={activeClip}
    canvasColor={currentVideoProject?.canvasColor ?? '#000000'}
    onCanvasColorChange={setCanvasColor}
    onLayoutChange={(patch) =>
      activeClip && updateClipLayout(activeClip.id, patch)
    }
    onLookOverlayChange={(patch) =>
      activeClip && updateClipLookOverlay(activeClip.id, patch)
    }
    onDoubleExposure={() => {
      if (!activeClip) {
        Alert.alert('Select a clip', 'Pick a clip first, then Double exposure.');
        return;
      }
      applyDoubleExposure(activeClip.id);
      setActiveToolLabel('Overlay');
      Alert.alert(
        'Double exposure',
        'Ghost layer added. Tweak Transparency / Size on Canvas, or the Overlay layer.'
      );
    }}
    onOpenRotate={() => setActiveToolLabel('Rotate')}
    onOpenMask={() => setActiveToolLabel('Mask')}
    onClose={closeToolPanel}
  />

) : activeToolLabel === 'Sheet' ? (
  <TitleCardPanel
    visible={true}
    onClose={closeToolPanel}
    onAdd={(card, durationMs, where) => {
      const id = addTitleCard(card, durationMs, where, selectedClipId);
      if (id) {
        setSelectedClipId(id);
        closeToolPanel();
        Alert.alert(
          'Title card added',
          'Add music under Music if you want a song under the sheet. Bounce text plays on preview + export.'
        );
      }
    }}
  />

) : activeToolLabel === 'Flyer' ? (
  <FlyerPanel
    visible={true}
    flyers={clips.filter((c) => c.kind === 'flyer')}
    selectedFlyerId={
      activeClip?.kind === 'flyer' ? activeClip.id : selectedClipId
    }
    onAdd={(uri, durationMs, where) => {
      const id = addFlyer(uri, durationMs, where, selectedClipId);
      if (id) {
        setSelectedClipId(id);
        Alert.alert(
          'Flyer added',
          'Select it and use Filter / Color for a look different from your video.'
        );
      }
    }}
    onSelect={(clipId) => setSelectedClipId(clipId)}
    onUpdateDuration={(clipId, durationMs) =>
      updateStillDuration(clipId, durationMs)
    }
    onDelete={(clipId) => {
      deleteClip(clipId);
      if (selectedClipId === clipId) setSelectedClipId(null);
    }}
    onOpenFilter={() => setActiveToolLabel('Filter')}
    onClose={closeToolPanel}
  />

) : activeToolLabel === 'Conference' ? (
  <ConferencePanel
    visible={true}
    clips={clips}
    selectedClipId={selectedClipId}
    hasMusic={musicTracks.length > 0}
    onCreateSlate={(card, durationMs, where) => {
      const id = addTitleCard(card, durationMs, where, selectedClipId);
      if (id) setSelectedClipId(id);
      return id;
    }}
    onAddTimedText={(clipId, layer) => {
      const id = addTextOverlay(
        clipId,
        layer.text,
        layer.startMs,
        layer.durationMs
      );
      updateTextOverlay(clipId, id, {
        x: layer.x,
        y: layer.y,
        color: layer.color,
        fontSize: layer.fontSize,
        animationIn: layer.animationIn,
        animationDurationMs: 700,
        fontWeight: 'bold',
        align: 'center',
      });
    }}
    onAddGuest={(guest) => {
      const slate =
        (selectedClipId &&
          clips.find(
            (c) =>
              c.id === selectedClipId &&
              (c.kind === 'title' || c.kind === 'flyer')
          )) ||
        clips.find((c) => c.kind === 'title' || c.kind === 'flyer');
      const seg = slate
        ? clipTimelineSegments.find((s) => s.clip.id === slate.id)
        : null;
      const baseMs = seg?.timelineStartMs ?? 0;
      const startMs = baseMs + guest.startMs;
      const overlayId = addMediaOverlay({
        type: 'image',
        uri: guest.uri,
        startMs,
        durationMs: guest.durationMs,
        x: guest.x,
        y: guest.y,
        scale: 1.15,
        rotation: 0,
        opacity: 1,
        label: guest.name,
        role: guest.role,
        animationIn: guest.animationIn,
        mask: {
          enabled: true,
          shape: 'circle',
          feather: 0.08,
          invert: false,
          centerX: 0.5,
          centerY: 0.5,
          scale: 1,
          rotation: 0,
        },
        keyframes: [
          {
            timeMs: startMs,
            x: guest.x,
            y: guest.y + 0.04,
            scale: 0.85,
            rotation: 0,
            opacity: 0,
          },
          {
            timeMs: startMs + 550,
            x: guest.x,
            y: guest.y,
            scale: 1.15,
            rotation: 0,
            opacity: 1,
          },
        ],
      });
      setSelectedMediaOverlayId(overlayId);
      if (slate) {
        const nameId = addTextOverlay(
          slate.id,
          guest.name,
          guest.startMs,
          guest.durationMs
        );
        updateTextOverlay(slate.id, nameId, {
          x: guest.x,
          y: Math.min(0.92, guest.y + 0.16),
          color: '#FFFFFF',
          fontSize: 14,
          fontWeight: 'bold',
          align: 'center',
          animationIn: guest.animationIn,
          animationDurationMs: 500,
        });
        if (guest.role) {
          const roleId = addTextOverlay(
            slate.id,
            guest.role,
            guest.startMs + 120,
            guest.durationMs
          );
          updateTextOverlay(slate.id, roleId, {
            x: guest.x,
            y: Math.min(0.95, guest.y + 0.21),
            color: '#93C5FD',
            fontSize: 11,
            align: 'center',
            animationIn: 'fade',
            animationDurationMs: 400,
          });
        }
      }
    }}
    onApplyMusicFades={(fadeInMs, fadeOutMs) => {
      const t = musicTracks[0];
      if (!t) return;
      updateMusicTrack(t.id, { fadeInMs, fadeOutMs });
    }}
    onSelectClip={setSelectedClipId}
    onClose={closeToolPanel}
  />

) : activeToolLabel === 'Assemble' ? (
  <AssembleToolPanel
    visible={true}
    clips={clips}
    selectedClipId={selectedClipId}
    sourceClip={
      activeClip && activeClip.kind !== 'title'
        ? activeClip
        : clips.find((c) => c.kind !== 'title') ?? null
    }
    onSelectClip={setSelectedClipId}
    onExtractRange={(startSec, endSec) => {
      const source =
        activeClip && activeClip.kind !== 'title'
          ? activeClip
          : clips.find((c) => c.kind !== 'title');
      if (!source) {
        Alert.alert('No video', 'Select a video clip to pull a range from.');
        return;
      }
      const id = insertClipRange(
        source.id,
        Math.round(startSec * 1000),
        Math.round(endSec * 1000)
      );
      if (id) setSelectedClipId(id);
    }}
    onMoveClip={moveClip}
    onDeleteClip={(clipId) => {
      deleteClip(clipId);
      if (selectedClipId === clipId) setSelectedClipId(null);
    }}
    onResetClipEdits={resetClipEdits}
    onAutoMovie={(sourceClipId, styleId) => {
      const source = clips.find((c) => c.id === sourceClipId);
      if (!source) return;
      const plan = buildAutoMoviePlan(source.durationMs, styleId);
      const ids = applyAutoMovie(sourceClipId, plan);
      if (ids[0]) setSelectedClipId(ids[0]);
      Alert.alert(
        'Auto Movie ready',
        `${ids.length} beats with ${plan.transitionType} transitions. Scrub the timeline or export.`
      );
    }}
    onAddVideos={promptAddVideos}
    addVideosBusy={addVideosBusy}
    onClose={closeToolPanel}
  />

) : activeToolLabel === 'Voiceover' ? (
  <VoiceoverToolPanel
    visible={true}
    voiceovers={voiceovers}
    selectedId={selectedVoiceoverId}
    playheadMs={currentPositionMs}
    onSelect={setSelectedVoiceoverId}
    onRecorded={(uri, startMs, durationMs) => {
      const id = addVoiceover(uri, startMs, durationMs);
      setSelectedVoiceoverId(id);
    }}
    onVolumeChange={(volume) =>
      selectedVoiceoverId && updateVoiceover(selectedVoiceoverId, { volume })
    }
    onDelete={() => {
      if (!selectedVoiceoverId) return;
      removeVoiceover(selectedVoiceoverId);
      setSelectedVoiceoverId(null);
    }}
    onRecordingChange={(recording) => {
      // CapCut-style: pause timeline while the mic is live.
      if (recording) {
        try { player.pause(); } catch { /* ignore */ }
        try { musicPlayer.pause(); } catch { /* ignore */ }
        try { voiceoverPlayer.pause(); } catch { /* ignore */ }
      }
    }}
    onSyncKaraoke={handleSyncVoKaraoke}
    karaokeBusy={karaokeBusy}
    onClose={closeToolPanel}
  />

) : (
  /*for the edit tool panel  */
        <EditToolPanel
          visible={activeToolLabel !== null}
          toolLabel={activeToolLabel}
          onClose={closeToolPanel}
          volume={liveVolume}
          onVolumeChange={(v) =>
            activeClip && updateClipVolume(activeClip.id, v)
          }
          opacity={liveOpacity}
          onOpacityChange={(v) =>
            activeClip && updateClipOpacity(activeClip.id, v)
          }
          volumeKeyframeCount={activeClip?.volumeKeyframes?.length ?? 0}
          onAddVolumeKeyframe={() => {
            if (!activeClip) return;
            addClipVolumeKeyframe(activeClip.id, {
              timeMs: Math.round(currentTime * 1000),
              value: activeClip.volume ?? 1,
            });
          }}
          onClearVolumeKeyframes={() =>
            activeClip && clearClipVolumeKeyframes(activeClip.id)
          }
          opacityKeyframeCount={activeClip?.opacityKeyframes?.length ?? 0}
          onAddOpacityKeyframe={() => {
            if (!activeClip) return;
            addClipOpacityKeyframe(activeClip.id, {
              timeMs: Math.round(currentTime * 1000),
              value: activeClip.opacity ?? 1,
            });
          }}
          onClearOpacityKeyframes={() =>
            activeClip && clearClipOpacityKeyframes(activeClip.id)
          }
          audioFx={activeClip?.audioFx ?? DEFAULT_AUDIO_FX}
          onAudioFxChange={(fx) =>
            activeClip && updateClipAudioFx(activeClip.id, fx)
          }
          speed={activeClip?.speed ?? 1}
          onSpeedChange={(s) => activeClip && updateClipSpeed(activeClip.id, s)}
          speedCurve={(activeClip?.speedCurve ?? 'none') as SpeedCurveId}
          onSpeedCurveChange={(curve) =>
            activeClip && updateClipSpeedCurve(activeClip.id, curve)
          }
          reversed={!!activeClip?.reversed}
          onReversedChange={(reversed) =>
            activeClip && updateClipReversed(activeClip.id, reversed)
          }
          textColor={activeOverlay?.color ?? "#FFFFFF"}
          onTextColorChange={(color) =>
            activeClip &&
            selectedOverlayId &&
            updateTextOverlay(activeClip.id, selectedOverlayId, { color })
          }
          // CapCut-style bg pill: pick a swatch → semi-opaque box; None clears it.
          // Same fields are sent in the export timeline (bgColor / bgOpacity).
          backgroundColor={activeOverlay?.backgroundColor}
          onBackgroundColorChange={(backgroundColor) =>
            activeClip &&
            selectedOverlayId &&
            updateTextOverlay(activeClip.id, selectedOverlayId, {
              backgroundColor,
              backgroundOpacity: backgroundColor ? 0.7 : 0,
              backgroundRadius: backgroundColor ? 6 : 0,
            })
          }
          fontSize={activeOverlay?.fontSize ?? 24}
          onFontSizeChange={(fontSize) =>
            activeClip &&
            selectedOverlayId &&
            updateTextOverlay(activeClip.id, selectedOverlayId, {
              fontSize: Math.round(fontSize),
            })
          }
          fontFamily={activeOverlay?.fontFamily ?? 'System'}
          onFontFamilyChange={(fontFamily) =>
            activeClip &&
            selectedOverlayId &&
            updateTextOverlay(activeClip.id, selectedOverlayId, { fontFamily })
          }
          animationIn={activeOverlay?.animationIn ?? 'fade'}
          onAnimationInChange={(animationIn) =>
            activeClip &&
            selectedOverlayId &&
            updateTextOverlay(activeClip.id, selectedOverlayId, { animationIn })
          }
          animationOut={activeOverlay?.animationOut ?? 'none'}
          onAnimationOutChange={(animationOut) =>
            activeClip &&
            selectedOverlayId &&
            updateTextOverlay(activeClip.id, selectedOverlayId, { animationOut })
          }
          animationLoop={activeOverlay?.animationLoop ?? 'none'}
          onAnimationLoopChange={(animationLoop) =>
            activeClip &&
            selectedOverlayId &&
            updateTextOverlay(activeClip.id, selectedOverlayId, { animationLoop })
          }
          animationDurationMs={activeOverlay?.animationDurationMs ?? 500}
          onAnimationDurationChange={(animationDurationMs) =>
            activeClip &&
            selectedOverlayId &&
            updateTextOverlay(activeClip.id, selectedOverlayId, {
              animationDurationMs,
            })
          }
          blendMode={activeOverlay?.blendMode ?? 'normal'}
          onBlendModeChange={(blendMode) =>
            activeClip &&
            selectedOverlayId &&
            updateTextOverlay(activeClip.id, selectedOverlayId, { blendMode })
          }
          textOpacity={activeOverlay?.textOpacity ?? 1}
          onTextOpacityChange={(textOpacity) =>
            activeClip &&
            selectedOverlayId &&
            updateTextOverlay(activeClip.id, selectedOverlayId, { textOpacity })
          }
          isEditingExistingOverlay={!!selectedOverlayId}
          onDeleteOverlay={() => {
            if (activeClip && selectedOverlayId) {
              removeTextOverlay(activeClip.id, selectedOverlayId);
              setSelectedOverlayId(null);
            }
          }}
        />
)}
 </View>
 ) : null}

{activeClip && (
  <CropOverlay
    visible={cropOverlayVisible}
    clipUri={activeClip.uri}
    cropRatioId={pendingCropRatioId}
    initialOffsetX={activeClip.cropOffsetX}
    initialOffsetY={activeClip.cropOffsetY}
    initialZoom={activeClip.cropZoom}
    onConfirm={handleConfirmCrop}
    onClose={() => setCropOverlayVisible(false)}
  />
)}

{/* //for the export modal// */}

{/* Transition picker — opens from the circle between two clips */}
{transitionClipId && (
  <TransitionPanel
    visible={true}
    transition={clips.find((c) => c.id === transitionClipId)?.transitionOut}
    onChange={(t) => updateClipTransition(transitionClipId, t)}
    onClose={() => setTransitionClipId(null)}
  />
)}

<ExportConfirmModal
  visible={showExportConfirm}
  onCancel={() => setShowExportConfirm(false)}
  onConfirm={handleExportConfirm}
/>
{/* <ExportProgressSheet
  visible={exportState !== 'idle'}
  progress={progress}
  quote={quote}
  isDone={exportState === 'done'}
  onClose={() => {
    setExportState('idle');
    setProgress(0);
  }}
/> */}

    </SafeAreaView>
  );
}

// ─── Perfect Styles Replicating the Design ──────────────────────────────

function __makeStyles() {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  emptyStateText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(14),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
  },
  headerBtn: {
    padding: scale(4),
    minWidth: scale(36),
  },
  editToast: {
    position: 'absolute',
    top: verticalScale(52),
    alignSelf: 'center',
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: 'rgba(21,24,33,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.yellow,
    borderRadius: scale(20),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    maxWidth: '88%',
  },
  editToastText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(12),
    flexShrink: 1,
  },
  editToastName: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  viewerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginHorizontal: scale(14),
    marginBottom: verticalScale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(12),
    backgroundColor: 'rgba(245,197,24,0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.yellow,
  },
  viewerBannerText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  viewerBannerCta: {
    color: COLORS.yellow,
    fontSize: moderateScale(12),
    fontWeight: '800',
  },
  previewWrapper: {
    flex: 1,
    minHeight: verticalScale(180),
    paddingHorizontal: scale(14),
    marginVertical: verticalScale(4),
  },
  previewContainer: {
    flex: 1,
    borderRadius: scale(24),
    overflow: "hidden",
    backgroundColor: COLORS.background,
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  videoView: {
    flex: 1,
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  placeholderImg: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  tealScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11, 13, 19, 0.35)",
  },
  videoTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(14),
    paddingTop: verticalScale(12),
    zIndex: 10,
  },
  previewChromeBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Only the Done check gets a quiet yellow accent — not every control.
  previewChromeBtnAccent: {
    borderColor: "rgba(245,197,24,0.45)",
  },
  previewExportWow: {
    width: scale(72),
    borderRadius: scale(18),
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },
  previewExportWowText: {
    color: "#0B0D13",
    fontWeight: "800",
    fontSize: moderateScale(11),
  },
  videoTitle: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(16),
    fontWeight: "700",
  },
  timestampOverlay: {
    position: "absolute",
    bottom: verticalScale(64),
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: scale(20),
    zIndex: 10,
  },
  timestampText: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(11),
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  timestampMuted: {
    color: "rgba(255,255,255,0.45)",
    fontWeight: "400",
  },
  videoControlRow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(14),
    zIndex: 10,
  },
  videoControlIcon: {
    padding: scale(6),
  },
  playButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineContainer: {
    height: verticalScale(168),
    position: "relative",
    marginTop: verticalScale(4),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.06)",
    backgroundColor: COLORS.background,
  },
  timelineTracksScroll: {
    maxHeight: verticalScale(160),
  },
  timelineTracksContent: {
    paddingBottom: verticalScale(10),
  },
  toolSheetHost: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    elevation: 60,
  },
  playheadLine: {
    position: "absolute",
    left: "35%",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#FFFFFF",
    zIndex: 100,
  },
  rulerContainer: {
    height: verticalScale(28),
    position: "relative",
    marginBottom: verticalScale(6),
  },
  rulerLine: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  rulerMarkContainer: {
    position: "absolute",
    bottom: 0,
    alignItems: "center",
  },
  rulerTick: {
    width: 1.5,
    height: verticalScale(6),
    backgroundColor: COLORS.textMuted,
    marginBottom: verticalScale(4),
  },
  rulerMarkText: {
    color: COLORS.textMuted,
    fontSize: moderateScale(9),
    fontWeight: "600",
  },
  beatMarker: {
    position: "absolute",
    top: 0,
    bottom: verticalScale(14),
    width: 2,
    backgroundColor: COLORS.yellow,
    opacity: 0.85,
    borderRadius: 1,
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    height: verticalScale(46),
  },
  activeTextChipContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    height: verticalScale(28),
  },
  activeTextChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    backgroundColor: COLORS.yellowBg,
    borderWidth: 2,
    borderColor: COLORS.yellow,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(4),
    borderRadius: scale(14),
    justifyContent: "center",
  },
  activeTextChipText: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(10),
    fontWeight: "700",
  },
  chipHandleLeft: {
    position: "absolute",
    left: -scale(3),
    width: scale(6),
    height: verticalScale(12),
    backgroundColor: COLORS.yellow,
    borderRadius: scale(3),
    zIndex: 10,
  },
  chipHandleRight: {
    position: "absolute",
    right: -scale(3),
    width: scale(6),
    height: verticalScale(12),
    backgroundColor: COLORS.yellow,
    borderRadius: scale(3),
    zIndex: 10,
  },
  aiTextChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    backgroundColor: COLORS.surface,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    borderRadius: scale(16),
    position: "relative",
  },
  aiSparkleIcon: {
    position: "absolute",
    top: -scale(3),
    left: -scale(3),
    backgroundColor: "#F5C518",
    borderRadius: scale(8),
    padding: scale(2),
  },
  aiTextChipText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    fontWeight: "600",
  },
  clipPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  clipPlaceholderImg: {
    width: "100%",
    height: "100%",
    opacity: 0.6,
  },
  transitionBtn: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: -scale(10),
    zIndex: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  transitionBtnActive: {
    backgroundColor: COLORS.yellow,
  },
  transitionInnerIcon: {
    width: scale(10),
    height: scale(4),
    backgroundColor: COLORS.surface,
    borderRadius: scale(2),
  },
  waveformContainer: {
    height: verticalScale(36),
    borderRadius: scale(12),
    borderWidth: 1,
    paddingHorizontal: scale(10),
    justifyContent: "center",
    marginTop: scale(20),
  },
  waveformTrack: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(2),
  },
  waveformBar: {
    width: 2.5,
    borderRadius: 1.5,
  },
  trimHandle: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: HANDLE_WIDTH,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5C518",
    zIndex: 10,
  },
  trimHandleBar: {
    width: scale(3),
    height: "50%",
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  dimOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    zIndex: 4,
  },
  activeBorderOutline: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: COLORS.yellow,
    zIndex: 5,
  },
  leftTrimHandle: {
    borderTopLeftRadius: scale(6),
    borderBottomLeftRadius: scale(6),
  },
  rightTrimHandle: {
    borderTopRightRadius: scale(6),
    borderBottomRightRadius: scale(6),
  },
  addClipTrackBtn: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: " #F5C518",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
  },
  //for the top avatar//
  collabTrigger: {
    minWidth: scale(28),
    height: scale(34),
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  onlinePulse: {
    width: scale(9),
    height: scale(9),
    borderRadius: scale(9),
    backgroundColor: COLORS.tealAccent,
    borderWidth: 1.5,
    borderColor: COLORS.background,
    marginLeft: -scale(6),
    alignSelf: "flex-end",
  },
  unreadBadge: {
    position: "absolute",
    top: -scale(4),
    right: -scale(6),
    minWidth: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(3),
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: moderateScale(8),
    fontWeight: "800",
  },
  stackedAvatar: {
    width: scale(33),
    height: scale(33),
    borderRadius: scale(33),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  stackedAvatarText: {
    color: "#FFF",
    fontSize: moderateScale(9),
    fontWeight: "700",
  },

  overlayTextWrapper: {
    position: "absolute",
    transform: [{ translateX: -scale(60) }, { translateY: -verticalScale(15) }],
    maxWidth: "80%",
  },

  // ── Media overlay track (timeline blocks) ──
  overlayTrackBlock: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: scale(6),
    backgroundColor: "rgba(16, 185, 129, 0.25)",
    borderWidth: 1,
    borderColor: COLORS.tealAccent,
    justifyContent: "center",
    paddingHorizontal: scale(6),
    overflow: "hidden",
  },
  overlayTrackBlockSelected: {
    backgroundColor: "rgba(245, 197, 24, 0.25)",
    borderColor: COLORS.yellow,
  },
  overlayTrackLabel: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(8),
    fontWeight: "700",
  },
  overlayKeyframeDot: {
    position: "absolute",
    top: verticalScale(2),
    width: scale(6),
    height: scale(6),
    backgroundColor: COLORS.yellow,
    transform: [{ rotate: "45deg" }],
  },

  voiceoverTrackBlock: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: scale(6),
    backgroundColor: "rgba(167, 139, 250, 0.28)",
    borderWidth: 1,
    borderColor: "#A78BFA",
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    paddingHorizontal: scale(6),
    overflow: "hidden",
  },
  voiceoverTrackBlockSelected: {
    backgroundColor: "#A78BFA",
    borderColor: "#C4B5FD",
  },
  voiceoverTrackLabel: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(8),
    fontWeight: "700",
  },

  musicTrackBlock: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: scale(6),
    backgroundColor: "rgba(52, 211, 153, 0.22)",
    borderWidth: 1,
    borderColor: "#34D399",
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    paddingHorizontal: scale(6),
    overflow: "hidden",
  },
  musicTrackBlockSelected: {
    backgroundColor: "#34D399",
    borderColor: "#6EE7B7",
  },
  musicTrackLabel: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(8),
    fontWeight: "700",
  },

  // ── Live cursors (teammates' playheads) ──
  remoteCursor: {
    position: "absolute",
    top: 0,
    bottom: 0,
    alignItems: "flex-start",
    zIndex: 90,
  },
  remoteCursorLine: {
    flex: 1,
    width: 2,
    borderRadius: 1,
    opacity: 0.9,
  },
  remoteCursorTag: {
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(8),
    marginBottom: verticalScale(2),
    maxWidth: scale(96),
  },
  remoteCursorTagText: {
    color: "#0B0D13",
    fontSize: moderateScale(8),
    fontWeight: "800",
  },
});
}
let styles = __makeStyles();

