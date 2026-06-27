
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  PanResponder,
  Animated,
  StatusBar,
 
  Dimensions,
  GestureResponderEvent,
} from 'react-native';
import { SafeAreaView,} from "react-native-safe-area-context"
import { Ionicons } from '@expo/vector-icons';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLORS = {
  bg: '#111111',
  surface: '#1C1C1C',
  yellow: '#F5C518',
  teal: '#3ECFCF',
  purple: '#8B5CF6',
  text: '#FFFFFF',
  textMuted: '#666666',
  textDim: '#444444',
  border: '#2A2A2A',
  trackBg: '#1A1A1A',
  btnBg: '#1E1E1E',
} as const;
const TRACK_HEIGHT = 52;
const GAP = 16;
const CLIP_UNIT = 90;
const LABEL_WIDTH = 64;
interface Clip {
  id: string;
  trackIndex: number;
  x: number;
  width: number;
  color: string;
}
interface Track {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}
const TRACKS: Track[] = [
  { id: 'video', label: 'Video', icon: 'videocam-outline' },
  { id: 'audio', label: 'Audio', icon: 'musical-notes-outline' },
  { id: 'text',  label: 'Text',  icon: 'text-outline' },
];
const RULER_MARKS = ['0:00', '0:15', '0:30', '0:45', '1:00'];
const TOTAL_UNITS = 4;
const CANVAS_WIDTH = TOTAL_UNITS * CLIP_UNIT + 80;
// ─── Draggable Clip ───────────────────────────────────────────────────
function DraggableClip({ clip, onUpdate }: { clip: Clip; onUpdate: (c: Clip) => void }) {
  const pan = useRef(new Animated.ValueXY({ x: clip.x, y: 0 })).current;
  const lastX = useRef(clip.x);
  const pr = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      pan.setOffset({ x: lastX.current, y: 0 });
      pan.setValue({ x: 0, y: 0 });
    },
    onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      const newX = Math.max(0, lastX.current + g.dx);
      lastX.current = newX;
      pan.flattenOffset();
      pan.setValue({ x: newX, y: 0 });
      onUpdate({ ...clip, x: newX });
    },
  });
  return (
    <Animated.View
      {...pr.panHandlers}
      style={[
        styles.clip,
        {
          width: clip.width,
          backgroundColor: clip.color,
          transform: [{ translateX: pan.x }],
        },
      ]}
    >
      <View style={styles.resizeLeft} />
      <View style={styles.resizeRight} />
    </Animated.View>
  );
}
// ─── Playhead ─────────────────────────────────────────────────────────
function Playhead({ height }: { height: number }) {
  const pan = useRef(new Animated.Value(CLIP_UNIT * 1.5)).current;
  const lastX = useRef(CLIP_UNIT * 1.5);
  const pr = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      pan.setOffset(lastX.current);
      pan.setValue(0);
    },
    onPanResponderMove: Animated.event([null, { dx: pan }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      const newX = Math.min(Math.max(0, lastX.current + g.dx), CANVAS_WIDTH);
      lastX.current = newX;
      pan.flattenOffset();
      pan.setValue(newX);
    },
  });
  return (
    <Animated.View
      {...pr.panHandlers}
      style={[styles.playhead, { height, transform: [{ translateX: pan }] }]}
    >
      <View style={styles.playheadDot} />
      <View style={[styles.playheadLine, { height }]} />
    </Animated.View>
  );
}
// ─── Main Screen ──────────────────────────────────────────────────────
interface Props {
  navigation?: { goBack: () => void };
}
export default function TimelineScreen({ navigation }: Props) {
  const [zoom, setZoom] = useState(0.5);
  const [clips, setClips] = useState<Clip[]>([
    // Video — two yellow clips
    { id: 'v1', trackIndex: 0, x: 0,              width: CLIP_UNIT * 1.5, color: COLORS.yellow },
    { id: 'v2', trackIndex: 0, x: CLIP_UNIT * 1.7, width: CLIP_UNIT * 1.2, color: COLORS.yellow },
    // Audio — one teal clip
    { id: 'a1', trackIndex: 1, x: CLIP_UNIT * 0.5, width: CLIP_UNIT * 2.2, color: COLORS.teal },
    // Text — one purple clip
    { id: 't1', trackIndex: 2, x: CLIP_UNIT * 0.8, width: CLIP_UNIT * 0.8, color: COLORS.purple },
  ]);
  function updateClip(updated: Clip) {
    setClips(prev => prev.map(c => (c.id === updated.id ? updated : c)));
  }
  const canvasHeight = TRACKS.length * (TRACK_HEIGHT + GAP);
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          <Text style={styles.topTitle}>Timeline</Text>
        </TouchableOpacity>
        {/* Collaborator avatars toggle */}
        <View style={styles.avatarGroup}>
          <View style={[styles.avatar, { backgroundColor: '#FF6B6B', zIndex: 3 }]} />
          <View style={[styles.avatar, { backgroundColor: '#3ECFCF', zIndex: 2, marginLeft: -10 }]} />
          <View style={[styles.avatarToggle, { marginLeft: -10, zIndex: 1 }]}>
            <View style={styles.avatarToggleInner} />
          </View>
        </View>
      </View>
      {/* ── Video Preview ── */}
      <View style={styles.preview}>
        <TouchableOpacity style={styles.playBtn}>
          <View style={styles.playCircle}>
            <Ionicons name="play" size={24} color={COLORS.text} />
          </View>
        </TouchableOpacity>
        <Text style={styles.previewTime}>00:24 / 01:12</Text>
        <Text style={styles.previewName}>Project.mp4</Text>
      </View>
      {/* ── Undo/Redo + clip count ── */}
      <View style={styles.controlsRow}>
        <View style={styles.undoRedo}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="arrow-undo-outline" size={18} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="arrow-redo-outline" size={18} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <Text style={styles.clipCount}>3 clips · 1:12</Text>
      </View>
      {/* ── Timeline ── */}
      <View style={styles.timelineWrapper}>
        {/* Track label column */}
        <View style={styles.labelCol}>
          {/* Ruler spacer */}
          <View style={{ height: 28 }} />
          {TRACKS.map(t => (
            <View key={t.id} style={styles.trackLabel}>
              <Ionicons name={t.icon} size={14} color={COLORS.textMuted} />
              <Text style={styles.trackLabelText}>{t.label}</Text>
            </View>
          ))}
        </View>
        {/* Scrollable canvas */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ width: CANVAS_WIDTH }}>
            {/* Ruler */}
            <View style={styles.ruler}>
              {RULER_MARKS.map((mark, i) => (
                <View key={mark} style={[styles.rulerMark, { left: i * CLIP_UNIT }]}>
                  <View style={styles.rulerTick} />
                  <Text style={styles.rulerLabel}>{mark}</Text>
                </View>
              ))}
            </View>
            {/* Track rows */}
            <View style={{ position: 'relative', height: canvasHeight + 20 }}>
              {TRACKS.map((t, i) => (
                <View
                  key={t.id}
                  style={[
                    styles.trackRow,
                    { top: i * (TRACK_HEIGHT + GAP), width: CANVAS_WIDTH },
                  ]}
                />
              ))}
              {/* Clips per track */}
              {TRACKS.map((t, trackIndex) => (
                <View
                  key={t.id}
                  style={{
                    position: 'absolute',
                    top: trackIndex * (TRACK_HEIGHT + GAP),
                    left: 0,
                    height: TRACK_HEIGHT,
                  }}
                >
                  {clips
                    .filter(c => c.trackIndex === trackIndex)
                    .map(clip => (
                      <DraggableClip key={clip.id} clip={clip} onUpdate={updateClip} />
                    ))}
                </View>
              ))}
              {/* Playhead */}
              <Playhead height={canvasHeight + 20} />
            </View>
          </View>
        </ScrollView>
      </View>
      {/* ── Zoom Slider ── */}
      <View style={styles.zoomRow}>
        <Ionicons name="remove-circle-outline" size={18} color={COLORS.textMuted} />
        <TouchableOpacity
          style={styles.zoomTrack}
          onPress={(e: GestureResponderEvent) => {
            const ratio = e.nativeEvent.locationX / (SCREEN_WIDTH - 120);
            setZoom(Math.min(1, Math.max(0, ratio)));
          }}
        >
          <View style={[styles.zoomFill, { width: `${zoom * 100}%` }]} />
          <View style={[styles.zoomThumb, { left: `${zoom * 100}%` }]} />
        </TouchableOpacity>
        <Ionicons name="add-circle-outline" size={18} color={COLORS.textMuted} />
        <Text style={styles.zoomLabel}>Zoom</Text>
      </View>
      {/* ── Action Buttons ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="cut-outline" size={16} color={COLORS.text} />
          <Text style={styles.actionBtnText}>Split clip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="add" size={16} color={COLORS.text} />
          <Text style={styles.actionBtnText}>Add track</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
// ─── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitle: { color: COLORS.text, fontSize: 17, fontWeight: '600' },
  avatarGroup: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  avatarToggle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2A2A2A',
    borderWidth: 2,
    borderColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarToggleInner: {
    width: 14,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.yellow,
  },
  // Preview
  preview: {
    marginHorizontal: 16,
    height: 160,
    backgroundColor: '#0A0A0A',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  playBtn: { alignItems: 'center', justifyContent: 'center' },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTime: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  previewName: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  // Controls row
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  undoRedo: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 4 },
  clipCount: { color: COLORS.textMuted, fontSize: 12 },
  // Timeline
  timelineWrapper: {
    flexDirection: 'row',
    flex: 1,
    paddingLeft: 8,
  },
  labelCol: {
    width: LABEL_WIDTH,
    paddingLeft: 8,
  },
  trackLabel: {
    height: TRACK_HEIGHT + GAP,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackLabelText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  // Ruler
  ruler: {
    height: 28,
    position: 'relative',
  },
  rulerMark: {
    position: 'absolute',
    alignItems: 'center',
    top: 0,
  },
  rulerTick: {
    width: 1,
    height: 8,
    backgroundColor: COLORS.textDim,
  },
  rulerLabel: {
    color: COLORS.textDim,
    fontSize: 9,
    marginTop: 2,
  },
  // Track row background
  trackRow: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    backgroundColor: COLORS.trackBg,
    borderRadius: 6,
  },
  // Clip
  clip: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    borderRadius: 6,
    opacity: 0.95,
    top: 0,
  },
  resizeLeft: {
    position: 'absolute',
    left: 4,
    top: '20%',
    width: 3,
    height: '60%',
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  resizeRight: {
    position: 'absolute',
    right: 4,
    top: '20%',
    width: 3,
    height: '60%',
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  // Playhead
  playhead: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 2,
    alignItems: 'center',
    zIndex: 10,
  },
  playheadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.yellow,
  },
  playheadLine: {
    width: 2,
    backgroundColor: COLORS.yellow,
  },
  // Zoom
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  zoomTrack: {
    flex: 1,
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    justifyContent: 'center',
  },
  zoomFill: {
    height: 3,
    backgroundColor: COLORS.yellow,
    borderRadius: 2,
  },
  zoomThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.yellow,
    marginLeft: -7,
    top: -5.5,
  },
  zoomLabel: { color: COLORS.textMuted, fontSize: 11 },
  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.btnBg,
  },
  actionBtnText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
});