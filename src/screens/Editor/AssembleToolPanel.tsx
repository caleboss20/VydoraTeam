/**
 * Flexible timeline assemble — pull ranges, reorder, delete, plus Quik-style Auto Movie.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import type { VideoClip } from '../types';
import { useAppPalette } from '../Contexts/ThemeContext';
import {
  AUTO_MOVIE_STYLES,
  buildAutoMoviePlan,
  type AutoMovieStyleId,
} from '../services/autoMovieService';

let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  danger: '#E85D5D',
};

function fmt(ms: number) {
  const s = Math.max(0, ms) / 1000;
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, '0')}`;
}

interface AssembleToolPanelProps {
  visible: boolean;
  clips: VideoClip[];
  selectedClipId: string | null;
  /** Source for extracting ranges — usually the selected video clip. */
  sourceClip: VideoClip | null;
  onSelectClip: (id: string) => void;
  onExtractRange: (startSec: number, endSec: number) => void;
  onMoveClip: (clipId: string, direction: -1 | 1) => void;
  onDeleteClip: (clipId: string) => void;
  onResetClipEdits: (clipId: string) => void;
  /** Quik-style one-tap: replace source with highlight reel. */
  onAutoMovie?: (sourceClipId: string, styleId: AutoMovieStyleId) => void;
  /** Multi-pick gallery / files → append clips to mix on the timeline. */
  onAddVideos?: () => Promise<void> | void;
  addVideosBusy?: boolean;
  onClose: () => void;
}

export default function AssembleToolPanel({
  visible,
  clips,
  selectedClipId,
  sourceClip,
  onSelectClip,
  onExtractRange,
  onMoveClip,
  onDeleteClip,
  onResetClipEdits,
  onAutoMovie,
  onAddVideos,
  addVideosBusy = false,
  onClose,
}: AssembleToolPanelProps) {
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

  const [startSec, setStartSec] = useState('4');
  const [endSec, setEndSec] = useState('10');
  const [styleId, setStyleId] = useState<AutoMovieStyleId>('quik');
  const [busy, setBusy] = useState(false);

  if (!visible) return null;

  const sourceDur =
    (sourceClip && sourceClip.kind !== 'title'
      ? sourceClip.durationMs
      : 0) / 1000;

  const addRange = () => {
    const a = parseFloat(startSec);
    const b = parseFloat(endSec);
    if (!sourceClip || sourceClip.kind === 'title') {
      Alert.alert('Pick a video', 'Select a video clip as the source first.');
      return;
    }
    if (Number.isNaN(a) || Number.isNaN(b) || b <= a) {
      Alert.alert('Invalid range', 'End must be greater than start (seconds).');
      return;
    }
    if (a < 0 || b > sourceDur + 0.05) {
      Alert.alert(
        'Out of range',
        `Source is ${sourceDur.toFixed(1)}s long. Use times inside that.`
      );
      return;
    }
    onExtractRange(a, b);
  };

  const runAutoMovie = () => {
    if (!sourceClip || sourceClip.kind === 'title') {
      Alert.alert('Pick a video', 'Select a longer clip, then tap Auto Movie.');
      return;
    }
    if ((sourceClip.durationMs ?? 0) < 6000) {
      Alert.alert('Too short', 'Need at least ~6s of footage for Auto Movie.');
      return;
    }
    const plan = buildAutoMoviePlan(sourceClip.durationMs, styleId);
    Alert.alert(
      'Auto Movie',
      `Replace this clip with ${plan.ranges.length} highlight beats (~${Math.round(
        plan.ranges.reduce((a, r) => a + (r.endMs - r.startMs), 0) / 1000
      )}s) + transitions? You can Undo.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assemble',
          onPress: () => {
            if (!onAutoMovie) return;
            setBusy(true);
            try {
              onAutoMovie(sourceClip.id, styleId);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Assemble</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: verticalScale(20) }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hint}>
          Mix videos into one timeline — add several clips, trim / split each,
          reorder, then export joins them.
        </Text>

        {onAddVideos ? (
          <>
            <Text style={styles.section}>ADD TO MIX</Text>
            <TouchableOpacity
              style={styles.mixBtn}
              disabled={addVideosBusy}
              onPress={() => {
                void Promise.resolve(onAddVideos()).catch((e: any) =>
                  Alert.alert('Add videos', e?.message ?? 'Could not add videos.')
                );
              }}
            >
              {addVideosBusy ? (
                <ActivityIndicator color="#0B0D13" />
              ) : (
                <Ionicons name="film-outline" size={scale(18)} color="#0B0D13" />
              )}
              <Text style={styles.mixBtnText}>
                {addVideosBusy ? 'Adding…' : 'Add videos to timeline'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.sub}>
              Camera roll or Files — multi-select. Then Split, trim handles, or
              reorder below. Export stitches everything into one video.
            </Text>
          </>
        ) : null}

        <Text style={styles.section}>AUTO MOVIE</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.styleRow}
        >
          {AUTO_MOVIE_STYLES.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.styleChip, styleId === s.id && styles.styleChipOn]}
              onPress={() => setStyleId(s.id)}
            >
              <Ionicons
                name={s.icon as any}
                size={scale(14)}
                color={styleId === s.id ? '#0B0D13' : COLORS.yellow}
              />
              <Text
                style={[
                  styles.styleChipText,
                  styleId === s.id && styles.styleChipTextOn,
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={styles.autoBtn}
          onPress={runAutoMovie}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#0B0D13" />
          ) : (
            <Ionicons name="flash" size={scale(16)} color="#0B0D13" />
          )}
          <Text style={styles.autoBtnText}>
            {busy ? 'Building…' : 'One-tap Auto Movie'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.section}>EXTRACT FROM SOURCE</Text>
        <Text style={styles.sub}>
          Source:{' '}
          {sourceClip
            ? sourceClip.kind === 'title'
              ? `Card · ${sourceClip.titleCard?.title ?? 'Title'}`
              : `Video · ${fmt(sourceClip.durationMs)}`
            : 'None selected'}
        </Text>
        <View style={styles.rangeRow}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>From (s)</Text>
            <TextInput
              style={styles.input}
              value={startSec}
              onChangeText={setStartSec}
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>To (s)</Text>
            <TextInput
              style={styles.input}
              value={endSec}
              onChangeText={setEndSec}
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={addRange}>
            <Ionicons name="add" size={scale(18)} color="#0B0D13" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.quickRow}>
          {[
            [0, 5],
            [4, 10],
            [14, 20],
            [20, 30],
          ].map(([a, b]) => (
            <TouchableOpacity
              key={`${a}-${b}`}
              style={styles.quick}
              onPress={() => {
                setStartSec(String(a));
                setEndSec(String(b));
              }}
            >
              <Text style={styles.quickText}>
                {a}–{b}s
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>TIMELINE ORDER</Text>
        {clips.length === 0 ? (
          <Text style={styles.sub}>No clips yet — add videos above.</Text>
        ) : null}
        {clips.map((c) => {
          const selected = c.id === selectedClipId;
          const label =
            c.kind === 'title'
              ? `Card · ${c.titleCard?.title ?? 'Title'}`
              : c.kind === 'flyer'
                ? 'Flyer'
                : `Clip · ${fmt((c.trimEndMs ?? c.durationMs) - (c.trimStartMs ?? 0))}`;
          return (
            <View
              key={c.id}
              style={[styles.clipRow, selected && styles.clipRowOn]}
            >
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => onSelectClip(c.id)}
              >
                <Text style={styles.clipTitle} numberOfLines={1}>
                  {label}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onMoveClip(c.id, -1)} hitSlop={6}>
                <Ionicons
                  name="chevron-up"
                  size={scale(18)}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onMoveClip(c.id, 1)} hitSlop={6}>
                <Ionicons
                  name="chevron-down"
                  size={scale(18)}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onResetClipEdits(c.id)}
                hitSlop={6}
              >
                <Ionicons
                  name="refresh-outline"
                  size={scale(16)}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDeleteClip(c.id)} hitSlop={6}>
                <Ionicons
                  name="trash-outline"
                  size={scale(16)}
                  color={COLORS.danger}
                />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function __makeStyles() {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: COLORS.background,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      maxHeight: verticalScale(420),
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: scale(14),
      paddingTop: verticalScale(10),
      paddingBottom: verticalScale(6),
    },
    title: {
      color: COLORS.textPrimary,
      fontWeight: '800',
      fontSize: moderateScale(15),
    },
    body: {
      paddingHorizontal: scale(14),
    },
    hint: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      lineHeight: moderateScale(16),
      marginBottom: verticalScale(10),
    },
    section: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(10),
      fontWeight: '700',
      letterSpacing: 0.6,
      marginTop: verticalScale(10),
      marginBottom: verticalScale(6),
    },
    sub: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      marginBottom: verticalScale(8),
    },
    mixBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scale(8),
      backgroundColor: COLORS.yellow,
      borderRadius: scale(12),
      paddingVertical: verticalScale(12),
      marginBottom: verticalScale(6),
    },
    mixBtnText: {
      color: '#0B0D13',
      fontWeight: '800',
      fontSize: moderateScale(13),
    },
    styleRow: {
      gap: scale(8),
      paddingBottom: verticalScale(8),
    },
    styleChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(6),
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(8),
      borderRadius: scale(20),
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    styleChipOn: {
      backgroundColor: COLORS.yellow,
      borderColor: COLORS.yellow,
    },
    styleChipText: {
      color: COLORS.textPrimary,
      fontSize: moderateScale(12),
      fontWeight: '600',
    },
    styleChipTextOn: {
      color: '#0B0D13',
    },
    autoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scale(8),
      backgroundColor: COLORS.yellow,
      borderRadius: scale(10),
      paddingVertical: verticalScale(10),
      opacity: 0.95,
    },
    autoBtnText: {
      color: '#0B0D13',
      fontWeight: '800',
      fontSize: moderateScale(12),
    },
    rangeRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: scale(8),
    },
    field: {
      flex: 1,
    },
    fieldLabel: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(10),
      marginBottom: verticalScale(4),
    },
    input: {
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: scale(8),
      color: COLORS.textPrimary,
      paddingHorizontal: scale(10),
      paddingVertical: verticalScale(8),
      fontSize: moderateScale(13),
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(4),
      backgroundColor: COLORS.yellow,
      borderRadius: scale(8),
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(10),
    },
    addBtnText: {
      color: '#0B0D13',
      fontWeight: '800',
      fontSize: moderateScale(12),
    },
    quickRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: scale(6),
      marginTop: verticalScale(8),
    },
    quick: {
      paddingHorizontal: scale(10),
      paddingVertical: verticalScale(6),
      borderRadius: scale(8),
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    quickText: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      fontWeight: '600',
    },
    clipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(8),
      paddingVertical: verticalScale(10),
      paddingHorizontal: scale(10),
      borderRadius: scale(10),
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: verticalScale(6),
    },
    clipRowOn: {
      borderColor: COLORS.yellow,
    },
    clipTitle: {
      color: COLORS.textPrimary,
      fontSize: moderateScale(12),
      fontWeight: '600',
    },
  });
}
let styles = __makeStyles();
