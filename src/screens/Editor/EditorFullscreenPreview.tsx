/**
 * Fullscreen editor preview — immersive view of the timeline playhead.
 *
 * Opened from the expand (scan) icon on the editor preview. Same black/yellow
 * Vydora chrome as the main editor. Back returns to the timeline editor;
 * optional jump to Export from the top bar.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useVideoProject } from '../Contexts/VideoProjectContext';
import { useProject } from '../Contexts/projectContext';
import { getFilterById } from '../services/FilterService';
import { getAnimatedTextProps } from '../services/textAnimationUtils';
import { VideoClip } from '../types';
import { useAppPalette } from '../Contexts/ThemeContext';


let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  textMuted: '#5A6275',
};

const { width: SCREEN_W } = Dimensions.get('window');

function formatTime(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

type RouteParams = {
  /** Project-timeline ms to resume from when opening. */
  positionMs?: number;
};

export default function EditorFullscreenPreview() {
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

  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = (route.params ?? {}) as RouteParams;
  const startAtMs = Math.max(0, params.positionMs ?? 0);

  const { currentVideoProject } = useVideoProject();
  const { currentProject } = useProject();

  const project =
    currentVideoProject && currentVideoProject.projectId === currentProject?.id
      ? currentVideoProject
      : null;

  const clips: VideoClip[] = useMemo(
    () => [...(project?.clips ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [project?.clips]
  );

  const segments = useMemo(() => {
    let cursor = 0;
    return clips.map((clip) => {
      const trimStart = clip.trimStartMs ?? 0;
      const trimEnd = clip.trimEndMs ?? clip.durationMs;
      const trimmed = Math.max(100, trimEnd - trimStart);
      const seg = {
        clip,
        timelineStartMs: cursor,
        trimmedDurationMs: trimmed,
        trimStartMs: trimStart,
        trimEndMs: trimEnd,
      };
      cursor += trimmed;
      return seg;
    });
  }, [clips]);

  const totalDurationMs = segments.reduce((a, s) => a + s.trimmedDurationMs, 0);

  const [timelineMs, setTimelineMs] = useState(
    Math.min(startAtMs, Math.max(0, totalDurationMs - 1))
  );

  const activeSeg =
    segments.find(
      (s) =>
        timelineMs >= s.timelineStartMs &&
        timelineMs < s.timelineStartMs + s.trimmedDurationMs
    ) ?? segments[0];

  const activeClip = activeSeg?.clip ?? null;
  const localTimeMs = activeSeg
    ? activeSeg.trimStartMs + (timelineMs - activeSeg.timelineStartMs)
    : 0;

  const player = useVideoPlayer(activeClip?.uri ?? null, (p: any) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.2;
    try {
      p.audioMixingMode = 'mixWithOthers';
      p.muted = false;
    } catch {
      /* ignore */
    }
  });

  const [isPlaying, setIsPlaying] = useState(false);
  useEventListener(player, 'playingChange', (payload) => {
    setIsPlaying(payload.isPlaying);
  });

  // Seek into the right clip/local time when the active segment or start changes.
  useEffect(() => {
    if (!activeClip || !activeSeg) return;
    try {
      if (player.currentTime !== undefined) {
        // Only replace source when URI changes.
      }
      player.currentTime = localTimeMs / 1000;
      player.volume = activeClip.volume ?? 1;
      player.playbackRate = activeClip.speed ?? 1;
    } catch (e) {
      console.log('[FullscreenPreview] seek failed', e);
    }
  }, [activeClip?.id]);

  // Initial seek to the playhead from the editor.
  useEffect(() => {
    if (!activeSeg || !activeClip) return;
    const local =
      activeSeg.trimStartMs +
      (Math.min(startAtMs, totalDurationMs - 1) - activeSeg.timelineStartMs);
    try {
      player.currentTime = Math.max(0, local) / 1000;
    } catch {
      /* ignore */
    }
  }, []);

  useEventListener(player, 'timeUpdate', (payload) => {
    if (!activeSeg || !activeClip) return;
    const clipLocalMs = payload.currentTime * 1000;
    const trimEnd = activeSeg.trimEndMs;
    if (clipLocalMs >= trimEnd) {
      const idx = segments.findIndex((s) => s.clip.id === activeClip.id);
      if (idx >= 0 && idx + 1 < segments.length) {
        const next = segments[idx + 1];
        setTimelineMs(next.timelineStartMs);
        try {
          player.replace(next.clip.uri);
          player.currentTime = next.trimStartMs / 1000;
          player.play();
        } catch (e) {
          console.log('[FullscreenPreview] next clip failed', e);
        }
      } else {
        player.pause();
        setTimelineMs(totalDurationMs);
      }
      return;
    }
    setTimelineMs(
      activeSeg.timelineStartMs + (clipLocalMs - activeSeg.trimStartMs)
    );
  });

  // Swap player source when scrubbing into another clip.
  useEffect(() => {
    if (!activeClip) return;
    try {
      // replace only if needed — expo-video keeps last URI; force via replace when id changes
      player.replace(activeClip.uri);
      player.currentTime = localTimeMs / 1000;
      if (isPlaying) player.play();
    } catch (e) {
      console.log('[FullscreenPreview] replace failed', e);
    }
  }, [activeClip?.id]);

  const visibleTexts = useMemo(() => {
    if (!activeClip) return [];
    return (activeClip.textOverlays ?? []).filter(
      (o) => localTimeMs >= o.startMs && localTimeMs <= o.startMs + o.durationMs
    );
  }, [activeClip, localTimeMs]);

  const togglePlay = () => {
    if (isPlaying) player.pause();
    else player.play();
  };

  const skipBy = (deltaMs: number) => {
    const next = Math.max(0, Math.min(totalDurationMs, timelineMs + deltaMs));
    setTimelineMs(next);
    const seg =
      segments.find(
        (s) =>
          next >= s.timelineStartMs &&
          next < s.timelineStartMs + s.trimmedDurationMs
      ) ?? segments[0];
    if (!seg) return;
    const local = seg.trimStartMs + (next - seg.timelineStartMs);
    try {
      if (seg.clip.id !== activeClip?.id) {
        player.replace(seg.clip.uri);
      }
      player.currentTime = local / 1000;
    } catch (e) {
      console.log('[FullscreenPreview] skip failed', e);
    }
  };

  const progress = totalDurationMs > 0 ? timelineMs / totalDurationMs : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Top chrome — back + title + export */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={scale(26)} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          Preview
        </Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate('reviewexport')}
          hitSlop={10}
        >
          <Ionicons name="share-outline" size={scale(22)} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Immersive video stage */}
      <View style={styles.stage}>
        {activeClip ? (
          <VideoView
            style={styles.video}
            player={player}
            contentFit="contain"
            nativeControls={false}
          />
        ) : (
          <View style={[styles.video, styles.empty]}>
            <Ionicons name="film-outline" size={scale(40)} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No clip to preview</Text>
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

        {/* Text overlays — view-only, CapCut-style on the big canvas */}
        {visibleTexts.map((o) => {
          const elapsed = Math.max(0, localTimeMs - o.startMs);
          const anim = getAnimatedTextProps(o, elapsed);
          return (
            <View
              key={o.id}
              pointerEvents="none"
              style={[
                styles.textOverlay,
                {
                  left: `${(o.x ?? 0.5) * 100}%`,
                  top: `${(o.y ?? 0.5) * 100}%`,
                  opacity: anim.opacity,
                  transform: [
                    { translateX: -50 },
                    { translateY: -50 },
                    ...anim.transform,
                  ],
                },
              ]}
            >
              <Text
                style={{
                  color: o.color ?? '#FFFFFF',
                  fontSize: scale(o.fontSize ?? 24),
                  fontWeight: o.fontWeight === 'bold' ? '700' : '400',
                  textAlign: o.align ?? 'center',
                  backgroundColor: o.backgroundColor
                    ? `${o.backgroundColor}${Math.round((o.backgroundOpacity ?? 0.6) * 255)
                        .toString(16)
                        .padStart(2, '0')}`
                    : 'transparent',
                  borderRadius: scale(o.backgroundRadius ?? 0),
                  paddingHorizontal: scale(10),
                  paddingVertical: verticalScale(4),
                  overflow: 'hidden',
                }}
              >
                {anim.displayText}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Progress + transport */}
      <View style={styles.bottomChrome}>
        <Text style={styles.timeLabel}>
          {formatTime(timelineMs)}
          <Text style={styles.timeMuted}> / {formatTime(totalDurationMs)}</Text>
        </Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%` }]} />
          <View style={[styles.progressThumb, { left: `${Math.min(100, progress * 100)}%` }]} />
        </View>

        <View style={styles.transport}>
          <TouchableOpacity style={styles.transportBtn} onPress={() => skipBy(-5000)} hitSlop={8}>
            <Ionicons name="play-back" size={scale(22)} color={COLORS.textPrimary} />
            <Text style={styles.skipLabel}>5s</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.playBtn} onPress={togglePlay} hitSlop={8}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={scale(28)}
              color={COLORS.background}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.transportBtn} onPress={() => skipBy(5000)} hitSlop={8}>
            <Ionicons name="play-forward" size={scale(22)} color={COLORS.textPrimary} />
            <Text style={styles.skipLabel}>5s</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backToEdit}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="create-outline" size={scale(16)} color={COLORS.textSecondary} />
          <Text style={styles.backToEditText}>Back to editor</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function __makeStyles() {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
  },
  iconBtn: {
    width: scale(40),
    height: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textPrimary,
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  stage: {
    flex: 1,
    backgroundColor: '#000',
    marginHorizontal: scale(8),
    borderRadius: scale(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  emptyText: {
    color: COLORS.textSecondary,
    marginTop: verticalScale(8),
    fontSize: moderateScale(13),
  },
  textOverlay: {
    position: 'absolute',
    maxWidth: SCREEN_W * 0.8,
  },
  bottomChrome: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(8),
  },
  timeLabel: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(12),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: verticalScale(10),
    letterSpacing: 0.4,
  },
  timeMuted: {
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  progressTrack: {
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: verticalScale(18),
    overflow: 'visible',
  },
  progressFill: {
    height: '100%',
    borderRadius: scale(2),
    backgroundColor: COLORS.yellow,
  },
  progressThumb: {
    position: 'absolute',
    top: -scale(4),
    width: scale(12),
    height: scale(12),
    marginLeft: -scale(6),
    borderRadius: scale(6),
    backgroundColor: COLORS.yellow,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(36),
    marginBottom: verticalScale(14),
  },
  transportBtn: {
    alignItems: 'center',
    gap: verticalScale(2),
  },
  skipLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(9),
    fontWeight: '600',
  },
  playBtn: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: COLORS.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: verticalScale(10),
  },
  backToEditText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
});
}
let styles = __makeStyles();

