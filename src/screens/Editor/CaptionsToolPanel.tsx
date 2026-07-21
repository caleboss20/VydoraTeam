/**
 * AI auto-captions — opt-in Generate with professional style presets.
 * Podcast / word-pop / phrases etc. Nothing runs until the user taps Generate.
 * After generate, Export .srt shares a SubRip sidecar.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { useAppPalette } from '../Contexts/ThemeContext';
import {
  CAPTION_STYLE_PRESETS,
  CaptionStyleId,
} from '../services/captionStylePresets';

let COLORS: Record<string, string> = {
  background: '#151821',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  border: '#2A2A2E',
  danger: '#E85D5D',
};

interface CaptionsToolPanelProps {
  visible: boolean;
  /** Number of caption overlays already on the active clip. */
  captionCount: number;
  /** Kick off transcription for the chosen style; resolves with count + optional srt. */
  onGenerate: (
    styleId: CaptionStyleId
  ) => Promise<{ added: number; srt?: string } | number>;
  /** Rebuild SRT from existing AI overlays when last generate SRT is missing. */
  getSrt?: () => string;
  onClearCaptions: () => void;
  onClose: () => void;
}

export default function CaptionsToolPanel({
  visible,
  captionCount,
  onGenerate,
  getSrt,
  onClearCaptions,
  onClose,
}: CaptionsToolPanelProps) {
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
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<number | null>(null);
  const [lastStyle, setLastStyle] = useState<CaptionStyleId | null>(null);
  const [lastSrt, setLastSrt] = useState<string | null>(null);
  const [styleId, setStyleId] = useState<CaptionStyleId>('karaoke');

  const handleGenerate = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setError(null);
      setLastAdded(null);
      const result = await onGenerate(styleId);
      const added =
        typeof result === 'number' ? result : result?.added ?? 0;
      const srt = typeof result === 'number' ? undefined : result?.srt;
      setLastAdded(added);
      setLastStyle(styleId);
      if (srt?.trim()) setLastSrt(srt);
    } catch (e: any) {
      setError(e?.message ?? 'Caption generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportSrt = async () => {
    const srt = (lastSrt?.trim() || getSrt?.() || '').trim();
    if (!srt) {
      Alert.alert(
        'No captions',
        'Generate captions first, then export the .srt file.'
      );
      return;
    }
    try {
      setExporting(true);
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing not available on this device');
        return;
      }
      const file = new File(Paths.cache, `vydora-captions-${Date.now()}.srt`);
      file.create({ overwrite: true });
      file.write(srt);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/x-subrip',
        dialogTitle: 'Export captions (.srt)',
      });
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Could not share .srt file.');
    } finally {
      setExporting(false);
    }
  };

  if (!visible) return null;
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="sparkles" size={scale(16)} color={COLORS.yellow} />
              <Text style={styles.title}>AI Captions</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={scale(22)} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            Pick a look, then Generate. Words sync to speech when timestamps are
            available — nothing runs until you tap.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.styleRow}
          >
            {CAPTION_STYLE_PRESETS.map((p) => {
              const on = p.id === styleId;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.styleChip, on && styles.styleChipOn]}
                  onPress={() => setStyleId(p.id)}
                  disabled={loading}
                >
                  <Ionicons
                    name={p.icon}
                    size={scale(14)}
                    color={on ? COLORS.background : COLORS.textPrimary}
                  />
                  <Text style={[styles.styleChipText, on && styles.styleChipTextOn]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={styles.styleHint}>
            {CAPTION_STYLE_PRESETS.find((p) => p.id === styleId)?.hint}
          </Text>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={COLORS.yellow} />
              <Text style={styles.loadingText}>Transcribing audio…</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.pickBtn} onPress={handleGenerate}>
              <Ionicons name="sparkles-outline" size={scale(20)} color={COLORS.yellow} />
              <Text style={styles.pickBtnText}>
                {captionCount > 0 ? 'Regenerate captions' : 'Generate captions'}
              </Text>
            </TouchableOpacity>
          )}

          {lastAdded !== null && !loading && (
            <Text style={styles.successText}>
              Added {lastAdded} caption{lastAdded === 1 ? '' : 's'}
              {lastStyle
                ? ` · ${CAPTION_STYLE_PRESETS.find((p) => p.id === lastStyle)?.label ?? lastStyle}`
                : ''}
              .
            </Text>
          )}
          {error && !loading && <Text style={styles.errorText}>{error}</Text>}

          {(captionCount > 0 || !!lastSrt) && !loading && (
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={handleExportSrt}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator color={COLORS.yellow} />
              ) : (
                <>
                  <Ionicons
                    name="download-outline"
                    size={scale(16)}
                    color={COLORS.yellow}
                  />
                  <Text style={styles.exportBtnText}>Export .srt</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {captionCount > 0 && !loading && (
            <TouchableOpacity style={styles.clearBtn} onPress={onClearCaptions}>
              <Ionicons name="trash-outline" size={scale(16)} color={COLORS.danger} />
              <Text style={styles.clearBtnText}>
                Remove {captionCount} caption{captionCount === 1 ? '' : 's'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

function __makeStyles() {
  return StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panel: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    padding: scale(20),
    minHeight: verticalScale(280),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  hint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(12),
    lineHeight: moderateScale(18),
    marginBottom: verticalScale(10),
  },
  styleRow: {
    gap: scale(8),
    paddingBottom: verticalScale(6),
  },
  styleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(16),
    backgroundColor: '#0B0D13',
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.background,
  },
  styleHint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    marginBottom: verticalScale(10),
    lineHeight: moderateScale(15),
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    backgroundColor: 'rgba(245,197,24,0.1)',
    borderRadius: scale(12),
    marginTop: verticalScale(4),
  },
  pickBtnText: {
    color: COLORS.yellow,
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingVertical: verticalScale(14),
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(13),
  },
  successText: {
    color: '#10B981',
    fontSize: moderateScale(12),
    marginTop: verticalScale(10),
  },
  errorText: {
    color: COLORS.danger,
    fontSize: moderateScale(12),
    marginTop: verticalScale(10),
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingVertical: verticalScale(10),
    marginTop: verticalScale(10),
  },
  exportBtnText: {
    color: COLORS.yellow,
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingVertical: verticalScale(10),
    marginTop: verticalScale(4),
  },
  clearBtnText: {
    color: COLORS.danger,
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
});
}
let styles = __makeStyles();
