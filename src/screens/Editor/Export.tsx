import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { s, ms } from "react-native-size-matters";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExport } from "../Contexts/exportContext";
import { Export, ExportStatus } from "../types";
type FilterTab = "All" | ExportStatus;
/* ─── Design Tokens ─── */
const C = {
  bg: "#121212",
  surface: "#212121",
  surfaceAlt: "#333333",
  border: "#3A3A3A",
  accent: "#F5C518",
  textPrimary: "#FFFFFF",
  textSub: "#8A8A8A",
  textMuted: "#666666",
  readyBg: "#1E3A2A",
  readyText: "#4ADE80",
  processingBg: "#3A2E12",
  processingText: "#F5C518",
  failedBg: "#3A1E1E",
  failedText: "#F87171",
};
function formatSize(mb: number): string {
  return `${mb} MB`;
}
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso; // fall back if backend sends a non-ISO string
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
export default function ExportLibraryScreen() {
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const {
    exports: exportsList,
    isLoading,
    deleteExport,
    retryExport,
  } = useExport();
  const statusFiltered = useMemo(() => {
    if (activeTab === "All") return exportsList;
    return exportsList.filter((e) => e.status === activeTab);
  }, [activeTab, exportsList]);
  const filteredExports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return statusFiltered;
    return statusFiltered.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.projectName.toLowerCase().includes(q) ||
        e.format.toLowerCase().includes(q),
    );
  }, [statusFiltered, searchQuery]);
  const isEmpty = filteredExports.length === 0;
  const isSearchEmpty = isEmpty && searchQuery.trim().length > 0;
  const closeSearch = () => {
    setIsSearching(false);
    setSearchQuery("");
  };
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {/* ─── TOP BAR ─── */}
      <View style={styles.topBar}>
        {isSearching ? (
          <>
            <View style={styles.searchInputWrap}>
              <Ionicons name="search" size={s(16)} color={C.textSub} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exports..."
                placeholderTextColor={C.textSub}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons
                    name="close-circle"
                    size={s(16)}
                    color={C.textSub}
                  />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={closeSearch} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.topBarTitle}>Export library</Text>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setIsSearching(true)}
            >
              <Ionicons name="search" size={s(20)} color={C.textPrimary} />
            </TouchableOpacity>
          </>
        )}
      </View>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── FILTER PILLS ─── */}
        <View style={styles.pillRow}>
          {(["All", "Ready", "Processing", "Failed"] as FilterTab[]).map(
            (tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.pill,
                    isActive ? styles.pillActive : styles.pillInactive,
                  ]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.pillText,
                      isActive
                        ? styles.pillTextActive
                        : styles.pillTextInactive,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
        </View>
        {/* ─── COUNT + SORT ─── */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {isLoading
              ? "LOADING…"
              : `${filteredExports.length} EXPORT${filteredExports.length === 1 ? "" : "S"}`}
          </Text>
          <TouchableOpacity style={styles.sortBtn} activeOpacity={0.7}>
            <Text style={styles.sortText}>Sort: Newest</Text>
          </TouchableOpacity>
        </View>
        {/* ─── LIST OR EMPTY STATE ─── */}
        {isLoading && exportsList.length === 0 ? null : isEmpty ? (
          <EmptyState
            tab={activeTab}
            isSearchEmpty={isSearchEmpty}
            query={searchQuery}
          />
        ) : (
          <View style={styles.list}>
            {filteredExports.map((item) => (
              <ExportCard
                key={item.id}
                item={item}
                onDelete={() => deleteExport(item.id)}
                onRetry={() => retryExport(item.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
/* ─── Export Card ─── */
function ExportCard({
  item,
  onDelete,
  onRetry,
}: {
  item: Export;
  onDelete: () => void;
  onRetry: () => void;
}) {
  const statusStyle =
    item.status === "Ready"
      ? { bg: C.readyBg, text: C.readyText }
      : item.status === "Processing"
        ? { bg: C.processingBg, text: C.processingText }
        : { bg: C.failedBg, text: C.failedText };
  return (
    <View style={styles.exportCard}>
      <View style={styles.thumbBox}>
        <Ionicons name="film-outline" size={s(20)} color={C.textSub} />
      </View>
      <View style={styles.exportInfo}>
        <Text style={styles.exportTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.exportMeta} numberOfLines={1}>
          {item.resolution} · {item.format} · {formatSize(item.sizeMb)}
          {item.isFinal ? " · Final" : ""}
        </Text>
        <Text style={styles.exportDate} numberOfLines={1}>
          {item.projectName} · {formatDate(item.createdAt)}
        </Text>
        {item.status === "Failed" && item.errorMessage ? (
          <Text style={styles.exportError} numberOfLines={1}>
            {item.errorMessage}
          </Text>
        ) : null}
      </View>
      <View style={styles.exportRightCol}>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {item.status}
          </Text>
        </View>
        <View style={styles.exportActionsRow}>
          {item.status === "Failed" ? (
            <TouchableOpacity style={styles.exportActionBtn} onPress={onRetry}>
              <Ionicons name="refresh-outline" size={s(16)} color={C.textSub} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.exportActionBtn}>
              <Ionicons
                name="download-outline"
                size={s(16)}
                color={C.textSub}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.exportActionBtn}>
            <Ionicons
              name="share-social-outline"
              size={s(16)}
              color={C.textSub}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportActionBtn} onPress={onDelete}>
            <Ionicons name="trash-outline" size={s(16)} color={C.textSub} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
/* ─── Empty State ───────────────────────────────────────────────────────────
   Two flavors: zero exports overall vs zero results for the active filter.
   Copy is written in the interface's voice — explains the state, doesn't
   apologize for it.
─────────────────────────────────────────────────────────────────────────── */
function EmptyState({
  tab,
  isSearchEmpty,
  query,
}: {
  tab: FilterTab;
  isSearchEmpty: boolean;
  query: string;
}) {
  if (isSearchEmpty) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="search-outline" size={s(28)} color={C.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No matches</Text>
        <Text style={styles.emptyBody}>Nothing found for "{query}".</Text>
      </View>
    );
  }
  const copy =
    tab === "All"
      ? {
          icon: "film-outline" as const,
          title: "No exports yet",
          body: "Finished exports from your projects will show up here.",
        }
      : tab === "Ready"
        ? {
            icon: "checkmark-circle-outline" as const,
            title: "Nothing ready",
            body: "Exports will appear here once processing finishes.",
          }
        : tab === "Processing"
          ? {
              icon: "sync-outline" as const,
              title: "Nothing processing",
              body: "Start an export from a project to see it here.",
            }
          : {
              icon: "alert-circle-outline" as const,
              title: "No failed exports",
              body: "Exports that run into a problem will show up here.",
            };


            
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name={copy.icon} size={s(28)} color={C.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>{copy.title}</Text>
      <Text style={styles.emptyBody}>{copy.body}</Text>
    </View>
  );
}





const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: s(16),
    paddingVertical: s(12),
    minHeight: s(48),
    marginTop: s(5),
    marginBottom: s(20),
  },
  topBarTitle: {
    color: C.textPrimary,
    fontSize: ms(23),
    fontWeight: "700",
  },

  iconBtn: { padding: s(4) },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: s(26),
    paddingHorizontal: s(14),
    paddingVertical: s(12),
    gap: s(6),
    marginBottom: s(10),
  },
  searchInput: { flex: 1, 
    color: C.textPrimary,
     fontSize: ms(13),
      padding: 0 
    },

  cancelBtn: {
    marginLeft: s(10),
  },
  cancelText: {
    color: C.accent,
    fontSize: ms(14),
    fontWeight: "600",
    textAlign: "center",
  },

  body: { flex: 1 },
  bodyContent: { 
    paddingHorizontal: s(12), 
    paddingBottom: s(24)
   },
  pillRow: {
    flexDirection: "row",
    gap: s(13),
    marginBottom: s(16),
    marginRight:s(10),
  },

  pill: {
    paddingHorizontal: s(18),
    paddingVertical: s(7),
    borderRadius: s(16),
  },
  pillActive: { backgroundColor: C.accent },
  pillInactive: { backgroundColor: C.surface },
  pillText: { fontSize: ms(12), fontWeight: "600" },
  pillTextActive: { color: C.bg },
  pillTextInactive: { color: C.textSub },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: s(12),
    paddingBottom: s(12),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  metaText: {
    color: C.textMuted,
    fontSize: ms(11),
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  sortBtn: {},
  sortText: { color: C.accent,
     fontSize: ms(12), fontWeight: "600" },

  list: { 
    gap: s(18),
    marginTop:s(30),

   },

  exportCard: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: s(12),
    padding: s(10),
    gap: s(10),
  },
  thumbBox: {
    width: s(52),
    height: s(52),
    borderRadius: s(8),
    backgroundColor: C.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  exportInfo: { flex: 1, justifyContent: "center" },
  exportTitle: {
    color: C.textPrimary,
    fontSize: ms(13.5),
    fontWeight: "700",
    marginBottom: s(2),
  },
  exportMeta: { color: C.textSub, fontSize: ms(11), marginBottom: s(2) },
  exportDate: { color: C.textMuted, fontSize: ms(10.5) },
  exportError: { color: C.failedText, fontSize: ms(10.5), marginTop: s(2) },
  exportRightCol: { alignItems: "flex-end", justifyContent: "space-between" },
  statusBadge: {
    paddingHorizontal: s(10),
    paddingVertical: s(4),
    borderRadius: s(10),
  },
  statusText: { fontSize: ms(10.5), fontWeight: "700" },
  exportActionsRow: { flexDirection: "row", gap: s(10), marginTop: s(8) },
  exportActionBtn: { padding: s(2) },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: s(48),
    paddingHorizontal: s(20),
  },
  emptyIconCircle: {
    width: s(64),
    height: s(64),
    borderRadius: s(32),
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: s(14),
  },
  emptyTitle: {
    color: C.textPrimary,
    fontSize: ms(15),
    fontWeight: "700",
    marginBottom: s(6),
  },
  emptyBody: {
    color: C.textSub,
    fontSize: ms(12),
    textAlign: "center",
    lineHeight: ms(18),
  },
});
