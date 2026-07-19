import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { s, vs } from "react-native-size-matters";
import { useVersionHistory } from "../Contexts/VersionHistoryContext";
import { useProject } from "../Contexts/projectContext";
import { useVideoProject } from "../Contexts/VideoProjectContext";
import { ProjectVersion, VersionListItem } from "../types";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return mins + " min ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + " hr ago";
  const days = Math.floor(hrs / 24);
  if (days === 1) {
    const time = new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return "Yesterday, " + time;
  }
  return days + " days ago";
}

function versionLabel(v: ProjectVersion): string {
  if (v.name?.trim()) return v.name.trim();
  if (v.kind === "pre_restore") return `Before restore · v${v.versionNumber}`;
  return `Version ${v.versionNumber}`;
}

function toListItem(v: ProjectVersion): VersionListItem {
  return { ...v, relativeTime: formatRelativeTime(v.createdAt) };
}
export default function VersionHistoryScreen() {
  const navigation = useNavigation();
  const { currentProject } = useProject();
  const { currentVideoProject, setCurrentVideoProject } = useVideoProject();
  const projectId = currentProject?.id;
  const {
    versions,
    loading,
    error,
    restoringVersionId,
    fetchVersions,
    restoreVersion,
    createVersion,
  } = useVersionHistory();
  useEffect(() => {
    if (projectId) fetchVersions(projectId);
  }, [projectId, fetchVersions]);

  const handleRestore = (version: ProjectVersion) => {
    Alert.alert(
      "Restore this version?",
      `Your current edits will be saved first, then Version ${version.versionNumber} will become current.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: async () => {
            const restoredProject = await restoreVersion(
              version.id,
              currentVideoProject?.projectId === projectId
                ? currentVideoProject
                : null
            );
            if (restoredProject) {
              setCurrentVideoProject({
                ...restoredProject,
                projectId: projectId!,
                updatedAt: new Date().toISOString(),
              });
              Alert.alert("Restored", "Timeline rolled back to that version.");
            }
          },
        },
      ]
    );
  };

  const saveNamedCheckpoint = async (name?: string) => {
    if (!currentVideoProject?.clips?.length || currentVideoProject.projectId !== projectId) {
      Alert.alert(
        "Nothing to save",
        "Open the editor and add clips for this project first."
      );
      return;
    }
    const created = await createVersion({
      kind: "named",
      name: name?.trim() || `Checkpoint ${new Date().toLocaleString()}`,
      changeSummary: "Named checkpoint",
      videoProject: currentVideoProject,
    });
    if (created) {
      Alert.alert("Saved", name?.trim() ? `"${name.trim()}" saved.` : "Checkpoint saved.");
      fetchVersions(projectId!);
    }
  };

  const handleNamedSave = () => {
    if (Platform.OS === "ios" && typeof (Alert as any).prompt === "function") {
      (Alert as any).prompt(
        "Save version",
        "Name this checkpoint (optional).",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: (name?: string) => {
              void saveNamedCheckpoint(name);
            },
          },
        ],
        "plain-text"
      );
      return;
    }
    Alert.alert("Save version", "Save a named checkpoint of the current timeline?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Save",
        onPress: () => {
          void saveNamedCheckpoint();
        },
      },
    ]);
  };

  if (!projectId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No project selected.</Text>
      </View>
    );
  }
  const listItems: VersionListItem[] = versions.map(toListItem);
  return (
    <SafeAreaView style={styles.container}>
      <View>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backArrow}>
              <Ionicons name="arrow-back" size={24} />
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Version history</Text>
          <TouchableOpacity
            onPress={handleNamedSave}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.restoreText}>Save</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.autoSaveLabel}>AUTO-SAVED EVERY 2 MIN</Text>
        {loading && <ActivityIndicator style={styles.loader} color="#F5C518" />}
        {error && <Text style={styles.errorText}>{error}</Text>}
        {!loading && !error && listItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={40} color="#555" />
            <Text style={styles.emptyTitle}>No versions yet</Text>
            <Text style={styles.emptySubtitle}>
              Auto-saves will show up here as you edit this project.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {listItems.map((version, index) => (
              <View key={version.id} style={styles.row}>
                <View style={styles.dotColumn}>
                  <View
                    style={[styles.dot, version.isCurrent && styles.dotCurrent]}
                  />
                  {index < listItems.length - 1 && <View style={styles.line} />}
                </View>
                <View
                  style={[styles.card, version.isCurrent && styles.cardCurrent]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.versionTitle}>
                      {versionLabel(version)}
                    </Text>
                    {version.isCurrent ? (
                      <View style={styles.currentPill}>
                        <Text style={styles.currentPillText}>Current</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        disabled={!!restoringVersionId}
                        onPress={() => handleRestore(version)}
                      >
                        {restoringVersionId === version.id ? (
                          <ActivityIndicator size="small" color="#F5C518" />
                        ) : (
                          <Text style={styles.restoreText}>Restore</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.authorRow}>
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: version.author.color },
                      ]}
                    >
                      <Text style={styles.avatarText}>
                        {version.author.initials}
                      </Text>
                    </View>
                    <Text style={styles.authorText}>
                      {version.author.name} · {version.relativeTime}
                    </Text>
                    {version.isRestored && !version.isCurrent && (
                      <View style={styles.restoredPill}>
                        <Text style={styles.restoredPillText}>Restored</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    marginBottom: s(10),
  },
  backArrow: {
    color: "#fff",
    fontSize: 22,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  autoSaveLabel: {
    color: "#8A8A8A",
    fontSize: 12,
    paddingHorizontal: 16,
    marginBottom: s(35),
    letterSpacing: 0.5,
  },
  loader: {
    marginTop: 40,
  },
  errorText: {
    color: "#E85C5C",
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: vs(40),
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "#8A8A8A",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: s(60),
  },
  row: {
    flexDirection: "row",
    marginBottom: s(10),
  },
  dotColumn: {
    width: 24,
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#555",
    marginTop: 24,
  },
  dotCurrent: {
    backgroundColor: "#F5C518",
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#0D0D0D",
  },
  line: { flex: 1, width: 2, backgroundColor: "#333", marginVertical: 4 },
  card: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginLeft: 8,
  },
  cardCurrent: { backgroundColor: "#3A330F" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  versionTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  currentPill: {
    backgroundColor: "#F5C518",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  currentPillText: { color: "#0D0D0D", fontWeight: "700", fontSize: 12 },
  restoreText: { color: "#F5C518", fontWeight: "700", fontSize: 14 },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    flexWrap: "wrap",
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  avatarText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  authorText: { color: "#B0B0B0", fontSize: 13 },
  restoredPill: {
    backgroundColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  restoredPillText: { color: "#ccc", fontSize: 11 },
});
