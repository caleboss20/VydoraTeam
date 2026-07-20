// AcceptInviteScreen.tsx
// Invitee-side screen. Reached via deep link vydora://invite/:token.
// Matches existing dark background + gold accent (#F5C518) visual theme.
//
// FLOW OVERVIEW for whoever taps the invite link:
//   1. Link opens app -> React Navigation's `linking` config routes here,
//      pulling the token out of the URL into route.params.token.
//   2. On mount, we fetch the invite details for that token (project name,
//      who invited them, what role) so we have something to show regardless
//      of whether they're logged in yet.
//   3. If they're NOT logged in: we don't assume new vs. existing user —
//      show both "Sign Up to Accept" and "Already have an account? Log in",
//      each carrying the token forward (route params + AsyncStorage backup
//      in case the app gets killed mid-flow, e.g. during email verification).
//   4. If they ARE logged in: tapping Accept calls acceptInvite() for real
//      and drops them straight into the project.
import React, { useEffect, useMemo } from 'react';
import { useTheme, ThemeColors } from "../Contexts/ThemeContext";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
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
  const { colors, isDark } = useTheme();
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
  } = useInvite();
  const { user, token: authToken, isLoadingAuth } = useAuth();
  const isAuthenticated = !!user && !!authToken;
  // Step 2: always fetch the invite details on mount, regardless of auth
  // state — lets us show "Kel invited you to Summer Campaign Edit" even
  // before we know if this person has an account.
  
  useEffect(() => {
    loadInviteByToken(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);


  // Safety net for the logged-out case: if the app gets killed while the
  // invitee is on signup/signin (e.g. they leave to check an OTP email),
  // route params are lost on relaunch. Stashing the token in AsyncStorage
  // means Signupscreen / SignInscreen can still recover it afterward.

  useEffect(() => {
    if (currentInvite && !isAuthenticated && !isLoadingAuth) {
      AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.PENDING_INVITE_TOKEN, token).catch(() => {});
    }
  }, [currentInvite, isAuthenticated, isLoadingAuth, token]);


    
async function handleAccept() {
  // Only reachable when isAuthenticated is already true — the JSX below
    // routes logged-out invitees to signup/signin instead of calling this.
  const projectId = await acceptInvite(token);
  if (projectId) {
    // Clean up the stashed token now that it's been used — otherwise a
      // future unrelated signup/login could pick up a stale pending invite.
    await fetchProjects(); // refresh the dashboard's project list before they can navigate there
    await AsyncStorage.removeItem(CONFIG.ASYNC_STORAGE_KEYS.PENDING_INVITE_TOKEN).catch(() => {});
    navigation.reset({
      index: 0,
      routes: [{ name: 'ProjectDetail', params: { projectId } }],
    });
  }
}


  async function handleDecline() {
    await declineInvite(token);
    navigation.navigate('projects');
  }


  // Covers both "fetching the invite" and "rehydrating auth state" —
  // without isLoadingAuth here, there'd be a flash where isAuthenticated
  // reads as false before AuthContext finishes checking AsyncStorage.



  if ((isLoading || isLoadingAuth) && !currentInvite) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      </SafeAreaView>
    );
  }
  if (error && !currentInvite) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={ms(48)} color={colors.textSecondary} />
          <Text style={styles.errorText}>This invite link is invalid or has expired.</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!currentInvite) {
    return null;
  }
  const alreadyResolved =
    currentInvite.status === 'accepted' || currentInvite.status === 'declined';
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
            <Ionicons name="chatbubble-ellipses-outline" size={ms(18)} color={colors.textSecondary} />
            <Text style={styles.messageText}>{currentInvite.message}</Text>
          </View>
        ) : null}
        {alreadyResolved ? (
          <View style={styles.centered}>
            <Text style={styles.resolvedText}>
              {currentInvite.status === 'accepted'
                ? "You've already accepted this invite."
                : "You've already declined this invite."}
            </Text>
          </View>
        ) : !isAuthenticated ? (
          // Logged-out invitee: don't assume new vs. existing user — offer both paths.
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
              <Text style={styles.declineText}>Already have an account? Log in</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Logged-in invitee: real accept/decline
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAccept}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={styles.acceptButtonText}>Accept Invite</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDecline}
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
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
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
    height: vs(180),
    borderRadius: ms(12),
    backgroundColor: '#1E1E1E',
  },
  projectName: {
    color: '#FFFFFF',
    fontSize: ms(22),
    fontWeight: '700',
    marginTop: vs(16),
  },
  inviterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: vs(10),
  },
  inviterText: {
    color: '#B3B3B3',
    fontSize: ms(14),
    marginLeft: s(6),
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 197, 24, 0.12)',
    borderRadius: ms(8),
    paddingHorizontal: s(12),
    paddingVertical: vs(4),
    marginTop: vs(10),
    borderWidth: 1,
    borderColor: GOLD,
  },
  roleBadgeText: {
    color: GOLD,
    fontSize: ms(13),
    fontWeight: '600',
  },
  messageBox: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: ms(10),
    padding: s(14),
    marginTop: vs(18),
  },
  messageText: {
    color: '#D4D4D4',
    fontSize: ms(14),
    marginLeft: s(8),
    flex: 1,
    lineHeight: ms(20),
  },
  actions: {
    marginTop: vs(32),
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: GOLD,
    width: '100%',
    paddingVertical: vs(14),
    borderRadius: ms(10),
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#000000',
    fontSize: ms(16),
    fontWeight: '700',
  },
  declineText: {
    color: '#8A8A8A',
    fontSize: ms(14),
    marginTop: vs(16),
  },
  errorText: {
    color: '#B3B3B3',
    fontSize: ms(15),
    marginTop: vs(12),
    textAlign: 'center',
  },
  resolvedText: {
    color: '#8A8A8A',
    fontSize: ms(14),
    textAlign: 'center',
  },
});
}
