import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VideoProject } from '../types';
import { CONFIG } from '../config';
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
  updateClipTrim: (clipId: string, trimStartMs: number, trimEndMs: number) => void; // ADDED
  deleteClip: (clipId: string) => void;
  duplicateClip: (clipId: string) => void;
  splitClip: (clipId: string, splitTimeMs: number) => void;
}
// ─── Context ─────────────────────────────────────────────────────────────────
const VideoProjectContext = createContext<VideoProjectContextType | undefined>(undefined);
// ─── Provider ────────────────────────────────────────────────────────────────
export function VideoProjectProvider({ children }: { children: ReactNode }) {
  const [currentVideoProject, setCurrentVideoProjectState] = useState<VideoProject | null>(null);
  // ── Rehydrate on launch so the last-edited video survives an app restart ──
  useEffect(() => {
    const rehydrate = async () => {
      try {
        const cached = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.CURRENT_VIDEO_PROJECT);
        if (cached) setCurrentVideoProjectState(JSON.parse(cached));
      } catch (e) {
        console.log('Video project rehydration failed', e);
      }
    };
    rehydrate();
  }, []);
  // Wraps the setter so every call also persists to (or clears) AsyncStorage.
  const setCurrentVideoProject = (project: VideoProject | null) => {
    setCurrentVideoProjectState(project);
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



  return (
    <VideoProjectContext.Provider
      value={{
        currentVideoProject,
        setCurrentVideoProject,
        updateClipTrim,
        deleteClip,
        duplicateClip,
        splitClip
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