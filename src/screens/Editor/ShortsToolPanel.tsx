/**
 * Shorts suggestions panel — opt-in Generate; never auto-runs on open.
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
import type { ShortSuggestion } from '../services/shortsService';
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

interface ShortsToolPanelProps {
  visible: boolean;
  /** User-tapped generate; parent calls shortsService and returns items. */
  onGenerate: () => Promise<ShortSuggestion[]>;
  onAdd: (suggestion: ShortSuggestion) => void;
  onClose: () => void;
}

export default function ShortsToolPanel({
  visible,
  onGenerate,
  onAdd,
  onClose,
}: ShortsToolPanelProps) {
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
  const [items, setItems] = useState<ShortSuggestion[]>([]);

  if (!visible) return null;

  const handleGenerate = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setError(null);
      const next = await onGenerate();
      setItems(next);
    } catch (e: any) {
      setError(e?.message ?? 'Could not suggest shorts.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Shorts</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        Find hook-worthy 15–60s moments. Nothing runs until you tap Generate.
      </Text>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={COLORS.yellow} />
          <Text style={styles.loadingText}>Scoring segments…</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.primaryBtn} onPress={handleGenerate}>
          <Ionicons name="flash" size={scale(16)} color={COLORS.background} />
          <Text style={styles.primaryBtnText}>
            {items.length > 0 ? 'Regenerate' : 'Generate suggestions'}
          </Text>
        </TouchableOpacity>
      )}

      {error && !loading && <Text style={styles.error}>{error}</Text>}

      {items.length > 0 && !loading && (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {items.map((s, i) => (
            <View key={`${s.startMs}-${s.endMs}-${i}`} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {s.title}
                </Text>
                <Text style={styles.score}>{s.score.toFixed(1)}</Text>
              </View>
              <Text style={styles.meta}>
                {formatMs(s.startMs)} – {formatMs(s.endMs)}
              </Text>
              {!!s.hook && (
                <Text style={styles.hook} numberOfLines={2}>
                  {s.hook}
                </Text>
              )}
              <TouchableOpacity style={styles.addBtn} onPress={() => onAdd(s)}>
                <Ionicons name="add-circle-outline" size={scale(16)} color={COLORS.textPrimary} />
                <Text style={styles.addBtnText}>Add to timeline</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
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
    maxHeight: verticalScale(340),
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
    lineHeight: moderateScale(16),
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingVertical: verticalScale(8),
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(12),
  },
  error: {
    marginTop: verticalScale(10),
    color: COLORS.danger,
    fontSize: moderateScale(12),
  },
  list: { marginTop: verticalScale(12) },
  card: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(12),
    padding: scale(12),
    marginBottom: verticalScale(8),
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: scale(8),
  },
  cardTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: moderateScale(13),
    fontWeight: '700',
  },
  score: {
    color: COLORS.yellow,
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  meta: {
    marginTop: verticalScale(4),
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
  },
  hook: {
    marginTop: verticalScale(6),
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    lineHeight: moderateScale(15),
  },
  addBtn: {
    marginTop: verticalScale(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  addBtnText: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
});
}
let styles = __makeStyles();

