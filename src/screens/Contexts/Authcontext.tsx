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
// ─── Context Type ─────────────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoadingAuth: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
// ─── Context ─────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);
// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // rehydrate on app launch
  useEffect(() => {
    const rehydrate = async () => {
      try {
        const savedToken = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.TOKEN);
        const savedUser = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.USER);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (e) {
        console.log('Rehydration failed', e);
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
      await AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.TOKEN, result.token);
      await AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.USER, JSON.stringify(result.user));
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
      await AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.TOKEN, result.token);
      await AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.USER, JSON.stringify(result.user));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoadingAuth(false);
    }
  };
  const logout = async () => {
    try {
      if (token) await authService.logout(token);
      setUser(null);
      setToken(null);
      await AsyncStorage.removeItem(CONFIG.ASYNC_STORAGE_KEYS.TOKEN);
      await AsyncStorage.removeItem(CONFIG.ASYNC_STORAGE_KEYS.USER);
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoadingAuth,
      error,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
// ─── Hook ────────────────────────────────────────────────────────────────────
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}