/**
 * Referral hub — share your VYD- code, redeem a friend’s, track Pro trial.
 * Matches Settings card rows + InviteMember yellow CTAs.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  TextInput,
  Share,
  Clipboard,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import {
  moderateScale,
  scale,
  verticalScale,
} from 'react-native-size-matters';
import { useTheme, ThemeColors } from '../Contexts/ThemeContext';
import { useAuth } from '../Contexts/Authcontext';
import {
  referralService,
  ReferralStats,
} from '../services/referralService';
import { authService } from '../services/authservice';

export default function ReferralScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { user, applyUserPatch, token } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const inboundCode =
    typeof route.params?.code === 'string'
      ? route.params.code.trim().toUpperCase()
      : '';

  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeemCode, setRedeemCode] = useState(inboundCode);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setStats(null);
      return;
    }
    try {
      const s = await referralService.me();
      setStats(s);
    } catch (e: any) {
      Alert.alert('Referrals', e?.message ?? 'Could not load your invite code.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      if (inboundCode) setRedeemCode(inboundCode);
      setLoading(true);
      void load();
    }, [load, inboundCode])
  );

  const copyCode = () => {
    if (!stats?.code) return;
    Clipboard.setString(stats.code);
    Alert.alert('Copied', `${stats.code} is on your clipboard.`);
  };

  const shareInvite = async () => {
    if (!stats) return;
    const message =
      `Join me on Vydora — collaborative video editing for teams.\n` +
      `Use my code ${stats.code} when you sign up and we both get ${stats.rewardDays} days of Pro.\n` +
      `${stats.webLink}`;
    try {
      await Share.share({ message, url: stats.deepLink });
    } catch {
      /* dismissed */
    }
  };

  const redeem = async () => {
    const code = redeemCode.trim();
    if (!code) {
      Alert.alert('Enter a code', 'Ask your friend for their VYD- invite code.');
      return;
    }
    try {
      setBusy(true);
      await referralService.redeem(code);
      const me = await authService.getMe('');
      await applyUserPatch(me);
      setRedeemCode('');
      await load();
      Alert.alert(
        'You’re in',
        `Pro unlocked for ${stats?.rewardDays ?? 14} days. Your friend got the same reward.`
      );
    } catch (e: any) {
      Alert.alert('Couldn’t apply code', e?.message ?? 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const proLabel = stats?.isPro
    ? stats.proUntil
      ? `Pro until ${new Date(stats.proUntil).toLocaleDateString()}`
      : 'Pro active'
    : 'Free plan';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              setLoading(true);
              void load();
            }}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="arrow-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Invite & earn</Text>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="gift" size={scale(28)} color={colors.accentOn} />
          </View>
          <Text style={styles.heroTitle}>Share Vydora. Unlock Pro.</Text>
          <Text style={styles.heroSub}>
            Friends who join with your code give you both{' '}
            {stats?.rewardDays ?? 14} days of Pro templates & tools — no
            Paystack needed yet.
          </Text>
        </View>

        {!token ? (
          <View style={styles.card}>
            <Text style={styles.inputHint}>
              {inboundCode
                ? `Code ${inboundCode} is ready. Create an account to claim Pro for both of you.`
                : 'Sign in to get your invite code and track friends who join.'}
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: verticalScale(12) }]}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('signup', {
                  referralCode: inboundCode || undefined,
                })
              }
            >
              <Text style={styles.primaryBtnText}>Create account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { marginTop: verticalScale(10) }]}
              onPress={() => navigation.navigate('signin')}
            >
              <Text style={styles.secondaryBtnText}>I already have an account</Text>
            </TouchableOpacity>
          </View>
        ) : loading && !stats ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
        ) : (
          <>
            <Text style={styles.section}>YOUR CODE</Text>
            <View style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.codeRow}
                onPress={copyCode}
              >
                <View>
                  <Text style={styles.codeLabel}>Tap to copy</Text>
                  <Text style={styles.codeValue}>{stats?.code ?? '—'}</Text>
                </View>
                <View style={styles.copyPill}>
                  <Ionicons name="copy-outline" size={16} color={colors.accentOn} />
                  <Text style={styles.copyPillText}>Copy</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.divider} />
              <View style={styles.statRow}>
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{stats?.invitedCount ?? 0}</Text>
                  <Text style={styles.statCap}>Friends joined</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statNum}>
                    {stats?.isPro ? 'PRO' : 'FREE'}
                  </Text>
                  <Text style={styles.statCap}>{proLabel}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() => void shareInvite()}
            >
              <Ionicons name="share-social" size={18} color={colors.accentOn} />
              <Text style={styles.primaryBtnText}>Share invite</Text>
            </TouchableOpacity>

            <Text style={styles.section}>HAVE A CODE?</Text>
            <View style={styles.card}>
              <Text style={styles.inputHint}>
                Already signed up? Paste a friend’s code once.
              </Text>
              <View style={styles.inputRow}>
                <Ionicons
                  name="ticket-outline"
                  size={18}
                  color={colors.textMuted}
                />
                <TextInput
                  style={styles.input}
                  placeholder="VYD-XXXXXX"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  value={redeemCode}
                  onChangeText={setRedeemCode}
                />
              </View>
              <TouchableOpacity
                style={[styles.secondaryBtn, busy && { opacity: 0.5 }]}
                disabled={busy}
                onPress={() => void redeem()}
              >
                {busy ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <Text style={styles.secondaryBtnText}>Apply code</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.section}>RECENT FRIENDS</Text>
            <View style={styles.card}>
              {(stats?.recentFriends?.length ?? 0) === 0 ? (
                <Text style={styles.empty}>
                  No one has used your code yet. Share it after a project export
                  or in WhatsApp.
                </Text>
              ) : (
                stats!.recentFriends.map((f, i) => (
                  <View key={f.userId}>
                    {i > 0 && <View style={styles.divider} />}
                    <View style={styles.friendRow}>
                      <View
                        style={[styles.avatar, { backgroundColor: f.color }]}
                      >
                        <Text style={styles.avatarText}>{f.initials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.friendName}>{f.name}</Text>
                        <Text style={styles.friendMeta}>
                          Joined{' '}
                          {new Date(f.joinedAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.online}
                      />
                    </View>
                  </View>
                ))
              )}
            </View>

            <Text style={styles.footerNote}>
              Signed in as {user?.email ?? 'you'}. Codes are case-insensitive.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingHorizontal: scale(20),
      paddingBottom: verticalScale(48),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: verticalScale(10),
      marginBottom: verticalScale(18),
    },
    headerTitle: {
      color: colors.text,
      fontSize: moderateScale(28),
      fontWeight: '700',
      marginLeft: scale(18),
    },
    hero: {
      backgroundColor: colors.card,
      borderRadius: moderateScale(14),
      padding: scale(18),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginBottom: verticalScale(8),
    },
    heroIcon: {
      width: scale(48),
      height: scale(48),
      borderRadius: scale(14),
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: verticalScale(12),
    },
    heroTitle: {
      color: colors.text,
      fontSize: moderateScale(18),
      fontWeight: '800',
      marginBottom: verticalScale(6),
    },
    heroSub: {
      color: colors.textSecondary,
      fontSize: moderateScale(13),
      lineHeight: moderateScale(19),
    },
    section: {
      color: colors.textMuted,
      fontSize: moderateScale(12),
      fontWeight: '700',
      marginTop: verticalScale(22),
      marginBottom: verticalScale(12),
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: moderateScale(10),
      paddingHorizontal: scale(18),
      paddingVertical: verticalScale(14),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: verticalScale(4),
    },
    codeLabel: {
      color: colors.textMuted,
      fontSize: moderateScale(11),
      fontWeight: '600',
      marginBottom: 4,
    },
    codeValue: {
      color: colors.accent,
      fontSize: moderateScale(26),
      fontWeight: '800',
      letterSpacing: 1,
    },
    copyPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.accent,
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(8),
      borderRadius: scale(20),
    },
    copyPillText: {
      color: colors.accentOn,
      fontWeight: '800',
      fontSize: moderateScale(12),
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: verticalScale(12),
    },
    statRow: { flexDirection: 'row', alignItems: 'center' },
    stat: { flex: 1, alignItems: 'center' },
    statNum: {
      color: colors.text,
      fontSize: moderateScale(20),
      fontWeight: '800',
    },
    statCap: {
      color: colors.textMuted,
      fontSize: moderateScale(11),
      marginTop: 4,
      textAlign: 'center',
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      height: verticalScale(36),
      backgroundColor: colors.border,
    },
    primaryBtn: {
      marginTop: verticalScale(14),
      backgroundColor: colors.accent,
      borderRadius: moderateScale(14),
      paddingVertical: verticalScale(14),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scale(8),
    },
    primaryBtnText: {
      color: colors.accentOn,
      fontWeight: '800',
      fontSize: moderateScale(15),
    },
    inputHint: {
      color: colors.textSecondary,
      fontSize: moderateScale(12),
      marginBottom: verticalScale(10),
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(10),
      backgroundColor: colors.inputBg,
      borderRadius: scale(12),
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(10),
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: moderateScale(15),
      fontWeight: '700',
      letterSpacing: 1,
      padding: 0,
    },
    secondaryBtn: {
      marginTop: verticalScale(12),
      borderWidth: 1.5,
      borderColor: colors.accent,
      borderRadius: moderateScale(12),
      paddingVertical: verticalScale(12),
      alignItems: 'center',
    },
    secondaryBtnText: {
      color: colors.accent,
      fontWeight: '800',
      fontSize: moderateScale(14),
    },
    empty: {
      color: colors.textSecondary,
      fontSize: moderateScale(13),
      lineHeight: moderateScale(18),
      paddingVertical: verticalScale(6),
    },
    friendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(12),
      paddingVertical: verticalScale(6),
    },
    avatar: {
      width: scale(40),
      height: scale(40),
      borderRadius: scale(20),
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: moderateScale(12),
    },
    friendName: {
      color: colors.text,
      fontWeight: '700',
      fontSize: moderateScale(14),
    },
    friendMeta: {
      color: colors.textMuted,
      fontSize: moderateScale(11),
      marginTop: 2,
    },
    footerNote: {
      color: colors.textMuted,
      fontSize: moderateScale(11),
      textAlign: 'center',
      marginTop: verticalScale(24),
    },
  });
}
