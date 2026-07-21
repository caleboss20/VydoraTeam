/**
 * CapCut-style animation browser — text In / Out / Loop grids.
 */
import React, { useState } from 'react';
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
import { TextAnimationType } from '../types';
import {
  TEXT_ANIM_IN_PRESETS,
  TEXT_ANIM_OUT_PRESETS,
  TEXT_ANIM_LOOP_PRESETS,
  TextAnimPreset,
} from '../services/textAnimPresets';

let COLORS: Record<string, string> = {
  background: '#151821',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  border: '#2A2A2E',
};

type Tab = 'in' | 'out' | 'loop';

interface AnimationBrowserPanelProps {
  visible: boolean;
  animationIn?: TextAnimationType;
  animationOut?: TextAnimationType;
  animationLoop?: TextAnimationType;
  onChangeIn: (id: TextAnimationType) => void;
  onChangeOut: (id: TextAnimationType) => void;
  onChangeLoop: (id: TextAnimationType) => void;
  onClose: () => void;
  /** When false, show hint to select text first. */
  hasSelection: boolean;
}

export default function AnimationBrowserPanel({
  visible,
  animationIn = 'none',
  animationOut = 'none',
  animationLoop = 'none',
  onChangeIn,
  onChangeOut,
  onChangeLoop,
  onClose,
  hasSelection,
}: AnimationBrowserPanelProps) {
  const p = useAppPalette();
  COLORS = {
    ...COLORS,
    background: p.background,
    surface: p.surface,
    border: p.border,
    yellow: p.yellow,
    textPrimary: p.textPrimary,
    textSecondary: p.textSecondary,
  };
  styles = makeStyles();
  const [tab, setTab] = useState<Tab>('in');

  if (!visible) return null;

  const presets: TextAnimPreset[] =
    tab === 'in'
      ? TEXT_ANIM_IN_PRESETS
      : tab === 'out'
        ? TEXT_ANIM_OUT_PRESETS
        : TEXT_ANIM_LOOP_PRESETS;
  const selected =
    tab === 'in' ? animationIn : tab === 'out' ? animationOut : animationLoop;
  const onPick =
    tab === 'in' ? onChangeIn : tab === 'out' ? onChangeOut : onChangeLoop;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Animations</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      {!hasSelection ? (
        <Text style={styles.hint}>Select a text overlay first, then pick a motion.</Text>
      ) : (
        <>
          <View style={styles.tabs}>
            {(['in', 'out', 'loop'] as Tab[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.tabOn]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
                  {t === 'in' ? 'In' : t === 'out' ? 'Out' : 'Loop'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView
            contentContainerStyle={styles.grid}
            style={{ maxHeight: verticalScale(220) }}
          >
            <View style={styles.gridInner}>
              {presets.map((pr) => {
                const on = selected === pr.id;
                return (
                  <TouchableOpacity
                    key={pr.id}
                    style={[styles.cell, on && styles.cellOn]}
                    onPress={() => onPick(pr.id)}
                  >
                    <Ionicons
                      name={pr.icon as keyof typeof Ionicons.glyphMap}
                      size={scale(18)}
                      color={on ? COLORS.yellow : COLORS.textSecondary}
                    />
                    <Text
                      style={[styles.cellLabel, on && styles.cellLabelOn]}
                      numberOfLines={1}
                    >
                      {pr.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: COLORS.background,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      paddingHorizontal: scale(14),
      paddingTop: verticalScale(10),
      paddingBottom: verticalScale(14),
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
      fontWeight: '800',
    },
    hint: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(12),
      paddingVertical: verticalScale(12),
    },
    tabs: {
      flexDirection: 'row',
      gap: scale(8),
      marginBottom: verticalScale(10),
    },
    tab: {
      paddingHorizontal: scale(14),
      paddingVertical: verticalScale(6),
      borderRadius: scale(14),
      backgroundColor: COLORS.surface || '#151821',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    tabOn: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
    tabText: {
      color: COLORS.textSecondary,
      fontWeight: '700',
      fontSize: moderateScale(12),
    },
    tabTextOn: { color: '#1A0E00' },
    grid: { paddingBottom: verticalScale(8) },
    gridInner: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: scale(8),
    },
    cell: {
      width: '22%',
      minWidth: scale(68),
      aspectRatio: 1,
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: 'rgba(0,0,0,0.2)',
    },
    cellOn: {
      borderColor: COLORS.yellow,
      backgroundColor: 'rgba(245,197,24,0.12)',
    },
    cellLabel: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(9),
      fontWeight: '600',
    },
    cellLabelOn: { color: COLORS.yellow },
  });
}
let styles = makeStyles();
