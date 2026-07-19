import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Pressable,
  Alert,
  ActivityIndicator,
  Image
} from "react-native";

import { Modal, TextInput, KeyboardAvoidingView, Platform,} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { moderateScale, verticalScale, scale } from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sharing from "expo-sharing";
import { Paths, File } from "expo-file-system";
import { useProject } from "../Contexts/projectContext";
import * as ImagePicker from "expo-image-picker";
import { useClip } from "../Contexts/clipContext";
import { useMember } from "../Contexts/memberContext";
import { useComment } from "../Contexts/commentContext";
import { useExport } from "../Contexts/exportContext";
import { useAuth } from "../Contexts/Authcontext";
import { useVersionHistory } from "../Contexts/VersionHistoryContext";
import { uploadService } from "../services/uploadService";
import { CONFIG } from "../config";
import { Clip, Member, Comment } from "../types";
// ─── Constants ────────────────────────────────────────────────────────────────
const YELLOW = "#F5C518";
const BG = "#111111";
const CARD = "#1C1C1C";
const BORDER = "#2A2A2A";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_MUTED = "#888888";
const ROLE_COLORS: Record<string, string> = {
  Owner: "#F5C518",
  Editor: "#4CAF50",
  Viewer: "#888",
};
// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = "Clips" | "Members" | "Comments" | "Settings";
// ─── Sub-components ───────────────────────────────────────────────────────────
const Avatar = ({
  initials,
  color,
  size = 38,
}: {
  initials: string;
  color: string;
  size?: number;
}) => (
  <View
    style={[
      styles.avatar,
      {
        backgroundColor: color + "33",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderColor: color,
      },
    ]}
  >
    <Text
      style={[
        styles.avatarText,
        { color, fontSize: moderateScale(size * 0.35) },
      ]}
    >
      {initials}
    </Text>
  </View>
);


// ─── Clips Tab ────────────────────────────────────────//

const ClipsTab = ({
  clips,
  isLoading,
  onUpload,
  onOpenClip,
  onClipMenu,
}: {
  clips: Clip[];
  isLoading: boolean;
  onUpload: () => void;
  onOpenClip: (clip: Clip) => void;
  onClipMenu: (clip: Clip) => void;
}) => {
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={YELLOW} />
      </View>
    );
  }


  if (clips.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons
          name="film-outline"
          size={moderateScale(36)}
          color={TEXT_MUTED}
        />
        <Text style={styles.emptyTitle}>No clips yet</Text>
        <Text style={styles.emptySubtitle}>
          Upload your first clip to get started
        </Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={onUpload}
          activeOpacity={0.8}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={moderateScale(16)}
            color="#000"
          />
          <Text style={styles.emptyBtnText}>Upload clip</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View>
      {clips.map((clip) => (
        <TouchableOpacity
          key={clip.id}
          style={styles.clipRow}
          activeOpacity={0.7}
          onPress={() => onOpenClip(clip)}
        >
          <View style={styles.clipThumb}>
            <Ionicons name="play" size={moderateScale(18)} color={YELLOW} />
          </View>
          <View style={styles.clipInfo}>
            <Text style={styles.clipTitle}>{clip.title}</Text>
            <Text style={styles.clipMeta}>
              {clip.duration} · {clip.resolution}
            </Text>
          </View>
          <Text style={styles.clipDate}>
            {new Date(clip.uploadedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
          <TouchableOpacity
            hitSlop={10}
            onPress={(e) => {
              e.stopPropagation?.();
              onClipMenu(clip);
            }}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={moderateScale(16)}
              color={TEXT_MUTED}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={styles.uploadBtn}
        onPress={onUpload}
        activeOpacity={0.8}
      >
        <Ionicons
          name="cloud-upload-outline"
          size={moderateScale(18)}
          color={TEXT_MUTED}
        />
        <Text style={styles.uploadBtnText}>Upload new clip</Text>
      </TouchableOpacity>
    </View>
  );
};
// ─── Members Tab ──────────────────────────────────────────────────────────────
const MembersTab = ({
  members,
  isLoading,
  projectId,
  onInvite,
}: {
  members: Member[];
  isLoading: boolean;
  projectId: string;
  onInvite: () => void;
}) => {
  const { changeRole, removeMember } = useMember();
  const navigation=useNavigation<any>();
  const handleMemberAction = (member: Member) => {
    Alert.alert(member.name, "What would you like to do?", [
      {
        text: "Change role",
        onPress: () => {
          Alert.alert("Change role", `Set role for ${member.name}`, [
            {
              text: "Editor",
              onPress: () => changeRole(projectId, member.id, "Editor"),
            },
            {
              text: "Viewer",
              onPress: () => changeRole(projectId, member.id, "Viewer"),
            },
            { text: "Cancel", style: "cancel" },
          ]);
        },
      },
      {
        text: "Remove member",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Remove member",
            `Remove ${member.name} from this project?`,
            [
              {
                text: "Remove",
                style: "destructive",
                onPress: () => removeMember(projectId, member.id),
              },
              { text: "Cancel", style: "cancel" },
            ],
          );
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };
  if (isLoading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={YELLOW} />
      </View>
    );
  return (
    <View>
      {members.map((member) => (
        <View key={member.id} style={styles.memberRow}>
          <View>
            <Avatar initials={member.initials} color={member.color} />
            {member.online && <View style={styles.onlineDot} />}
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{member.name}</Text>
            <Text
              style={[styles.memberRole, { color: ROLE_COLORS[member.role] }]}
            >
              {member.role}
            </Text>
          </View>
          {member.role !== "Owner" && (
            <TouchableOpacity
              style={styles.memberAction}
              onPress={() => handleMemberAction(member)}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={moderateScale(16)}
                color={TEXT_MUTED}
              />
            </TouchableOpacity>
          )}
        </View>
      ))}
      
      <TouchableOpacity
      
        style={styles.inviteBtn}
        onPress={onInvite}
        activeOpacity={0.8}
      >
        <Ionicons
          name="person-add-outline"
          size={moderateScale(16)}
          color={YELLOW}
        />
        <Text style={styles.inviteBtnText}>Invite member</Text>
      </TouchableOpacity>
      <Text
      onPress={() =>
        navigation.navigate("teammember", { projectId })
      }
       style={styles.teammembersText}>View All members</Text>
    </View>
  );
};
// ─── Comments Tab ─────────────────────────────────────────────────────────────
const CommentsTab = ({
  comments,
  isLoading,
  clipTitleById,
}: {
  comments: Comment[];
  isLoading: boolean;
  clipTitleById: Record<string, string>;
}) => {
  if (isLoading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={YELLOW} />
      </View>
    );
  if (comments.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons
          name="chatbubble-outline"
          size={moderateScale(36)}
          color={TEXT_MUTED}
        />
        <Text style={styles.emptyTitle}>No comments yet</Text>
        <Text style={styles.emptySubtitle}>Comments will appear here</Text>
      </View>
    );
  }
  return (
    <View>
      {comments.map((comment) => (
        <View key={comment.id} style={styles.commentRow}>
          <Avatar initials={comment.initials} color={comment.color} size={34} />
          <View style={styles.commentBody}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentAuthor}>{comment.author}</Text>
              <Text style={styles.commentTimestamp}>{comment.timestamp}</Text>
            </View>
            <View style={styles.commentClipTag}>
              <Ionicons
                name="attach"
                size={moderateScale(10)}
                color={TEXT_MUTED}
              />
              <Text style={styles.commentClipText}>
                {" "}
                {clipTitleById[comment.clipId] || "Clip"}
              </Text>
            </View>
            <Text style={styles.commentText}>{comment.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};
// ─── Settings Tab ─────────────────────────────────────────────────────────────
const SettingsTab = ({
  projectId,
  projectName,
  onRename,
  onPickThumbnail,
  onTransferOwnership,
}: {
  projectId: string;
  projectName: string;
  onRename: () => void;
  onPickThumbnail: () => void;
  onTransferOwnership: () => void;
}) => {
  const navigation = useNavigation<any>();
  const { updateStatus, deleteProject, currentProject, updateVisibility } =
    useProject();
  const prefsKey = `${CONFIG.ASYNC_STORAGE_KEYS.PROJECT_PREFS_PREFIX}${projectId}`;
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [watermark, setWatermark] = useState(false);
  const [publicAccess, setPublicAccess] = useState(
    currentProject?.visibility === "Public"
  );

  useEffect(() => {
    setPublicAccess(currentProject?.visibility === "Public");
  }, [currentProject?.visibility]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(prefsKey);
        if (!raw) return;
        const p = JSON.parse(raw);
        if (typeof p.notifications === "boolean") setNotifications(p.notifications);
        if (typeof p.autoSave === "boolean") setAutoSave(p.autoSave);
        if (typeof p.watermark === "boolean") setWatermark(p.watermark);
      } catch {
        /* ignore */
      }
    })();
  }, [prefsKey]);

  const persistPrefs = async (next: {
    notifications: boolean;
    autoSave: boolean;
    watermark: boolean;
  }) => {
    await AsyncStorage.setItem(prefsKey, JSON.stringify(next));
  };

  const handleArchive = () => {
    Alert.alert("Archive project", "Hide this project without deleting it?", [
      {
        text: "Archive",
        style: "destructive",
        onPress: () => {
          updateStatus(projectId, "Archived");
          navigation.navigate("projects");
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete project",
      "This will permanently remove the project. This cannot be undone.",
      [
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteProject(projectId);
            navigation.navigate("projects");
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const SettingToggle = ({
    icon,
    label,
    sub,
    value,
    onChange,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    sub: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingIconBox}>
        <Ionicons name={icon} size={moderateScale(18)} color={YELLOW} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#333", true: "#F5C51880" }}
        thumbColor={value ? YELLOW : "#666"}
      />
    </View>
  );
  const SettingAction = ({
    icon,
    label,
    sub,
    danger,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    sub: string;
    danger?: boolean;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={styles.settingRow}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        style={[
          styles.settingIconBox,
          danger && { backgroundColor: "#FF444420" },
        ]}
      >
        <Ionicons
          name={icon}
          size={moderateScale(18)}
          color={danger ? "#FF4444" : YELLOW}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingLabel, danger && { color: "#FF4444" }]}>
          {label}
        </Text>
        <Text style={styles.settingSub}>{sub}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={moderateScale(16)}
        color={danger ? "#FF4444" : TEXT_MUTED}
      />
    </TouchableOpacity>
  );
  return (
    <View>
      <Text style={styles.settingSection}>PROJECT</Text>
      <SettingAction
        icon="pencil-outline"
        label="Rename project"
        sub="Change the project display name"
        onPress={onRename}
      />
      <SettingAction
        icon="image-outline"
        label="Project thumbnail"
        sub="Update the cover image"
        onPress={onPickThumbnail}
      />
      <SettingAction
        icon="settings-outline"
        label="Export settings"
        sub="Resolution, format, frame rate"
        onPress={() => navigation.navigate("reviewexport")}
      />
      <Text style={styles.settingSection}>COLLABORATION</Text>
      <SettingToggle
        icon="notifications-outline"
        label="Notifications"
        sub="Get alerts for comments and edits"
        value={notifications}
        onChange={(v) => {
          setNotifications(v);
          void persistPrefs({ notifications: v, autoSave, watermark });
        }}
      />
      <SettingToggle
        icon="save-outline"
        label="Auto-save"
        sub="Save changes every 30 seconds"
        value={autoSave}
        onChange={(v) => {
          setAutoSave(v);
          void persistPrefs({ notifications, autoSave: v, watermark });
        }}
      />
      <SettingToggle
        icon="globe-outline"
        label="Public access"
        sub="Anyone with the link can view"
        value={publicAccess}
        onChange={async (v) => {
          setPublicAccess(v);
          try {
            await updateVisibility(projectId, v ? "Public" : "Private");
          } catch (e: any) {
            setPublicAccess(!v);
            Alert.alert("Couldn’t update", e?.message || "Try again.");
          }
        }}
      />
      <SettingToggle
        icon="water-outline"
        label="Watermark"
        sub="Add studio watermark on export"
        value={watermark}
        onChange={(v) => {
          setWatermark(v);
          void persistPrefs({ notifications, autoSave, watermark: v });
        }}
      />
      <Text style={styles.settingSection}>DANGER ZONE</Text>
      <SettingAction
        icon="swap-horizontal-outline"
        label="Transfer ownership"
        sub="Hand over project to another member"
        onPress={onTransferOwnership}
      />
      <SettingAction
        icon="archive-outline"
        label="Archive project"
        sub="Hide project without deleting"
        danger
        onPress={handleArchive}
      />
      <SettingAction
        icon="trash-outline"
        label="Delete project"
        sub="Permanently remove this project"
        danger
        onPress={handleDelete}
      />
    </View>
  );
};


// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProjectDetailScreen() {

  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const {
    currentProject,
    updateThumbnail,
    renameProject,
    updateStatus,
    deleteProject,
  } = useProject();
  const { exports: exportsList } = useExport();
  const { versions, fetchVersions } = useVersionHistory();

  const [renameVisible, setRenameVisible] = useState(false);
  const [renameInput, setRenameInput] = useState(currentProject?.name ?? "");

  const openRenameSheet = () => {
    setRenameInput(currentProject?.name ?? "");
    setRenameVisible(true);
  };

  const isValidRename =
    renameInput.trim().length > 0 &&
    renameInput.trim() !== (currentProject?.name ?? "").trim();

  const handleConfirmRename = async () => {
    if (!isValidRename || !currentProject) return;
    await renameProject(currentProject.id, renameInput.trim());
    setRenameVisible(false);
  };

  const pickCoverImage = async () => {
    if (!currentProject) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to set a cover.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    try {
      const asset = result.assets[0];
      const fileName =
        (asset as { fileName?: string }).fileName ||
        `cover_${Date.now()}.jpg`;
      const mime =
        (asset as { mimeType?: string }).mimeType || "image/jpeg";
      const uploaded = await uploadService.uploadImage(
        asset.uri,
        fileName,
        mime
      );
      await updateThumbnail(currentProject.id, uploaded.url);
    } catch (e: any) {
      Alert.alert("Couldn’t update cover", e?.message || "Try again.");
    }
  };

  const {
    fetchClips,
    getClipsForProject,
    deleteClip,
    isLoading: clipsLoading,
  } = useClip();
  const {
    fetchMembers,
    getMembersForProject,
    changeRole,
    isLoading: membersLoading,
  } = useMember();
  const {
    fetchComments,
    getCommentsForProject,
    isLoading: commentsLoading,
  } = useComment();
  const [activeTab, setActiveTab] = useState<Tab>("Clips");

  const handleShareProject = async () => {
    if (!currentProject) return;
    const readyExport = exportsList
      .filter(
        (e) =>
          e.projectId === currentProject.id &&
          e.status === "Ready" &&
          e.fileUrl
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

    if (!readyExport?.fileUrl) {
      Alert.alert(
        "No export ready",
        "Export this project first before sharing.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Export",
            onPress: () => navigation.navigate("reviewexport"),
          },
        ]
      );
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
        const fileName =
          readyExport.fileUrl.split("/").pop() ?? "video.mp4";
        const destination = new File(Paths.cache, fileName);
        const downloaded = await File.downloadFileAsync(
          readyExport.fileUrl,
          destination
        );
        localUri = downloaded.uri;
      }
      await Sharing.shareAsync(localUri);
    } catch {
      /* dismissed */
    }
  };

  const handleOverflow = () => {
    if (!currentProject) return;
    Alert.alert(currentProject.name, undefined, [
      { text: "Rename", onPress: openRenameSheet },
      { text: "Share", onPress: () => void handleShareProject() },
      {
        text: "Archive",
        style: "destructive",
        onPress: () => {
          updateStatus(currentProject.id, "Archived");
          navigation.navigate("projects");
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete project",
            "This cannot be undone.",
            [
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  await deleteProject(currentProject.id);
                  navigation.navigate("projects");
                },
              },
              { text: "Cancel", style: "cancel" },
            ]
          );
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleTransferOwnership = () => {
    if (!currentProject || !user) return;
    const candidates = getMembersForProject(currentProject.id).filter(
      (m) =>
        (m.status || "ACTIVE") !== "INVITED" &&
        m.userId !== user.id &&
        m.role !== "Owner"
    );
    if (candidates.length === 0) {
      Alert.alert(
        "No members",
        "Invite an active teammate first, then transfer ownership."
      );
      return;
    }
    Alert.alert(
      "Transfer ownership",
      "Choose a member to become Owner",
      [
        ...candidates.slice(0, 5).map((m) => ({
          text: m.name,
          onPress: async () => {
            try {
              await changeRole(currentProject.id, m.userId, "Owner");
              await changeRole(currentProject.id, user.id, "Editor");
              Alert.alert("Done", `${m.name} is now the project owner.`);
            } catch (e: any) {
              Alert.alert("Transfer failed", e?.message || "Try again.");
            }
          },
        })),
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  };

 

  useEffect(() => {
    if (!currentProject) return;
    fetchClips(currentProject.id);
    fetchMembers(currentProject.id);
    fetchComments(currentProject.id);
    fetchVersions(currentProject.id);
  }, [currentProject?.id]);

  // Refresh clips when returning from Upload Video so new server clips show up.
  useFocusEffect(
    useCallback(() => {
      if (!currentProject?.id) return;
      fetchClips(currentProject.id);
    }, [currentProject?.id])
  );
  if (!currentProject) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator color={YELLOW} />
        </View>
      </SafeAreaView>
    );
  }
  const projectClips = getClipsForProject(currentProject.id);
  // Active members only on the Project Detail tab — pending invites live on Team Members.
  const projectMembers = getMembersForProject(currentProject.id).filter(
    (m) => (m.status || "ACTIVE") !== "INVITED",
  );
  const projectComments = getCommentsForProject(currentProject.id);
  const clipTitleById = Object.fromEntries(
    projectClips.map((c) => [c.id, c.title])
  );
  const stats: {
    label: string;
    value: number;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }[] = [
    {
      label: "Videos",
      value: projectClips.length,
      icon: "videocam-outline",
      onPress: () => setActiveTab("Clips"),
    },
    {
      label: "Members",
      value: projectMembers.length,
      icon: "people-outline",
      onPress: () => setActiveTab("Members"),
    },
    {
      label: "Comments",
      value: projectComments.length,
      icon: "chatbubble-outline",
      onPress: () => setActiveTab("Comments"),
    },
    {
      label: "Versions",
      value: versions.length,
      icon: "git-branch-outline",
      onPress: () => navigation.navigate("versionhistory"),
    },
  ];

  const TABS: {
    key: Tab;
    icon: keyof typeof Ionicons.glyphMap;
    iconActive: keyof typeof Ionicons.glyphMap;
  }[] = [
    { key: "Clips", icon: "film-outline", iconActive: "film" },
    { key: "Members", icon: "people-outline", iconActive: "people" },
    { key: "Comments", icon: "chatbubble-outline", iconActive: "chatbubble" },
    { key: "Settings", icon: "settings-outline", iconActive: "settings" },
  ];

  const isActive = currentProject.status === "Active";

  const renderTab = () => {
    switch (activeTab) {
      case "Clips":
        return (
          <ClipsTab
            clips={projectClips}
            isLoading={clipsLoading}
            onUpload={() => navigation.navigate("uploadvideo")}
            onOpenClip={() => navigation.navigate("editorscreen")}
            onClipMenu={(clip) => {
              Alert.alert(clip.title, undefined, [
                {
                  text: "Open in editor",
                  onPress: () => navigation.navigate("editorscreen"),
                },
                {
                  text: "Delete clip",
                  style: "destructive",
                  onPress: () => {
                    Alert.alert(
                      "Delete clip",
                      `Remove "${clip.title}" from this project?`,
                      [
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () =>
                            void deleteClip(currentProject.id, clip.id),
                        },
                        { text: "Cancel", style: "cancel" },
                      ]
                    );
                  },
                },
                { text: "Cancel", style: "cancel" },
              ]);
            }}
          />
        );
      case "Members":
        return (
          <MembersTab
            members={projectMembers}
            isLoading={membersLoading}
            projectId={currentProject.id}
            onInvite={() => navigation.navigate("invitemember")}
          />
        );
      case "Comments":
        return (
          <CommentsTab
            comments={projectComments}
            isLoading={commentsLoading}
            clipTitleById={clipTitleById}
          />
        );
      case "Settings":
        return (
          <SettingsTab
            projectId={currentProject.id}
            projectName={currentProject.name}
            onRename={openRenameSheet}
            onPickThumbnail={() => void pickCoverImage()}
            onTransferOwnership={handleTransferOwnership}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons
            name="arrow-back"
            size={moderateScale(20)}
            color={TEXT_PRIMARY}
          />
        </Pressable>
        <TouchableOpacity style={styles.headerBtn} onPress={handleOverflow}>
          <Ionicons
            name="ellipsis-horizontal"
            size={moderateScale(20)}
            color={TEXT_PRIMARY}
          />
        </TouchableOpacity>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Thumbnail */}
        <Pressable style={styles.thumbnail} onPress={pickCoverImage}>
          {currentProject.thumbnailUrl ? ( // CHANGED: read from currentProject, not local state
            <Image source={{ uri: currentProject.thumbnailUrl }} style={styles.coverImage} />
          ) : (
            <Ionicons
              name="film"
              size={moderateScale(52)}
              color={TEXT_MUTED}
              style={{ opacity: 0.4 }}
            />
          )}
        </Pressable>

        {/* Title + Badge */}
<Pressable

 style={styles.titleRow}>
  <Pressable
  onPress={openRenameSheet}
   style={[styles.titleNameRow, { flex: 1, minWidth: 0 }]}>
    <Text
      style={[styles.projectTitle, { flexShrink: 1 }]}
      numberOfLines={1}
      ellipsizeMode="tail"
    >
      {currentProject.name}
    </Text>
    <TouchableOpacity
      onPress={openRenameSheet}
      hitSlop={8}
      style={[styles.renamePencil, { flexShrink: 0 }]}
    >
      <Ionicons name="pencil" size={moderateScale(15)} color="#fff" />
    </TouchableOpacity>
  </Pressable>

  <View style={[styles.activeBadge, !isActive && styles.draftBadge, { flexShrink: 0 }]}>
    {isActive && <View style={styles.activeDot} />}
    <Text
      style={[
        styles.activeBadgeText,
        !isActive && { color: TEXT_MUTED },
      ]}
    >
      {currentProject.status}
    </Text>
  </View>
</Pressable>


        {/* Stats Row */}
        <View style={styles.statsRow}>
          {stats.map((stat, i) => (
            <React.Fragment key={stat.label}>
              <Pressable style={styles.statItem} onPress={stat.onPress}>
                <Ionicons
                  name={stat.icon}
                  size={moderateScale(14)}
                  color={YELLOW}
                  style={{ marginBottom: verticalScale(2) }}
                />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Pressable>
              {i < stats.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>
        {/* CTA Buttons */}
        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("editorscreen")}
          >
            <Ionicons
              name="create-outline"
              size={moderateScale(16)}
              color="#111"
            />
            <Text style={styles.primaryBtnText}>Open editor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={() => void handleShareProject()}
          >
            <Ionicons
              name="share-social-outline"
              size={moderateScale(16)}
              color={TEXT_PRIMARY}
            />
            <Text style={styles.secondaryBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
        {/* Tabs */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={active ? tab.iconActive : tab.icon}
                  size={moderateScale(16)}
                  color={active ? YELLOW : TEXT_MUTED}
                  style={{ marginBottom: verticalScale(4) }}
                />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.key}
                </Text>
                {active && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>{renderTab()}</View>
      </ScrollView>

      {/* Rename bottom sheet */}
      <Modal
        visible={renameVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRenameVisible(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setRenameVisible(false)}>
          <Pressable style={styles.sheetContainer} onPress={() => {}}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Rename project</Text>
                <TouchableOpacity onPress={() => setRenameVisible(false)} hitSlop={10}>
                  <Ionicons name="close-outline" size={moderateScale(22)} color={TEXT_MUTED} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.sheetInput}
                value={renameInput}
                onChangeText={setRenameInput}
                placeholder="Project name"
                placeholderTextColor={TEXT_MUTED}
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
    backgroundColor: BG,
  },
  scroll: {
    paddingBottom: verticalScale(32),
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
  },
  headerBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: CARD,
    justifyContent: "center",
    alignItems: "center",
  },
  // Thumbnail
  thumbnail: {
    marginHorizontal: scale(16),
    height: verticalScale(180),
    backgroundColor: CARD,
    borderRadius: moderateScale(12),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(16),
  },
  coverImage:{
  width:'100%',
  height:'100%',
  borderRadius:12,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Title
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(16),
  },



//for the project title//
titleNameRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: scale(6),
},
renamePencil: {
  padding: scale(4),
  marginTop:scale(3),
},






  projectTitle: {
    color: TEXT_PRIMARY,
    fontSize: moderateScale(20),
    fontWeight: "700",
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A3D1A",
    borderRadius: moderateScale(20),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderWidth: 1,
    borderColor: "#4CAF50",
    gap: scale(5),
  },
  activeDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: "#4CAF50",
  },
  activeBadgeText: {
    color: "#4CAF50",
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    marginHorizontal: scale(16),
    backgroundColor: CARD,
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(14),
    marginBottom: verticalScale(16),
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: TEXT_PRIMARY,
    fontSize: moderateScale(18),
    fontWeight: "700",
  },
  statLabel: {
    color: TEXT_MUTED,
    fontSize: moderateScale(11),
    marginTop: verticalScale(2),
  },
  statDivider: {
    width: 1,
    backgroundColor: BORDER,
    marginVertical: verticalScale(4),
  },
  // CTA
  ctaRow: {
    flexDirection: "row",
    paddingHorizontal: scale(16),
    gap: scale(10),
    marginBottom: verticalScale(25),
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: YELLOW,
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(10),
    alignItems: "center",
    justifyContent: "center",
    gap: scale(6),
  },
  primaryBtnText: {
    color: "#111",
    fontWeight: "700",
    fontSize: moderateScale(14),
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: CARD,
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(10),
    alignItems: "center",
    justifyContent: "center",
    gap: scale(6),
    borderWidth: 1,
    borderColor: BORDER,
  },
  secondaryBtnText: {
    color: TEXT_PRIMARY,
    fontWeight: "600",
    fontSize: moderateScale(14),
  },
  // Tab Bar
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: verticalScale(4),
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingBottom: verticalScale(10),
    paddingTop: verticalScale(6),
  },
  tabText: {
    color: TEXT_MUTED,
    fontSize: moderateScale(11),
    fontWeight: "500",
  },
  tabTextActive: {
    color: YELLOW,
    fontWeight: "700",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: scale(6),
    right: scale(6),
    height: 2,
    backgroundColor: YELLOW,
    borderRadius: 2,
  },
  tabContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
  },
  // Clips
  clipRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD,
    borderRadius: moderateScale(12),
    padding: scale(12),
    marginBottom: verticalScale(10),
    gap: scale(12),
  },
  clipThumb: {
    width: scale(44),
    height: scale(44),
    backgroundColor: "#2A2A2A",
    borderRadius: moderateScale(8),
    justifyContent: "center",
    alignItems: "center",
  },
  clipInfo: {
    flex: 1,
  },
  clipTitle: {
    color: TEXT_PRIMARY,
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  clipMeta: {
    color: TEXT_MUTED,
    fontSize: moderateScale(12),
    marginTop: verticalScale(2),
  },
  clipDate: {
    color: TEXT_MUTED,
    fontSize: moderateScale(11),
  },
  uploadBtn: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: "dashed",
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(16),
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    marginTop: verticalScale(4),
    backgroundColor: "#1A1A1A",
  },
  uploadBtnText: {
    color: TEXT_MUTED,
    fontSize: moderateScale(14),
    fontWeight: "500",
  },
  // Members
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD,
    borderRadius: moderateScale(12),
    padding: scale(12),
    marginBottom: verticalScale(10),
    gap: scale(12),
  },
  avatar: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },
  avatarText: {
    fontWeight: "700",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: "#4CAF50",
    borderWidth: 1.5,
    borderColor: CARD,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: TEXT_PRIMARY,
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  memberRole: {
    fontSize: moderateScale(12),
    marginTop: verticalScale(2),
    fontWeight: "500",
  },
  memberAction: {
    padding: scale(8),
  },
  memberActionText: {
    color: TEXT_MUTED,
    fontSize: moderateScale(16),
    letterSpacing: 1,
  },
  inviteBtn: {
    borderWidth: 1,
    borderColor: YELLOW + "60",
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(8),
    alignItems: "center",
    // flexDirection:'row',
    alignSelf: "center",
    width: "100%",
    marginTop: verticalScale(40),
    backgroundColor: YELLOW + "10",
    marginBottom: scale(20),
  },
  inviteBtnText: {
    color: YELLOW,
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  // Comments
  commentRow: {
    flexDirection: "row",
    backgroundColor: CARD,
    borderRadius: moderateScale(12),
    padding: scale(12),
    marginBottom: verticalScale(10),
    gap: scale(10),
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(4),
  },
  commentAuthor: {
    color: TEXT_PRIMARY,
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  commentTimestamp: {
    color: TEXT_MUTED,
    fontSize: moderateScale(11),
  },
  commentClipTag: {
    backgroundColor: "#2A2A2A",
    borderRadius: moderateScale(6),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    alignSelf: "flex-start",
    marginBottom: verticalScale(6),
  },
  commentClipText: {
    color: TEXT_MUTED,
    fontSize: moderateScale(11),
  },
  commentText: {
    color: "#CCCCCC",
    fontSize: moderateScale(13),
    lineHeight: moderateScale(19),
  },
  // Settings
  settingSection: {
    color: TEXT_MUTED,
    fontSize: moderateScale(11),
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD,
    borderRadius: moderateScale(12),
    padding: scale(14),
    marginBottom: verticalScale(8),
    gap: scale(12),
  },
  settingLabel: {
    color: TEXT_PRIMARY,
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  settingSub: {
    color: TEXT_MUTED,
    fontSize: moderateScale(12),
    marginTop: verticalScale(2),
  },
  settingsActionText: {
    color: TEXT_MUTED,
    fontSize: moderateScale(12),
    fontWeight: "500",
  },

  //empty state//
  emptyState: { alignItems: "center", paddingVertical: verticalScale(40) },
  emptyTitle: {
    color: TEXT_PRIMARY,
    fontSize: moderateScale(15),
    fontWeight: "600",
    marginTop: verticalScale(12),
  },
  emptySubtitle: {
    color: TEXT_MUTED,
    fontSize: moderateScale(12),
    marginTop: verticalScale(4),
    marginBottom: verticalScale(16),
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: YELLOW,
    borderRadius: scale(10),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
  },
  emptyBtnText: {
    color: "#000",
    fontWeight: "700",
    fontSize: moderateScale(13),
    marginLeft: scale(6),
  },

  settingIconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(8),
    backgroundColor: "#2A2000",
    justifyContent: "center",
    alignItems: "center",
  },
  draftBadge: {
    backgroundColor: "#2A2A2A",
  },

//for the bottom sheet for editing project name//

sheetOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.6)",
  justifyContent: "flex-end",
},
sheetContainer: {
  backgroundColor: "#1C1C1C",
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
  backgroundColor: "#2A2A2A",
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
  color: TEXT_PRIMARY,
  fontSize: moderateScale(16),
  fontWeight: "600",
},
sheetInput: {
  backgroundColor: "#141414",
  borderWidth: 1,
  borderColor: "#2A2A2A",
  borderRadius: moderateScale(12),
  paddingHorizontal: moderateScale(14),
  paddingVertical: verticalScale(12),
  color: TEXT_PRIMARY,
  fontSize: moderateScale(15),
  marginBottom: verticalScale(18),
},
sheetConfirmBtn: {
  backgroundColor: "#2A2A2A",
  borderRadius: moderateScale(12),
  paddingVertical: verticalScale(13),
  alignItems: "center",
},
sheetConfirmBtnActive: {
  backgroundColor: YELLOW,
},
sheetConfirmText: {
  color: TEXT_MUTED,
  fontSize: moderateScale(15),
  fontWeight: "600",
},
sheetConfirmTextActive: {
  color: "#141414",
},
teammembersText:{
fontSize:scale(12),
color:'#fff',
textAlign:'center',
},


});

