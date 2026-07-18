import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Switch,
  ScrollView,
  PanResponder,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import * as Sharing from "expo-sharing";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";
import { useVideoProject } from "../Contexts/VideoProjectContext";
import { useAuth } from "../Contexts/Authcontext";
import { exportService } from "../services/exportService";
import { Export } from "../types";

type Resolution = "720p" | "1080p" | "4K";
type Format = "MP4" | "MOV" | "WebM";
// Rough bitrate-per-pixel multipliers, just enough to make the size
// estimate move sensibly when resolution/format/quality change.
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
  const confettiRef = useRef<any>(null);
  const { currentVideoProject } = useVideoProject();
  const [resolution, setResolution] = useState<Resolution>("1080p");
  const [format, setFormat] = useState<Format>("MP4");
  const [quality, setQuality] = useState(80);
  const [includeTextOverlays, setIncludeTextOverlays] = useState(true);
  const [includeFilters, setIncludeFilters] = useState(true);
  const [includeWatermark, setIncludeWatermark] = useState(false);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);

  const { token } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [completedExport, setCompletedExport] = useState<Export | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!currentVideoProject || !token) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    try {
      const result = await exportService.createExport(
        currentVideoProject,
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
      confettiRef.current?.start();

      setTimeout(() => setShowSuccessSheet(true), 1800);

      confettiRef.current?.start();
    } catch (e: any) {
      setExportError(e.message ?? "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  // ── Derived display values ──
  const durationLabel = currentVideoProject
    ? formatDuration(currentVideoProject.totalDurationMs)
    : "0:00";
  const filename = currentVideoProject
    ? `${currentVideoProject.title}.mp4`
    : "Project.mp4";
  const posterUri =
    currentVideoProject?.coverThumbnailUri ??
    currentVideoProject?.clips[0]?.thumbnailUri;
  // ── Estimated size/time — recompute only when an input actually changes ──
  const { estimatedSizeMb, estimatedSeconds } = useMemo(() => {
    if (!currentVideoProject)
      return { estimatedSizeMb: 0, estimatedSeconds: 0 };
    const durationSec = currentVideoProject.totalDurationMs / 1000;
    const qualityFactor = quality / 80; // 80% is our baseline
    const baseMbPerSec = 1.8; // baseline MB/sec at 720p, MP4, 80% quality
    const sizeMb =
      durationSec *
      baseMbPerSec *
      RESOLUTION_WEIGHT[resolution] *
      FORMAT_WEIGHT[format] *
      qualityFactor;
    const seconds = Math.max(5, Math.round(sizeMb / 4)); // rough export-speed guess
    return { estimatedSizeMb: Math.round(sizeMb), estimatedSeconds: seconds };
  }, [currentVideoProject, resolution, format, quality]);
  if (!currentVideoProject) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No project loaded</Text>
      </View>
    );
  }
  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: verticalScale(40) }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Ionicons name="close" size={scale(24)} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Export</Text>
          <View style={{ width: scale(24) }} />
        </View>
        {/* Preview box */}
        <View style={styles.previewBox}>
          {currentVideoProject.clips[0] ? (
            <Video
              source={{ uri: currentVideoProject.clips[0].uri }}
              posterSource={posterUri ? { uri: posterUri } : undefined}
              usePoster={!!posterUri}
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
        {/* Resolution */}
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
        {/* Format */}
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
        {/* Quality slider */}
        <View style={styles.qualityHeaderRow}>
          <Text style={styles.sectionLabel}>QUALITY</Text>
          <Text style={styles.qualityValue}>{quality}%</Text>
        </View>
        <QualitySlider value={quality} onChange={setQuality} />
        {/* Include toggles */}
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
        {/* Estimate banner */}
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

        {/* Export button */}
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

      {/**for the success modal sheet  */}
      {showSuccessSheet && completedExport && (
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetIconWrap}>
              <Ionicons name="checkmark" size={scale(28)} color="#111" />
            </View>
            <Text style={styles.sheetTitle}>Export complete</Text>
            <Text style={styles.sheetSubtitle}>
              {completedExport.title}.{completedExport.format.toLowerCase()} ·{" "}
              {completedExport.sizeMb} MB
            </Text>
          
            <TouchableOpacity
            style={styles.sheetPrimaryButton}
            onPress={async () => {
                try{
                    const available=await Sharing.isAvailableAsync();
                    if(available&& completedExport.fileUrl){
                        await Sharing.shareAsync(completedExport.fileUrl);
                    }
                    else{
                        console.log('sharing not available on this device');
                    }
                }catch(e){
                    console.log('share failed',e);
                }
                setShowSuccessSheet(false);
            }}
            >
  <Ionicons name="share-outline" size={scale(16)} color="#111" />
  <Text style={styles.sheetPrimaryText}>Share</Text>
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

      {/*for the confetti*/}
      {completedExport && (
        <ConfettiCannon
          ref={confettiRef}
          count={80}
          origin={{ x: scale(160), y: 0 }}
          fallSpeed={3000}
          explosionSpeed={350}
          fadeOut
          colors={["#F5C518", "#ffffff"]}
          //   autoStart={false}
        />
      )}
    </>
  );
}
// ─── Small subcomponents ──────────────────────────────────────────────
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
// Approximate left padding of the slider track from screen edge, used to
// convert an absolute touch X into a position relative to the track.

const SLIDER_X_OFFSET = scale(20);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111111" },
  emptyState: {
    flex: 1,
    backgroundColor: "#111111",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: { color: "#666", fontSize: moderateScale(14) },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
  },
  headerTitle: {
    color: "#fff",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  previewBox: {
    marginHorizontal: scale(16),
    height: verticalScale(180),
    borderRadius: scale(10),
    backgroundColor: "#000",
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
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  durationLabel: {
    position: "absolute",
    bottom: verticalScale(10),
    left: scale(12),
    color: "#fff",
    fontSize: moderateScale(12),
  },
  filenameLabel: {
    position: "absolute",
    bottom: verticalScale(10),
    right: scale(12),
    color: "#ccc",
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
  pillRow: {
    flexDirection: "row",
    marginHorizontal: scale(16),
    gap: scale(8),
  },
  pill: {
    flex: 1,
    paddingVertical: verticalScale(10),
    borderRadius: scale(8),
    backgroundColor: "#1c1c1c",
    alignItems: "center",
  },
  pillActive: { 
    backgroundColor: "#F5C518" },
  pillText: { color: "#ccc",
     fontSize: moderateScale(13), fontWeight: "600" },
  pillTextActive: { color: "#111" },
  qualityHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: scale(16),
    marginTop: verticalScale(18),
  },
  qualityValue: { color: "#fff", fontSize: moderateScale(12) },
  sliderTrack: {
    height: verticalScale(4),
    backgroundColor: "#333",
    borderRadius: 2,
    marginHorizontal: scale(16),
    marginTop: verticalScale(10),
    justifyContent: "center",
  },
  sliderFill: {
    height: verticalScale(4),
    backgroundColor: "#F5C518",
    borderRadius: 2,
  },
  sliderThumb: {
    position: "absolute",
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    backgroundColor: "#F5C518",
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
    color: "#F5C518",
    fontSize: moderateScale(15),
    fontWeight: "700",
    marginTop: 2,
  },
  exportButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scale(8),
    backgroundColor: "#F5C518",
    marginHorizontal: scale(16),
    marginTop: verticalScale(18),
    paddingVertical: verticalScale(14),
    borderRadius: scale(10),
  },
  exportButtonText: {
    color: "#111",
    fontWeight: "700",
    fontSize: moderateScale(14),
  },
  errorText: {
    color: "#ff5c5c",
    textAlign: "center",
    marginTop: verticalScale(8),
    fontSize: moderateScale(12),
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    zIndex: 20,
  },
  sheetCard: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    padding: scale(24),
    alignItems: "center",
  },
  sheetIconWrap: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: "#F5C518",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(14),
  },
  sheetTitle: {
    color: "#fff",
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
    backgroundColor: "#F5C518",
    width: "100%",
    paddingVertical: verticalScale(14),
    borderRadius: scale(10),
    marginBottom: verticalScale(10),
  },
  sheetPrimaryText: {
    color: "#111",
    fontWeight: "700",
    fontSize: moderateScale(14),
  },
  sheetSecondaryButton: { paddingVertical: verticalScale(10) },
  sheetSecondaryText: { color: "#888", fontSize: moderateScale(13) },
});
