/**
 * Beat markers panel — drop / clear snap points for CapCut-style cut sync.
 * Optional "Detect beats" is opt-in; nothing auto-runs on open.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useAppPalette } from '../Contexts/ThemeContext';


let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  danger: '#E85D5D',
};

function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

interface BeatsToolPanelProps {
  visible: boolean;
  markers: number[];
  playheadMs: number;
  onAddAtPlayhead: () => void;
  onRemove: (timeMs: number) => void;
  onClear: () => void;
  onClose: () => void;
  /** Opt-in auto-detect; resolves with how many beats were added. */
  onDetectBeats?: () => Promise<number>;
  detecting?: boolean;
  /** Split active clip on every marker inside it. */
  onAutoCut?: () => void;
}

export default function BeatsToolPanel({
  visible,
  markers,
  playheadMs,
  onAddAtPlayhead,
  onRemove,
  onClear,
  onClose,
  onDetectBeats,
  detecting = false,
  onAutoCut,
}: BeatsToolPanelProps) {
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

  const [error, setError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<number | null>(null);

  if (!visible) return null;

  const handleDetect = async () => {
    if (!onDetectBeats || detecting) return;
    try {
      setError(null);
      setLastAdded(null);
      const n = await onDetectBeats();
      setLastAdded(n);
    } catch (e: any) {
      setError(e?.message ?? 'Beat detection failed.');
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Beats</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        Drop markers on the beat. Split snaps to the nearest marker (±0.35s).
      </Text>
      <TouchableOpacity
        style={[styles.primaryBtn, detecting && styles.btnDisabled]}
        onPress={onAddAtPlayhead}
        disabled={detecting}
      >
        <Ionicons name="musical-note" size={scale(16)} color={COLORS.background} />
        <Text style={styles.primaryBtnText}>Mark at {formatMs(playheadMs)}</Text>
      </TouchableOpacity>

      {onDetectBeats && (
        detecting ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.yellow} />
            <Text style={styles.loadingText}>Detecting beats…</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleDetect}>
            <Ionicons name="pulse-outline" size={scale(16)} color={COLORS.textPrimary} />
            <Text style={styles.secondaryBtnText}>Detect beats</Text>
          </TouchableOpacity>
        )
      )}

      {onAutoCut && markers.length > 0 && (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onAutoCut}
          disabled={detecting}
        >
          <Ionicons name="cut-outline" size={scale(16)} color={COLORS.textPrimary} />
          <Text style={styles.secondaryBtnText}>Auto beat-cut</Text>
        </TouchableOpacity>
      )}

      {lastAdded !== null && !detecting && (
        <Text style={styles.success}>
          Added {lastAdded} beat{lastAdded === 1 ? '' : 's'}.
        </Text>
      )}
      {error && !detecting && <Text style={styles.error}>{error}</Text>}

      {markers.length > 0 && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {markers.map((m) => (
              <TouchableOpacity key={m} style={styles.chip} onPress={() => onRemove(m)}>
                <Text style={styles.chipText}>{formatMs(m)}</Text>
                <Ionicons name="close" size={scale(12)} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.clearBtn} onPress={onClear} disabled={detecting}>
            <Text style={styles.clearText}>Clear all markers</Text>
          </TouchableOpacity>
        </>
      )}
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
  title: { color: COLORS.textPrimary, fontSize: moderateScale(15), fontWeight: '700' },
  hint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    marginBottom: verticalScale(10),
  },
  primaryBtn: {
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
  secondaryBtn: {
    marginTop: verticalScale(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: verticalScale(11),
    borderRadius: scale(12),
  },
  secondaryBtnText: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  btnDisabled: { opacity: 0.5 },
  loadingRow: {
    marginTop: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(12),
  },
  success: {
    marginTop: verticalScale(8),
    color: '#34D399',
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  error: {
    marginTop: verticalScale(8),
    color: COLORS.danger,
    fontSize: moderateScale(12),
  },
  chipRow: { gap: scale(8), marginTop: verticalScale(12) },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(14),
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: { color: COLORS.textPrimary, fontSize: moderateScale(11), fontWeight: '600' },
  clearBtn: { marginTop: verticalScale(10), alignItems: 'center' },
  clearText: { color: COLORS.danger, fontSize: moderateScale(12), fontWeight: '600' },
});
}
let styles = __makeStyles();

