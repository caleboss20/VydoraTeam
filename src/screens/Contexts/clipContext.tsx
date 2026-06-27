//For clip context//
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';
import { Clip } from '../types';
import { clipService } from '../services/clipService';
import { useAuth } from './Authcontext';
// ─── Context Type ─────────────────────────────────────────────────────────────
interface ClipContextType {
  clips: { [projectId: string]: Clip[] };
  isLoading: boolean;
  error: string | null;
  fetchClips: (projectId: string) => Promise<void>;
  addClip: (projectId: string, title: string, duration: string, resolution: string) => Promise<void>;
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
  const fetchClips = async (projectId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await clipService.getClips(projectId, token!);
      setClips(prev => ({ ...prev, [projectId]: data }));
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
    resolution: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      const newClip = await clipService.addClip(
        projectId,
        title,
        duration,
        resolution,
        token!
      );
      setClips(prev => ({
        ...prev,
        [projectId]: [newClip, ...(prev[projectId] || [])],
      }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };
  const deleteClip = async (projectId: string, clipId: string) => {
    try {
      setError(null);
      await clipService.deleteClip(projectId, clipId, token!);
      setClips(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter(c => c.id !== clipId),
      }));
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