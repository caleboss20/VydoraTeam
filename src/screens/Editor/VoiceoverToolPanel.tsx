/**
 * Voiceover tool panel — CapCut-style mic narration over the timeline.
 *
 * Record at the current playhead; each take becomes a VoiceoverClip on its
 * own track. Select a take to adjust volume or delete it. Preview playback
 * is handled by Editorscreen (synced to the playhead like music).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Slider from '@react-native-community/slider';
import { VoiceoverClip } from '../types';
import { useAppPalette } from '../Contexts/ThemeContext';
import {
  cancelVoiceoverRecording,
  startVoiceoverRecording,
  stopVoiceoverRecording,
} from '../services/voiceoverService';

let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  danger: '#E85D5D',
  record: '#EF4444',
  vo: '#A78BFA',
};

function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

interface VoiceoverToolPanelProps {
  visible: boolean;
  voiceovers: VoiceoverClip[];
  selectedId: string | null;
  /** Project playhead when Record is pressed — becomes the take's startMs. */
  playheadMs: number;
  onSelect: (id: string | null) => void;
  onRecorded: (uri: string, startMs: number, durationMs: number) => void;
  onVolumeChange: (volume: number) => void;
  onDelete: () => void;
  /** Pause timeline playback while the mic is live. */
  onRecordingChange?: (recording: boolean) => void;
  onClose: () => void;
}

export default function VoiceoverToolPanel({
  visible,
  voiceovers,
  selectedId,
  playheadMs,
  onSelect,
  onRecorded,
  onVolumeChange,
  onDelete,
  onRecordingChange,
  onClose,
}: VoiceoverToolPanelProps) {
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

  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const startPlayheadRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  const selected = voiceovers.find((v) => v.id === selectedId) ?? null;

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      cancelVoiceoverRecording().catch(() => undefined);
    };
  }, []);

  if (!visible) return null;

  const clearTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const beginRecord = async () => {
    if (busy || recording) return;
    setBusy(true);
    try {
      startPlayheadRef.current = Math.max(0, Math.round(playheadMs));
      await startVoiceoverRecording();
      setRecording(true);
      onRecordingChange?.(true);
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      clearTick();
      tickRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 200);
    } catch (e) {
      Alert.alert('Could not start recording', String(e));
    } finally {
      setBusy(false);
    }
  };

  const endRecord = async () => {
    if (!recording) return;
    setBusy(true);
    clearTick();
    try {
      const { uri, durationMs } = await stopVoiceoverRecording();
      setRecording(false);
      onRecordingChange?.(false);
      onRecorded(uri, startPlayheadRef.current, durationMs);
      setElapsedMs(0);
    } catch (e) {
      Alert.alert('Recording failed', String(e));
      setRecording(false);
      onRecordingChange?.(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Voiceover</Text>
        <TouchableOpacity
          onPress={() => {
            if (recording) {
              Alert.alert('Stop recording first', 'Tap Stop before closing.');
              return;
            }
            onClose();
          }}
          hitSlop={8}
        >
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        {recording
          ? `Recording from ${formatMs(startPlayheadRef.current)} · ${formatMs(elapsedMs)}`
          : `Record at playhead ${formatMs(playheadMs)}`}
      </Text>

      <TouchableOpacity
        style={[styles.recordBtn, recording && styles.recordBtnActive]}
        onPress={recording ? endRecord : beginRecord}
        disabled={busy}
      >
        <Ionicons
          name={recording ? 'stop' : 'mic'}
          size={scale(22)}
          color={recording ? '#fff' : COLORS.record}
        />
        <Text style={[styles.recordBtnText, recording && styles.recordBtnTextActive]}>
          {recording ? 'Stop' : 'Record'}
        </Text>
      </TouchableOpacity>

      {voiceovers.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Takes</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.takeRow}
          >
            {voiceovers.map((v, i) => {
              const sel = v.id === selectedId;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.takeChip, sel && styles.takeChipSelected]}
                  onPress={() => onSelect(sel ? null : v.id)}
                >
                  <Ionicons
                    name="mic-outline"
                    size={scale(14)}
                    color={sel ? COLORS.background : COLORS.vo}
                  />
                  <Text
                    style={[styles.takeChipText, sel && styles.takeChipTextSelected]}
                    numberOfLines={1}
                  >
                    Take {i + 1} · {formatMs(v.startMs)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}

      {selected && (
        <View style={styles.editBlock}>
          <Text style={styles.sliderLabel}>
            Volume {Math.round((selected.volume ?? 1) * 100)}%
          </Text>
          <Slider
            style={{ width: '100%', height: verticalScale(28) }}
            minimumValue={0}
            maximumValue={2}
            value={selected.volume ?? 1}
            onValueChange={onVolumeChange}
            minimumTrackTintColor={COLORS.vo}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.vo}
          />
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
            <Ionicons name="trash-outline" size={scale(16)} color={COLORS.danger} />
            <Text style={styles.deleteBtnText}>Delete take</Text>
          </TouchableOpacity>
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
    paddingBottom: verticalScale(18),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(15),
    fontWeight: '700',
  },
  hint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(12),
    marginBottom: verticalScale(12),
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: COLORS.record,
    backgroundColor: COLORS.background,
  },
  recordBtnActive: {
    backgroundColor: COLORS.record,
    borderColor: COLORS.record,
  },
  recordBtnText: {
    color: COLORS.record,
    fontSize: moderateScale(15),
    fontWeight: '700',
  },
  recordBtnTextActive: {
    color: '#fff',
  },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
    marginTop: verticalScale(14),
    marginBottom: verticalScale(8),
    letterSpacing: 0.4,
  },
  takeRow: {
    gap: scale(8),
    paddingRight: scale(8),
  },
  takeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  takeChipSelected: {
    backgroundColor: COLORS.vo,
    borderColor: COLORS.vo,
  },
  takeChipText: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  takeChipTextSelected: {
    color: COLORS.background,
  },
  editBlock: {
    marginTop: verticalScale(12),
  },
  sliderLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(12),
    marginBottom: verticalScale(4),
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    marginTop: verticalScale(8),
    paddingVertical: verticalScale(8),
  },
  deleteBtnText: {
    color: COLORS.danger,
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
});
}
let styles = __makeStyles();

