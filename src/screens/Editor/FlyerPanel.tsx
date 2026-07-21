/**
 * Flyer panel — still-image sheets on the timeline (end cards, posters, notices).
 * Placement: start / before / after / end; each flyer has its own filter/grade.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import { useAppPalette } from '../Contexts/ThemeContext';
import { VideoClip } from '../types';

let COLORS: Record<string, string> = {
  background: '#151821',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  border: '#2A2A2E',
  danger: '#E85D5D',
};

export type FlyerInsertWhere = 'start' | 'before' | 'after' | 'end';

const DURATIONS = [2, 3, 5, 8, 10];
const WHERE_OPTS: { id: FlyerInsertWhere; label: string }[] = [
  { id: 'start', label: 'Start' },
  { id: 'before', label: 'Before' },
  { id: 'after', label: 'After' },
  { id: 'end', label: 'End' },
];

interface FlyerPanelProps {
  visible: boolean;
  flyers: VideoClip[];
  selectedFlyerId?: string | null;
  onAdd: (
    uri: string,
    durationMs: number,
    where: FlyerInsertWhere,
    caption?: string
  ) => void;
  onSelect: (clipId: string) => void;
  onUpdateDuration: (clipId: string, durationMs: number) => void;
  onDelete: (clipId: string) => void;
  onOpenFilter: () => void;
  onClose: () => void;
}

export default function FlyerPanel({
  visible,
  flyers,
  selectedFlyerId,
  onAdd,
  onSelect,
  onUpdateDuration,
  onDelete,
  onOpenFilter,
  onClose,
}: FlyerPanelProps) {
  const p = useAppPalette();
  COLORS = {
    ...COLORS,
    background: p.background,
    border: p.border,
    yellow: p.yellow,
    textPrimary: p.textPrimary,
    textSecondary: p.textSecondary,
    danger: p.danger,
  };
  styles = makeStyles();

  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(5);
  const [where, setWhere] = useState<FlyerInsertWhere>('end');

  if (!visible) return null;

  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.92,
        allowsEditing: false,
      });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      setPickedUri(res.assets[0].uri);
    } catch (e: any) {
      Alert.alert('Flyer', e?.message ?? 'Could not open gallery.');
    }
  };

  const handleAdd = () => {
    if (!pickedUri) {
      Alert.alert('Pick a flyer', 'Choose an image (poster, notice, end card).');
      return;
    }
    onAdd(pickedUri, Math.round(durationSec * 1000), where);
    setPickedUri(null);
  };

  const selected = flyers.find((f) => f.id === selectedFlyerId) ?? null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Flyer</Text>
          <Text style={styles.sub}>
            Image on the timeline — own filters, independent of your video.
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ maxHeight: verticalScale(280) }}>
        <TouchableOpacity style={styles.pickBtn} onPress={pickImage}>
          {pickedUri ? (
            <Image source={{ uri: pickedUri }} style={styles.pickPreview} />
          ) : (
            <>
              <Ionicons
                name="image-outline"
                size={scale(28)}
                color={COLORS.yellow}
              />
              <Text style={styles.pickText}>Choose flyer image</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Duration · {durationSec}s</Text>
        <View style={styles.chipRow}>
          {DURATIONS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, durationSec === d && styles.chipOn]}
              onPress={() => setDurationSec(d)}
            >
              <Text
                style={[styles.chipText, durationSec === d && styles.chipTextOn]}
              >
                {d}s
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Slider
          minimumValue={1}
          maximumValue={30}
          step={1}
          value={durationSec}
          onValueChange={setDurationSec}
          minimumTrackTintColor={COLORS.yellow}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.yellow}
        />

        <Text style={styles.label}>Place on timeline</Text>
        <View style={styles.chipRow}>
          {WHERE_OPTS.map((w) => (
            <TouchableOpacity
              key={w.id}
              style={[styles.chip, where === w.id && styles.chipOn]}
              onPress={() => setWhere(w.id)}
            >
              <Text
                style={[styles.chipText, where === w.id && styles.chipTextOn]}
              >
                {w.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.hint}>
          Before / After uses the selected timeline clip. End = after the last
          clip (ideal for conference outro posters).
        </Text>

        <TouchableOpacity style={styles.primary} onPress={handleAdd}>
          <Ionicons name="add" size={scale(16)} color="#111" />
          <Text style={styles.primaryText}>Add flyer</Text>
        </TouchableOpacity>

        {flyers.length > 0 && (
          <>
            <Text style={[styles.label, { marginTop: verticalScale(12) }]}>
              On timeline ({flyers.length})
            </Text>
            {flyers.map((f) => {
              const on = f.id === selectedFlyerId;
              const sec = Math.round(
                ((f.trimEndMs ?? f.durationMs) - (f.trimStartMs ?? 0)) / 1000
              );
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.flyerRow, on && styles.flyerRowOn]}
                  onPress={() => onSelect(f.id)}
                >
                  {f.uri ? (
                    <Image source={{ uri: f.uri }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbEmpty]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.flyerTitle} numberOfLines={1}>
                      Flyer · {sec}s
                      {f.filterId && f.filterId !== 'none'
                        ? ` · ${f.filterId}`
                        : ''}
                    </Text>
                    <Text style={styles.flyerMeta}>
                      Tap to select · Filter / Color apply to this flyer only
                    </Text>
                  </View>
                  <TouchableOpacity
                    hitSlop={8}
                    onPress={() => onDelete(f.id)}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={scale(16)}
                      color={COLORS.danger}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {selected && (
          <View style={styles.editBox}>
            <Text style={styles.label}>
              Selected flyer duration ·{' '}
              {(
                ((selected.trimEndMs ?? selected.durationMs) -
                  (selected.trimStartMs ?? 0)) /
                1000
              ).toFixed(0)}
              s
            </Text>
            <Slider
              minimumValue={1}
              maximumValue={30}
              step={1}
              value={Math.max(
                1,
                Math.round(
                  ((selected.trimEndMs ?? selected.durationMs) -
                    (selected.trimStartMs ?? 0)) /
                    1000
                )
              )}
              onSlidingComplete={(v) =>
                onUpdateDuration(selected.id, Math.round(v * 1000))
              }
              minimumTrackTintColor={COLORS.yellow}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.yellow}
            />
            <TouchableOpacity style={styles.secondary} onPress={onOpenFilter}>
              <Ionicons
                name="flame-outline"
                size={scale(14)}
                color={COLORS.yellow}
              />
              <Text style={styles.secondaryText}>
                Filter / Color this flyer
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: COLORS.background,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      padding: scale(14),
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: verticalScale(8),
    },
    title: {
      color: COLORS.textPrimary,
      fontWeight: '800',
      fontSize: moderateScale(15),
    },
    sub: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      marginTop: 2,
      maxWidth: scale(260),
    },
    label: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      fontWeight: '600',
      marginTop: verticalScale(8),
      marginBottom: verticalScale(4),
    },
    hint: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(10),
      marginTop: verticalScale(4),
      marginBottom: verticalScale(6),
    },
    pickBtn: {
      height: verticalScale(88),
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: COLORS.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    pickPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
    pickText: {
      color: COLORS.textSecondary,
      marginTop: verticalScale(4),
      fontWeight: '600',
      fontSize: moderateScale(12),
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(6) },
    chip: {
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(6),
      borderRadius: scale(14),
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    chipOn: {
      borderColor: COLORS.yellow,
      backgroundColor: 'rgba(245,197,24,0.15)',
    },
    chipText: {
      color: COLORS.textSecondary,
      fontWeight: '700',
      fontSize: moderateScale(11),
    },
    chipTextOn: { color: COLORS.yellow },
    primary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scale(6),
      backgroundColor: COLORS.yellow,
      borderRadius: scale(12),
      paddingVertical: verticalScale(12),
      marginTop: verticalScale(8),
    },
    primaryText: { color: '#111', fontWeight: '800', fontSize: moderateScale(14) },
    secondary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(8),
      paddingVertical: verticalScale(10),
    },
    secondaryText: {
      color: COLORS.yellow,
      fontWeight: '700',
      fontSize: moderateScale(13),
    },
    flyerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(10),
      paddingVertical: verticalScale(8),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    flyerRowOn: { backgroundColor: 'rgba(245,197,24,0.08)' },
    thumb: {
      width: scale(40),
      height: scale(40),
      borderRadius: scale(8),
      backgroundColor: COLORS.border,
    },
    thumbEmpty: { opacity: 0.4 },
    flyerTitle: {
      color: COLORS.textPrimary,
      fontWeight: '700',
      fontSize: moderateScale(12),
    },
    flyerMeta: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(10),
      marginTop: 2,
    },
    editBox: {
      marginTop: verticalScale(8),
      paddingTop: verticalScale(4),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: COLORS.border,
    },
  });
}
let styles = makeStyles();
