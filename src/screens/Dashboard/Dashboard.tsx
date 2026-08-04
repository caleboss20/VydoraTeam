import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  Modal,
  Alert,
  Dimensions,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ms, s, vs } from "react-native-size-matters";
import Share from "react-native-share"
import * as Sharing from "expo-sharing";
 import { Paths, File } from "expo-file-system";
import { useAuth } from "../Contexts/Authcontext";
import { useProject } from "../Contexts/projectContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNotification } from "../Contexts/notificatinContext";
import { Project, ProjectStatus } from "../types";
import { useExport } from "../Contexts/exportContext";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../Contexts/ThemeContext";
import { useWowPath } from "../Contexts/useWowPath";
import { resolveProjectCovers, subscribeProjectCovers } from "../services/projectCoverService";
import { resolveMediaUrl } from "../services/mediaUrl";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEventListener } from "expo";

const IMG_NEW_VIDEO = require("./media/dash-new-video.jpg");
const IMG_IMPORT_VIDEO = require("./media/dash-make-reel.jpg");
/** Short CC0 loop for the Get started “Drop footage” card. */
const DASH_DROP_FOOTAGE =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
// ─── Palette ─────────────────────────────────────────────────────────────────
type DashPalette = {
  bg: string;
  surface: string;
  card: string;
  border: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  heroBg: string;
  heroText: string;
  heroSubtext: string;
  versionBadgeBg: string;
  versionBadgeText: string;
  activeGreen: string;
  activeGreenText: string;
  draftText: string;
  draftBg: string;
  archivedBg: string;
  archivedText: string;
  searchBg: string;
  danger: string;
};

const DARK_C: DashPalette = {
  bg: "#0B0B0D",
  surface: "#161618",
  card: "#252528",
  border: "rgba(255,255,255,0.08)",
  accent: "#F5C518",
  textPrimary: "#FFFFFF",
  textSecondary: "#9A9AA0",
  heroBg: "#252528",
  heroText: "#FFFFFF",
  heroSubtext: "#9A9AA0",
  versionBadgeBg: "#F5C518",
  versionBadgeText: "#0B0B0D",
  activeGreen: "#1A3A2A",
  activeGreenText: "#2ECC71",
  draftText: "#9A9AA0",
  draftBg: "#2A2A2E",
  archivedBg: "#2A2520",
  archivedText: "#9A9AA0",
  searchBg: "#1C1C1F",
  danger: "#E05C5C",
};

const LIGHT_C: DashPalette = {
  bg: "#F2F3F5",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  border: "rgba(0,0,0,0.08)",
  accent: "#E5B800",
  textPrimary: "#111111",
  textSecondary: "#6B6B6B",
  heroBg: "#FFFFFF",
  heroText: "#111111",
  heroSubtext: "#6B6B6B",
  versionBadgeBg: "#E5B800",
  versionBadgeText: "#1A0E00",
  activeGreen: "#E8F8EF",
  activeGreenText: "#15803D",
  draftText: "#6B6B6B",
  draftBg: "#EEEEF0",
  archivedBg: "#F5F0EB",
  archivedText: "#6B6B6B",
  searchBg: "#FFFFFF",
  danger: "#DC2626",
};

/** Module holders so StyleSheet + subcomponents stay theme-aware without a full rewrite. */
let C: DashPalette = DARK_C;
let styles: ReturnType<typeof createDashboardStyles> = null as any;
const SCREEN_WIDTH = Dimensions.get("window").width;
// ─── Types ───────────────────────────────────────────────────────────────────
type QuickAction = {
  id: string;
  label: string;
  navigate: string;
  icon: keyof typeof Ionicons.glyphMap;
};
type ProjectMenuState = {
  visible: boolean;
  project: Project | null;
  top: number;
};
// ─── Helpers ─────────────────────────────────────────────────────────────────
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};
const timeAgo = (dateStr: string): string => {
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(dateStr || "");
  const then = new Date(hasZone ? dateStr : `${dateStr}Z`).getTime();
  if (Number.isNaN(then)) return "";
  let diff = Date.now() - then;
  if (diff < 0) diff = 0;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};
const formatDate = (dateStr: string): string => {
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(dateStr || "");
  const d = new Date(hasZone ? dateStr : `${dateStr}Z`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
};
// ─── Quick Actions (static, flat icon style) ─────────────────────────────────
/** CapCut-style tool grid entries on the home dashboard. */
type ToolTile = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Editor tool name, or a dashboard route action. */
  action:
    | "wow"
    | "newproject"
    | "export"
    | "library"
    | "settings"
    | "upload"
    | "captions"
    | "editorTool";
  /** Passed to editorscreen / wow path when action is editorTool or captions. */
  editorTool?: string;
};

/** 12 CapCut-like shortcuts — compact icon row under Explore features. */
const TOOL_TILES: ToolTile[] = [
  { id: "captions", label: "Captions", icon: "text-outline", action: "captions", editorTool: "Captions" },
  { id: "effects", label: "Effects", icon: "color-wand-outline", action: "editorTool", editorTool: "Effects" },
  { id: "filters", label: "Filters", icon: "color-filter-outline", action: "editorTool", editorTool: "Filter" },
  { id: "text", label: "Text", icon: "text", action: "editorTool", editorTool: "Text" },
  { id: "music", label: "Music", icon: "musical-notes-outline", action: "editorTool", editorTool: "Music" },
  { id: "overlay", label: "Overlay", icon: "layers-outline", action: "editorTool", editorTool: "Overlay" },
  { id: "stickers", label: "Stickers", icon: "happy-outline", action: "editorTool", editorTool: "Stickers" },
  { id: "speed", label: "Speed", icon: "speedometer-outline", action: "editorTool", editorTool: "Speed" },
  { id: "crop", label: "Crop", icon: "crop-outline", action: "editorTool", editorTool: "Crop" },
  { id: "voiceover", label: "Voiceover", icon: "mic-outline", action: "editorTool", editorTool: "Voiceover" },
  { id: "shorts", label: "Shorts", icon: "phone-portrait-outline", action: "editorTool", editorTool: "Shorts" },
  { id: "export", label: "Export", icon: "download-outline", action: "export" },
];

/** Empty / first-run: only the three paths that finish a reel. */
const QUICK_ACTIONS_BEGINNER: QuickAction[] = [
  {
    id: "reel",
    label: "Make a reel",
    icon: "flash-outline",
    navigate: "__wow__",
  },
  {
    id: "captions",
    label: "Auto captions",
    icon: "text-outline",
    navigate: "__captions__",
  },
  { id: "export", label: "Export", icon: "share-outline", navigate: "export" },
];

/** Returning users: same focused trio (Invite/Upload live in project detail). */
const QUICK_ACTIONS_FULL: QuickAction[] = QUICK_ACTIONS_BEGINNER;



// ─── Sub-components ───────────────────────────────────────────────────────────
type AvatarProps = { initials: string; color: string; size?: number };
const Avatar: React.FC<AvatarProps> = ({ initials, color, size = ms(22) }) => (
  <View
    style={[
      styles.avatar,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      },
    ]}
  >
    <Text style={[styles.avatarText, { fontSize: ms(9) }]}>{initials}</Text>
  </View>
);
type AvatarStackProps = {
  avatars: { initials: string; color: string }[];
  size: number;
};
const AvatarStack: React.FC<AvatarStackProps> = ({ avatars, size }) => (
  <>
    {avatars.slice(0, 3).map((a, i) => (
      <View
        key={i}
        style={[styles.avatarWrapper, { marginLeft: i === 0 ? 0 : -ms(8) }]}
      >
        <Avatar initials={a.initials} color={a.color} size={size} />
      </View>
    ))}
  </>
);
type StatusBadgeProps = { status: ProjectStatus };
const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = {
    Active: { bg: C.activeGreen, text: C.activeGreenText },
    Draft: { bg: C.draftBg, text: C.draftText },
    Archived: { bg: C.archivedBg, text: C.archivedText },
    FinalLocked: { bg: C.versionBadgeBg, text: C.versionBadgeText },
  }[status];
  const label = status === "FinalLocked" ? "Final" : status;
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.text }]}>{label}</Text>
    </View>
  );
};

/** Soft first-load slide for project rows (CapCut-quiet, not scroll-linked). */
const ProjectRowEntrance: React.FC<{ index: number; children: React.ReactNode }> = ({
  index,
  children,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    const delay = Math.min(index, 8) * 48;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 340,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(y, {
        toValue: 0,
        duration: 380,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY: y }] }}>
      {children}
    </Animated.View>
  );
};

/** Live looping preview for Get started → Drop footage. */
function DropFootageCard({
  isDark,
  pressScale,
  onPress,
  onPressIn,
  onPressOut,
}: {
  isDark: boolean;
  pressScale: Animated.Value;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  const focused = useIsFocused();
  const [videoReady, setVideoReady] = useState(false);
  const player = useVideoPlayer(DASH_DROP_FOOTAGE, (p) => {
    p.loop = true;
    p.muted = true;
    try {
      p.audioMixingMode = "mixWithOthers";
    } catch {
      /* older expo-video */
    }
  });

  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "readyToPlay") {
      setVideoReady(true);
      if (focused) {
        try {
          player.play();
        } catch {
          /* ignore */
        }
      }
    }
  });

  useEffect(() => {
    try {
      if (focused) player.play();
      else player.pause();
    } catch {
      /* ignore */
    }
  }, [focused, player]);

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: pressScale }] }}>
      <Pressable
        style={[styles.startCard, { flex: 1 }]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <View style={styles.startCardImage}>
          <Image
            source={IMG_IMPORT_VIDEO}
            style={[StyleSheet.absoluteFillObject, { opacity: videoReady ? 0 : 1 }]}
            resizeMode="cover"
          />
          <VideoView
            style={StyleSheet.absoluteFillObject}
            player={player}
            contentFit="cover"
            nativeControls={false}
          />
          {/* Deeper cinematic fade than New video — keeps type readable over motion */}
          <LinearGradient
            colors={[
              "rgba(0,0,0,0)",
              "rgba(8,10,16,0.18)",
              "rgba(8,10,16,0.62)",
              isDark ? "rgba(11,11,13,0.97)" : "rgba(242,243,245,0.96)",
            ]}
            locations={[0, 0.32, 0.68, 1]}
            style={styles.startCardFade}
            pointerEvents="none"
          />
          <LinearGradient
            colors={[
              "transparent",
              "rgba(245,197,24,0.16)",
              "transparent",
            ]}
            start={{ x: 0, y: 0.55 }}
            end={{ x: 1, y: 0.55 }}
            style={styles.startCardAccentWash}
            pointerEvents="none"
          />
          <View style={styles.startCardCopy} pointerEvents="none">
            <Text style={styles.startCardEyebrow}>Camera roll · Files</Text>
            <Text style={styles.startCardLabel}>Drop footage</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
function DashboardScreen() {
  const { isDark, toggleTheme } = useTheme();
  C = isDark ? DARK_C : LIGHT_C;
  styles = createDashboardStyles(C);

  const navigation = useNavigation<any>();
  const { user, token } = useAuth();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarUri = useMemo(
    () => resolveMediaUrl(user?.avatarUrl),
    [user?.avatarUrl]
  );
  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUri]);
  const {
    projects,
    isLoading,
    setCurrentProject,
    renameProject,
    deleteProject,
    updateThumbnail,
  } = useProject();
 const {exports:exportsList}=useExport();
  const { notifications } = useNotification();
  const { startWowPath, starting: wowStarting } = useWowPath();
  const [search, setSearch] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [projectCovers, setProjectCovers] = useState<Record<string, string>>({});

  const isEmpty = projects.length === 0;

  const [renameVisible, setRenameVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [renameInput, setRenameInput] = useState("");


  const [projectMenu, setProjectMenu] = useState<ProjectMenuState>({
    visible: false,
    project: null,
    top: 0,
  });


const isValidRename =
  renameInput.trim().length > 0 &&
  renameInput.trim() !== (renameTarget?.name ?? "").trim();

const handleConfirmRename = async () => {
  if (!isValidRename || !renameTarget) return;
  await renameProject(renameTarget.id, renameInput.trim());
  setRenameVisible(false);
  setRenameTarget(null);
};

  // ── Entrance + micro-interactions ──
  const greetOpacity = useRef(new Animated.Value(0)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameY = useRef(new Animated.Value(10)).current;
  const cardA = useRef(new Animated.Value(0)).current;
  const cardB = useRef(new Animated.Value(0)).current;
  const playPulse = useRef(new Animated.Value(1)).current;
  // Kept for Fast Refresh safety (older card used Ken Burns scale).
  const reelZoom = useRef(new Animated.Value(1)).current;
  const reelPlayPulse = useRef(new Animated.Value(1)).current;
  const toolAnims = useRef(
    Array.from({ length: TOOL_TILES.length }, () => new Animated.Value(0))
  ).current;
  const pressNew = useRef(new Animated.Value(1)).current;
  const pressImport = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(greetOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.parallel([
        Animated.timing(nameOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(nameY, {
          toValue: 0,
          duration: 380,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]),
    ]).start();

    Animated.stagger(70, [
      Animated.spring(cardA, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.spring(cardB, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.stagger(
      45,
      toolAnims.map((v) =>
        Animated.spring(v, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        })
      )
    ).start();

    const pulse = Animated.sequence([
      Animated.timing(playPulse, {
        toValue: 1.08,
        duration: 700,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(playPulse, {
        toValue: 1,
        duration: 700,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]);
    Animated.loop(pulse, { iterations: 3 }).start();

    // Idle value — avoids "reelZoom doesn't exist" if Metro still holds old JSX.
    reelZoom.setValue(1);

    Animated.loop(
      Animated.sequence([
        Animated.timing(reelPlayPulse, {
          toValue: 1.1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(reelPlayPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const pressIn = (v: Animated.Value) =>
    Animated.spring(v, { toValue: 0.97, useNativeDriver: true, friction: 6 }).start();
  const pressOut = (v: Animated.Value) =>
    Animated.spring(v, { toValue: 1, useNativeDriver: true, friction: 6 }).start();

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    return projects.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [projects, search]);

  const [failedCovers, setFailedCovers] = useState<Record<string, true>>({});

  const coverFor = useCallback(
    (project: Project) => {
      if (failedCovers[project.id]) return undefined;
      return (
        resolveMediaUrl(projectCovers[project.id] || project.thumbnailUrl) ||
        undefined
      );
    },
    [projectCovers, failedCovers]
  );

  useEffect(() => {
    if (!token || !projects.length) return;
    let cancelled = false;
    const persisted = new Set<string>();
    (async () => {
      await resolveProjectCovers(projects, token, (id, url) => {
        if (cancelled) return;
        const resolved = resolveMediaUrl(url) || url;
        setProjectCovers((prev) =>
          prev[id] === resolved ? prev : { ...prev, [id]: resolved }
        );
        setFailedCovers((prev) => {
          if (!prev[id]) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
        // Persist http covers onto the project so next list load is instant.
        if (!persisted.has(id) && resolved.startsWith("http")) {
          const p = projects.find((x) => x.id === id);
          if (p && !p.thumbnailUrl) {
            persisted.add(id);
            void updateThumbnail(id, resolved).catch(() => undefined);
          }
        }
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [projects, token, updateThumbnail]);

  useEffect(() => {
    return subscribeProjectCovers((id, url) => {
      const resolved = resolveMediaUrl(url) || url;
      setProjectCovers((prev) =>
        prev[id] === resolved ? prev : { ...prev, [id]: resolved }
      );
      setFailedCovers((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });
  }, []);

  const handleProjectPress = (project: Project) => {
    setCurrentProject(project);
    navigation.navigate("projectdetail");
  };


  const openProjectMenu = (project: Project, pageY: number) => {
    setProjectMenu({ visible: true, project, top: pageY });
  };


  const closeProjectMenu = () => {
    setProjectMenu({ visible: false, project: null, top: 0 });
  };

  const handleShareProject = async () => {
  const project = projectMenu.project;
  closeProjectMenu();
  if (!project) return;

  const readyExport = exportsList
    .filter((e) => e.projectId === project.id && e.status === "Ready" && e.fileUrl)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!readyExport?.fileUrl) {
    Alert.alert("No export ready", "Export this project first before sharing.");
    return;
  }

  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Sharing not available on this device");
      return;
    }

    let localUri = readyExport.fileUrl;

    if (readyExport.fileUrl.startsWith("http")) {


//  downloadAsync block //
const fileName = readyExport.fileUrl.split("/").pop() ?? "video.mp4";
const destination = new File(Paths.cache, fileName);
const downloaded = await File.downloadFileAsync(readyExport.fileUrl, destination);
localUri = downloaded.uri;
    }

    await Sharing.shareAsync(localUri);
  } catch (e) {
    // user dismissed the share sheet, or download failed silently
  }
};

  const handleDeleteProject = () => {
    const project = projectMenu.project;
    closeProjectMenu();
    if (!project) return;
    // Wait for the overflow Modal to dismiss — iOS won't show Alert on top of it.
    setTimeout(() => {
      Alert.alert(
        "Delete project?",
        `Are you sure you want to permanently delete "${project.name}"?\n\nThis cannot be undone. All clips, comments, and exports for this project will be removed.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete permanently",
            style: "destructive",
            onPress: () => {
              void deleteProject(project.id);
            },
          },
        ]
      );
    }, 350);
  };

  const handleEditProject = () => {
    const project = projectMenu.project;
    closeProjectMenu();
    if (!project) return;
    // Open rename after the menu Modal fully closes so the keyboard sheet isn't covered.
    setTimeout(() => {
      setRenameTarget(project);
      setRenameInput(project.name);
      setRenameVisible(true);
    }, 280);
  };


  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }
  const isNewUser = projects.length === 0;
  const recentProjects = filteredProjects.slice(0, 6);

  const openEditorTool = (toolLabel: string) => {
    const recent = projects[0];
    if (recent) {
      setCurrentProject(recent);
      navigation.navigate("editorscreen", { initialTool: toolLabel });
      return;
    }
    void startWowPath(toolLabel);
  };

  const runTool = (tile: ToolTile) => {
    switch (tile.action) {
      case "wow":
        void startWowPath(tile.editorTool ?? "Captions");
        break;
      case "captions":
        openEditorTool(tile.editorTool ?? "Captions");
        break;
      case "editorTool":
        openEditorTool(tile.editorTool ?? "Captions");
        break;
      case "newproject":
        navigation.navigate("newproject");
        break;
      case "export":
        navigation.navigate("export");
        break;
      case "library":
        navigation.navigate("MediaLibrary");
        break;
      case "upload":
        navigation.navigate("uploadvideo");
        break;
      case "settings":
        navigation.navigate("settings");
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={C.bg} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* Soft top wash — CapCut hero feel, Vydora black */}
        <LinearGradient
          colors={
            isDark
              ? ["#1A1520", "#0B0B0D", "#0B0B0D"]
              : ["#E8ECF4", "#F2F3F5", "#F2F3F5"]
          }
          locations={[0, 0.45, 1]}
          style={styles.heroWash}
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => navigation.navigate("Profile")}
              style={styles.headerProfileRow}
              hitSlop={6}
            >
              {avatarUri && !avatarFailed ? (
                <Image
                  style={styles.profileAvatar}
                  source={{ uri: avatarUri }}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <View style={[styles.profileAvatar, styles.profileAvatarFallback]}>
                  <Text style={styles.profileAvatarInitial}>
                    {(user?.name?.trim()?.[0] || user?.initials?.[0] || "V").toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.headerGreetingCol}>
                <Animated.Text
                  style={[styles.headerGreetingLine, { opacity: greetOpacity }]}
                  numberOfLines={1}
                >
                  {getGreeting()}
                </Animated.Text>
                <Animated.Text
                  style={[
                    styles.headerNameLine,
                    {
                      opacity: nameOpacity,
                      transform: [{ translateY: nameY }],
                    },
                  ]}
                  numberOfLines={1}
                >
                  {user?.name?.split(" ")[0] ?? "there"}
                  <Text style={styles.waveEmoji}> 👋</Text>
                </Animated.Text>
              </View>
            </Pressable>
            
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => setSearchOpen((v) => !v)}
                hitSlop={8}
              >
                <Ionicons name="search-outline" size={ms(20)} color={C.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => navigation.navigate("activities")}
                hitSlop={8}
              >
                <Ionicons name="notifications-outline" size={ms(20)} color={C.textPrimary} />
                {unreadCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {searchOpen ? (
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={ms(16)} color={C.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search projects…"
                placeholderTextColor={C.textSecondary}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={ms(16)} color={C.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.getStartedRow}
            activeOpacity={0.7}
            onPress={() => {
              Alert.alert("Get started", "How do you want to begin?", [
                {
                  text: "New video",
                  onPress: () => navigation.navigate("newproject"),
                },
                {
                  text: "Drop footage",
                  onPress: () => navigation.navigate("uploadvideo"),
                },
                {
                  text: "Guided first cut",
                  onPress: () => void startWowPath(),
                },
                { text: "Cancel", style: "cancel" },
              ]);
            }}
            accessibilityLabel="Get started options"
            accessibilityRole="button"
          >
            <Text style={styles.getStartedTitle}>Get started</Text>
            <View style={styles.getStartedChevron}>
              <Ionicons name="chevron-forward" size={ms(14)} color={C.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.startCardsRow}>
            <Animated.View
              style={{
                flex: 1.35,
                opacity: cardA,
                transform: [
                  {
                    translateY: cardA.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                  { scale: pressNew },
                ],
              }}
            >
              <Pressable
                style={[styles.startCard, styles.startCardPrimary, { flex: 1 }]}
                onPress={() => navigation.navigate("newproject")}
                onPressIn={() => pressIn(pressNew)}
                onPressOut={() => pressOut(pressNew)}
              >
                <ImageBackground
                  source={IMG_NEW_VIDEO}
                  style={styles.startCardImage}
                  imageStyle={styles.startCardImageInner}
                  resizeMode="cover"
                >
                  <LinearGradient
                    colors={[
                      "rgba(0,0,0,0)",
                      "rgba(11,11,13,0.35)",
                      isDark ? "#0B0B0D" : "#F2F3F5",
                    ]}
                    locations={[0.2, 0.55, 1]}
                    style={styles.startCardFade}
                  />
                  <Animated.View
                    style={[
                      styles.startCardPlayBtn,
                      { transform: [{ scale: playPulse }] },
                    ]}
                    pointerEvents="none"
                  >
                    <Ionicons name="play" size={ms(22)} color="#0B0B0D" />
                  </Animated.View>
                  <Text style={[styles.startCardLabel, styles.startCardLabelPad]}>
                    New video
                  </Text>
                </ImageBackground>
              </Pressable>
            </Animated.View>
            <Animated.View
              style={{
                flex: 1,
                opacity: cardB,
                transform: [
                  {
                    translateY: cardB.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              }}
            >
              <DropFootageCard
                isDark={isDark}
                pressScale={pressImport}
                onPress={() => navigation.navigate("uploadvideo")}
                onPressIn={() => pressIn(pressImport)}
                onPressOut={() => pressOut(pressImport)}
              />
            </Animated.View>
          </View>

        </LinearGradient>

        <Text style={styles.exploreTitle}>Explore features</Text>
        <View style={styles.toolGrid}>
          {TOOL_TILES.map((tile, index) => {
            const anim = toolAnims[index];
            return (
            <Animated.View
              key={tile.id}
              style={{
                width: "33.33%",
                opacity: anim,
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.94, 1],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={styles.toolTile}
                activeOpacity={0.7}
                disabled={wowStarting}
                onPress={() => runTool(tile)}
              >
                <View style={styles.toolIconWrap}>
                  <Ionicons name={tile.icon} size={ms(20)} color={C.textPrimary} />
                </View>
                <Text style={styles.toolTileLabel} numberOfLines={1}>
                  {tile.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
            );
          })}
        </View>

        {/* Guided first cut — typographic CTA, no stock portrait */}
        <TouchableOpacity
          style={styles.makeReelCard}
          activeOpacity={0.92}
          disabled={wowStarting}
          onPress={() => void startWowPath()}
        >
          <LinearGradient
            colors={
              isDark
                ? ["#1A1608", "#2A220C", "#F5C518"]
                : ["#0B0D13", "#1C1608", "#F5C518"]
            }
            locations={[0, 0.42, 1]}
            start={{ x: 0.05, y: 0 }}
            end={{ x: 0.95, y: 1 }}
            style={styles.makeReelClip}
          >
            {/* Abstract timeline bars — product signal, not a stock photo */}
            <View style={styles.makeReelGraphic} pointerEvents="none">
              <View style={[styles.makeReelBar, styles.makeReelBarA]} />
              <View style={[styles.makeReelBar, styles.makeReelBarB]} />
              <View style={[styles.makeReelBar, styles.makeReelBarC]} />
              <View style={styles.makeReelPlayhead} />
            </View>
            <LinearGradient
              colors={[
                "rgba(11,13,19,0.55)",
                "rgba(11,13,19,0.15)",
                "rgba(245,197,24,0.0)",
              ]}
              locations={[0, 0.45, 1]}
              style={styles.makeReelFade}
              pointerEvents="none"
            />
            <View style={styles.makeReelCopy}>
              <Text style={styles.makeReelEyebrow}>First edit · ~5 min</Text>
              <Text style={styles.makeReelTitle}>
                {wowStarting ? "Opening…" : "Guided first cut"}
              </Text>
              <Text style={styles.makeReelSubtitle}>
                We load a sample clip. You add captions, then export.
              </Text>
              <View style={styles.makeReelCtaRow}>
                <View style={styles.makeReelCta}>
                  <Text style={styles.makeReelCtaText}>
                    {wowStarting ? "Starting…" : "Try the walkthrough"}
                  </Text>
                </View>
                <Animated.View
                  style={[
                    styles.makeReelIcon,
                    { transform: [{ scale: reelPlayPulse }] },
                  ]}
                >
                  {wowStarting ? (
                    <ActivityIndicator color="#0B0D13" />
                  ) : (
                    <Ionicons name="arrow-forward" size={ms(18)} color="#0B0D13" />
                  )}
                </Animated.View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Projects list — skip empty block when new (CTA above covers it) */}
        {!isNewUser ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Projects</Text>
              <TouchableOpacity
                style={styles.settingsPill}
                onPress={() => navigation.navigate("settings")}
                activeOpacity={0.8}
              >
                <Text style={styles.settingsPillText}>Settings</Text>
              </TouchableOpacity>
            </View>
            {filteredProjects.length === 0 ? (
              <Text style={styles.emptySubtitleCentered}>No projects match your search</Text>
            ) : (
              filteredProjects.map((project, index) => {
                const cover = coverFor(project);
                return (
                <ProjectRowEntrance key={project.id} index={index}>
                <TouchableOpacity
                  style={styles.projectRow}
                  activeOpacity={0.85}
                  onPress={() => handleProjectPress(project)}
                >
                  <View style={styles.projectThumb}>
                    {cover ? (
                      <Image
                        source={{ uri: cover }}
                        style={styles.thumbnailImage}
                        onError={() =>
                          setFailedCovers((prev) =>
                            prev[project.id] ? prev : { ...prev, [project.id]: true }
                          )
                        }
                      />
                    ) : (
                      <View style={styles.thumbnailFallback}>
                        <Ionicons
                          name="videocam-outline"
                          size={ms(18)}
                          color={C.textSecondary}
                        />
                      </View>
                    )}
                  </View>
                  <View style={styles.projectInfo}>
                    <Text style={styles.projectTitle} numberOfLines={1}>
                      {project.name}
                    </Text>
                    <View style={styles.projectMetaRow}>
                      <StatusBadge status={project.status} />
                      <Text style={styles.projectMeta}>
                        {formatDate(project.updatedAt)} · {timeAgo(project.updatedAt)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.overflowBtn}
                    onPress={(event) => {
                      const { pageY } = event.nativeEvent;
                      openProjectMenu(project, pageY);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name="ellipsis-horizontal"
                      size={ms(18)}
                      color={C.textSecondary}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
                </ProjectRowEntrance>
                );
              })
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="videocam-outline" size={ms(36)} color={C.textSecondary} />
            <Text style={styles.emptyTitle}>No projects yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap New video or Drop footage above to start editing.
            </Text>
          </View>
        )}

        <View style={{ height: vs(28) }} />
      </ScrollView>

      {/* ── Project overflow menu (Edit / Share / Delete) ── */}
      <Modal
        visible={projectMenu.visible}
        transparent
        animationType="fade"
        onRequestClose={closeProjectMenu}
      >
        <Pressable style={styles.menuOverlay} onPress={closeProjectMenu}>
          <View
            style={[
              styles.popupMenu,
              { top: projectMenu.top + vs(4) },
            ]}
          >
            <TouchableOpacity
              style={styles.popupItem}
              activeOpacity={0.7}
              onPress={handleEditProject}
            >
              <Ionicons name="create-outline" size={ms(16)} color={C.textPrimary} />
              <Text style={styles.popupItemText}>Rename</Text>
            </TouchableOpacity>
            <View style={styles.popupDivider} />
            <TouchableOpacity
              style={styles.popupItem}
              activeOpacity={0.7}
              onPress={handleShareProject}
            >
              <Ionicons name="share-outline" size={ms(16)} color={C.textPrimary} />
              <Text style={styles.popupItemText}>Share</Text>
            </TouchableOpacity>
            <View style={styles.popupDivider} />
            <TouchableOpacity
              style={styles.popupItem}
              activeOpacity={0.7}
              onPress={handleDeleteProject}
            >
              <Ionicons name="trash-outline" size={ms(16)} color={C.danger} />
              <Text style={[styles.popupItemText, styles.popupItemTextDanger]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>


   <Modal
  visible={renameVisible}
  transparent
  animationType="slide"
  onRequestClose={() => {
    Keyboard.dismiss();
    setRenameVisible(false);
  }}
>
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : undefined}
  >
  <Pressable
    style={styles.sheetOverlay}
    onPress={() => {
      Keyboard.dismiss();
      setRenameVisible(false);
    }}
  >
    <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation?.()}>
      <View style={styles.sheetHandle} />

      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Rename project</Text>
        <TouchableOpacity
          onPress={() => {
            Keyboard.dismiss();
            setRenameVisible(false);
          }}
          hitSlop={10}
        >
          <Ionicons name="close-outline" size={ms(22)} color={C.textSecondary} />
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.sheetInput}
        value={renameInput}
        onChangeText={setRenameInput}
        placeholder="Project name"
        placeholderTextColor={C.textSecondary}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => {
          if (isValidRename) void handleConfirmRename();
        }}
      />

      <TouchableOpacity
        style={[styles.sheetConfirmBtn, isValidRename && styles.sheetConfirmBtnActive]}
        activeOpacity={0.8}
        disabled={!isValidRename}
        onPress={handleConfirmRename}
      >
        <Text style={[styles.sheetConfirmText, isValidRename && styles.sheetConfirmTextActive]}>
          Confirm
        </Text>
      </TouchableOpacity>
    </Pressable>
  </Pressable>
  </KeyboardAvoidingView>
  </Modal>




    </SafeAreaView>
  );
}
export default DashboardScreen;


// ─── Styles ──────────────────────────────────────────────────────────────────
function createDashboardStyles(C: DashPalette) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, backgroundColor: C.bg, justifyContent: "center" },
  scrollContent: {
    paddingBottom: vs(28),
  },
  heroWash: {
    paddingHorizontal: s(16),
    paddingTop: vs(6),
    paddingBottom: vs(4),
  },
  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(16),
    gap: s(8),
  },
  headerProfileRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: s(10),
    minWidth: 0,
  },
  headerGreetingCol: {
    flex: 1,
    minWidth: 0,
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerGreetingLine: {
    color: C.textSecondary,
    fontSize: ms(13),
    fontWeight: "600",
    lineHeight: ms(18),
  },
  headerNameLine: {
    color: C.textPrimary,
    fontSize: ms(20),
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: ms(26),
    marginTop: vs(2),
  },
  waveEmoji: { fontSize: ms(16) },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(8),
    backgroundColor: C.card,
    borderRadius: ms(22),
    paddingVertical: vs(8),
    paddingHorizontal: s(14),
  },
  brandDot: {
    width: ms(10),
    height: ms(10),
    borderRadius: ms(5),
    backgroundColor: C.accent,
  },
  brandText: {
    color: C.textPrimary,
    fontSize: ms(14),
    fontWeight: "700",
  },
  profileAvatarBtn: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: C.accent,
  },
  profileAvatar: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    borderWidth: 1.5,
    borderColor: C.accent,
    overflow: "hidden",
    backgroundColor: C.card,
  },
  profileAvatarFallback: {
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarInitial: {
    color: C.accent,
    fontSize: ms(16),
    fontWeight: "800",
  },
  exploreTitle: {
    color: C.textPrimary,
    fontSize: ms(18),
    fontWeight: "800",
    letterSpacing: -0.3,
    paddingHorizontal: s(16),
    marginTop: vs(6),
    marginBottom: vs(4),
  },
  greetingText: {
    color: C.textPrimary,
    fontSize: ms(18),
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: vs(2),
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(8),
  },
  themeToggle: {
    width: ms(48),
    height: ms(28),
    borderRadius: ms(14),
    backgroundColor: "#FFFFFF",
    padding: ms(3),
    justifyContent: "center",
  },
  themeToggleLight: {
    backgroundColor: "#E8E8EC",
  },
  themeThumb: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    backgroundColor: "#0B0B0D",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  themeThumbOn: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  headerIconBtn: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    alignItems: "center",
    justifyContent: "center",
  },
  profileBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(10),
  },
  profileimage: {
    width: s(44),
    height: s(44),
    borderRadius: s(22),
  },
  topgreetingbox: { 
    flexDirection: "column" 
  },
  headerGreeting: { color: C.textSecondary, fontSize: ms(13) },
  headerNameRow: { flexDirection: "row" },
  headerName: { color: C.textPrimary, fontSize: ms(20), fontWeight: "700" },
  bellWrapper: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight:s(2),
  },
  bellBadge: {
    position: "absolute",
    top: -ms(2),
    right: ms(2),
    backgroundColor: C.accent,
    borderRadius: ms(8),
    minWidth: ms(15),
    height: ms(15),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.bg,
  },
  bellBadgeText: { 
    color: "#0B0B0D", 
    fontSize: ms(8),
     fontWeight: "700" },
  getStartedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(8),
    marginBottom: vs(14),
    marginTop: vs(2),
  },
  getStartedTitle: {
    color: C.textPrimary,
    fontSize: ms(26),
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  getStartedChevron: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    backgroundColor: "rgba(128,128,128,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  startCardsRow: {
    flexDirection: "row",
    gap: s(10),
    marginBottom: vs(12),
  },
  startCard: {
    flex: 1,
    borderRadius: ms(20),
    overflow: "hidden",
    height: vs(180),
    backgroundColor: C.card,
  },
  startCardPrimary: {
    flex: 1.35,
  },
  startCardImage: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
  },
  startCardImageInner: {
    borderRadius: ms(20),
  },
  startCardFade: {
    ...StyleSheet.absoluteFillObject,
  },
  startCardAccentWash: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  startCardCopy: {
    zIndex: 2,
    paddingHorizontal: s(14),
    paddingBottom: vs(14),
  },
  startCardEyebrow: {
    color: "rgba(255,255,255,0.78)",
    fontSize: ms(10),
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: vs(3),
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  startCardPlayBtn: {
    position: "absolute",
    top: "36%",
    left: "50%",
    marginLeft: -ms(24),
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: ms(3),
    zIndex: 3,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  startCardLabel: {
    color: "#FFFFFF",
    fontSize: ms(15),
    fontWeight: "700",
    zIndex: 2,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  startCardLabelPad: {
    paddingHorizontal: s(14),
    paddingBottom: vs(14),
  },
  startCardIcon: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(14),
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  recentRow: {
    gap: s(8),
    paddingBottom: vs(6),
  },
  recentThumb: {
    width: s(78),
    height: s(78),
    borderRadius: ms(16),
    overflow: "hidden",
    backgroundColor: C.card,
  },
  recentThumbImg: { width: "100%", height: "100%" },
  recentThumbEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.card,
  },
  recentThumbInitial: {
    color: C.textPrimary,
    fontSize: ms(22),
    fontWeight: "700",
  },
  recentThumbPlaceholder: {
    backgroundColor: C.surface,
  },
  toolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: s(8),
    paddingTop: vs(6),
    marginBottom: vs(16),
  },
  toolTile: {
    width: "100%",
    alignItems: "center",
    paddingVertical: vs(10),
    gap: vs(6),
  },
  toolIconWrap: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(13),
    backgroundColor: C.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  toolTileLabel: {
    color: C.textPrimary,
    fontSize: ms(10.5),
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: s(2),
  },
  emptySubtitleCentered: {
    color: C.textSecondary,
    fontSize: ms(12),
    textAlign: "center",
    paddingVertical: vs(16),
    paddingHorizontal: s(16),
  },
  // Flat icon action row — no card backgrounds, icon + label stacked
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: vs(20),
  },
  quickActionBtn: { 
    alignItems: "center",
     gap: vs(6), flex: 1 
    },
  quickActionIconWrap: {
     alignItems: "center",
     justifyContent: "center"
     },
  quickActionLabel: {
    color: C.textSecondary,
    fontSize: ms(10.5),
    textAlign: "center",
  },
  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.searchBg,
    borderRadius: ms(14),
    paddingHorizontal: s(14),
    paddingVertical: vs(11),
    gap: s(8),
    marginBottom: vs(16),
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, color: C.textPrimary, fontSize: ms(13) },
  // Guided first-cut CTA — bold brand gradient, no stock portrait
  makeReelCard: {
    marginHorizontal: s(16),
    marginBottom: vs(18),
    marginTop: vs(6),
    borderRadius: ms(22),
    overflow: "hidden",
    minHeight: vs(168),
    backgroundColor: "#0B0D13",
  },
  makeReelClip: {
    flex: 1,
    width: "100%",
    minHeight: vs(168),
    overflow: "hidden",
    justifyContent: "flex-end",
    paddingTop: vs(18),
  },
  makeReelGraphic: {
    position: "absolute",
    right: s(14),
    top: vs(22),
    width: s(118),
    height: vs(72),
    justifyContent: "center",
    gap: vs(7),
    opacity: 0.9,
  },
  makeReelBar: {
    height: vs(10),
    borderRadius: ms(4),
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  makeReelBarA: { width: "88%" },
  makeReelBarB: {
    width: "100%",
    backgroundColor: "rgba(245,197,24,0.55)",
  },
  makeReelBarC: { width: "64%" },
  makeReelPlayhead: {
    position: "absolute",
    left: "42%",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#F5C518",
    borderRadius: 1,
  },
  makeReelFade: {
    ...StyleSheet.absoluteFillObject,
  },
  makeReelCopy: {
    paddingHorizontal: s(16),
    paddingBottom: vs(16),
    zIndex: 2,
    maxWidth: "92%",
  },
  makeReelEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: ms(10),
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: vs(6),
  },
  makeReelTitle: {
    color: "#FFFFFF",
    fontSize: ms(22),
    fontWeight: "800",
    letterSpacing: 0.15,
  },
  makeReelSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: ms(12),
    fontWeight: "500",
    lineHeight: ms(17),
    marginTop: vs(5),
    marginBottom: vs(14),
    maxWidth: s(240),
  },
  makeReelCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(10),
  },
  makeReelCta: {
    backgroundColor: "#F5C518",
    borderRadius: ms(999),
    paddingHorizontal: s(14),
    paddingVertical: vs(8),
  },
  makeReelCtaText: {
    color: "#0B0D13",
    fontSize: ms(12),
    fontWeight: "800",
  },
  makeReelIcon: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    backgroundColor: "#F5C518",
    alignItems: "center",
    justifyContent: "center",
  },
  makeReelKenBurns: {
    ...StyleSheet.absoluteFillObject,
  },
  makeReelImage: {
    flex: 1,
  },
  makeReelImageInner: {
    borderRadius: ms(22),
  },
  makeReelLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroTextBox: { flex: 1, gap: vs(2) },
  // Hero "NEW PROJECT" card — light teal like reference
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.heroBg,
    borderRadius: ms(18),
    padding: s(18),
  },
  heroTitle: {
    color: C.heroText,
    fontSize: ms(16),
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  heroSubtitle: { color: C.heroSubtext, fontSize: ms(12), marginBottom: vs(6) },
  versionBadge: {
    alignSelf: "flex-start",
    backgroundColor: C.versionBadgeBg,
    borderRadius: ms(20),
    paddingHorizontal: s(10),
    paddingVertical: vs(3),
  },
  versionBadgeText: {
    color: C.versionBadgeText,
    fontSize: ms(10),
    fontWeight: "700",
  },
  heroCtaOuter: { alignItems: "center", justifyContent: "center" },
  heroCtaDashed: {
    width: ms(52),
    height: ms(52),
    borderRadius: ms(26),
    borderWidth: 1.5,
    borderColor: C.heroSubtext,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  // Section headers
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(10),
    paddingHorizontal: s(16),
    marginTop:s(10),
  },
  sectionLabel: {
    color: C.textPrimary,
    fontSize: ms(15),
    fontWeight: "700",
  },
  settingsPill: {
    backgroundColor: C.card,
    borderRadius: ms(20),
    paddingHorizontal: s(12),
    paddingVertical: vs(5),
  },
  settingsPillText: {
    color: C.textPrimary,
    fontSize: ms(11),
    fontWeight: "600",
  },
  // Empty state
  emptyState: { alignItems: "center", paddingVertical: vs(32) },
  emptyTitle: {
    color: C.textPrimary,
    fontSize: ms(15),
    fontWeight: "600",
    marginTop: vs(10),
  },
  emptySubtitle: { color: C.textSecondary, fontSize: ms(12), marginTop: vs(4) },
  wowCta: {
    marginTop: vs(18),
    backgroundColor: C.accent,
    borderRadius: ms(24),
    paddingHorizontal: s(22),
    paddingVertical: vs(11),
    minWidth: s(200),
    alignItems: "center",
  },
  wowCtaText: {
    color: C.heroText,
    fontSize: ms(13),
    fontWeight: "800",
  },
  // Project row — thumbnail-led, matches reference list style
  projectRow: {
    backgroundColor: C.card,
    borderRadius: ms(14),
    flexDirection: "row",
    alignItems: "center",
    padding: s(10),
    gap: s(12),
    marginBottom: vs(10),
    marginHorizontal: s(16),
  },
  projectThumb: {
    width: s(56),
    height: s(56),
    backgroundColor: C.surface,
    borderRadius: ms(10),
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbnailImage: { width: "100%", height: "100%" },
  thumbnailFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
  },
  projectInfo: { flex: 1, gap: vs(3) },
  projectTitle: { color: C.textPrimary, fontSize: ms(14), fontWeight: "700" },
  accessBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  accessBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(4),
    backgroundColor: C.draftBg,
    borderRadius: ms(8),
    paddingHorizontal: s(8),
    paddingVertical: vs(2),
  },
  accessBadgeShared: {
    backgroundColor: "rgba(245,197,24,0.12)",
  },
  accessBadgeText: {
    color: C.textSecondary,
    fontSize: ms(10),
    fontWeight: "700",
  },
  accessBadgeTextShared: {
    color: C.accent,
  },
  projectMetaRow: { flexDirection: "row", alignItems: "center", gap: s(8) },
  projectMeta: { color: C.textSecondary, fontSize: ms(10.5) },
  memberCountText: {
    color: C.textSecondary,
    fontSize: ms(10),
    marginLeft: s(6),
  },
  avatarRow: { flexDirection: "row", alignItems: "center", marginTop: vs(2) },
  avatarWrapper: {
    borderWidth: 1.5,
    borderColor: C.surface,
    borderRadius: ms(20),
  },
  avatar: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700" },
  overflowBtn: { padding: s(4) },
  badge: {
    paddingHorizontal: s(8),
    paddingVertical: vs(2),
    borderRadius: ms(20),
  },
  badgeText: { fontSize: ms(9.5), fontWeight: "600" },

  
  // ── New styles for the overflow popup menu ──
  menuOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  popupMenu: {
    position: "absolute",
    right: s(16),
    backgroundColor: C.card,
    borderRadius: ms(12),
    paddingVertical: vs(4),
    minWidth: s(140),
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  popupItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: s(14),
    paddingVertical: vs(10),
    gap: s(10),
  },
  popupItemText: {
    color: C.textPrimary,
    fontSize: ms(13),
    fontWeight: "500",
  },
  popupItemTextDanger: {
    color: C.danger,
  },
  popupDivider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: s(8),
  },




  sheetOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.6)",
  justifyContent: "flex-end",
},
sheetContainer: {
  backgroundColor: C.card,
  borderTopLeftRadius: ms(20),
  borderTopRightRadius: ms(20),
  paddingHorizontal: ms(20),
  paddingTop: vs(10),
  paddingBottom: vs(28),
},
sheetHandle: {
  width: ms(36),
  height: ms(4),
  borderRadius: ms(2),
  backgroundColor: C.border,
  alignSelf: "center",
  marginBottom: vs(14),
},
sheetHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: vs(16),
},
sheetTitle: {
  color: C.textPrimary,
  fontSize: ms(16),
  fontWeight: "600",
},
sheetInput: {
  backgroundColor: C.bg,
  borderWidth: 1,
  borderColor: C.border,
  borderRadius: ms(12),
  paddingHorizontal: ms(14),
  paddingVertical: vs(12),
  color: C.textPrimary,
  fontSize: ms(15),
  marginBottom: vs(18),
},
sheetConfirmBtn: {
  backgroundColor: C.border,
  borderRadius: ms(12),
  paddingVertical: vs(13),
  alignItems: "center",
},
sheetConfirmBtnActive: {
  backgroundColor: C.accent,
},
sheetConfirmText: {
  color: C.textSecondary,
  fontSize: ms(15),
  fontWeight: "600",
},
sheetConfirmTextActive: {
  color: "#141414",
},
});
}

styles = createDashboardStyles(DARK_C);
