import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTheme, ThemeColors, darkColors } from "../Contexts/ThemeContext";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  PanResponder,
  Alert,
  Image,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import * as Sharing from "expo-sharing";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEventListener } from "expo";
import { useAudioPlayer } from "expo-audio";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVideoProject } from "../Contexts/VideoProjectContext";
import { useProject } from "../Contexts/projectContext";
import { useAuth } from "../Contexts/Authcontext";
import { useExport } from "../Contexts/exportContext";
import { exportService } from "../services/exportService";
import { Export, VideoClip, VideoProject } from "../types";
import { ExportProgressSheet } from "../components/Exportsheet";
import { File, Paths } from "expo-file-system";
import { useRoute } from "@react-navigation/native";
import {
  isWowPathActive,
  markWowPathDone,
} from "../services/wowPathService";
import { getFilterById } from "../services/FilterService";
import { getAnimatedTextProps } from "../services/textAnimationUtils";
import { getMusicTracks } from "../services/BackgroundmusicService";
import { curveAverageSpeed } from "../services/speedCurves";

type Resolution = "720p" | "1080p" | "4K";
type Format = "MP4" | "MOV" | "WebM";

/** Approx video bitrate (Mbps) for size estimate — calibrated to our FFmpeg CRF path. */
const BITRATE_MBPS: Record<Resolution, number> = {
  "720p": 3.2,
  "1080p": 6.5,
  "4K": 18,
};
const FORMAT_FACTOR: Record<Format, number> = {
  MP4: 1,
  MOV: 1.12,
  WebM: 0.78,
};

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 0 : 2)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 10) return `${Math.round(mb)} MB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${Math.max(1, Math.round(kb))} KB`;
}

function clipTrimmedMs(clip: VideoClip): number {
  const trimStart = clip.trimStartMs ?? 0;
  const trimEnd = clip.trimEndMs ?? clip.durationMs;
  return Math.max(100, trimEnd - trimStart);
}

/** Output timeline length after speed / speed-curve (matches export bake). */
function clipOutputMs(clip: VideoClip): number {
  const trimmed = clipTrimmedMs(clip);
  const speed =
    clip.speedCurve && clip.speedCurve !== "none"
      ? curveAverageSpeed(clip.speedCurve)
      : Math.max(0.05, clip.speed ?? 1);
  return Math.max(100, Math.round(trimmed / speed));
}

function clipPlaybackRate(clip: VideoClip): number {
  if (clip.speedCurve && clip.speedCurve !== "none") {
    return Math.max(0.05, curveAverageSpeed(clip.speedCurve));
  }
  return Math.max(0.05, clip.speed ?? 1);
}
export default function ExportReviewScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  styles = makeStyles(colors);
  const confettiRef = useRef<any>(null);
  const route = useRoute<any>();
  const { currentVideoProject, updateClipCrop } = useVideoProject();
  const { currentProject } = useProject();
  const [resolution, setResolution] = useState<Resolution>("1080p");
  const [format, setFormat] = useState<Format>("MP4");
  const [quality, setQuality] = useState(80);
  const [aspectId, setAspectId] = useState<string>("tiktok");
  const [includeTextOverlays, setIncludeTextOverlays] = useState(true);
  const [includeFilters, setIncludeFilters] = useState(true);
  const [includeWatermark, setIncludeWatermark] = useState(false);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [wowNudge, setWowNudge] = useState(route.params?.wow === true);
  const [settingsPulse, setSettingsPulse] = useState(0);

  useEffect(() => {
    if (route.params?.wow) {
      setWowNudge(true);
      return;
    }
    void isWowPathActive().then((active) => {
      if (active) setWowNudge(true);
    });
  }, [route.params?.wow]);

  const { token } = useAuth();
  const { prependExport } = useExport();
  const [isExporting, setIsExporting] = useState(false);
  const [showProgressSheet, setShowProgressSheet] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [completedExport, setCompletedExport] = useState<Export | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportProject: VideoProject | null = useMemo(() => {
    const collabId = currentProject?.id;
    if (
      currentVideoProject &&
      (!collabId || currentVideoProject.projectId === collabId)
    ) {
      return {
        ...currentVideoProject,
        projectId: currentVideoProject.projectId || collabId || "",
        title: currentVideoProject.title || currentProject?.name || "Project",
      };
    }
    if (collabId) {
      return {
        id: `vp-${collabId}`,
        projectId: collabId,
        title: currentProject?.name || "Project",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clips: [],
        totalDurationMs: 0,
      };
    }
    return null;
  }, [currentVideoProject, currentProject]);

  const clips: VideoClip[] = useMemo(
    () =>
      [...(exportProject?.clips ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      ),
    [exportProject?.clips]
  );

  const segments = useMemo(() => {
    let cursor = 0;
    return clips.map((clip) => {
      const trimmed = clipTrimmedMs(clip);
      const outputMs = clipOutputMs(clip);
      const trimStart = clip.trimStartMs ?? 0;
      const seg = {
        clip,
        timelineStartMs: cursor,
        trimmedDurationMs: outputMs,
        sourceTrimmedMs: trimmed,
        trimStartMs: trimStart,
        trimEndMs: trimStart + trimmed,
        playbackRate: clipPlaybackRate(clip),
      };
      cursor += outputMs;
      return seg;
    });
  }, [clips]);

  const totalDurationMs = useMemo(
    () =>
      segments.reduce((a, s) => a + s.trimmedDurationMs, 0) ||
      exportProject?.totalDurationMs ||
      0,
    [segments, exportProject?.totalDurationMs]
  );

  const [timelineMs, setTimelineMs] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const wantPlayRef = useRef(false);
  const stillModeRef = useRef(false);

  const activeSeg =
    segments.find(
      (s) =>
        timelineMs >= s.timelineStartMs &&
        timelineMs < s.timelineStartMs + s.trimmedDurationMs
    ) ?? segments[0];
  const activeClip = activeSeg?.clip ?? null;
  const localTimeMs = activeSeg
    ? activeSeg.trimStartMs +
      (timelineMs - activeSeg.timelineStartMs) * activeSeg.playbackRate
    : 0;

  const isStillClip =
    activeClip?.kind === "flyer" ||
    activeClip?.kind === "title" ||
    (!!activeClip?.uri &&
      /\.(jpe?g|png|webp|gif|heic)(\?|$)/i.test(activeClip.uri));
  stillModeRef.current = isStillClip;

  const player = useVideoPlayer(
    !isStillClip && activeClip?.uri ? activeClip.uri : null,
    (p: any) => {
      p.loop = false;
      p.timeUpdateEventInterval = 0.15;
      try {
        p.audioMixingMode = "mixWithOthers";
        p.muted = false;
      } catch {
        /* ignore */
      }
    }
  );

  const musicTracks = useMemo(
    () => (exportProject ? getMusicTracks(exportProject) : []),
    [exportProject]
  );
  const musicUri = musicTracks[0]?.uri ?? null;
  const musicPlayer = useAudioPlayer(musicUri);

  useEventListener(player, "playingChange", (payload) => {
    if (stillModeRef.current) return;
    setIsPreviewPlaying(payload.isPlaying);
  });

  useEffect(() => {
    if (!activeClip || !activeSeg || isStillClip) return;
    try {
      player.replace(activeClip.uri);
      player.currentTime = localTimeMs / 1000;
      player.volume = activeClip.volume ?? 1;
      player.playbackRate = activeSeg.playbackRate;
      if (wantPlayRef.current) player.play();
    } catch (e) {
      console.log("[ExportPreview] replace failed", e);
    }
  }, [activeClip?.id, isStillClip]);

  // Still clips advance on a timer while "playing".
  useEffect(() => {
    if (!isStillClip || !activeSeg) return;
    const id = setInterval(() => {
      if (!wantPlayRef.current) return;
      setTimelineMs((prev) => {
        const next = prev + 100;
        const end = activeSeg.timelineStartMs + activeSeg.trimmedDurationMs;
        if (next >= end - 40) {
          const idx = segments.findIndex((s) => s.clip.id === activeSeg.clip.id);
          if (idx >= 0 && idx + 1 < segments.length) {
            return segments[idx + 1].timelineStartMs;
          }
          wantPlayRef.current = false;
          setIsPreviewPlaying(false);
          try {
            musicPlayer.pause();
          } catch {
            /* ignore */
          }
          return totalDurationMs;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [
    isStillClip,
    activeSeg?.clip.id,
    activeSeg?.timelineStartMs,
    activeSeg?.trimmedDurationMs,
    totalDurationMs,
    segments,
  ]);

  useEventListener(player, "timeUpdate", (payload) => {
    if (!activeSeg || !activeClip || !wantPlayRef.current || isStillClip) return;
    const clipLocalMs = payload.currentTime * 1000;
    if (clipLocalMs >= activeSeg.trimEndMs - 40) {
      const idx = segments.findIndex((s) => s.clip.id === activeClip.id);
      if (idx >= 0 && idx + 1 < segments.length) {
        const next = segments[idx + 1];
        setTimelineMs(next.timelineStartMs);
        try {
          if (next.clip.kind !== "flyer" && next.clip.kind !== "title") {
            player.replace(next.clip.uri);
            player.currentTime = next.trimStartMs / 1000;
            player.volume = next.clip.volume ?? 1;
            player.playbackRate = next.playbackRate;
            player.play();
          }
        } catch (e) {
          console.log("[ExportPreview] next clip failed", e);
        }
      } else {
        wantPlayRef.current = false;
        setIsPreviewPlaying(false);
        try {
          player.pause();
        } catch {
          /* ignore */
        }
        setTimelineMs(totalDurationMs);
        try {
          musicPlayer.pause();
        } catch {
          /* ignore */
        }
      }
      return;
    }
    const playedSourceMs = clipLocalMs - activeSeg.trimStartMs;
    setTimelineMs(
      activeSeg.timelineStartMs + playedSourceMs / activeSeg.playbackRate
    );
  });

  const syncMusicToTimeline = async (ms: number) => {
    if (!musicUri) return;
    const track = musicTracks[0];
    const start = track?.startMs ?? 0;
    const trimStart = track?.trimStartMs ?? 0;
    const wantSec = Math.max(0, (ms - start) / 1000 + trimStart / 1000);
    try {
      await musicPlayer.seekTo(wantSec);
    } catch {
      /* ignore */
    }
  };

  const seekPreviewTo = async (ms: number) => {
    const clamped = Math.max(0, Math.min(totalDurationMs, ms));
    setTimelineMs(clamped);
    const seg =
      segments.find(
        (s) =>
          clamped >= s.timelineStartMs &&
          clamped < s.timelineStartMs + s.trimmedDurationMs
      ) ?? segments[0];
    if (!seg) return;
    const local =
      seg.trimStartMs + (clamped - seg.timelineStartMs) * seg.playbackRate;
    if (seg.clip.kind !== "flyer" && seg.clip.kind !== "title" && seg.clip.uri) {
      try {
        if (activeClip?.id !== seg.clip.id) {
          player.replace(seg.clip.uri);
        }
        player.currentTime = local / 1000;
        player.playbackRate = seg.playbackRate;
        player.volume = seg.clip.volume ?? 1;
        if (wantPlayRef.current) player.play();
      } catch (e) {
        console.log("[ExportPreview] seek failed", e);
      }
    }
    await syncMusicToTimeline(clamped);
  };

  const visibleTexts = useMemo(() => {
    if (!activeClip || !includeTextOverlays) return [];
    return (activeClip.textOverlays ?? []).filter(
      (o) => localTimeMs >= o.startMs && localTimeMs <= o.startMs + o.durationMs
    );
  }, [activeClip, localTimeMs, includeTextOverlays]);

  const togglePreviewPlay = async () => {
    if (!activeClip && segments.length === 0) return;
    if (isPreviewPlaying || wantPlayRef.current) {
      wantPlayRef.current = false;
      setIsPreviewPlaying(false);
      try {
        player.pause();
        musicPlayer.pause();
      } catch {
        /* ignore */
      }
      return;
    }
    wantPlayRef.current = true;
    setIsPreviewPlaying(true);
    let startMs = timelineMs;
    if (timelineMs >= totalDurationMs - 50) {
      startMs = 0;
      setTimelineMs(0);
    }
    await seekPreviewTo(startMs);
    try {
      if (!isStillClip) player.play();
      if (musicUri) {
        musicPlayer.volume = musicTracks[0]?.volume ?? 0.55;
        await syncMusicToTimeline(startMs);
        musicPlayer.play();
      }
    } catch (e) {
      console.log("[ExportPreview] play failed", e);
    }
  };

  useEffect(() => {
    return () => {
      wantPlayRef.current = false;
      try {
        player.pause();
        musicPlayer.pause();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const handleExport = async () => {
    if (!exportProject?.projectId || !token) {
      setExportError("No project loaded for export.");
      return;
    }
    if (clips.length === 0) {
      setExportError("Add at least one clip before exporting.");
      Alert.alert("Nothing to export", "Add a video to the timeline first.");
      return;
    }
    setIsExporting(true);
    setShowProgressSheet(true);
    setExportProgress(0);
    setExportError(null);
    try {
      // Stamp platform aspect on every clip before bake.
      (exportProject.clips ?? []).forEach((c) => {
        if (c.id) updateClipCrop(c.id, { cropRatioId: aspectId });
      });
      const projectForBake: VideoProject = {
        ...exportProject,
        clips: (exportProject.clips ?? []).map((c) => ({
          ...c,
          cropRatioId: aspectId,
        })),
      };
      const result = await exportService.createExport(
        projectForBake,
        {
          resolution,
          format,
          quality,
          includeTextOverlays,
          includeFilters,
          includeWatermark,
        },
        (percent) => setExportProgress(percent),
        token,
      );

      setCompletedExport(result);
      await prependExport(result);
      setShowProgressSheet(false);
      confettiRef.current?.start();
      setTimeout(() => setShowSuccessSheet(true), 600);
    } catch (e: any) {
      const message = e?.message ?? "Export failed";
      setExportError(message);
      // Keep the progress sheet open in fail state so the error isn't buried.
    } finally {
      setIsExporting(false);
    }
  };

  const durationLabel = formatDuration(totalDurationMs);
  const filename = exportProject
    ? `${exportProject.title}.${format.toLowerCase()}`
    : "Project.mp4";

  const resolutionMeta = useMemo(() => {
    const portrait = aspectId !== "youtube";
    const short =
      resolution === "720p" ? 720 : resolution === "4K" ? 2160 : 1080;
    const long = Math.round((short * 16) / 9);
    const w = portrait ? short : long;
    const h = portrait ? long : short;
    const note =
      resolution === "720p"
        ? "Faster export · smaller file"
        : resolution === "4K"
          ? "Sharpest file · slower render"
          : "Best for Reels / TikTok";
    return { dims: `${w}×${h}`, note };
  }, [resolution, aspectId]);

  const exportPhaseQuote = useMemo(() => {
    if (exportProgress < 16) return "Preparing & uploading sources…";
    if (exportProgress < 28) return "Queuing render on the server…";
    if (exportProgress < 40) return "Downloading clips for FFmpeg…";
    if (exportProgress < 90) {
      return `Rendering ${resolution} ${format}…`;
    }
    return "Uploading finished video…";
  }, [exportProgress, resolution, format]);

  const pickResolution = (r: Resolution) => {
    setResolution(r);
    setSettingsPulse((n) => n + 1);
  };
  const pickFormat = (f: Format) => {
    setFormat(f);
    setSettingsPulse((n) => n + 1);
  };
  const pickAspect = (id: string) => {
    setAspectId(id);
    setSettingsPulse((n) => n + 1);
  };

  const { estimatedSizeLabel, estimatedSeconds } = useMemo(() => {
    const durationSec = Math.max(0.5, totalDurationMs / 1000);
    const qualityFactor = 0.55 + (quality / 100) * 0.7;
    // Slightly lower bitrate at ultrafast; aspect barely changes size.
    const aspectFactor = aspectId === "youtube" ? 1 : 0.92;
    const videoMbps =
      BITRATE_MBPS[resolution] *
      FORMAT_FACTOR[format] *
      qualityFactor *
      aspectFactor;
    const audioMbps = musicTracks.length > 0 ? 0.16 : 0.096;
    const bytes = ((videoMbps + audioMbps) * 1_000_000 * durationSec) / 8;
    // Upload overhead + ultrafast encode (optimistic on LAN).
    const localUploads = clips.filter(
      (c) => c.uri && !/^https?:\/\//i.test(c.uri) && c.kind !== "title"
    ).length;
    const encodeFactor =
      resolution === "4K" ? 1.35 : resolution === "1080p" ? 0.5 : 0.32;
    const seconds = Math.max(
      4,
      Math.round(
        durationSec * encodeFactor + clips.length * 0.9 + localUploads * 2.5
      )
    );
    return {
      estimatedSizeLabel: `~${formatFileSize(bytes)}`,
      estimatedSeconds: seconds,
    };
  }, [
    totalDurationMs,
    resolution,
    format,
    quality,
    clips.length,
    aspectId,
    musicTracks.length,
  ]);

  if (!exportProject?.projectId) {
    return (
      <SafeAreaView style={styles.emptyState} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={scale(24)} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Export</Text>
          <View style={{ width: scale(24) }} />
        </View>
        <Text style={styles.emptyText}>No project loaded</Text>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: verticalScale(40) }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={scale(24)} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Export</Text>
          <View style={{ width: scale(24) }} />
        </View>
        <View style={styles.previewBox}>
          {isStillClip && activeClip?.uri ? (
            <Image
              source={{ uri: activeClip.uri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="contain"
            />
          ) : activeClip?.uri ? (
            <VideoView
              style={StyleSheet.absoluteFillObject}
              player={player}
              contentFit="contain"
              nativeControls={false}
            />
          ) : activeClip?.kind === "title" ? (
            <View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor:
                    activeClip.titleCard?.backgroundColor ?? "#0B0D13",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: scale(20),
                },
              ]}
            >
              <Text
                style={{
                  color: activeClip.titleCard?.textColor ?? "#fff",
                  fontSize: moderateScale(activeClip.titleCard?.fontSize ?? 28),
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                {activeClip.titleCard?.title ?? "Title"}
              </Text>
              {activeClip.titleCard?.subtitle ? (
                <Text
                  style={{
                    color: activeClip.titleCard?.textColor ?? "#fff",
                    opacity: 0.8,
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  {activeClip.titleCard.subtitle}
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.previewPlaceholder}>
              <Ionicons name="film-outline" size={scale(32)} color="#555" />
              <Text style={styles.previewEmptyHint}>
                {clips.length === 0
                  ? "Add clips in the editor to preview"
                  : "No preview for this clip"}
              </Text>
            </View>
          )}
          {activeClip && includeFilters && !isStillClip ? (
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
          ) : null}
          {visibleTexts.map((o) => {
            const elapsed = Math.max(0, localTimeMs - o.startMs);
            const anim = getAnimatedTextProps(o, elapsed);
            return (
              <View
                key={o.id}
                pointerEvents="none"
                style={[
                  styles.previewTextOverlay,
                  {
                    left: `${(o.x ?? 0.5) * 100}%`,
                    top: `${(o.y ?? 0.5) * 100}%`,
                    opacity: anim.opacity,
                    transform: [
                      { translateX: -50 },
                      { translateY: -50 },
                      ...(anim.transform as any[]),
                    ],
                  },
                ]}
              >
                <Text
                  style={{
                    color: o.color ?? "#FFFFFF",
                    fontSize: moderateScale(o.fontSize ?? 18),
                    fontWeight: o.fontWeight ?? "700",
                    textAlign: o.align ?? "center",
                  }}
                >
                  {o.text}
                </Text>
              </View>
            );
          })}
          <TouchableOpacity
            style={styles.playButtonWrap}
            onPress={() => void togglePreviewPlay()}
            activeOpacity={0.85}
            accessibilityLabel={isPreviewPlaying ? "Pause preview" : "Play edited preview"}
          >
            <Ionicons
              name={isPreviewPlaying ? "pause" : "play"}
              size={scale(22)}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.durationLabel}>
            {formatDuration(timelineMs)} / {durationLabel}
          </Text>
          <Text style={styles.filenameLabel}>{filename}</Text>
        </View>
        {totalDurationMs > 0 ? (
          <PreviewScrubber
            progress={timelineMs / totalDurationMs}
            onSeek={(pct) => void seekPreviewTo(pct * totalDurationMs)}
          />
        ) : null}
        <Text style={styles.sectionLabel}>ASPECT · SHARE PRESET</Text>
        <View style={styles.pillRow}>
          {(
            [
              { id: "tiktok", label: "9:16" },
              { id: "square", label: "1:1" },
              { id: "youtube", label: "16:9" },
              { id: "instagram_feed", label: "4:5" },
            ] as const
          ).map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.pill, aspectId === a.id && styles.pillActive]}
              onPress={() => pickAspect(a.id)}
            >
              <Text
                style={[
                  styles.pillText,
                  aspectId === a.id && styles.pillTextActive,
                ]}
              >
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.sectionLabel}>RESOLUTION</Text>
        <Text style={styles.settingHint}>
          Changes the exported file size — not the live preview. Server bakes{" "}
          {resolutionMeta.dims}.
        </Text>
        <View style={styles.pillRow}>
          {(["720p", "1080p", "4K"] as Resolution[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.pill, resolution === r && styles.pillActive]}
              onPress={() => pickResolution(r)}
            >
              <Text
                style={[
                  styles.pillText,
                  resolution === r && styles.pillTextActive,
                ]}
              >
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.resolutionMeta}>
          {resolution} · {resolutionMeta.dims} · {resolutionMeta.note}
        </Text>
        <Text style={styles.sectionLabel}>FORMAT</Text>
        <View style={styles.pillRow}>
          {(["MP4", "MOV", "WebM"] as Format[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.pill, format === f && styles.pillActive]}
              onPress={() => pickFormat(f)}
            >
              <Text
                style={[styles.pillText, format === f && styles.pillTextActive]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.qualityHeaderRow}>
          <Text style={styles.sectionLabelInline}>QUALITY</Text>
          <Text style={styles.qualityValue}>{quality}%</Text>
        </View>
        <QualitySlider value={quality} onChange={setQuality} />
        <Text style={styles.sectionLabel}>INCLUDE</Text>
        <ToggleRow
          icon="text"
          label="Text overlays"
          value={includeTextOverlays}
          onChange={setIncludeTextOverlays}
        />
        <ToggleRow
          icon="options"
          label="Applied filters"
          value={includeFilters}
          onChange={setIncludeFilters}
        />
        <ToggleRow
          icon="people"
          label="Collaborator watermark"
          value={includeWatermark}
          onChange={setIncludeWatermark}
        />
        <View
          key={`est-${settingsPulse}`}
          style={[
            styles.estimateBanner,
            settingsPulse > 0 && styles.estimateBannerPulse,
          ]}
        >
          <View>
            <Text style={styles.estimateLabel}>Est. file size</Text>
            <Text style={styles.estimateValue}>{estimatedSizeLabel}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.estimateLabel}>Est. export time</Text>
            <Text style={styles.estimateValue}>~{estimatedSeconds}s</Text>
          </View>
        </View>
        <Text style={styles.estimateFoot}>
          Estimates update when you change resolution / format / quality.
        </Text>
        {clips.length > 0 ? (
          <Text style={styles.estimateHint}>
            {clips.length} clip{clips.length === 1 ? "" : "s"} ·{" "}
            {durationLabel} timeline
            {musicTracks.length ? " · music" : ""}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.exportButton,
            (isExporting || clips.length === 0) && { opacity: 0.7 },
          ]}
          onPress={() => void handleExport()}
          disabled={isExporting || clips.length === 0}
        >
          {isExporting ? (
            <Text style={styles.exportButtonText}>
              Exporting... {Math.round(exportProgress)}%
            </Text>
          ) : (
            <>
              <Ionicons name="download" size={scale(18)} color={colors.accentOn} />
              <Text style={styles.exportButtonText}>Export video</Text>
            </>
          )}
        </TouchableOpacity>
        {exportError && !showProgressSheet ? (
          <Text style={styles.errorText}>{exportError}</Text>
        ) : null}
      </ScrollView>

      <ExportProgressSheet
        visible={showProgressSheet}
        progress={exportProgress}
        quote={exportPhaseQuote}
        isDone={false}
        error={isExporting ? null : exportError}
        onClose={() => {
          setShowProgressSheet(false);
        }}
        onRetry={() => {
          setExportError(null);
          void handleExport();
        }}
      />

      {showSuccessSheet && completedExport && (
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetIconWrap}>
              <Ionicons name="checkmark" size={scale(28)} color={colors.accentOn} />
            </View>
            <Text style={styles.sheetTitle}>Export complete</Text>
            <Text style={styles.sheetSubtitle}>
              {completedExport.title}.{completedExport.format.toLowerCase()} ·{" "}
              {completedExport.resolution}
              {"\n"}Open TikTok / Reels / Shorts from the share sheet and post.
            </Text>

            <TouchableOpacity
              style={styles.sheetPrimaryButton}
              onPress={async () => {
                try {
                  const url = completedExport.fileUrl;
                  if (!url) {
                    Alert.alert("Unavailable", "No download URL for this export.");
                    return;
                  }
                  const available = await Sharing.isAvailableAsync();
                  if (!available) {
                    Alert.alert("Sharing unavailable", "Sharing is not supported on this device.");
                    return;
                  }
                  // Remote HTTP URLs often fail with Sharing — cache locally first.
                  let localUri = url;
                  if (/^https?:\/\//i.test(url)) {
                    const ext = (completedExport.format || "mp4").toLowerCase();
                    const dest = new File(
                      Paths.cache,
                      `vydora-export-${completedExport.id}.${ext}`
                    );
                    const downloaded = await File.downloadFileAsync(url, dest, {
                      idempotent: true,
                    });
                    localUri = downloaded.uri;
                  }
                  await Sharing.shareAsync(localUri, {
                    mimeType: "video/mp4",
                    UTI: "public.movie",
                    dialogTitle: "Share to TikTok, Reels, Shorts…",
                  });
                } catch (e: any) {
                  console.log("share failed", e);
                  Alert.alert(
                    "Share failed",
                    e?.message || "Could not share this file. Try again from the Exports tab."
                  );
                }
                if (wowNudge) await markWowPathDone();
                setShowSuccessSheet(false);
              }}
            >
              <Ionicons name="share-outline" size={scale(16)} color={colors.accentOn} />
              <Text style={styles.sheetPrimaryText}>Share MP4 to apps</Text>
            </TouchableOpacity>

            {wowNudge ? (
              <TouchableOpacity
                style={styles.sheetInviteButton}
                onPress={async () => {
                  await markWowPathDone();
                  setWowNudge(false);
                  setShowSuccessSheet(false);
                  navigation?.navigate("referral");
                }}
              >
                <Ionicons name="gift-outline" size={scale(16)} color={colors.accent} />
                <Text style={styles.sheetInviteText}>
                  Invite a friend — both get Pro
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.sheetSecondaryButton}
              onPress={async () => {
                if (wowNudge) await markWowPathDone();
                setShowSuccessSheet(false);
                navigation?.navigate("export");
              }}
            >
              <Text style={styles.sheetSecondaryText}>View exports</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetSecondaryButton}
              onPress={async () => {
                if (wowNudge) await markWowPathDone();
                setShowSuccessSheet(false);
              }}
            >
              <Text style={styles.sheetSecondaryText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {completedExport && (
        <ConfettiCannon
          ref={confettiRef}
          count={80}
          origin={{ x: scale(160), y: 0 }}
          fallSpeed={3000}
          explosionSpeed={350}
          fadeOut
          colors={["#F5C518", "#ffffff"]}
        />
      )}
    </SafeAreaView>
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onChange,
}: {
  icon: string;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLeft}>
        <Ionicons name={icon as any} size={scale(18)} color="#ccc" />
        <Text style={styles.toggleLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#333", true: "#F5C518" }}
        thumbColor="#fff"
      />
    </View>
  );
}

const SCRUB_WIDTH = scale(300);
function PreviewScrubber({
  progress,
  onSeek,
}: {
  progress: number;
  onSeek: (pct: number) => void;
}) {
  const trackRef = useRef<View>(null);
  const trackX = useRef(0);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const x = Math.max(0, Math.min(SCRUB_WIDTH, evt.nativeEvent.locationX));
          onSeek(x / SCRUB_WIDTH);
        },
        onPanResponderMove: (evt) => {
          const x = Math.max(0, Math.min(SCRUB_WIDTH, evt.nativeEvent.locationX));
          onSeek(x / SCRUB_WIDTH);
        },
      }),
    [onSeek]
  );
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View
      ref={trackRef}
      style={styles.scrubTrack}
      {...panResponder.panHandlers}
      onLayout={(e) => {
        trackX.current = e.nativeEvent.layout.x;
      }}
    >
      <View style={[styles.scrubFill, { width: `${pct * 100}%` }]} />
      <View style={[styles.scrubThumb, { left: `${pct * 100}%` }]} />
    </View>
  );
}

const SLIDER_WIDTH = scale(280);
function QualitySlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_evt, gestureState) => {
          const x = Math.max(
            0,
            Math.min(SLIDER_WIDTH, gestureState.moveX - SLIDER_X_OFFSET),
          );
          const pct = Math.round((x / SLIDER_WIDTH) * 100);
          onChange(pct);
        },
      }),
    [onChange],
  );
  return (
    <View style={styles.sliderTrack} {...panResponder.panHandlers}>
      <View style={[styles.sliderFill, { width: `${value}%` }]} />
      <View style={[styles.sliderThumb, { left: `${value}%` }]} />
    </View>
  );
}

const SLIDER_X_OFFSET = scale(20);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scroll: { flex: 1 },
  emptyState: {
    flex: 1,
    backgroundColor: c.background,
  },
  emptyText: {
    color: c.textMuted,
    fontSize: moderateScale(14),
    textAlign: "center",
    marginTop: verticalScale(40),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
  },
  headerTitle: {
    color: c.text,
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  previewBox: {
    marginHorizontal: scale(16),
    height: verticalScale(180),
    borderRadius: scale(10),
    backgroundColor: c.background,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  previewPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: verticalScale(8),
  },
  previewEmptyHint: {
    color: "#666",
    fontSize: moderateScale(12),
    textAlign: "center",
    paddingHorizontal: scale(24),
  },
  scrubTrack: {
    height: scale(18),
    marginHorizontal: scale(16),
    marginTop: verticalScale(10),
    borderRadius: scale(9),
    backgroundColor: c.border,
    justifyContent: "center",
    overflow: "visible",
  },
  scrubFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: c.accent,
    borderRadius: scale(9),
  },
  scrubThumb: {
    position: "absolute",
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    backgroundColor: "#fff",
    marginLeft: -scale(7),
    top: scale(2),
    borderWidth: 1,
    borderColor: c.accent,
  },
  previewTextOverlay: {
    position: "absolute",
    maxWidth: "80%",
    zIndex: 4,
  },
  playButtonWrap: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -scale(20),
    marginLeft: -scale(20),
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: c.text,
    justifyContent: "center",
    alignItems: "center",
  },
  durationLabel: {
    position: "absolute",
    bottom: verticalScale(10),
    left: scale(12),
    color: c.text,
    fontSize: moderateScale(12),
  },
  filenameLabel: {
    position: "absolute",
    bottom: verticalScale(10),
    right: scale(12),
    color: c.textMuted,
    fontSize: moderateScale(12),
  },
  sectionLabel: {
    color: "#777",
    fontSize: moderateScale(11),
    letterSpacing: 0.5,
    marginTop: verticalScale(18),
    marginBottom: verticalScale(8),
    marginHorizontal: scale(16),
  },
  sectionLabelInline: {
    color: "#777",
    fontSize: moderateScale(11),
    letterSpacing: 0.5,
  },
  pillRow: {
    flexDirection: "row",
    marginHorizontal: scale(16),
    gap: scale(8),
  },
  pill: {
    flex: 1,
    paddingVertical: verticalScale(10),
    borderRadius: scale(8),
    backgroundColor: c.card,
    alignItems: "center",
  },
  pillActive: { backgroundColor: c.accent },
  pillText: {
    color: c.textMuted,
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  pillTextActive: { color: c.accentOn },
  qualityHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: scale(16),
    marginTop: verticalScale(18),
  },
  qualityValue: { color: c.text, fontSize: moderateScale(12) },
  sliderTrack: {
    height: verticalScale(4),
    backgroundColor: c.border,
    borderRadius: 2,
    marginHorizontal: scale(16),
    marginTop: verticalScale(10),
    justifyContent: "center",
  },
  sliderFill: {
    height: verticalScale(4),
    backgroundColor: c.accent,
    borderRadius: 2,
  },
  sliderThumb: {
    position: "absolute",
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    backgroundColor: c.accent,
    marginLeft: -scale(7),
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222",
  },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: scale(10) },
  toggleLabel: { color: "#eee", fontSize: moderateScale(14) },
  estimateBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(245,197,24,0.12)",
    marginHorizontal: scale(16),
    marginTop: verticalScale(16),
    padding: scale(14),
    borderRadius: scale(8),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(245,197,24,0.25)",
  },
  estimateBannerPulse: {
    backgroundColor: "rgba(245,197,24,0.22)",
    borderColor: c.accent,
  },
  estimateLabel: { color: "#999", fontSize: moderateScale(11) },
  estimateValue: {
    color: c.accent,
    fontSize: moderateScale(15),
    fontWeight: "700",
    marginTop: 2,
  },
  estimateHint: {
    color: "#777",
    fontSize: moderateScale(11),
    marginHorizontal: scale(16),
    marginTop: verticalScale(6),
  },
  estimateFoot: {
    color: "#888",
    fontSize: moderateScale(11),
    marginHorizontal: scale(16),
    marginTop: verticalScale(8),
    lineHeight: moderateScale(16),
  },
  settingHint: {
    color: "#888",
    fontSize: moderateScale(12),
    lineHeight: moderateScale(17),
    marginHorizontal: scale(16),
    marginBottom: verticalScale(10),
  },
  resolutionMeta: {
    color: c.accent,
    fontSize: moderateScale(12),
    fontWeight: "700",
    marginHorizontal: scale(16),
    marginBottom: verticalScale(14),
    lineHeight: moderateScale(17),
  },
  exportButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scale(8),
    backgroundColor: c.accent,
    marginHorizontal: scale(16),
    marginTop: verticalScale(18),
    paddingVertical: verticalScale(14),
    borderRadius: scale(10),
  },
  exportButtonText: {
    color: c.accentOn,
    fontWeight: "700",
    fontSize: moderateScale(14),
  },
  errorText: {
    color: "#ff5c5c",
    textAlign: "center",
    marginTop: verticalScale(8),
    marginHorizontal: scale(16),
    fontSize: moderateScale(12),
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    zIndex: 20,
  },
  sheetCard: {
    backgroundColor: c.card,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    padding: scale(24),
    alignItems: "center",
  },
  sheetIconWrap: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: c.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(14),
  },
  sheetTitle: {
    color: c.text,
    fontSize: moderateScale(18),
    fontWeight: "700",
  },
  sheetSubtitle: {
    color: "#999",
    fontSize: moderateScale(12),
    marginTop: verticalScale(6),
    marginBottom: verticalScale(20),
  },
  sheetPrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(6),
    backgroundColor: c.accent,
    width: "100%",
    paddingVertical: verticalScale(14),
    borderRadius: scale(10),
    marginBottom: verticalScale(10),
  },
  sheetPrimaryText: {
    color: c.accentOn,
    fontWeight: "700",
    fontSize: moderateScale(14),
  },
  sheetInviteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(6),
    width: "100%",
    paddingVertical: verticalScale(13),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: c.accent,
    marginBottom: verticalScale(8),
  },
  sheetInviteText: {
    color: c.accent,
    fontWeight: "700",
    fontSize: moderateScale(13),
  },
  sheetSecondaryButton: { paddingVertical: verticalScale(10) },
  sheetSecondaryText: { color: c.textMuted, fontSize: moderateScale(13) },
});
}
let styles = makeStyles(darkColors);

