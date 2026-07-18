/**
 * ProjectContext — Dashboard / ProjectDetail data layer.
 * Fetches from projectService (real API when CONFIG.USE_MOCK is false) and
 * mirrors the list into AsyncStorage for offline-first cold starts.
 * No UI here — screens keep their existing styles and bindings (`project.name`, etc.).
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project, ProjectStatus } from '../types';
import { projectService } from '../services/projectservice';
import { useAuth } from './Authcontext';
import { CONFIG } from '../config';
// ─── Context Type ─────────────────────────────────────────────────────────────
interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  renameProject: (projectId: string, newName: string) => Promise<void>;
  fetchProjects: () => Promise<void>;
  createProject: (name: string, description: string, visibility: 'Private' | 'Team' | 'Public', thumbnailUrl?: string) => Promise<void>;
  setCurrentProject: (project: Project) => void;
  updateStatus: (projectId: string, status: ProjectStatus) => Promise<void>;
  updateThumbnail: (projectId: string, thumbnailUrl: string) => Promise<void>; // ADDED
  deleteProject: (projectId: string) => Promise<void>;
}
// ─── Context ─────────────────────────────────────────────────────────────────
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);
// ─── Provider ────────────────────────────────────────────────────────────────
export function ProjectProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [projects, setProjects]             = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [isLoading, setIsLoading]           = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  // ── Rehydrate from AsyncStorage on launch (offline-first) ──
  useEffect(() => {
    const rehydrate = async () => {
      try {
        const cachedProjects = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.PROJECTS);
        const cachedCurrent  = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.CURRENT_PROJECT);
        if (cachedProjects) setProjects(JSON.parse(cachedProjects));
        if (cachedCurrent) setCurrentProjectState(JSON.parse(cachedCurrent));
      } catch (e) {
        console.log('Project rehydration failed', e);
      }
    };
    rehydrate();
  }, []);
  // ── Fetch fresh data once token is available ──
  useEffect(() => {
    if (token) fetchProjects();
  }, [token]);
  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await projectService.getProjects(token!);
      setProjects(data);
      await AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.PROJECTS, JSON.stringify(data));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };
  // wraps setCurrentProject so every call also persists to AsyncStorage
  const setCurrentProject = (project: Project) => {
    setCurrentProjectState(project);
    AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.CURRENT_PROJECT, JSON.stringify(project)).catch(
      (e) => console.log('Failed to persist current project', e)
    );
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
      const newProject = await projectService.createProject(name, description, visibility, token!, thumbnailUrl);
      const updatedList = [newProject, ...projects];
      setProjects(updatedList);
      setCurrentProject(newProject);
      await AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.PROJECTS, JSON.stringify(updatedList));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };
  const updateStatus = async (projectId: string, status: ProjectStatus) => {
    try {
      setError(null);
      const updated = await projectService.updateStatus(projectId, status, token!);
      const updatedList = projects.map(p => p.id === projectId ? updated : p);
      setProjects(updatedList);
      await AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.PROJECTS, JSON.stringify(updatedList));
      if (currentProject?.id === projectId) setCurrentProject(updated);
    } catch (e: any) {
      setError(e.message);
    }
  };
  const renameProject = async (projectId: string, newName: string) => {
    try {
      setError(null);
      const updated = await projectService.renameProject(projectId, newName, token!);
      const updatedList = projects.map(p => p.id === projectId ? updated : p);
      setProjects(updatedList);
      await AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.PROJECTS, JSON.stringify(updatedList));
      if (currentProject?.id === projectId) setCurrentProject(updated);
    } catch (e: any) {
      setError(e.message);
    }
  };
  // ADDED: persists a new thumbnail for an existing project through the same
  // service -> AsyncStorage path as renameProject/updateStatus
  const updateThumbnail = async (projectId: string, thumbnailUrl: string) => {
    try {
      setError(null);
      const updated = await projectService.updateThumbnail(projectId, thumbnailUrl, token!);
      const updatedList = projects.map(p => p.id === projectId ? updated : p);
      setProjects(updatedList);
      await AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.PROJECTS, JSON.stringify(updatedList));
      if (currentProject?.id === projectId) setCurrentProject(updated);
    } catch (e: any) {
      setError(e.message);
    }
  };
  const deleteProject = async (projectId: string) => {
    try {
      setError(null);
      await projectService.deleteProject(projectId, token!);
      const updatedList = projects.filter(p => p.id !== projectId);
      setProjects(updatedList);
      await AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.PROJECTS, JSON.stringify(updatedList));
      if (currentProject?.id === projectId) {
        setCurrentProjectState(null);
        await AsyncStorage.removeItem(CONFIG.ASYNC_STORAGE_KEYS.CURRENT_PROJECT);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <ProjectContext.Provider value={{
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
      deleteProject,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}
// ─── Hook ────────────────────────────────────────────────────────────────────
export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within ProjectProvider');
  return context;
}