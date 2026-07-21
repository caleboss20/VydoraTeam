import React, { useEffect, useMemo, useState } from "react";
import { useTheme, ThemeColors } from "../Contexts/ThemeContext";
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

/** Normalize Spring Instant / epoch / ISO strings into a valid Date. */
function parseApiDate(raw: string | number | null | undefined): Date {
  if (raw == null || raw === "") return new Date(NaN);

  // Epoch seconds or millis (Jackson WRITE_DATES_AS_TIMESTAMPS).
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const ms = raw < 1e12 ? raw * 1000 : raw;
    return new Date(ms);
  }

  const iso = String(raw).trim();
  if (/^\d+$/.test(iso)) {
    const n = Number(iso);
    const ms = n < 1e12 ? n * 1000 : n;
    return new Date(ms);
  }

  // "2026-07-21 12:00:00" → ISO-ish
  let normalized = iso.includes(" ") && !iso.includes("T")
    ? iso.replace(" ", "T")
    : iso;

  // Spring Instant is UTC; missing zone → treat as UTC (not local).
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized);
  if (!hasZone) normalized = `${normalized}Z`;

  const d = new Date(normalized);
  return d;
}

function formatRelativeTime(raw: string | number, nowMs: number): string {
  const then = parseApiDate(raw).getTime();
  if (Number.isNaN(then)) return "";
  let diffMs = nowMs - then;
  // Clock skew / future timestamps → treat as now.
  if (diffMs < 0) diffMs = 0;

  const secs = Math.floor(diffMs / 1000);
  if (secs < 45) return "Just now";

  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return mins === 1 ? "1 min ago" : `${mins} min ago`;

  const hrs = Math.floor(diffMs / 3600000);
  if (hrs < 24) return hrs === 1 ? "1 hr ago" : `${hrs} hr ago`;

  const days = Math.floor(hrs / 24);
  if (days === 1) {
    const time = parseApiDate(raw).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return "Yesterday, " + time;
  }
  if (days < 7) return `${days} days ago`;

  return parseApiDate(raw).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function versionLabel(v: ProjectVersion): string {
  if (v.name?.trim()) return v.name.trim();
  if (v.kind === "pre_restore") return `Before restore · v${v.versionNumber}`;
  return `Version ${v.versionNumber}`;
}

function toListItem(v: ProjectVersion, nowMs: number): VersionListItem {
  return { ...v, relativeTime: formatRelativeTime(v.createdAt, nowMs) };
}
export default function VersionHistoryScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

  // Tick so "Just now" / "3 min ago" stay accurate while the screen is open.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

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
      name: name?.trim() || "Checkpoint",
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
  const listItems: VersionListItem[] = versions.map((v) => toListItem(v, nowMs));
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backArrow}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
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
          style={styles.scroll}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
                  <Text style={styles.versionTitle} numberOfLines={1}>
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
                      style={styles.restoreAction}
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
                  <Text style={styles.authorText} numberOfLines={1}>
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
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
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
    color: c.text,
    fontSize: 22,
  },
  headerTitle: {
    color: c.text,
    fontSize: 20,
    fontWeight: "700",
  },
  autoSaveLabel: {
    color: c.textSecondary,
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
    color: c.text,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: c.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  scroll: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: vs(40),
    flexGrow: 1,
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
    backgroundColor: c.textMuted,
    marginTop: 24,
  },
  dotCurrent: {
    backgroundColor: c.accent,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: c.background,
  },
  line: { flex: 1, width: 2, backgroundColor: c.border, marginVertical: 4 },
  card: {
    flex: 1,
    backgroundColor: c.card,
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
    gap: 8,
  },
  versionTitle: {
    color: c.text,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  currentPill: {
    backgroundColor: c.accent,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexShrink: 0,
  },
  currentPillText: { color: c.background, fontWeight: "700", fontSize: 12 },
  restoreAction: { flexShrink: 0 },
  restoreText: { color: c.accent, fontWeight: "700", fontSize: 14 },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    flexWrap: "nowrap",
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    flexShrink: 0,
  },
  avatarText: { color: c.text, fontSize: 11, fontWeight: "700" },
  authorText: { color: "#B0B0B0", fontSize: 13, flex: 1, flexShrink: 1, minWidth: 0 },
  restoredPill: {
    backgroundColor: c.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  restoredPillText: { color: c.textMuted, fontSize: 11 },
});
}
