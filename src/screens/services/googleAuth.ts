/**
 * Google Sign-In via Expo AuthSession (ID token → backend /auth/google).
 */
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useEffect } from 'react';
import { CONFIG } from '../config';

WebBrowser.maybeCompleteAuthSession();

export type GoogleAuthReady = {
  /** Opens the Google account picker. Returns null if cancelled / not ready. */
  promptGoogle: () => Promise<string | null>;
  ready: boolean;
  /** Add this URI under Google Cloud → Credentials → Authorized redirect URIs. */
  redirectUri: string;
};

/**
 * Hook for Sign in with Google. Call from Sign-In / Sign-Up screens.
 */
export function useGoogleIdToken(): GoogleAuthReady {
  const redirectUri = makeRedirectUri({
    scheme: 'vydora',
    path: 'redirect',
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: CONFIG.GOOGLE_WEB_CLIENT_ID,
    webClientId: CONFIG.GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  });

  useEffect(() => {
    void WebBrowser.warmUpAsync().catch(() => {});
    return () => {
      void WebBrowser.coolDownAsync().catch(() => {});
    };
  }, []);

  const promptGoogle = async (): Promise<string | null> => {
    if (!request) return null;
    const result = await promptAsync();
    if (result.type !== 'success') return null;
    const idToken =
      result.params?.id_token ??
      (result as { authentication?: { idToken?: string } }).authentication
        ?.idToken;
    return idToken ?? null;
  };

  void response;

  return {
    promptGoogle,
    ready: !!request && !!CONFIG.GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  };
}
