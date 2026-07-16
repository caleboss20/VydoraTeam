import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import {
  moderateScale,
  verticalScale,
  scale,
  ms,
  s,
  vs,
} from "react-native-size-matters";

import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../Contexts/Authcontext";
import { useProject } from "../Contexts/projectContext";
import { useExport } from "../Contexts/exportContext";
// ─── Static content (not user data — these don't need a context) ──────────────
const ACCOUNT_ITEMS = [
  { icon: "person-outline", label: "Personal info" },
  { icon: "lock-closed-outline", label: "Privacy & security" },
  { icon: "notifications-outline", label: "Notifications" },
  { icon: "people-outline", label: "Teams & roles" },
];
const SUPPORT_ITEMS = [
  { icon: "chatbubble-outline", label: "Help & feedback" },
];
// Static until a billing context exists — banner is tappable but the
// numbers shown are not real plan data yet.
const PLAN_PLACEHOLDER = {
  name: "Pro plan",
  detail: "200 GB storage · 5 active projects",
};
// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg: "#0F0F0F",
  surface: "#1A1A1A",
  border: "#2A2A2A",
  accent: "#C9A227", // Vydora gold
  accentDim: "#2A2210",
  text: "#FFFFFF",
  textMuted: "#9A9A9A",
  textDim: "#5A5A5A",
  iconBg: "#222222",
};


// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string | undefined): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}



// ─── Subcomponents ────────────────────────────────────────────────────────────
const SectionLabel = ({ title }: { title: string }) => (
  <Text style={styles.sectionLabel}>{title}</Text>
);
const SettingRow = ({ icon, label }: { icon: string; label: string }) => (
  <TouchableOpacity style={styles.settingRow} activeOpacity={0.65}>
    <View style={styles.settingIconWrap}>
      <Ionicons
        name={icon as any}
        size={moderateScale(18)}
        color={C.textMuted}
      />
    </View>
    <Text style={styles.settingLabel}>{label}</Text>
    <Ionicons
      name="chevron-forward-outline"
      size={moderateScale(16)}
      color={C.textDim}
    />
  </TouchableOpacity>
);
// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout, updateUser } = useAuth();
  const { projects } = useProject();
  const { exports: exportsList } = useExport();
  const initials = useMemo(() => getInitials(user?.name), [user?.name]);
  // Edit-name bottom sheet state
  const [editVisible, setEditVisible] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name ?? "");
  const openEditSheet = () => {
    setNameInput(user?.name ?? "");
    setEditVisible(true);
  };
  const isValidName =
    nameInput.trim().length > 0 &&
    nameInput.trim() !== (user?.name ?? "").trim();
  const handleConfirmName = () => {
    if (!isValidName) return;
    updateUser({ name: nameInput.trim() });
    setEditVisible(false);
  };
  // Only Projects + Exports are backed by real contexts right now.
  // Teams has no context yet, so it's omitted rather than shown as a fake number.
  const stats = [
    { label: "Projects", value: projects.length },
    { label: "Exports", value: exportsList.length },
  ];
  const handleLogout = () => {
    logout();
  };


  
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>``
        <TouchableOpacity
        onPress={()=>navigation.navigate("projects")}
        >
          <Ionicons
            name="arrow-back"
            size={moderateScale(24)}
            color={C.text}
          />

        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate("settings")}>
          <Ionicons
            name="settings-outline"
            size={moderateScale(22)}
            color={C.text}
          />
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.name ?? "Unnamed"}</Text>
          <Text style={styles.userEmail}>{user?.email ?? ""}</Text>
          <TouchableOpacity
            style={styles.editBtn}
            activeOpacity={0.75}
            onPress={openEditSheet}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
        {/* Stats row — Projects + Exports only (real data) */}
        <View style={styles.statsRow}>
          {stats.map((stat, i) => (
            <React.Fragment key={stat.label}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
              {i < stats.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>
        {/* Pro plan banner — tappable, but data is placeholder until billing context exists */}
        <TouchableOpacity
        onPress={()=>navigation.navigate("proscreen")}
         style={styles.planBanner} activeOpacity={0.8}>
          <View style={styles.planLeft}>
            <Ionicons
              name="star-outline"
              size={moderateScale(20)}
              color={C.accent}
            />
            <View
          
            style={styles.planText}>
              <Text style={styles.planName}>{PLAN_PLACEHOLDER.name}</Text>
              <Text style={styles.planDetail}>{PLAN_PLACEHOLDER.detail}</Text>
            </View>
          </View>
          <Text style={styles.planManage}>Manage</Text>
        </TouchableOpacity>



        {/* Account section */}
        <SectionLabel title="ACCOUNT" />
        <View style={styles.card}>
          {ACCOUNT_ITEMS.map((item, i) => (
            <React.Fragment key={item.label}>
              <SettingRow icon={item.icon} label={item.label} />
              {i < ACCOUNT_ITEMS.length - 1 && (
                <View style={styles.rowDivider} />
              )}
            </React.Fragment>
          ))}
        </View>
        {/* Support section */}
        <SectionLabel title="SUPPORT" />
        <View style={styles.card}>
          {SUPPORT_ITEMS.map((item, i) => (
            <React.Fragment key={item.label}>
              <SettingRow icon={item.icon} label={item.label} />
              {i < SUPPORT_ITEMS.length - 1 && (
                <View style={styles.rowDivider} />
              )}
            </React.Fragment>
          ))}
        </View>
        <View style={{ height: verticalScale(24) }} />
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </Pressable>
      </ScrollView>

      {/* Edit name bottom sheet */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setEditVisible(false)}
        >
          <Pressable style={styles.sheetContainer} onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Edit name</Text>
                <TouchableOpacity
                  onPress={() => setEditVisible(false)}
                  hitSlop={10}
                >
                  <Ionicons
                    name="close-outline"
                    size={moderateScale(22)}
                    color={C.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.sheetInput}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Your name"
                placeholderTextColor={C.textDim}
                autoFocus
              />

              <TouchableOpacity
                style={[
                  styles.sheetConfirmBtn,
                  isValidName && styles.sheetConfirmBtnActive,
                ]}
                activeOpacity={0.8}
                disabled={!isValidName}
                onPress={handleConfirmName}
              >
                <Text
                  style={[
                    styles.sheetConfirmText,
                    isValidName && styles.sheetConfirmTextActive,
                  ]}
                >
                  Confirm
                </Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    color: C.text,
    fontSize: moderateScale(17),
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(28),
  },
  // Avatar section
  avatarSection: {
    alignItems: "center",
    marginBottom: verticalScale(24),
  },
  avatar: {
    width: scale(76),
    height: scale(76),
    borderRadius: scale(38),
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(12),
  },
  avatarInitial: {
    color: "#000",
    fontSize: moderateScale(30),
    fontWeight: "700",
  },
  userName: {
    color: C.text,
    fontSize: moderateScale(18),
    fontWeight: "600",
    marginBottom: verticalScale(4),
  },
  userEmail: {
    color: C.textMuted,
    fontSize: moderateScale(13),
    marginBottom: verticalScale(14),
  },
  editBtn: {
    paddingHorizontal: scale(28),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  editBtnText: {
    color: C.text,
    fontSize: moderateScale(13),
    fontWeight: "500",
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(16),
    marginBottom: verticalScale(16),
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: C.text,
    fontSize: moderateScale(20),
    fontWeight: "700",
    marginBottom: verticalScale(2),
  },
  statLabel: {
    color: C.textMuted,
    fontSize: moderateScale(11),
  },
  statDivider: {
    width: 1,
    height: verticalScale(28),
    backgroundColor: C.border,
  },
  // Plan banner
  planBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.accentDim,
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    marginBottom: verticalScale(24),
    borderWidth: 1,
    borderColor: "#3A3010",
  },
  planLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
  },
  planText: {
    gap: verticalScale(2),
  },
  planName: {
    color: C.text,
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  planDetail: {
    color: C.textMuted,
    fontSize: moderateScale(11),
  },
  planManage: {
    color: C.accent,
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  // Section label
  sectionLabel: {
    color: C.textDim,
    fontSize: moderateScale(11),
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: verticalScale(8),
    marginLeft: scale(4),
  },
  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(24),
    overflow: "hidden",
  },
  // Setting row
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
  },
  settingIconWrap: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(8),
    backgroundColor: C.iconBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(12),
  },
  settingLabel: {
    flex: 1,
    color: C.text,
    fontSize: moderateScale(14),
  },
  rowDivider: {
    height: 1,
    backgroundColor: C.border,
    marginLeft: scale(62),
  },
  logoutBtn: {
    alignSelf: "center",
    backgroundColor: "#C9A227",
    width: "90%",
    borderRadius: ms(14),
    paddingVertical: vs(12),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: vs(24),
  },
  logoutBtnText: {
    color: "#fff",
    fontSize: s(14),
  },
  // Edit name sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: C.surface,
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    paddingHorizontal: moderateScale(20),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(28),
  },
  sheetHandle: {
    width: moderateScale(36),
    height: moderateScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: C.border,
    alignSelf: "center",
    marginBottom: verticalScale(14),
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(16),
  },
  sheetTitle: { 
    color: C.text,
    fontSize: moderateScale(16), 
    fontWeight: "600"
     },

  sheetInput: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(14),
    paddingVertical: verticalScale(12),
    color: C.text,
    fontSize: moderateScale(15),
    marginBottom: verticalScale(18),
  },
  sheetConfirmBtn: {
    backgroundColor: C.border,
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(13),
    alignItems: "center",
  },
  sheetConfirmBtnActive: { backgroundColor: C.accent },
  sheetConfirmText: {
    color: C.textDim,
    fontSize: moderateScale(15),
    fontWeight: "600",
  },
  sheetConfirmTextActive: { color: "#0F0F0F" },
});
