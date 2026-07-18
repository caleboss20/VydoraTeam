import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Clip } from '../types';
import { clipService } from '../services/clipService';
import { useAuth } from './Authcontext';
import { CONFIG } from '../config';
// ─── Context Type ─────────────────────────────────────────────────────────────
interface ClipContextType {
  clips: { [projectId: string]: Clip[] };
  isLoading: boolean;
  error: string | null;
  fetchClips: (projectId: string) => Promise<void>;
  /**
   * Create a collaboration clip. For the real API, pass `videoUrl` (and ideally
   * `durationSeconds`) from uploadService — required by CreateClipRequest.
   */
  addClip: (
    projectId: string,
    title: string,
    duration: string,
    resolution: string,
    options?: { videoUrl?: string; durationSeconds?: number; order?: number }
  ) => Promise<void>;
  deleteClip: (projectId: string, clipId: string) => Promise<void>;
  getClipsForProject: (projectId: string) => Clip[];
}
// ─── Context ─────────────────────────────────────────────────────────────────
const ClipContext = createContext<ClipContextType | undefined>(undefined);
// ─── Provider ────────────────────────────────────────────────────────────────
export function ClipProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [clips, setClips] = useState<{ [projectId: string]: Clip[] }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ── Rehydrate the whole { [projectId]: Clip[] } map from AsyncStorage ──
  useEffect(() => {
    const rehydrate = async () => {
      try {
        const cached = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.CLIPS);
        if (cached) setClips(JSON.parse(cached));
      } catch (e) {
        console.log('Clip rehydration failed', e);
      }
    };
    rehydrate();
  }, []);
  // Small helper so every mutation persists the same way — avoids repeating
  // the AsyncStorage.setItem call (and risking a typo'd key) in four places.
  const persist = async (next: { [projectId: string]: Clip[] }) => {
    await AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.CLIPS, JSON.stringify(next));
  };
  const fetchClips = async (projectId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await clipService.getClips(projectId, token!);
      const next = { ...clips, [projectId]: data };
      setClips(next);
      await persist(next);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };
  const addClip = async (
    projectId: string,
    title: string,
    duration: string,
    resolution: string,
    options?: { videoUrl?: string; durationSeconds?: number; order?: number }
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      const newClip = await clipService.addClip(
        projectId,
        title,
        duration,
        resolution,
        token!,
        options
      );
      const next = {
        ...clips,
        [projectId]: [newClip, ...(clips[projectId] || [])],
      };
      setClips(next);
      await persist(next);
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };
  const deleteClip = async (projectId: string, clipId: string) => {
    try {
      setError(null);
      await clipService.deleteClip(projectId, clipId, token!);
      const next = {
        ...clips,
        [projectId]: (clips[projectId] || []).filter(c => c.id !== clipId),
      };
      setClips(next);
      await persist(next);
    } catch (e: any) {
      setError(e.message);
    }
  };
  const getClipsForProject = (projectId: string): Clip[] => {
    return clips[projectId] || [];
  };
  return (
    <ClipContext.Provider value={{
      clips,
      isLoading,
      error,
      fetchClips,
      addClip,
      deleteClip,
      getClipsForProject,
    }}>
      {children}
    </ClipContext.Provider>
  );
}
// ─── Hook ────────────────────────────────────────────────────────────────────
export function useClip() {
  const context = useContext(ClipContext);
  if (!context) throw new Error('useClip must be used within ClipProvider');
  return context;
}