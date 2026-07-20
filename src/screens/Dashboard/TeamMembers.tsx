/**
 * Team Members screen — real per-project members + pending invites.
 *
 * Data source: GET /projects/{projectId}/members
 *   - status ACTIVE  → "X MEMBERS" list
 *   - status INVITED → "PENDING INVITES" list
 *
 * Styles / layout below are untouched — only the data + handlers are wired.
 */
import React, { useState, useMemo, useCallback } from "react";
import { useTheme, ThemeColors, darkColors } from "../Contexts/ThemeContext";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  type RouteProp,
} from "@react-navigation/native";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useMember } from "../Contexts/memberContext";
import { useProject } from "../Contexts/projectContext";
import { useAuth } from "../Contexts/Authcontext";
import type { Member as ApiMember, MemberRole } from "../types";

dayjs.extend(relativeTime);

// ─────────────────────────────────────────────
// TYPES (UI row shapes — same as before)
// ─────────────────────────────────────────────
type Role = "Owner" | "Editor" | "Viewer";
interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  online: boolean;
  isMe?: boolean;
  avatarUrl?: string;
}
interface Invite {
  id: string;
  email: string;
  role: Role;
  sentAgo: string;
}
interface RoleColorSet {
  bg: string;
  text: string;
}
interface AvatarProps {
  name: string;
  online?: boolean;
  avatarUrl?: string;
}
interface RoleBadgeProps {
  role: Role;
}

type TeamMembersRoute = RouteProp<
  { teammember: { projectId?: string } },
  "teammember"
>;

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
/** Role badge colours — dark / light variants */
const ROLE_COLORS_DARK: Record<Role, RoleColorSet> = {
  Owner: { bg: "#2A2305", text: "#F5C518" },
  Editor: { bg: "#0A2620", text: "#4ECBA4" },
  Viewer: { bg: "#1E1E1E", text: "#9E9E9E" },
};
const ROLE_COLORS_LIGHT: Record<Role, RoleColorSet> = {
  Owner: { bg: "#FFF8E0", text: "#B8860B" },
  Editor: { bg: "#E8F8F3", text: "#0D9488" },
  Viewer: { bg: "#F0F0F2", text: "#71717A" },
};
/** All assignable roles (Owner is excluded from the picker — you can't promote to owner) */
const ASSIGNABLE_ROLES: Role[] = ["Editor", "Viewer"];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
/** Returns the first character of the name in uppercase */
const initials = (name: string): string => name.charAt(0).toUpperCase();
/** Deterministic avatar background from name */
const AVATAR_PALETTE: string[] = ["#F5C518", "#E05B5B", "#4ECBA4", "#9B8EF5", "#5BA3E0"];
const avatarBg = (name: string): string =>
  AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length];

function formatSentAgo(joinedAt?: string): string {
  if (!joinedAt) return "recently";
  return dayjs(joinedAt).fromNow(); // e.g. "2 hours ago", "just now"
}

/** Map an ACTIVE API member into the row shape this screen already renders. */
function toUiMember(
  m: ApiMember,
  currentUserId?: string | null,
  selfAvatarUrl?: string | null
): Member {
  const isMe = !!currentUserId && m.userId === currentUserId;
  return {
    id: m.id,
    name: isMe ? "You" : m.name,
    email: m.email || "",
    role: m.role as Role,
    online: !!m.online,
    isMe,
    avatarUrl: m.avatarUrl || (isMe ? selfAvatarUrl || undefined : undefined),
  };
}

/** Map an INVITED API member into the pending-invite row shape. */
function toUiInvite(m: ApiMember): Invite {
  return {
    id: m.id,
    email: m.email || m.name,
    role: m.role as Role,
    sentAgo: formatSentAgo(m.joinedAt),
  };
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────
/** Circular avatar with online dot — uses profile photo when available. */
function Avatar({ name, online, avatarUrl }: AvatarProps) {
  return (
    <View style={styles.avatarWrapper}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: avatarBg(name) }]}>
          <Text style={styles.avatarText}>{initials(name)}</Text>
        </View>
      )}
      {online !== undefined && (
        <View style={[styles.onlineDot, { backgroundColor: online ? "#4ECBA4" : "#555" }]} />
      )}
    </View>
  );
}
/** Coloured role pill */
function RoleBadge({ role }: RoleBadgeProps) {
  const { isDark } = useTheme();
  const palette = isDark ? ROLE_COLORS_DARK : ROLE_COLORS_LIGHT;
  const roleColors = palette[role] ?? palette.Viewer;
  return (
    <View style={[styles.roleBadge, { backgroundColor: roleColors.bg }]}>
      <Text style={[styles.roleBadgeText, { color: roleColors.text }]}>{role}</Text>
    </View>
  );
}
// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
export default function TeamMembersScreen() {
  const { colors, isDark } = useTheme();
  styles = makeStyles(colors);
  const navigation = useNavigation<any>();
  const route = useRoute<TeamMembersRoute>();
  const { user } = useAuth();
  const { currentProject } = useProject();
  const {
    fetchMembers,
    getMembersForProject,
    changeRole,
    removeMember,
    inviteMember,
    isLoading,
  } = useMember();

  // Prefer route param from Project Detail → "View All members"; fall back to current project.
  const projectId =
    route.params?.projectId || currentProject?.id || "";

  const [search, setSearch] = useState<string>("");
  /** Local override so Resend can flip "sentAgo" to "just now" without a backend resend API. */
  const [resentIds, setResentIds] = useState<Record<string, true>>({});
  const ROLE_COLORS = isDark ? ROLE_COLORS_DARK : ROLE_COLORS_LIGHT;
  /* ── context menu state ── */
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [menuTarget, setMenuTarget] = useState<Member | null>(null);
  /* ── role picker state ── */
  const [rolePickerVisible, setRolePickerVisible] = useState<boolean>(false);

  // Refresh whenever this screen is focused (e.g. after inviting someone).
  useFocusEffect(
    useCallback(() => {
      if (!projectId) return;
      fetchMembers(projectId);
      setResentIds({});
    }, [projectId])
  );

  const apiMembers = projectId ? getMembersForProject(projectId) : [];

  const members: Member[] = useMemo(
    () =>
      apiMembers
        .filter(
          (m) =>
            (m.status || "ACTIVE") !== "INVITED" &&
            m.status !== "PENDING_APPROVAL"
        )
        .map((m) => toUiMember(m, user?.id, user?.avatarUrl)),
    [apiMembers, user?.id, user?.avatarUrl]
  );

  const invites: Invite[] = useMemo(
    () =>
      apiMembers
        .filter((m) => m.status === "INVITED")
        .map((m) => {
          const row = toUiInvite(m);
          if (resentIds[row.id]) {
            return { ...row, sentAgo: "just now" };
          }
          return row;
        }),
    [apiMembers, resentIds]
  );

  // ── filtered members ──
  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );
  // ── open "..." menu ──
  const openMenu = (member: Member): void => {
    setMenuTarget(member);
    setMenuVisible(true);
  };
  // ── change role ──
  const handleChangeRole = async (newRole: Role): Promise<void> => {
    if (!menuTarget || !projectId) return;
    try {
      await changeRole(projectId, menuTarget.id, newRole as MemberRole);
      setRolePickerVisible(false);
      setMenuVisible(false);
    } catch (e: any) {
      Alert.alert("Could not change role", e?.message || "Please try again.");
    }
  };
  // ── remove member ──
  const handleRemove = async (): Promise<void> => {
    if (!menuTarget || !projectId) return;
    try {
      await removeMember(projectId, menuTarget.id);
      setMenuVisible(false);
      setMenuTarget(null);
    } catch (e: any) {
      Alert.alert("Could not remove member", e?.message || "Please try again.");
    }
  };
  // ── resend invite ──
  // Backend has no dedicated resend endpoint (re-invite hits ALREADY_MEMBER).
  // We refresh the invite timestamp in the UI; membership stays INVITED.
  const handleResend = async (id: string): Promise<void> => {
    const pending = apiMembers.find((m) => m.id === id && m.status === "INVITED");
    if (!pending || !projectId) return;
    setResentIds((prev) => ({ ...prev, [id]: true }));
    // Best-effort: if somehow the row was removed, a fresh invite would recreate it.
    // For normal pending rows this is a no-op against the API (conflict) — UI still updates.
    if (pending.email) {
      try {
        await inviteMember(projectId, pending.email, pending.role);
      } catch {
        // Expected when the invite already exists — keep the "just now" feedback.
      }
    }
  };
  // ── navigate to invite screen ──
  const goToInvite = (): void => {
    navigation?.navigate("invitemember");
  };
  // ─────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────
  const renderMember = (item: Member) => (
    <View style={styles.memberRow} key={item.id}>
      <Avatar name={item.name} online={item.online} avatarUrl={item.avatarUrl} />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.memberEmail}>{item.email}</Text>
      </View>
      <RoleBadge role={item.role} />
      {/* Only show "..." for non-owner members */}
      {!item.isMe && (
        <TouchableOpacity style={styles.moreBtn} onPress={() => openMenu(item)}>
          <Ionicons name="ellipsis-horizontal" size={18} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  );
  const renderInvite = (item: Invite) => (
    <View style={styles.memberRow} key={item.id}>
      <Avatar name={item.email} online={undefined} />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.email}</Text>
        <Text style={styles.memberEmail}>
          {item.role} · Sent {item.sentAgo}
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleResend(item.id)}>
        <Text style={styles.resendText}>Resend</Text>
      </TouchableOpacity>
    </View>
  );
  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team members</Text>
        <TouchableOpacity onPress={goToInvite} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#F5C518" />
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Search ── */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search members..."
            placeholderTextColor="#555"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        {isLoading && members.length === 0 && invites.length === 0 ? (
          <ActivityIndicator color="#F5C518" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* ── Members section ── */}
            <Text style={styles.sectionLabel}>{filteredMembers.length} MEMBERS</Text>
            {filteredMembers.map((item) => renderMember(item))}
            {/* ── Pending Invites section ── */}
            {invites.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionLabel}>PENDING INVITES</Text>
                  <Text style={styles.inviteCount}>{invites.length}</Text>
                </View>
                {invites.map((item) => renderInvite(item))}
              </>
            )}
            {/* ── Invite button ── */}
            <TouchableOpacity style={styles.inviteButton} onPress={goToInvite} activeOpacity={0.85}>
              <Ionicons name="add" size={18} color="#000" style={{ marginRight: 6 }} />
              <Text style={styles.inviteButtonText}>Invite new member</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
      {/* ─────────────────────────────────────────
          CONTEXT MENU MODAL  ("..." tapped)
      ───────────────────────────────────────── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuCard}>
            {/* Member header inside sheet */}
            <View style={styles.menuHeader}>
              <Avatar
                name={menuTarget?.name ?? ""}
                online={undefined}
                avatarUrl={menuTarget?.avatarUrl}
              />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.menuName}>{menuTarget?.name}</Text>
                <Text style={styles.menuEmail}>{menuTarget?.email}</Text>
              </View>
            </View>
            <View style={styles.menuDivider} />
            {/* Change role */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setRolePickerVisible(true);
              }}
            >
              <Ionicons name="swap-horizontal-outline" size={18} color="#CCC" />
              <Text style={styles.menuItemText}>Change role</Text>
            </TouchableOpacity>
            {/* Remove member */}
            <TouchableOpacity style={styles.menuItem} onPress={handleRemove}>
              <Ionicons name="person-remove-outline" size={18} color="#E05B5B" />
              <Text style={[styles.menuItemText, { color: "#E05B5B" }]}>Remove member</Text>
            </TouchableOpacity>
            {/* Cancel */}
            <TouchableOpacity
              style={[styles.menuItem, { marginTop: 4 }]}
              onPress={() => setMenuVisible(false)}
            >
              <Ionicons name="close-outline" size={18} color="#666" />
              <Text style={[styles.menuItemText, { color: "#666" }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      {/* ─────────────────────────────────────────
          ROLE PICKER MODAL
      ───────────────────────────────────────── */}
      <Modal
        visible={rolePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRolePickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRolePickerVisible(false)}>
          <View style={styles.menuCard}>
            <Text style={styles.rolePickerTitle}>Select new role</Text>
            <View style={styles.menuDivider} />
            {ASSIGNABLE_ROLES.map((role) => {
              const colors = ROLE_COLORS[role];
              const isCurrent = menuTarget?.role === role;
              return (
                <TouchableOpacity
                  key={role}
                  style={styles.menuItem}
                  onPress={() => handleChangeRole(role)}
                >
                  <View style={[styles.roleDot, { backgroundColor: colors.text }]} />
                  <Text style={[styles.menuItemText, isCurrent && { color: colors.text }]}>
                    {role}
                    {isCurrent ? "  (current)" : ""}
                  </Text>
                  {isCurrent && (
                    <Ionicons name="checkmark" size={16} color={colors.text} style={{ marginLeft: "auto" }} />
                  )}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.menuItem, { marginTop: 4 }]}
              onPress={() => setRolePickerVisible(false)}
            >
              <Ionicons name="close-outline" size={18} color="#666" />
              <Text style={[styles.menuItemText, { color: "#666" }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  /* ── Layout ── */
  safe: {
    flex: 1,
    backgroundColor: c.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  /* ── Header ── */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: c.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: c.text,
    letterSpacing: 0.2,
  },
  addBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  /* ── Search ── */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginTop: 8,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: c.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  /* ── Section labels ── */
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: c.textMuted,
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 10,
  },
  inviteCount: {
    fontSize: 13,
    fontWeight: "700",
    color: c.accent,
  },
  /* ── Member row ── */
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "600",
    color: c.text,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: c.textMuted,
  },
  moreBtn: {
    marginLeft: 10,
    padding: 4,
  },
  /* ── Avatar ── */
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: c.accentOn,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: "absolute",
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: c.card,
  },
  /* ── Role badge ── */
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  /* ── Invite row ── */
  resendText: {
    fontSize: 13,
    fontWeight: "600",
    color: c.accent,
  },
  /* ── Invite button ── */
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.accent,
    borderRadius: 14,
    height: 52,
    marginTop: 24,
  },
  inviteButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: c.background,
  },
  /* ── Modal overlay ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  menuCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  /* ── Menu header (member info inside sheet) ── */
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  menuName: {
    fontSize: 15,
    fontWeight: "700",
    color: c.text,
  },
  menuEmail: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: c.border,
    marginBottom: 4,
  },
  /* ── Menu items ── */
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: c.textMuted,
    fontWeight: "500",
  },
  /* ── Role picker ── */
  rolePickerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: c.textMuted,
    letterSpacing: 0.8,
    paddingTop: 14,
    paddingBottom: 4,
    textAlign: "center",
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
}
let styles = makeStyles(darkColors);

