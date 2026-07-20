/**
 * Stabilize + 9:16 auto-reframe — opt-in. Analyze runs only when user taps.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Slider from '@react-native-community/slider';
import type { AutoReframeSettings, StabilizeSettings } from '../types';
import { useAppPalette } from '../Contexts/ThemeContext';


let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  danger: '#E85D5D',
  teal: '#34D399',
};

interface StabilizeToolPanelProps {
  visible: boolean;
  stabilize?: StabilizeSettings;
  autoReframe?: AutoReframeSettings;
  onStabilizeChange: (s: StabilizeSettings) => void;
  /** Runs motion/face-energy analysis; resolves with keyframe count. */
  onAnalyzeReframe: () => Promise<{ count: number; message: string }>;
  onDisableReframe: () => void;
  onClose: () => void;
}

export default function StabilizeToolPanel({
  visible,
  stabilize,
  autoReframe,
  onStabilizeChange,
  onAnalyzeReframe,
  onDisableReframe,
  onClose,
}: StabilizeToolPanelProps) {
  const __palette = useAppPalette();
  COLORS = {
    ...COLORS,
    background: __palette.background,
    surface: __palette.surface,
    border: __palette.border,
    yellow: __palette.yellow,
    textPrimary: __palette.textPrimary,
    textSecondary: __palette.textSecondary,
    textMuted: __palette.textMuted,
  };
  styles = __makeStyles();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  if (!visible) return null;

  const stabOn = !!stabilize?.enabled;
  const reframeOn = !!autoReframe?.enabled;
  const shakiness = stabilize?.shakiness ?? 0.55;

  const handleAnalyze = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setError(null);
      setStatus(null);
      const r = await onAnalyzeReframe();
      setStatus(`${r.message} (${r.count} keys)`);
    } catch (e: any) {
      setError(e?.message ?? 'Auto-reframe failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="phone-landscape-outline" size={scale(16)} color={COLORS.yellow} />
          <Text style={styles.title}>Stabilize / Reframe</Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        Smooth handheld shake on export. Auto-reframe tracks the subject into
        9:16 — nothing runs until you tap Analyze.
      </Text>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Stabilize</Text>
          <Text style={styles.rowHint}>Deshake warp — baked on export</Text>
        </View>
        <Switch
          value={stabOn}
          onValueChange={(enabled) =>
            onStabilizeChange({ enabled, shakiness })
          }
          trackColor={{ false: COLORS.border, true: COLORS.yellow }}
          thumbColor="#fff"
        />
      </View>
      {stabOn && (
        <>
          <Text style={styles.sliderLabel}>
            Strength {Math.round(shakiness * 100)}%
          </Text>
          <Slider
            minimumValue={0.15}
            maximumValue={1}
            step={0.05}
            value={shakiness}
            onValueChange={(v) => onStabilizeChange({ enabled: true, shakiness: v })}
            minimumTrackTintColor={COLORS.textSecondary}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.yellow}
          />
        </>
      )}

      <View style={[styles.row, { marginTop: verticalScale(10) }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Auto-reframe 9:16</Text>
          <Text style={styles.rowHint}>
            {reframeOn
              ? `${autoReframe?.keyframes?.length ?? 0} track keys`
              : 'Follow subject for Shorts / Reels'}
          </Text>
        </View>
        {reframeOn ? (
          <TouchableOpacity onPress={onDisableReframe} hitSlop={8}>
            <Text style={styles.off}>Off</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={COLORS.yellow} />
          <Text style={styles.loadingText}>Tracking subject…</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.primaryBtn} onPress={handleAnalyze}>
          <Ionicons name="scan-outline" size={scale(16)} color={COLORS.background} />
          <Text style={styles.primaryBtnText}>
            {reframeOn ? 'Re-analyze 9:16' : 'Analyze & reframe'}
          </Text>
        </TouchableOpacity>
      )}

      {status && !loading && <Text style={styles.success}>{status}</Text>}
      {error && !loading && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function __makeStyles() {
  return StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(16),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  title: { color: COLORS.textPrimary, fontSize: moderateScale(15), fontWeight: '700' },
  hint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    lineHeight: moderateScale(16),
    marginBottom: verticalScale(12),
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  rowTitle: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  rowHint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    marginTop: 2,
  },
  sliderLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    marginTop: verticalScale(8),
  },
  off: { color: COLORS.danger, fontSize: moderateScale(12), fontWeight: '700' },
  primaryBtn: {
    marginTop: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: COLORS.yellow,
    paddingVertical: verticalScale(11),
    borderRadius: scale(12),
  },
  primaryBtnText: {
    color: COLORS.background,
    fontSize: moderateScale(13),
    fontWeight: '700',
  },
  loadingRow: {
    marginTop: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  loadingText: { color: COLORS.textSecondary, fontSize: moderateScale(12) },
  success: {
    marginTop: verticalScale(8),
    color: COLORS.teal,
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  error: {
    marginTop: verticalScale(8),
    color: COLORS.danger,
    fontSize: moderateScale(12),
  },
});
}
let styles = __makeStyles();

