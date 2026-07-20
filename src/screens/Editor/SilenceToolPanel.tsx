/**
 * Rough cut panel — opt-in silence and/or filler removal.
 * Nothing runs until the user taps Apply.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Slider from '@react-native-community/slider';
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

export type RoughCutChoices = {
  removeSilence: boolean;
  removeFillers: boolean;
  minSilenceMs: number;
};

interface SilenceToolPanelProps {
  visible: boolean;
  onApply: (choices: RoughCutChoices) => Promise<{
    pieces: number;
    removedMs: number;
    silenceCount: number;
    fillerCount: number;
  }>;
  onClose: () => void;
}

function formatMs(ms: number) {
  const s = Math.max(0, Math.round(ms / 100) / 10);
  return s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${s}s`;
}

export default function SilenceToolPanel({
  visible,
  onApply,
  onClose,
}: SilenceToolPanelProps) {
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

  const [removeSilence, setRemoveSilence] = useState(true);
  const [removeFillers, setRemoveFillers] = useState(false);
  const [minSilenceMs, setMinSilenceMs] = useState(500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    pieces: number;
    removedMs: number;
    silenceCount: number;
    fillerCount: number;
  } | null>(null);

  if (!visible) return null;

  const handleApply = async () => {
    if (loading) return;
    if (!removeSilence && !removeFillers) {
      setError('Turn on at least one option.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      const r = await onApply({ removeSilence, removeFillers, minSilenceMs });
      setResult(r);
    } catch (e: any) {
      setError(e?.message ?? 'Rough cut failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Rough cut</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        Choose what to cut — nothing changes until you tap Apply. Needs an
        uploaded clip URL.
      </Text>

      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>Remove silence</Text>
          <Text style={styles.toggleHint}>Long pauses (FFmpeg, no API key)</Text>
        </View>
        <Switch
          value={removeSilence}
          onValueChange={setRemoveSilence}
          trackColor={{ false: COLORS.border, true: COLORS.yellow }}
          thumbColor="#fff"
          disabled={loading}
        />
      </View>

      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>Remove fillers</Text>
          <Text style={styles.toggleHint}>um / ah / like / you know (needs Groq)</Text>
        </View>
        <Switch
          value={removeFillers}
          onValueChange={setRemoveFillers}
          trackColor={{ false: COLORS.border, true: COLORS.yellow }}
          thumbColor="#fff"
          disabled={loading}
        />
      </View>

      {removeSilence && (
        <>
          <Text style={styles.sliderLabel}>
            Cut pauses longer than {Math.round(minSilenceMs)}ms
          </Text>
          <Slider
            minimumValue={300}
            maximumValue={2000}
            step={50}
            value={minSilenceMs}
            onValueChange={setMinSilenceMs}
            minimumTrackTintColor={COLORS.textSecondary}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.yellow}
            disabled={loading}
          />
        </>
      )}

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={COLORS.yellow} />
          <Text style={styles.loadingText}>
            {removeFillers ? 'Transcribing + detecting…' : 'Detecting silence…'}
          </Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.primaryBtn} onPress={handleApply}>
          <Ionicons name="flash" size={scale(16)} color={COLORS.background} />
          <Text style={styles.primaryBtnText}>Apply rough cut</Text>
        </TouchableOpacity>
      )}

      {result && !loading && (
        <Text style={styles.success}>
          {result.silenceCount > 0
            ? `${result.silenceCount} pause${result.silenceCount === 1 ? '' : 's'}`
            : null}
          {result.silenceCount > 0 && result.fillerCount > 0 ? ' · ' : null}
          {result.fillerCount > 0
            ? `${result.fillerCount} filler${result.fillerCount === 1 ? '' : 's'}`
            : null}
          {' · '}
          {formatMs(result.removedMs)} removed → {result.pieces} clip
          {result.pieces === 1 ? '' : 's'}.
        </Text>
      )}
      {error && !loading && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function __makeStyles() {
  return StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(18),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(8),
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  hint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(12),
    lineHeight: moderateScale(17),
    marginBottom: verticalScale(12),
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: verticalScale(10),
    paddingVertical: verticalScale(4),
  },
  toggleTitle: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  toggleHint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    marginTop: 2,
  },
  sliderLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    marginBottom: verticalScale(4),
  },
  primaryBtn: {
    marginTop: verticalScale(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: COLORS.yellow,
    borderRadius: scale(10),
    paddingVertical: verticalScale(12),
  },
  primaryBtnText: {
    color: COLORS.background,
    fontSize: moderateScale(14),
    fontWeight: '800',
  },
  loadingRow: {
    marginTop: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(13),
  },
  success: {
    marginTop: verticalScale(10),
    color: '#34D399',
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  error: {
    marginTop: verticalScale(10),
    color: COLORS.danger,
    fontSize: moderateScale(12),
  },
});
}
let styles = __makeStyles();

