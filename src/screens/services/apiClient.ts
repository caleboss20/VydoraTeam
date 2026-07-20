/**
 * Shared HTTP client for Vydora ↔ Spring Boot.
 *
 * Responsibilities:
 * 1. Prefix every path with `CONFIG.API_BASE`.
 * 2. Attach the access JWT as `Authorization: Bearer <token>`.
 * 3. On HTTP 401, attempt one silent refresh via `/auth/refresh`, then retry.
 * 4. Only clear the session when the refresh token is actually rejected —
 *    never on a network blip (that was kicking users out mid-edit).
 * 5. Parse the backend error envelope: `{ error: { message, code, status } }`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';

type AuthHandlers = {
  /** Called after a successful token refresh so React state stays in sync. */
  onTokensRefreshed: (accessToken: string, refreshToken: string) => void;
  /** Called when refresh fails — AuthContext should wipe user/session. */
  onAuthFailure: () => void;
};

let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;
let handlers: AuthHandlers | null = null;
/** Prevents parallel 401s from all firing refresh at once. */
let refreshInFlight: Promise<'ok' | 'invalid' | 'network'> | null = null;

export function setApiTokens(accessToken: string | null, refreshToken: string | null) {
  memoryAccessToken = accessToken;
  memoryRefreshToken = refreshToken;
}

export function registerAuthHandlers(next: AuthHandlers | null) {
  handlers = next;
}

async function readStoredTokens(): Promise<{ access: string | null; refresh: string | null }> {
  // Prefer memory, but always fill any missing half from disk (access can be
  // set while refresh was never loaded into memory).
  let access = memoryAccessToken;
  let refresh = memoryRefreshToken;
  if (access && refresh) return { access, refresh };

  const [storedAccess, storedRefresh] = await Promise.all([
    AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.TOKEN),
    AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.REFRESH_TOKEN),
  ]);
  access = access ?? storedAccess;
  refresh = refresh ?? storedRefresh;
  memoryAccessToken = access;
  memoryRefreshToken = refresh;
  return { access, refresh };
}

async function persistTokens(accessToken: string, refreshToken: string) {
  memoryAccessToken = accessToken;
  memoryRefreshToken = refreshToken;
  await Promise.all([
    AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.TOKEN, accessToken),
    AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
  ]);
  handlers?.onTokensRefreshed(accessToken, refreshToken);
}

async function clearSession() {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  await Promise.all([
    AsyncStorage.removeItem(CONFIG.ASYNC_STORAGE_KEYS.TOKEN),
    AsyncStorage.removeItem(CONFIG.ASYNC_STORAGE_KEYS.REFRESH_TOKEN),
    AsyncStorage.removeItem(CONFIG.ASYNC_STORAGE_KEYS.USER),
  ]);
  handlers?.onAuthFailure();
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error?.message || body?.message || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

/**
 * Exchange the refresh token for a new access/refresh pair.
 * Backend refresh tokens are single-use — always store the new pair.
 *
 * Returns:
 *  - true  → new tokens stored
 *  - false → refresh rejected (session cleared) OR transient network error
 *            (session kept — caller should NOT treat as "signed out")
 */
async function tryRefresh(): Promise<'ok' | 'invalid' | 'network'> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async (): Promise<'ok' | 'invalid' | 'network'> => {
    const { refresh } = await readStoredTokens();
    if (!refresh) {
      await clearSession();
      return 'invalid';
    }
    try {
      const res = await fetch(`${CONFIG.API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) {
        // Only wipe session when the server says the refresh token is dead.
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          await clearSession();
          return 'invalid';
        }
        // 5xx / 429 — keep the user signed in; they'll retry later.
        return 'network';
      }
      const data = await res.json();
      if (!data.accessToken || !data.refreshToken) {
        await clearSession();
        return 'invalid';
      }
      await persistTokens(data.accessToken, data.refreshToken);
      return 'ok';
    } catch {
      // Offline / Wi‑Fi blip — do NOT force re-login.
      return 'network';
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export type ApiRequestOptions = RequestInit & {
  /** Skip Authorization header (login/register/refresh). */
  skipAuth?: boolean;
  /** Do not attempt refresh+retry on 401 (used by refresh itself). */
  skipRefresh?: boolean;
};

/**
 * Perform a JSON (or multipart) request against the Spring Boot API.
 * `path` must start with `/` and must NOT include `/api/v1`.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { skipAuth, skipRefresh, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders || {});

  if (!skipAuth) {
    const { access } = await readStoredTokens();
    if (access) headers.set('Authorization', `Bearer ${access}`);
  }

  // Don't force JSON content-type on FormData uploads — fetch sets the boundary.
  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;
  if (rest.body && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  const timeoutMs = 25_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    res = await fetch(`${CONFIG.API_BASE}${path}`, {
      ...rest,
      headers,
      signal: rest.signal ?? controller.signal,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error(
        `Request timed out talking to ${CONFIG.API_BASE}. ` +
          'Make sure the backend is running and reachable from your phone.'
      );
    }
    throw new Error(
      `Cannot reach the Vydora API at ${CONFIG.API_BASE}. ` +
        'Make sure the backend is running, your phone is on the same Wi‑Fi, ' +
        'and EXPO_PUBLIC_API_BASE uses your computer’s LAN IP (not localhost).'
    );
  } finally {
    clearTimeout(timer);
  }

  // Only 401 means "access JWT expired/missing". Real 403 FORBIDDEN must not
  // burn the single-use refresh token or kick the user out.
  if (res.status === 401 && !skipAuth && !skipRefresh) {
    const outcome = await tryRefresh();
    if (outcome === 'ok') {
      return apiRequest<T>(path, { ...options, skipRefresh: true });
    }
    if (outcome === 'invalid') {
      throw new Error('Session expired. Please sign in again.');
    }
    // Network hiccup during refresh — keep session, surface a soft error.
    throw new Error(
      'Connection dropped while renewing your session. Check Wi‑Fi and try again — you are still signed in.'
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
