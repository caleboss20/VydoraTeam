import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VideoProject, TextOverlay, VideoClip, BackgroundMusic, VideoSegment, ClipTransition, MediaOverlay, OverlayKeyframe } from '../types';
import { CONFIG } from '../config';
import { buildVersionSnapshot, versionService } from '../services/VersionHistory';
import { publishState as publishEditorState } from '../socket/editorSync';

import {
  createTextOverlay,
  addOverlayToClip,
  updateOverlayInClip,
  removeOverlayFromClip,
} from '../services/textOverlayservice';
import { createBackgroundMusic,updateBackgroundMusic as updateBackgroundMusicHelper } from '../services/BackgroundmusicService';



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
  updateClipTrim: (clipId: string, trimStartMs: number, trimEndMs: number) => void; // ADDED
  deleteClip: (clipId: string) => void;
  duplicateClip: (clipId: string) => void;
  splitClip: (clipId: string, splitTimeMs: number) => void;
  updateClipVolume: (clipId: string, volume: number) => void;
  updateClipSpeed: (clipId: string, speed: number) => void;
  updateClipFilter: (clipId: string, filterId: string) => void;
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

  setBackgroundMusic: (uri: string, durationMs: number) => void;
updateBackgroundMusic: (changes: Partial<BackgroundMusic>) => void;
removeBackgroundMusic: () => void;

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
export function VideoProjectProvider({ children }: { children: ReactNode }) {
  const [currentVideoProject, setCurrentVideoProjectState] = useState<VideoProject | null>(null);
  const projectRef = useRef<VideoProject | null>(null);
  const lastAutoFingerprint = useRef<string>('');
  // When a change originates from a remote collaborator we must NOT broadcast it
  // back out, or two clients would ping-pong forever.
  const remoteApplyRef = useRef<boolean>(false);

  // ── Rehydrate on launch so the last-edited video survives an app restart ──
  useEffect(() => {
    const rehydrate = async () => {
      try {
        const cached = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT);
        if (cached) {
          const parsed = JSON.parse(cached) as VideoProject;
          setCurrentVideoProjectState(parsed);
          projectRef.current = parsed;
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
    setCurrentVideoProjectState(project);
    projectRef.current = project;
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(project)
    ).catch((e) => console.log('Failed to persist remote project state', e));
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

//to update the speed of video//
const updateClipSpeed = (clipId: string, speed: number) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updatedClips = prev.clips.map((c) =>
      c.id === clipId ? { ...c, speed } : c
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


const setBackgroundMusic = (uri: string, durationMs: number) => {
  const music = createBackgroundMusic(uri, durationMs);
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const updated = {
      ...prev,
      backgroundMusic: music,
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist background music add', e));
    return updated;
  });
};
// to update volume, trim, or start position of the existing background music

const updateBackgroundMusic = (changes: Partial<BackgroundMusic>) => {
  setCurrentVideoProjectState((prev) => {
    if (!prev || !prev.backgroundMusic) return prev;
    const updatedMusic = updateBackgroundMusicHelper(prev.backgroundMusic, changes);
    const updated = {
      ...prev,
      backgroundMusic: updatedMusic,
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist background music update', e));
    return updated;
  });
};
// to remove the background music entirely
const removeBackgroundMusic = () => {
  setCurrentVideoProjectState((prev) => {
    if (!prev) return prev;
    const { backgroundMusic, ...rest } = prev;
    const updated = {
      ...rest,
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT,
      JSON.stringify(updated)
    ).catch((e) => console.log('Failed to persist background music removal', e));
    return updated;
  });
};




  return (
    <VideoProjectContext.Provider
      value={{
        currentVideoProject,
        setCurrentVideoProject,
        applyRemoteProjectState,
        updateClipTrim,
        deleteClip,
        duplicateClip,
        splitClip,
        updateClipVolume, // ADDED
        updateClipSpeed, // ADDED
        addTextOverlay,      // ADD
        updateTextOverlay,   // ADD
        removeTextOverlay, 
         updateClipFilter,
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
        removeBackgroundMusic

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
