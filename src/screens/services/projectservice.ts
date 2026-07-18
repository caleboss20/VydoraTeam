/**
 * Project service — `/api/v1/projects`.
 *
 * Backend CreateProjectRequest: { title, description? }
 * Backend UpdateProjectRequest: { title?, description?, status? }  (single PUT)
 * List returns PagedResponse: { items, page, limit, total }
 *
 * Screens still speak `name` / Active|Draft|Archived — mappers translate.
 */
import { CONFIG } from '../config';
import { Project, ProjectStatus } from '../types';
import { apiRequest } from './apiClient';
import {
  ApiProject,
  mapProjectFromApi,
  mapProjectStatusToApi,
} from './mappers';

type PagedProjects = {
  items: ApiProject[];
  page: number;
  limit: number;
  total: number;
};

export const projectService = {
  /** List projects the current user owns or belongs to. */
  getProjects: async (_token: string): Promise<Project[]> => {
    if (CONFIG.USE_MOCK) {
      throw new Error('Mock projects disabled — start the backend or set USE_MOCK true.');
    }
    // Pull a large page so the Dashboard still feels like an unpaginated list.
    const data = await apiRequest<PagedProjects>('/projects?page=1&limit=100');
    return (data.items || []).map(mapProjectFromApi);
  },

  getProjectById: async (projectId: string, _token: string): Promise<Project> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock projects disabled.');
    const data = await apiRequest<ApiProject>(`/projects/${projectId}`);
    return mapProjectFromApi(data);
  },

  /**
   * Create a project. Creator becomes OWNER automatically on the backend.
   * `visibility` / `thumbnailUrl` are accepted for UI compatibility but are
   * not part of CreateProjectRequest yet (thumbnail can be set later via PUT).
   */
  createProject: async (
    name: string,
    description: string,
    _visibility: 'Private' | 'Team' | 'Public',
    _token: string,
    _thumbnailUrl?: string
  ): Promise<Project> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock projects disabled.');
    const data = await apiRequest<ApiProject>('/projects', {
      method: 'POST',
      body: JSON.stringify({ title: name, description }),
    });
    return mapProjectFromApi(data);
  },

  /** Rename → PUT /projects/{id} with { title }. */
  renameProject: async (
    projectId: string,
    name: string,
    _token: string
  ): Promise<Project> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock projects disabled.');
    const data = await apiRequest<ApiProject>(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify({ title: name }),
    });
    return mapProjectFromApi(data);
  },

  /** Status change → PUT /projects/{id} with mapped enum. */
  updateStatus: async (
    projectId: string,
    status: ProjectStatus,
    _token: string
  ): Promise<Project> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock projects disabled.');
    const data = await apiRequest<ApiProject>(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: mapProjectStatusToApi(status) }),
    });
    return mapProjectFromApi(data);
  },

  /**
   * Thumbnail update. Backend UpdateProjectRequest has no thumbnailUrl field yet,
   * so this is a no-op against the API and returns the current project.
   * When the backend adds the field, switch the body to `{ thumbnailUrl }`.
   */
  updateThumbnail: async (
    projectId: string,
    thumbnailUrl: string,
    token: string
  ): Promise<Project> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock projects disabled.');
    const current = await projectService.getProjectById(projectId, token);
    return { ...current, thumbnailUrl, updatedAt: new Date().toISOString() };
  },

  deleteProject: async (projectId: string, _token: string): Promise<void> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock projects disabled.');
    await apiRequest<void>(`/projects/${projectId}`, { method: 'DELETE' });
  },
};
