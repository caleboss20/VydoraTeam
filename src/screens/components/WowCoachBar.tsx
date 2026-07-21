/**
 * Slim first-run coach — matches Settings / Referral card language + yellow CTA.
 */
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useTheme, ThemeColors } from '../Contexts/ThemeContext';

type Props = {
  step: 'captions' | 'export' | 'invite';
  onExport: () => void;
  /** Advance captions → export without leaving the editor. */
  onNext?: () => void;
  onSkip: () => void;
};

export default function WowCoachBar({
  step,
  onExport,
  onNext,
  onSkip,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const copy =
    step === 'captions'
      ? 'Captions are on the clip — play to see them, or tap Next when you’re ready to export.'
      : step === 'export'
        ? 'Looks good? Tap the yellow Export button (top right) or Export now below.'
        : 'Share the file, then invite a friend — you both get Pro days.';

  return (
    <View style={styles.wrap}>
      <View style={styles.steps}>
        <StepDot
          styles={styles}
          label="1"
          active={step === 'captions'}
          done={step !== 'captions'}
        />
        <View style={styles.stepLine} />
        <StepDot
          styles={styles}
          label="2"
          active={step === 'export'}
          done={step === 'invite'}
        />
        <View style={styles.stepLine} />
        <StepDot
          styles={styles}
          label="3"
          active={step === 'invite'}
          done={false}
        />
      </View>
      <Text style={styles.copy}>{copy}</Text>
      <View style={styles.row}>
        {step === 'captions' ? (
          <TouchableOpacity
            style={styles.primary}
            onPress={() => onNext?.()}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-forward" size={16} color={colors.accentOn} />
            <Text style={styles.primaryText}>Next: Export</Text>
          </TouchableOpacity>
        ) : step === 'export' ? (
          <TouchableOpacity
            style={styles.primary}
            onPress={onExport}
            activeOpacity={0.85}
          >
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.accentOn}
            />
            <Text style={styles.primaryText}>Export now</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={onSkip} hitSlop={8}>
          <Text style={styles.skip}>Skip guide</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StepDot({
  styles,
  label,
  active,
  done,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <View
      style={[
        styles.dot,
        active && styles.dotActive,
        done && styles.dotDone,
      ]}
    >
      <Text style={[styles.dotText, (active || done) && styles.dotTextOn]}>
        {done ? '✓' : label}
      </Text>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      marginHorizontal: scale(12),
      marginBottom: verticalScale(8),
      paddingHorizontal: scale(14),
      paddingVertical: verticalScale(12),
      backgroundColor: colors.card,
      borderRadius: moderateScale(12),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    steps: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: verticalScale(8),
    },
    stepLine: {
      flex: 1,
      height: 2,
      backgroundColor: colors.border,
      marginHorizontal: scale(6),
    },
    dot: {
      width: scale(22),
      height: scale(22),
      borderRadius: scale(11),
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    dotDone: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    dotText: {
      fontSize: moderateScale(11),
      fontWeight: '700',
      color: colors.textMuted,
    },
    dotTextOn: { color: colors.accentOn },
    copy: {
      color: colors.textSecondary,
      fontSize: moderateScale(12),
      lineHeight: moderateScale(17),
      marginBottom: verticalScale(10),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: scale(12),
    },
    primary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scale(6),
      backgroundColor: colors.accent,
      borderRadius: moderateScale(12),
      paddingVertical: verticalScale(10),
    },
    primaryText: {
      color: colors.accentOn,
      fontWeight: '800',
      fontSize: moderateScale(13),
    },
    skip: {
      color: colors.textMuted,
      fontSize: moderateScale(12),
      fontWeight: '600',
      paddingHorizontal: scale(4),
    },
  });
}
