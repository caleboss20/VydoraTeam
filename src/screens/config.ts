/**
 * Central app configuration for the Vydora Expo client.
 *
 * Point API_BASE at the Spring Boot server (`vydora-backend`).
 * Paths below already include `/api/v1` — services append resource paths only
 * (e.g. `/auth/login`, `/projects`).
 *
 * Device tips:
 * - iOS simulator / web: `localhost` works.
 * - Android emulator: use `http://10.0.2.2:8080/api/v1` (emulator’s host loopback).
 * - Physical phone: use your computer’s LAN IP, e.g. `http://192.168.1.23:8080/api/v1`.
 */
export const CONFIG = {
  /** REST base URL for the Spring Boot API. */
  API_BASE: 'http://localhost:8080/api/v1',

  /**
   * SockJS/STOMP endpoint (no `/api/v1` prefix).
   * Connect with JWT on the STOMP CONNECT frame: `Authorization: Bearer <accessToken>`.
   */
  WS_BASE: 'http://localhost:8080/ws',

  ASYNC_STORAGE_KEYS: {
    USER: 'vydora:user',
    /** Short-lived JWT used as `Authorization: Bearer …` on every API call. */
    TOKEN: 'vydora:token',
    /** Long-lived, single-use token for `POST /auth/refresh` (and logout revoke). */
    REFRESH_TOKEN: 'vydora:refreshToken',
    PROJECTS: 'vydora:projects',
    CURRENT_PROJECT: 'vydora:currentProject',
    EXPORTS: 'vydora:exports',
    CLIPS: 'vydora:clips',
    COMMENTS: 'vydora:comments',
    MEMBERS: 'vydora:members',
    VIDEO_PROJECTS: 'vydora:videoProjects',
    CURRENT_VIDEO_PROJECT: 'vydora:currentVideoProject',
    PENDING_INVITE_TOKEN: 'vydora:pendingInviteToken',
  },

  /**
   * When `false`, all domain services call the real backend.
   * Keep this `false` for integration / demos against `vydora-backend`.
   * Flip to `true` only for offline UI work without Postgres/Cloudinary.
   */
  USE_MOCK: false,
};
