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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ms, s, vs } from "react-native-size-matters";
import { useAuth } from "../Contexts/Authcontext";
import { useProject } from "../Contexts/projectContext";
import { useNotification } from "../Contexts/notificatinContext";
import { Project } from "../types";
// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg: "#111111",
  surface: "#1A1A1A",
  card: "#1E1E1E",
  accent: "#F5C518",
  textPrimary: "#FFFFFF",
  textSecondary: "#888888",
  activeGreen: "#1A3A2A",
  activeGreenText: "#2ECC71",
  draftText: "#888888",
  draftBg: "#2A2A2A",
  archivedBg: "#2A2520",
  archivedText: "#888888",
  searchBg: "#252525",
  iconBg: "#252525",
} as const;
// ─── Types ───────────────────────────────────────────────────────────────────
type QuickAction = {
  id: string;
  label: string;
  navigate: string;
  icon: keyof typeof Ionicons.glyphMap;
};
// ─── Helpers ─────────────────────────────────────────────────────────────────
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
};
const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `Edited ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Edited ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `Edited ${days}d ago`;
};
// ─── Quick Actions (static) ───────────────────────────────────────────────────
const QUICK_ACTIONS: QuickAction[] = [
  { id: "1", label: "New project", icon: "add", navigate: "newproject" },
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
const Avatar: React.FC<AvatarProps> = ({ initials, color, size = ms(28) }) => (
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
// ─── Main Screen ──────────────────────────────────────────────────────────────
const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { projects, isLoading, setCurrentProject } = useProject();
  const { notifications } = useNotification();
  const [search, setSearch] = useState<string>("");
  // unread notification count
  const unreadCount = notifications.filter((n) => !n.read).length;
  // most recently updated project → Continue Editing
  const continueProject: Project | null = useMemo(() => {
    if (!projects.length) return null;
    return [...projects].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0];
  }, [projects]);
  // search filter
  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    return projects.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [projects, search]);
  const onlineCount = (project: Project) =>
    project.members.filter((m) => m.online).length;
  const handleProjectPress = (project: Project) => {
    setCurrentProject(project);
    navigation.navigate("projectdetail");
  };
  // ── Loading state ──
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }
  const isNewUser = projects.length === 0;
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Header ── */}
        <View style={styles.headerCard}>
          <View style={styles.profileBox}>
            <View style={styles.profileimg}>
              <Image 
              style={styles.profileimage}
              source={require("../../../assets/app.png")}
              />
            </View>
         
            
           <View style={styles.topgreetingbox}>
              <Text style={styles.headerGreeting}>{getGreeting()}</Text>
             <View style={styles.headerNameRow}>
              <Text style={styles.headerName}>
                {user?.name?.split(" ")[0] ?? "there"}{" "}
              </Text>
              <Text style={styles.waveEmoji}>👋</Text>
            </View>
           </View>

          </View>

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
        {/* ── Continue Editing / Welcome Card ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>
            {isNewUser ? "GET STARTED" : "CONTINUE EDITING"}
          </Text>
          {!isNewUser && (
            <TouchableOpacity
              onPress={() => navigation.navigate("allprojects")}
            >
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          )}
        </View>
        {isNewUser ? (
          // ── Welcome card for new user ──
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeIconBox}>
              <Ionicons name="film-outline" size={ms(32)} color={C.accent} />
            </View>
            <View style={styles.welcomeInfo}>
              <Text style={styles.welcomeTitle}>Welcome to Vydora</Text>
              <Text style={styles.welcomeSubtitle}>
                Create your first project to get started
              </Text>
            </View>
            <TouchableOpacity
              style={styles.welcomeBtn}
              onPress={() => navigation.navigate("newproject")}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={ms(18)} color={C.bg} />
            </TouchableOpacity>
          </View>
        ) : (
          // ── Continue editing card ──
          continueProject && (
            <TouchableOpacity
              onPress={() => handleProjectPress(continueProject)}
              style={styles.continueCard}
              activeOpacity={0.85}
            >
              <View style={styles.thumbnailBox}>
                <Ionicons name="play" size={ms(22)} color={C.textPrimary} />
              </View>
              <View style={styles.continueInfo}>
                <Text style={styles.continueTitle}>{continueProject.name}</Text>
                <Text style={styles.continueSubtitle}>
                  {timeAgo(continueProject.updatedAt)}
                </Text>
                <View style={styles.continueBottomRow}>
                  <View style={styles.avatarRow}>
                    <AvatarStack
                      avatars={continueProject.members}
                      size={ms(20)}
                    />
                  </View>
                  {onlineCount(continueProject) > 0 && (
                    <Text style={styles.editingNow}>
                      {onlineCount(continueProject)} editing now
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.arrowBtn}>
                <Ionicons name="arrow-forward" size={ms(18)} color={C.bg} />
              </View>
            </TouchableOpacity>
          )
        )}
        {/* ── Recent Projects ── */}
        <View style={[styles.sectionHeader, { marginTop: vs(20) }]}>
          <Text style={styles.sectionLabel}>RECENT PROJECTS</Text>
          {!isNewUser && (
            <TouchableOpacity
              onPress={() => navigation.navigate("allprojects")}
            >
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          )}
        </View>
        {isNewUser || filteredProjects.length === 0 ? (
          // ── Empty state ──
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
              style={styles.projectCard}
              activeOpacity={0.85}
              onPress={() => handleProjectPress(project)}
            >
              <View style={styles.projectIconBox}>
                <Ionicons
                  name="film-outline"
                  size={ms(20)}
                  color={C.textSecondary}
                />
              </View>
              <View style={styles.projectInfo}>
                <Text style={styles.projectTitle}>{project.name}</Text>
                <Text style={styles.projectMembers}>
                  {project.members.length}{" "}
                  {project.members.length === 1 ? "member" : "members"}
                </Text>
                <View style={styles.avatarRow}>
                  <AvatarStack avatars={project.members} size={ms(22)} />
                </View>
              </View>
              <StatusBadge status={project.status} />
            </TouchableOpacity>
          ))
        )}
        {/* ── Quick Actions ── */}
        <View style={[styles.sectionHeader, { marginTop: vs(20) }]}>
          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        </View>
        <View style={styles.quickActionsRow}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              onPress={() => navigation.navigate(action.navigate)}
              style={styles.quickActionBtn}
              activeOpacity={0.8}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name={action.icon} size={ms(22)} color={C.accent} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: vs(24) }} />
      </ScrollView>
    </View>
  );
};
export default DashboardScreen;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: { flex: 1, backgroundColor: C.bg, justifyContent: "center" },
  scrollContent: {
    paddingHorizontal: s(10),
    paddingTop: vs(6),
    paddingBottom: vs(36),
    marginTop:s(35),
  },

  // Welcome card
  welcomeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: s(12),
    padding: s(14),
    marginBottom: s(5),
   
  },

  profileimg:{
   width: s(45),
    height: s(45),
    borderRadius: '100%',
    backgroundColor: 'red',
    
  }, 
  profileimage:{
width:s(45),
height:s(45),
borderRadius:s(50),
  },
  
  profileBox:{
 flexDirection:'row',
 flex:1,
 gap:s(12),
  },

topgreetingbox:{
flexDirection:'column',
},
  welcomeIconBox: {
    width: s(52),
    height: s(52),
    borderRadius: s(8),
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
    marginRight: s(12),
  },
  welcomeInfo: {
    flex: 1,
  },
  welcomeTitle: {
    color: C.textPrimary,
    fontSize: ms(14),
    fontWeight: "600",
    marginBottom: vs(3),
  },

  welcomeSubtitle: {
    color: C.textSecondary,
    fontSize: ms(12),
  },

  welcomeBtn: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
  },


  // Empty state
  emptyState:      { 
    alignItems: "center",
     paddingVertical: vs(32) 
    },
  emptyTitle: { color: C.textPrimary,
     fontSize: ms(15),
      fontWeight: "600", 
      marginTop: vs(10)
     },
  emptySubtitle: { 
    color: C.textSecondary,
     fontSize: ms(12), 
     marginTop: vs(4) 
    },


  headerCard: {
    backgroundColor: C.surface,
    borderRadius: ms(14),
    paddingHorizontal: s(18),
    paddingVertical: vs(20),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(44),
  },
  headerGreeting: {
    color: C.textSecondary,
    fontSize: ms(13),
    marginBottom: vs(2),
  },
  headerNameRow: {
    flexDirection: "row",
    // alignItems: "center",
  },
  headerName: {
    color: C.textPrimary,
    fontSize: ms(24),
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  waveEmoji: {
    fontSize: ms(22),
  },
  bellWrapper: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: ms(6),
    right: ms(7),
    backgroundColor: C.accent,
    borderRadius: ms(8),
    minWidth: ms(14),
    height: ms(14),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.surface,
  },
  bellBadgeText: {
    color: C.bg,
    fontSize: ms(8),
    fontWeight: "700",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.searchBg,
    borderRadius: ms(12),
    paddingHorizontal: s(14),
    paddingVertical: vs(10),
    gap: s(8),
    marginBottom: vs(18),
  },
  searchInput: {
    flex: 1,
    color: C.textPrimary,
    fontSize: ms(13),
  },
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
  seeAll: {
    color: C.accent,
    fontSize: ms(12),
    fontWeight: "600",
  },
  continueCard: {
    backgroundColor: C.surface,
    borderRadius: ms(14),
    flexDirection: "row",
    alignItems: "center",
    padding: s(12),
    gap: s(12),
  },
  thumbnailBox: {
    width: s(72),
    height: vs(60),
    backgroundColor: C.card,
    borderRadius: ms(10),
    alignItems: "center",
    justifyContent: "center",
  },
  continueInfo: {
    flex: 1,
    gap: vs(3),
  },
  continueTitle: {
    color: C.textPrimary,
    fontSize: ms(14),
    fontWeight: "700",
  },
  continueSubtitle: {
    color: C.textSecondary,
    fontSize: ms(11),
  },
  continueBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(8),
    marginTop: vs(4),
  },
  editingNow: {
    color: C.textSecondary,
    fontSize: ms(11),
  },
  arrowBtn: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  projectCard: {
    backgroundColor: C.surface,
    borderRadius: ms(14),
    flexDirection: "row",
    alignItems: "center",
    padding: s(12),
    gap: s(12),
    marginBottom: vs(10),
  },
  projectIconBox: {
    width: s(48),
    height: vs(48),
    backgroundColor: C.card,
    borderRadius: ms(10),
    alignItems: "center",
    justifyContent: "center",
  },
  projectInfo: {
    flex: 1,
    gap: vs(2),
  },
  projectTitle: {
    color: C.textPrimary,
    fontSize: ms(14),
    fontWeight: "700",
  },
  projectMembers: {
    color: C.textSecondary,
    fontSize: ms(11),
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: vs(2),
  },
  avatarWrapper: {
    borderWidth: 1.5,
    borderColor: C.surface,
    borderRadius: ms(20),
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: s(10),
    paddingVertical: vs(4),
    borderRadius: ms(20),
  },
  badgeText: {
    fontSize: ms(11),
    fontWeight: "600",
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: s(8),
  },
  quickActionBtn: {
    flex: 1,
    alignItems: "center",
    gap: vs(6),
  },
  quickActionIcon: {
    width: ms(52),
    height: ms(52),
    borderRadius: ms(14),
    backgroundColor: C.iconBg,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    color: C.textSecondary,
    fontSize: ms(10),
    textAlign: "center",
  },
});

