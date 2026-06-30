import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Comment } from '../types';
import { commentService } from '../services/commentService';
import { useAuth } from './Authcontext';
import { CONFIG } from '../config';
// ─── Context Type ─────────────────────────────────────────────────────────────
interface CommentContextType {
  comments: { [projectId: string]: Comment[] };
  isLoading: boolean;
  error: string | null;
  fetchComments: (projectId: string) => Promise<void>;
  addComment: (projectId: string, clipId: string, text: string) => Promise<void>;
  deleteComment: (projectId: string, commentId: string) => Promise<void>;
  getCommentsForProject: (projectId: string) => Comment[];
  getCommentsForClip: (projectId: string, clipId: string) => Comment[];
}
// ─── Context ─────────────────────────────────────────────────────────────────
const CommentContext = createContext<CommentContextType | undefined>(undefined);
// ─── Provider ────────────────────────────────────────────────────────────────
export function CommentProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [comments, setComments] = useState<{ [projectId: string]: Comment[] }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ── Rehydrate the whole { [projectId]: Comment[] } map from AsyncStorage ──
  useEffect(() => {
    const rehydrate = async () => {
      try {
        const cached = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.COMMENTS);
        if (cached) setComments(JSON.parse(cached));
      } catch (e) {
        console.log('Comment rehydration failed', e);
      }
    };
    rehydrate();
  }, []);
  const persist = async (next: { [projectId: string]: Comment[] }) => {
    await AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.COMMENTS, JSON.stringify(next));
  };
  const fetchComments = async (projectId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await commentService.getComments(projectId, token!);
      const next = { ...comments, [projectId]: data };
      setComments(next);
      await persist(next);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };
  const addComment = async (
    projectId: string,
    clipId: string,
    text: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      const newComment = await commentService.addComment(projectId, clipId, text, token!);
      const next = {
        ...comments,
        [projectId]: [newComment, ...(comments[projectId] || [])],
      };
      setComments(next);
      await persist(next);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };
  const deleteComment = async (projectId: string, commentId: string) => {
    try {
      setError(null);
      await commentService.deleteComment(projectId, commentId, token!);
      const next = {
        ...comments,
        [projectId]: (comments[projectId] || []).filter(c => c.id !== commentId),
      };
      setComments(next);
      await persist(next);
    } catch (e: any) {
      setError(e.message);
    }
  };
  const getCommentsForProject = (projectId: string): Comment[] => {
    return comments[projectId] || [];
  };
  const getCommentsForClip = (projectId: string, clipId: string): Comment[] => {
    return (comments[projectId] || []).filter(c => c.clipId === clipId);
  };
  return (
    <CommentContext.Provider value={{
      comments,
      isLoading,
      error,
      fetchComments,
      addComment,
      deleteComment,
      getCommentsForProject,
      getCommentsForClip,
    }}>
      {children}
    </CommentContext.Provider>
  );
}
// ─── Hook ────────────────────────────────────────────────────────────────────
export function useComment() {
  const context = useContext(CommentContext);
  if (!context) throw new Error('useComment must be used within CommentProvider');
  return context;
}