/**
 * Music tool — multi-track bed + library picks, fade in/out, auto-duck under VO.
 * Yellow only on the primary selected chip / duck toggle when on.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Slider from '@react-native-community/slider';
import * as DocumentPicker from 'expo-document-picker';
import { createAudioPlayer } from 'expo-audio';
import { BackgroundMusic } from '../types';
import { MUSIC_LIBRARY, SFX_LIBRARY, FOOTAGE_LIBRARY } from '../services/musicLibrary';
import { musicAudibleMs } from '../services/BackgroundmusicService';
import { useAppPalette } from '../Contexts/ThemeContext';


let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  border: '#2A2A2E',
  danger: '#E85D5D',
};

interface MusicToolPanelProps {
  visible: boolean;
  tracks: BackgroundMusic[];
  selectedTrackId: string | null;
  playheadMs: number;
  onSelectTrack: (id: string | null) => void;
  onAddTrack: (uri: string, durationMs: number, startMs: number, title?: string) => void;
  onUpdateTrack: (trackId: string, changes: Partial<BackgroundMusic>) => void;
  onRemoveTrack: (trackId: string) => void;
  /** Optional — Stock footage append (also available under Stock tool). */
  onAddFootage?: (url: string, durationMs: number, title: string) => void;
  onClose: () => void;
}

export default function MusicToolPanel({
  visible,
  tracks,
  selectedTrackId,
  playheadMs,
  onSelectTrack,
  onAddTrack,
  onUpdateTrack,
  onRemoveTrack,
  onAddFootage,
  onClose,
}: MusicToolPanelProps) {
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

  const [tab, setTab] = useState<'tracks' | 'library'>('tracks');
  const selected =
    tracks.find((t) => (t.id ?? 'legacy') === selectedTrackId) ?? tracks[0] ?? null;
  const selectedId = selected ? selected.id ?? 'legacy' : null;

  if (!visible) return null;

  const pickFromDevice = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    const tempPlayer = createAudioPlayer(uri);
    setTimeout(() => {
      const durationMs = Math.max(1000, (tempPlayer.duration ?? 0) * 1000);
      onAddTrack(uri, durationMs, Math.round(playheadMs), result.assets[0].name);
      tempPlayer.remove();
      setTab('tracks');
    }, 300);
  };

  const pickLibrary = (url: string, title: string, durationLabel: string) => {
    // Library rows don't expose exact ms — approximate from label, refine later.
    const parts = durationLabel.split(':').map(Number);
    const durationMs =
      parts.length === 2 ? (parts[0] * 60 + parts[1]) * 1000 : 60_000;
    onAddTrack(url, durationMs, Math.round(playheadMs), title);
    setTab('tracks');
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Music</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {(['tracks', 'library'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'tracks' ? 'Tracks' : 'Library'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'library' ? (
        <ScrollView style={{ maxHeight: verticalScale(180) }}>
          <Text style={styles.section}>Music</Text>
          {MUSIC_LIBRARY.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.libRow}
              onPress={() => pickLibrary(t.url, t.title, t.durationLabel)}
            >
              <Ionicons name="musical-note" size={scale(16)} color={COLORS.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.libTitle}>{t.title}</Text>
                <Text style={styles.libMeta}>
                  {t.mood} · {t.durationLabel}
                </Text>
              </View>
              <Ionicons name="add" size={scale(18)} color={COLORS.textPrimary} />
            </TouchableOpacity>
          ))}
          <Text style={styles.section}>SFX</Text>
          {SFX_LIBRARY.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.libRow}
              onPress={() => pickLibrary(t.url, t.title, t.durationLabel)}
            >
              <Ionicons name="flash-outline" size={scale(16)} color={COLORS.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.libTitle}>{t.title}</Text>
                <Text style={styles.libMeta}>
                  {t.mood} · {t.durationLabel}
                </Text>
              </View>
              <Ionicons name="add" size={scale(18)} color={COLORS.textPrimary} />
            </TouchableOpacity>
          ))}
          {onAddFootage && (
            <>
              <Text style={styles.section}>Footage</Text>
              {FOOTAGE_LIBRARY.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.libRow}
                  onPress={() =>
                    onAddFootage(
                      t.url,
                      t.durationMs ?? 12_000,
                      t.title
                    )
                  }
                >
                  <Ionicons name="film-outline" size={scale(16)} color={COLORS.textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.libTitle}>{t.title}</Text>
                    <Text style={styles.libMeta}>
                      {t.mood} · {t.durationLabel}
                    </Text>
                  </View>
                  <Ionicons name="add" size={scale(18)} color={COLORS.textPrimary} />
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      ) : (
        <View>
          <TouchableOpacity style={styles.addBtn} onPress={pickFromDevice}>
            <Ionicons name="add-circle-outline" size={scale(18)} color={COLORS.textPrimary} />
            <Text style={styles.addBtnText}>Add from device</Text>
          </TouchableOpacity>

          {tracks.length === 0 ? (
            <Text style={styles.empty}>No music yet — pick a library track or file.</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {tracks.map((t, i) => {
                const id = t.id ?? 'legacy';
                const sel = id === selectedId;
                return (
                  <TouchableOpacity
                    key={id + i}
                    style={[styles.chip, sel && styles.chipActive]}
                    onPress={() => onSelectTrack(sel ? null : id)}
                  >
                    <Text style={[styles.chipText, sel && styles.chipTextActive]} numberOfLines={1}>
                      {t.title || `Track ${i + 1}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {selected && selectedId && (
            <View style={styles.edit}>
              <Text style={styles.sliderLabel}>
                Volume {Math.round((selected.volume ?? 0.6) * 100)}%
              </Text>
              <Slider
                minimumValue={0}
                maximumValue={1}
                value={selected.volume ?? 0.6}
                onValueChange={(volume) => onUpdateTrack(selectedId, { volume })}
                minimumTrackTintColor={COLORS.yellow}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.yellow}
              />
              <Text style={styles.sliderLabel}>
                Fade in {Math.round(selected.fadeInMs ?? 0)}ms
              </Text>
              <Slider
                minimumValue={0}
                maximumValue={3000}
                step={50}
                value={selected.fadeInMs ?? 0}
                onValueChange={(fadeInMs) => onUpdateTrack(selectedId, { fadeInMs })}
                minimumTrackTintColor={COLORS.textSecondary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.textPrimary}
              />
              <Text style={styles.sliderLabel}>
                Fade out {Math.round(selected.fadeOutMs ?? 0)}ms
              </Text>
              <Slider
                minimumValue={0}
                maximumValue={3000}
                step={50}
                value={selected.fadeOutMs ?? 0}
                onValueChange={(fadeOutMs) => onUpdateTrack(selectedId, { fadeOutMs })}
                minimumTrackTintColor={COLORS.textSecondary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.textPrimary}
              />
              <View style={styles.duckRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.duckTitle}>Duck under voiceover</Text>
                  <Text style={styles.duckHint}>
                    Lowers this track while VO plays ({Math.round(musicAudibleMs(selected) / 1000)}s)
                  </Text>
                </View>
                <Switch
                  value={selected.duckUnderVoiceover !== false}
                  onValueChange={(duckUnderVoiceover) =>
                    onUpdateTrack(selectedId, { duckUnderVoiceover })
                  }
                  trackColor={{ false: COLORS.border, true: 'rgba(245,197,24,0.45)' }}
                  thumbColor={
                    selected.duckUnderVoiceover !== false ? COLORS.yellow : '#888'
                  }
                />
              </View>
              {selected.duckUnderVoiceover !== false && (
                <>
                  <Text style={styles.sliderLabel}>
                    Duck to {Math.round((selected.duckLevel ?? 0.28) * 100)}%
                  </Text>
                  <Slider
                    minimumValue={0.05}
                    maximumValue={0.7}
                    step={0.01}
                    value={selected.duckLevel ?? 0.28}
                    onValueChange={(duckLevel) => onUpdateTrack(selectedId, { duckLevel })}
                    minimumTrackTintColor={COLORS.textSecondary}
                    maximumTrackTintColor={COLORS.border}
                    thumbTintColor={COLORS.yellow}
                  />
                </>
              )}
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => onRemoveTrack(selectedId)}
              >
                <Ionicons name="trash-outline" size={scale(16)} color={COLORS.danger} />
                <Text style={styles.deleteText}>Remove track</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
    marginBottom: verticalScale(10),
  },
  title: { color: COLORS.textPrimary, fontSize: moderateScale(15), fontWeight: '700' },
  tabRow: { flexDirection: 'row', gap: scale(8), marginBottom: verticalScale(10) },
  tab: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    borderRadius: scale(16),
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { borderColor: 'rgba(255,255,255,0.25)' },
  tabText: { color: COLORS.textSecondary, fontSize: moderateScale(12), fontWeight: '600' },
  tabTextActive: { color: COLORS.textPrimary },
  section: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
    marginTop: verticalScale(8),
    marginBottom: verticalScale(4),
  },
  libRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingVertical: verticalScale(8),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  libTitle: { color: COLORS.textPrimary, fontSize: moderateScale(13), fontWeight: '600' },
  libMeta: { color: COLORS.textSecondary, fontSize: moderateScale(10) },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingVertical: verticalScale(10),
    marginBottom: verticalScale(8),
  },
  addBtnText: { color: COLORS.textPrimary, fontSize: moderateScale(13), fontWeight: '600' },
  empty: { color: COLORS.textSecondary, fontSize: moderateScale(12), textAlign: 'center' },
  chipRow: { gap: scale(8), paddingBottom: verticalScale(8) },
  chip: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    borderRadius: scale(16),
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: scale(140),
  },
  chipActive: { borderColor: COLORS.yellow },
  chipText: { color: COLORS.textPrimary, fontSize: moderateScale(12), fontWeight: '600' },
  chipTextActive: { color: COLORS.yellow },
  edit: { marginTop: verticalScale(4) },
  sliderLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    marginTop: verticalScale(6),
  },
  duckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(10),
    gap: scale(10),
  },
  duckTitle: { color: COLORS.textPrimary, fontSize: moderateScale(13), fontWeight: '600' },
  duckHint: { color: COLORS.textSecondary, fontSize: moderateScale(10), marginTop: 2 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    marginTop: verticalScale(10),
    paddingVertical: verticalScale(8),
  },
  deleteText: { color: COLORS.danger, fontSize: moderateScale(13), fontWeight: '600' },
});
}
let styles = __makeStyles();

