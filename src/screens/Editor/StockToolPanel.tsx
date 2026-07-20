/**
 * In-app stock library — music, SFX, and B-roll footage (Epidemic-style).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useAppPalette } from '../Contexts/ThemeContext';
import {
  MUSIC_LIBRARY,
  SFX_LIBRARY,
  FOOTAGE_LIBRARY,
  LibraryTrack,
} from '../services/musicLibrary';

let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  border: '#2A2A2E',
};

type Tab = 'music' | 'sfx' | 'footage';

interface StockToolPanelProps {
  visible: boolean;
  playheadMs: number;
  busy?: boolean;
  onAddAudio: (url: string, durationMs: number, startMs: number, title: string) => void;
  onAddFootage: (track: LibraryTrack) => void;
  onClose: () => void;
}

function durationMsFromLabel(label: string, fallback: number): number {
  if (fallback > 0) return fallback;
  const parts = label.split(':').map(Number);
  return parts.length === 2 ? (parts[0] * 60 + parts[1]) * 1000 : 60_000;
}

export default function StockToolPanel({
  visible,
  playheadMs,
  busy = false,
  onAddAudio,
  onAddFootage,
  onClose,
}: StockToolPanelProps) {
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

  const [tab, setTab] = useState<Tab>('music');
  if (!visible) return null;

  const rows =
    tab === 'music' ? MUSIC_LIBRARY : tab === 'sfx' ? SFX_LIBRARY : FOOTAGE_LIBRARY;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Stock</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {([
          ['music', 'Music'],
          ['sfx', 'SFX'],
          ['footage', 'Footage'],
        ] as const).map(([id, label]) => (
          <TouchableOpacity
            key={id}
            style={[styles.tab, tab === id && styles.tabActive]}
            onPress={() => setTab(id)}
          >
            <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {busy ? (
        <ActivityIndicator color={COLORS.yellow} style={{ marginVertical: verticalScale(24) }} />
      ) : (
        <ScrollView style={{ maxHeight: verticalScale(220) }}>
          <Text style={styles.hint}>
            {tab === 'footage'
              ? 'Tap to append B-roll on the timeline.'
              : 'Tap to drop a track at the playhead.'}
          </Text>
          {rows.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.libRow}
              onPress={() => {
                if (t.kind === 'footage') {
                  onAddFootage(t);
                } else {
                  onAddAudio(
                    t.url,
                    durationMsFromLabel(t.durationLabel, t.durationMs ?? 0),
                    Math.round(playheadMs),
                    t.title
                  );
                }
              }}
            >
              <Ionicons
                name={
                  t.kind === 'footage'
                    ? 'film-outline'
                    : t.kind === 'sfx'
                      ? 'flash-outline'
                      : 'musical-note'
                }
                size={scale(16)}
                color={COLORS.textSecondary}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.libTitle}>{t.title}</Text>
                <Text style={styles.libMeta}>
                  {t.mood} · {t.durationLabel}
                </Text>
              </View>
              <Ionicons name="add" size={scale(18)} color={COLORS.textPrimary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function __makeStyles() {
  return StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: scale(16),
    borderTopRightRadius: scale(16),
    paddingBottom: verticalScale(16),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  tabRow: {
    flexDirection: 'row',
    gap: scale(8),
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
  },
  tab: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    borderRadius: scale(14),
    backgroundColor: COLORS.surface,
  },
  tabActive: { backgroundColor: COLORS.yellow },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  tabTextActive: { color: '#13151c' },
  hint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    paddingHorizontal: scale(16),
    marginTop: verticalScale(10),
    marginBottom: verticalScale(6),
  },
  libRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  libTitle: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(13),
    fontWeight: '500',
  },
  libMeta: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    marginTop: 2,
  },
});
}
let styles = __makeStyles();

