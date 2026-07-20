import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  VideoProject,
  TextOverlay,
  VideoClip,
  BackgroundMusic,
  VideoSegment,
  ClipTransition,
  MediaOverlay,
  OverlayKeyframe,
  VoiceoverClip,
  SpeedCurveId,
  ClipEffectId,
  ColorGrade,
  DEFAULT_COLOR_GRADE,
  MultiCamGroup,
  StabilizeSettings,
  AutoReframeSettings,
  ClipAudioFx,
  DEFAULT_AUDIO_FX,
  ScalarKeyframe,
  ColorGradeKeyframe,
  CropKeyframe,
  TextPositionKeyframe,
  MovieEffectId,
  BgRemoveSettings,
  TitleCardSettings,
} from '../types';
import { CONFIG } from '../config';
import { buildVersionSnapshot, versionService } from '../services/VersionHistory';
import { publishState as publishEditorState } from '../socket/editorSync';

import {
  createTextOverlay,
  addOverlayToClip,
  updateOverlayInClip,
  removeOverlayFromClip,
} from '../services/textOverlayservice';
import { createBackgroundMusic, updateBackgroundMusic as updateBackgroundMusicHelper, getMusicTracks } from '../services/BackgroundmusicService';
import { createVoiceover } from '../services/voiceoverService';
import {
  upsertBeatMarker,
  removeBeatMarker as removeBeatMarkerHelper,
  mergeBeatMarkers as mergeBeatMarkersHelper,
} from '../services/beatMarkerService';
import { multicamService } from '../services/multicamService';
import {
  upsertScalarKeyframe,
  upsertColorGradeKeyframe,
  upsertCropKeyframe,
  upsertTextPositionKeyframe,
} from '../services/clipKeyframes';
import { buildMovieEffectPatch } from '../services/movieEffectsService';
import type { EditTemplate } from '../services/editTemplateService';
import { editTemplateService } from '../services/editTemplateService';



// ─── Context Type ─────────────────────────────────────────────────────────────
// Deliberately minimal: this context's only job is to hold whatever video
// was just picked/uploaded so EditorScreen can read it. It is NOT a full
// CRUD store — no fetch, no list of past projects, no per-clip mutation API.
// If you later need a real "my video projects" list/history, that's a
// separate concern (likely its own service-backed context) — don't grow
// this one back into that.
interface VideoProjectContextType {
  currentVideoProject: VideoProject | null;
  setCurrentVideoProject: (project: VideoProject | null) => void;
  /**
   * Apply a timeline snapshot received from a collaborator over WebSocket.
   * Unlike the local mutators, this does NOT re-broadcast (prevents echo loops).
   */
  applyRemoteProjectState: (project: VideoProject) => void;
  /** CapCut-style edit stack — reverse the last local timeline change. */
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  updateClipTrim: (clipId: string, trimStartMs: number, trimEndMs: number) => void; // ADDED
  deleteClip: (clipId: string) => void;
  duplicateClip: (clipId: string) => void;
  splitClip: (clipId: string, splitTimeMs: number) => void;
  /**
   * Replace one clip with several trims of the same media (silence removal /
   * jump-cut). Returns how many pieces were created.
   */
  applyKeepRanges: (
    clipId: string,
    ranges: { startMs: number; endMs: number }[]
  ) => number;
  /**
   * Insert a new timeline clip from the same media as `clipId`, trimmed to
   * [startMs, endMs]. Does not remove the source clip. Returns the new id.
   */
  insertClipRange: (
    clipId: string,
    startMs: number,
    endMs: number
  ) => string | null;
  /**
   * Blank colored sheet with title text (intro/outro cards).
   * `where` places it relative to `relativeClipId` or the timeline ends.
   */
  addTitleCard: (
    card: TitleCardSettings,
    durationMs: number,
    where: 'start' | 'before' | 'after' | 'end',
    relativeClipId?: string | null
  ) => string | null;
  /** Swap a clip one slot earlier (−1) or later (+1) on the timeline. */
  moveClip: (clipId: string, direction: -1 | 1) => void;
  /** Clear trims / segments — restore full source length. */
  resetClipEdits: (clipId: string) => void;
  /** Attach a synced multi-cam group to a clip (Cam A stays live). */
  attachMultiCam: (clipId: string, group: MultiCamGroup) => void;
  /**
   * Director cut: split at clip-local time (if mid-clip) and remap the right
   * piece onto `angleId`. Returns false if remap failed.
   */
  cutToMultiCamAngle: (
    clipId: string,
    angleId: string,
    splitTimeMs: number
  ) => boolean;
  updateClipVolume: (clipId: string, volume: number) => void;
  updateClipOpacity: (clipId: string, opacity: number) => void;
  /** CapCut-style property diamonds (clip-local ms). */
  addClipVolumeKeyframe: (clipId: string, kf: ScalarKeyframe) => void;
  clearClipVolumeKeyframes: (clipId: string) => void;
  addClipOpacityKeyframe: (clipId: string, kf: ScalarKeyframe) => void;
  clearClipOpacityKeyframes: (clipId: string) => void;
  updateClipRotation: (clipId: string, rotation: number) => void;
  addClipRotationKeyframe: (clipId: string, kf: ScalarKeyframe) => void;
  clearClipRotationKeyframes: (clipId: string) => void;
  /** Canva blank canvas color behind free-placed clips. */
  setCanvasColor: (hex: string) => void;
  /** Free layout / flip / opacity / BG remove on a clip. */
  updateClipLayout: (
    clipId: string,
    patch: {
      layoutX?: number;
      layoutY?: number;
      layoutScale?: number;
      flipH?: boolean;
      flipV?: boolean;
      opacity?: number;
      bgRemove?: BgRemoveSettings;
    }
  ) => void;
  /** One-tap Canva double-exposure (ghost overlay + tighter foreground). */
  applyDoubleExposure: (clipId: string) => void;
  addClipColorGradeKeyframe: (clipId: string, kf: ColorGradeKeyframe) => void;
  clearClipColorGradeKeyframes: (clipId: string) => void;
  addClipCropKeyframe: (clipId: string, kf: CropKeyframe) => void;
  clearClipCropKeyframes: (clipId: string) => void;
  addTextPositionKeyframe: (
    clipId: string,
    overlayId: string,
    kf: TextPositionKeyframe
  ) => void;
  clearTextPositionKeyframes: (clipId: string, overlayId: string) => void;
  /** Append a stock / remote clip after the selected (or last) clip. */
  appendRemoteClip: (clip: {
    uri: string;
    durationMs: number;
    title?: string;
    thumbnailUri?: string;
  }) => string | null;
  updateClipSpeed: (clipId: string, speed: number) => void;
  updateClipSpeedCurve: (clipId: string, speedCurve: SpeedCurveId) => void;
  updateClipReversed: (clipId: string, reversed: boolean) => void;
  updateClipFilter: (clipId: string, filterId: string) => void;
  updateClipEffect: (clipId: string, effectId: ClipEffectId, intensity?: number) => void;
  /** Apply a cinematic bundle (flashback / dream / rewind…). */
  applyMovieEffect: (clipId: string, effectId: MovieEffectId) => void;
  /** Apply a saved edit template look onto a clip. */
  applyEditTemplate: (clipId: string, template: EditTemplate) => void;
  updateClipColorGrade: (clipId: string, grade: Partial<ColorGrade>) => void;
  updateClipStabilize: (clipId: string, stabilize: StabilizeSettings) => void;
  updateClipAutoReframe: (clipId: string, autoReframe: AutoReframeSettings | undefined) => void;
  updateClipAudioFx: (clipId: string, fx: Partial<ClipAudioFx>) => void;
  updateClipSegments: (clipId: string, segments: VideoSegment[]) => void;
  /** Set/replace the transition into the NEXT clip; pass undefined to remove. */
  updateClipTransition: (clipId: string, transition: ClipTransition | undefined) => void;

  // ── Media overlays (multi-track PiP / stickers / GIFs) ──
  /** Adds an overlay to the project's overlay track; returns its id. */
  addMediaOverlay: (overlay: Omit<MediaOverlay, 'id'>) => string;
  updateMediaOverlay: (overlayId: string, changes: Partial<Omit<MediaOverlay, 'id'>>) => void;
  removeMediaOverlay: (overlayId: string) => void;
  /** Records/replaces a keyframe at kf.timeMs (keyframes kept sorted). */
  addOverlayKeyframe: (overlayId: string, kf: OverlayKeyframe) => void;
  clearOverlayKeyframes: (overlayId: string) => void;

  /** @deprecated prefer addMusicTrack — kept for callers that replace the sole track. */
  setBackgroundMusic: (uri: string, durationMs: number, title?: string) => void;
  updateBackgroundMusic: (changes: Partial<BackgroundMusic>) => void;
  removeBackgroundMusic: () => void;
  addMusicTrack: (uri: string, durationMs: number, startMs?: number, title?: string) => string;
  updateMusicTrack: (trackId: string, changes: Partial<BackgroundMusic>) => void;
  removeMusicTrack: (trackId: string) => void;

  // ── Voiceover narration takes (project-timeline track) ──
  addVoiceover: (uri: string, startMs: number, durationMs: number) => string;
  updateVoiceover: (voiceoverId: string, changes: Partial<Omit<VoiceoverClip, 'id'>>) => void;
  removeVoiceover: (voiceoverId: string) => void;

  addBeatMarker: (timeMs: number) => void;
  removeBeatMarker: (timeMs: number) => void;
  clearBeatMarkers: () => void;
  /** Bulk-merge detected beats into project markers (deduped). */
  mergeBeatMarkers: (timesMs: number[]) => number;

  addTextOverlay: (clipId: string, text: string, startMs: number, durationMs?: number) => string;
  updateTextOverlay: (clipId: string, overlayId: string, changes: Partial<TextOverlay>) => void;
  removeTextOverlay: (clipId: string, overlayId: string) => void;
   updateClipCrop: (
    clipId: string,
    cropData: {
      cropRatioId?: string;
      cropOffsetX?: number;
      cropOffsetY?: number;
      cropZoom?: number;
    }
  ) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const VideoProjectContext = createContext<VideoProjectContextType | undefined>(undefined);



// ─── Provider ────────────────────────────────────────────────────────────────
const MAX_UNDO = 50;
const HISTORY_COALESCE_MS = 400;

function cloneProject(p: VideoProject): VideoProject {
  return JSON.parse(JSON.stringify(p)) as VideoProject;
}

export function VideoProjectProvider({ children }: { children: ReactNode }) {
  const [currentVideoProject, setCurrentVideoProjectState] = useState<VideoProject | null>(null);
  const projectRef = useRef<VideoProject | null>(null);
  const lastAutoFingerprint = useRef<string>('');
  // When a change originates from a remote collaborator we must NOT broadcast it
  // back out, or two clients would ping-pong forever.
  const remoteApplyRef = useRef<boolean>(false);

  // CapCut-style undo / redo — snapshots of the full VideoProject.
  const pastRef = useRef<VideoProject[]>([]);
  const futureRef = useRef<VideoProject[]>([]);
  const prevForHistoryRef = useRef<VideoProject | null>(null);
  const lastHistoryPushAt = useRef(0);
  const skipHistoryRef = useRef(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  // historyVersion forces re-read of ref lengths when stacks change.
  const canUndo = historyVersion >= 0 && pastRef.current.length > 0;
  const canRedo = historyVersion >= 0 && futureRef.current.length > 0;

  // ── Rehydrate on launch so the last-edited video survives an app restart ──
  useEffect(() => {
    const rehydrate = async () => {
      try {
        const cached = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT);
        if (cached) {
          const parsed = JSON.parse(cached) as VideoProject;
          skipHistoryRef.current = true;
          setCurrentVideoProjectState(parsed);
          projectRef.current = parsed;
          prevForHistoryRef.current = cloneProject(parsed);
        }
      } catch (e) {
        console.log('Video project rehydration failed', e);
      }
    };
    rehydrate();
  }, []);

  useEffect(() => {
    projectRef.current = currentVideoProject;
  }, [currentVideoProject]);

  // Record undo snapshots whenever a local edit lands (coalesced for drag storms).
  useEffect(() => {
    const curr = currentVideoProject;
    if (!curr) {
      prevForHistoryRef.current = null;
      return;
    }
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      prevForHistoryRef.current = cloneProject(curr);
      return;
    }
    const prev = prevForHistoryRef.current;
    if (
      prev &&
      prev.id === curr.id &&
      prev.updatedAt !== curr.updatedAt
    ) {
      const now = Date.now();
      if (now - lastHistoryPushAt.current >= HISTORY_COALESCE_MS) {
        pastRef.current = [
          ...pastRef.current.slice(-(MAX_UNDO - 1)),
          cloneProject(prev),
        ];
        futureRef.current = [];
        lastHistoryPushAt.current = now;
        setHistoryVersion((v) => v + 1);
      }
    }
    prevForHistoryRef.current = cloneProject(curr);
  }, [currentVideoProject?.updatedAt, currentVideoProject?.id]);

  // ── Live collaborative editing ──
  // Broadcast the timeline whenever it changes locally. Skips changes that were
  // themselves applied from a remote peer (remoteApplyRef) so we don't loop.
  // Debounced so rapid edits (e.g. dragging a trim handle) coalesce into one send.
  useEffect(() => {
    if (!currentVideoProject) return;
    if (remoteApplyRef.current) {
      remoteApplyRef.current = false;
      return;
    }
    const t = setTimeout(() => publishEditorState(projectRef.current), 150);
    return () => clearTimeout(t);
  }, [currentVideoProject?.updatedAt]);

  // Adopt a collaborator's timeline snapshot without re-broadcasting it.
  const applyRemoteProjectState = (project: VideoProject) => {
    remoteApplyRef.current = true;
    skipHistoryRef.current = true;
    setCurrentVideoProjectState(project);
    projectRef.current = project;
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(project)
    ).catch((e) => console.log('Failed to persist remote project state', e));
  };

  const persistSnapshot = (project: VideoProject) => {
    projectRef.current = project;
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(project)
    ).catch((e) => console.log('Failed to persist undo/redo snapshot', e));
  };

  const undo = () => {
    const curr = projectRef.current;
    if (!curr || pastRef.current.length === 0) return;
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [
      ...futureRef.current.slice(-(MAX_UNDO - 1)),
      cloneProject(curr),
    ];
    skipHistoryRef.current = true;
    setCurrentVideoProjectState(previous);
    persistSnapshot(previous);
    setHistoryVersion((v) => v + 1);
  };

  const redo = () => {
    const curr = projectRef.current;
    if (!curr || futureRef.current.length === 0) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [
      ...pastRef.current.slice(-(MAX_UNDO - 1)),
      cloneProject(curr),
    ];
    skipHistoryRef.current = true;
    setCurrentVideoProjectState(next);
    persistSnapshot(next);
    setHistoryVersion((v) => v + 1);
  };

  // CapCut-style autosave: every 2 minutes when the timeline has clips.
  useEffect(() => {
    const tick = async () => {
      const proj = projectRef.current;
      if (!proj?.projectId || !proj.clips?.length) return;

      // Honor per-project autoSave pref when present (default true).
      try {
        const raw = await AsyncStorage.getItem(
          `${CONFIG.ASYNC_STORAGE_KEYS.PROJECT_PREFS_PREFIX}${proj.projectId}`
        );
        if (raw) {
          const prefs = JSON.parse(raw);
          if (prefs?.autoSave === false) return;
        }
      } catch {
        // ignore pref read errors — still autosave
      }

      const fingerprint = `${proj.updatedAt}|${proj.clips.length}|${proj.totalDurationMs}`;
      if (fingerprint === lastAutoFingerprint.current) return;

      try {
        await versionService.createVersion(proj.projectId, {
          kind: 'auto',
          changeSummary: 'Auto-save',
          thumbnailUrl: proj.coverThumbnailUri,
          snapshot: buildVersionSnapshot(proj),
        });
        lastAutoFingerprint.current = fingerprint;
      } catch (e) {
        console.log('Version auto-save skipped', e);
      }
    };

    const id = setInterval(tick, 2 * 60 * 1000);
    // Also try once shortly after edits land (quiet period).
    const debounce = setTimeout(tick, 45_000);
    return () => {
      clearInterval(id);
      clearTimeout(debounce);
    };
  }, [currentVideoProject?.updatedAt, currentVideoProject?.projectId]);

  // Wraps the setter so every call also persists to (or clears) AsyncStorage.
  const setCurrentVideoProject = (project: VideoProject | null) => {
    // Loading / replacing a project resets the undo stack.
    pastRef.current = [];
    futureRef.current = [];
    prevForHistoryRef.current = null;
    lastHistoryPushAt.current = 0;
    skipHistoryRef.current = true;
    setHistoryVersion((v) => v + 1);
    setCurrentVideoProjectState(project);
    projectRef.current = project;
    if (project) {
      AsyncStorage.setItem(
        CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
        JSON.stringify(project)
      ).catch((e) => console.log('Failed to persist current video project', e));
    } else {
      AsyncStorage.removeItem(CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT).catch((e) =>
        console.log('Failed to clear current video project', e)
      );
    }
  };

// ADDED: updates trim points for one clip and persists the whole project//
const updateClipTrim = (clipId: string, trimStartMs: number, trimEndMs: number) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updatedClips = prev.clips.map((c) =>
      c.id === clipId ? { ...c, trimStartMs, trimEndMs } : c
    );
    const totalDurationMs = updatedClips.reduce((acc, c) => {
      const start = c.trimStartMs ?? 0;
      const end = c.trimEndMs ?? c.durationMs;
      return acc + (end - start);
    }, 0);
    const updated = {
      ...prev,
      clips: updatedClips,
      totalDurationMs,
      updatedAt: new Date().toISOString()
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist trim update', e));
    return updated;
  });
};

const deleteClip = (clipId: string) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updatedClips = prev.clips.filter((c) => c.id !== clipId);
    const finalClips = updatedClips.map((c, idx) => ({ ...c, order: idx }));
    const totalDurationMs = finalClips.reduce((acc, c) => {
      const start = c.trimStartMs ?? 0;
      const end = c.trimEndMs ?? c.durationMs;
      return acc + (end - start);
    }, 0);
    const updated = {
      ...prev,
      clips: finalClips,
      totalDurationMs,
      updatedAt: new Date().toISOString()
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist delete clip', e));
    return updated;
  });
};

const duplicateClip = (clipId: string) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const clipToDuplicate = prev.clips.find((c) => c.id === clipId);
    if (!clipToDuplicate) return prev;
    const duplicated: VideoClip = {
      ...clipToDuplicate,
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      order: clipToDuplicate.order + 1,
      textOverlays: clipToDuplicate.textOverlays?.map((o) => ({
        ...o,
        id: `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      }))
    };
    const updatedClips = [...prev.clips];
    const index = prev.clips.findIndex((c) => c.id === clipId);
    updatedClips.splice(index + 1, 0, duplicated);
    const finalClips = updatedClips.map((c, idx) => ({ ...c, order: idx }));
    const totalDurationMs = finalClips.reduce((acc, c) => {
      const start = c.trimStartMs ?? 0;
      const end = c.trimEndMs ?? c.durationMs;
      return acc + (end - start);
    }, 0);
    const updated = {
      ...prev,
      clips: finalClips,
      totalDurationMs,
      updatedAt: new Date().toISOString()
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist duplicate clip', e));
    return updated;
  });
};

const splitClip = (clipId: string, splitTimeMs: number) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const clipIndex = prev.clips.findIndex((c) => c.id === clipId);
    if (clipIndex === -1) return prev;
    const clip = prev.clips[clipIndex];
    const start = clip.trimStartMs ?? 0;
    const end = clip.trimEndMs ?? clip.durationMs;

    if (splitTimeMs <= start || splitTimeMs >= end) {
      return prev;
    }

    const clip1 = { ...clip, trimEndMs: splitTimeMs };
    const clip2: VideoClip = {
      ...clip,
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      trimStartMs: splitTimeMs,
      trimEndMs: end,
      order: clip.order + 1,
      textOverlays: []
    };

    const updatedClips = [...prev.clips];
    updatedClips[clipIndex] = clip1;
    updatedClips.splice(clipIndex + 1, 0, clip2);

    const finalClips = updatedClips.map((c, idx) => ({ ...c, order: idx }));
    const totalDurationMs = finalClips.reduce((acc, c) => {
      const start = c.trimStartMs ?? 0;
      const end = c.trimEndMs ?? c.durationMs;
      return acc + (end - start);
    }, 0);

    const updated = {
      ...prev,
      clips: finalClips,
      totalDurationMs,
      updatedAt: new Date().toISOString()
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist split clip', e));
    return updated;
  });
};

/** Insert a trimmed copy of a clip after it (shorts / reel suggestions). */
const insertClipRange = (
  clipId: string,
  startMs: number,
  endMs: number
): string | null => {
  let newId: string | null = null;
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const clipIndex = prev.clips.findIndex((c) => c.id === clipId);
    if (clipIndex === -1) return prev;
    const clip = prev.clips[clipIndex];
    const s = Math.max(0, Math.round(startMs));
    const e = Math.min(clip.durationMs, Math.round(endMs));
    if (e - s < 200) return prev;

    newId = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const piece: VideoClip = {
      ...clip,
      id: newId,
      trimStartMs: s,
      trimEndMs: e,
      textOverlays: (clip.textOverlays ?? [])
        .filter(
          (o) =>
            o.startMs + (o.durationMs ?? 0) > s && o.startMs < e
        )
        .map((o) => ({
          ...o,
          id: `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        })),
      transitionOut: undefined,
      order: clip.order + 1,
    };

    const updatedClips = [...prev.clips];
    updatedClips.splice(clipIndex + 1, 0, piece);
    const finalClips = updatedClips.map((c, idx) => ({ ...c, order: idx }));
    const totalDurationMs = finalClips.reduce((acc, c) => {
      const start = c.trimStartMs ?? 0;
      const end = c.trimEndMs ?? c.durationMs;
      return acc + (end - start);
    }, 0);
    const updated = {
      ...prev,
      clips: finalClips,
      totalDurationMs,
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((err) => console.log('Failed to persist insert clip range', err));
    return updated;
  });
  return newId;
};

/** Intro/outro blank page — solid color + animated title text. */
const addTitleCard = (
  card: TitleCardSettings,
  durationMs: number,
  where: 'start' | 'before' | 'after' | 'end',
  relativeClipId?: string | null
): string | null => {
  let newId: string | null = null;
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const dur = Math.max(500, Math.round(durationMs));
    newId = `title-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const titleOverlay = {
      ...createTextOverlay(newId, card.title, 0, dur),
      color: card.textColor ?? '#FFFFFF',
      fontSize: card.fontSize ?? 42,
      fontWeight: 'bold' as const,
      animationIn: card.animationIn ?? 'bounce',
      animationLoop: card.animationLoop ?? 'none',
      animationDurationMs: 700,
      y: 0.42,
    };
    const subtitleOverlay = card.subtitle?.trim()
      ? {
          ...createTextOverlay(newId, card.subtitle.trim(), 0, dur),
          color: card.textColor ?? '#FFFFFF',
          fontSize: Math.max(16, Math.round((card.fontSize ?? 42) * 0.45)),
          animationIn: card.animationIn ?? 'fade',
          animationDurationMs: 500,
          y: 0.55,
          textOpacity: 0.85,
        }
      : null;

    const piece: VideoClip = {
      id: newId,
      uri: '',
      durationMs: dur,
      trimStartMs: 0,
      trimEndMs: dur,
      order: 0,
      kind: 'title',
      titleCard: { ...card },
      textOverlays: subtitleOverlay
        ? [titleOverlay, subtitleOverlay]
        : [titleOverlay],
      volume: 0,
    };

    const sorted = [...prev.clips].sort((a, b) => a.order - b.order);
    let insertAt = sorted.length;
    if (where === 'start') insertAt = 0;
    else if (where === 'end') insertAt = sorted.length;
    else {
      const relId = relativeClipId ?? sorted[sorted.length - 1]?.id;
      const relIdx = sorted.findIndex((c) => c.id === relId);
      if (relIdx === -1) insertAt = sorted.length;
      else insertAt = where === 'before' ? relIdx : relIdx + 1;
    }
    sorted.splice(insertAt, 0, piece);
    return persistClips(prev, sorted, 'add title card');
  });
  return newId;
};

const moveClip = (clipId: string, direction: -1 | 1) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const sorted = [...prev.clips].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === clipId);
    if (idx === -1) return prev;
    const j = idx + direction;
    if (j < 0 || j >= sorted.length) return prev;
    const next = [...sorted];
    const tmp = next[idx];
    next[idx] = next[j];
    next[j] = tmp;
    return persistClips(prev, next, 'move clip');
  });
};

const resetClipEdits = (clipId: string) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const clips = prev.clips.map((c) =>
      c.id === clipId
        ? {
            ...c,
            trimStartMs: 0,
            trimEndMs: c.durationMs,
            segments: undefined,
          }
        : c
    );
    return persistClips(prev, clips, 'reset clip edits');
  });
};

const persistClips = (prev: VideoProject, clips: VideoClip[], logLabel: string): VideoProject => {
  const finalClips = clips.map((c, idx) => ({ ...c, order: idx }));
  const totalDurationMs = finalClips.reduce((acc, c) => {
    const start = c.trimStartMs ?? 0;
    const end = c.trimEndMs ?? c.durationMs;
    return acc + (end - start);
  }, 0);
  const updated = {
    ...prev,
    clips: finalClips,
    totalDurationMs,
    updatedAt: new Date().toISOString(),
  };
  AsyncStorage.setItem(
    CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
    JSON.stringify(updated)
  ).catch((e) => console.log(`Failed to persist ${logLabel}`, e));
  return updated;
};

const attachMultiCam = (clipId: string, group: MultiCamGroup) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const clips = prev.clips.map((c) =>
      c.id === clipId ? { ...c, multiCam: group } : c
    );
    return persistClips(prev, clips, 'multi-cam attach');
  });
};

const cutToMultiCamAngle = (
  clipId: string,
  angleId: string,
  splitTimeMs: number
): boolean => {
  let ok = false;
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const clipIndex = prev.clips.findIndex((c) => c.id === clipId);
    if (clipIndex === -1) return prev;
    const clip = prev.clips[clipIndex];
    if (!clip.multiCam || clip.multiCam.angleId === angleId) return prev;

    const start = clip.trimStartMs ?? 0;
    const end = clip.trimEndMs ?? clip.durationMs;
    const atEdge = splitTimeMs <= start + 120 || splitTimeMs >= end - 120;

    if (atEdge) {
      const remapped = multicamService.remapClipToAngle(clip, angleId);
      if (!remapped) return prev;
      ok = true;
      const clips = [...prev.clips];
      clips[clipIndex] = remapped;
      return persistClips(prev, clips, 'multi-cam remap');
    }

    const left: VideoClip = { ...clip, trimEndMs: splitTimeMs };
    const rightBase: VideoClip = {
      ...clip,
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      trimStartMs: splitTimeMs,
      trimEndMs: end,
      order: clip.order + 1,
      textOverlays: [],
      transitionOut: undefined,
    };
    const right = multicamService.remapClipToAngle(rightBase, angleId);
    if (!right) return prev;
    ok = true;
    const clips = [...prev.clips];
    clips.splice(clipIndex, 1, left, right);
    return persistClips(prev, clips, 'multi-cam director cut');
  });
  return ok;
};

/** Silence removal: one clip → N keep-windows sharing the same media URI. */
const applyKeepRanges = (
  clipId: string,
  ranges: { startMs: number; endMs: number }[]
): number => {
  const cleaned = ranges
    .map((r) => ({
      startMs: Math.max(0, Math.round(r.startMs)),
      endMs: Math.max(0, Math.round(r.endMs)),
    }))
    .filter((r) => r.endMs - r.startMs >= 200)
    .sort((a, b) => a.startMs - b.startMs);
  if (!cleaned.length) return 0;

  let created = 0;
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const clipIndex = prev.clips.findIndex((c) => c.id === clipId);
    if (clipIndex === -1) return prev;
    const clip = prev.clips[clipIndex];
    const winStart = clip.trimStartMs ?? 0;
    const winEnd = clip.trimEndMs ?? clip.durationMs;

    const pieces: VideoClip[] = cleaned
      .map((r) => ({
        startMs: Math.max(winStart, r.startMs),
        endMs: Math.min(winEnd, r.endMs),
      }))
      .filter((r) => r.endMs - r.startMs >= 200)
      .map((r, i) => {
        const overlays = (clip.textOverlays ?? [])
          .filter(
            (o) =>
              o.startMs + (o.durationMs ?? 0) > r.startMs && o.startMs < r.endMs
          )
          .map((o) => ({
            ...o,
            id: `overlay-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          }));
        return {
          ...clip,
          id:
            i === 0
              ? clip.id
              : `clip-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          trimStartMs: r.startMs,
          trimEndMs: r.endMs,
          textOverlays: overlays,
          transitionOut: undefined,
          order: clip.order + i,
        } as VideoClip;
      });

    if (!pieces.length) return prev;
    created = pieces.length;
    const nextClips = [...prev.clips];
    nextClips.splice(clipIndex, 1, ...pieces);
    const finalClips = nextClips.map((c, idx) => ({ ...c, order: idx }));
    const totalDurationMs = finalClips.reduce((acc, c) => {
      const s = c.trimStartMs ?? 0;
      const e = c.trimEndMs ?? c.durationMs;
      return acc + (e - s);
    }, 0);
    const updated = {
      ...prev,
      clips: finalClips,
      totalDurationMs,
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist silence removal', e));
    return updated;
  });
  return created;
};

//to update the volume of video//
const updateClipVolume = (clipId: string, volume: number) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updatedClips = prev.clips.map((c) =>
      c.id === clipId ? { ...c, volume } : c
    );
    const updated = {
      ...prev,
      clips: updatedClips,
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist volume update', e));
    return updated;
  });
};

const updateClipOpacity = (clipId: string, opacity: number) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const clips = prev.clips.map((c) =>
      c.id === clipId ? { ...c, opacity: Math.max(0, Math.min(1, opacity)) } : c
    );
    return persistClips(prev, clips, 'opacity');
  });
};

const patchClip = (
  clipId: string,
  patch: (c: VideoClip) => VideoClip,
  label: string
) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const clips = prev.clips.map((c) => (c.id === clipId ? patch(c) : c));
    return persistClips(prev, clips, label);
  });
};

const addClipVolumeKeyframe = (clipId: string, kf: ScalarKeyframe) => {
  patchClip(
    clipId,
    (c) => ({ ...c, volumeKeyframes: upsertScalarKeyframe(c.volumeKeyframes, kf) }),
    'volume keyframe'
  );
};
const clearClipVolumeKeyframes = (clipId: string) => {
  patchClip(clipId, (c) => ({ ...c, volumeKeyframes: undefined }), 'volume kf clear');
};
const addClipOpacityKeyframe = (clipId: string, kf: ScalarKeyframe) => {
  patchClip(
    clipId,
    (c) => ({ ...c, opacityKeyframes: upsertScalarKeyframe(c.opacityKeyframes, kf) }),
    'opacity keyframe'
  );
};
const clearClipOpacityKeyframes = (clipId: string) => {
  patchClip(clipId, (c) => ({ ...c, opacityKeyframes: undefined }), 'opacity kf clear');
};
const updateClipRotation = (clipId: string, rotation: number) => {
  patchClip(
    clipId,
    (c) => ({
      ...c,
      rotation: Math.max(-180, Math.min(180, rotation)),
    }),
    'clip rotation'
  );
};
const addClipRotationKeyframe = (clipId: string, kf: ScalarKeyframe) => {
  patchClip(
    clipId,
    (c) => ({
      ...c,
      rotation: kf.value,
      rotationKeyframes: upsertScalarKeyframe(c.rotationKeyframes, kf),
    }),
    'rotation keyframe'
  );
};
const clearClipRotationKeyframes = (clipId: string) => {
  patchClip(clipId, (c) => ({ ...c, rotationKeyframes: undefined }), 'rotation kf clear');
};

const setCanvasColor = (hex: string) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updated = {
      ...prev,
      canvasColor: hex,
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch(() => {});
    return updated;
  });
};

const updateClipLayout = (
  clipId: string,
  patch: {
    layoutX?: number;
    layoutY?: number;
    layoutScale?: number;
    flipH?: boolean;
    flipV?: boolean;
    opacity?: number;
    bgRemove?: BgRemoveSettings;
  }
) => {
  patchClip(clipId, (c) => ({ ...c, ...patch }), 'clip layout');
};

/** Ghost layer (big + transparent) + slightly smaller sharp foreground. */
const applyDoubleExposure = (clipId: string) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const clip = prev.clips.find((c) => c.id === clipId);
    if (!clip) return prev;
    const startMs = 0;
    const durationMs = Math.max(
      500,
      (clip.trimEndMs ?? clip.durationMs) - (clip.trimStartMs ?? 0)
    );
    const ghost: MediaOverlay = {
      id: `moverlay-dx-${Date.now()}`,
      type: 'video',
      uri: clip.uri,
      startMs,
      durationMs: prev.totalDurationMs || durationMs,
      x: 0.5,
      y: 0.42,
      scale: 2.35,
      rotation: 0,
      opacity: 0.38,
      flipH: clip.flipH,
      flipV: clip.flipV,
    };
    const clips = prev.clips.map((c) =>
      c.id === clipId
        ? {
            ...c,
            layoutScale: Math.min(c.layoutScale ?? 1, 0.88),
            layoutX: c.layoutX ?? 0.5,
            layoutY: c.layoutY ?? 0.55,
            opacity: c.opacity ?? 1,
          }
        : c
    );
    const updated: VideoProject = {
      ...prev,
      clips,
      canvasColor: prev.canvasColor ?? '#0B0D13',
      overlays: [...(prev.overlays ?? []), ghost],
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch(() => {});
    return updated;
  });
};

const addClipColorGradeKeyframe = (clipId: string, kf: ColorGradeKeyframe) => {
  patchClip(
    clipId,
    (c) => ({
      ...c,
      colorGradeKeyframes: upsertColorGradeKeyframe(c.colorGradeKeyframes, kf),
    }),
    'color keyframe'
  );
};
const clearClipColorGradeKeyframes = (clipId: string) => {
  patchClip(
    clipId,
    (c) => ({ ...c, colorGradeKeyframes: undefined }),
    'color kf clear'
  );
};
const addClipCropKeyframe = (clipId: string, kf: CropKeyframe) => {
  patchClip(
    clipId,
    (c) => ({ ...c, cropKeyframes: upsertCropKeyframe(c.cropKeyframes, kf) }),
    'crop keyframe'
  );
};
const clearClipCropKeyframes = (clipId: string) => {
  patchClip(clipId, (c) => ({ ...c, cropKeyframes: undefined }), 'crop kf clear');
};

const addTextPositionKeyframe = (
  clipId: string,
  overlayId: string,
  kf: TextPositionKeyframe
) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const clips = prev.clips.map((c) => {
      if (c.id !== clipId) return c;
      return updateOverlayInClip(c, overlayId, {
        keyframes: upsertTextPositionKeyframe(
          c.textOverlays?.find((o) => o.id === overlayId)?.keyframes,
          kf
        ),
      });
    });
    return persistClips(prev, clips, 'text position keyframe');
  });
};

const clearTextPositionKeyframes = (clipId: string, overlayId: string) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const clips = prev.clips.map((c) => {
      if (c.id !== clipId) return c;
      return updateOverlayInClip(c, overlayId, { keyframes: undefined });
    });
    return persistClips(prev, clips, 'text position kf clear');
  });
};

const appendRemoteClip = (clip: {
  uri: string;
  durationMs: number;
  title?: string;
  thumbnailUri?: string;
}): string | null => {
  let newId: string | null = null;
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    newId = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const piece: VideoClip = {
      id: newId,
      uri: clip.uri,
      durationMs: Math.max(500, clip.durationMs),
      trimStartMs: 0,
      trimEndMs: Math.max(500, clip.durationMs),
      thumbnailUri: clip.thumbnailUri,
      order: prev.clips.length,
      volume: 1,
      speed: 1,
    };
    return persistClips(prev, [...prev.clips, piece], 'stock footage append');
  });
  return newId;
};

//to update the speed of video//
const updateClipSpeed = (clipId: string, speed: number) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    // Picking a constant rate clears any active curve.
    const updatedClips = prev.clips.map((c) =>
      c.id === clipId ? { ...c, speed, speedCurve: 'none' as SpeedCurveId } : c
    );
    const updated = {
      ...prev,
      clips: updatedClips,
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist speed update', e));
    return updated;
  });
};

/** CapCut-style variable-speed curve (montage / hero / bullet / jumpcut). */
const updateClipSpeedCurve = (clipId: string, speedCurve: SpeedCurveId) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updatedClips = prev.clips.map((c) =>
      c.id === clipId ? { ...c, speedCurve } : c
    );
    const updated = {
      ...prev,
      clips: updatedClips,
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist speed curve', e));
    return updated;
  });
};

/** Play the clip backwards in the baked export (preview stays forward). */
const updateClipReversed = (clipId: string, reversed: boolean) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updatedClips = prev.clips.map((c) =>
      c.id === clipId ? { ...c, reversed } : c
    );
    const updated = {
      ...prev,
      clips: updatedClips,
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist reverse flag', e));
    return updated;
  });
};

// to update the filter applied to a clip
const updateClipFilter = (clipId: string, filterId: string) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updatedClips = prev.clips.map((c) =>
      c.id === clipId ? { ...c, filterId } : c
    );
    const updated = {
      ...prev,
      clips: updatedClips,
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist filter update', e));
    return updated;
  });
};

const updateClipEffect = (clipId: string, effectId: ClipEffectId, intensity = 0.55) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updatedClips = prev.clips.map((c) =>
      c.id === clipId ? { ...c, effectId, effectIntensity: intensity } : c
    );
    const updated = { ...prev, clips: updatedClips, updatedAt: new Date().toISOString() };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist effect', e));
    return updated;
  });
};

const applyMovieEffect = (clipId: string, effectId: MovieEffectId) => {
  patchClip(
    clipId,
    (c) => {
      const patch = buildMovieEffectPatch(effectId, c);
      return {
        ...c,
        movieEffectId: patch.movieEffectId,
        reversed: patch.reversed,
        speed: patch.speed,
        speedCurve: patch.speedCurve,
        effectId: patch.effectId,
        effectIntensity: patch.effectIntensity,
        filterId: patch.filterId ?? c.filterId,
        colorGrade: patch.colorGrade,
        opacity: patch.opacity,
        opacityKeyframes: patch.opacityKeyframes,
        volume: patch.volume ?? c.volume,
        volumeKeyframes: patch.volumeKeyframes,
        rotation: patch.rotation ?? c.rotation,
        rotationKeyframes: patch.rotationKeyframes,
      };
    },
    'movie effect'
  );
};

const applyEditTemplate = (clipId: string, template: EditTemplate) => {
  patchClip(
    clipId,
    (c) => editTemplateService.applyLook(c, template),
    'edit template'
  );
};

const updateClipColorGrade = (clipId: string, grade: Partial<ColorGrade>) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updatedClips = prev.clips.map((c) => {
      if (c.id !== clipId) return c;
      const base = c.colorGrade ?? DEFAULT_COLOR_GRADE;
      return { ...c, colorGrade: { ...base, ...grade } };
    });
    const updated = { ...prev, clips: updatedClips, updatedAt: new Date().toISOString() };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist color grade', e));
    return updated;
  });
};

const updateClipStabilize = (clipId: string, stabilize: StabilizeSettings) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updatedClips = prev.clips.map((c) =>
      c.id === clipId ? { ...c, stabilize } : c
    );
    const updated = { ...prev, clips: updatedClips, updatedAt: new Date().toISOString() };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist stabilize', e));
    return updated;
  });
};

const updateClipAutoReframe = (
  clipId: string,
  autoReframe: AutoReframeSettings | undefined
) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updatedClips = prev.clips.map((c) => {
      if (c.id !== clipId) return c;
      if (!autoReframe) {
        const { autoReframe: _drop, ...rest } = c;
        return {
          ...rest,
          cropRatioId: c.cropRatioId === 'tiktok' ? undefined : c.cropRatioId,
        } as VideoClip;
      }
      return {
        ...c,
        autoReframe,
        cropRatioId: autoReframe.ratioId || 'tiktok',
        cropOffsetX: 0.5,
        cropOffsetY: 0.5,
        cropZoom: 1,
      };
    });
    const updated = { ...prev, clips: updatedClips, updatedAt: new Date().toISOString() };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist auto-reframe', e));
    return updated;
  });
};

const updateClipAudioFx = (clipId: string, fx: Partial<ClipAudioFx>) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updatedClips = prev.clips.map((c) => {
      if (c.id !== clipId) return c;
      const base = { ...DEFAULT_AUDIO_FX, ...c.audioFx };
      return { ...c, audioFx: { ...base, ...fx } };
    });
    const updated = { ...prev, clips: updatedClips, updatedAt: new Date().toISOString() };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist audio fx', e));
    return updated;
  });
};

// Transition INTO the next clip (CapCut-style transition between two clips).
const updateClipTransition = (clipId: string, transition: ClipTransition | undefined) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updatedClips = prev.clips.map((c) =>
      c.id === clipId ? { ...c, transitionOut: transition } : c
    );
    const updated = {
      ...prev,
      clips: updatedClips,
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist transition update', e));
    return updated;
  });
};

// ── Media overlays (multi-track: PiP video, images/GIFs, emoji stickers) ──
// Project-level track above clips. Every mutator persists to AsyncStorage and
// rides the same collab broadcast as other edits (last-write-wins sync).
const persistOverlayUpdate = (
  prev: VideoProject,
  overlays: MediaOverlay[],
  logLabel: string
): VideoProject => {
  const updated = { ...prev, overlays, updatedAt: new Date().toISOString() };
  AsyncStorage.setItem(
    CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
    JSON.stringify(updated)
  ).catch((e) => console.log(`Failed to persist ${logLabel}`, e));
  return updated;
};

/** Adds a layer; returns the new overlay id for immediate selection in the UI. */
const addMediaOverlay = (overlay: Omit<MediaOverlay, 'id'>): string => {
  const id = `moverlay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    return persistOverlayUpdate(
      prev,
      [...(prev.overlays ?? []), { ...overlay, id }],
      'add media overlay'
    );
  });
  return id;
};

const updateMediaOverlay = (
  overlayId: string,
  changes: Partial<Omit<MediaOverlay, 'id'>>
) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const overlays = (prev.overlays ?? []).map((o) =>
      o.id === overlayId ? { ...o, ...changes } : o
    );
    return persistOverlayUpdate(prev, overlays, 'media overlay update');
  });
};

const removeMediaOverlay = (overlayId: string) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const overlays = (prev.overlays ?? []).filter((o) => o.id !== overlayId);
    return persistOverlayUpdate(prev, overlays, 'media overlay removal');
  });
};

/**
 * Records a keyframe at kf.timeMs. Keyframes within 100ms are replaced so
 * repeated "Add Keyframe" at the same playhead doesn't stack duplicates.
 * List stays sorted by timeMs for lerp in preview + export.
 */
const addOverlayKeyframe = (overlayId: string, kf: OverlayKeyframe) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const overlays = (prev.overlays ?? []).map((o) => {
      if (o.id !== overlayId) return o;
      const kept = (o.keyframes ?? []).filter(
        (k) => Math.abs(k.timeMs - kf.timeMs) > 100
      );
      const keyframes = [...kept, kf].sort((a, b) => a.timeMs - b.timeMs);
      return { ...o, keyframes };
    });
    return persistOverlayUpdate(prev, overlays, 'overlay keyframe');
  });
};

/** Drops all keyframes; overlay falls back to its base x/y/scale/rotation/opacity. */
const clearOverlayKeyframes = (overlayId: string) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const overlays = (prev.overlays ?? []).map((o) =>
      o.id === overlayId ? { ...o, keyframes: undefined } : o
    );
    return persistOverlayUpdate(prev, overlays, 'overlay keyframe clear');
  });
};

const updateClipSegments = (clipId: string, segments: VideoSegment[]) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updatedClips = prev.clips.map((c) =>
      c.id === clipId ? { ...c, segments } : c
    );
    const updated = {
      ...prev,
      clips: updatedClips,
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist segment update', e));
    return updated;
  });
};

// to update the crop ratio/position/zoom applied to a clip.
// Accepts a partial object so callers can update just the ratio (from the
// picker panel) or just offset/zoom (from CropOverlay's drag/pinch gestures)
// without needing to know or resend the other fields.
const updateClipCrop = (
  clipId: string,
  cropData: {
    cropRatioId?: string;
    cropOffsetX?: number;
    cropOffsetY?: number;
    cropZoom?: number;
  }
) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updatedClips = prev.clips.map((c) =>
      c.id === clipId ? { ...c, ...cropData } : c
    );
    const updated = {
      ...prev,
      clips: updatedClips,
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist crop update', e));
    return updated;
  });
};


const addTextOverlay = (
  clipId: string,
  text: string,
  startMs: number,
  durationMs: number = 3000
): string => {
  const overlay = createTextOverlay(clipId, text, startMs, durationMs);
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updatedClips = prev.clips.map((c) =>
      c.id === clipId ? addOverlayToClip(c, overlay) : c
    );
    const updated = {
      ...prev,
      clips: updatedClips,
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist text overlay add', e));
    return updated;
  });
  return overlay.id;
};

const updateTextOverlay = (
  clipId: string,
  overlayId: string,
  changes: Partial<TextOverlay>
) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updatedClips = prev.clips.map((c) =>
      c.id === clipId ? updateOverlayInClip(c, overlayId, changes) : c
    );
    const updated = {
      ...prev,
      clips: updatedClips,
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist text overlay update', e));
    return updated;
  });
};


const removeTextOverlay = (clipId: string, overlayId: string) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updatedClips = prev.clips.map((c) =>
      c.id === clipId ? removeOverlayFromClip(c, overlayId) : c
    );
    const updated = {
      ...prev,
      clips: updatedClips,
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist text overlay remove', e));
    return updated;
  });
};


const persistMusicTracks = (
  prev: VideoProject,
  musicTracks: BackgroundMusic[],
  logLabel: string
): VideoProject => {
  // Keep singular backgroundMusic = first track for older readers.
  const updated: VideoProject = {
    ...prev,
    musicTracks,
    backgroundMusic: musicTracks[0],
    updatedAt: new Date().toISOString(),
  };
  if (!musicTracks[0]) {
    delete updated.backgroundMusic;
  }
  AsyncStorage.setItem(
    CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
    JSON.stringify(updated)
  ).catch((e) => console.log(`Failed to persist ${logLabel}`, e));
  return updated;
};

/** Replaces all tracks with a single new one (legacy Music panel “pick”). */
const setBackgroundMusic = (uri: string, durationMs: number, title?: string) => {
  const music = createBackgroundMusic(uri, durationMs, 0, title);
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    return persistMusicTracks(prev, [music], 'set background music');
  });
};

/** Updates the first / only legacy track. Prefer updateMusicTrack. */
const updateBackgroundMusic = (changes: Partial<BackgroundMusic>) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const tracks = getMusicTracks(prev);
    if (!tracks.length) return prev;
    const next = tracks.map((t, i) =>
      i === 0 ? updateBackgroundMusicHelper(t, changes) : t
    );
    return persistMusicTracks(prev, next, 'background music update');
  });
};

const removeBackgroundMusic = () => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    return persistMusicTracks(prev, [], 'background music removal');
  });
};

const addMusicTrack = (
  uri: string,
  durationMs: number,
  startMs = 0,
  title?: string
): string => {
  const music = createBackgroundMusic(uri, durationMs, startMs, title);
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    return persistMusicTracks(prev, [...getMusicTracks(prev), music], 'add music track');
  });
  return music.id!;
};

const updateMusicTrack = (trackId: string, changes: Partial<BackgroundMusic>) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const next = getMusicTracks(prev).map((t) =>
      (t.id ?? 'legacy') === trackId ? updateBackgroundMusicHelper(t, changes) : t
    );
    return persistMusicTracks(prev, next, 'music track update');
  });
};

const removeMusicTrack = (trackId: string) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const next = getMusicTracks(prev).filter((t) => (t.id ?? 'legacy') !== trackId);
    return persistMusicTracks(prev, next, 'music track removal');
  });
};

const addBeatMarker = (timeMs: number) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const beatMarkersMs = upsertBeatMarker(prev.beatMarkersMs, timeMs);
    const updated = { ...prev, beatMarkersMs, updatedAt: new Date().toISOString() };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist beat marker', e));
    return updated;
  });
};

const removeBeatMarkerAt = (timeMs: number) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const beatMarkersMs = removeBeatMarkerHelper(prev.beatMarkersMs, timeMs);
    const updated = { ...prev, beatMarkersMs, updatedAt: new Date().toISOString() };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist beat marker remove', e));
    return updated;
  });
};

const clearBeatMarkers = () => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updated = { ...prev, beatMarkersMs: [], updatedAt: new Date().toISOString() };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to clear beat markers', e));
    return updated;
  });
};

const mergeBeatMarkers = (timesMs: number[]): number => {
  let added = 0;
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const before = prev.beatMarkersMs?.length ?? 0;
    const beatMarkersMs = mergeBeatMarkersHelper(prev.beatMarkersMs, timesMs);
    added = Math.max(0, beatMarkersMs.length - before);
    const updated = { ...prev, beatMarkersMs, updatedAt: new Date().toISOString() };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to merge beat markers', e));
    return updated;
  });
  return added;
};

// ── Voiceovers (narration takes on the project timeline) ──
const persistVoiceovers = (
  prev: VideoProject,
  voiceovers: VoiceoverClip[],
  logLabel: string
): VideoProject => {
  const updated = { ...prev, voiceovers, updatedAt: new Date().toISOString() };
  AsyncStorage.setItem(
    CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
    JSON.stringify(updated)
  ).catch((e) => console.log(`Failed to persist ${logLabel}`, e));
  return updated;
};

/** Records a take at startMs; returns the new id for UI selection. */
const addVoiceover = (uri: string, startMs: number, durationMs: number): string => {
  const id = `voiceover-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const clip = { id, ...createVoiceover(uri, startMs, durationMs) };
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    return persistVoiceovers(prev, [...(prev.voiceovers ?? []), clip], 'add voiceover');
  });
  return id;
};

const updateVoiceover = (
  voiceoverId: string,
  changes: Partial<Omit<VoiceoverClip, 'id'>>
) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const voiceovers = (prev.voiceovers ?? []).map((v) =>
      v.id === voiceoverId ? { ...v, ...changes } : v
    );
    return persistVoiceovers(prev, voiceovers, 'voiceover update');
  });
};

const removeVoiceover = (voiceoverId: string) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const voiceovers = (prev.voiceovers ?? []).filter((v) => v.id !== voiceoverId);
    return persistVoiceovers(prev, voiceovers, 'voiceover removal');
  });
};

  return (
    <VideoProjectContext.Provider
      value={{
        currentVideoProject,
        setCurrentVideoProject,
        applyRemoteProjectState,
        undo,
        redo,
        canUndo,
        canRedo,
        updateClipTrim,
        deleteClip,
        duplicateClip,
        splitClip,
        applyKeepRanges,
        insertClipRange,
        addTitleCard,
        moveClip,
        resetClipEdits,
        attachMultiCam,
        cutToMultiCamAngle,
        updateClipVolume, // ADDED
        updateClipOpacity,
        addClipVolumeKeyframe,
        clearClipVolumeKeyframes,
        addClipOpacityKeyframe,
        clearClipOpacityKeyframes,
        updateClipRotation,
        addClipRotationKeyframe,
        clearClipRotationKeyframes,
        setCanvasColor,
        updateClipLayout,
        applyDoubleExposure,
        addClipColorGradeKeyframe,
        clearClipColorGradeKeyframes,
        addClipCropKeyframe,
        clearClipCropKeyframes,
        addTextPositionKeyframe,
        clearTextPositionKeyframes,
        appendRemoteClip,
        updateClipSpeed, // ADDED
        updateClipSpeedCurve,
        updateClipReversed,
        addTextOverlay,      // ADD
        updateTextOverlay,   // ADD
        removeTextOverlay, 
         updateClipFilter,
        updateClipEffect,
        applyMovieEffect,
        applyEditTemplate,
        updateClipColorGrade,
        updateClipStabilize,
        updateClipAutoReframe,
        updateClipAudioFx,
        updateClipSegments,
        updateClipTransition,
        addMediaOverlay,
        updateMediaOverlay,
        removeMediaOverlay,
        addOverlayKeyframe,
        clearOverlayKeyframes,
        updateClipCrop,
        setBackgroundMusic,
        updateBackgroundMusic,
        removeBackgroundMusic,
        addMusicTrack,
        updateMusicTrack,
        removeMusicTrack,
        addVoiceover,
        updateVoiceover,
        removeVoiceover,
        addBeatMarker,
        removeBeatMarker: removeBeatMarkerAt,
        clearBeatMarkers,
        mergeBeatMarkers,
      }}
    >
      {children}
    </VideoProjectContext.Provider>
  );
}
// ─── Hook ────────────────────────────────────────────────────────────────────
export function useVideoProject() {
  const context = useContext(VideoProjectContext);
  if (!context) throw new Error('useVideoProject must be used within VideoProjectProvider');
  return context;
}
