import React, { useState, useEffect, useMemo, useRef } from "react";
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
} from "react-native";  
import { useMember } from "../Contexts/memberContext";
import CollaborationSidebar from "../components/Editorsidebar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";
import { useVideoPlayer, VideoView } from "expo-video";
import { useAudioPlayer } from "expo-audio"; // for background music playback,
import { useEventListener } from "expo";
import { useNavigation } from "@react-navigation/native";
import * as VideoThumbnails from "expo-video-thumbnails";

import { useVideoProject } from "../Contexts/VideoProjectContext";
import { useProject } from "../Contexts/projectContext";
import {
  VideoClip,
  TextOverlay,
  VideoSegment,
  MediaOverlay,
  MediaOverlayType,
} from "../types";
import BottomToolbar from "../Tabbar/editTools";
import { useComment } from "../Contexts/commentContext";
import { useMessage } from "../Contexts/messageContext";
import { useAuth } from "../Contexts/Authcontext";
import { useProjectSocket } from "../socket/socketconnection";
import { publishCursor, useLiveCursors } from "../socket/editorSync";
import EditToolPanel from "./EditToolPanel";
import { FILTER_LIST, getFilterById } from "../services/FilterService";
import FilterToolPanel from "./FilterPanelTool";
import CropRatioPanel from "./cropRatioPanel"; 
// import CropOverlay from "./cropOverlay";
import MusicToolPanel from "./MusicToolPanel"; // panel for picking/adjusting background music
import TransitionPanel from "./TransitionPanel"; // CapCut-style transition picker between clips
import CaptionsToolPanel from "./CaptionsToolPanel"; // AI auto-captions (Whisper)
import OverlayToolPanel from "./OverlayToolPanel"; // multi-track PiP/stickers/GIFs + keyframes
import { captionService } from "../services/captionService";
import { CROP_RATIO_PRESETS } from '../services/cropService';


//for the exporting//
import { ExportConfirmModal } from "../components/ExportModal";
import { ExportProgressSheet } from "../components/Exportsheet";
import { exportService } from "../services/exportService";
import { getRandomQuote } from "../../../constants/exportQuotes";

const COLORS = {
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
      {/* Filmstrip */}
      {thumbnails.length > 0 ? (
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
  onTap,
  onDragEnd,
}: {
  overlay: TextOverlay;
  previewSize: { width: number; height: number };
  onTap: () => void;
  onDragEnd: (x: number, y: number) => void;
}) {
  const startXRef = useRef((overlay.x ?? 0.5) * previewSize.width);
  const startYRef = useRef((overlay.y ?? 0.5) * previewSize.height);
  const [pos, setPos] = useState({
    x: (overlay.x ?? 0.5) * previewSize.width,
    y: (overlay.y ?? 0.5) * previewSize.height,
  });
  const movedRef = useRef(false);
  useEffect(() => {
    setPos({
      x: (overlay.x ?? 0.5) * previewSize.width,
      y: (overlay.y ?? 0.5) * previewSize.height,
    });
  }, [overlay.x, overlay.y, previewSize.width, previewSize.height]);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startXRef.current = pos.x;
        startYRef.current = pos.y;
        movedRef.current = false;
      },
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4) {
          movedRef.current = true;
        }
        const nextX = Math.max(0, Math.min(previewSize.width, startXRef.current + gesture.dx));
        const nextY = Math.max(0, Math.min(previewSize.height, startYRef.current + gesture.dy));
        setPos({ x: nextX, y: nextY });
      },
      onPanResponderRelease: () => {
        if (movedRef.current) {
          const normX = pos.x / previewSize.width;
          const normY = pos.y / previewSize.height;
          onDragEnd(normX, normY);
        } else {
          onTap();
        }
      },
    })
  ).current;
  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.overlayTextWrapper,
        {
          left: pos.x,
          top: pos.y,
        },
      ]}
    >
      <Text
        style={{
          color: overlay.color ?? "#FFFFFF",
          fontSize: scale(overlay.fontSize ?? 24),
          fontWeight: overlay.fontWeight === "bold" ? "700" : "400",
          textAlign: overlay.align ?? "center",
          // CapCut-style pill: #RRGGBB + 2-digit hex alpha from backgroundOpacity.
          backgroundColor: overlay.backgroundColor
            ? `${overlay.backgroundColor}${Math.round((overlay.backgroundOpacity ?? 0.6) * 255)
                .toString(16)
                .padStart(2, "0")}`
            : "transparent",
          borderRadius: scale(overlay.backgroundRadius ?? 0),
          paddingHorizontal: scale(8),
          paddingVertical: verticalScale(4),
          overflow: "hidden",
        }}
      >
        {overlay.text}
      </Text>
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

  const { w, h } = OVERLAY_SIZES[overlay.type];

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
      {overlay.type === "emoji" ? (
        <Text style={{ fontSize: scale(42) }}>{overlay.uri}</Text>
      ) : overlay.type === "image" ? (
        <Image
          source={{ uri: overlay.uri }}
          style={{ width: "100%", height: "100%", borderRadius: scale(8) }}
          resizeMode="contain"
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
    </View>
  );
}

export default function EditorScreen() {
  const navigation = useNavigation<any>();

const { currentVideoProject, updateClipTrim, deleteClip, duplicateClip, splitClip } = useVideoProject();
const { currentProject } = useProject();
  const { getMembersForProject, fetchMembers } = useMember();



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
    updateClipVolume,
    addTextOverlay,
    updateTextOverlay,
    removeTextOverlay,
    updateClipFilter,
    updateClipCrop,
    updateClipSegments,
    updateClipTransition,
    addMediaOverlay,
    updateMediaOverlay,
    removeMediaOverlay,
    addOverlayKeyframe,
    clearOverlayKeyframes,
    setBackgroundMusic,
    updateBackgroundMusic,
    removeBackgroundMusic,
  } = useVideoProject();

  const { fetchComments } = useComment();
  const { fetchMessages, markProjectRead, getUnreadForProject } = useMessage();
  const { user } = useAuth();

  // ── Real-time collaboration ──
  // Opens a STOMP connection for this project: live group chat, presence
  // (online avatars), and clip-comment sync. Presence auto-marks this user
  // online for everyone else on connect.
  useProjectSocket(projectId ?? "");
  const unreadCount = projectId ? getUnreadForProject(projectId) : 0;

  // Figma-style live cursors: teammates' playheads rendered on our timeline.
  const remoteCursors = useLiveCursors();

  const openCollabPanel = () => {
    setSidebarVisible(true);
    if (projectId) markProjectRead(projectId);
  };

  //for the video volume//
  const [activeToolLabel, setActiveToolLabel] = useState<string | null>(null);

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
const handleExportConfirm = () => {
  if (!currentVideoProject) return;
  // setShowExportConfirm(false);
  // setExportState('exporting');
  // setProgress(0);
  // setQuote(getRandomQuote());
  // quoteIntervalRef.current = setInterval(() => {
  //   setQuote((prev) => getRandomQuote(prev));
  // }, 2500);
  // exportService.createExport(currentVideoProject, (pct) => setProgress(pct), '')
  //   .then(() => {
  //     if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current);
  //     setExportState('done');
  //   });

  navigation.navigate("reviewexport")

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

  const clips: VideoClip[] = project?.clips ?? [];

  //--------------for the sidebar--------------//
  const [sidebarVisible, setSidebarVisible] = useState(false);

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
  const selectedMediaOverlay =
    mediaOverlays.find((o) => o.id === selectedMediaOverlayId) ?? null;

  //--------for clip transitions-------------//
  // Which clip's outgoing transition is being edited (tap the circle between clips).
  const [transitionClipId, setTransitionClipId] = useState<string | null>(null);
  // Quick fade effect over the preview when playback crosses a transition boundary.
  const transitionFade = useRef(new Animated.Value(0)).current;
  const runTransitionEffect = (durationMs: number) => {
    transitionFade.setValue(0);
    Animated.sequence([
      Animated.timing(transitionFade, {
        toValue: 1,
        duration: Math.max(120, durationMs / 2),
        useNativeDriver: true,
      }),
      Animated.timing(transitionFade, {
        toValue: 0,
        duration: Math.max(120, durationMs / 2),
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
    p.timeUpdateEventInterval = 0.25; // Update every 100ms
  });


  // ── Background music setup ──
// Pulls the saved music track (if any) from the project, and creates a
// second, independent audio player for it. This runs in parallel to the
// video's own player — they are kept in sync manually (see togglePlayback
// and the timeUpdate listener below), since expo-video and expo-audio
// don't share a clock automatically.
const backgroundMusic = project?.backgroundMusic;
const musicPlayer = useAudioPlayer(backgroundMusic?.uri ?? null);
// Keep the music player's volume live-synced to whatever the user sets
// in MusicToolPanel, without needing a manual "apply" step.
useEffect(() => {
  if (backgroundMusic) {
    musicPlayer.volume = backgroundMusic.volume ?? 0.5;
  }
}, [backgroundMusic?.volume]);



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
  });

  const [currentTime, setCurrentTime] = useState(player.currentTime ?? 0);
  const [currentLoadedUri, setCurrentLoadedUri] = useState<string | null>(null);

  // Sync player source on active clip change
  useEffect(() => {
    if (activeClip?.uri && activeClip.uri !== currentLoadedUri) {
      player.replace(activeClip.uri);
      setCurrentLoadedUri(activeClip.uri);
      const startMs = activeClip.trimStartMs ?? 0;
      player.currentTime = startMs / 1000;
      setCurrentTime(startMs / 1000);
    }
  }, [activeClip?.uri, currentLoadedUri]);

  //for the real time video audio volume//
  useEffect(() => {
    if (activeClip) {
      player.volume = activeClip.volume ?? 1;
    }
  }, [activeClip?.volume, player.volume]);

  //for the real time video speed//
  useEffect(() => {
    if (activeClip) {
      player.playbackRate = activeClip.speed ?? 1;
    }
  }, [activeClip?.speed, player]);
  
  // Handle active clip playback endpoint
useEventListener(player, "timeUpdate", (payload) => {
  if (!activeClip) return;
  const trimEndMs = activeClip.trimEndMs ?? activeClip.durationMs;
  const curTimeMs = payload.currentTime * 1000;
  // ── Background music sync — runs every tick, independent of clip end ──
  if (backgroundMusic) {
    const musicStart = backgroundMusic.startMs ?? 0;
    const musicTrimStart = backgroundMusic.trimStartMs ?? 0;
    const musicTrimEnd = backgroundMusic.trimEndMs ?? backgroundMusic.durationMs ?? 0;
    const timelinePosMs = curTimeMs;
    const shouldBePlayingMusic =
      timelinePosMs >= musicStart &&
      timelinePosMs < musicStart + (musicTrimEnd - musicTrimStart);
    if (shouldBePlayingMusic && !musicPlayer.playing) {
      const offsetMs = timelinePosMs - musicStart + musicTrimStart;
      musicPlayer.seekTo(offsetMs / 1000)
        .then(() => musicPlayer.play())
        .catch((e) => console.log("music seek failed:", e));
    } else if (!shouldBePlayingMusic && musicPlayer.playing) {
      musicPlayer.pause();
    }
  }
  // ── end background music sync ──
  if (curTimeMs >= trimEndMs) {
    const activeIdx = clips.findIndex((c) => c.id === activeClip.id);
    if (activeIdx !== -1 && activeIdx + 1 < clips.length) {
      // Play the outgoing clip's transition effect across the cut.
      const outgoing = activeClip.transitionOut;
      if (outgoing && outgoing.type !== "none") {
        runTransitionEffect(outgoing.durationMs || 500);
      }
      const nextClip = clips[activeIdx + 1];
      setSelectedClipId(nextClip.id);
      player.pause();
      player.replace(nextClip.uri);
      const nextStart = nextClip.trimStartMs ?? 0;
      player.currentTime = nextStart / 1000;
      player.play();
    } else {
      player.pause();
      player.currentTime = trimEndMs / 1000;
    }
  } else {
    setCurrentTime(payload.currentTime);
  }
});


const togglePlayback = () => {
  const currentlyPlaying = player.playing;
  if (currentlyPlaying) {
    player.pause();
    musicPlayer.pause();
  } else {
    if (activeClip) {
      const trimStartMs = activeClip.trimStartMs ?? 0;
      const trimEndMs = activeClip.trimEndMs ?? activeClip.durationMs;
      const posMs = currentTime * 1000; // use React state, not player.currentTime
      if (posMs < trimStartMs || posMs >= trimEndMs) {
        player.currentTime = trimStartMs / 1000;
        setCurrentTime(trimStartMs / 1000); // keep state in sync immediately
      }
    }
    player.play();
    musicPlayer.play();
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
  const totalSeconds = Math.max(1, Math.ceil(totalDurationMs / 1000));

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

      if (targetClip.id !== activeClip.id) {
        setSelectedClipId(targetClip.id);
        player.replace(targetClip.uri);
      }
      player.currentTime = targetPlayerTimeSec;
      setCurrentTime(targetPlayerTimeSec);
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
  const activeVisibleOverlays = useMemo(() => {
    if (!activeClip) return [];
    const localTimeMs = currentTime * 1000;
    return (activeClip.textOverlays ?? []).filter(
      (o) =>
        localTimeMs >= o.startMs && localTimeMs <= o.startMs + o.durationMs,
    );
  }, [activeClip, currentTime]);

  // Toolbar Actions
  const handleSplit = () => {
    if (!activeClip) return;
    const splitTimeMs = currentTime * 1000;
    splitClip(activeClip.id, splitTimeMs);
    Alert.alert(
      "Clip Split",
      "The clip has been split at the playhead position.",
    );
  };

  const handleDuplicate = () => {
    if (!activeClip) return;
    duplicateClip(activeClip.id);
    Alert.alert("Clip Duplicated", "The clip has been duplicated.");
  };

  const handleDelete = () => {
    if (!activeClip) return;
    deleteClip(activeClip.id);
    Alert.alert("Clip Deleted", "The clip has been removed.");
  };

  const handleToolPress = (
    toolLabel: string,
    overlayId: string | null = null,
  ) => {
    setActiveToolLabel(toolLabel);
    setSelectedOverlayId(overlayId ?? null);
  };

  const closeToolPanel = () => {
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
  setCropOverlayVisible(true);
  closeToolPanel(); // hides CropRatioPanel/EditToolPanel since overlay takes over
};
const handleConfirmCrop = (cropData: {
  cropRatioId: string;
  cropOffsetX: number;
  cropOffsetY: number;
  cropZoom: number;
}) => {
  if (activeClip) {
    updateClipCrop(activeClip.id, cropData);
  }
  setCropOverlayVisible(false);
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

const handleGenerateCaptions = async (): Promise<number> => {
  if (!activeClip) throw new Error("Select a clip first.");
  const uri = activeClip.uri || "";
  if (!/^https?:\/\//i.test(uri)) {
    throw new Error(
      "Captions need the uploaded clip. Wait for the upload to finish, then try again."
    );
  }
  const segments = await captionService.generateCaptions(uri);
  if (!segments.length) throw new Error("No speech detected in this clip.");

  // Regenerating replaces previous AI captions instead of stacking them.
  captionOverlays.forEach((o) => removeTextOverlay(activeClip.id, o.id));

  const clipEnd = activeClip.durationMs;
  let added = 0;
  segments.forEach((seg) => {
    if (seg.startMs >= clipEnd) return;
    const startMs = Math.max(0, seg.startMs);
    const durationMs = Math.max(600, Math.min(seg.endMs, clipEnd) - startMs);
    const id = addTextOverlay(activeClip.id, seg.text, startMs, durationMs);
    // Caption look: bottom-centered, subtitle-sized, on a soft dark pill.
    updateTextOverlay(activeClip.id, id, {
      isAiGenerated: true,
      x: 0.5,
      y: 0.82,
      fontSize: 15,
      fontWeight: "bold",
      color: "#FFFFFF",
      backgroundColor: "#000000",
      backgroundOpacity: 0.55,
      backgroundRadius: 6,
      animationIn: "fade",
    });
    added++;
  });
  return added;
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
          <TouchableOpacity onPress={() => navigation.navigate("uploadvideo")}>
            <Text style={{ color: COLORS.yellow, marginTop: verticalScale(8) }}>
              Upload a clip
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
        onPress={() => setShowExportConfirm(true)}
        style={styles.headerBtn}>
          <Ionicons
            name="share-outline"
            size={scale(22)}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn}>
          <Text style={styles.videoTitle}>Edit</Text>
        </TouchableOpacity>
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
                      },
                    ]}
                  >
                    <Text style={styles.stackedAvatarText}>{m.initials}</Text>
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

      {/* Video Preview */}
      <View style={styles.previewWrapper}>
        <View 
          onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
      setPreviewSize({ width, height });
     }}
        style={styles.previewContainer}
        >
          {activeClip ? (
            <VideoView
              style={styles.videoView}
              player={player}
              contentFit="cover"
              nativeControls={false}
            />
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

          {activeClip && (
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

          {/* Transition effect — brief fade as playback crosses a clip boundary */}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "#000", opacity: transitionFade, zIndex: 15 },
            ]}
          />

   
      
      {activeVisibleOverlays.map((o) => (
      <DraggableOverlay
        key={o.id}
        overlay={o}
        previewSize={previewSize}
        onTap={() => handleToolPress("Text", o.id)}
        onDragEnd={(x, y) => {
          if (activeClip) updateTextOverlay(activeClip.id, o.id, { x, y });
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

          <View style={styles.videoTopBar} />
          <View style={styles.timestampOverlay}>
            <Text style={styles.timestampText}>
              {formatTime(currentPositionMs)}{" "}
              <Text style={styles.timestampMuted}>
                {formatTime(totalDurationMs)}
              </Text>
            </Text>
          </View>
          <View style={styles.videoControlRow}>
            <TouchableOpacity style={styles.videoControlIcon} hitSlop={8}>
              <Ionicons
                name="settings-outline"
                size={scale(20)}
                color={COLORS.textPrimary}
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
            <TouchableOpacity style={styles.videoControlIcon} hitSlop={8}>
              <Ionicons
                name="scan-outline"
                size={scale(20)}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Multi-track Timeline */}
      <View style={styles.timelineContainer}>
        {/* Playhead Vertical Line */}
        <View style={styles.playheadLine} pointerEvents="none" />

        <ScrollView
          ref={timelineScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
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
            width: totalSeconds * PX_PER_SECOND + SCREEN_WIDTH * 0.7,
          }}
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
              {/* Add Media Track Button */}
              <TouchableOpacity
                style={[
                  styles.addClipTrackBtn,
                  {
                    position: "absolute",
                    left: -scale(34),
                    top: verticalScale(10),
                  },
                ]}
                onPress={() => navigation.navigate("uploadvideo")}
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
                { marginTop: verticalScale(8) },
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
                    <View key={i} style={[styles.waveformBar, { height }]} />
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
      </View>

      {/* Bottom Toolbar */}
      <BottomToolbar
        onSplit={handleSplit}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onToolPress={handleToolPress}
      />

 {/* //for the filter tool panel  */}
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
  // NEW: background music panel — pick a file, adjust volume, or remove
  <MusicToolPanel
    visible={true}
    backgroundMusic={project?.backgroundMusic}
    onPick={(uri, durationMs) => setBackgroundMusic(uri, durationMs)}
    onVolumeChange={(volume) => updateBackgroundMusic({ volume })}
    onRemove={() => {
      removeBackgroundMusic();
      closeToolPanel();
    }}
    onClose={closeToolPanel}
  />
) : activeToolLabel === 'Captions' ? (
  // AI auto-captions — Whisper transcription → timed text overlays
  <CaptionsToolPanel
    visible={true}
    captionCount={captionOverlays.length}
    onGenerate={handleGenerateCaptions}
    onClearCaptions={handleClearCaptions}
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
    onClose={closeToolPanel}
  />

) : (
  /*for the edit tool panel  */
        <EditToolPanel
          visible={activeToolLabel !== null}
          toolLabel={activeToolLabel}
          onClose={closeToolPanel}
          volume={activeClip?.volume ?? 1}
          onVolumeChange={(v) =>
            activeClip && updateClipVolume(activeClip.id, v)
          }
          speed={activeClip?.speed ?? 1}
          onSpeedChange={(s) => activeClip && updateClipSpeed(activeClip.id, s)}
          textValue={activeOverlay?.text ?? ""}
          onTextChange={(text) =>
            activeClip &&
            selectedOverlayId &&
            updateTextOverlay(activeClip.id, selectedOverlayId, { text })
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
            updateTextOverlay(activeClip.id, selectedOverlayId, { fontSize })
          }
          onAddText={(text) => {
            if (!activeClip) return;
            addTextOverlay(activeClip.id, text, currentTime * 1000);
          }}
          isEditingExistingOverlay={!!selectedOverlayId}
          onDeleteOverlay={() => {
            if (activeClip && selectedOverlayId) {
              removeTextOverlay(activeClip.id, selectedOverlayId);
              setSelectedOverlayId(null);
            }
          }}
        />
)}

{/* {activeClip && (
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
)} */}

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

const styles = StyleSheet.create({
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
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(8),
  },
  headerBtn: {
    padding: scale(4),
  },
  previewWrapper: {
    flex: 1,
    paddingHorizontal: scale(16),
    marginVertical: verticalScale(4),
  },
  previewContainer: {
    flex: 1,
    borderRadius: scale(28),
    overflow: "hidden",
    backgroundColor: "#12252B",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
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
    backgroundColor: "rgba(19, 44, 53, 0.45)",
  },
  videoTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(14),
    zIndex: 10,
  },
  videoTitle: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(15),
    fontWeight: "700",
  },
  timestampOverlay: {
    position: "absolute",
    bottom: verticalScale(64),
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
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
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineContainer: {
    height: verticalScale(210),
    position: "relative",
    marginTop: verticalScale(8),
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
    backgroundColor: "#1E2230",
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
    backgroundColor: "#181A22",
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
    backgroundColor: "#151821",
    borderRadius: scale(2),
  },
  waveformContainer: {
    height: verticalScale(36),
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
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
    backgroundColor: "rgba(255,255,255,0.35)",
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
