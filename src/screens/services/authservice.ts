/**
 * Auth service — maps to `POST/GET /api/v1/auth/*`.
 *
 * Backend AuthResponse shape:
 *   { accessToken, refreshToken, accessTokenExpiresInMs, userId, name, email }
 *
 * We still return `{ user, token, refreshToken }` so AuthContext can persist
 * both tokens while screens keep using `token` as the access JWT.
 */
import { CONFIG } from '../config';
import { User } from '../types';
import { apiRequest, setApiTokens } from './apiClient';
import { mapAuthUser } from './mappers';

export type AuthSession = {
  user: User;
  /** Access JWT — same meaning as AuthContext.token. */
  token: string;
  refreshToken: string;
};

type AuthResponseDto = {
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresInMs: number;
  userId: string;
  name: string;
  email: string;
};

function sessionFromAuthResponse(data: AuthResponseDto): AuthSession {
  if (!data.accessToken || !data.refreshToken) {
    throw new Error('Auth response missing tokens');
  }
  const user = mapAuthUser(data);
  setApiTokens(data.accessToken, data.refreshToken);
  return {
    user,
    token: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

export const authService = {
  /** Sign in — public endpoint (no Bearer). */
  login: async (email: string, password: string): Promise<AuthSession> => {
    if (CONFIG.USE_MOCK) {
      throw new Error('Mock auth is disabled. Use the real API (CONFIG.USE_MOCK = false).');
    }
    const data = await apiRequest<AuthResponseDto>('/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ email, password }),
    });
    return sessionFromAuthResponse(data);
  },

  /** Register — returns the same token pair as login. */
  register: async (
    name: string,
    email: string,
    password: string
  ): Promise<AuthSession> => {
    if (CONFIG.USE_MOCK) {
      throw new Error('Mock auth is disabled. Use the real API (CONFIG.USE_MOCK = false).');
    }
    const data = await apiRequest<AuthResponseDto>('/auth/register', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ name, email, password }),
    });
    return sessionFromAuthResponse(data);
  },

  /**
   * Revoke the refresh token server-side.
   * Body: `{ refreshToken }`. Also requires a valid access JWT.
   */
  logout: async (accessToken: string, refreshToken: string): Promise<void> => {
    if (CONFIG.USE_MOCK) return;
    try {
      setApiTokens(accessToken, refreshToken);
      await apiRequest<void>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } finally {
      setApiTokens(null, null);
    }
  },

  /**
   * Validate the current access token and load identity fields.
   * `/auth/me` returns AuthResponse with tokens null — we only map userId/name/email.
   */
  getMe: async (_token: string): Promise<User> => {
    if (CONFIG.USE_MOCK) {
      throw new Error('Mock auth is disabled.');
    }
    const data = await apiRequest<AuthResponseDto>('/auth/me');
    return mapAuthUser(data);
  },
};
