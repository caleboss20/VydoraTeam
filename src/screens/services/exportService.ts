/**
 * Export service — REAL baked renders on the backend (FFmpeg).
 *
 * Create: POST /projects/{projectId}/exports  { format, resolution, timeline }
 * Get:    GET  /exports/{exportId}            (includes progress 0–100)
 * List:   GET  /projects/{projectId}/exports  → PagedResponse
 *
 * Flow:
 *   1. Upload any local clips / overlay media / music so the server has HTTP URLs
 *   2. POST a full `timeline` manifest (edits to burn into the MP4)
 *   3. Poll GET /exports/{id} until Ready | Failed (renders can take minutes)
 *
 * Timeline covers: trims, speed, volume, filter tints, text (+ bg pills),
 * transitions, media overlays/stickers/keyframes, background music, watermark.
 */
import { Export, VideoProject } from '../types';
import { CONFIG } from '../config';
import { apiRequest } from './apiClient';
import { clipService } from './clipService';
import { uploadService } from './uploadService';
import { getFilterById } from './FilterService';
import {
  ApiExport,
  ApiProject,
  mapExportFromApi,
} from './mappers';

export interface ExportSettings {
  resolution: '720p' | '1080p' | '4K';
  format: 'MP4' | 'MOV' | 'WebM';
  quality: number;
  includeTextOverlays: boolean;
  includeFilters: boolean;
  includeWatermark: boolean;
}

type PagedExports = {
  items: ApiExport[];
  page: number;
  limit: number;
  total: number;
};
type PagedProjects = {
  items: ApiProject[];
  page: number;
  limit: number;
  total: number;
};

/** In-memory names so the Export tab can show project titles after create. */
const projectNameCache: Record<string, string> = {};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRemoteUrl(uri: string): boolean {
  return /^https?:\/\//i.test(uri.trim());
}

/**
 * Upload every local clip URI (and register clips in the backend `files`
 * table when it's empty, since export refuses empty projects). Returns a
 * clipId → remote URL map used to build the render timeline.
 */
async function resolveClipUrls(
  projectId: string,
  videoProject: VideoProject,
  token: string,
  onProgress: (pct: number) => void
): Promise<Record<string, string>> {
  const timeline = [...(videoProject.clips || [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  if (timeline.length === 0) {
    throw new Error(
      'This project has no clips to export. Upload a video first, then try again.'
    );
  }

  const resolved: Record<string, string> = {};
  const durations: Record<string, number> = {};
  for (let i = 0; i < timeline.length; i++) {
    const clip = timeline[i];
    if (isRemoteUrl(clip.uri)) {
      resolved[clip.id] = clip.uri.trim();
    } else {
      const uploaded = await uploadService.uploadVideo(
        clip.uri,
        `export_clip_${i + 1}.mp4`,
        'video/mp4'
      );
      resolved[clip.id] = uploaded.url;
      if (uploaded.durationSeconds && uploaded.durationSeconds > 0) {
        durations[clip.id] = Math.round(uploaded.durationSeconds);
      }
    }
    onProgress(2 + Math.round(((i + 1) / timeline.length) * 6));
  }

  // Register clips in the collab `files` table if it's empty (backend
  // rejects exports for projects with zero clips).
  const existing = await clipService.getClips(projectId, token);
  if (existing.length === 0) {
    for (let i = 0; i < timeline.length; i++) {
      const clip = timeline[i];
      const durationSeconds =
        durations[clip.id] ?? Math.max(1, Math.round((clip.durationMs || 1000) / 1000));
      await clipService.addClip(
        projectId,
        videoProject.title ? `${videoProject.title} · clip ${i + 1}` : `Clip ${i + 1}`,
        `${durationSeconds}s`,
        '1080p',
        token,
        { videoUrl: resolved[clip.id], durationSeconds, order: clip.order ?? i }
      );
    }
  }
  return resolved;
}

function guessAudioMime(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.m4a') || lower.endsWith('.aac')) return 'audio/mp4';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  return 'audio/mpeg';
}

function guessImageMime(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes('.gif')) return 'image/gif';
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  return 'image/jpeg';
}

/**
 * Upload local media-overlay sources (stickers are emoji text and need no
 * upload). Returns overlayId → remote URL.
 */
async function resolveOverlayUrls(project: VideoProject): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  for (const o of project.overlays ?? []) {
    if (o.type === 'emoji') continue;
    if (isRemoteUrl(o.uri)) {
      urls[o.id] = o.uri.trim();
      continue;
    }
    const uploaded =
      o.type === 'video'
        ? await uploadService.uploadVideo(o.uri, `overlay_${o.id}.mp4`, 'video/mp4')
        : await uploadService.uploadImage(o.uri, `overlay_${o.id}`, guessImageMime(o.uri));
    urls[o.id] = uploaded.url;
  }
  return urls;
}

/**
 * The render manifest the backend FFmpeg worker consumes.
 *
 * Filter tints are resolved here from FILTER_LIST so the server needs no UI
 * catalog. Text times stay clip-local (server adjusts for trim + speed).
 * Overlay times are project-timeline ms and composite onto the joined output.
 * Text bgColor/bgOpacity become the CapCut-style drawtext pill on export.
 */
function buildRenderTimeline(
  project: VideoProject,
  clipUrls: Record<string, string>,
  overlayUrls: Record<string, string>,
  musicUrl: string | null,
  settings: ExportSettings
) {
  const clips = [...(project.clips || [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((c) => {
      const filter = settings.includeFilters ? getFilterById(c.filterId) : getFilterById('none');
      return {
        url: clipUrls[c.id] ?? c.uri,
        trimStartMs: c.trimStartMs ?? 0,
        trimEndMs: c.trimEndMs ?? c.durationMs,
        speed: c.speed ?? 1,
        volume: c.volume ?? 1,
        tintColor: filter.tintColor,
        tintOpacity: filter.tintOpacity,
        transitionType: c.transitionOut?.type ?? 'none',
        transitionMs: c.transitionOut?.durationMs ?? 0,
        texts: settings.includeTextOverlays
          ? (c.textOverlays ?? []).map((o) => ({
              text: o.text,
              startMs: o.startMs,
              endMs: o.startMs + o.durationMs,
              color: o.color ?? '#FFFFFF',
              fontSize: o.fontSize ?? 24,
              x: o.x ?? 0.5,
              y: o.y ?? 0.5,
              bold: o.fontWeight === 'bold',
              // Pill behind glyphs — ExportWorker drawtext box=1
              bgColor: o.backgroundColor ?? null,
              bgOpacity: o.backgroundOpacity ?? 0,
            }))
          : [],
      };
    });

  const music =
    musicUrl && project.backgroundMusic
      ? {
          url: musicUrl,
          volume: project.backgroundMusic.volume ?? 0.5,
          startMs: project.backgroundMusic.startMs ?? 0,
          trimStartMs: project.backgroundMusic.trimStartMs ?? 0,
          trimEndMs:
            project.backgroundMusic.trimEndMs ?? project.backgroundMusic.durationMs ?? 0,
          durationMs: project.backgroundMusic.durationMs ?? 0,
        }
      : null;

  // Stickers / PiP / GIFs. Emoji = character string; media = uploaded remote URL.
  // Keyframe x/y become per-frame lerp expressions on the server.
  const overlays = (project.overlays ?? [])
    .filter((o) => o.type === 'emoji' || overlayUrls[o.id])
    .map((o) => ({
      type: o.type,
      uri: o.type === 'emoji' ? o.uri : overlayUrls[o.id],
      startMs: o.startMs,
      endMs: o.startMs + o.durationMs,
      x: o.x,
      y: o.y,
      scale: o.scale,
      rotation: o.rotation,
      opacity: o.opacity,
      keyframes: (o.keyframes ?? []).map((k) => ({
        timeMs: k.timeMs,
        x: k.x,
        y: k.y,
        scale: k.scale,
        rotation: k.rotation,
        opacity: k.opacity,
      })),
    }));

  return {
    quality: settings.quality,
    watermark: settings.includeWatermark,
    clips,
    overlays,
    music,
  };
}

async function getExports(_token: string): Promise<Export[]> {
  if (CONFIG.USE_MOCK) {
    throw new Error('Mock exports disabled.');
  }

  const projects = await apiRequest<PagedProjects>('/projects?page=1&limit=100');
  const list = projects.items || [];
  list.forEach((p) => {
    projectNameCache[p.id] = p.title;
  });

  const pages = await Promise.all(
    list.map((p) =>
      apiRequest<PagedExports>(`/projects/${p.id}/exports?page=1&limit=50`).catch(
        () => ({ items: [] as ApiExport[], page: 1, limit: 50, total: 0 })
      )
    )
  );

  return pages
    .flatMap((page, i) =>
      (page.items || []).map((e) =>
        mapExportFromApi(e, projectNameCache[list[i].id] || 'Export')
      )
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/**
 * Backend has no DELETE /exports/{id} yet — remove from the client list only.
 */
async function deleteExport(_exportId: string, _token: string): Promise<void> {
  if (CONFIG.USE_MOCK) throw new Error('Mock exports disabled.');
}

/**
 * Backend has no retry endpoint — re-queue by creating a new job with the
 * same format/resolution from the existing export record.
 */
async function retryExport(exportId: string, token: string): Promise<Export> {
  if (CONFIG.USE_MOCK) throw new Error('Mock exports disabled.');
  const current = await apiRequest<ApiExport>(`/exports/${exportId}`);
  const created = await apiRequest<ApiExport>(
    `/projects/${current.projectId}/exports`,
    {
      method: 'POST',
      body: JSON.stringify({
        format: current.format,
        resolution: current.resolution,
      }),
    }
  );
  return mapExportFromApi(
    created,
    projectNameCache[current.projectId] || 'Export'
  );
}

/**
 * Request an export job, then poll until Ready / Failed.
 */
async function createExport(
  project: VideoProject,
  settings: ExportSettings,
  onProgress: (percent: number) => void,
  token: string
): Promise<Export> {
  if (CONFIG.USE_MOCK) throw new Error('Mock exports disabled.');

  const projectId = project.projectId?.trim();
  if (!projectId) {
    throw new Error('No project selected for export.');
  }

  projectNameCache[projectId] = project.title;

  onProgress(2);
  // 1. Make sure every source the server must download is a remote URL.
  const clipUrls = await resolveClipUrls(projectId, project, token, onProgress);
  const overlayUrls = await resolveOverlayUrls(project);

  let musicUrl: string | null = null;
  const musicUri = project.backgroundMusic?.uri;
  if (musicUri) {
    musicUrl = isRemoteUrl(musicUri)
      ? musicUri.trim()
      : (
          await uploadService.uploadVideo(musicUri, 'background_music.mp3', guessAudioMime(musicUri))
        ).url;
  }
  onProgress(9);

  // 2. Kick off the baked render with the full edit timeline.
  const created = await apiRequest<ApiExport>(
    `/projects/${projectId}/exports`,
    {
      method: 'POST',
      body: JSON.stringify({
        format: settings.format,
        resolution: settings.resolution,
        timeline: buildRenderTimeline(project, clipUrls, overlayUrls, musicUrl, settings),
      }),
    }
  );

  onProgress(Math.max(10, created.progress || 10));

  // 3. Poll until terminal status — real renders can take minutes.
  let latest = created;
  for (let i = 0; i < 900; i++) {
    await sleep(1000);
    latest = await apiRequest<ApiExport>(`/exports/${created.id}`);
    onProgress(Math.min(99, Math.max(10, latest.progress || 0)));
    const status = (latest.status || '').toUpperCase();
    // Backend enum is Ready | Processing | Failed (not COMPLETED).
    if (status === 'READY' || status === 'COMPLETED' || status === 'FAILED') {
      break;
    }
  }

  const mapped = mapExportFromApi(latest, project.title);
  if (mapped.status === 'Failed') {
    throw new Error(mapped.errorMessage || 'Export failed on the server. Please try again.');
  }
  onProgress(100);
  return mapped;
}

export const exportService = {
  getExports,
  deleteExport,
  retryExport,
  createExport,
};
