// For project context//
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { Project, ProjectStatus } from '../types';
import { projectService } from '../services/projectservice';
import { useAuth } from './Authcontext';
// ─── Context Type ─────────────────────────────────────────────────────────────
interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  createProject: (name: string) => Promise<void>;
  setCurrentProject: (project: Project) => void;
  updateStatus: (projectId: string, status: ProjectStatus) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
}
// ─── Context ─────────────────────────────────────────────────────────────────
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);
// ─── Provider ────────────────────────────────────────────────────────────────
export function ProjectProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // fetch projects when token is available
  useEffect(() => {
    if (token) fetchProjects();
  }, [token]);
  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await projectService.getProjects(token!);
      setProjects(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };
  const createProject = async (name: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const newProject = await projectService.createProject(name, token!);
      setProjects(prev => [newProject, ...prev]);
      setCurrentProject(newProject);
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
      setProjects(prev =>
        prev.map(p => p.id === projectId ? updated : p)
      );
      if (currentProject?.id === projectId) {
        setCurrentProject(updated);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };
  const deleteProject = async (projectId: string) => {
    try {
      setError(null);
      await projectService.deleteProject(projectId, token!);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (currentProject?.id === projectId) {
        setCurrentProject(null);
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
      fetchProjects,
      createProject,
      setCurrentProject,
      updateStatus,
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