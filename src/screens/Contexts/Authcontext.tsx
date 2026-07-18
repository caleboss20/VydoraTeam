/**
 * AuthContext — session owner for the whole app.
 *
 * Responsibilities:
 * - Persist access + refresh tokens and the mapped User in AsyncStorage.
 * - Rehydrate on launch, then validate with GET /auth/me when online.
 * - Register apiClient handlers so silent refresh updates React state, and
 *   failed refresh clears the session (user returns to sign-in).
 * - Keep exporting `token` as the **access** JWT so existing screens/contexts
 *   that call `useAuth().token` need no UI changes.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { authService } from '../services/authservice';
import { CONFIG } from '../config';
import {
  registerAuthHandlers,
  setApiTokens,
} from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  /** Access JWT (Authorization: Bearer …). */
  token: string | null;
  isLoadingAuth: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function persistSession(
  user: User,
  accessToken: string,
  refreshToken: string
) {
  setApiTokens(accessToken, refreshToken);
  await Promise.all([
    AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.TOKEN, accessToken),
    AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
    AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.USER, JSON.stringify(user)),
  ]);
}

async function clearPersistedSession() {
  setApiTokens(null, null);
  await Promise.all([
    AsyncStorage.removeItem(CONFIG.ASYNC_STORAGE_KEYS.TOKEN),
    AsyncStorage.removeItem(CONFIG.ASYNC_STORAGE_KEYS.REFRESH_TOKEN),
    AsyncStorage.removeItem(CONFIG.ASYNC_STORAGE_KEYS.USER),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep apiClient ↔ React state in sync for refresh / forced logout.
  useEffect(() => {
    registerAuthHandlers({
      onTokensRefreshed: (access, refresh) => {
        setToken(access);
        setRefreshToken(refresh);
      },
      onAuthFailure: () => {
        setUser(null);
        setToken(null);
        setRefreshToken(null);
      },
    });
    return () => registerAuthHandlers(null);
  }, []);

  // Cold start: restore tokens, then confirm with /auth/me.
  useEffect(() => {
    const rehydrate = async () => {
      try {
        const [savedToken, savedRefresh, savedUser] = await Promise.all([
          AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.TOKEN),
          AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.REFRESH_TOKEN),
          AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.USER),
        ]);

        if (!savedToken || !savedUser) {
          return;
        }

        setToken(savedToken);
        setRefreshToken(savedRefresh);
        setUser(JSON.parse(savedUser));
        setApiTokens(savedToken, savedRefresh);

        if (!CONFIG.USE_MOCK) {
          try {
            const me = await authService.getMe(savedToken);
            setUser(me);
            await AsyncStorage.setItem(
              CONFIG.ASYNC_STORAGE_KEYS.USER,
              JSON.stringify(me)
            );
          } catch {
            // Access may be expired — apiClient will refresh on the next call,
            // or clear the session if the refresh token is also dead.
          }
        }
      } catch (e) {
        console.log('Auth rehydration failed', e);
      } finally {
        setIsLoadingAuth(false);
      }
    };
    rehydrate();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoadingAuth(true);
      setError(null);
      const result = await authService.login(email, password);
      setUser(result.user);
      setToken(result.token);
      setRefreshToken(result.refreshToken);
      await persistSession(result.user, result.token, result.refreshToken);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      setIsLoadingAuth(true);
      setError(null);
      const result = await authService.register(name, email, password);
      setUser(result.user);
      setToken(result.token);
      setRefreshToken(result.refreshToken);
      await persistSession(result.user, result.token, result.refreshToken);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    try {
      if (token && refreshToken) {
        await authService.logout(token, refreshToken);
      }
    } catch (e: any) {
      // Still clear local session even if revoke fails (network blip, etc.).
      console.log('Logout revoke failed', e?.message);
    } finally {
      setUser(null);
      setToken(null);
      setRefreshToken(null);
      await clearPersistedSession();
    }
  };

  /**
   * Local profile patch (name/avatar for UI).
   * Backend has no update-profile endpoint yet — only AsyncStorage is updated.
   */
  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    try {
      setError(null);
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      await AsyncStorage.setItem(
        CONFIG.ASYNC_STORAGE_KEYS.USER,
        JSON.stringify(updatedUser)
      );
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoadingAuth,
        error,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
