/**
 * Curated emoji sticker pack — adds MediaOverlay stickers.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useAppPalette } from '../Contexts/ThemeContext';

const STICKERS = [
  '🔥', '✨', '💯', '😂', '❤️', '👏', '🎉', '⚡',
  '👀', '🙌', '💥', '🌟', '🎵', '📍', '✅', '🚀',
];

let COLORS: Record<string, string> = {
  background: '#151821',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  border: '#2A2A2E',
};

interface StickersPanelProps {
  visible: boolean;
  onAdd: (emoji: string) => void;
  onClose: () => void;
}

export default function StickersPanel({
  visible,
  onAdd,
  onClose,
}: StickersPanelProps) {
  const p = useAppPalette();
  COLORS = {
    ...COLORS,
    background: p.background,
    border: p.border,
    yellow: p.yellow,
    textPrimary: p.textPrimary,
    textSecondary: p.textSecondary,
  };
  styles = makeStyles();
  if (!visible) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Stickers</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>Tap to drop on the overlay track at the playhead.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {STICKERS.map((e) => (
            <TouchableOpacity key={e} style={styles.cell} onPress={() => onAdd(e)}>
              <Text style={styles.emoji}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
    hint: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      marginBottom: verticalScale(8),
    },
    row: { flexDirection: 'row', gap: scale(8) },
    cell: {
      width: scale(48),
      height: scale(48),
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emoji: { fontSize: moderateScale(22) },
  });
}
let styles = makeStyles();
