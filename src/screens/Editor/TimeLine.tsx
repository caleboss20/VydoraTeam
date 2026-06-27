import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  PanResponder,
  PanResponderGestureState,
  GestureResponderEvent,
  Dimensions,
  StatusBar,
} from 'react-native';
import {  SafeAreaView,} from "react-native-safe-area-context"
import { Ionicons } from '@expo/vector-icons';
type IoniconName = keyof typeof Ionicons.glyphMap;
interface Clip {
  id: string;
  start: number; // seconds
  duration: number; // seconds
  color: string;
  label: string;
}
interface TrackClips {
  video: Clip[];
  audio: Clip[];
  text: Clip[];
}
interface NavigationLike {
  navigate?: (routeName: string) => void;
}
interface TimelineScreenProps {
  navigation?: NavigationLike;
  onBack?: () => void;
  onSplitClip?: () => void;
  onAddTrack?: () => void;
  projectName?: string;
  duration?: string;
  clipCount?: number;
}
/**
TimelineScreen — collaborative video editor, "Timeline" tab
Matches reference design: dark theme, video preview, multi-track
timeline (Video / Audio / Text), draggable playhead, zoom slider,
Split clip / Add track actions, bottom tab bar.
*
Drop-in screen. Wire up onBack, onSplitClip, onAddTrack, and
navigation for the bottom tabs from the parent navigator.
*/
const { width: SCREEN_WIDTH } = Dimensions.get('window');
// ---- design tokens (matched to reference) ----------------------------
const COLORS = {
  bg: '#0E0E10',
  surface: '#1A1A1D',
  surfaceAlt: '#222226',
  border: '#2A2A2E',
  textPrimary: '#F5F5F5',
  textSecondary: '#8A8A8E',
  textTertiary: '#5C5C60',
  accentYellow: '#F4C430',
  accentTeal: '#3FD9C7',
  accentPurple: '#B49DF2',
  playhead: '#F4C430',
  trackEmpty: '#1F1F23',
  pillBg: '#26262A',
};
const TRACK_HEIGHT = 52;
const RULER_HEIGHT = 28;
const PX_PER_SEC_BASE = 36; // baseline timeline scale before zoom
// ---- mock data (replace with real project state) ----------------------
const initialClips: TrackClips = {
  video: [
    { id: 'v1', start: 0, duration: 4.5, color: COLORS.accentYellow, label: 'Clip 1' },
    { id: 'v2', start: 4.5, duration: 3.2, color: COLORS.accentYellow, label: 'Clip 2' },
  ],
  audio: [
    { id: 'a1', start: 0, duration: 7.7, color: COLORS.accentTeal, label: 'Audio' },
  ],
  text: [
    { id: 't1', start: 2.2, duration: 1.6, color: COLORS.accentPurple, label: 'Title' },
  ],
};
export default function TimelineScreen({
  navigation,
  onBack,
  onSplitClip,
  onAddTrack,
  projectName = 'Project1.mp4',
  duration = '00:20 / 01:12',
  clipCount = 3,
}: TimelineScreenProps) {
  const [zoom, setZoom] = useState<number>(0.45); // 0..1
  const [playheadX, setPlayheadX] = useState<number>(120);
  const [clips] = useState<TrackClips>(initialClips);
  const timelineScrollRef = useRef<ScrollView>(null);
  const pxPerSec = PX_PER_SEC_BASE * (0.5 + zoom * 1.5);
  // ---- draggable playhead ----------------------------------------------
  const dragStartX = useRef<number>(0);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartX.current = playheadX;
      },
      onPanResponderMove: (_: GestureResponderEvent, gesture: PanResponderGestureState) => {
        const next = Math.max(0, dragStartX.current + gesture.dx);
        setPlayheadX(next);
      },
    })
  ).current;
  // ---- zoom slider (simple draggable track, no external deps) ----------
  const zoomTrackWidth = 140;
  const zoomPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_: GestureResponderEvent, gesture: PanResponderGestureState) => {
        const next = Math.min(1, Math.max(0, gesture.moveX / zoomTrackWidth - 0.08));
        setZoom(next);
      },
    })
  ).current;
  const renderClipBlock = (clip: Clip) => {
    const left = clip.start * pxPerSec;
    const width = clip.duration * pxPerSec;
    return (
      <View
        key={clip.id}
        style={[
          styles.clipBlock,
          {
            left,
            width,
            backgroundColor: clip.color,
          },
        ]}
      />
    );
  };
  const renderTrackRow = (
    iconName: IoniconName,
    label: string,
    trackClips: Clip[],
    totalWidth: number
  ) => (
    <View style={styles.trackRow}>
      <View style={styles.trackLabelCol}>
        <Ionicons name={iconName} size={15} color={COLORS.textSecondary} style={{ marginBottom: 3 }} />
        <Text style={styles.trackLabelText}>{label}</Text>
      </View>
      <View style={[styles.trackLane, { width: totalWidth }]}>
        {trackClips.map(renderClipBlock)}
      </View>
    </View>
  );
  const totalDurationSec = 9;
  const laneWidth = Math.max(SCREEN_WIDTH - 80, totalDurationSec * pxPerSec);
  // ruler ticks every second
  const ticks = Array.from({ length: Math.ceil(totalDurationSec) + 1 }, (_, i) => i);
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Timeline</Text>
        <CollabToggle />
      </View>
      <View style={styles.headerDivider} />
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}>
        {/* Video preview */}

        <View style={styles.previewBox}>
          <View style={styles.playButtonCircle}>
            <Ionicons name="play" size={16} color="#FFFFFF" 
            style={{ marginLeft: 2 }} />
          </View>
          <Text style={styles.previewTimeLeft}>{duration}</Text>
          <Text style={styles.previewTimeRight}>{projectName}</Text>
        </View>

        {/* Undo / redo + clip count */}
        <View style={styles.utilRow}>
          <View style={styles.undoRedoGroup}>
            <TouchableOpacity hitSlop={8}>
              <Ionicons name="arrow-undo" size={17} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={8} style={{ marginLeft: 14 }}>
              <Ionicons name="arrow-redo" size={17} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.clipCountText}>{clipCount} clips · 1:12</Text>
        </View>
        {/* Timeline area (horizontally scrollable) */}
        <ScrollView
          ref={timelineScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.timelineScroll}>
          <View style={{ width: laneWidth, position: 'relative' }}>
            {/* Ruler */}
            <View style={styles.ruler}>
              {ticks.map((sec) => (
                <Text
                  key={sec}
                  style={[styles.rulerLabel, { left: sec * pxPerSec - 10 }]}>
                  {formatTick(sec)}
                </Text>
              ))}
            </View>
            {/* Playhead line — draggable */}
            <View
              {...panResponder.panHandlers}
              style={[styles.playheadTouchArea, { left: playheadX - 16 }]}>
              <View style={styles.playheadKnob} />
              <View style={styles.playheadLine} />
            </View>
            {/* Tracks */}
            <View style={styles.tracksContainer}>
              {renderTrackRow('film-outline', 'Video', clips.video, laneWidth)}
              {renderTrackRow('musical-notes-outline', 'Audio', clips.audio, laneWidth)}
              {renderTrackRow('text-outline', 'Text', clips.text, laneWidth)}
            </View>
          </View>
        </ScrollView>
        {/* Zoom slider */}
        <View style={styles.zoomRow}>
          <Ionicons name="remove-circle-outline" size={16} color={COLORS.textSecondary} />
          <View
            style={styles.zoomTrack}
            {...zoomPan.panHandlers}>
            <View style={[styles.zoomFill, { width: `${zoom * 100}%` }]} />
            <View style={[styles.zoomKnob, { left: `${zoom * 100}%`}]} />
          </View>
          <Ionicons name="add-circle-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.zoomLabel}>Zoom</Text>
        </View>
        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={onSplitClip} activeOpacity={0.7}>
            <Ionicons name="cut-outline" size={15} color={COLORS.textPrimary} style={{ marginRight: 8 }} />
            <Text style={styles.actionLabel}>Split clip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onAddTrack} activeOpacity={0.7}>
            <Ionicons name="add" size={16} color={COLORS.textPrimary} style={{ marginRight: 8 }} />
            <Text style={styles.actionLabel}>Add track</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* Bottom tab bar */}
      <BottomTabBar active="Timeline" navigation={navigation} />
    </SafeAreaView>
  )
}
function formatTick(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
function CollabToggle() {
  // mirrors the red/teal/dark three-dot collaborator avatar cluster top right
  return (
    <View style={styles.collabToggle}>
      <View style={[styles.collabDot, { backgroundColor: '#E8584F', marginLeft: 0 }]} />
      <View style={[styles.collabDot, { backgroundColor: '#3FD9C7', marginLeft: -10 }]} />
      <View style={[styles.collabDot, { backgroundColor: '#1A1A1D', marginLeft: -10 }]} />
    </View>
  );
}
interface BottomTabBarProps {
  active: string;
  navigation?: NavigationLike;
}
interface TabDef {
  key: string;
  iconOutline: IoniconName;
  iconFilled: IoniconName;
  label: string;
}
function BottomTabBar({ active, navigation }: BottomTabBarProps) {
  const tabs: TabDef[] = [
    { key: 'Edit', iconOutline: 'pencil-outline', iconFilled: 'pencil', label: 'Edit' },
    { key: 'Timeline', iconOutline: 'layers-outline', iconFilled: 'layers', label: 'Timeline' },
    { key: 'Text', iconOutline: 'text-outline', iconFilled: 'text', label: 'Text' },
    { key: 'Filters', iconOutline: 'options-outline', iconFilled: 'options', label: 'Filters' },
    { key: 'More', iconOutline: 'ellipsis-horizontal', iconFilled: 'ellipsis-horizontal', label: 'More' },
  ];
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => navigation?.navigate?.(tab.key)}
            activeOpacity={0.7}>
            <Ionicons
              name={isActive ? tab.iconFilled : tab.iconOutline}
              size={18}
              color={isActive ? COLORS.accentYellow : COLORS.textSecondary}
              style={{ marginBottom: 4 }}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            {isActive && <View style={styles.tabActiveBar} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    marginLeft: 4,
  },
  headerDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 0,
  },
  collabToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  collabDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 24,
  },
  previewBox: {
    margin: 16,
    height: 150,
    borderRadius: 10,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTimeLeft: {
    position: 'absolute',
    left: 12,
    bottom: 10,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
  },
  previewTimeRight: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
  },
  utilRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  undoRedoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clipCountText: {
    color: COLORS.textTertiary,
    fontSize: 12,
  },
  timelineScroll: {
    marginTop: 8,
  },
  ruler: {
    height: RULER_HEIGHT,
    paddingLeft: 76,
    position: 'relative',
  },
  rulerLabel: {
    position: 'absolute',
    color: COLORS.textTertiary,
    fontSize: 10,
    top: 6,
  },
  tracksContainer: {
    paddingLeft: 16,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TRACK_HEIGHT,
    marginBottom: 8,
  },
  trackLabelCol: {
    width: 60,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  trackLabelText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  trackLane: {
    height: TRACK_HEIGHT - 6,
    backgroundColor: COLORS.trackEmpty,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  clipBlock: {
    position: 'absolute',
    top: 0,
    height: TRACK_HEIGHT - 6,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  playheadTouchArea: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: RULER_HEIGHT + TRACK_HEIGHT * 3 + 24,
    alignItems: 'center',
    zIndex: 10,
  },
  playheadKnob: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.playhead,
    marginTop: 14,
  },
  playheadLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.playhead,
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 18,
  },
  zoomTrack: {
    flex: 1,
    height: 24,
    marginHorizontal: 10,
    justifyContent: 'center',
  },
  zoomFill: {
    height: 3,
    backgroundColor: COLORS.accentYellow,
    borderRadius: 2,
    position: 'absolute',
    left: 0,
  },
  zoomKnob: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.accentYellow,
    marginLeft: -7,
  },
  zoomLabel: {
    color: COLORS.textTertiary,
    fontSize: 12,
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 22,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pillBg,
    borderRadius: 22,
    paddingVertical: 13,
  },
  actionLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    paddingBottom: 18,
    backgroundColor: COLORS.bg,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  tabLabelActive: {
    color: COLORS.accentYellow,
  },
  tabActiveBar: {
    position: 'absolute',
    top: -8,
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.accentYellow,
  },
});