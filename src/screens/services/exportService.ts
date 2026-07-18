/**
 * Export service — simulated render jobs on the backend.
 *
 * Create: POST /projects/{projectId}/exports  { format, resolution }
 * Get:    GET  /exports/{exportId}            (includes progress 0–100)
 * List:   GET  /projects/{projectId}/exports  → PagedResponse
 *
 * There is no global “all my exports” endpoint and no delete/retry yet.
 * getExports aggregates across the user’s projects; delete/retry are local
 * cache helpers until those APIs exist. Real FFmpeg rendering is still
 * simulated server-side (~5s queued → processing → completed).
 */
import { Export, VideoProject } from '../types';
import { CONFIG } from '../config';
import { apiRequest } from './apiClient';
import {
  ApiExport,
  ApiProject,
  mapExportFromApi,
} from './mappers';

export interface ExportSettings {
  resolution: '720p' | '1080p' | '4K';
  format: 'MP4' | 'MOV' | 'WebM';
  quality: number;
  includeTextOverlays: boolean;
  includeFilters: boolean;
  includeWatermark: boolean;
}

type PagedExports = {
  items: ApiExport[];
  page: number;
  limit: number;
  total: number;
};
type PagedProjects = {
  items: ApiProject[];
  page: number;
  limit: number;
  total: number;
};

/** In-memory names so the Export tab can show project titles after create. */
const projectNameCache: Record<string, string> = {};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getExports(_token: string): Promise<Export[]> {
  if (CONFIG.USE_MOCK) {
    throw new Error('Mock exports disabled.');
  }

  const projects = await apiRequest<PagedProjects>('/projects?page=1&limit=100');
  const list = projects.items || [];
  list.forEach((p) => {
    projectNameCache[p.id] = p.title;
  });

  const pages = await Promise.all(
    list.map((p) =>
      apiRequest<PagedExports>(`/projects/${p.id}/exports?page=1&limit=50`).catch(
        () => ({ items: [] as ApiExport[], page: 1, limit: 50, total: 0 })
      )
    )
  );

  return pages
    .flatMap((page, i) =>
      (page.items || []).map((e) =>
        mapExportFromApi(e, projectNameCache[list[i].id] || 'Export')
      )
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/**
 * Backend has no DELETE /exports/{id} yet — remove from the client list only.
 * ExportContext still updates AsyncStorage so the tab stays consistent.
 */
async function deleteExport(_exportId: string, _token: string): Promise<void> {
  if (CONFIG.USE_MOCK) throw new Error('Mock exports disabled.');
  // Intentionally no network call — document when backend adds delete.
}

/**
 * Backend has no retry endpoint — re-queue by creating a new job with the
 * same format/resolution from the existing export record.
 */
async function retryExport(exportId: string, token: string): Promise<Export> {
  if (CONFIG.USE_MOCK) throw new Error('Mock exports disabled.');
  const current = await apiRequest<ApiExport>(`/exports/${exportId}`);
  const created = await apiRequest<ApiExport>(
    `/projects/${current.projectId}/exports`,
    {
      method: 'POST',
      body: JSON.stringify({
        format: current.format,
        resolution: current.resolution,
      }),
    }
  );
  return mapExportFromApi(
    created,
    projectNameCache[current.projectId] || 'Export'
  );
}

/**
 * Request an export job, then poll until COMPLETED / FAILED.
 * Drives ReviewExport’s onProgress callback from server `progress` values.
 */
async function createExport(
  project: VideoProject,
  settings: ExportSettings,
  onProgress: (percent: number) => void,
  _token: string
): Promise<Export> {
  if (CONFIG.USE_MOCK) throw new Error('Mock exports disabled.');

  projectNameCache[project.projectId] = project.title;

  const created = await apiRequest<ApiExport>(
    `/projects/${project.projectId}/exports`,
    {
      method: 'POST',
      body: JSON.stringify({
        format: settings.format,
        resolution: settings.resolution,
      }),
    }
  );

  onProgress(created.progress || 0);

  let latest = created;
  // Simulated worker finishes in ~5s; poll every 500ms with a safety cap.
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    latest = await apiRequest<ApiExport>(`/exports/${created.id}`);
    onProgress(Math.min(100, latest.progress || 0));
    const status = (latest.status || '').toUpperCase();
    if (status === 'COMPLETED' || status === 'FAILED') break;
  }

  const mapped = mapExportFromApi(latest, project.title);
  if (mapped.status === 'Failed') {
    throw new Error('Export failed on the server. Please try again.');
  }
  onProgress(100);
  return mapped;
}

export const exportService = {
  getExports,
  deleteExport,
  retryExport,
  createExport,
};
