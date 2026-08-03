/**
 * Publish / share intents — platform 9:16 presets + export + caption share.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useAppPalette } from '../Contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

let COLORS: Record<string, string> = {
  background: '#151821',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  border: '#2A2A2E',
  surface: '#0B0D13',
};

export type PublishPresetId = 'tiktok' | 'reels' | 'shorts' | 'square' | 'youtube';

const PRESETS: Array<{
  id: PublishPresetId;
  label: string;
  ratio: string;
  cropRatioId: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    id: 'tiktok',
    label: 'TikTok',
    ratio: '9:16',
    cropRatioId: 'tiktok',
    icon: 'logo-tiktok',
  },
  {
    id: 'reels',
    label: 'Reels',
    ratio: '9:16',
    cropRatioId: 'tiktok',
    icon: 'logo-instagram',
  },
  {
    id: 'shorts',
    label: 'Shorts',
    ratio: '9:16',
    cropRatioId: 'tiktok',
    icon: 'logo-youtube',
  },
  {
    id: 'square',
    label: 'Feed square',
    ratio: '1:1',
    cropRatioId: 'square',
    icon: 'tablet-landscape-outline',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    ratio: '16:9',
    cropRatioId: 'youtube',
    icon: 'desktop-outline',
  },
];

interface PublishPanelProps {
  visible: boolean;
  projectName: string;
  /** Stamp crop on all clips (or active), then open export. */
  onApplyPreset?: (cropRatioId: string, presetLabel: string) => void;
  onClose: () => void;
}

export default function PublishPanel({
  visible,
  projectName,
  onApplyPreset,
  onClose,
}: PublishPanelProps) {
  const navigation = useNavigation<any>();
  const p = useAppPalette();
  COLORS = {
    ...COLORS,
    background: p.background,
    border: p.border,
    yellow: p.yellow,
    textPrimary: p.textPrimary,
    textSecondary: p.textSecondary,
    surface: p.surface,
  };
  styles = makeStyles();
  if (!visible) return null;

  const shareCaption = async () => {
    try {
      await Share.share({
        message: `Check out "${projectName}" — edited in Vydora.`,
      });
    } catch {
      /* dismissed */
    }
  };

  const openExport = () => {
    onClose();
    navigation.navigate('reviewexport');
  };

  const runPreset = (preset: (typeof PRESETS)[number]) => {
    if (onApplyPreset) {
      onApplyPreset(preset.cropRatioId, preset.label);
    }
    Alert.alert(
      `${preset.label} · ${preset.ratio}`,
      `Frame set to ${preset.ratio}. Export, then share to ${preset.label} from your gallery.`,
      [
        { text: 'Export now', onPress: openExport },
        { text: 'Later', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Publish</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>PLATFORM PRESETS</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetRow}
      >
        {PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset.id}
            style={styles.presetChip}
            onPress={() => runPreset(preset)}
          >
            <Ionicons name={preset.icon} size={scale(18)} color={COLORS.yellow} />
            <Text style={styles.presetLabel}>{preset.label}</Text>
            <Text style={styles.presetRatio}>{preset.ratio}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.row} onPress={openExport}>
        <Ionicons name="download-outline" size={scale(18)} color={COLORS.yellow} />
        <Text style={styles.rowText}>Export MP4</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row} onPress={shareCaption}>
        <Ionicons name="share-outline" size={scale(18)} color={COLORS.yellow} />
        <Text style={styles.rowText}>Share caption</Text>
      </TouchableOpacity>
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
    section: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(10),
      fontWeight: '700',
      letterSpacing: 0.6,
      marginBottom: verticalScale(8),
    },
    presetRow: {
      gap: scale(8),
      paddingBottom: verticalScale(10),
    },
    presetChip: {
      width: scale(88),
      backgroundColor: COLORS.surface,
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingVertical: verticalScale(10),
      paddingHorizontal: scale(8),
      alignItems: 'center',
      gap: verticalScale(4),
    },
    presetLabel: {
      color: COLORS.textPrimary,
      fontWeight: '700',
      fontSize: moderateScale(11),
    },
    presetRatio: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(10),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(12),
      paddingVertical: verticalScale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    rowText: {
      color: COLORS.textPrimary,
      fontWeight: '600',
      fontSize: moderateScale(14),
    },
  });
}
let styles = makeStyles();
