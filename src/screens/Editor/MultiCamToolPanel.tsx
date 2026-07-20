/**
 * Multi-cam Director — sync A/B by audio, then cut between angles at the playhead.
 * Nothing syncs until the user taps Sync.
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import * as ImagePicker from 'expo-image-picker';
import type { CamAngle, VideoClip } from '../types';
import { useAppPalette } from '../Contexts/ThemeContext';


let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  danger: '#E85D5D',
  teal: '#34D399',
};

interface MultiCamToolPanelProps {
  visible: boolean;
  activeClip: VideoClip | null;
  /** Other timeline clips that can become Cam B. */
  otherClips: VideoClip[];
  playheadLabel: string;
  onSyncWithClip: (camBClipId: string) => Promise<{
    offsetMs: number;
    confidence: number;
    message: string;
  }>;
  onSyncWithPickedVideo: (localUri: string) => Promise<{
    offsetMs: number;
    confidence: number;
    message: string;
  }>;
  onCutToAngle: (angleId: string) => void;
  onClose: () => void;
}

export default function MultiCamToolPanel({
  visible,
  activeClip,
  otherClips,
  playheadLabel,
  onSyncWithClip,
  onSyncWithPickedVideo,
  onCutToAngle,
  onClose,
}: MultiCamToolPanelProps) {
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
  const [status, setStatus] = useState<string | null>(null);

  const angles: CamAngle[] = useMemo(
    () => activeClip?.multiCam?.angles ?? [],
    [activeClip]
  );
  const activeAngleId = activeClip?.multiCam?.angleId;

  if (!visible) return null;

  const runSyncClip = async (clipId: string) => {
    if (loading) return;
    try {
      setLoading(true);
      setError(null);
      setStatus(null);
      const r = await onSyncWithClip(clipId);
      setStatus(
        `${r.message}  ·  offset ${r.offsetMs >= 0 ? '+' : ''}${r.offsetMs}ms  ·  ${(r.confidence * 100).toFixed(0)}%`
      );
    } catch (e: any) {
      setError(e?.message ?? 'Sync failed.');
    } finally {
      setLoading(false);
    }
  };

  const pickAndSync = async () => {
    if (loading) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 1,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setLoading(true);
      setError(null);
      setStatus(null);
      const r = await onSyncWithPickedVideo(result.assets[0].uri);
      setStatus(
        `${r.message}  ·  offset ${r.offsetMs >= 0 ? '+' : ''}${r.offsetMs}ms  ·  ${(r.confidence * 100).toFixed(0)}%`
      );
    } catch (e: any) {
      setError(e?.message ?? 'Sync failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="git-compare-outline" size={scale(16)} color={COLORS.yellow} />
          <Text style={styles.title}>Multi-cam</Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        Lock Cam B to Cam A by audio, then Director-cut at {playheadLabel}. Mouths
        stay in sync across angles.
      </Text>

      {!activeClip?.multiCam && (
        <>
          <Text style={styles.section}>Sync Cam B from timeline</Text>
          {otherClips.length === 0 ? (
            <Text style={styles.meta}>Add another clip, or pick a video below.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {otherClips.map((c, i) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.chip}
                    disabled={loading}
                    onPress={() => runSyncClip(c.id)}
                  >
                    <Ionicons name="videocam-outline" size={scale(14)} color={COLORS.textPrimary} />
                    <Text style={styles.chipText}>Clip {i + 1}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={COLORS.yellow} />
              <Text style={styles.loadingText}>Listening to both angles…</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.primaryBtn} onPress={pickAndSync}>
              <Ionicons name="link-outline" size={scale(16)} color={COLORS.background} />
              <Text style={styles.primaryBtnText}>Pick Cam B & sync</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {angles.length > 0 && (
        <>
          <Text style={styles.section}>Director — cut at playhead</Text>
          <View style={styles.angleRow}>
            {angles.map((a) => {
              const on = a.id === activeAngleId;
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.angleBtn, on && styles.angleBtnOn]}
                  onPress={() => {
                    if (on) {
                      Alert.alert('Already on ' + a.label, 'Playhead stays on this angle.');
                      return;
                    }
                    onCutToAngle(a.id);
                  }}
                >
                  <Text style={[styles.angleBtnText, on && styles.angleBtnTextOn]}>
                    {a.label}
                  </Text>
                  {on && <Text style={styles.live}>LIVE</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.meta}>
            Tap the other cam to split here and switch — like a live switcher.
          </Text>
        </>
      )}

      {status && !loading && <Text style={styles.success}>{status}</Text>}
      {error && !loading && <Text style={styles.error}>{error}</Text>}
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  title: { color: COLORS.textPrimary, fontSize: moderateScale(15), fontWeight: '700' },
  hint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    lineHeight: moderateScale(16),
    marginBottom: verticalScale(10),
  },
  section: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(12),
    fontWeight: '700',
    marginBottom: verticalScale(8),
    marginTop: verticalScale(4),
  },
  chipRow: { flexDirection: 'row', gap: scale(8), marginBottom: verticalScale(10) },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(14),
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: { color: COLORS.textPrimary, fontSize: moderateScale(12), fontWeight: '600' },
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
  angleRow: { flexDirection: 'row', gap: scale(10), marginBottom: verticalScale(8) },
  angleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  angleBtnOn: {
    borderColor: COLORS.yellow,
    backgroundColor: 'rgba(245,197,24,0.12)',
  },
  angleBtnText: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(14),
    fontWeight: '800',
  },
  angleBtnTextOn: { color: COLORS.yellow },
  live: {
    marginTop: verticalScale(4),
    color: COLORS.teal,
    fontSize: moderateScale(10),
    fontWeight: '800',
    letterSpacing: 1,
  },
  meta: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    marginBottom: verticalScale(6),
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingVertical: verticalScale(10),
  },
  loadingText: { color: COLORS.textSecondary, fontSize: moderateScale(12) },
  success: {
    marginTop: verticalScale(8),
    color: COLORS.teal,
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  error: {
    marginTop: verticalScale(8),
    color: COLORS.danger,
    fontSize: moderateScale(12),
  },
});
}
let styles = __makeStyles();

