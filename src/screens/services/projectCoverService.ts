/**
 * Resolve a cover image for dashboard project tiles:
 * 1) project.thumbnailUrl
 * 2) in-memory / disk cache
 * 3) local VideoProject cover / first clip thumbnail
 * 4) first clip.thumbnailUrl from API (cheap)
 *
 * Intentionally does NOT generate frames from remote videoUrl on the list —
 * that was the main reason tiles felt stuck on spinners.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';
import { clipService } from './clipService';
import type { Project, VideoProject } from '../types';

const MEMORY = new Map<string, string>();
const DISK_KEY = '@vydora/project_covers_v1';
const CONCURRENCY = 3;

let diskHydrated = false;
let diskWriteTimer: ReturnType<typeof setTimeout> | null = null;

async function hydrateDiskCache(): Promise<void> {
  if (diskHydrated) return;
  diskHydrated = true;
  try {
    const raw = await AsyncStorage.getItem(DISK_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, string>;
    for (const [id, uri] of Object.entries(parsed)) {
      if (uri && !MEMORY.has(id)) MEMORY.set(id, uri);
    }
  } catch {
    // ignore corrupt cache
  }
}

function scheduleDiskPersist(): void {
  if (diskWriteTimer) clearTimeout(diskWriteTimer);
  diskWriteTimer = setTimeout(() => {
    const payload: Record<string, string> = {};
    MEMORY.forEach((uri, id) => {
      // Prefer durable http(s) URLs; skip ephemeral file:// unless nothing else.
      if (uri.startsWith('http') || uri.startsWith('file')) payload[id] = uri;
    });
    void AsyncStorage.setItem(DISK_KEY, JSON.stringify(payload)).catch(() => undefined);
  }, 400);
}

type CoverListener = (projectId: string, uri: string) => void;
const listeners = new Set<CoverListener>();

function remember(projectId: string, uri: string): string {
  MEMORY.set(projectId, uri);
  scheduleDiskPersist();
  listeners.forEach((fn) => {
    try {
      fn(projectId, uri);
    } catch {
      // ignore listener errors
    }
  });
  return uri;
}

/** Write a known cover into memory + disk (and notify subscribers). */
export function cacheProjectCover(projectId: string, uri: string): void {
  if (!projectId || !uri) return;
  remember(projectId, uri);
}

/** Live updates for the dashboard list while covers sync in the background. */
export function subscribeProjectCovers(listener: CoverListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCachedProjectCover(projectId: string): string | undefined {
  return MEMORY.get(projectId);
}

async function coverFromLocalVideoProject(
  projectId: string
): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT
    );
    if (!raw) return null;
    const vp = JSON.parse(raw) as VideoProject;
    if (vp?.projectId !== projectId) return null;
    if (vp.coverThumbnailUri) return vp.coverThumbnailUri;
    const clips = [...(vp.clips ?? [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
    const first = clips[0];
    if (!first) return null;
    if (first.thumbnailUri) return first.thumbnailUri;
    return null;
  } catch {
    return null;
  }
}

export async function resolveProjectCover(
  project: Project,
  token: string
): Promise<string | null> {
  await hydrateDiskCache();

  if (project.thumbnailUrl) {
    return remember(project.id, project.thumbnailUrl);
  }

  const cached = MEMORY.get(project.id);
  if (cached) return cached;

  const local = await coverFromLocalVideoProject(project.id);
  if (local) return remember(project.id, local);

  try {
    const clips = await clipService.getClips(project.id, token);
    const ordered = [...clips].sort((a, b) => {
      const aScore = a.thumbnailUrl ? 0 : a.videoUrl ? 1 : 2;
      const bScore = b.thumbnailUrl ? 0 : b.videoUrl ? 1 : 2;
      return aScore - bScore;
    });
    const first = ordered[0];
    if (first?.thumbnailUrl) {
      return remember(project.id, first.thumbnailUrl);
    }
    // Skip remote video frame extraction — too slow for list tiles.
  } catch (e) {
    console.log('project cover resolve failed', project.id, e);
  }
  return null;
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  });
  await Promise.all(runners);
  return results;
}

export type CoverProgress = (projectId: string, uri: string) => void;

/**
 * Resolve covers with capped concurrency. Calls `onCover` as each tile is ready
 * so the UI can paint without waiting for the whole list.
 */
export async function resolveProjectCovers(
  projects: Project[],
  token: string,
  onCover?: CoverProgress
): Promise<Record<string, string>> {
  await hydrateDiskCache();
  const out: Record<string, string> = {};

  // Instant pass: already-known URLs (API field + cache) — no network.
  for (const p of projects) {
    const instant = p.thumbnailUrl || MEMORY.get(p.id);
    if (instant) {
      out[p.id] = instant;
      remember(p.id, instant);
      onCover?.(p.id, instant);
    }
  }

  const missing = projects.filter((p) => !out[p.id]);
  await mapPool(missing, CONCURRENCY, async (p) => {
    const uri = await resolveProjectCover(p, token);
    if (uri) {
      out[p.id] = uri;
      onCover?.(p.id, uri);
    }
    return uri;
  });

  return out;
}
