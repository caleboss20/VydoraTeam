import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTheme, ThemeColors, darkColors } from "../Contexts/ThemeContext";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  PanResponder,
  Image,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import * as Sharing from "expo-sharing";
import * as VideoThumbnails from "expo-video-thumbnails";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVideoProject } from "../Contexts/VideoProjectContext";
import { useProject } from "../Contexts/projectContext";
import { useAuth } from "../Contexts/Authcontext";
import { useExport } from "../Contexts/exportContext";
import { exportService } from "../services/exportService";
import { Export, VideoProject } from "../types";

type Resolution = "720p" | "1080p" | "4K";
type Format = "MP4" | "MOV" | "WebM";
const RESOLUTION_WEIGHT: Record<Resolution, number> = {
  "720p": 1,
  "1080p": 2.2,
  "4K": 7.5,
};
const FORMAT_WEIGHT: Record<Format, number> = {
  MP4: 1,
  MOV: 1.15,
  WebM: 0.8,
};
function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}
export default function ExportReviewScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  styles = makeStyles(colors);
  const confettiRef = useRef<any>(null);
  const { currentVideoProject } = useVideoProject();
  const { currentProject } = useProject();
  const [resolution, setResolution] = useState<Resolution>("1080p");
  const [format, setFormat] = useState<Format>("MP4");
  const [quality, setQuality] = useState(80);
  const [includeTextOverlays, setIncludeTextOverlays] = useState(true);
  const [includeFilters, setIncludeFilters] = useState(true);
  const [includeWatermark, setIncludeWatermark] = useState(false);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);

  const { token } = useAuth();
  const { prependExport } = useExport();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [completedExport, setCompletedExport] = useState<Export | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportProject: VideoProject | null = useMemo(() => {
    const collabId = currentProject?.id;
    if (
      currentVideoProject &&
      (!collabId || currentVideoProject.projectId === collabId)
    ) {
      return {
        ...currentVideoProject,
        projectId: currentVideoProject.projectId || collabId || "",
        title: currentVideoProject.title || currentProject?.name || "Project",
      };
    }
    if (collabId) {
      return {
        id: `vp-${collabId}`,
        projectId: collabId,
        title: currentProject?.name || "Project",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clips: [],
        totalDurationMs: 0,
      };
    }
    return null;
  }, [currentVideoProject, currentProject]);

  const firstClip = exportProject?.clips?.[0];
  const [clipPreviewUri, setClipPreviewUri] = useState<string | null>(null);

  // Prefer the editor clip frame — never the project create banner.
  useEffect(() => {
    let cancelled = false;
    setClipPreviewUri(null);

    const load = async () => {
      if (!firstClip?.uri) return;
      if (firstClip.thumbnailUri) {
        if (!cancelled) setClipPreviewUri(firstClip.thumbnailUri);
        return;
      }
      try {
        const timeMs = Math.max(0, firstClip.trimStartMs ?? 0);
        const { uri } = await VideoThumbnails.getThumbnailAsync(firstClip.uri, {
          time: timeMs,
        });
        if (!cancelled) setClipPreviewUri(uri);
      } catch (e) {
        console.log("Export preview thumbnail failed", e);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [firstClip?.uri, firstClip?.thumbnailUri, firstClip?.trimStartMs]);

  const handleExport = async () => {
    if (!exportProject?.projectId || !token) {
      setExportError("No project loaded for export.");
      return;
    }
    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    try {
      const result = await exportService.createExport(
        exportProject,
        {
          resolution,
          format,
          quality,
          includeTextOverlays,
          includeFilters,
          includeWatermark,
        },
        (percent) => setExportProgress(percent),
        token,
      );

      setCompletedExport(result);
      await prependExport(result);
      confettiRef.current?.start();
      setTimeout(() => setShowSuccessSheet(true), 600);
    } catch (e: any) {
      setExportError(e.message ?? "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const durationLabel = exportProject
    ? formatDuration(exportProject.totalDurationMs)
    : "0:00";
  const filename = exportProject
    ? `${exportProject.title}.${format.toLowerCase()}`
    : "Project.mp4";
  const { estimatedSizeMb, estimatedSeconds } = useMemo(() => {
    if (!exportProject)
      return { estimatedSizeMb: 0, estimatedSeconds: 0 };
    const durationSec = Math.max(1, exportProject.totalDurationMs / 1000);
    const qualityFactor = quality / 80;
    const baseMbPerSec = 1.8;
    const sizeMb =
      durationSec *
      baseMbPerSec *
      RESOLUTION_WEIGHT[resolution] *
      FORMAT_WEIGHT[format] *
      qualityFactor;
    const seconds = Math.max(5, Math.round(sizeMb / 4));
    return { estimatedSizeMb: Math.round(sizeMb), estimatedSeconds: seconds };
  }, [exportProject, resolution, format, quality]);

  if (!exportProject?.projectId) {
    return (
      <SafeAreaView style={styles.emptyState} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={scale(24)} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Export</Text>
          <View style={{ width: scale(24) }} />
        </View>
        <Text style={styles.emptyText}>No project loaded</Text>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: verticalScale(40) }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={scale(24)} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Export</Text>
          <View style={{ width: scale(24) }} />
        </View>
        <View style={styles.previewBox}>
          {clipPreviewUri ? (
            <Image
              source={{ uri: clipPreviewUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : firstClip?.uri ? (
            <Video
              source={{ uri: firstClip.uri }}
              resizeMode={ResizeMode.COVER}
              style={StyleSheet.absoluteFillObject}
              useNativeControls={false}
              shouldPlay={false}
            />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Ionicons name="film-outline" size={scale(32)} color="#555" />
            </View>
          )}
          <View style={styles.playButtonWrap}>
            <Ionicons name="play" size={scale(22)} color="#fff" />
          </View>
          <Text style={styles.durationLabel}>{durationLabel}</Text>
          <Text style={styles.filenameLabel}>{filename}</Text>
        </View>
        <Text style={styles.sectionLabel}>RESOLUTION</Text>
        <View style={styles.pillRow}>
          {(["720p", "1080p", "4K"] as Resolution[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.pill, resolution === r && styles.pillActive]}
              onPress={() => setResolution(r)}
            >
              <Text
                style={[
                  styles.pillText,
                  resolution === r && styles.pillTextActive,
                ]}
              >
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.sectionLabel}>FORMAT</Text>
        <View style={styles.pillRow}>
          {(["MP4", "MOV", "WebM"] as Format[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.pill, format === f && styles.pillActive]}
              onPress={() => setFormat(f)}
            >
              <Text
                style={[styles.pillText, format === f && styles.pillTextActive]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.qualityHeaderRow}>
          <Text style={styles.sectionLabelInline}>QUALITY</Text>
          <Text style={styles.qualityValue}>{quality}%</Text>
        </View>
        <QualitySlider value={quality} onChange={setQuality} />
        <Text style={styles.sectionLabel}>INCLUDE</Text>
        <ToggleRow
          icon="text"
          label="Text overlays"
          value={includeTextOverlays}
          onChange={setIncludeTextOverlays}
        />
        <ToggleRow
          icon="options"
          label="Applied filters"
          value={includeFilters}
          onChange={setIncludeFilters}
        />
        <ToggleRow
          icon="people"
          label="Collaborator watermark"
          value={includeWatermark}
          onChange={setIncludeWatermark}
        />
        <View style={styles.estimateBanner}>
          <View>
            <Text style={styles.estimateLabel}>Estimated size</Text>
            <Text style={styles.estimateValue}>{estimatedSizeMb} MB</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.estimateLabel}>Estimated time</Text>
            <Text style={styles.estimateValue}>~{estimatedSeconds} sec</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.exportButton, isExporting && { opacity: 0.7 }]}
          onPress={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <Text style={styles.exportButtonText}>
              Exporting... {Math.round(exportProgress)}%
            </Text>
          ) : (
            <>
              <Ionicons name="download" size={scale(18)} color="#111" />
              <Text style={styles.exportButtonText}>Export video</Text>
            </>
          )}
        </TouchableOpacity>
        {exportError && <Text style={styles.errorText}>{exportError}</Text>}
      </ScrollView>

      {showSuccessSheet && completedExport && (
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetIconWrap}>
              <Ionicons name="checkmark" size={scale(28)} color="#111" />
            </View>
            <Text style={styles.sheetTitle}>Export complete</Text>
            <Text style={styles.sheetSubtitle}>
              {completedExport.title}.{completedExport.format.toLowerCase()} ·{" "}
              {completedExport.resolution}
            </Text>

            <TouchableOpacity
              style={styles.sheetPrimaryButton}
              onPress={async () => {
                try {
                  const available = await Sharing.isAvailableAsync();
                  if (available && completedExport.fileUrl) {
                    await Sharing.shareAsync(completedExport.fileUrl);
                  }
                } catch (e) {
                  console.log("share failed", e);
                }
                setShowSuccessSheet(false);
              }}
            >
              <Ionicons name="share-outline" size={scale(16)} color="#111" />
              <Text style={styles.sheetPrimaryText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetSecondaryButton}
              onPress={() => {
                setShowSuccessSheet(false);
                navigation?.navigate("export");
              }}
            >
              <Text style={styles.sheetSecondaryText}>View exports</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetSecondaryButton}
              onPress={() => setShowSuccessSheet(false)}
            >
              <Text style={styles.sheetSecondaryText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {completedExport && (
        <ConfettiCannon
          ref={confettiRef}
          count={80}
          origin={{ x: scale(160), y: 0 }}
          fallSpeed={3000}
          explosionSpeed={350}
          fadeOut
          colors={["#F5C518", "#ffffff"]}
        />
      )}
    </SafeAreaView>
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onChange,
}: {
  icon: string;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLeft}>
        <Ionicons name={icon as any} size={scale(18)} color="#ccc" />
        <Text style={styles.toggleLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#333", true: "#F5C518" }}
        thumbColor="#fff"
      />
    </View>
  );
}

const SLIDER_WIDTH = scale(280);
function QualitySlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_evt, gestureState) => {
          const x = Math.max(
            0,
            Math.min(SLIDER_WIDTH, gestureState.moveX - SLIDER_X_OFFSET),
          );
          const pct = Math.round((x / SLIDER_WIDTH) * 100);
          onChange(pct);
        },
      }),
    [onChange],
  );
  return (
    <View style={styles.sliderTrack} {...panResponder.panHandlers}>
      <View style={[styles.sliderFill, { width: `${value}%` }]} />
      <View style={[styles.sliderThumb, { left: `${value}%` }]} />
    </View>
  );
}

const SLIDER_X_OFFSET = scale(20);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scroll: { flex: 1 },
  emptyState: {
    flex: 1,
    backgroundColor: c.background,
  },
  emptyText: {
    color: c.textMuted,
    fontSize: moderateScale(14),
    textAlign: "center",
    marginTop: verticalScale(40),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
  },
  headerTitle: {
    color: c.text,
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  previewBox: {
    marginHorizontal: scale(16),
    height: verticalScale(180),
    borderRadius: scale(10),
    backgroundColor: c.background,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  previewPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  playButtonWrap: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -scale(20),
    marginLeft: -scale(20),
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: c.text,
    justifyContent: "center",
    alignItems: "center",
  },
  durationLabel: {
    position: "absolute",
    bottom: verticalScale(10),
    left: scale(12),
    color: c.text,
    fontSize: moderateScale(12),
  },
  filenameLabel: {
    position: "absolute",
    bottom: verticalScale(10),
    right: scale(12),
    color: c.textMuted,
    fontSize: moderateScale(12),
  },
  sectionLabel: {
    color: "#777",
    fontSize: moderateScale(11),
    letterSpacing: 0.5,
    marginTop: verticalScale(18),
    marginBottom: verticalScale(8),
    marginHorizontal: scale(16),
  },
  sectionLabelInline: {
    color: "#777",
    fontSize: moderateScale(11),
    letterSpacing: 0.5,
  },
  pillRow: {
    flexDirection: "row",
    marginHorizontal: scale(16),
    gap: scale(8),
  },
  pill: {
    flex: 1,
    paddingVertical: verticalScale(10),
    borderRadius: scale(8),
    backgroundColor: c.card,
    alignItems: "center",
  },
  pillActive: { backgroundColor: c.accent },
  pillText: {
    color: c.textMuted,
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  pillTextActive: { color: c.accentOn },
  qualityHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: scale(16),
    marginTop: verticalScale(18),
  },
  qualityValue: { color: c.text, fontSize: moderateScale(12) },
  sliderTrack: {
    height: verticalScale(4),
    backgroundColor: c.border,
    borderRadius: 2,
    marginHorizontal: scale(16),
    marginTop: verticalScale(10),
    justifyContent: "center",
  },
  sliderFill: {
    height: verticalScale(4),
    backgroundColor: c.accent,
    borderRadius: 2,
  },
  sliderThumb: {
    position: "absolute",
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    backgroundColor: c.accent,
    marginLeft: -scale(7),
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222",
  },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: scale(10) },
  toggleLabel: { color: "#eee", fontSize: moderateScale(14) },
  estimateBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(245,197,24,0.12)",
    marginHorizontal: scale(16),
    marginTop: verticalScale(16),
    padding: scale(14),
    borderRadius: scale(8),
  },
  estimateLabel: { color: "#999", fontSize: moderateScale(11) },
  estimateValue: {
    color: c.accent,
    fontSize: moderateScale(15),
    fontWeight: "700",
    marginTop: 2,
  },
  exportButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scale(8),
    backgroundColor: c.accent,
    marginHorizontal: scale(16),
    marginTop: verticalScale(18),
    paddingVertical: verticalScale(14),
    borderRadius: scale(10),
  },
  exportButtonText: {
    color: c.accentOn,
    fontWeight: "700",
    fontSize: moderateScale(14),
  },
  errorText: {
    color: "#ff5c5c",
    textAlign: "center",
    marginTop: verticalScale(8),
    marginHorizontal: scale(16),
    fontSize: moderateScale(12),
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    zIndex: 20,
  },
  sheetCard: {
    backgroundColor: c.card,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    padding: scale(24),
    alignItems: "center",
  },
  sheetIconWrap: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: c.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(14),
  },
  sheetTitle: {
    color: c.text,
    fontSize: moderateScale(18),
    fontWeight: "700",
  },
  sheetSubtitle: {
    color: "#999",
    fontSize: moderateScale(12),
    marginTop: verticalScale(6),
    marginBottom: verticalScale(20),
  },
  sheetPrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(6),
    backgroundColor: c.accent,
    width: "100%",
    paddingVertical: verticalScale(14),
    borderRadius: scale(10),
    marginBottom: verticalScale(10),
  },
  sheetPrimaryText: {
    color: c.accentOn,
    fontWeight: "700",
    fontSize: moderateScale(14),
  },
  sheetSecondaryButton: { paddingVertical: verticalScale(10) },
  sheetSecondaryText: { color: c.textMuted, fontSize: moderateScale(13) },
});
}
let styles = makeStyles(darkColors);

