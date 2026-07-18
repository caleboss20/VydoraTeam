/**
 * Shared HTTP client for Vydora ↔ Spring Boot.
 *
 * Responsibilities:
 * 1. Prefix every path with `CONFIG.API_BASE`.
 * 2. Attach the access JWT as `Authorization: Bearer <token>`.
 * 3. On HTTP 401, attempt one silent refresh via `/auth/refresh`, then retry.
 * 4. If refresh fails, clear session and notify AuthContext so the user re-logs in.
 * 5. Parse the backend error envelope: `{ error: { message, code, status } }`.
 *
 * Screens and contexts should keep calling services; only this module talks HTTP.
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
let refreshInFlight: Promise<boolean> | null = null;

export function setApiTokens(accessToken: string | null, refreshToken: string | null) {
  memoryAccessToken = accessToken;
  memoryRefreshToken = refreshToken;
}

export function registerAuthHandlers(next: AuthHandlers | null) {
  handlers = next;
}

async function readStoredTokens(): Promise<{ access: string | null; refresh: string | null }> {
  if (memoryAccessToken || memoryRefreshToken) {
    return { access: memoryAccessToken, refresh: memoryRefreshToken };
  }
  const [access, refresh] = await Promise.all([
    AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.TOKEN),
    AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.REFRESH_TOKEN),
  ]);
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
 */
async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const { refresh } = await readStoredTokens();
    if (!refresh) {
      await clearSession();
      return false;
    }
    try {
      const res = await fetch(`${CONFIG.API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) {
        await clearSession();
        return false;
      }
      const data = await res.json();
      if (!data.accessToken || !data.refreshToken) {
        await clearSession();
        return false;
      }
      await persistTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      await clearSession();
      return false;
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

  const res = await fetch(`${CONFIG.API_BASE}${path}`, {
    ...rest,
    headers,
  });

  if (res.status === 401 && !skipAuth && !skipRefresh) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, skipRefresh: true });
    }
    throw new Error('Session expired. Please sign in again.');
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
