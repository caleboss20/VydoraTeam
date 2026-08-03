/**
 * Episode Factory — turn one interview into a publish pack.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";
import { useAppPalette } from "../Contexts/ThemeContext";
import { TOOL_SHEET_MAX, TOOL_SHEET_BODY } from "./toolSheetLayout";
import type { EpisodeFactoryPlan } from "../services/episodeFactoryService";

interface EpisodeFactoryPanelProps {
  visible: boolean;
  seriesTitle?: string;
  busy?: boolean;
  onBuildPlan: () => Promise<EpisodeFactoryPlan>;
  onApplyPack: (plan: EpisodeFactoryPlan) => Promise<{
    added: number;
    message: string;
  }>;
  onExportReel: () => void;
  onClose: () => void;
}

export default function EpisodeFactoryPanel({
  visible,
  seriesTitle = "Podcast",
  busy = false,
  onBuildPlan,
  onApplyPack,
  onExportReel,
  onClose,
}: EpisodeFactoryPanelProps) {
  const p = useAppPalette();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<EpisodeFactoryPlan | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  if (!visible) return null;

  const runBuild = async () => {
    if (loading || busy) return;
    try {
      setLoading(true);
      setError(null);
      setDoneMsg(null);
      const next = await onBuildPlan();
      setPlan(next);
      if (!next.coldOpen && next.hooks.length === 0) {
        setError(next.summary);
      }
    } catch (e: any) {
      setError(e?.message ?? "Could not build episode pack.");
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  const runApply = async () => {
    if (!plan || applying) return;
    try {
      setApplying(true);
      setError(null);
      const r = await onApplyPack(plan);
      setDoneMsg(r.message);
    } catch (e: any) {
      setError(e?.message ?? "Could not apply pack.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: p.background, maxHeight: TOOL_SHEET_MAX },
      ]}
    >
      <LinearGradient
        colors={["rgba(46,230,214,0.18)", "rgba(245,197,24,0.12)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.badge}>
              <Ionicons name="rocket" size={scale(14)} color="#0B0D13" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: p.textPrimary }]}>
                Episode Factory
              </Text>
              <Text style={[styles.subtitle, { color: p.textSecondary }]}>
                One interview → cold open + Shorts + cards
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="checkmark" size={scale(22)} color={p.yellow} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ maxHeight: TOOL_SHEET_BODY }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.hint, { color: p.textSecondary }]}>
          Runs on your current interview clip. Finds the punchiest moments,
          builds a Netflix-style cold open, then stacks vertical hooks you can
          post all week.
        </Text>

        <View style={styles.pipeline}>
          {["Cold open", "Intro", "Interview", "Shorts", "Outro"].map(
            (label, i) => (
              <View key={label} style={styles.pipeItem}>
                <View
                  style={[
                    styles.pipeDot,
                    {
                      backgroundColor:
                        i === 0
                          ? "#2EE6D6"
                          : i === 1 || i === 4
                            ? p.yellow
                            : "rgba(255,255,255,0.2)",
                    },
                  ]}
                />
                <Text style={[styles.pipeLabel, { color: p.textSecondary }]}>
                  {label}
                </Text>
              </View>
            )
          )}
        </View>

        <TouchableOpacity
          style={styles.magicBtn}
          disabled={loading || busy}
          onPress={runBuild}
        >
          <LinearGradient
            colors={["#2EE6D6", "#F5C518"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.magicGrad}
          >
            {loading ? (
              <ActivityIndicator color="#0B0D13" />
            ) : (
              <>
                <Ionicons name="sparkles" size={scale(18)} color="#0B0D13" />
                <Text style={styles.magicText}>
                  Build pack for “{seriesTitle}”
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {plan ? (
          <View style={styles.planBox}>
            <Text style={[styles.section, { color: p.textPrimary }]}>
              Your pack
            </Text>
            <Text style={[styles.summary, { color: "#2EE6D6" }]}>
              {plan.summary}
            </Text>

            {plan.coldOpen ? (
              <View style={styles.rowCard}>
                <Ionicons name="flash" size={scale(16)} color="#2EE6D6" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Cold open</Text>
                  <Text
                    style={[styles.rowSub, { color: p.textSecondary }]}
                    numberOfLines={2}
                  >
                    {plan.coldOpen.hook}
                  </Text>
                </View>
                <Text style={styles.dur}>
                  {Math.round(
                    (plan.coldOpen.endMs - plan.coldOpen.startMs) / 1000
                  )}
                  s
                </Text>
              </View>
            ) : null}

            {plan.hooks.map((h, i) => (
              <View key={`${h.startMs}-${i}`} style={styles.rowCard}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={scale(16)}
                  color={p.yellow}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    Short {i + 1}: {h.title}
                  </Text>
                  <Text
                    style={[styles.rowSub, { color: p.textSecondary }]}
                    numberOfLines={2}
                  >
                    {h.hook}
                  </Text>
                </View>
                <Text style={styles.dur}>
                  {Math.round((h.endMs - h.startMs) / 1000)}s
                </Text>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: p.yellow }]}
              disabled={applying || (!plan.coldOpen && plan.hooks.length === 0)}
              onPress={runApply}
            >
              {applying ? (
                <ActivityIndicator color="#0B0D13" />
              ) : (
                <>
                  <Ionicons name="layers" size={scale(16)} color="#0B0D13" />
                  <Text style={styles.primaryBtnText}>
                    Drop pack on timeline
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: "#2EE6D6" }]}
              onPress={onExportReel}
            >
              <Ionicons
                name="share-outline"
                size={scale(16)}
                color="#0B0D13"
              />
              <Text style={styles.primaryBtnText}>
                Export podcast reel (9:16)
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {doneMsg ? (
          <Text style={[styles.ok, { color: "#2EE6D6" }]}>{doneMsg}</Text>
        ) : null}
        {error ? (
          <Text style={[styles.err, { color: "#FF6B6B" }]}>{error}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopLeftRadius: scale(18),
    borderTopRightRadius: scale(18),
    overflow: "hidden",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,230,214,0.3)",
  },
  hero: {
    paddingHorizontal: scale(14),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(10),
  },
  header: { flexDirection: "row", alignItems: "center" },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  badge: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(8),
    backgroundColor: "#2EE6D6",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: moderateScale(16), fontWeight: "800" },
  subtitle: { fontSize: moderateScale(11), marginTop: 1 },
  body: {
    paddingHorizontal: scale(14),
    paddingBottom: verticalScale(22),
    gap: verticalScale(10),
  },
  hint: {
    fontSize: moderateScale(12),
    lineHeight: moderateScale(17),
  },
  pipeline: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: verticalScale(6),
  },
  pipeItem: { alignItems: "center", gap: 4, flex: 1 },
  pipeDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
  },
  pipeLabel: { fontSize: moderateScale(9), fontWeight: "600" },
  magicBtn: { borderRadius: scale(14), overflow: "hidden" },
  magicGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(12),
  },
  magicText: {
    color: "#0B0D13",
    fontWeight: "900",
    fontSize: moderateScale(13),
    flexShrink: 1,
  },
  planBox: { gap: verticalScale(8), marginTop: verticalScale(4) },
  section: { fontSize: moderateScale(14), fontWeight: "800" },
  summary: { fontSize: moderateScale(12), fontWeight: "600" },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: scale(12),
    padding: scale(12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  rowTitle: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: moderateScale(12),
  },
  rowSub: { fontSize: moderateScale(11), marginTop: 2 },
  dur: {
    color: "rgba(255,255,255,0.45)",
    fontWeight: "700",
    fontSize: moderateScale(11),
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    borderRadius: scale(12),
    paddingVertical: verticalScale(13),
    marginTop: verticalScale(2),
  },
  primaryBtnText: {
    color: "#0B0D13",
    fontWeight: "800",
    fontSize: moderateScale(13),
  },
  ok: { fontSize: moderateScale(12), fontWeight: "600" },
  err: { fontSize: moderateScale(12), fontWeight: "600" },
});
