/**
 * Central app configuration for the Vydora Expo client.
 *
 * Dual backends (auto-pick + failover):
 *   EXPO_PUBLIC_API_BASE_CLOUD  → Render / public HTTPS
 *   EXPO_PUBLIC_API_BASE_LOCAL  → USB adb reverse / LAN Spring Boot
 *   EXPO_PUBLIC_API_PREFER      → cloud | local  (default: cloud if set)
 *
 * Legacy single-host vars still work as the local candidate:
 *   EXPO_PUBLIC_API_BASE / EXPO_PUBLIC_WS_BASE
 *
 * Paths include `/api/v1` — services append resource paths only.
 */
import {
  getApiBase,
  getWsBase,
  getWsBrokerUrl,
  resolveApiEndpoint,
  failoverApiEndpoint,
  getActiveEndpoint,
  listApiEndpoints,
} from './services/apiEndpoint';

const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
  '241574699947-th6as6vgkvarafrmjrgi6rqvigchup20.apps.googleusercontent.com';

export const CONFIG = {
  /** Live REST base — switches between Railway and local after health probe. */
  get API_BASE() {
    return getApiBase();
  },

  /** Live SockJS/STOMP HTTP base (no `/api/v1`). */
  get WS_BASE() {
    return getWsBase();
  },

  /** Live raw-WebSocket STOMP broker URL for @stomp/stompjs. */
  get WS_BROKER_URL() {
    return getWsBrokerUrl();
  },

  /** Google OAuth Web client ID (ID token audience). */
  GOOGLE_WEB_CLIENT_ID,

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
    /** App-wide Settings screen preferences (JSON). */
    SETTINGS: 'vydora:settings',
    /** Per-project prefs prefix — append projectId. */
    PROJECT_PREFS_PREFIX: 'vydora:projectPrefs:',
    /** First-run 5-minute wow path completed (never auto-restart). */
    WOW_PATH_DONE: 'vydora:wowPath:done',
    /** Active guided session — coach bar in editor + post-export invite nudge. */
    WOW_PATH_ACTIVE: 'vydora:wowPath:active',
  },

  /**
   * When `false`, all domain services call the real backend.
   * Keep this `false` for integration / demos against `vydora-backend`.
   * Flip to `true` only for offline UI work without Postgres/Cloudinary.
   */
  USE_MOCK: false,

  /** Probe Railway ↔ local and lock onto a healthy host. */
  resolveApiEndpoint,
  /** Flip to the other host after a network failure. */
  failoverApiEndpoint,
  getActiveEndpoint,
  listApiEndpoints,
};
