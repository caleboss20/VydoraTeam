/**
 * Rewrite avatar/cover URLs so Expo Go can load them after LAN IP changes.
 * Backend stores absolute http://OLD_IP:8080/files/... which go stale on hotspot.
 */
import { CONFIG } from '../config';

export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('file:') || trimmed.startsWith('data:')) return trimmed;

  try {
    const api = new URL(CONFIG.API_BASE);
    const origin = `${api.protocol}//${api.host}`;

    if (trimmed.startsWith('/')) {
      // Relative paths from the API — prefer /files/** for uploaded images.
      if (trimmed.startsWith('/files/') || trimmed.startsWith('/images/')) {
        const path = trimmed.startsWith('/images/')
          ? `/files${trimmed}`
          : trimmed;
        return `${origin}${path}`;
      }
      return `${origin}${trimmed}`;
    }

    const u = new URL(trimmed);
    // Local backend file URLs — always point at the active API host.
    if (
      u.pathname.includes('/files') ||
      u.pathname.includes('/images/')
    ) {
      u.protocol = api.protocol;
      u.host = api.host;
      // Older STORAGE_PUBLIC_BASE_URL builds used /images without /files.
      if (
        u.pathname.startsWith('/images/') &&
        !u.pathname.startsWith('/files/')
      ) {
        u.pathname = `/files${u.pathname}`;
      }
      return u.toString();
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}
