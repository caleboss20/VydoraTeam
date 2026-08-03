/**
 * Owner admit modal — Viewer requested Editor access.
 */
import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import type { RoleUpgradePush } from '../socket/userNotificationSocket';
import { useTheme, ThemeColors } from '../Contexts/ThemeContext';

interface Props {
  visible: boolean;
  request: RoleUpgradePush | null;
  busy?: boolean;
  onAdmit: () => void;
  onDecline: () => void;
  onDismiss: () => void;
}

export default function RoleUpgradeApprovalModal({
  visible,
  request,
  busy = false,
  onAdmit,
  onDecline,
  onDismiss,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (!request) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark" size={scale(28)} color={colors.accent} />
          </View>
          <Text style={styles.title}>Grant Editor access?</Text>
          <Text style={styles.body}>
            <Text style={styles.strong}>{request.requestedByName}</Text>
            {' is a Viewer on '}
            <Text style={styles.strong}>{request.projectTitle}</Text>
            {' and wants to become an '}
            <Text style={styles.strong}>{request.requestedRole || 'Editor'}</Text>
            .
          </Text>
          <Text style={styles.hint}>
            Editors can cut, add text/overlays, and export. Only the Owner can approve.
          </Text>

          {busy ? (
            <ActivityIndicator color={colors.accent} style={{ marginVertical: verticalScale(16) }} />
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.declineBtn} onPress={onDecline} activeOpacity={0.85}>
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.admitBtn} onPress={onAdmit} activeOpacity={0.85}>
                <Ionicons name="checkmark" size={scale(16)} color={colors.accentOn} />
                <Text style={styles.admitText}>Grant Editor</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={onDismiss} hitSlop={8} style={styles.later}>
            <Text style={styles.laterText}>Decide later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      paddingHorizontal: scale(24),
    },
    card: {
      backgroundColor: c.card,
      borderRadius: scale(16),
      borderWidth: 1,
      borderColor: c.border,
      padding: scale(20),
    },
    iconWrap: {
      width: scale(52),
      height: scale(52),
      borderRadius: scale(26),
      backgroundColor: 'rgba(245,197,24,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: verticalScale(12),
    },
    title: {
      color: c.text,
      fontSize: moderateScale(18),
      fontWeight: '700',
      marginBottom: verticalScale(8),
    },
    body: {
      color: c.textSecondary,
      fontSize: moderateScale(14),
      lineHeight: moderateScale(21),
    },
    strong: { color: c.text, fontWeight: '700' },
    hint: {
      color: c.textMuted,
      fontSize: moderateScale(11),
      marginTop: verticalScale(10),
    },
    actions: {
      flexDirection: 'row',
      gap: scale(10),
      marginTop: verticalScale(18),
    },
    declineBtn: {
      flex: 1,
      borderRadius: scale(10),
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: verticalScale(12),
      alignItems: 'center',
    },
    declineText: { color: c.danger, fontWeight: '700', fontSize: moderateScale(13) },
    admitBtn: {
      flex: 1,
      flexDirection: 'row',
      gap: scale(6),
      backgroundColor: c.accent,
      borderRadius: scale(10),
      paddingVertical: verticalScale(12),
      alignItems: 'center',
      justifyContent: 'center',
    },
    admitText: { color: c.accentOn, fontWeight: '800', fontSize: moderateScale(13) },
    later: { alignItems: 'center', marginTop: verticalScale(14) },
    laterText: { color: c.textMuted, fontSize: moderateScale(12) },
  });
}
