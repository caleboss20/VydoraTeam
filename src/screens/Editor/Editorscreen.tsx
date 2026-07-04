import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent, useEventListener } from 'expo';
import { useNavigation } from '@react-navigation/native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useVideoProject } from '../Contexts/VideoProjectContext';
import { VideoClip, TextOverlay } from '../types';
import BottomToolbar from '../Tabbar/editTools';
// ─── Theme Colors matching the Screenshot ───────────────────────────
const COLORS = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  purple: '#6C5CE7',
  purpleBg: 'rgba(108, 92, 231, 0.15)',
  tealAccent: '#10B981',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  textMuted: '#4F5E7B',
};
const { width: SCREEN_WIDTH } = Dimensions.get('window');
// How many horizontal pixels represent 1 second of footage on the timeline
const PX_PER_SECOND = scale(50);
// ─── Format Time Helper (ms -> MM:SS) ──────────────────────────────
const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
export default function EditorScreen() {
  const navigation = useNavigation<any>();
  const { currentVideoProject } = useVideoProject();
  const project = currentVideoProject;
  const projectId = project?.id;
  const clips: VideoClip[] = project?.clips ?? [];
  const primaryClip = clips[0];
  // Flatten all text overlays across clips for the chips row
  const allOverlays: TextOverlay[] = clips.flatMap((clip) => clip.textOverlays ?? []);
  // ── Real video playback via expo-video ──
  const player = useVideoPlayer(primaryClip?.uri ?? null, (p: any) => {
    p.loop = false;
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  // NOTE: TimeUpdateEventPayload in the currently installed expo-video version
  // requires currentLiveTimestamp, currentOffsetFromLive, and bufferedPosition
  // in addition to currentTime, so seeding useEvent's initial value with just
  // { currentTime: player.currentTime } fails type-checking (ts 2345).
  // useEventListener avoids that problem since it only takes a callback,
  // so we track currentTime in local state instead.
  const [currentTime, setCurrentTime] = useState(player.currentTime ?? 0);
  useEventListener(player, 'timeUpdate', (payload) => {
    setCurrentTime(payload.currentTime);
  });
  const togglePlayback = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };
  // ── Real per-second thumbnails for the filmstrip ──
  // clipThumbnails[clip.id] is an ARRAY of frame URIs, one per second of that clip
  const [clipThumbnails, setClipThumbnails] = useState<Record<string, string[]>>({});
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
            console.log('Thumbnail failed for clip', clip.id, 'at', s, e);
          }
          // progressive fill-in so the strip populates as frames finish generating
          setClipThumbnails((prev) => ({ ...prev, [clip.id]: [...uris] }));
        }
      }
    };
    if (clips.length > 0) generateAll();
    return () => {
      cancelled = true;
    };
  }, [clips, projectId]);
  const totalDurationMs = project?.totalDurationMs ?? 124000; // default 1:24
  const currentPositionMs = (currentTime ?? 0) * 1000;
  const totalSeconds = Math.max(1, Math.ceil(totalDurationMs / 1000));
  // Dynamic ruler marks — labeled tick every 5s, scales with actual duration
  const rulerMarks = useMemo(() => {
    const marks: number[] = [];
    for (let s = 0; s <= totalSeconds; s += 5) marks.push(s);
    return marks;
  }, [totalSeconds]);
  // ── Fixed playhead / scrollable filmstrip sync ──
  const timelineScrollRef = useRef<ScrollView>(null);
  const isScrubbingRef = useRef(false);
  // Keep the strip in sync with playback, unless the user is actively dragging it
  useEffect(() => {
    if (isPlaying && !isScrubbingRef.current) {
      const x = (currentPositionMs / 1000) * PX_PER_SECOND;
      timelineScrollRef.current?.scrollTo({ x, animated: false });
    }
  }, [currentPositionMs, isPlaying]);
  const handleTimelineScroll = (e: any) => {
    if (!isScrubbingRef.current) return;
    const x = e.nativeEvent.contentOffset.x;
    const timeSec = Math.max(0, x / PX_PER_SECOND);
    player.currentTime = timeSec;
  };
  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No project loaded.</Text>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      {/* ── Outer Header row ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="share-outline" size={scale(22)} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn}>
          <Text style={styles.videoTitle}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="ellipsis-vertical" size={scale(22)} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
      {/* ── Portrait Video Preview Frame (Curved 9:16 Canvas) ── */}
      <View style={styles.previewWrapper}>
        <View style={styles.previewContainer}>
          {primaryClip ? (
            <VideoView
              style={styles.videoView}
              player={player}
              contentFit="cover"
              nativeControls={false}
            />
          ) : (
            <View style={[styles.videoView, styles.videoPlaceholder]}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80' }}
                style={styles.placeholderImg}
                resizeMode="cover"
              />
              <View style={styles.tealScrim} />
            </View>
          )}
          <View style={styles.videoTopBar} />
          <View style={styles.timestampOverlay}>
            <Text style={styles.timestampText}>
              {formatTime(currentPositionMs)} <Text style={styles.timestampMuted}>{formatTime(totalDurationMs)}</Text>
            </Text>
          </View>
          <View style={styles.videoControlRow}>
            <TouchableOpacity style={styles.videoControlIcon} hitSlop={8}>
              <Ionicons name="settings-outline" size={scale(20)} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.playButton} onPress={togglePlayback} hitSlop={8}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={scale(20)}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.videoControlIcon} hitSlop={8}>
              <Ionicons name="scan-outline" size={scale(20)} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* ── Text overlay chip row (static, NOT part of the scrolling timeline) ── */}
      <View style={[styles.trackRow, { marginHorizontal: scale(16) }]}>
        <View style={styles.activeTextChipContainer}>
          <View style={styles.chipHandleLeft} />
          <TouchableOpacity style={styles.activeTextChip}>
            <Ionicons name="text" size={scale(12)} color={COLORS.purple} />
            <Text style={styles.activeTextChipText}>Lighthouse</Text>
          </TouchableOpacity>
          <View style={styles.chipHandleRight} />
        </View>
        <TouchableOpacity style={styles.aiTextChip}>
          <View style={styles.aiSparkleIcon}>
            <Ionicons name="sparkles" size={scale(10)} color="#A399F7" />
          </View>
          <Ionicons name="text" size={scale(12)} color={COLORS.textSecondary} />
          <Text style={styles.aiTextChipText}>Emotions</Text>
        </TouchableOpacity>
      </View>
      {/* ── Multi-Track Interactive Timeline (ruler + filmstrip + waveform, synced scroll, fixed playhead) ── */}
      <View style={styles.timelineContainer}>
        <View style={styles.playheadLine} pointerEvents="none" />
        <ScrollView
          ref={timelineScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => { isScrubbingRef.current = true; }}
          onScrollEndDrag={() => { isScrubbingRef.current = false; }}
          onMomentumScrollEnd={() => { isScrubbingRef.current = false; }}
          onScroll={handleTimelineScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_WIDTH * 0.35,
            width: totalSeconds * PX_PER_SECOND + SCREEN_WIDTH * 0.7,
          }}
        >
          <View>
            {/* Ruler */}
            <View style={[styles.rulerContainer, { width: totalSeconds * PX_PER_SECOND, marginHorizontal: 0 }]}>
              <View style={styles.rulerLine} />
              {rulerMarks.map((s) => (
                <View key={s} style={[styles.rulerMarkContainer, { left: s * PX_PER_SECOND }]}>
                  <View style={styles.rulerTick} />
                  <Text style={styles.rulerMarkText}>{s}s</Text>
                </View>
              ))}
            </View>
            {/* Filmstrip — seamless per-second thumbnails, addClipButton stays pinned before the scroll area */}
            <View style={styles.trackRow}>
              {clips.length > 0 ? (
                clips.map((clip, index) => {
                  const frames = clipThumbnails[clip.id] ?? [];
                  const clipSeconds = Math.max(1, Math.ceil(clip.durationMs / 1000));
                  return (
                    <React.Fragment key={clip.id}>
                      <View style={{ flexDirection: 'row' }}>
                        {frames.length > 0 ? (
                          frames.map((uri, i) => (
                            <Image
                              key={i}
                              source={{ uri }}
                              style={{ width: PX_PER_SECOND, height: verticalScale(46) }}
                              resizeMode="cover"
                            />
                          ))
                        ) : (
                          <View style={[styles.clipPlaceholder, { width: PX_PER_SECOND * clipSeconds }]}>
                            <Image
                              source={{ uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300' }}
                              style={styles.clipPlaceholderImg}
                            />
                          </View>
                        )}
                      </View>
                      {index < clips.length - 1 && (
                        <View style={styles.transitionBtn}>
                          <View style={styles.transitionInnerIcon} />
                        </View>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <View style={[styles.clipPlaceholder, { width: PX_PER_SECOND * 10 }]}>
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300' }}
                    style={styles.clipPlaceholderImg}
                  />
                </View>
              )}
            </View>
            {/* Waveform */}
            <View style={styles.waveformContainer}>
              <View style={[styles.waveformTrack, { width: totalSeconds * PX_PER_SECOND }]}>
                {Array.from({ length: totalSeconds * 4 }).map((_, i) => {
                  const heightFactor = Math.abs(Math.sin(i * 0.15)) * 0.7 + Math.abs(Math.cos(i * 0.4)) * 0.3;
                  const height = 4 + heightFactor * verticalScale(24);
                  return <View key={i} style={[styles.waveformBar, { height }]} />;
                })}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
      <BottomToolbar />
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  emptyStateText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(14),
  },
  // Top Outer Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(8),
  },
  headerBtn: {
    padding: scale(4),
  },
  // Portrait Curved Preview Area
  previewWrapper: {
    flex: 1,
    paddingHorizontal: scale(16),
    marginVertical: verticalScale(4),
  },
  previewContainer: {
    flex: 1,
    borderRadius: scale(28),
    overflow: 'hidden',
    backgroundColor: '#12252B', // Matches the teal/cyan backdrop
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  videoView: {
    flex: 1,
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  placeholderImg: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  tealScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(19, 44, 53, 0.45)', // Adds the matching teal overlay tone
  },
  // Video Inside Top Overlay Bar
  videoTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(14),
    zIndex: 10,
  },
  videoTopIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTitle: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(15),
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  videoConfirmButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Video Playhead Indicator Pill
  timestampOverlay: {
    position: 'absolute',
    bottom: verticalScale(64),
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: scale(20),
    zIndex: 10,
  },
  timestampText: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(11),
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  timestampMuted: {
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '400',
  },
  // Video Bottom Control Overlay
  videoControlRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Timeline tracks layout
  timelineContainer: {
    height: verticalScale(190),
    position: 'relative',
    marginTop: verticalScale(8),
  },
  playheadLine: {
    position: 'absolute',
    left: '35%',                // Matches the off-center playhead anchor in the picture
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FFFFFF',
    zIndex: 100,
  },
  timelineArea: {
    flex: 1,
  },
  timelineContent: {
    paddingBottom: verticalScale(12),
  },
  // Ruler Area
  rulerContainer: {
    height: verticalScale(28),
    position: 'relative',
    marginHorizontal: scale(16),
    marginBottom: verticalScale(6),
  },
  rulerLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rulerMarkContainer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  rulerTick: {
    width: 1.5,
    height: verticalScale(6),
    backgroundColor: COLORS.textMuted,
    marginBottom: verticalScale(4),
  },
  rulerSubTick: {
    position: 'absolute',
    bottom: 0,
    width: 1,
    height: verticalScale(3),
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  rulerMarkText: {
    color: COLORS.textMuted,
    fontSize: moderateScale(9),
    fontWeight: '600',
  },
  tracksScrollContent: {
    paddingHorizontal: SCREEN_WIDTH * 0.35, // Align scroll starting with playhead
  },
  tracksWrapper: {
    gap: verticalScale(8),
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: verticalScale(46),
  },
  // Text Overlay Chip styles (Matching Screenshot precisely)
  activeTextChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginRight: scale(40),
  },


activeTextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: COLORS.purpleBg,
    borderWidth: 2,
    borderColor: COLORS.purple,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    borderRadius: scale(16),
  },
  activeTextChipText: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(11),
    fontWeight: '700',
  },
  chipHandleLeft: {
    position: 'absolute',
    left: -scale(4),
    width: scale(6),
    height: verticalScale(16),
    backgroundColor: COLORS.purple,
    borderRadius: scale(3),
    zIndex: 10,
  },
  chipHandleRight: {
    position: 'absolute',
    right: -scale(4),
    width: scale(6),
    height: verticalScale(16),
    backgroundColor: COLORS.purple,
    borderRadius: scale(3),
    zIndex: 10,
  },
  aiTextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: '#1E2230',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    borderRadius: scale(16),
    position: 'relative',
  },
  aiSparkleIcon: {
    position: 'absolute',
    top: -scale(3),
    left: -scale(3),
    backgroundColor: '#3E3498',
    borderRadius: scale(8),
    padding: scale(2),
  },
  aiTextChipText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  // Clips Track
  addClipButton: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(8),
  },
  clipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clipThumbCard: {
    width: scale(110),
    height: verticalScale(44),
    borderRadius: scale(10),
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  clipThumbImg: {
    width: '100%',
    height: '100%',
  },
  clipPlaceholder: {
    flex: 1,
    backgroundColor: '#181A22',
  },
  clipPlaceholderImg: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  // In-between Clip Transition handle
  transitionBtn: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -scale(10),
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  transitionInnerIcon: {
    width: scale(10),
    height: scale(4),
    backgroundColor: '#151821',
    borderRadius: scale(2),
  },
  // Waveform Audio Track
  waveformContainer: {
    height: verticalScale(36),
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: scale(10),
    justifyContent: 'center',
  },
  waveformTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(2),
  },
  waveformBar: {
    width: 2.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 1.5,
  },
  // Bottom Toolbar Panel
  bottomToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(22),
    paddingVertical: verticalScale(14),
    // paddingBottom: scale(20),
    backgroundColor: COLORS.background,
  },
  toolbarIconButton: {
    width: scale(40),
    height: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(10),
  },
  toolbarIconButtonActive: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
  },
});
