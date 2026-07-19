/**
 * ProjectContext — Dashboard / ProjectDetail data layer.
 * Fetches from projectService (real API when CONFIG.USE_MOCK is false) and
 * mirrors the list into AsyncStorage keyed by user id (never cross-user cache).
 * No UI here — screens keep their existing styles and bindings (`project.name`, etc.).
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project, ProjectStatus } from '../types';
import { projectService } from '../services/projectservice';
import { useAuth } from './Authcontext';
import { CONFIG } from '../config';

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  renameProject: (projectId: string, newName: string) => Promise<void>;
  fetchProjects: () => Promise<void>;
  createProject: (
    name: string,
    description: string,
    visibility: 'Private' | 'Team' | 'Public',
    thumbnailUrl?: string
  ) => Promise<Project>;
  setCurrentProject: (project: Project) => void;
  updateStatus: (projectId: string, status: ProjectStatus) => Promise<void>;
  updateThumbnail: (projectId: string, thumbnailUrl: string) => Promise<void>;
  updateVisibility: (
    projectId: string,
    visibility: 'Private' | 'Team' | 'Public'
  ) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

function projectsKeyForUser(userId: string) {
  return `${CONFIG.ASYNC_STORAGE_KEYS.PROJECTS}:${userId}`;
}

function currentProjectKeyForUser(userId: string) {
  return `${CONFIG.ASYNC_STORAGE_KEYS.CURRENT_PROJECT}:${userId}`;
}

async function clearLegacyProjectCache() {
  await Promise.all([
    AsyncStorage.removeItem(CONFIG.ASYNC_STORAGE_KEYS.PROJECTS),
    AsyncStorage.removeItem(CONFIG.ASYNC_STORAGE_KEYS.CURRENT_PROJECT),
  ]);
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  // On user switch / logout: wipe in-memory list so the previous account never paints.
  useEffect(() => {
    const userId = user?.id ?? null;
    if (lastUserIdRef.current && lastUserIdRef.current !== userId) {
      setProjects([]);
      setCurrentProjectState(null);
      setError(null);
    }
    if (!userId) {
      setProjects([]);
      setCurrentProjectState(null);
      clearLegacyProjectCache().catch(() => undefined);
    }
    lastUserIdRef.current = userId;
  }, [user?.id]);

  // Rehydrate only this user's cache, then always refresh from the API.
  useEffect(() => {
    if (!token || !user?.id) return;

    let cancelled = false;
    const userId = user.id;

    const load = async () => {
      try {
        await clearLegacyProjectCache();
        const [cachedProjects, cachedCurrent] = await Promise.all([
          AsyncStorage.getItem(projectsKeyForUser(userId)),
          AsyncStorage.getItem(currentProjectKeyForUser(userId)),
        ]);
        if (!cancelled && cachedProjects) {
          const parsed = JSON.parse(cachedProjects) as Project[];
          // Safety: never show another owner's rows from a bad cache write.
          setProjects(parsed.filter((p) => p.ownerId === userId));
        }
        if (!cancelled && cachedCurrent) {
          const cur = JSON.parse(cachedCurrent) as Project;
          if (cur.ownerId === userId) setCurrentProjectState(cur);
        }
      } catch (e) {
        console.log('Project rehydration failed', e);
      }

      try {
        if (cancelled) return;
        setIsLoading(true);
        setError(null);
        const data = await projectService.getProjects(token, userId);
        if (cancelled) return;
        setProjects(data);
        await AsyncStorage.setItem(projectsKeyForUser(userId), JSON.stringify(data));
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message);
          // Failed fetch after login must not keep another account's list.
          setProjects([]);
          await AsyncStorage.removeItem(projectsKeyForUser(userId)).catch(() => undefined);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token, user?.id]);

  const fetchProjects = async () => {
    if (!token || !user?.id) {
      setProjects([]);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const data = await projectService.getProjects(token, user.id);
      setProjects(data);
      await AsyncStorage.setItem(projectsKeyForUser(user.id), JSON.stringify(data));
    } catch (e: any) {
      setError(e.message);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const setCurrentProject = (project: Project) => {
    setCurrentProjectState(project);
    if (!user?.id) return;
    AsyncStorage.setItem(currentProjectKeyForUser(user.id), JSON.stringify(project)).catch(
      (e) => console.log('Failed to persist current project', e)
    );
  };

  const persistList = async (updatedList: Project[]) => {
    setProjects(updatedList);
    if (user?.id) {
      await AsyncStorage.setItem(projectsKeyForUser(user.id), JSON.stringify(updatedList));
    }
  };

  const createProject = async (
    name: string,
    description: string,
    visibility: 'Private' | 'Team' | 'Public',
    thumbnailUrl?: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      const newProject = await projectService.createProject(
        name,
        description,
        visibility,
        token!,
        thumbnailUrl
      );
      const updatedList = [newProject, ...projects];
      await persistList(updatedList);
      setCurrentProject(newProject);
      return newProject;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (projectId: string, status: ProjectStatus) => {
    try {
      setError(null);
      const updated = await projectService.updateStatus(projectId, status, token!);
      const updatedList = projects.map((p) => (p.id === projectId ? updated : p));
      await persistList(updatedList);
      if (currentProject?.id === projectId) setCurrentProject(updated);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const renameProject = async (projectId: string, newName: string) => {
    try {
      setError(null);
      const updated = await projectService.renameProject(projectId, newName, token!);
      const updatedList = projects.map((p) => (p.id === projectId ? updated : p));
      await persistList(updatedList);
      if (currentProject?.id === projectId) setCurrentProject(updated);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const updateThumbnail = async (projectId: string, thumbnailUrl: string) => {
    try {
      setError(null);
      const updated = await projectService.updateThumbnail(projectId, thumbnailUrl, token!);
      const updatedList = projects.map((p) => (p.id === projectId ? updated : p));
      await persistList(updatedList);
      if (currentProject?.id === projectId) setCurrentProject(updated);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const updateVisibility = async (
    projectId: string,
    visibility: 'Private' | 'Team' | 'Public'
  ) => {
    try {
      setError(null);
      const updated = await projectService.updateVisibility(
        projectId,
        visibility,
        token!
      );
      const updatedList = projects.map((p) => (p.id === projectId ? updated : p));
      await persistList(updatedList);
      if (currentProject?.id === projectId) setCurrentProject(updated);
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      setError(null);
      await projectService.deleteProject(projectId, token!);
      const updatedList = projects.filter((p) => p.id !== projectId);
      await persistList(updatedList);
      if (currentProject?.id === projectId) {
        setCurrentProjectState(null);
        if (user?.id) {
          await AsyncStorage.removeItem(currentProjectKeyForUser(user.id));
        }
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        isLoading,
        error,
        renameProject,
        fetchProjects,
        createProject,
        setCurrentProject,
        updateStatus,
        updateThumbnail,
        updateVisibility,
        deleteProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within ProjectProvider');
  return context;
}
