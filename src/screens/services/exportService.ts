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
import { curveAverageSpeed, getSpeedCurveById } from './speedCurves';
import { getMusicTracks } from './BackgroundmusicService';
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
  const mediaClips = timeline.filter(
    (c) => c.kind !== 'title' && !!c.uri
  );
  if (
    mediaClips.length === 0 &&
    timeline.every((c) => c.kind === 'title')
  ) {
    // Title-only projects are fine — server generates color sheets.
    onProgress(8);
    return resolved;
  }

  for (let i = 0; i < timeline.length; i++) {
    const clip = timeline[i];
    if (clip.kind === 'title') {
      onProgress(2 + Math.round(((i + 1) / timeline.length) * 6));
      continue;
    }
    if (isRemoteUrl(clip.uri)) {
      resolved[clip.id] = clip.uri.trim();
    } else if (clip.kind === 'flyer') {
      const name =
        clip.uri.toLowerCase().includes('.png')
          ? `export_flyer_${i + 1}.png`
          : `export_flyer_${i + 1}.jpg`;
      const mime = name.endsWith('.png') ? 'image/png' : 'image/jpeg';
      const uploaded = await uploadService.uploadImage(clip.uri, name, mime);
      resolved[clip.id] = uploaded.url;
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
    let order = 0;
    for (let i = 0; i < timeline.length; i++) {
      const clip = timeline[i];
      if (clip.kind === 'title' || clip.kind === 'flyer' || !resolved[clip.id])
        continue;
      const durationSeconds =
        durations[clip.id] ?? Math.max(1, Math.round((clip.durationMs || 1000) / 1000));
      await clipService.addClip(
        projectId,
        videoProject.title ? `${videoProject.title} · clip ${i + 1}` : `Clip ${i + 1}`,
        `${durationSeconds}s`,
        '1080p',
        token,
        { videoUrl: resolved[clip.id], durationSeconds, order: order++ }
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
    } else {
      const uploaded =
        o.type === 'video'
          ? await uploadService.uploadVideo(o.uri, `overlay_${o.id}.mp4`, 'video/mp4')
          : await uploadService.uploadImage(o.uri, `overlay_${o.id}`, guessImageMime(o.uri));
      urls[o.id] = uploaded.url;
    }
    // Chroma plate behind keyed subject (optional).
    const bg = o.chromaKey?.backgroundUri;
    if (bg) {
      const bgKey = `${o.id}__bg`;
      if (isRemoteUrl(bg)) urls[bgKey] = bg.trim();
      else {
        const uploaded = await uploadService.uploadImage(bg, `overlay_bg_${o.id}`, guessImageMime(bg));
        urls[bgKey] = uploaded.url;
      }
    }
  }
  return urls;
}

/**
 * Upload local voiceover takes. Returns voiceoverId → remote URL.
 */
async function resolveVoiceoverUrls(project: VideoProject): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  for (const v of project.voiceovers ?? []) {
    if (isRemoteUrl(v.uri)) {
      urls[v.id] = v.uri.trim();
      continue;
    }
    const uploaded = await uploadService.uploadVideo(
      v.uri,
      `voiceover_${v.id}.m4a`,
      guessAudioMime(v.uri)
    );
    urls[v.id] = uploaded.url;
  }
  return urls;
}

/**
 * Upload local music tracks. Returns trackId → remote URL.
 */
async function resolveMusicUrls(project: VideoProject): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  const tracks = getMusicTracks(project);
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    const id = t.id ?? `legacy-${i}`;
    if (isRemoteUrl(t.uri)) {
      urls[id] = t.uri.trim();
      continue;
    }
    const uploaded = await uploadService.uploadVideo(
      t.uri,
      `music_${id}.mp3`,
      guessAudioMime(t.uri)
    );
    urls[id] = uploaded.url;
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
 * Voiceovers are project-timeline audio mixed under (or with) the music bed.
 * Music supports multi-track + fades + duck; clips carry effects + color grade.
 */
function buildRenderTimeline(
  project: VideoProject,
  clipUrls: Record<string, string>,
  overlayUrls: Record<string, string>,
  musicUrls: Record<string, string>,
  voiceoverUrls: Record<string, string>,
  settings: ExportSettings
) {
  const sorted = [...(project.clips || [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  const adj = project.adjustmentLayers ?? [];
  let timelineCursor = 0;
  const clips = sorted.map((c) => {
      const trimStart = c.trimStartMs ?? 0;
      const trimEnd = c.trimEndMs ?? c.durationMs;
      const visibleMs = Math.max(0, trimEnd - trimStart);
      const clipStart = timelineCursor;
      const clipEnd = timelineCursor + visibleMs;
      timelineCursor = clipEnd;

      // Bake overlapping adjustment layers into this clip's grade for export.
      let mergedGrade = { ...(c.colorGrade ?? {}) } as Record<string, number>;
      let mergedEffectId = c.effectId;
      let mergedEffectIntensity = c.effectIntensity;
      for (const layer of adj) {
        const ls = layer.startMs;
        const le = layer.startMs + layer.durationMs;
        if (le <= clipStart || ls >= clipEnd) continue;
        if (layer.colorGrade) {
          for (const [k, v] of Object.entries(layer.colorGrade)) {
            if (typeof v === 'number') {
              mergedGrade[k] = Math.max(
                -1,
                Math.min(1, (mergedGrade[k] ?? 0) + v)
              );
            }
          }
        }
        if (layer.effectId && layer.effectId !== 'none') {
          mergedEffectId = layer.effectId;
          mergedEffectIntensity = layer.effectIntensity ?? 0.55;
        }
      }

      const filter = settings.includeFilters ? getFilterById(c.filterId) : getFilterById('none');
      const isTitle = c.kind === 'title';
      const isFlyer = c.kind === 'flyer';
      const titleTexts =
        isTitle && c.titleCard
          ? [
              {
                text: c.titleCard.title,
                startMs: 0,
                endMs: c.durationMs,
                color: c.titleCard.textColor ?? '#FFFFFF',
                fontSize: c.titleCard.fontSize ?? 42,
                fontFamily: c.titleCard.fontFamily ?? null,
                x: 0.5,
                y: 0.42,
                bold: true,
                bgColor: null as string | null,
                bgOpacity: 0,
                animationIn: c.titleCard.animationIn ?? 'bounce',
                animationOut: 'none',
                animationLoop: c.titleCard.animationLoop ?? 'none',
                animationDurationMs: 700,
                blendMode: 'normal',
                textOpacity: 1,
                karaokeWords: null,
                highlightColor: null,
                keyframes: [] as { timeMs: number; x: number; y: number }[],
                mask: null,
              },
              ...(c.titleCard.subtitle
                ? [
                    {
                      text: c.titleCard.subtitle,
                      startMs: 0,
                      endMs: c.durationMs,
                      color: c.titleCard.textColor ?? '#FFFFFF',
                      fontSize: Math.max(16, Math.round((c.titleCard.fontSize ?? 42) * 0.45)),
                      fontFamily: c.titleCard.fontFamily ?? null,
                      x: 0.5,
                      y: 0.55,
                      bold: false,
                      bgColor: null as string | null,
                      bgOpacity: 0,
                      animationIn: c.titleCard.animationIn ?? 'fade',
                      animationOut: 'none',
                      animationLoop: 'none',
                      animationDurationMs: 500,
                      blendMode: 'normal',
                      textOpacity: 0.85,
                      karaokeWords: null,
                      highlightColor: null,
                      keyframes: [] as { timeMs: number; x: number; y: number }[],
                      mask: null,
                    },
                  ]
                : []),
            ]
          : null;
      return {
        kind: isTitle ? 'title' : isFlyer ? 'flyer' : 'video',
        titleCard: isTitle && c.titleCard
          ? {
              backgroundColor: c.titleCard.backgroundColor,
              title: c.titleCard.title,
              subtitle: c.titleCard.subtitle ?? null,
              textColor: c.titleCard.textColor ?? '#FFFFFF',
              fontSize: c.titleCard.fontSize ?? 42,
            }
          : null,
        url: isTitle ? '' : clipUrls[c.id] ?? c.uri,
        trimStartMs: isTitle || isFlyer ? 0 : c.trimStartMs ?? 0,
        trimEndMs:
          isTitle || isFlyer
            ? c.durationMs
            : c.trimEndMs ?? c.durationMs,
        // When a curve is set, bake its segments; otherwise use constant speed.
        speed:
          c.speedCurve && c.speedCurve !== 'none'
            ? curveAverageSpeed(c.speedCurve)
            : c.speed ?? 1,
        speedCurve: c.speedCurve && c.speedCurve !== 'none' ? c.speedCurve : null,
        curveSegments:
          c.speedCurve && c.speedCurve !== 'none'
            ? getSpeedCurveById(c.speedCurve).segments.map((s) => ({
                fraction: s.fraction,
                speed: s.speed,
              }))
            : null,
        reversed: !!c.reversed,
        volume: c.volume ?? 1,
        volumeKeyframes: (c.volumeKeyframes ?? []).map((k) => ({
          timeMs: k.timeMs,
          value: k.value,
        })),
        opacity: c.opacity ?? 1,
        opacityKeyframes: (c.opacityKeyframes ?? []).map((k) => ({
          timeMs: k.timeMs,
          value: k.value,
        })),
        rotation: c.rotation ?? 0,
        rotationKeyframes: (c.rotationKeyframes ?? []).map((k) => ({
          timeMs: k.timeMs,
          value: k.value,
        })),
        layoutX: c.layoutX ?? 0.5,
        layoutY: c.layoutY ?? 0.5,
        layoutScale: c.layoutScale ?? 1,
        flipH: !!c.flipH,
        flipV: !!c.flipV,
        bgRemove: c.bgRemove?.enabled
          ? {
              enabled: true,
              mode: c.bgRemove.mode ?? 'auto',
              color: c.bgRemove.color ?? '#00FF00',
              similarity: c.bgRemove.similarity ?? 0.28,
              blend: c.bgRemove.blend ?? 0.12,
            }
          : null,
        tintColor: filter.tintColor,
        tintOpacity: filter.tintOpacity,
        effectId: mergedEffectId ?? 'none',
        effectIntensity: mergedEffectIntensity ?? 0.55,
        colorGrade:
          Object.keys(mergedGrade).length > 0
            ? mergedGrade
            : c.colorGrade ?? null,
        colorCurves: c.colorCurves ?? null,
        lutUri: c.lutUri ?? null,
        lutIntensity: c.lutIntensity ?? 1,
        colorGradeKeyframes: (c.colorGradeKeyframes ?? []).map((k) => ({
          timeMs: k.timeMs,
          grade: k.grade,
        })),
        cropRatioId: c.cropRatioId ?? null,
        cropOffsetX: c.cropOffsetX ?? 0.5,
        cropOffsetY: c.cropOffsetY ?? 0.5,
        cropZoom: c.cropZoom ?? 1,
        cropKeyframes: (c.cropKeyframes ?? []).map((k) => ({
          timeMs: k.timeMs,
          cropOffsetX: k.cropOffsetX,
          cropOffsetY: k.cropOffsetY,
          cropZoom: k.cropZoom,
        })),
        stabilize: c.stabilize?.enabled
          ? { enabled: true, shakiness: c.stabilize.shakiness ?? 0.55 }
          : null,
        autoReframe: c.autoReframe?.enabled
          ? {
              enabled: true,
              ratioId: c.autoReframe.ratioId ?? 'tiktok',
              keyframes: (c.autoReframe.keyframes ?? []).map((k) => ({
                timeMs: k.timeMs,
                x: k.x,
              })),
            }
          : null,
        audioFx: c.audioFx
          ? {
              noiseReduction: c.audioFx.noiseReduction ?? 0,
              enhanceSpeech: !!c.audioFx.enhanceSpeech,
              enhanceStrength: c.audioFx.enhanceStrength ?? 0.75,
              eqSub: c.audioFx.eqSub ?? 0,
              eqLow: c.audioFx.eqLow ?? 0,
              eqMid: c.audioFx.eqMid ?? 0,
              eqPresence: c.audioFx.eqPresence ?? 0,
              eqHigh: c.audioFx.eqHigh ?? 0,
              eqAir: c.audioFx.eqAir ?? 0,
              compressor: !!c.audioFx.compressor,
              compThreshold: c.audioFx.compThreshold ?? -18,
              compRatio: c.audioFx.compRatio ?? 3,
              deEsser: c.audioFx.deEsser ?? 0,
              gate: c.audioFx.gate ?? 0,
            }
          : null,
        lookOverlay: c.lookOverlay
          ? {
              darkOpacity: c.lookOverlay.darkOpacity ?? 0,
              gradientOpacity: c.lookOverlay.gradientOpacity ?? 0,
              gradientColorTop: c.lookOverlay.gradientColorTop ?? '#000000',
              gradientColorBottom:
                c.lookOverlay.gradientColorBottom ?? '#F5C518',
              gradientAngle: c.lookOverlay.gradientAngle ?? 0,
            }
          : null,
        transitionType: c.transitionOut?.type ?? 'none',
        transitionMs: c.transitionOut?.durationMs ?? 0,
        texts: titleTexts
          ? titleTexts
          : settings.includeTextOverlays
            ? (c.textOverlays ?? []).map((o) => ({
                text: o.text,
                startMs: o.startMs,
                endMs: o.startMs + o.durationMs,
                color: o.color ?? '#FFFFFF',
                fontSize: o.fontSize ?? 24,
                fontFamily: o.fontFamily ?? null,
                x: o.x ?? 0.5,
                y: o.y ?? 0.5,
                bold: o.fontWeight === 'bold',
                // Pill behind glyphs — ExportWorker drawtext box=1
                bgColor: o.backgroundColor ?? null,
                bgOpacity: o.backgroundOpacity ?? 0,
                animationIn: o.animationIn ?? 'fade',
                animationOut: o.animationOut ?? 'none',
                animationLoop: o.animationLoop ?? 'none',
                animationDurationMs: o.animationDurationMs ?? 500,
                blendMode: o.blendMode ?? 'normal',
                textOpacity: o.textOpacity ?? 1,
                karaokeWords: o.karaokeWords?.length
                  ? o.karaokeWords.map((w) => ({
                      text: w.text,
                      startMs: w.startMs,
                      endMs: w.endMs,
                    }))
                  : null,
                highlightColor: o.highlightColor ?? null,
                keyframes: (o.keyframes ?? []).map((k) => ({
                  timeMs: k.timeMs,
                  x: k.x,
                  y: k.y,
                })),
                mask:
                  o.mask?.enabled && o.mask.shape && o.mask.shape !== 'none'
                    ? {
                        enabled: true,
                        shape: o.mask.shape,
                        feather: o.mask.feather ?? 0.12,
                        invert: !!o.mask.invert,
                        centerX: o.mask.centerX ?? 0.5,
                        centerY: o.mask.centerY ?? 0.5,
                        scale: o.mask.scale ?? 1,
                        rotation: o.mask.rotation ?? 0,
                        keyframes: (o.mask.keyframes ?? []).map((k) => ({
                          timeMs: k.timeMs,
                          centerX: k.centerX,
                          centerY: k.centerY,
                          scale: k.scale,
                          rotation: k.rotation,
                        })),
                      }
                    : null,
              }))
            : [],
      };
    });

  const tracks = getMusicTracks(project);
  const musicTracks = tracks
    .map((t, i) => {
      const id = t.id ?? `legacy-${i}`;
      const url = musicUrls[id];
      if (!url) return null;
      return {
        url,
        volume: t.volume ?? 0.5,
        startMs: t.startMs ?? 0,
        trimStartMs: t.trimStartMs ?? 0,
        trimEndMs: t.trimEndMs ?? t.durationMs ?? 0,
        durationMs: t.durationMs ?? 0,
        fadeInMs: t.fadeInMs ?? 0,
        fadeOutMs: t.fadeOutMs ?? 0,
        duckUnderVoiceover: t.duckUnderVoiceover !== false,
        duckLevel: t.duckLevel ?? 0.28,
      };
    })
    .filter(Boolean);

  // Legacy singular field — first track — so older workers still mix something.
  const music = musicTracks[0] ?? null;

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
      flipH: !!o.flipH,
      flipV: !!o.flipV,
      label: o.label ?? null,
      role: o.role ?? null,
      animationIn: o.animationIn ?? null,
      keyframes: (o.keyframes ?? []).map((k) => ({
        timeMs: k.timeMs,
        x: k.x,
        y: k.y,
        scale: k.scale,
        rotation: k.rotation,
        opacity: k.opacity,
      })),
      chromaKey: o.chromaKey?.enabled
        ? {
            enabled: true,
            color: o.chromaKey.color ?? '#00FF00',
            similarity: o.chromaKey.similarity ?? 0.3,
            blend: o.chromaKey.blend ?? 0.1,
            backgroundUri: overlayUrls[`${o.id}__bg`] ?? o.chromaKey.backgroundUri ?? null,
          }
        : null,
      mask:
        o.mask?.enabled && o.mask.shape && o.mask.shape !== 'none'
          ? {
              enabled: true,
              shape: o.mask.shape,
              feather: o.mask.feather ?? 0.12,
              invert: !!o.mask.invert,
              centerX: o.mask.centerX ?? 0.5,
              centerY: o.mask.centerY ?? 0.5,
              scale: o.mask.scale ?? 1,
              rotation: o.mask.rotation ?? 0,
              followMotion: !!o.mask.followMotion,
              keyframes: (o.mask.keyframes ?? []).map((k) => ({
                timeMs: k.timeMs,
                centerX: k.centerX,
                centerY: k.centerY,
                scale: k.scale,
                rotation: k.rotation,
              })),
            }
          : null,
    }));

  // Mic narration takes — adelay to startMs, then amix with timeline audio.
  const voiceovers = (project.voiceovers ?? [])
    .filter((v) => voiceoverUrls[v.id])
    .map((v) => ({
      url: voiceoverUrls[v.id],
      startMs: v.startMs,
      durationMs: v.durationMs,
      volume: v.volume ?? 1,
    }));

  return {
    quality: settings.quality,
    watermark: settings.includeWatermark,
    canvasColor: project.canvasColor ?? '#000000',
    clips,
    overlays,
    voiceovers,
    music,
    musicTracks,
    beatMarkersMs: project.beatMarkersMs ?? [],
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
  const voiceoverUrls = await resolveVoiceoverUrls(project);
  const musicUrls = await resolveMusicUrls(project);
  onProgress(9);

  // 2. Kick off the baked render with the full edit timeline.
  const created = await apiRequest<ApiExport>(
    `/projects/${projectId}/exports`,
    {
      method: 'POST',
      body: JSON.stringify({
        format: settings.format,
        resolution: settings.resolution,
        timeline: buildRenderTimeline(
          project,
          clipUrls,
          overlayUrls,
          musicUrls,
          voiceoverUrls,
          settings
        ),
      }),
    }
  );

  onProgress(Math.max(10, created.progress || 10));

  // 3. Poll until terminal status — real renders can take minutes.
  let latest = created;
  let timedOut = true;
  for (let i = 0; i < 900; i++) {
    await sleep(1000);
    latest = await apiRequest<ApiExport>(`/exports/${created.id}`);
    onProgress(Math.min(99, Math.max(10, latest.progress || 0)));
    const status = (latest.status || '').toUpperCase();
    // Backend enum is Ready | Processing | Failed (not COMPLETED).
    if (status === 'READY' || status === 'COMPLETED' || status === 'FAILED') {
      timedOut = false;
      break;
    }
  }

  const mapped = mapExportFromApi(latest, project.title);
  if (timedOut && mapped.status === 'Processing') {
    throw new Error(
      'Export is still processing on the server. Check the Exports tab in a minute — it will update when ready.'
    );
  }
  if (mapped.status === 'Failed') {
    throw new Error(
      mapped.errorMessage ||
        latest.errorMessage ||
        'Export failed on the server. Please try again.'
    );
  }
  if (!mapped.fileUrl) {
    throw new Error('Export finished but no download URL was returned.');
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
