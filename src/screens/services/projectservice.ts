import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';
import { Project, ProjectStatus } from '../types';
// ─── Mock Data ───────────────────────────────────────────────────────────────
// This mock store used to be a plain in-memory `let MOCK_PROJECTS: Project[] = []`.
// That fixed the earlier "frozen const" bug (mutations were no longer silently
// discarded), but it introduced a *different* problem: a plain in-memory array
// only lives as long as the JS module stays loaded. On every app reload, this
// file re-runs from scratch and MOCK_PROJECTS resets to `[]` — so even though
// ProjectContext correctly rehydrates its React state from AsyncStorage on
// mount, the very next automatic fetchProjects() call asks this "mock server"
// for the truth, gets back an empty array, and overwrites the good cached data
// with nothing.
//
// The fix here: treat AsyncStorage as this mock service's actual persistence
// layer, the same way a real backend would use a real database. Every mock
// method awaits ensureHydrated() first, which loads MOCK_PROJECTS from
// AsyncStorage exactly once per app session. Every mutation (create, rename,
// update status, delete) writes the updated array straight back to
// AsyncStorage, so the "mock server" itself survives reloads — regardless of
// what ProjectContext does or doesn't do with its own separate cache.
let MOCK_PROJECTS: Project[] = [];
let hasHydrated = false;
let hydrationPromise: Promise<void> | null = null;
async function ensureHydrated(): Promise<void> {
  if (hasHydrated) return;
  // guard against multiple concurrent calls (e.g. getProjects + createProject
  // firing close together on launch) all trying to hydrate at once
  if (!hydrationPromise) {
    hydrationPromise = (async () => {
      try {
        const cached = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.PROJECTS);
        if (cached) MOCK_PROJECTS = JSON.parse(cached);
      } catch (e) {
        console.log('Mock project store hydration failed', e);
      } finally {
        hasHydrated = true;
      }
    })();
  }
  await hydrationPromise;
}
async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.PROJECTS, JSON.stringify(MOCK_PROJECTS));
  } catch (e) {
    console.log('Mock project store persist failed', e);
  }
}
// ─── Service ─────────────────────────────────────────────────────────────────
export const projectService = {
  // get all projects where user is owner OR member
  getProjects: async (token: string): Promise<Project[]> => {
    if (CONFIG.USE_MOCK) {
      await ensureHydrated();
      return MOCK_PROJECTS;
    }
    const res = await fetch(`${CONFIG.API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },
  // get single project by id
  getProjectById: async (projectId: string, token: string): Promise<Project> => {
    if (CONFIG.USE_MOCK) {
      await ensureHydrated();
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
      await ensureHydrated();
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
      await persist();
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
      await ensureHydrated();
      const idx = MOCK_PROJECTS.findIndex(p => p.id === projectId);
      if (idx === -1) throw new Error('Project not found');
      MOCK_PROJECTS[idx] = { ...MOCK_PROJECTS[idx], name, updatedAt: new Date().toISOString() };
      await persist();
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
      await ensureHydrated();
      const idx = MOCK_PROJECTS.findIndex(p => p.id === projectId);
      if (idx === -1) throw new Error('Project not found');
      MOCK_PROJECTS[idx] = { ...MOCK_PROJECTS[idx], status, updatedAt: new Date().toISOString() };
      await persist();
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
      await ensureHydrated();
      MOCK_PROJECTS = MOCK_PROJECTS.filter(p => p.id !== projectId);
      await persist();
      return;
    }
    const res = await fetch(`${CONFIG.API_BASE}/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete project');
  },
};