/**
 * One-time profile setup after onboarding (avatar + display name).
 *
 * Uses an opt-in "required" flag set on fresh signup so existing installs
 * aren't forced through the new screen.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';

const PROFILE_SETUP_REQUIRED_KEY = 'vydora:profileSetup:required';

export async function isProfileSetupRequired(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PROFILE_SETUP_REQUIRED_KEY)) === 'true';
  } catch {
    return false;
  }
}

/** Call on new signup so the user hits ProfileSetup after onboarding. */
export async function requireProfileSetup(): Promise<void> {
  await AsyncStorage.setItem(PROFILE_SETUP_REQUIRED_KEY, 'true');
}

export async function markProfileSetupDone(): Promise<void> {
  await AsyncStorage.removeItem(PROFILE_SETUP_REQUIRED_KEY);
}

/** Alias used when resetting a fresh account. */
export async function resetProfileSetupGate(): Promise<void> {
  await requireProfileSetup();
}

/**
 * Where a signed-in user should land after auth/onboarding.
 * Invite tokens still win; then onboarding → profile setup → dashboard.
 */
export async function resolvePostAuthRoute(opts?: {
  needsOnboarding?: boolean;
  pendingInviteToken?: string | null;
}): Promise<{ name: string; params?: Record<string, unknown> }> {
  const pending =
    opts?.pendingInviteToken ??
    (await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.PENDING_INVITE_TOKEN));
  if (pending) {
    return { name: 'AcceptInvite', params: { token: pending } };
  }

  const onboardingDone = await AsyncStorage.getItem('vydora:onboarding:done');
  if (opts?.needsOnboarding || !onboardingDone) {
    return { name: 'onboarding' };
  }

  if (await isProfileSetupRequired()) {
    return { name: 'profilesetup' };
  }

  return { name: 'projects' };
}
