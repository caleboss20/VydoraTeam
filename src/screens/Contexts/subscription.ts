/**
 * Soft Pro subscription gate.
 *
 * Until Paystack is wired, `devUnlockPro` in Settings unlocks premium
 * templates / future Pro features for demos. Real billing will flip
 * `user.plan === 'pro'` from the backend and this still works.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';
import { useAuth } from '../Contexts/Authcontext';

const DEV_UNLOCK_KEY = 'vydora:devUnlockPro';

export type AppSettingsLite = {
  darkMode?: boolean;
  devUnlockPro?: boolean;
};

async function readDevUnlock(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.SETTINGS);
    if (!raw) {
      const legacy = await AsyncStorage.getItem(DEV_UNLOCK_KEY);
      return legacy === '1';
    }
    const parsed = JSON.parse(raw) as AppSettingsLite;
    return parsed.devUnlockPro === true;
  } catch {
    return false;
  }
}

export async function setDevUnlockPro(unlocked: boolean): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.SETTINGS);
    const prev = raw ? JSON.parse(raw) : {};
    await AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.SETTINGS,
      JSON.stringify({ ...prev, devUnlockPro: unlocked })
    );
    await AsyncStorage.setItem(DEV_UNLOCK_KEY, unlocked ? '1' : '0');
  } catch (e) {
    console.log('Failed to persist Pro unlock', e);
  }
}

export function useIsPro(): {
  isPro: boolean;
  ready: boolean;
  refresh: () => void;
} {
  const { user } = useAuth();
  const [devUnlock, setDevUnlock] = useState(false);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    readDevUnlock().then((v) => {
      setDevUnlock(v);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Backend plan / referral Pro — tolerate several shapes.
  const plan =
    (user as { plan?: string; subscription?: string; isPro?: boolean } | null)
      ?.plan ||
    (user as { subscription?: string } | null)?.subscription;
  const proUntil = (user as { proUntil?: string } | null)?.proUntil;
  const proUntilActive =
    !!proUntil && !Number.isNaN(Date.parse(proUntil)) && Date.parse(proUntil) > Date.now();
  const flaggedPro =
    (user as { isPro?: boolean } | null)?.isPro === true ||
    plan === 'pro' ||
    plan === 'PRO' ||
    plan === 'premium' ||
    proUntilActive;

  return {
    isPro: flaggedPro || devUnlock,
    ready,
    refresh,
  };
}
