/**
 * Project version history — CapCut restore list + GitHub-style activity grid.
 * Organized by day; day sheet shows full who / what / when (no clamped copy).
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Platform,
  Modal,
  Pressable,
  Image,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../Contexts/ThemeContext';
import { useVersionHistory } from '../Contexts/VersionHistoryContext';
import { useProject } from '../Contexts/projectContext';
import { useVideoProject } from '../Contexts/VideoProjectContext';
import { ProjectVersion } from '../types';
import {
  ActivityHeatmap,
  DayKey,
  formatDayHeading,
  toDayKey,
} from '../components/ActivityHeatmap';

const LIST_PAGE = 8;
const DAY_SHEET_PAGE = 12;

function parseApiDate(raw: string | number | null | undefined): Date {
  if (raw == null || raw === '') return new Date(NaN);
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const ms = raw < 1e12 ? raw * 1000 : raw;
    return new Date(ms);
  }
  const iso = String(raw).trim();
  if (/^\d+$/.test(iso)) {
    const n = Number(iso);
    const ms = n < 1e12 ? n * 1000 : n;
    return new Date(ms);
  }
  let normalized =
    iso.includes(' ') && !iso.includes('T') ? iso.replace(' ', 'T') : iso;
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized);
  if (!hasZone) normalized = `${normalized}Z`;
  return new Date(normalized);
}

function formatRelativeTime(raw: string | number, nowMs: number): string {
  const then = parseApiDate(raw).getTime();
  if (Number.isNaN(then)) return '';
  let diffMs = nowMs - then;
  if (diffMs < 0) diffMs = 0;
  const secs = Math.floor(diffMs / 1000);
  if (secs < 45) return 'Just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return mins === 1 ? '1 min ago' : `${mins} min ago`;
  const hrs = Math.floor(diffMs / 3600000);
  if (hrs < 24) return hrs === 1 ? '1 hr ago' : `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) {
    const time = parseApiDate(raw).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `Yesterday, ${time}`;
  }
  if (days < 7) return `${days} days ago`;
  return parseApiDate(raw).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatExactTime(raw: string | number): string {
  const d = parseApiDate(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function versionLabel(v: ProjectVersion): string {
  if (v.name?.trim()) return v.name.trim();
  if (v.kind === 'pre_restore') return `Before restore · v${v.versionNumber}`;
  if (v.kind === 'named') return `Checkpoint · v${v.versionNumber}`;
  return `Auto-save · v${v.versionNumber}`;
}

function kindLabel(v: ProjectVersion): string {
  if (v.kind === 'named') return 'Named';
  if (v.kind === 'pre_restore') return 'Pre-restore';
  return 'Auto';
}

function dayKeyOf(v: ProjectVersion): DayKey {
  const d = parseApiDate(v.createdAt);
  if (Number.isNaN(d.getTime())) return toDayKey(new Date());
  return toDayKey(d);
}

type DaySection = { day: DayKey; items: ProjectVersion[] };

function groupByDay(items: ProjectVersion[]): DaySection[] {
  const map = new Map<DayKey, ProjectVersion[]>();
  for (const v of items) {
    const k = dayKeyOf(v);
    const arr = map.get(k) ?? [];
    arr.push(v);
    map.set(k, arr);
  }
  return Array.from(map.entries()).map(([day, list]) => ({
    day,
    items: list,
  }));
}

function AuthorAvatar({
  author,
  size = 28,
  colors,
}: {
  author: ProjectVersion['author'];
  size?: number;
  colors: ThemeColors;
}) {
  if (author.avatarUrl) {
    return (
      <Image
        source={{ uri: author.avatarUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
        }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: author.color || colors.iconBg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: size * 0.38,
          fontWeight: '800',
        }}
      >
        {author.initials}
      </Text>
    </View>
  );
}

export default function VersionHistoryScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
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

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [selectedDay, setSelectedDay] = useState<DayKey | null>(null);
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [listVisible, setListVisible] = useState(LIST_PAGE);
  const [dayVisible, setDayVisible] = useState(DAY_SHEET_PAGE);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (projectId) fetchVersions(projectId);
  }, [projectId, fetchVersions]);

  useEffect(() => {
    setListVisible(LIST_PAGE);
  }, [versions.length, selectedDay]);

  useEffect(() => {
    setDayVisible(DAY_SHEET_PAGE);
  }, [selectedDay, daySheetOpen]);

  const sorted = useMemo(
    () =>
      [...versions].sort(
        (a, b) =>
          parseApiDate(b.createdAt).getTime() -
          parseApiDate(a.createdAt).getTime()
      ),
    [versions]
  );

  const countsByDay = useMemo(() => {
    const map: Record<DayKey, number> = {};
    for (const v of sorted) {
      const k = dayKeyOf(v);
      map[k] = (map[k] ?? 0) + 1;
    }
    return map;
  }, [sorted]);

  const stats = useMemo(() => {
    const activeDays = Object.values(countsByDay).filter((n) => n > 0).length;
    const last = sorted[0];
    return {
      activeDays,
      total: sorted.length,
      lastLabel: last
        ? formatRelativeTime(last.createdAt, nowMs)
        : '—',
    };
  }, [countsByDay, sorted, nowMs]);

  const filtered = useMemo(() => {
    if (!selectedDay) return sorted;
    return sorted.filter((v) => dayKeyOf(v) === selectedDay);
  }, [sorted, selectedDay]);

  const sections = useMemo(() => groupByDay(filtered), [filtered]);

  const visibleSections = useMemo(() => {
    let remaining = listVisible;
    const out: DaySection[] = [];
    for (const sec of sections) {
      if (remaining <= 0) break;
      const slice = sec.items.slice(0, remaining);
      remaining -= slice.length;
      out.push({ day: sec.day, items: slice });
    }
    return out;
  }, [sections, listVisible]);

  const totalFiltered = filtered.length;
  const canLoadMore = listVisible < totalFiltered;

  const daySheetItems = useMemo(() => {
    if (!selectedDay) return [];
    return sorted.filter((v) => dayKeyOf(v) === selectedDay);
  }, [sorted, selectedDay]);

  const daySheetVisible = daySheetItems.slice(0, dayVisible);

  const handleSelectDay = (day: DayKey | null) => {
    setSelectedDay(day);
    if (day) setDaySheetOpen(true);
    else setDaySheetOpen(false);
  };

  const handleRestore = (version: ProjectVersion) => {
    Alert.alert(
      'Restore this version?',
      `Your current edits will be saved first, then Version ${version.versionNumber} will become current.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
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
              setDaySheetOpen(false);
              Alert.alert('Restored', 'Timeline rolled back to that version.');
            }
          },
        },
      ]
    );
  };

  const saveNamedCheckpoint = async (name?: string) => {
    if (
      !currentVideoProject?.clips?.length ||
      currentVideoProject.projectId !== projectId
    ) {
      Alert.alert(
        'Nothing to save',
        'Open the editor and add clips for this project first.'
      );
      return;
    }
    const created = await createVersion({
      kind: 'named',
      name: name?.trim() || 'Checkpoint',
      changeSummary: 'Named checkpoint',
      videoProject: currentVideoProject,
    });
    if (created) {
      Alert.alert(
        'Saved',
        name?.trim() ? `"${name.trim()}" saved.` : 'Checkpoint saved.'
      );
      fetchVersions(projectId!);
    }
  };

  const handleNamedSave = () => {
    if (Platform.OS === 'ios' && typeof (Alert as any).prompt === 'function') {
      (Alert as any).prompt(
        'Save version',
        'Name this checkpoint (optional).',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: (name?: string) => {
              void saveNamedCheckpoint(name);
            },
          },
        ],
        'plain-text'
      );
      return;
    }
    Alert.alert(
      'Save version',
      'Save a named checkpoint of the current timeline?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: () => {
            void saveNamedCheckpoint();
          },
        },
      ]
    );
  };

  if (!projectId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No project selected.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={10}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Version history</Text>
        <TouchableOpacity onPress={handleNamedSave} hitSlop={10}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      {loading && !versions.length ? (
        <ActivityIndicator style={styles.loader} color={colors.accent} />
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {!loading && !error && sorted.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No versions yet</Text>
          <Text style={styles.emptySubtitle}>
            Auto-saves appear here every couple of minutes while you edit. Named
            checkpoints and restores show up with full detail.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.autoSaveLabel}>
            Auto-saved about every 2 minutes while editing
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Versions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.activeDays}</Text>
              <Text style={styles.statLabel}>Active days</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue} numberOfLines={2}>
                {stats.lastLabel}
              </Text>
              <Text style={styles.statLabel}>Last edit</Text>
            </View>
          </View>

          <ActivityHeatmap
            colors={colors}
            isDark={isDark}
            countsByDay={countsByDay}
            selectedDay={selectedDay}
            onSelectDay={handleSelectDay}
          />

          {selectedDay ? (
            <View style={styles.filterBar}>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterTitle}>
                  Showing {formatDayHeading(selectedDay)}
                </Text>
                <Text style={styles.filterMeta}>
                  {daySheetItems.length} version
                  {daySheetItems.length === 1 ? '' : 's'} that day
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDaySheetOpen(true)}
                style={styles.filterBtn}
              >
                <Text style={styles.filterBtnText}>Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSelectDay(null)}
                style={styles.filterClear}
                hitSlop={8}
              >
                <Text style={styles.filterClearText}>Clear</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.sectionEyebrow}>All versions</Text>
          )}

          {visibleSections.map((sec) => (
            <View key={sec.day} style={styles.dayBlock}>
              <TouchableOpacity
                style={styles.dayHeader}
                onPress={() => {
                  setSelectedDay(sec.day);
                  setDaySheetOpen(true);
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.dayHeaderTitle}>
                  {formatDayHeading(sec.day)}
                </Text>
                <View style={styles.dayCountPill}>
                  <Text style={styles.dayCountText}>
                    {(countsByDay[sec.day] ?? sec.items.length).toString()}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {sec.items.map((version, index) => (
                <View key={version.id} style={styles.row}>
                  <View style={styles.dotColumn}>
                    <View
                      style={[
                        styles.dot,
                        version.isCurrent && styles.dotCurrent,
                      ]}
                    />
                    {index < sec.items.length - 1 ? (
                      <View style={styles.line} />
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.card,
                      version.isCurrent && styles.cardCurrent,
                    ]}
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
                          style={styles.restoreAction}
                        >
                          {restoringVersionId === version.id ? (
                            <ActivityIndicator
                              size="small"
                              color={colors.accent}
                            />
                          ) : (
                            <Text style={styles.saveText}>Restore</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>

                    {version.changeSummary ? (
                      <Text style={styles.summaryText}>
                        {version.changeSummary}
                      </Text>
                    ) : null}

                    <View style={styles.metaBlock}>
                      <AuthorAvatar
                        author={version.author}
                        size={scale(26)}
                        colors={colors}
                      />
                      <View style={styles.metaTextCol}>
                        <Text style={styles.authorName}>
                          {version.author.name}
                        </Text>
                        <Text style={styles.timeText}>
                          {formatExactTime(version.createdAt)}
                          {' · '}
                          {formatRelativeTime(version.createdAt, nowMs)}
                        </Text>
                        <Text style={styles.kindText}>
                          {kindLabel(version)}
                          {version.isRestored && !version.isCurrent
                            ? ' · Restored earlier'
                            : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))}

          {canLoadMore ? (
            <TouchableOpacity
              style={styles.loadMore}
              onPress={() => setListVisible((n) => n + LIST_PAGE)}
              activeOpacity={0.85}
            >
              <Text style={styles.loadMoreText}>
                Show more ({totalFiltered - listVisible} left)
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}

      <Modal
        visible={daySheetOpen && !!selectedDay}
        transparent
        animationType="slide"
        onRequestClose={() => setDaySheetOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setDaySheetOpen(false)}
        >
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, paddingRight: scale(8) }}>
                <Text style={styles.sheetTitle}>
                  {selectedDay ? formatDayHeading(selectedDay) : ''}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {daySheetItems.length} version
                  {daySheetItems.length === 1 ? '' : 's'} · who saved what and
                  when
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDaySheetOpen(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetList}
              showsVerticalScrollIndicator={false}
            >
              {daySheetVisible.map((version) => (
                <View key={version.id} style={styles.sheetCard}>
                  <View style={styles.sheetCardTop}>
                    <Text style={styles.sheetVersionTitle}>
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
                          <ActivityIndicator
                            size="small"
                            color={colors.accent}
                          />
                        ) : (
                          <Text style={styles.saveText}>Restore</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.sheetExactTime}>
                    {formatExactTime(version.createdAt)}
                  </Text>
                  <Text style={styles.sheetRelative}>
                    {formatRelativeTime(version.createdAt, nowMs)}
                  </Text>

                  {version.changeSummary ? (
                    <Text style={styles.sheetSummary}>
                      {version.changeSummary}
                    </Text>
                  ) : (
                    <Text style={styles.sheetSummaryMuted}>
                      No written summary for this save.
                    </Text>
                  )}

                  <View style={styles.sheetAuthorRow}>
                    <AuthorAvatar
                      author={version.author}
                      size={scale(32)}
                      colors={colors}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetAuthorName}>
                        {version.author.name}
                      </Text>
                      <Text style={styles.kindText}>
                        {kindLabel(version)} save
                        {version.isRestored ? ' · was restored before' : ''}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {dayVisible < daySheetItems.length ? (
                <TouchableOpacity
                  style={styles.loadMore}
                  onPress={() => setDayVisible((n) => n + DAY_SHEET_PAGE)}
                >
                  <Text style={styles.loadMoreText}>
                    Show more that day (
                    {daySheetItems.length - dayVisible} left)
                  </Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: scale(16),
      paddingTop: verticalScale(8),
      paddingBottom: verticalScale(12),
    },
    headerTitle: {
      color: c.text,
      fontSize: moderateScale(18),
      fontWeight: '700',
    },
    saveText: {
      color: c.accent,
      fontWeight: '700',
      fontSize: moderateScale(14),
    },
    autoSaveLabel: {
      color: c.textSecondary,
      fontSize: moderateScale(12),
      lineHeight: moderateScale(18),
      marginBottom: verticalScale(14),
    },
    loader: { marginTop: 40 },
    errorText: {
      color: c.danger,
      textAlign: 'center',
      marginTop: 20,
      paddingHorizontal: 16,
      lineHeight: 20,
    },
    emptyState: {
      alignItems: 'center',
      paddingHorizontal: scale(32),
      paddingTop: verticalScale(48),
    },
    emptyTitle: {
      color: c.text,
      fontSize: moderateScale(17),
      fontWeight: '700',
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      color: c.textSecondary,
      fontSize: moderateScale(13),
      textAlign: 'center',
      lineHeight: moderateScale(20),
    },
    scroll: { flex: 1 },
    list: {
      paddingHorizontal: scale(16),
      paddingBottom: verticalScale(48),
    },
    statsRow: {
      flexDirection: 'row',
      gap: scale(8),
      marginBottom: verticalScale(14),
    },
    statCard: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: verticalScale(12),
      paddingHorizontal: scale(10),
      minHeight: verticalScale(68),
      justifyContent: 'center',
    },
    statValue: {
      color: c.text,
      fontSize: moderateScale(15),
      fontWeight: '800',
      marginBottom: 4,
    },
    statLabel: {
      color: c.textMuted,
      fontSize: moderateScale(11),
      fontWeight: '600',
    },
    filterBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(8),
      backgroundColor: c.surface,
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: c.border,
      padding: scale(12),
      marginBottom: verticalScale(14),
    },
    filterTitle: {
      color: c.text,
      fontSize: moderateScale(14),
      fontWeight: '700',
    },
    filterMeta: {
      color: c.textSecondary,
      fontSize: moderateScale(12),
      marginTop: 2,
      lineHeight: moderateScale(16),
    },
    filterBtn: {
      backgroundColor: c.accent,
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(8),
      borderRadius: scale(10),
    },
    filterBtnText: {
      color: c.accentOn,
      fontWeight: '800',
      fontSize: moderateScale(12),
    },
    filterClear: {
      paddingHorizontal: scale(6),
      paddingVertical: verticalScale(8),
    },
    filterClearText: {
      color: c.textSecondary,
      fontWeight: '700',
      fontSize: moderateScale(12),
    },
    sectionEyebrow: {
      color: c.textMuted,
      fontSize: moderateScale(11),
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: verticalScale(10),
    },
    dayBlock: {
      marginBottom: verticalScale(18),
    },
    dayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(8),
      marginBottom: verticalScale(10),
    },
    dayHeaderTitle: {
      flex: 1,
      color: c.text,
      fontSize: moderateScale(15),
      fontWeight: '700',
    },
    dayCountPill: {
      backgroundColor: c.iconBg,
      borderRadius: scale(10),
      paddingHorizontal: scale(8),
      paddingVertical: verticalScale(3),
    },
    dayCountText: {
      color: c.textSecondary,
      fontSize: moderateScale(11),
      fontWeight: '700',
    },
    row: {
      flexDirection: 'row',
      marginBottom: scale(4),
    },
    dotColumn: {
      width: 24,
      alignItems: 'center',
    },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: c.textMuted,
      marginTop: 22,
    },
    dotCurrent: {
      backgroundColor: c.accent,
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: c.background,
      marginTop: 20,
    },
    line: {
      flex: 1,
      width: 2,
      backgroundColor: c.border,
      marginVertical: 4,
    },
    card: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      marginLeft: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardCurrent: {
      backgroundColor: isDark ? '#2A2410' : '#FFF8E0',
      borderColor: c.accent,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
    },
    versionTitle: {
      color: c.text,
      fontSize: moderateScale(15),
      fontWeight: '700',
      flex: 1,
      lineHeight: moderateScale(21),
    },
    currentPill: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    currentPillText: {
      color: c.accentOn,
      fontWeight: '700',
      fontSize: 12,
    },
    restoreAction: { paddingTop: 2 },
    summaryText: {
      color: c.textSecondary,
      fontSize: moderateScale(13),
      lineHeight: moderateScale(19),
      marginTop: verticalScale(8),
    },
    metaBlock: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: scale(10),
      marginTop: verticalScale(12),
    },
    metaTextCol: {
      flex: 1,
      gap: 2,
    },
    authorName: {
      color: c.text,
      fontSize: moderateScale(13),
      fontWeight: '700',
    },
    timeText: {
      color: c.textSecondary,
      fontSize: moderateScale(12),
      lineHeight: moderateScale(17),
    },
    kindText: {
      color: c.textMuted,
      fontSize: moderateScale(11),
      marginTop: 2,
    },
    loadMore: {
      alignItems: 'center',
      paddingVertical: verticalScale(14),
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      marginTop: verticalScale(4),
      marginBottom: verticalScale(12),
    },
    loadMoreText: {
      color: c.accent,
      fontWeight: '700',
      fontSize: moderateScale(13),
    },
    sheetBackdrop: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.background,
      borderTopLeftRadius: scale(18),
      borderTopRightRadius: scale(18),
      maxHeight: '88%',
      minHeight: '42%',
      paddingBottom: verticalScale(20),
    },
    sheetHandle: {
      alignSelf: 'center',
      width: scale(40),
      height: scale(4),
      borderRadius: 2,
      backgroundColor: c.border,
      marginTop: verticalScale(10),
      marginBottom: verticalScale(8),
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: scale(18),
      paddingBottom: verticalScale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    sheetTitle: {
      color: c.text,
      fontSize: moderateScale(20),
      fontWeight: '800',
      lineHeight: moderateScale(26),
    },
    sheetSubtitle: {
      color: c.textSecondary,
      fontSize: moderateScale(13),
      lineHeight: moderateScale(19),
      marginTop: 4,
    },
    sheetScroll: { flexGrow: 0 },
    sheetList: {
      paddingHorizontal: scale(16),
      paddingTop: verticalScale(12),
      paddingBottom: verticalScale(28),
    },
    sheetCard: {
      backgroundColor: c.card,
      borderRadius: scale(14),
      borderWidth: 1,
      borderColor: c.border,
      padding: scale(14),
      marginBottom: verticalScale(10),
    },
    sheetCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: verticalScale(8),
    },
    sheetVersionTitle: {
      flex: 1,
      color: c.text,
      fontSize: moderateScale(16),
      fontWeight: '700',
      lineHeight: moderateScale(22),
    },
    sheetExactTime: {
      color: c.text,
      fontSize: moderateScale(14),
      fontWeight: '600',
    },
    sheetRelative: {
      color: c.textSecondary,
      fontSize: moderateScale(12),
      marginTop: 2,
      marginBottom: verticalScale(8),
    },
    sheetSummary: {
      color: c.textSecondary,
      fontSize: moderateScale(13),
      lineHeight: moderateScale(19),
      marginBottom: verticalScale(12),
    },
    sheetSummaryMuted: {
      color: c.textMuted,
      fontSize: moderateScale(12),
      fontStyle: 'italic',
      marginBottom: verticalScale(12),
      lineHeight: moderateScale(17),
    },
    sheetAuthorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(10),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      paddingTop: verticalScale(12),
    },
    sheetAuthorName: {
      color: c.text,
      fontSize: moderateScale(14),
      fontWeight: '700',
    },
  });
}
