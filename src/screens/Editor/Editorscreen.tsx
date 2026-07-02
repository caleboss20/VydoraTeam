import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { useNavigation } from '@react-navigation/native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useVideoProject } from '../Contexts/VideoProjectContext'; 
import { VideoClip, TextOverlay } from '../types';
// ─── Theme (matches Vydora's existing dark/gold system) ───────────────────
const COLORS = {
  background: '#212121',
  surface: '#2A2A2A',
  border: '#3A3A3A',
  gold: '#C9A227',
  goldBright: '#F5C518',
  purple: '#7C6FF0',
  textPrimary: '#FFFFFF',
  textSecondary: '#9A9A9A',
  textMuted: '#6B6B6B',
};
const { width: SCREEN_WIDTH } = Dimensions.get('window');
// ─── Helpers ────────────────────────────────────────────────────────────
const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
// Ruler marks — mirrors the reference screenshot's 0s / 1s / 5s / 10s spacing
const RULER_MARKS = ['0s', '1s', '5s', '10s'];
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
  const player = useVideoPlayer(primaryClip?.uri ?? null, (p:any) => {
    p.loop = false;
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const togglePlayback = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };
  // ── Real thumbnails for the filmstrip ──
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    const generateThumbnails = async () => {
      for (const clip of clips) {
        if (thumbnails[clip.id]) continue;
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(clip.uri, {
            time: 0,
          });
          if (!cancelled) {
            setThumbnails((prev) => ({ ...prev, [clip.id]: uri }));
          }
        } catch (e) {
          console.log('Thumbnail generation failed for clip', clip.id, e);
        }
      }
    };
    if (clips.length > 0) generateThumbnails();
    return () => {
      cancelled = true;
    };
  }, [clips,projectId]);
  const totalDurationMs = project?.totalDurationMs ?? 0;
  const currentPositionMs = (player.currentTime ?? 0) * 1000;
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
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity hitSlop={10}>
          <Ionicons name="share-outline" size={scale(22)} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Edit</Text>
        <TouchableOpacity style={styles.confirmButton} hitSlop={10} onPress={() => navigation.goBack()}>
          <Ionicons name="checkmark" size={scale(18)} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
      {/* ── Preview ── */}
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
            <View style={[styles.videoView, styles.videoPlaceholder]} />
          )}
          {/* Timestamp overlay */}
          <View style={styles.timestampOverlay}>
            <Text style={styles.timestampText}>
              {formatTime(currentPositionMs)}{' '}
              <Text style={styles.timestampMuted}>{formatTime(totalDurationMs)}</Text>
            </Text>
          </View>
          {/* Settings gear — bottom-left */}
          <TouchableOpacity style={styles.previewCornerButtonLeft} hitSlop={8}>
            <Ionicons name="settings-outline" size={scale(20)} color={COLORS.textPrimary} />
          </TouchableOpacity>
          {/* Play button — bottom-center */}
          <TouchableOpacity style={styles.playButton} onPress={togglePlayback} hitSlop={8}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={scale(20)}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
          {/* Fullscreen — bottom-right */}
          <TouchableOpacity style={styles.previewCornerButtonRight} hitSlop={8}>
            <Ionicons name="scan-outline" size={scale(20)} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
      {/* ── Timeline area ── */}
      <ScrollView
        style={styles.timelineArea}
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Ruler */}
        <View style={styles.ruler}>
          {RULER_MARKS.map((mark) => (
            <Text key={mark} style={styles.rulerMark}>
              {mark}
            </Text>
          ))}
        </View>
        {/* Scrollable track region with playhead */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.trackRegion}>
            {/* Playhead line */}
            <View style={styles.playhead} pointerEvents="none" />
            {/* Text overlay chips row — real data from clip.textOverlays */}
            {allOverlays.length > 0 && (
              <View style={styles.chipsRow}>
                {allOverlays.map((overlay, index) => (
                  <TouchableOpacity
                    key={overlay.id}
                    style={[styles.chip, index === 0 && styles.chipActive]}
                  >
                    <Ionicons
                      name={overlay.isAiGenerated ? 'sparkles' : 'text'}
                      size={scale(13)}
                      color={index === 0 ? COLORS.purple : COLORS.textSecondary}
                    />
                    <Text style={index === 0 ? styles.chipTextActive : styles.chipText}>
                      {overlay.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {/* Clip filmstrip */}
            <View style={styles.clipTrack}>
              <TouchableOpacity style={styles.addClipButton} hitSlop={6}>
                <Ionicons name="add" size={scale(16)} color={COLORS.textPrimary} />
              </TouchableOpacity>
              {clips.map((clip, index) => (
                <React.Fragment key={clip.id}>
                  <View style={styles.clipThumb}>
                    {thumbnails[clip.id] ? (
                      <Image source={{ uri: thumbnails[clip.id] }} style={styles.clipThumbImage} />
                    ) : (
                      <View style={[styles.clipThumbImage, styles.clipThumbPlaceholder]} />
                    )}
                  </View>
                  {index < clips.length - 1 && (
                    <View style={styles.mergeIcon}>
                      <Ionicons name="ellipse" size={scale(18)} color={COLORS.textPrimary} />
                    </View>
                  )}
                </React.Fragment>
              ))}
            </View>
            {/* Waveform track */}
            <View style={styles.waveformTrack}>
              {Array.from({ length: 60 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveformBar,
                    { height: 6 + Math.abs(Math.sin(i * 0.7)) * verticalScale(28) },
                  ]}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </ScrollView>
      {/* ── Bottom toolbar ── */}
      <View style={styles.bottomToolbar}>
        <ToolbarIcon name="cut-outline" />
        <ToolbarIcon name="flame-outline" />
        <ToolbarIcon name="volume-high-outline" />
        <ToolbarIcon name="crop-outline" />
        <ToolbarIcon name="speedometer-outline" />
        <ToolbarIcon name="copy-outline" />
        <ToolbarIcon name="trash-outline" />
      </View>
    </SafeAreaView>
  );
}
function ToolbarIcon({ name }: { name: keyof typeof Ionicons.glyphMap }) {
  return (
    <TouchableOpacity style={styles.toolbarIconButton} hitSlop={8}>
      <Ionicons name={name} size={scale(21)} color={COLORS.textPrimary} />
    </TouchableOpacity>
  );
}
// ─── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(14),
  },
  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
  },
  topBarTitle: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  confirmButton: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Preview
  previewWrapper: {
    paddingHorizontal: scale(16),
    flex: 1,
  },
  previewContainer: {
    flex: 1,
    borderRadius: scale(18),
    overflow: 'hidden',
    backgroundColor: '#0e2f36',
  },
  videoView: {
    flex: 1,
  },
  videoPlaceholder: {
    backgroundColor: '#0e2f36',
  },
  timestampOverlay: {
    position: 'absolute',
    bottom: verticalScale(56),
    left: scale(16),
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(6),
  },
  timestampText: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  timestampMuted: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '400',
  },
  previewCornerButtonLeft: {
    position: 'absolute',
    left: scale(14),
    bottom: verticalScale(14),
  },
  previewCornerButtonRight: {
    position: 'absolute',
    right: scale(14),
    bottom: verticalScale(14),
  },
  playButton: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: verticalScale(12),
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Timeline
  timelineArea: {
    maxHeight: verticalScale(230),
  },
  timelineContent: {
    paddingTop: verticalScale(10),
  },
  ruler: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(10),
  },
  rulerMark: {
    color: COLORS.textMuted,
    fontSize: moderateScale(11),
  },
  trackRegion: {
    paddingHorizontal: scale(20),
    minWidth: SCREEN_WIDTH,
  },
  playhead: {
    position: 'absolute',
    left: scale(130),
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: COLORS.textPrimary,
    zIndex: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: verticalScale(8),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    backgroundColor: COLORS.surface,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(14),
  },
  chipActive: {
    borderWidth: 1,
    borderColor: COLORS.purple,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(12),
  },
  chipTextActive: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  clipTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    height: verticalScale(56),
    marginBottom: verticalScale(8),
  },
  addClipButton: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(6),
  },
  clipThumb: {
    width: scale(130),
    height: verticalScale(56),
    borderRadius: scale(6),
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  clipThumbImage: {
    width: '100%',
    height: '100%',
  },
  clipThumbPlaceholder: {
    backgroundColor: COLORS.border,
  },
  mergeIcon: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -scale(11),
    zIndex: 5,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  waveformTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    height: verticalScale(40),
    backgroundColor: COLORS.surface,
    borderRadius: scale(8),
    paddingHorizontal: scale(6),
    gap: scale(2),
  },
  waveformBar: {
    width: 2,
    backgroundColor: COLORS.textMuted,
    borderRadius: 1,
  },
  // Bottom toolbar
  bottomToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(14),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  toolbarIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});