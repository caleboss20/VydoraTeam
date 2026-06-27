import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ms, s, vs } from "react-native-size-matters";
// ─── Palette ────────────────────────────────────────────────────────────────
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
  searchBg: "#252525",
  iconBg: "#252525",
} as const;
// ─── Types ───────────────────────────────────────────────────────────────────
type AvatarData = {
  initials: string;
  color: string;
};
type ContinueItem = {
  id: string;
  title: string;
  editedAgo: string;
  editingNow: number;
  avatars: AvatarData[];
};
type Project = {
  id: string;
  title: string;
  members: number;
  status: "Active" | "Draft";
  avatars: AvatarData[];
};
type QuickAction = {
  id: string;
  label: string;
  navigate:string;
  icon: keyof typeof Ionicons.glyphMap;
};
// ─── Mock Data ───────────────────────────────────────────────────────────────
const CONTINUE_ITEM: ContinueItem = {
  id: "1",
  title: "Summer campaign",
  editedAgo: "Edited 2 hr ago",
  editingNow: 2,
  avatars: [
    { initials: "M", color: "#E05C5C" },
    { initials: "JR", color: "#3DBFBF" },
  ],
};
const RECENT_PROJECTS: Project[] = [
  {
    id: "1",
    title: "Summer campaign",
    members: 4,
    status: "Active",
    avatars: [
      { initials: "M", color: "#E05C5C" },
      { initials: "JR", color: "#3DBFBF" },
    ],
  },
  {
    id: "2",
    title: "Product launch",
    members: 2,
    status: "Active",
    avatars: [
      { initials: "S", color: "#9B59B6" },
      { initials: "YO", color: "#F5C518" },
    ],
  },
  {
    id: "3",
    title: "Behind the scenes",
    members: 1,
    status: "Draft",
    avatars: [{ initials: "MA", color: "#E05C5C" }],
  },
];
const QUICK_ACTIONS: QuickAction[] = [
  { id: "1", label: "New project", icon: "add",navigate:"newproject" },
  { id: "2", label: "Upload", icon: "cloud-upload-outline",navigate:"uploadvideo" },
  { id: "3", label: "Invite", icon: "person-add-outline",navigate:"invitemember" },
  { id: "4", label: "Browse", icon: "film-outline",navigate:"browse" },
];
// ─── Sub-components ──────────────────────────────────────────────────────────
type AvatarProps = {
  initials: string;
  color: string;
  size?: number;
};


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
    <Text style={[styles.avatarText, { fontSize: ms(10) }]}>{initials}</Text>
  </View>
);

type AvatarStackProps = {
  avatars: AvatarData[];
  size: number;
};

const AvatarStack: React.FC<AvatarStackProps> = ({ avatars, size }) => (
  <>
    {avatars.map((a, i) => (
      <View
        key={i}
        style={[styles.avatarWrapper, { marginLeft: i === 0 ? 0 : -ms(8) }]}
      >
        <Avatar initials={a.initials} color={a.color} size={size} />
      </View>
    ))}
  </>
);
type StatusBadgeProps = {
  status: "Active" | "Draft";
};
const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const isActive = status === "Active";
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: isActive ? C.activeGreen : C.draftBg },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: isActive ? C.activeGreenText : C.draftText },
        ]}
      >
        {status}
      </Text>
    </View>
  );
};
// ─── Main Screen ─────────────────────────────────────────────────────────────
const DashboardScreen: React.FC = () => {
  const [search, setSearch] = useState<string>("");
  const navigation=useNavigation()
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Header ── */}
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.headerGreeting}>Good morning,</Text>
            <View style={styles.headerNameRow}>
              <Text style={styles.headerName}>Dave </Text>
              <Text style={styles.waveEmoji}>👋</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellWrapper}>
            <Ionicons
              name="notifications-outline"
              size={ms(22)}
              color={C.textPrimary}
            />
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>3</Text>
            </View>
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
        </View>
        {/* ── Continue Editing ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>CONTINUE EDITING</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
        onPress={()=>navigation.navigate("projectdetail")}
        style={styles.continueCard} activeOpacity={0.85}>
          <View style={styles.thumbnailBox}>
            <Ionicons name="play" size={ms(22)} color={C.textPrimary} />
          </View>
          <View style={styles.continueInfo}>
            <Text style={styles.continueTitle}>{CONTINUE_ITEM.title}</Text>
            <Text style={styles.continueSubtitle}>{CONTINUE_ITEM.editedAgo}</Text>
            <View style={styles.continueBottomRow}>
              <View style={styles.avatarRow}>
                <AvatarStack avatars={CONTINUE_ITEM.avatars} size={ms(20)} />
              </View>
              <Text style={styles.editingNow}>
                {CONTINUE_ITEM.editingNow} editing now
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.arrowBtn}>
            <Ionicons name="arrow-forward" size={ms(18)} color={C.bg} />
          </TouchableOpacity>
        </TouchableOpacity>
        {/* ── Recent Projects ── */}
        <View style={[styles.sectionHeader, { marginTop: vs(20) }]}>
          <Text style={styles.sectionLabel}>RECENT PROJECTS</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {RECENT_PROJECTS.map((project: Project) => (
          <TouchableOpacity
            key={project.id}
            style={styles.projectCard}
            activeOpacity={0.85}
          >
            <View style={styles.projectIconBox}>
              <Ionicons
                name="film-outline"
                size={ms(20)}
                color={C.textSecondary}
              />
            </View>
            <View style={styles.projectInfo}>
              <Text style={styles.projectTitle}>{project.title}</Text>
              <Text style={styles.projectMembers}>
                {project.members} {project.members === 1 ? "member" : "members"}
              </Text>
              <View style={styles.avatarRow}>
                <AvatarStack avatars={project.avatars} size={ms(22)} />
              </View>
            </View>
            <StatusBadge status={project.status} />
          </TouchableOpacity>
        ))}
        {/* ── Quick Actions ── */}
        <View style={[styles.sectionHeader, { marginTop: vs(20) }]}>
          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        </View>
        <View style={styles.quickActionsRow}>
          {QUICK_ACTIONS.map((action: QuickAction) => (
            <TouchableOpacity
          onPress={()=>navigation.navigate(`${action.navigate}`)}
              key={action.id}
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
  scrollContent: {
    paddingHorizontal: s(10),
    paddingTop: vs(56),
     paddingBottom: vs(26),
  },
  headerCard: {
    backgroundColor: C.surface,
    borderRadius: ms(14),
    paddingHorizontal: s(18),
    paddingVertical: vs(20),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(14),
  },
  headerGreeting: {
    color: C.textSecondary,
    fontSize: ms(13),
    marginBottom: vs(2),
  },
  headerNameRow: {
    flexDirection: "row",
    alignItems: "center",
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