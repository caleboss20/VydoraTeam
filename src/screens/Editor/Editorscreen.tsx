
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Dimensions,
  Animated,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { s, vs, ms } from "react-native-size-matters";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ComponentProps } from "react";
/* ─── Type Declarations ─── */
type IonIconName = ComponentProps<typeof Ionicons>["name"];
interface VideoClip {
  id: string;
  title: string;
  color: string;
  image: string;
  duration: number; // in seconds
  speed: number;
}
interface TextOverlay {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  color: string;
  fontSize: number;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
}
interface Collaborator {
  id: string;
  name: string;
  color: string;
  avatar: string;
  role: string;
  cursorX: number;
  cursorY: number;
}
interface ChatComment {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}
/* ─── Design Tokens (Elegant Dark) ─── */
const C = {
  bg: "#0E0E0E",
  surface: "#1A1A1A",
  surfaceAlt: "#222222",
  border: "#2C2C2C",
  accent: "#F5C518", // Kodak Yellow
  purple: "#A259FF", // Accent purple
  textPrimary: "#FFFFFF",
  textSub: "#8A8A8A",
  textMuted: "#555555",
  overlay: "rgba(0,0,0,0.4)",
};
/* ─── Preset Data ─── */
const PRESET_CLIPS: VideoClip[] = [
  {
    id: "clip-1",
    title: "Lighthouse",
    color: "#F5C518",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    duration: 4.5,
    speed: 1.0,
  },
  {
    id: "clip-2",
    title: "Skate",
    color: "#A259FF",
    image: "https://images.unsplash.com/photo-1564982752979-3f7bc974d29a?q=80&w=600",
    duration: 3.5,
    speed: 1.0,
  },
  {
    id: "clip-3",
    title: "Desert",
    color: "#2C2C2C",
    image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=600",
    duration: 5.0,
    speed: 1.0,
  },
  {
    id: "clip-4",
    title: "Festival",
    color: "#E25C5C",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600",
    duration: 4.0,
    speed: 1.0,
  }
];
const PRESET_TEXT_LAYERS: TextOverlay[] = [
  {
    id: "txt-1",
    text: "T Lighthouse",
    startTime: 0.5,
    endTime: 4.0,
    color: "#FFFFFF",
    fontSize: ms(20),
    x: 50,
    y: 75,
  },
  {
    id: "txt-2",
    text: "✦ T Emotions",
    startTime: 3.0,
    endTime: 12.0,
    color: "#D3B7FF",
    fontSize: ms(18),
    x: 50,
    y: 83,
  }
];
const PRESET_COLLABORATORS: Collaborator[] = [
  {
    id: "c-1",
    name: "Sarah",
    color: "#E25C5C",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
    role: "Editor",
    cursorX: 45,
    cursorY: 65,
  },
  {
    id: "c-2",
    name: "Alex",
    color: "#A259FF",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
    role: "Sound Designer",
    cursorX: 72,
    cursorY: 88,
  }
];
const PRESET_COMMENTS: ChatComment[] = [
  {
    id: "m-1",
    user: "Sarah",
    text: "I adjusted the 'Lighthouse' placement to overlay nicely over the retro lady intro.",
    timestamp: "10m ago",
  },
  {
    id: "m-2",
    user: "Alex",
    text: "Waveform alignment looks sweet. Let's do a speed ramp next.",
    timestamp: "5m ago",
  }
];

const AUDIO_WAVE_HEIGHTS = [
  15, 22, 10, 8, 30, 42, 18, 12, 28, 35, 14, 20, 25, 40, 12, 18, 30, 48, 22, 10,
  15, 35, 45, 12, 8, 28, 38, 18, 14, 26, 32, 12, 20, 24, 38, 15, 10, 22, 34, 12
];

export default function VydoraEditorScreen() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(1.5);
  const [activeClipId, setActiveClipId] = useState<string>("clip-1");
  const [clips, setClips] = useState<VideoClip[]>(PRESET_CLIPS);
  const [textLayers, setTextLayers] = useState<TextOverlay[]>(PRESET_TEXT_LAYERS);
  const [selectedTextId, setSelectedTextId] = useState<string | null>("txt-1");
 
  const [collaborators] = useState<Collaborator[]>(PRESET_COLLABORATORS);
  const [comments, setComments] = useState<ChatComment[]>(PRESET_COMMENTS);
  const [showChatDrawer, setShowChatDrawer] = useState<boolean>(false);
  const [newCommentText, setNewCommentText] = useState<string>("");
  const [sarahPos, setSarahPos] = useState({ x: 45, y: 65 });
  const [alexPos, setAlexPos] = useState({ x: 72, y: 88 });
  const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0);
  useEffect(() => {
    let intervalId: any;
    if (isPlaying) {
      intervalId = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.1;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, totalDuration]);
  useEffect(() => {
    let cumulative = 0;
    for (const clip of clips) {
      cumulative += clip.duration;
      if (currentTime <= cumulative) {
        if (activeClipId !== clip.id) {
          setActiveClipId(clip.id);
        }
        break;
      }
    }
  }, [currentTime, clips]);
  useEffect(() => {
    const timer = setInterval(() => {
      setSarahPos({
        x: Math.floor(25 + Math.random() * 50),
        y: Math.floor(20 + Math.random() * 50),
      });
      setAlexPos({
        x: Math.floor(40 + Math.random() * 45),
        y: Math.floor(55 + Math.random() * 30),
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);
  const handleSendComment = () => {
    if (!newCommentText.trim()) return;
    const newMsg: ChatComment = {
      id: `m-${Date.now()}`,
      user: "Caleb",
      text: newCommentText.trim(),
      timestamp: "Just now",
    };
    setComments((prev) => [...prev, newMsg]);
    setNewCommentText("");
  };
  const formatSecs = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {/* ─── TOP BAR ─── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="share-outline" size={s(21)} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={styles.centerHeader}>
          <Text style={styles.topBarTitle}>Edit</Text>
          <View style={styles.syncRow}>
            <View style={styles.pulseDot} />
            <Text style={styles.syncText}>Live Syncing</Text>
          </View>
        </View>
        <View style={styles.rightHeaderRow}>
          <TouchableOpacity
            style={styles.collabStack}
            onPress={() => setShowChatDrawer(!showChatDrawer)}
            activeOpacity={0.8}
          >
            {collaborators.map((collab, index) => (
              <View
                key={collab.id}
                style={[
                  styles.avatarWrapper,
                  { borderColor: collab.color, marginLeft: index === 0 ? 0 : -s(10) }
                ]}
              >
                <ImageBackground
                  source={{ uri: collab.avatar }}
                  style={styles.avatarImage}
                  imageStyle={{ borderRadius: s(12) }}
                />
              </View>
            ))}
            <Ionicons name="chatbubble-ellipses" size={s(16)} color={C.purple} style={styles.chatIconBadge} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.checkmarkBtn}>
            <Ionicons name="checkmark" size={s(17)} color={C.bg} />
          </TouchableOpacity>
        </View>
      </View>
      {/* ─── VIDEO PLAYBACK CANVAS ─── */}
      <View style={styles.canvasWrapper}>
        <ImageBackground
          source={{ uri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80" }}
          style={styles.canvasImage}
          resizeMode="cover"
        >
          <View style={styles.canvasOverlay} />
          {/* DRAGGABLE TEXT LAYERS */}
          {textLayers.map((layer) => {
            const isActive = currentTime >= layer.startTime && currentTime <= layer.endTime;
            if (!isActive) return null;
            const isSelected = selectedTextId === layer.id;
            return (
              <View
                key={layer.id}
                style={[
                  styles.draggableTextContainer,
                  { left: `${layer.x}%`, top: `${layer.y}%` },
                  isSelected && styles.selectedTextContainer
                ]}
                onTouchStart={() => setSelectedTextId(layer.id)}
              >
                <Text style={[styles.canvasTextLabel, { color: layer.color }]}>
                  {layer.text}
                </Text>
                {isSelected && (
                  <View style={styles.selectedGlowBorder} />
                )}
              </View>
            );
          })}
          {/* PRESENCE LIVE CURSORS */}
          <View style={[styles.presenceCursor, { left: `${sarahPos.x}%`, top: `${sarahPos.y}%` }]}>
            <Ionicons name="navigate" size={s(12)} color="#E25C5C" style={{ transform: [{ rotate: "-45deg" }] }} />
            <Text style={styles.presenceNameTag}>Sarah</Text>
          </View>
          <View style={[styles.presenceCursor, { left: `${alexPos.x}%`, top: `${alexPos.y}%` }]}>
            <Ionicons name="navigate" size={s(12)} color="#A259FF" style={{ transform: [{ rotate: "-45deg" }] }} />
            <Text style={styles.presenceNameTag}>Alex</Text>
          </View>
          <TouchableOpacity
            style={styles.centerPlayBtn}
            onPress={() => setIsPlaying(!isPlaying)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={s(22)}
              color={C.textPrimary}
              style={!isPlaying && { marginLeft: s(3) }}
            />
          </TouchableOpacity>
          <View style={styles.canvasBottomHUD}>
            <View style={styles.timestampBadge}>
              <Text style={styles.timestampText}>
                {formatSecs(currentTime)} / {formatSecs(totalDuration)}
              </Text>
            </View>
            <TouchableOpacity style={styles.hudExpandBtn}>
              <Ionicons name="expand-outline" size={s(16)} color={C.textPrimary} />
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
      {/* ─── TIMELINE TRACKS AREA ─── */}
      <ScrollView style={styles.tracksScroll} showsVerticalScrollIndicator={false}>
       
        <View style={styles.timelineScrubberContainer}>
          <View style={styles.rulerRow}>
            <Text style={styles.rulerTickText}>0s</Text>
            <Text style={styles.rulerTickText}>5s</Text>
            <Text style={styles.rulerTickText}>10s</Text>
            <Text style={styles.rulerTickText}>15s</Text>
          </View>
         
          <View style={styles.scrubberTrack}>
            <View
              style={[
                styles.verticalPlayheadLine,
                { left: `${(currentTime / totalDuration) * 100}%` }
              ]}
            >
              <View style={styles.playheadHandleKnob} />
            </View>
          </View>
        </View>
        {/* TEXT TRACK CHIPS */}
        <View style={styles.textTrackRow}>
          {textLayers.map((layer) => {
            const isSelected = selectedTextId === layer.id;
            return (
              <TouchableOpacity
                key={layer.id}
                style={[
                  styles.textChipItem,
                  isSelected ? styles.textChipActive : styles.textChipInactive
                ]}
                onPress={() => setSelectedTextId(layer.id)}
              >
                <Text style={styles.textIconTag}>T</Text>
                <Text style={[
                  styles.textChipLabel,
                  isSelected && { color: C.textPrimary, fontWeight: "700" }
                ]}>
                  {layer.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {/* MEDIA CLIP STRIP */}
        <View style={styles.clipStripContainer}>
          <TouchableOpacity style={styles.addClipDashedBtn}>
            <Ionicons name="add" size={s(18)} color={C.accent} />
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clipsStripScroll}>
            {clips.map((clip) => {
              const isActive = activeClipId === clip.id;
              return (
                <TouchableOpacity
                  key={clip.id}
                  style={[
                    styles.clipThumbItem,
                    { backgroundColor: clip.color },
                    isActive && styles.clipThumbActive
                  ]}
                  onPress={() => setActiveClipId(clip.id)}
                >
                  <Text style={styles.clipThumbLabel}>{clip.title}</Text>
                  <Text style={styles.clipThumbDuration}>{clip.duration}s</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        {/* AUDIO TRACK */}
        <View style={styles.audioWaveContainer}>
          <View style={styles.audioMetaLabel}>
            <Ionicons name="musical-notes" size={s(10)} color={C.accent} />
            <Text style={styles.audioMetaText}>Main Audio Track</Text>
          </View>
          <View style={styles.waveVisualRow}>
            {AUDIO_WAVE_HEIGHTS.map((h, idx) => {
              const isPassed = (currentTime / totalDuration) * AUDIO_WAVE_HEIGHTS.length > idx;
              return (
                <View
                  key={idx}
                  style={[
                    styles.waveBarItem,
                    {
                      height: s(h * 0.6),
                      backgroundColor: isPassed ? C.accent : C.textSub
                    }
                  ]}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>
      {/* ─── CHAT PANEL DRAWER OVERLAY ─── */}
      {showChatDrawer && (
        <View style={styles.drawerOverlayContainer}>
          <View style={styles.chatDrawerCard}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Comments Desk</Text>
              <TouchableOpacity onPress={() => setShowChatDrawer(false)}>
                <Ionicons name="close" size={s(20)} color={C.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.commentsListScroll}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentBubbleItem}>
                  <View style={styles.commentUserRow}>
                    <Text style={styles.commentUserText}>{comment.user}</Text>
                    <Text style={styles.commentTimeText}>{comment.timestamp}</Text>
                  </View>
                  <Text style={styles.commentBodyText}>{comment.text}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.drawerInputForm}>
              <View style={styles.textInputBoxWrap}>
                <Text style={styles.commentInputPlaceholder}>Type comment...</Text>
              </View>
              <TouchableOpacity style={styles.sendCommentBtn} onPress={handleSendComment}>
                <Ionicons name="send" size={s(12)} color={C.bg} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      {/* ─── BOTTOM ACTIONS TOOLBAR ─── */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.toolTabBtn}>
          <Ionicons name="cut-outline" size={s(22)} color={C.textPrimary} />
          <Text style={styles.toolTabLabel}>Split</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolTabBtn}>
          <Ionicons name="flame-outline" size={s(22)} color={C.textSub} />
          <Text style={styles.toolTabLabel}>Filter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolTabBtn}>
          <Ionicons name="volume-medium-outline" size={s(22)} color={C.textSub} />
          <Text style={styles.toolTabLabel}>Volume</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolTabBtn}>
          <Ionicons name="crop-outline" size={s(22)} color={C.textSub} />
          <Text style={styles.toolTabLabel}>Crop</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolTabBtn}>
          <Ionicons name="sync-outline" size={s(22)} color={C.textSub} />
          <Text style={styles.toolTabLabel}>Speed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolTabBtn}>
          <Ionicons name="copy-outline" size={s(22)} color={C.textSub} />
          <Text style={styles.toolTabLabel}>Copy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolTabBtn}>
          <Ionicons name="trash-outline" size={s(22)} color="#FF4444" />
          <Text style={[styles.toolTabLabel, { color: "#FF4444" }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}




const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: s(16),
    paddingVertical: vs(12),
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  iconButton: {
    padding: s(6),
    borderRadius: s(8),
  },
  centerHeader: {
    alignItems: "center",
  },
  topBarTitle: {
    color: C.textPrimary,
    fontSize: ms(16),
    fontWeight: "700",
  },
  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: vs(2),
  },
  pulseDot: {
    width: s(6),
    height: s(6),
    borderRadius: s(3),
    backgroundColor: "#10B981",
    marginRight: s(4),
  },
  syncText: {
    fontSize: ms(9),
    color: C.textSub,
    fontFamily: "monospace",
    textTransform: "uppercase",
  },
  rightHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  collabStack: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: s(8),
    marginRight: s(10),
    position: "relative",
  },
  avatarWrapper: {
    width: s(24),
    height: s(24),
    borderRadius: s(12),
    borderWidth: 1.5,
    overflow: "hidden",
    backgroundColor: C.surface,
  },
  avatarImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  chatIconBadge: {
    position: "absolute",
    right: -s(8),
    top: -s(4),
    backgroundColor: C.bg,
    borderRadius: s(6),
    padding: s(1),
  },
  checkmarkBtn: {
    width: s(28),
    height: s(28),
    borderRadius: s(14),
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  canvasWrapper: {
    width: "100%",
    height: vs(260),
    backgroundColor: "black",
    overflow: "hidden",
  },
  canvasImage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  canvasOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.overlay,
  },
  draggableTextContainer: {
    position: "absolute",
    paddingHorizontal: s(10),
    paddingVertical: vs(5),
    borderRadius: s(8),
    backgroundColor: "rgba(0,0,0,0.5)",
    transform: [{ translateX: -50 }, { translateY: -50 }],
  },

selectedTextContainer: {
    backgroundColor: "rgba(0,0,0,0.8)",
    borderWidth: 1,
    borderColor: C.accent,
  },
  selectedGlowBorder: {
    position: "absolute",
    inset: -2,
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: s(8),
    opacity: 0.5,
  },
  canvasTextLabel: {
    fontSize: ms(14),
    fontWeight: "700",
  },
  presenceCursor: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
  },
  presenceNameTag: {
    fontSize: ms(8),
    color: "#FFFFFF",
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: s(4),
    paddingVertical: vs(2),
    borderRadius: s(4),
    marginLeft: s(2),
  },
  centerPlayBtn: {
    width: s(50),
    height: s(50),
    borderRadius: s(25),
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  canvasBottomHUD: {
    position: "absolute",
    bottom: vs(12),
    left: s(12),
    right: s(12),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timestampBadge: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: s(8),
    paddingVertical: vs(4),
    borderRadius: s(6),
  },
  timestampText: {
    color: C.textPrimary,
    fontSize: ms(10),
    fontFamily: "monospace",
  },
  hudExpandBtn: {
    padding: s(6),
    borderRadius: s(6),
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  /* ── Tracks Scroll Area ── */
  tracksScroll: {
    flex: 1,
    paddingHorizontal: s(16),
    paddingTop: vs(12),
  },
  timelineScrubberContainer: {
    marginBottom: vs(12),
  },
  rulerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: vs(4),
  },
  rulerTickText: {
    fontSize: ms(9),
    color: C.textMuted,
    fontFamily: "monospace",
  },
  scrubberTrack: {
    height: vs(3),
    backgroundColor: C.border,
    borderRadius: s(2),
    position: "relative",
  },
  verticalPlayheadLine: {
    position: "absolute",
    top: -vs(6),
    bottom: -vs(100), // extends downwards through other tracks
    width: s(2),
    backgroundColor: C.accent,
    zIndex: 10,
  },
  playheadHandleKnob: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    backgroundColor: C.accent,
    position: "absolute",
    top: -s(2),
    left: -s(3),
  },
  /* ── Text tracks ── */
  textTrackRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: s(8),
    marginBottom: vs(14),
  },
  textChipItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: s(12),
    paddingVertical: vs(6),
    borderRadius: s(15),
    borderWidth: 1,
  },
  textChipActive: {
    backgroundColor: C.purple,
    borderColor: C.purple,
  },
  textChipInactive: {
    backgroundColor: C.surfaceAlt,
    borderColor: C.border,
  },
  textIconTag: {
    color: C.textPrimary,
    fontSize: ms(11),
    fontWeight: "bold",
    marginRight: s(4),
  },
  textChipLabel: {
    color: C.textSub,
    fontSize: ms(11),
  },
  /* ── Clip Thumbnails Strip ── */
  clipStripContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: vs(14),
  },
  addClipDashedBtn: {
    width: s(34),
    height: vs(54),
    borderRadius: s(6),
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceAlt,
    marginRight: s(8),
  },
  clipsStripScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(6),
  },
  clipThumbItem: {
    width: s(72),
    height: vs(54),
    borderRadius: s(6),
    padding: s(6),
    justifyContent: "space-between",
    opacity: 0.75,
  },
  clipThumbActive: {
    opacity: 1,
    borderWidth: 1.5,
    borderColor: C.accent,
  },
  clipThumbLabel: {
    color: C.textPrimary,
    fontSize: ms(9),
    fontWeight: "700",
  },
  clipThumbDuration: {
    color: "rgba(255,255,255,0.7)",
    fontSize: ms(8),
    fontFamily: "monospace",
  },
  /* ── Audio waveform ── */
  audioWaveContainer: {
    backgroundColor: C.surface,
    borderRadius: s(8),
    borderWidth: 1,
    borderColor: C.border,
    padding: s(10),
    marginBottom: vs(20),
  },
  audioMetaLabel: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: vs(6),
  },
  audioMetaText: {
    fontSize: ms(9),
    color: C.textSub,
    marginLeft: s(4),
    fontWeight: "bold",
  },
  waveVisualRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(1.5),
    height: vs(32),
  },
  waveBarItem: {
    width: s(2),
    borderRadius: s(1),
  },
  /* ── Chat Sidebar Drawer Overlay ── */
  drawerOverlayContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "75%",
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 99,
    flexDirection: "row-reverse",
  },
  chatDrawerCard: {
    width: "100%",
    height: "100%",
    backgroundColor: C.bg,
    borderLeftWidth: 1,
    borderColor: C.border,
    padding: s(16),
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(12),
  },
  drawerTitle: {
    color: C.textPrimary,
    fontSize: ms(14),
    fontWeight: "700",
  },
  commentsListScroll: {
    flex: 1,
    marginBottom: vs(12),
  },
  commentBubbleItem: {
    backgroundColor: C.surfaceAlt,
    borderRadius: s(8),
    padding: s(10),
    marginBottom: vs(8),
  },
  commentUserRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: vs(3),
  },
  commentUserText: {
    color: C.accent,
    fontSize: ms(10),
    fontWeight: "700",
  },
  commentTimeText: {
    color: C.textMuted,
    fontSize: ms(8),
  },
  commentBodyText: {
    color: C.textPrimary,
    fontSize: ms(11),
  },
  drawerInputForm: {
    flexDirection: "row",
    alignItems: "center",
  },
  textInputBoxWrap: {
    flex: 1,
    backgroundColor: C.surfaceAlt,
    borderRadius: s(10),
    paddingHorizontal: s(12),
    paddingVertical: vs(8),
    marginRight: s(8),
    borderWidth: 1,
    borderColor: C.border,
  },
  commentInputPlaceholder: {
    color: C.textMuted,
    fontSize: ms(11),
  },
  sendCommentBtn: {
    width: s(32),
    height: s(32),
    borderRadius: s(16),
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  /* ── Bottom tab bar ── */
  bottomTabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: vs(12),
    borderTopWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  toolTabBtn: {
    alignItems: "center",
  },
  toolTabLabel: {
    fontSize: ms(8),
    color: C.textSub,
    marginTop: vs(2),
    fontWeight: "600",
  },
});

