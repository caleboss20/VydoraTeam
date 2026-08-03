/**
 * AcceptInviteScreen — hybrid invite (link always works).
 *
 * States from invite-preview:
 *   LOGIN_REQUIRED / CAN_ACCEPT / ALREADY_ACTIVE /
 *   JOIN_REQUEST_PENDING / CAN_REQUEST_JOIN / NOT_FOUND
 */
import React, { useEffect, useMemo } from 'react';
import { useTheme, ThemeColors } from '../Contexts/ThemeContext';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { s, vs, ms } from 'react-native-size-matters';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInvite } from '../Contexts/InviteContext';
import { useAuth } from '../Contexts/Authcontext';
import { CONFIG } from '../config';
import { useProject } from '../Contexts/projectContext';

const GOLD = '#F5C518';
type AcceptInviteRouteParams = {
  AcceptInvite: { token: string };
};

export default function AcceptInviteScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const route = useRoute<RouteProp<AcceptInviteRouteParams, 'AcceptInvite'>>();
  const navigation = useNavigation<any>();
  const { fetchProjects } = useProject();

  const { token } = route.params;
  const {
    currentInvite,
    isLoading,
    error,
    loadInviteByToken,
    acceptInvite,
    declineInvite,
    requestJoin,
  } = useInvite();
  const { user, token: authToken, isLoadingAuth, logout } = useAuth();
  const isAuthenticated = !!user && !!authToken;

  useEffect(() => {
    void loadInviteByToken(token);
  }, [token, authToken]);

  useEffect(() => {
    if (currentInvite && !isAuthenticated && !isLoadingAuth) {
      AsyncStorage.setItem(
        CONFIG.ASYNC_STORAGE_KEYS.PENDING_INVITE_TOKEN,
        token
      ).catch(() => undefined);
    }
  }, [currentInvite, isAuthenticated, isLoadingAuth, token]);

  async function openProject(projectId: string) {
    await fetchProjects();
    await AsyncStorage.removeItem(
      CONFIG.ASYNC_STORAGE_KEYS.PENDING_INVITE_TOKEN
    ).catch(() => undefined);
    // ProjectDetail / dashboard hydrate from id after fetchProjects.
    navigation.reset({
      index: 0,
      routes: [{ name: 'ProjectDetail', params: { projectId } }],
    });
  }

  async function handleAccept() {
    const projectId = await acceptInvite(token);
    if (projectId) await openProject(projectId);
  }

  async function handleDecline() {
    await declineInvite(token);
    navigation.navigate('projects');
  }

  async function handleRequestJoin() {
    const ok = await requestJoin(token);
    if (ok) {
      Alert.alert(
        'Request sent',
        'The project Owner will Admit or Decline — like Zoom’s waiting room. You’ll get a notification either way.'
      );
    }
  }

  async function handleSwitchAccount() {
    await AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.PENDING_INVITE_TOKEN,
      token
    ).catch(() => undefined);
    try {
      await logout?.();
    } catch {
      /* ignore */
    }
    navigation.navigate('signin', {
      pendingInviteToken: token,
      prefillEmail: currentInvite?.inviteeEmail,
    });
  }

  if ((isLoading || isLoadingAuth) && !currentInvite) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      </SafeAreaView>
    );
  }

  if ((error && !currentInvite) || currentInvite?.state === 'NOT_FOUND') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons
            name="alert-circle-outline"
            size={ms(48)}
            color={colors.textSecondary}
          />
          <Text style={styles.errorText}>
            This invite link is invalid or has expired.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('projects')}
            style={{ marginTop: vs(16) }}
          >
            <Text style={styles.linkText}>Back to projects</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentInvite) return null;

  const state = currentInvite.state || 'LOGIN_REQUIRED';
  const alreadyResolved =
    currentInvite.status === 'accepted' ||
    currentInvite.status === 'declined' ||
    state === 'ALREADY_ACTIVE';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={{ uri: currentInvite.projectThumbnailUrl }}
          style={styles.thumbnail}
        />
        <Text style={styles.projectName}>{currentInvite.projectName}</Text>
        <View style={styles.inviterRow}>
          <Ionicons name="person-circle-outline" size={ms(20)} color={GOLD} />
          <Text style={styles.inviterText}>
            {currentInvite.inviterName} invited you as
          </Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{currentInvite.role}</Text>
        </View>

        {currentInvite.message ? (
          <View style={styles.messageBox}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={ms(18)}
              color={colors.textSecondary}
            />
            <Text style={styles.messageText}>{currentInvite.message}</Text>
          </View>
        ) : null}

        {isAuthenticated && user?.email ? (
          <Text style={styles.signedInAs}>
            Signed in as {user.email}
          </Text>
        ) : null}

        {error ? <Text style={styles.inlineError}>{error}</Text> : null}

        {alreadyResolved || state === 'ALREADY_ACTIVE' ? (
          <View style={styles.actions}>
            <Text style={styles.resolvedText}>
              {currentInvite.status === 'declined'
                ? "You've already declined this invite."
                : "You're on this project."}
            </Text>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => void openProject(currentInvite.projectId)}
              activeOpacity={0.85}
            >
              <Text style={styles.acceptButtonText}>Open project</Text>
            </TouchableOpacity>
          </View>
        ) : state === 'JOIN_REQUEST_PENDING' ? (
          <View style={styles.actions}>
            <View style={styles.waitingCard}>
              <Ionicons name="hourglass-outline" size={ms(22)} color={GOLD} />
              <Text style={styles.waitingTitle}>Waiting for Owner</Text>
              <Text style={styles.waitingBody}>
                Your join request is in the admit queue. You’ll get a
                notification when they Admit or Decline.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('projects')}
              activeOpacity={0.6}
            >
              <Text style={styles.declineText}>Back to projects</Text>
            </TouchableOpacity>
          </View>
        ) : state === 'CAN_REQUEST_JOIN' && isAuthenticated ? (
          <View style={styles.actions}>
            <View style={styles.mismatchCard}>
              <Ionicons
                name="swap-horizontal-outline"
                size={ms(22)}
                color={GOLD}
              />
              <Text style={styles.mismatchTitle}>Different account</Text>
              <Text style={styles.mismatchBody}>
                This link works for any teammate. Request to join with{' '}
                <Text style={{ color: colors.text, fontWeight: '700' }}>
                  {user?.email}
                </Text>
                , or switch to the invited account.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => void handleRequestJoin()}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#111" />
              ) : (
                <Text style={styles.acceptButtonText}>
                  Request to join as Editor
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void handleSwitchAccount()}
              activeOpacity={0.6}
            >
              <Text style={styles.declineText}>Switch account</Text>
            </TouchableOpacity>
          </View>
        ) : !isAuthenticated || state === 'LOGIN_REQUIRED' ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() =>
                navigation.navigate('signup', {
                  prefillEmail: currentInvite?.inviteeEmail,
                  pendingInviteToken: token,
                })
              }
              activeOpacity={0.85}
            >
              <Text style={styles.acceptButtonText}>Sign Up to Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('signin', {
                  prefillEmail: currentInvite?.inviteeEmail,
                  pendingInviteToken: token,
                })
              }
              activeOpacity={0.6}
            >
              <Text style={styles.declineText}>
                Already have an account? Log in
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => void handleAccept()}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#111" />
              ) : (
                <Text style={styles.acceptButtonText}>Accept invite</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void handleDecline()}
              disabled={isLoading}
              activeOpacity={0.6}
            >
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: s(24),
    },
    content: {
      flex: 1,
      paddingHorizontal: s(20),
      paddingTop: vs(24),
    },
    thumbnail: {
      width: '100%',
      height: vs(160),
      borderRadius: ms(14),
      backgroundColor: c.surface,
    },
    projectName: {
      color: c.text,
      fontSize: ms(22),
      fontWeight: '800',
      marginTop: vs(18),
    },
    inviterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(6),
      marginTop: vs(10),
    },
    inviterText: { color: c.textSecondary, fontSize: ms(14) },
    roleBadge: {
      alignSelf: 'flex-start',
      marginTop: vs(12),
      backgroundColor: 'rgba(245,197,24,0.15)',
      paddingHorizontal: s(12),
      paddingVertical: vs(6),
      borderRadius: ms(20),
    },
    roleBadgeText: {
      color: GOLD,
      fontWeight: '700',
      fontSize: ms(12),
      letterSpacing: 0.4,
    },
    messageBox: {
      flexDirection: 'row',
      gap: s(8),
      marginTop: vs(16),
      backgroundColor: c.surface,
      borderRadius: ms(12),
      padding: s(12),
    },
    messageText: { flex: 1, color: c.textSecondary, fontSize: ms(13), lineHeight: 18 },
    signedInAs: {
      marginTop: vs(14),
      color: c.textMuted,
      fontSize: ms(12),
    },
    inlineError: {
      marginTop: vs(10),
      color: c.danger,
      fontSize: ms(13),
    },
    actions: { marginTop: vs(28), gap: vs(14) },
    acceptButton: {
      backgroundColor: GOLD,
      borderRadius: ms(12),
      paddingVertical: vs(14),
      alignItems: 'center',
    },
    acceptButtonText: {
      color: '#111',
      fontWeight: '800',
      fontSize: ms(15),
    },
    declineText: {
      color: c.textSecondary,
      textAlign: 'center',
      fontSize: ms(14),
      fontWeight: '600',
    },
    linkText: { color: GOLD, fontWeight: '700', fontSize: ms(14) },
    errorText: {
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: vs(12),
      fontSize: ms(14),
      lineHeight: 20,
    },
    resolvedText: {
      color: c.textSecondary,
      textAlign: 'center',
      fontSize: ms(14),
      marginBottom: vs(4),
    },
    mismatchCard: {
      backgroundColor: c.surface,
      borderRadius: ms(14),
      padding: s(16),
      gap: vs(8),
      alignItems: 'center',
      marginBottom: vs(4),
    },
    mismatchTitle: {
      color: c.text,
      fontWeight: '800',
      fontSize: ms(16),
    },
    mismatchBody: {
      color: c.textSecondary,
      textAlign: 'center',
      fontSize: ms(13),
      lineHeight: 19,
    },
    waitingCard: {
      backgroundColor: c.surface,
      borderRadius: ms(14),
      padding: s(16),
      gap: vs(8),
      alignItems: 'center',
      marginBottom: vs(8),
    },
    waitingTitle: {
      color: c.text,
      fontWeight: '800',
      fontSize: ms(16),
    },
    waitingBody: {
      color: c.textSecondary,
      textAlign: 'center',
      fontSize: ms(13),
      lineHeight: 19,
    },
  });
}
