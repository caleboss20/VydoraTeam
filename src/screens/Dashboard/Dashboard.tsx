import React, { useState, useMemo } from "react";
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
  Pressable,
  Modal,
  Alert,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ms, s, vs } from "react-native-size-matters";
import Share from "react-native-share"
import * as Sharing from "expo-sharing";
 import { Paths, File } from "expo-file-system";
import { useAuth } from "../Contexts/Authcontext";
import { useProject } from "../Contexts/projectContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNotification } from "../Contexts/notificatinContext";
import { Project } from "../types";
import { useExport } from "../Contexts/exportContext";
import UpgradeToProBanner from "../components/upgradeToProBanner";
import { useTheme } from "../Contexts/ThemeContext";
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
  bg: "#141414",
  surface: "#1C1C1C",
  card: "#212121",
  border: "rgba(255,255,255,0.06)",
  accent: "#F5C518",
  textPrimary: "#FFFFFF",
  textSecondary: "#8A8A8A",
  heroBg: "#D9E9E8",
  heroText: "#0F1F1E",
  heroSubtext: "#3F5654",
  versionBadgeBg: "#F5934F",
  versionBadgeText: "#1A0E00",
  activeGreen: "#1A3A2A",
  activeGreenText: "#2ECC71",
  draftText: "#8A8A8A",
  draftBg: "#2A2A2A",
  archivedBg: "#2A2520",
  archivedText: "#8A8A8A",
  searchBg: "#1C1C1C",
  danger: "#E05C5C",
};

const LIGHT_C: DashPalette = {
  bg: "#F4F4F5",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  border: "rgba(0,0,0,0.08)",
  accent: "#E5B800",
  textPrimary: "#111111",
  textSecondary: "#6B6B6B",
  heroBg: "#D9E9E8",
  heroText: "#0F1F1E",
  heroSubtext: "#3F5654",
  versionBadgeBg: "#F5934F",
  versionBadgeText: "#1A0E00",
  activeGreen: "#E8F8EF",
  activeGreenText: "#15803D",
  draftText: "#6B6B6B",
  draftBg: "#EEEEF0",
  archivedBg: "#F5F0EB",
  archivedText: "#6B6B6B",
  searchBg: "#EEEEF0",
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
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
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
const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "1",
    label: "New project",
    icon: "add-circle-outline",
    navigate: "newproject",
  },
  {
    id: "2",
    label: "Upload",
    icon: "cloud-upload-outline",
    navigate: "uploadvideo",
  },
  {
    id: "3",
    label: "Invite",
    icon: "person-add-outline",
    navigate: "invitemember",
  },
  { id: "4", label: "Export", icon: "film-outline", navigate: "export" },
];



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
type StatusBadgeProps = { status: "Active" | "Draft" | "Archived" };
const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = {
    Active: { bg: C.activeGreen, text: C.activeGreenText },
    Draft: { bg: C.draftBg, text: C.draftText },
    Archived: { bg: C.archivedBg, text: C.archivedText },
  }[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.text }]}>{status}</Text>
    </View>
  );
};


// In your Home/Dashboard screen file:







// ─── Main Screen ──────────────────────────────────────────────────────────────
function DashboardScreen() {
  const { isDark } = useTheme();
  C = isDark ? DARK_C : LIGHT_C;
  styles = createDashboardStyles(C);

  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { projects, isLoading, setCurrentProject,renameProject,deleteProject } = useProject();
 const {exports:exportsList}=useExport();
  const { notifications } = useNotification();
  const [search, setSearch] = useState<string>("");

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






  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    return projects.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [projects, search]);


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


  const handleEditProject = () => {
    if (projectMenu.project) {
      setCurrentProject(projectMenu.project);
      // TODO: navigate to actual edit/project-settings screen once it exists
      navigation.navigate("projectdetail");
    }
    closeProjectMenu();
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
  Alert.alert(
    "Delete project",
    `Are you sure you want to delete "${project.name}"? This can't be undone.`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteProject(project.id),
      },
    ],
  );
};


  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }
  const isNewUser = projects.length === 0;
  const projectsLeftLabel = isNewUser
    ? "Create your first project"
    : `${projects.length} project${projects.length === 1 ? "" : "s"}`;
  return (
    <SafeAreaView style={styles.container}>
      <View>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={C.bg} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Header ── */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => navigation.navigate("Profile")}
              style={styles.profileBox}
            >
             <Image
  style={styles.profileimage}
  source={
    user?.avatarUrl
      ? { uri: user.avatarUrl }
      : require("../../../assets/app.png")
  }
/>
              <View style={styles.topgreetingbox}>
                <Text style={styles.headerGreeting}>{getGreeting()}</Text>
                <View style={styles.headerNameRow}>
                  <Text style={styles.headerName}>
                    {user?.name?.split(" ")[0] ?? "there"}{" "}
                  </Text>
                  <Text style={styles.waveEmoji}>👋</Text>
                </View>
              </View>
            </Pressable>
            <TouchableOpacity
              style={styles.bellWrapper}
              onPress={() => navigation.navigate("activities")}
            >
              <Ionicons
                name="notifications-outline"
                size={ms(22)}
                color={C.textPrimary}
              />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          {/* ── Flat icon action row (EDIT+ style, no boxes) ── */}
          <View style={styles.quickActionsRow}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                onPress={() => navigation.navigate(action.navigate)}
                style={styles.quickActionBtn}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionIconWrap}>
                  <Ionicons
                    name={action.icon}
                    size={ms(27)}
                    color={C.textPrimary}
                  />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* ── Search ── */}
          <View style={styles.searchBar}>
            <Ionicons
              name="search-outline"
              size={ms(16)}
              color={C.textSecondary}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search projects, media, people..."
              placeholderTextColor={C.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons
                  name="close-circle"
                  size={ms(16)}
                  color={C.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

             {/**upgrade to pro banner */}
         {/* <UpgradeToProBanner onPress={() => navigation.navigate('proscreen')} /> */}



          {/* ── NEW PROJECT hero card (light teal, dashed CTA) ── */}
          <TouchableOpacity
            style={styles.heroCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate("newproject")}
          >
            <View style={styles.heroTextBox}>
              <Text style={styles.heroTitle}>NEW PROJECT</Text>
              <Text style={styles.heroSubtitle}>{projectsLeftLabel}</Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionBadgeText}>Vydora</Text>
              </View>
            </View>
            <View style={styles.heroCtaOuter}>
              <View style={styles.heroCtaDashed}>
                <Ionicons name="add" size={ms(22)} color={C.heroText} />
              </View>
            </View>
          </TouchableOpacity>
          {/* ── PROJECTS header with Settings pill ── */}
          <View style={[styles.sectionHeader, { marginTop: vs(22) }]}>
            <Text style={styles.sectionLabel}>PROJECTS</Text>
            <TouchableOpacity
              style={styles.settingsPill}
              onPress={() => navigation.navigate("settings")}
              activeOpacity={0.8}
            >
              <Text style={styles.settingsPillText}>Settings</Text>
            </TouchableOpacity>
          </View>
          {isNewUser || filteredProjects.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="film-outline"
                size={ms(36)}
                color={C.textSecondary}
              />
              <Text style={styles.emptyTitle}>No projects yet</Text>
              <Text style={styles.emptySubtitle}>
                {search.trim()
                  ? "No projects match your search"
                  : "Your projects will appear here"}
              </Text>
            </View>
          ) : (
            filteredProjects.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={styles.projectRow}
                activeOpacity={0.85}
                onPress={() => handleProjectPress(project)}
              >
                <View style={styles.projectThumb}>
                  {project.thumbnailUrl ? (
                    <Image
                      source={{ uri: project.thumbnailUrl }}
                      style={styles.thumbnailImage}
                    />
                  ) : (
                    <Ionicons
                      name="film-outline"
                      size={ms(20)}
                      color={C.textSecondary}
                    />
                  )}
                </View>
                <View style={styles.projectInfo}>
                  <Text style={styles.projectTitle} numberOfLines={1}>
                    {project.name}
                  </Text>
                  <View style={styles.projectMetaRow}>
                    <StatusBadge status={project.status} />
                    <Text style={styles.projectMeta}>
                      {formatDate(project.updatedAt)} ·{" "}
                      {timeAgo(project.updatedAt)}
                    </Text>
                  </View>
                  <View style={styles.avatarRow}>
                    <AvatarStack avatars={project.members} size={ms(18)} />
                    {project.members.length > 0 && (
                      <Text style={styles.memberCountText}>
                        {project.members.length}{" "}
                        {project.members.length === 1 ? "member" : "members"}
                      </Text>
                    )}
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
            ))
          )}
          <View style={{ height: vs(24) }} />
        </ScrollView>
      </View>

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
  onRequestClose={() => setRenameVisible(false)}
>
  <Pressable style={styles.sheetOverlay} onPress={() => setRenameVisible(false)}>
    <Pressable style={styles.sheetContainer} onPress={() => {}}>
      <View style={styles.sheetHandle} />

      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Rename project</Text>
        <TouchableOpacity onPress={() => setRenameVisible(false)} hitSlop={10}>
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
    paddingHorizontal: s(12),
    paddingTop: vs(14),
    paddingBottom: vs(36),
  },
  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(40),
    paddingRight: s(4),
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
  waveEmoji: { fontSize: ms(18) },
  bellWrapper: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    // borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight:s(2),
  },
  bellBadge: {
    position: "absolute",
    top: -ms(2),
    right: ms(5),
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
    color: C.bg, 
    fontSize: ms(8),
     fontWeight: "700" },
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
  // Hero "NEW PROJECT" card — light teal like reference
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.heroBg,
    borderRadius: ms(18),
    padding: s(18),
  },
  heroTextBox: { flex: 1, gap: vs(4) },
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
  },
  sectionLabel: {
    color: C.textSecondary,
    fontSize: ms(11),
    fontWeight: "600",
    letterSpacing: 1.1,
  },
  settingsPill: {
    backgroundColor: C.card,
    borderRadius: ms(20),
    paddingHorizontal: s(12),
    paddingVertical: vs(5),
    borderWidth: 1,
    borderColor: C.border,
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
  // Project row — thumbnail-led, matches reference list style
  projectRow: {
    backgroundColor: C.surface,
    borderRadius: ms(14),
    flexDirection: "row",
    alignItems: "center",
    padding: s(10),
    gap: s(12),
    marginBottom: vs(10),
  },
  projectThumb: {
    width: s(56),
    height: s(56),
    backgroundColor: C.card,
    borderRadius: ms(10),
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbnailImage: { width: "100%", height: "100%" },
  projectInfo: { flex: 1, gap: vs(3) },
  projectTitle: { color: C.textPrimary, fontSize: ms(14), fontWeight: "700" },
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
