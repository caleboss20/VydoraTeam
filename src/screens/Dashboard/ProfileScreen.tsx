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
  Alert,
  Image,
  Linking,
  Share,
} from "react-native";

import {
  moderateScale,
  verticalScale,
  scale,
  ms,
  s,
  vs,
} from "react-native-size-matters";
import * as ImagePicker from "expo-image-picker"

import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../Contexts/Authcontext";
import { useProject } from "../Contexts/projectContext";
import { useExport } from "../Contexts/exportContext";
import { uploadService } from "../services/uploadService";
import { Project } from "../types";
// ─── Static content (not user data — these don't need a context) ──────────────
type ProfileAction =
  | "personal"
  | "privacy"
  | "notifications"
  | "teams"
  | "help";

const ACCOUNT_ITEMS: { icon: string; label: string; action: ProfileAction }[] = [
  { icon: "person-outline", label: "Personal info", action: "personal" },
  { icon: "lock-closed-outline", label: "Privacy & security", action: "privacy" },
  { icon: "notifications-outline", label: "Notifications", action: "notifications" },
  { icon: "people-outline", label: "Teams & roles", action: "teams" },
];
const SUPPORT_ITEMS: { icon: string; label: string; action: ProfileAction }[] = [
  { icon: "chatbubble-outline", label: "Help & feedback", action: "help" },
];
// Plan banner uses live project count; storage is still a product placeholder.
const PLAN_PLACEHOLDER = {
  name: "Pro plan",
  detailPrefix: "200 GB storage",
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
const SettingRow = ({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
}) => (
  <TouchableOpacity
    style={styles.settingRow}
    activeOpacity={0.65}
    onPress={onPress}
  >
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
  const navigation = useNavigation<any>();
  const { user, logout, updateUser } = useAuth();
  const { projects, setCurrentProject } = useProject();
  const { exports: exportsList } = useExport();
  const initials = useMemo(() => getInitials(user?.name), [user?.name]);
  // Personal info sheet (name + email + photo, like a real account screen)
  const [infoVisible, setInfoVisible] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name ?? "");
  const openPersonalInfo = () => {
    setNameInput(user?.name ?? "");
    setInfoVisible(true);
  };
  const isValidName =
    nameInput.trim().length > 0 &&
    nameInput.trim() !== (user?.name ?? "").trim();

  const [savingProfile, setSavingProfile] = useState(false);

  const handleConfirmName = async () => {
    if (!isValidName || savingProfile) return;
    setSavingProfile(true);
    try {
      await updateUser({ name: nameInput.trim() });
      Alert.alert("Saved", "Your name was updated.");
    } catch (e: any) {
      Alert.alert("Couldn’t save name", e?.message || "Try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangeAvatar = async () => {
    if (savingProfile) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to set a profile picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const fileName =
      (asset as { fileName?: string }).fileName ||
      `avatar_${Date.now()}.jpg`;
    const mime =
      (asset as { mimeType?: string }).mimeType ||
      (fileName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");

    setSavingProfile(true);
    try {
      const uploaded = await uploadService.uploadImage(uri, fileName, mime);
      await updateUser({ avatarUrl: uploaded.url });
    } catch (e: any) {
      Alert.alert("Couldn’t update photo", e?.message || "Try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: "signin" }],
    });
  };

  const openTeamMembers = (project: Project) => {
    setCurrentProject(project);
    navigation.navigate("teammember", { projectId: project.id });
  };

  const handleTeamsAndRoles = () => {
    if (projects.length === 0) {
      Alert.alert(
        "No projects yet",
        "Create a project first, then manage team members and roles.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "New project",
            onPress: () => navigation.navigate("newproject"),
          },
        ]
      );
      return;
    }
    if (projects.length === 1) {
      openTeamMembers(projects[0]);
      return;
    }
    Alert.alert(
      "Teams & roles",
      "Choose a project to manage members",
      [
        ...projects.slice(0, 5).map((p) => ({
          text: p.name,
          onPress: () => openTeamMembers(p),
        })),
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  };

  const handlePrivacy = () => {
    Alert.alert("Privacy & security", "Manage your account security", [
      {
        text: "Change password",
        onPress: () => navigation.navigate("forgotpassword"),
      },
      {
        text: "App settings",
        onPress: () => navigation.navigate("settings"),
      },
      {
        text: "Sign out",
        style: "destructive",
        onPress: handleLogout,
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleHelp = () => {
    Alert.alert("Help & feedback", "How can we help?", [
      {
        text: "Email support",
        onPress: async () => {
          const url =
            "mailto:support@vydora.app?subject=Vydora%20feedback&body=Hi%20Vydora%20team%2C%0A%0A";
          const can = await Linking.canOpenURL(url);
          if (can) await Linking.openURL(url);
          else Alert.alert("Email", "Could not open your mail app.");
        },
      },
      {
        text: "Share app feedback",
        onPress: async () => {
          try {
            await Share.share({
              message:
                "Feedback for Vydora: I’m using the app and wanted to share…",
            });
          } catch {
            /* user dismissed */
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleAccountAction = (action: ProfileAction) => {
    switch (action) {
      case "personal":
        openPersonalInfo();
        break;
      case "privacy":
        handlePrivacy();
        break;
      case "notifications":
        navigation.navigate("Activity");
        break;
      case "teams":
        handleTeamsAndRoles();
        break;
      case "help":
        handleHelp();
        break;
    }
  };

  // Only Projects + Exports are backed by real contexts right now.
  const stats = [
    {
      label: "Projects",
      value: projects.length,
      onPress: () => navigation.navigate("projects"),
    },
    {
      label: "Exports",
      value: exportsList.length,
      onPress: () => navigation.navigate("export"),
    },
  ];

  const planDetail = `${PLAN_PLACEHOLDER.detailPrefix} · ${projects.length} active project${
    projects.length === 1 ? "" : "s"
  }`;

  
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
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
  <TouchableOpacity
    style={styles.avatar}
    activeOpacity={0.8}
    onPress={handleChangeAvatar}
  >
    {user?.avatarUrl ? (
      <Image
        source={{ uri: user.avatarUrl }}
        style={styles.avatarImage}
      />
    ) : (
      <Text style={styles.avatarInitial}>{initials}</Text>
    )}
    <View style={styles.avatarEditBadge}>
      <Ionicons name="camera" size={moderateScale(13)} color="#0F0F0F" />
    </View>
  </TouchableOpacity>
  <Text style={styles.userName}>{user?.name ?? "Unnamed"}</Text>
  <Text style={styles.userEmail}>{user?.email ?? ""}</Text>
  <TouchableOpacity
    style={styles.editBtn}
    activeOpacity={0.75}
    onPress={openPersonalInfo}
  >
    <Text style={styles.editBtnText}>Edit</Text>
  </TouchableOpacity>
</View>

        
        {/* Stats row — Projects + Exports only (real data) */}
        <View style={styles.statsRow}>
          {stats.map((stat, i) => (
            <React.Fragment key={stat.label}>
              <TouchableOpacity
                style={styles.statItem}
                activeOpacity={0.7}
                onPress={stat.onPress}
              >
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </TouchableOpacity>
              {i < stats.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>
        {/* Pro plan banner */}
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
              <Text style={styles.planDetail}>{planDetail}</Text>
            </View>
          </View>
          <Text style={styles.planManage}>Manage</Text>
        </TouchableOpacity>



        {/* Account section */}
        <SectionLabel title="ACCOUNT" />
        <View style={styles.card}>
          {ACCOUNT_ITEMS.map((item, i) => (
            <React.Fragment key={item.label}>
              <SettingRow
                icon={item.icon}
                label={item.label}
                onPress={() => handleAccountAction(item.action)}
              />
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
              <SettingRow
                icon={item.icon}
                label={item.label}
                onPress={() => handleAccountAction(item.action)}
              />
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

      {/* Personal info sheet — name, email, photo */}
      <Modal
        visible={infoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInfoVisible(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setInfoVisible(false)}
        >
          <Pressable style={styles.sheetContainer} onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Personal info</Text>
                <TouchableOpacity
                  onPress={() => setInfoVisible(false)}
                  hitSlop={10}
                >
                  <Ionicons
                    name="close-outline"
                    size={moderateScale(22)}
                    color={C.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.infoAvatarWrap}>
                <TouchableOpacity
                  style={styles.infoAvatar}
                  activeOpacity={0.8}
                  onPress={handleChangeAvatar}
                >
                  {user?.avatarUrl ? (
                    <Image
                      source={{ uri: user.avatarUrl }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Text style={styles.infoAvatarInitial}>{initials}</Text>
                  )}
                  <View style={styles.avatarEditBadge}>
                    <Ionicons
                      name="camera"
                      size={moderateScale(12)}
                      color="#0F0F0F"
                    />
                  </View>
                </TouchableOpacity>
                <Text style={styles.infoAvatarHint}>Tap to change photo</Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoFieldLabel}>Name</Text>
                <TextInput
                  style={styles.infoFieldInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Your name"
                  placeholderTextColor={C.textDim}
                  autoCapitalize="words"
                  returnKeyType="done"
                />

                <View style={styles.infoFieldDivider} />

                <Text style={styles.infoFieldLabel}>Email</Text>
                <View style={styles.infoReadonlyRow}>
                  <Text style={styles.infoReadonlyValue} numberOfLines={1}>
                    {user?.email || "—"}
                  </Text>
                  <Ionicons
                    name="lock-closed-outline"
                    size={moderateScale(14)}
                    color={C.textDim}
                  />
                </View>
                <Text style={styles.infoFieldHint}>
                  Sign-in email can’t be changed here
                </Text>

                <View style={styles.infoFieldDivider} />

                <Text style={styles.infoFieldLabel}>Account ID</Text>
                <Text style={styles.infoReadonlyValue} numberOfLines={1}>
                  {user?.id || "—"}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.sheetConfirmBtn,
                  isValidName && !savingProfile && styles.sheetConfirmBtnActive,
                ]}
                activeOpacity={0.8}
                disabled={!isValidName || savingProfile}
                onPress={handleConfirmName}
              >
                <Text
                  style={[
                    styles.sheetConfirmText,
                    isValidName && !savingProfile && styles.sheetConfirmTextActive,
                  ]}
                >
                  {savingProfile ? "Saving…" : "Save name"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.infoDoneBtn}
                activeOpacity={0.75}
                onPress={() => setInfoVisible(false)}
              >
                <Text style={styles.infoDoneText}>Done</Text>
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
  // Personal info sheet
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
    maxHeight: "92%",
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
    fontWeight: "600",
  },
  infoAvatarWrap: {
    alignItems: "center",
    marginBottom: verticalScale(20),
  },
  infoAvatar: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(8),
  },
  infoAvatarInitial: {
    color: "#000",
    fontSize: moderateScale(26),
    fontWeight: "700",
  },
  infoAvatarHint: {
    color: C.textMuted,
    fontSize: moderateScale(12),
  },
  infoCard: {
    backgroundColor: C.bg,
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    marginBottom: verticalScale(16),
  },
  infoFieldLabel: {
    color: C.textDim,
    fontSize: moderateScale(11),
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: verticalScale(6),
  },
  infoFieldInput: {
    color: C.text,
    fontSize: moderateScale(15),
    paddingVertical: verticalScale(4),
    marginBottom: verticalScale(4),
  },
  infoReadonlyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  infoReadonlyValue: {
    flex: 1,
    color: C.text,
    fontSize: moderateScale(15),
  },
  infoFieldHint: {
    color: C.textDim,
    fontSize: moderateScale(11),
    marginTop: verticalScale(4),
  },
  infoFieldDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: verticalScale(12),
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
  infoDoneBtn: {
    marginTop: verticalScale(10),
    paddingVertical: verticalScale(12),
    alignItems: "center",
  },
  infoDoneText: {
    color: C.textMuted,
    fontSize: moderateScale(14),
    fontWeight: "500",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.bg,
  },
});
