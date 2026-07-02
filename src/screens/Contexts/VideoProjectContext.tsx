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
  return (
    <VideoProjectContext.Provider value={{ currentVideoProject, setCurrentVideoProject }}>
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