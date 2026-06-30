import { Export } from '../types';
import { CONFIG } from '../config';
// Thin service layer, same pattern as clipService / projectService.
//
// NOTE: CONFIG.USE_MOCK is true in your current config, meaning your other
// services (clipService, projectservice) likely branch to return mock data
// instead of hitting localhost:8080. I haven't seen those files, so this is
// a reasonable guess at that pattern, not a confirmed match. Paste
// clipService.ts or projectservice.ts and I'll align this exactly.
const MOCK_EXPORTS: Export[] = [
  { id: 'e1', projectId: 'p1', projectName: 'Test', title: 'Summer campaign', resolution: '1080p', format: 'MP4', sizeMb: 184, status: 'Ready', isFinal: true, createdAt: '2026-06-14T00:00:00Z' },
  { id: 'e2', projectId: 'p1', projectName: 'Test', title: 'Campaign, v3', resolution: '1080p', format: 'MP4', sizeMb: 179, status: 'Ready', createdAt: '2026-06-13T00:00:00Z' },
  { id: 'e3', projectId: 'p1', projectName: 'Test', title: 'Behind the scenes', resolution: '720p', format: 'MOV', sizeMb: 96, status: 'Processing', createdAt: '2026-06-12T00:00:00Z' },
  { id: 'e4', projectId: 'p1', projectName: 'Test', title: 'Product launch teaser', resolution: '4K', format: 'MP4', sizeMb: 410, status: 'Ready', createdAt: '2026-06-10T00:00:00Z' },
  { id: 'e5', projectId: 'p1', projectName: 'Test', title: 'Client review cut', resolution: '1080p', format: 'MP4', sizeMb: 152, status: 'Ready', createdAt: '2026-06-08T00:00:00Z' },
];
async function getExports(token: string): Promise<Export[]> {
  if (CONFIG.USE_MOCK) return Promise.resolve(MOCK_EXPORTS);
  const res = await fetch(`${CONFIG.API_BASE}/exports`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch exports');
  return res.json();
}
async function deleteExport(exportId: string, token: string): Promise<void> {
  if (CONFIG.USE_MOCK) return Promise.resolve();
  const res = await fetch(`${CONFIG.API_BASE}/exports/${exportId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete export');
}
async function retryExport(exportId: string, token: string): Promise<Export> {
  if (CONFIG.USE_MOCK) {
    const found = MOCK_EXPORTS.find(e => e.id === exportId);
    if (!found) throw new Error('Export not found');
    return Promise.resolve({ ...found, status: 'Processing' });
  }
  const res = await fetch(`${CONFIG.API_BASE}/exports/${exportId}/retry`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to retry export');
  return res.json();
}
export const exportService = {
  getExports,
  deleteExport,
  retryExport,
};