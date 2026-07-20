/**
 * App-wide light / dark theme.
 *
 * Settings → Theme toggles `darkMode` here (persisted in the same
 * `vydora:settings` blob as the other preferences).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';

export type ThemeColors = {
  background: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentOn: string; // text/icon on accent buttons
  iconBg: string;
  tabBar: string;
  tabBarBorder: string;
  danger: string;
  online: string;
  inputBg: string;
  overlay: string;
};

export const darkColors: ThemeColors = {
  background: '#13151c',
  surface: '#1e1e1e',
  card: '#1a1a1a',
  border: '#2a2a2a',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#666666',
  accent: '#F5C518',
  accentOn: '#1A0E00',
  iconBg: '#222222',
  tabBar: '#0E0E10',
  tabBarBorder: '#2A2A2E',
  danger: '#E05C5C',
  online: '#25D366',
  inputBg: '#1e1e1e',
  overlay: 'rgba(0,0,0,0.55)',
};

export const lightColors: ThemeColors = {
  background: '#F4F4F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E4E4E7',
  text: '#111111',
  textSecondary: '#52525B',
  textMuted: '#A1A1AA',
  accent: '#E5B800',
  accentOn: '#1A0E00',
  iconBg: '#F0F0F2',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E4E4E7',
  danger: '#DC2626',
  online: '#16A34A',
  inputBg: '#F0F0F2',
  overlay: 'rgba(0,0,0,0.35)',
};

type ThemeContextValue = {
  isDark: boolean;
  colors: ThemeColors;
  setDarkMode: (dark: boolean) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

async function readDarkModePref(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.SETTINGS);
    if (!raw) return true;
    const parsed = JSON.parse(raw) as { darkMode?: boolean };
    return parsed.darkMode !== false;
  } catch {
    return true;
  }
}

async function writeDarkModePref(darkMode: boolean) {
  try {
    const raw = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.SETTINGS);
    const prev = raw ? JSON.parse(raw) : {};
    await AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.SETTINGS,
      JSON.stringify({ ...prev, darkMode })
    );
  } catch (e) {
    console.log('Failed to persist theme', e);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    readDarkModePref().then((dark) => {
      setIsDark(dark);
      setReady(true);
    });
  }, []);

  const setDarkMode = useCallback((dark: boolean) => {
    setIsDark(dark);
    void writeDarkModePref(dark);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      void writeDarkModePref(next);
      return next;
    });
  }, []);

  const colors = isDark ? darkColors : lightColors;

  const value = useMemo(
    () => ({ isDark, colors, setDarkMode, toggleTheme }),
    [isDark, colors, setDarkMode, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {ready ? (
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
      ) : null}
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/**
 * CapCut/editor-shaped palette used by most tool panels
 * (`background` / `surface` / `yellow` / `textPrimary` …).
 */
export type AppPalette = {
  background: string;
  surface: string;
  border: string;
  yellow: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  card: string;
  accentOn: string;
  danger: string;
  inputBg: string;
  iconBg: string;
  overlay: string;
  online: string;
};

export function paletteFromTheme(colors: ThemeColors): AppPalette {
  return {
    background: colors.background,
    surface: colors.surface,
    border: colors.border,
    yellow: colors.accent,
    textPrimary: colors.text,
    textSecondary: colors.textSecondary,
    textMuted: colors.textMuted,
    card: colors.card,
    accentOn: colors.accentOn,
    danger: colors.danger,
    inputBg: colors.inputBg,
    iconBg: colors.iconBg,
    overlay: colors.overlay,
    online: colors.online,
  };
}

/** Hook for screens/panels that expect a COLORS-like object. */
export function useAppPalette(): AppPalette {
  const { colors } = useTheme();
  return useMemo(() => paletteFromTheme(colors), [colors]);
}
