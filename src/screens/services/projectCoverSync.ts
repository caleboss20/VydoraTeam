/**
 * Persist a project list cover as soon as the first clip/photo lands.
 * Local frame grab (fast) → upload image → PUT project.thumbnailUrl → cache.
 */
import * as VideoThumbnails from 'expo-video-thumbnails';
import { projectService } from './projectservice';
import { cacheProjectCover, getCachedProjectCover } from './projectCoverService';

const syncedOnce = new Set<string>();
const attemptedOnce = new Set<string>();
const inFlight = new Map<string, Promise<string | null>>();

function isHttp(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

function isLikelyImage(uri: string): boolean {
  return /\.(jpe?g|png|webp|gif|heic|bmp)(\?|$)/i.test(uri);
}

async function thumbFromVideo(uri: string): Promise<string | null> {
  try {
    const { uri: thumb } = await VideoThumbnails.getThumbnailAsync(uri, {
      time: 400,
      quality: 0.55,
    });
    return thumb || null;
  } catch {
    return null;
  }
}

/**
 * Resolve a durable cover URI (prefer existing image; else grab a video frame).
 */
export async function resolveLocalCoverUri(opts: {
  thumbnailUri?: string | null;
  mediaUri?: string | null;
  kind?: 'video' | 'image' | 'flyer' | 'title' | string;
}): Promise<string | null> {
  if (opts.thumbnailUri) return opts.thumbnailUri;
  const media = opts.mediaUri;
  if (!media) return null;
  if (opts.kind === 'flyer' || opts.kind === 'image' || isLikelyImage(media)) {
    return media;
  }
  // Local video frame grab is cheap; remote CDN grab is slow — skip remotes.
  if (isHttp(media)) return null;
  return thumbFromVideo(media);
}

/**
 * Ensure the collab project has a saved cover after first media import.
 * Safe to call often — no-ops once a cover is cached/synced for the project.
 */
export async function syncProjectCoverFromFirstClip(opts: {
  projectId: string;
  thumbnailUri?: string | null;
  mediaUri?: string | null;
  kind?: string;
  /** When true, replace an existing cover (e.g. user set a new first clip). */
  force?: boolean;
}): Promise<string | null> {
  const { projectId } = opts;
  if (!projectId) return null;

  if (!opts.force) {
    const cached = getCachedProjectCover(projectId);
    if (cached && isHttp(cached)) return cached;
    if (syncedOnce.has(projectId) || attemptedOnce.has(projectId)) {
      return cached ?? null;
    }
  }

  const existing = inFlight.get(projectId);
  if (existing) return existing;

  attemptedOnce.add(projectId);

  const run = (async (): Promise<string | null> => {
    try {
      const local = await resolveLocalCoverUri(opts);
      if (!local) return null;

      // Instant list paint (file:// or http).
      cacheProjectCover(projectId, local);

      // Upload + persist on the project record (projectService uploads local images).
      const updated = await projectService.updateThumbnail(projectId, local, '');
      const durable = updated.thumbnailUrl || local;
      cacheProjectCover(projectId, durable);
      syncedOnce.add(projectId);
      return durable;
    } catch (e) {
      console.log('project cover sync failed', projectId, e);
      return null;
    } finally {
      inFlight.delete(projectId);
    }
  })();

  inFlight.set(projectId, run);
  return run;
}

/** Mark a project as already covered (e.g. user picked a custom cover). */
export function markProjectCoverSynced(projectId: string, uri?: string): void {
  if (!projectId) return;
  syncedOnce.add(projectId);
  attemptedOnce.add(projectId);
  if (uri) cacheProjectCover(projectId, uri);
}
