import { CONFIG } from '../config';
import { Project, ProjectStatus } from '../types';
// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_PROJECTS: Project[] = [
  {
    id: '1', name: 'Summer campaign',
    status: 'Active', ownerId: 'u1',
    createdAt: '2026-06-20T10:00:00Z',
    updatedAt: '2026-06-27T08:30:00Z',
    members: [
      { id: 'm1', initials: 'M',  color: '#E05C5C', online: true  },
      { id: 'm2', initials: 'JR', color: '#3DBFBF', online: true  },
      { id: 'm3', initials: 'S',  color: '#9B59B6', online: false },
    ],
  },
  {
    id: '2', name: 'Product launch',
    status: 'Active', ownerId: 'u1',
    createdAt: '2026-06-18T09:00:00Z',
    updatedAt: '2026-06-26T14:00:00Z',
    members: [
      { id: 'm4', initials: 'S',  color: '#9B59B6', online: false },
      { id: 'm5', initials: 'YO', color: '#F5C518', online: true  },
    ],
  },
  {
    id: '3', name: 'Behind the scenes',
    status: 'Draft', ownerId: 'u1',
    createdAt: '2026-06-15T07:00:00Z',
    updatedAt: '2026-06-25T11:00:00Z',
    members: [
      { id: 'm6', initials: 'MA', color: '#E05C5C', online: false },
    ],
  },
]
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
  createProject: async (name: string, token: string): Promise<Project> => {
    if (CONFIG.USE_MOCK) {
      return {
        id: Date.now().toString(),
        name,
        status: 'Active',
        ownerId: '1',
        createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString(),
         members:[],

      };
    }
    const res = await fetch(`${CONFIG.API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },
  // update project status
  updateStatus: async (
    projectId: string,
    status: ProjectStatus,
    token: string
  ): Promise<Project> => {
    if (CONFIG.USE_MOCK) {
      const project = MOCK_PROJECTS.find(p => p.id === projectId)!;
      return { ...project, status };
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
    if (CONFIG.USE_MOCK) return;
    const res = await fetch(`${CONFIG.API_BASE}/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete project');
  },
};