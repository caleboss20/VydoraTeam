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
  initials?: string | null;
  color?: string | null;
  avatarUrl?: string | null;
  referralCode?: string | null;
  isPro?: boolean;
  proUntil?: string | null;
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
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });
    return sessionFromAuthResponse(data);
  },

  /** Google ID token → same JWT session as email/password. */
  loginWithGoogle: async (
    idToken: string,
    referralCode?: string
  ): Promise<AuthSession> => {
    if (CONFIG.USE_MOCK) {
      throw new Error('Mock auth is disabled. Use the real API (CONFIG.USE_MOCK = false).');
    }
    const body: Record<string, string> = { idToken };
    if (referralCode?.trim()) {
      body.referralCode = referralCode.trim().toUpperCase();
    }
    const data = await apiRequest<AuthResponseDto>('/auth/google', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(body),
    });
    return sessionFromAuthResponse(data);
  },

  /** Register — persists the user in Postgres via Spring, returns JWT pair. */
  register: async (
    name: string,
    email: string,
    password: string,
    referralCode?: string
  ): Promise<AuthSession> => {
    if (CONFIG.USE_MOCK) {
      throw new Error('Mock auth is disabled. Use the real API (CONFIG.USE_MOCK = false).');
    }
    const body: Record<string, string> = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    };
    if (referralCode?.trim()) {
      body.referralCode = referralCode.trim().toUpperCase();
    }
    const data = await apiRequest<AuthResponseDto>('/auth/register', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(body),
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

  /**
   * Persist profile fields on the server — `PATCH /auth/me`.
   * Pass only fields that changed. For avatars, upload via uploadService first,
   * then send the CDN `avatarUrl`.
   */
  updateProfile: async (updates: {
    name?: string;
    avatarUrl?: string;
  }): Promise<User> => {
    if (CONFIG.USE_MOCK) {
      throw new Error('Mock auth is disabled.');
    }
    const body: { name?: string; avatarUrl?: string } = {};
    if (updates.name !== undefined) body.name = updates.name.trim();
    if (updates.avatarUrl !== undefined) body.avatarUrl = updates.avatarUrl;
    const data = await apiRequest<AuthResponseDto>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return mapAuthUser(data);
  },

  /** Request a 4-digit reset OTP emailed to the account (public). */
  forgotPassword: async (email: string): Promise<string> => {
    if (CONFIG.USE_MOCK) {
      throw new Error('Mock auth is disabled.');
    }
    const data = await apiRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    return data.message;
  },

  /** Verify OTP → short-lived resetToken for the set-password step (public). */
  verifyResetOtp: async (
    email: string,
    otp: string
  ): Promise<{ resetToken: string; email: string }> => {
    if (CONFIG.USE_MOCK) {
      throw new Error('Mock auth is disabled.');
    }
    return apiRequest<{ resetToken: string; email: string }>(
      '/auth/verify-reset-otp',
      {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      }
    );
  },

  /** Set a new password using the resetToken from verifyResetOtp (public). */
  resetPassword: async (
    resetToken: string,
    newPassword: string
  ): Promise<string> => {
    if (CONFIG.USE_MOCK) {
      throw new Error('Mock auth is disabled.');
    }
    const data = await apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ resetToken, newPassword }),
    });
    return data.message;
  },
};
