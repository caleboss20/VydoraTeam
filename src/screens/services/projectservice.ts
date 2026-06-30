import { CONFIG } from '../config';
import { Project, ProjectStatus } from '../types';
// ─── Mock Data ───────────────────────────────────────────────────────────────
// IMPORTANT: this is a mutable `let`, not a frozen `const []`. The previous
// version returned this same empty array from every getProjects() call —
// createProject() built a real object and handed it back, but never pushed
// it in here, so the *next* fetch (which fires automatically whenever token
// changes) always came back empty and silently wiped out whatever the
// context had just rehydrated from AsyncStorage. Same class of bug as the
// old exportService mock.
let MOCK_PROJECTS: Project[] = [];
// ─── Service ─────────────────────────────────────────────────────────────────
export const projectService = {
  // get all projects where user is owner OR member
  getProjects: async (token: string): Promise<Project[]> => {
    if (CONFIG.USE_MOCK) return MOCK_PROJECTS;
    const res = await fetch(`${CONFIG.API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },
  // get single project by id
  getProjectById: async (projectId: string, token: string): Promise<Project> => {
    if (CONFIG.USE_MOCK) {
      const project = MOCK_PROJECTS.find(p => p.id === projectId);
      if (!project) throw new Error('Project not found');
      return project;
    }
    const res = await fetch(`${CONFIG.API_BASE}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch project');
    return res.json();
  },
  
  // create new project — creator becomes Owner automatically
  createProject: async (
    name: string,
    description: string,
    visibility: 'Private' | 'Team' | 'Public',
    token: string
  ): Promise<Project> => {
    if (CONFIG.USE_MOCK) {
      const newProject: Project = {
        id: Date.now().toString(),
        name,
        description,
        visibility,
        status: 'Active',
        ownerId: 'u1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [],
      };
      MOCK_PROJECTS = [newProject, ...MOCK_PROJECTS];
      return newProject;
    }
    const res = await fetch(`${CONFIG.API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, description, visibility }),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },
  // rename project
  renameProject: async (projectId: string, name: string, token: string): Promise<Project> => {
    if (CONFIG.USE_MOCK) {
      const idx = MOCK_PROJECTS.findIndex(p => p.id === projectId);
      if (idx === -1) throw new Error('Project not found');
      MOCK_PROJECTS[idx] = { ...MOCK_PROJECTS[idx], name, updatedAt: new Date().toISOString() };
      return MOCK_PROJECTS[idx];
    }
    const res = await fetch(`${CONFIG.API_BASE}/projects/${projectId}/rename`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to rename project');
    return res.json();
  },
  // update project status
  updateStatus: async (
    projectId: string,
    status: ProjectStatus,
    token: string
  ): Promise<Project> => {
    if (CONFIG.USE_MOCK) {
      const idx = MOCK_PROJECTS.findIndex(p => p.id === projectId);
      if (idx === -1) throw new Error('Project not found');
      MOCK_PROJECTS[idx] = { ...MOCK_PROJECTS[idx], status, updatedAt: new Date().toISOString() };
      return MOCK_PROJECTS[idx];
    }
    const res = await fetch(`${CONFIG.API_BASE}/projects/${projectId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update project');
    return res.json();
  },
  // delete project — only Owner can do this
  deleteProject: async (projectId: string, token: string): Promise<void> => {
    if (CONFIG.USE_MOCK) {
      MOCK_PROJECTS = MOCK_PROJECTS.filter(p => p.id !== projectId);
      return;
    }
    const res = await fetch(`${CONFIG.API_BASE}/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete project');
  },
};