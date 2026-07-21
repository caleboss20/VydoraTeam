/**
 * Compound (nested) clips — group selected timeline clips.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useAppPalette } from '../Contexts/ThemeContext';
import { CompoundGroup, VideoClip } from '../types';

let COLORS: Record<string, string> = {
  background: '#151821',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  border: '#2A2A2E',
};

interface CompoundPanelProps {
  visible: boolean;
  clips: VideoClip[];
  compounds: CompoundGroup[];
  selectedClipId?: string | null;
  onGroupSelected: (name: string) => void;
  onUngroup: (compoundId: string) => void;
  onToggleCollapse: (compoundId: string) => void;
  onClose: () => void;
}

export default function CompoundPanel({
  visible,
  clips,
  compounds,
  selectedClipId,
  onGroupSelected,
  onUngroup,
  onToggleCollapse,
  onClose,
}: CompoundPanelProps) {
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
  const [name, setName] = useState('Compound');

  if (!visible) return null;
  const selected = clips.find((c) => c.id === selectedClipId);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Compound clips</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        Group the active clip with neighbors that already share a compound, or
        start a new group from the selected clip.
      </Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Group name"
        placeholderTextColor={COLORS.textSecondary}
      />
      <TouchableOpacity
        style={[styles.primary, !selected && { opacity: 0.4 }]}
        disabled={!selected}
        onPress={() => onGroupSelected(name.trim() || 'Compound')}
      >
        <Text style={styles.primaryText}>
          {selected?.compoundId ? 'Add peers to group' : 'Create compound'}
        </Text>
      </TouchableOpacity>

      <ScrollView style={{ maxHeight: verticalScale(140) }}>
        {compounds.length === 0 ? (
          <Text style={styles.empty}>No compounds yet.</Text>
        ) : (
          compounds.map((g) => {
            const count = clips.filter((c) => c.compoundId === g.id).length;
            return (
              <View key={g.id} style={styles.row}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => onToggleCollapse(g.id)}
                >
                  <Text style={styles.rowTitle}>
                    {g.collapsed ? '▸' : '▾'} {g.name} · {count} clips
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onUngroup(g.id)}>
                  <Text style={styles.ungroup}>Ungroup</Text>
                </TouchableOpacity>
              </View>
            );
          })
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
    hint: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      marginBottom: verticalScale(8),
      lineHeight: moderateScale(15),
    },
    input: {
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: scale(8),
      color: COLORS.textPrimary,
      paddingHorizontal: scale(10),
      paddingVertical: verticalScale(8),
      marginBottom: verticalScale(8),
    },
    primary: {
      backgroundColor: COLORS.yellow,
      borderRadius: scale(8),
      paddingVertical: verticalScale(10),
      alignItems: 'center',
      marginBottom: verticalScale(10),
    },
    primaryText: { color: '#1A0E00', fontWeight: '800' },
    empty: { color: COLORS.textSecondary, fontSize: moderateScale(12) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: verticalScale(8),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    rowTitle: {
      color: COLORS.textPrimary,
      fontWeight: '600',
      fontSize: moderateScale(13),
    },
    ungroup: {
      color: COLORS.yellow,
      fontWeight: '700',
      fontSize: moderateScale(12),
    },
  });
}
let styles = makeStyles();
