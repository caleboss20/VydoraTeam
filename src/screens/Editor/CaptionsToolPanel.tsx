import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

const COLORS = {
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
  /** Kick off transcription; resolves with how many captions were added. */
  onGenerate: () => Promise<number>;
  onClearCaptions: () => void;
  onClose: () => void;
}

// AI auto-captions panel — same bottom-sheet pattern as MusicToolPanel.
export default function CaptionsToolPanel({
  visible,
  captionCount,
  onGenerate,
  onClearCaptions,
  onClose,
}: CaptionsToolPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setError(null);
      setLastAdded(null);
      const added = await onGenerate();
      setLastAdded(added);
    } catch (e: any) {
      setError(e?.message ?? 'Caption generation failed.');
    } finally {
      setLoading(false);
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
            Listens to this clip's audio and drops perfectly-timed captions onto
            the timeline. You can reposition or restyle them like any text.
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
              Added {lastAdded} caption{lastAdded === 1 ? '' : 's'} to the timeline.
            </Text>
          )}
          {error && !loading && <Text style={styles.errorText}>{error}</Text>}

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

const styles = StyleSheet.create({
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
    minHeight: verticalScale(220),
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
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    backgroundColor: 'rgba(245,197,24,0.1)',
    borderRadius: scale(12),
    marginTop: verticalScale(8),
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
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingVertical: verticalScale(10),
    marginTop: verticalScale(8),
  },
  clearBtnText: {
    color: COLORS.danger,
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
});
