import React, { useState, useEffect, useMemo, useRef,  } from 'react';
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
} from 'react-native';
import { useMember } from '../Contexts/memberContext'; 
import CollaborationSidebar from '../components/Editorsidebar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { useNavigation } from '@react-navigation/native';
import * as VideoThumbnails from 'expo-video-thumbnails';

import { useVideoProject } from '../Contexts/VideoProjectContext';
import { VideoClip, TextOverlay } from '../types';
import BottomToolbar from '../Tabbar/editTools';
import { useComment } from '../Contexts/commentContext';
import EditToolPanel from './EditToolPanel';

const COLORS = {
  background: '#0B0D13',
  surface: '#151821',
  // border: '#222633',
  border:'#F5C518',
  purple: '#F5C518',
  purpleBg: 'rgba(108, 92, 231, 0.15)',
  tealAccent: '#10B981',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  textMuted: '#4F5E7B',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PX_PER_SECOND = scale(50);
const HANDLE_WIDTH = scale(14);

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

  const createPanResponder = (side: 'left' | 'right') => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const { startPx: sPx, endPx: ePx } = stateRef.current;
        dragStartRef.current = side === 'left' ? sPx : ePx;
      },
      onPanResponderMove: (_, gestureState) => {
        const { startPx: sPx, endPx: ePx, clipDurationPx: cDur } = stateRef.current;
        if (side === 'left') {
          const next = dragStartRef.current + gestureState.dx;
          setStartPx(Math.max(0, Math.min(next, ePx - HANDLE_WIDTH)));
        } else {
          const next = dragStartRef.current + gestureState.dx;
          setEndPx(Math.min(cDur, Math.max(next, sPx + HANDLE_WIDTH)));
        }
      },
      onPanResponderRelease: () => {
        const { startPx: sPx, endPx: ePx, clip: currentClip, onTrimEnd: callback } = stateRef.current;
        const newStartMs = Math.round((sPx / PX_PER_SECOND) * 1000);
        const newEndMs = Math.round((ePx / PX_PER_SECOND) * 1000);
        callback(currentClip.id, newStartMs, newEndMs);
      },
    });
  };

  const leftPanResponder = useRef(createPanResponder('left')).current;
  const rightPanResponder = useRef(createPanResponder('right')).current;

  const clipSeconds = Math.max(1, Math.ceil(clip.durationMs / 1000));

  if (!isActive) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={{ flexDirection: 'row', position: 'relative', height: verticalScale(46) }}
      >
        {thumbnails.length > 0 ? (
          thumbnails.map((uri, i) => (
            <Image
              key={i}
              source={{ uri }}
              style={{ width: PX_PER_SECOND, height: verticalScale(46), opacity: 0.6 }}
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
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ flexDirection: 'row', position: 'relative', height: verticalScale(46) }}>
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
        <View style={[styles.clipPlaceholder, { width: PX_PER_SECOND * clipSeconds }]}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300' }}
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
        style={[styles.trimHandle, styles.leftTrimHandle, { transform: [{ translateX: startPx }] }]}
        {...leftPanResponder.panHandlers}
      >
        <View style={styles.trimHandleBar} />
      </View>

      {/* Right Trim Handle */}
      <View
        style={[styles.trimHandle, styles.rightTrimHandle, { transform: [{ translateX: endPx - HANDLE_WIDTH }] }]}
        {...rightPanResponder.panHandlers}
      >
        <View style={styles.trimHandleBar} />
      </View>
    </View>
  );
}

export default function EditorScreen() {
  const navigation = useNavigation<any>();
  const { currentVideoProject, updateClipTrim, deleteClip, duplicateClip, splitClip } = useVideoProject();
  const project = currentVideoProject;
  const projectId = project?.id;
  const {fetchComments}=useComment();

  //for the video volume//
  const [activeToolLabel, setActiveToolLabel] = useState<string | null>(null);
  const { updateClipVolume } = useVideoProject();

  useEffect(() => {
    if(projectId) {
      fetchMembers(projectId);
    }
  }, [projectId]);


  useEffect(() => {
    if(projectId) {
      fetchComments(projectId);
    }
  }, [projectId]);

  const clips: VideoClip[] = project?.clips ?? [];

  //for the sidebar//
  const [sidebarVisible, setSidebarVisible] = useState(false);
const { getMembersForProject,fetchMembers } = useMember();
const onlineMembers = projectId ? getMembersForProject(projectId).filter(m => m.online) : [];
console.log('projectId:', projectId, 'onlineMembers:', onlineMembers);

  
const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const activeClip = clips.find((c) => c.id === selectedClipId) || clips[0];

  useEffect(() => {
    if (activeClip && selectedClipId !== activeClip.id) {
      setSelectedClipId(activeClip.id);
    }
  }, [activeClip, selectedClipId]);

  const player = useVideoPlayer(activeClip?.uri ?? null, (p: any) => {
    p.loop = false;
  });

  const [isPlaying, setIsPlaying] = useState(player.playing ?? false);
  useEventListener(player, 'playingChange', (payload) => {
    setIsPlaying(payload.isPlaying);
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
 useEffect(()=>{
  if(activeClip){
    player.volume=activeClip.volume ?? 1;

  }
 },[activeClip?.volume,player.volume]);


  // Handle active clip playback endpoint
  useEventListener(player, 'timeUpdate', (payload) => {
    if (!activeClip) return;
    const trimEndMs = activeClip.trimEndMs ?? activeClip.durationMs;
    const curTimeMs = payload.currentTime * 1000;

    if (curTimeMs >= trimEndMs) {
      const activeIdx = clips.findIndex((c) => c.id === activeClip.id);
      if (activeIdx !== -1 && activeIdx + 1 < clips.length) {
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
    } else {
      if (activeClip) {
        const trimStartMs = activeClip.trimStartMs ?? 0;
        const trimEndMs = activeClip.trimEndMs ?? activeClip.durationMs;
        const posMs = player.currentTime * 1000;
        if (posMs < trimStartMs || posMs >= trimEndMs) {
          player.currentTime = trimStartMs / 1000;
        }
      }
      player.play();
    }
  };

  // Generate Thumbnails
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
    const activeSegment = clipTimelineSegments.find((s) => s.clip.id === activeClip.id);
    if (!activeSegment) return 0;
    const start = activeClip.trimStartMs ?? 0;
    const relativeOffsetMs = (playerTimeSec * 1000) - start;
    return Math.max(0, activeSegment.timelineStartMs + relativeOffsetMs);
  };

  const totalDurationMs = clipTimelineSegments.reduce((acc, s) => acc + s.trimmedDurationMs, 0);
  const currentPositionMs = getTimelinePositionMs(currentTime);
  const totalSeconds = Math.max(1, Math.ceil(totalDurationMs / 1000));

  const rulerMarks = useMemo(() => {
    const marks: number[] = [];
    for (let s = 0; s <= totalSeconds; s += 5) marks.push(s);
    return marks;
  }, [totalSeconds]);

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

    const activeSegment = clipTimelineSegments.find(
      (s) => timelineTimeMs >= s.timelineStartMs && timelineTimeMs <= s.timelineEndMs
    ) || clipTimelineSegments[0];

    if (activeSegment) {
      const relativeOffsetMs = timelineTimeMs - activeSegment.timelineStartMs;
      const targetClip = activeSegment.clip;
      const targetPlayerTimeSec = ((targetClip.trimStartMs ?? 0) + relativeOffsetMs) / 1000;

      if (targetClip.id !== activeClip.id) {
        setSelectedClipId(targetClip.id);
        player.replace(targetClip.uri);
      }
      player.currentTime = targetPlayerTimeSec;
      setCurrentTime(targetPlayerTimeSec);
    }
  };

  const handleTrimEnd = (clipId: string, trimStartMs: number, trimEndMs: number) => {
    updateClipTrim(clipId, trimStartMs, trimEndMs);
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

  // Toolbar Actions
  const handleSplit = () => {
    if (!activeClip) return;
    const splitTimeMs = currentTime * 1000;
    splitClip(activeClip.id, splitTimeMs);
    Alert.alert("Clip Split", "The clip has been split at the playhead position.");
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

const handleToolPress = (toolLabel: string) => {
  setActiveToolLabel(toolLabel);
};

const closeToolPanel = () => setActiveToolLabel(null);



  if (!project || clips.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="film-outline" size={scale(40)} color={COLORS.textMuted} />
          <Text style={styles.emptyStateText}>No clips yet</Text>
          <TouchableOpacity onPress={() => navigation.navigate('uploadvideo')}>
            <Text style={{ color: COLORS.purple, marginTop: verticalScale(8) }}>Upload a clip</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
    <View style={styles.header}>
  <TouchableOpacity style={styles.headerBtn}>
    <Ionicons name="share-outline" size={scale(22)} color={COLORS.textPrimary} />
  </TouchableOpacity>
  <TouchableOpacity style={styles.headerBtn}>
    <Text style={styles.videoTitle}>Edit</Text>
  </TouchableOpacity>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
    {/* Stacked avatars — replaces the checkmark */}
    <TouchableOpacity
      style={styles.avatarStack}
      onPress={() => setSidebarVisible(true)}
    >
      {onlineMembers.slice(0, 3).map((m, i) => (
        <View
          key={m.id}
          style={[
            styles.stackedAvatar,
            { backgroundColor: m.color, marginLeft: i === 0 ? 0 : -scale(10) },
          ]}
        >
          <Text style={styles.stackedAvatarText}>{m.initials}</Text>
        </View>
      ))}
    </TouchableOpacity>
    {/* Hamburger opens the sidebar */}
    {/* <TouchableOpacity style={styles.headerBtn} onPress={() => setSidebarVisible(true)}>
      <Ionicons name="menu" size={scale(22)} color={COLORS.textPrimary} />
    </TouchableOpacity> */}
  </View>
</View>
<CollaborationSidebar
  visible={sidebarVisible}
  onClose={() => setSidebarVisible(false)}
  projectId={projectId ?? ''}
  clipId={activeClip?.id}
/>


      {/* Video Preview */}
      <View style={styles.previewWrapper}>
        <View style={styles.previewContainer}>
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

      {/* Multi-track Timeline */}
      <View style={styles.timelineContainer}>
        {/* Playhead Vertical Line */}
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
            {/* 1. Ruler Track */}
            <View style={[styles.rulerContainer, { width: totalSeconds * PX_PER_SECOND, marginHorizontal: 0 }]}>
              <View style={styles.rulerLine} />
              {rulerMarks.map((s) => (
                <View key={s} style={[styles.rulerMarkContainer, { left: s * PX_PER_SECOND }]}>
                  <View style={styles.rulerTick} />
                  <Text style={styles.rulerMarkText}>{s}s</Text>
                </View>
              ))}
            </View>

            {/* 2. Text Overlays Track */}
            <View style={{ height: verticalScale(34), position: 'relative', width: totalSeconds * PX_PER_SECOND, marginBottom: verticalScale(6) }}>
              {visibleOverlays.map(({ overlay, left, width }) => {
                const isActive = activeClip && overlay.clipId === activeClip.id;
                return (
                  <View
                    key={overlay.id}
                    style={[
                      styles.activeTextChipContainer,
                      {
                        position: 'absolute',
                        left,
                        width,
                      },
                    ]}
                  >
                    {isActive && <View style={styles.chipHandleLeft} />}
                    <TouchableOpacity
                      style={[
                        styles.activeTextChip,
                        {
                          width: '100%',
                          backgroundColor: isActive ? COLORS.purpleBg : '#1E2230',
                          borderColor: isActive ? COLORS.purple : 'transparent',
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      {overlay.isAiGenerated && (
                        <View style={styles.aiSparkleIcon}>
                          <Ionicons name="sparkles" size={scale(10)} color="#A399F7" />
                        </View>
                      )}
                      <Ionicons name="text" size={scale(12)} color={isActive ? COLORS.purple : COLORS.textSecondary} />
                      <Text style={[styles.activeTextChipText, { color: isActive ? '#FFFFFF' : COLORS.textSecondary }]} numberOfLines={1}>
                        {overlay.text}
                      </Text>
                    </TouchableOpacity>
                    {isActive && <View style={styles.chipHandleRight} />}
                  </View>
                );
              })}
              {visibleOverlays.length === 0 && (
                <TouchableOpacity style={[styles.aiTextChip, { position: 'absolute', left: 0 }]}>
                  <View style={styles.aiSparkleIcon}>
                    <Ionicons name="sparkles" size={scale(10)} color="#e9f799" />
                  </View>
                  <Ionicons name="text" size={scale(12)} color={COLORS.textSecondary} />
                  <Text style={styles.aiTextChipText}>Add text</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 3. Video Clips Track */}
            <View style={[styles.trackRow, { position: 'relative' }]}>
              {/* Add Media Track Button */}
              <TouchableOpacity
                style={[styles.addClipTrackBtn, { position: 'absolute', left: -scale(34), top: verticalScale(10) }]}
                onPress={() => navigation.navigate('uploadvideo')}
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
                      <View style={styles.transitionBtn}>
                        <View style={styles.transitionInnerIcon} />
                      </View>
                    )}
                  </React.Fragment>
                );
              })}
            </View>

            {/* 4. Audio Waveform Track */}
            <View style={[styles.waveformContainer, { marginTop: verticalScale(8) }]}>
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

      {/* Bottom Toolbar */}
      <BottomToolbar
        onSplit={handleSplit}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onToolPress={handleToolPress}
      />

      <EditToolPanel
      visible={!!activeToolLabel}
      toolLabel={activeToolLabel}
      onClose={closeToolPanel}
      volume={activeClip?.volume ?? 1}
      onVolumeChange={(v) => activeClip && updateClipVolume(activeClip.id, v)}
/>
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
  previewWrapper: {
    flex: 1,
    paddingHorizontal: scale(16),
    marginVertical: verticalScale(4),
  },
  previewContainer: {
    flex: 1,
    borderRadius: scale(28),
    overflow: 'hidden',
    backgroundColor: '#12252B',
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
    backgroundColor: 'rgba(19, 44, 53, 0.45)',
  },
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
  videoTitle: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(15),
    fontWeight: '700',
  },
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
  timelineContainer: {
    height: verticalScale(210),
    position: 'relative',
    marginTop: verticalScale(8),
  },
  playheadLine: {
    position: 'absolute',
    left: '35%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FFFFFF',
    zIndex: 100,
  },
  rulerContainer: {
    height: verticalScale(28),
    position: 'relative',
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
  rulerMarkText: {
    color: COLORS.textMuted,
    fontSize: moderateScale(9),
    fontWeight: '600',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: verticalScale(46),
  },
  activeTextChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: verticalScale(28),
  },
  activeTextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: COLORS.purpleBg,
    borderWidth: 2,
    borderColor: COLORS.purple,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(4),
    borderRadius: scale(14),
    justifyContent: 'center',
  },
  activeTextChipText: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(10),
    fontWeight: '700',
  },
  chipHandleLeft: {
    position: 'absolute',
    left: -scale(3),
    width: scale(6),
    height: verticalScale(12),
    backgroundColor: COLORS.purple,
    borderRadius: scale(3),
    zIndex: 10,
  },
  chipHandleRight: {
    position: 'absolute',
    right: -scale(3),
    width: scale(6),
    height: verticalScale(12),
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
    backgroundColor: '#F5C518',
    borderRadius: scale(8),
    padding: scale(2),
  },
  aiTextChipText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    fontWeight: '600',
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
  waveformContainer: {
    height: verticalScale(36),
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: scale(10),
    justifyContent: 'center',
    marginTop:scale(20),
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
  trimHandle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: HANDLE_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5C518',
    zIndex: 10,
  },
  trimHandleBar: {
    width: scale(3),
    height: '50%',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  dimOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 4,
  },
  activeBorderOutline: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: COLORS.purple,
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
    backgroundColor:' #F5C518',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
//for the top avatar//
  avatarStack: {
  flexDirection: 'row',
  alignItems: 'center',
},
stackedAvatar: {
  width: scale(33),
  height: scale(33),
  borderRadius: scale(33),
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1.5,
  borderColor: COLORS.background,
},
stackedAvatarText: {
  color: '#FFF',
  fontSize: moderateScale(9),
  fontWeight: '700',
},
});
