/**
 * Project service — `/api/v1/projects`.
 *
 * Backend CreateProjectRequest: { title, description?, visibility?, thumbnailUrl? }
 * Backend UpdateProjectRequest: { title?, description?, status?, thumbnailUrl?, visibility? }
 * List returns PagedResponse: { items, page, limit, total }
 *
 * Screens still speak `name` / Active|Draft|Archived — mappers translate.
 */
import { CONFIG } from '../config';
import { Project, ProjectStatus } from '../types';
import { apiRequest } from './apiClient';
import { uploadService } from './uploadService';
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

function isLocalImageUri(uri: string): boolean {
  const u = uri.trim().toLowerCase();
  return (
    u.startsWith('file:') ||
    u.startsWith('content:') ||
    u.startsWith('ph://') ||
    u.startsWith('assets-library:') ||
    u.startsWith('data:')
  );
}

/** Turn a picked local cover into a CDN URL the API can store. */
async function resolveThumbnailUrl(thumbnailUrl?: string): Promise<string | undefined> {
  if (!thumbnailUrl?.trim()) return undefined;
  const uri = thumbnailUrl.trim();
  if (!isLocalImageUri(uri) && /^https?:\/\//i.test(uri)) return uri;
  if (!isLocalImageUri(uri)) return uri;
  const uploaded = await uploadService.uploadImage(
    uri,
    `cover_${Date.now()}.jpg`,
    'image/jpeg'
  );
  return uploaded.url;
}

export const projectService = {
  /**
   * List projects for the Projects tab.
   * Backend returns owned/created projects only; `ownerId` is a client-side
   * safety filter so a stale cache can never paint another account's rows.
   */
  getProjects: async (_token: string, ownerId?: string): Promise<Project[]> => {
    if (CONFIG.USE_MOCK) {
      throw new Error('Mock projects disabled — start the backend or set USE_MOCK true.');
    }
    const data = await apiRequest<PagedProjects>('/projects?page=1&limit=100');
    const mapped = (data.items || []).map(mapProjectFromApi);
    if (!ownerId) return mapped;
    return mapped.filter((p) => p.ownerId === ownerId);
  },

  getProjectById: async (projectId: string, _token: string): Promise<Project> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock projects disabled.');
    const data = await apiRequest<ApiProject>(`/projects/${projectId}`);
    return mapProjectFromApi(data);
  },

  /**
   * Create a project. Creator becomes Owner automatically on the backend.
   * Local cover images are uploaded first, then the CDN URL is persisted.
   */
  createProject: async (
    name: string,
    description: string,
    visibility: 'Private' | 'Team' | 'Public',
    _token: string,
    thumbnailUrl?: string
  ): Promise<Project> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock projects disabled.');
    const resolvedThumb = await resolveThumbnailUrl(thumbnailUrl);
    const data = await apiRequest<ApiProject>('/projects', {
      method: 'POST',
      body: JSON.stringify({
        title: name,
        description,
        visibility,
        ...(resolvedThumb ? { thumbnailUrl: resolvedThumb } : {}),
      }),
    });
    let project = mapProjectFromApi(data);
    // If create ignored thumbnail (older server) or response omitted it, PUT it on.
    if (resolvedThumb && !project.thumbnailUrl) {
      project = await projectService.updateThumbnail(project.id, resolvedThumb, _token);
    }
    return project;
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

  /** Cover image → PUT /projects/{id} with { thumbnailUrl }. */
  updateThumbnail: async (
    projectId: string,
    thumbnailUrl: string,
    _token: string
  ): Promise<Project> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock projects disabled.');
    const resolvedThumb = await resolveThumbnailUrl(thumbnailUrl);
    const data = await apiRequest<ApiProject>(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify({ thumbnailUrl: resolvedThumb }),
    });
    return mapProjectFromApi(data);
  },

  /** Visibility → PUT /projects/{id} with { visibility }. */
  updateVisibility: async (
    projectId: string,
    visibility: 'Private' | 'Team' | 'Public',
    _token: string
  ): Promise<Project> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock projects disabled.');
    const data = await apiRequest<ApiProject>(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify({ visibility }),
    });
    return mapProjectFromApi(data);
  },

  deleteProject: async (projectId: string, _token: string): Promise<void> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock projects disabled.');
    await apiRequest<void>(`/projects/${projectId}`, { method: 'DELETE' });
  },
};
