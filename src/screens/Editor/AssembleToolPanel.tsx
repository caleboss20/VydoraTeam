/**
 * Flexible timeline assemble — pull 14–20s then 4–10s from a source, reorder,
 * delete pieces. CapCut-style “build your own cut”.
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import type { VideoClip } from '../types';
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
          Build one film from pieces: take 14s–20s, then 4s–10s, reorder, delete
          what you don’t want. Title cards sit in the same list.
        </Text>

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
          <Text style={styles.sub}>No clips yet.</Text>
        ) : (
          clips
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((c, i) => {
              const sel = c.id === selectedClipId;
              const isTitle = c.kind === 'title';
              const len =
                (c.trimEndMs ?? c.durationMs) - (c.trimStartMs ?? 0);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.piece, sel && styles.pieceOn]}
                  onPress={() => onSelectClip(c.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.pieceLeft}>
                    <Text style={styles.pieceIdx}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pieceTitle} numberOfLines={1}>
                        {isTitle
                          ? `📄 ${c.titleCard?.title || 'Title card'}`
                          : `🎬 ${fmt(c.trimStartMs ?? 0)} → ${fmt(c.trimEndMs ?? c.durationMs)}`}
                      </Text>
                      <Text style={styles.pieceMeta}>
                        {isTitle
                          ? `${(c.durationMs / 1000).toFixed(1)}s · ${c.titleCard?.backgroundColor ?? ''}`
                          : `${(len / 1000).toFixed(1)}s on timeline`}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.pieceActions}>
                    <TouchableOpacity
                      onPress={() => onMoveClip(c.id, -1)}
                      hitSlop={8}
                      disabled={i === 0}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={scale(18)}
                        color={i === 0 ? COLORS.border : COLORS.textPrimary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onMoveClip(c.id, 1)}
                      hitSlop={8}
                      disabled={i === clips.length - 1}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={scale(18)}
                        color={
                          i === clips.length - 1
                            ? COLORS.border
                            : COLORS.textPrimary
                        }
                      />
                    </TouchableOpacity>
                    {!isTitle && (
                      <TouchableOpacity
                        onPress={() => onResetClipEdits(c.id)}
                        hitSlop={8}
                      >
                        <Ionicons
                          name="refresh-outline"
                          size={scale(16)}
                          color={COLORS.textSecondary}
                        />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert('Delete piece?', 'Remove this from the timeline.', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => onDeleteClip(c.id),
                          },
                        ])
                      }
                      hitSlop={8}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={scale(16)}
                        color={COLORS.danger}
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
        )}
      </ScrollView>
    </View>
  );
}

function __makeStyles() {
  return StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: scale(16),
    borderTopRightRadius: scale(16),
    maxHeight: verticalScale(440),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  body: { maxHeight: verticalScale(380), paddingHorizontal: scale(16) },
  hint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    lineHeight: moderateScale(16),
    marginTop: verticalScale(10),
  },
  section: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
    fontWeight: '700',
    letterSpacing: 0.7,
    marginTop: verticalScale(14),
    marginBottom: verticalScale(8),
  },
  sub: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    marginBottom: verticalScale(8),
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: scale(8),
  },
  field: { flex: 1 },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
    marginBottom: verticalScale(4),
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(10),
    color: COLORS.textPrimary,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
    fontSize: moderateScale(14),
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: COLORS.yellow,
    borderRadius: scale(10),
    paddingHorizontal: scale(14),
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
    gap: scale(8),
    marginTop: verticalScale(10),
  },
  quick: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  quickText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
    fontWeight: '600',
  },
  piece: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: scale(10),
    marginBottom: verticalScale(8),
  },
  pieceOn: {
    borderColor: COLORS.yellow,
    backgroundColor: 'rgba(245,197,24,0.08)',
  },
  pieceLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(10), flex: 1 },
  pieceIdx: {
    color: COLORS.yellow,
    fontWeight: '800',
    fontSize: moderateScale(14),
    width: scale(20),
  },
  pieceTitle: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: moderateScale(12),
  },
  pieceMeta: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
    marginTop: 2,
  },
  pieceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginLeft: scale(8),
  },
});
}
let styles = __makeStyles();

