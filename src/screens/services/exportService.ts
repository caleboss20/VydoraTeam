import { Export, VideoProject } from '../types';
import { CONFIG } from '../config';
// Thin service layer, same pattern as clipService / projectService.
//
// CONFIG.USE_MOCK is true, so this branches to mock data instead of hitting
// localhost:8080. IMPORTANT: the mock store below is a mutable `let` array,
// not a const — earlier versions of this file returned the same frozen
// MOCK_EXPORTS on every getExports() call, which meant deletes/retries never
// actually stuck: the next fetch would just hand back the original data.
// Now delete/retry mutate this array directly, so repeated fetches within
// the same app session reflect prior changes.
let mockStore: Export[] = [
  { id: 'e1', projectId: 'p1', projectName: 'Test', title: 'Summer campaign', resolution: '1080p', format: 'MP4', sizeMb: 184, status: 'Ready', isFinal: true, createdAt: '2026-06-14T00:00:00Z', fileUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4' },
  { id: 'e2', projectId: 'p1', projectName: 'Test', title: 'Campaign, v3', resolution: '1080p', format: 'MP4', sizeMb: 179, status: 'Ready', createdAt: '2026-06-13T00:00:00Z', fileUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4' },
  { id: 'e3', projectId: 'p1', projectName: 'Test', title: 'Behind the scenes', resolution: '720p', format: 'MOV', sizeMb: 96, status: 'Processing', createdAt: '2026-06-12T00:00:00Z' },
  { id: 'e4', projectId: 'p1', projectName: 'Test', title: 'Product launch teaser', resolution: '4K', format: 'MP4', sizeMb: 410, status: 'Ready', createdAt: '2026-06-10T00:00:00Z', fileUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4' },
  { id: 'e5', projectId: 'p1', projectName: 'Test', title: 'Client review cut', resolution: '1080p', format: 'MP4', sizeMb: 152, status: 'Ready', createdAt: '2026-06-08T00:00:00Z', fileUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4' },
];
async function getExports(token: string): Promise<Export[]> {
  if (CONFIG.USE_MOCK) return Promise.resolve(mockStore);
  const res = await fetch(`${CONFIG.API_BASE}/exports`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch exports');
  return res.json();
}
async function deleteExport(exportId: string, token: string): Promise<void> {
  if (CONFIG.USE_MOCK) {
    mockStore = mockStore.filter(e => e.id !== exportId);
    return Promise.resolve();
  }
  const res = await fetch(`${CONFIG.API_BASE}/exports/${exportId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete export');
}
async function retryExport(exportId: string, token: string): Promise<Export> {
  if (CONFIG.USE_MOCK) {
    const idx = mockStore.findIndex(e => e.id === exportId);
    if (idx === -1) throw new Error('Export not found');
    mockStore[idx] = { ...mockStore[idx], status: 'Processing', errorMessage: undefined };
    return Promise.resolve(mockStore[idx]);
  }
  const res = await fetch(`${CONFIG.API_BASE}/exports/${exportId}/retry`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to retry export');
  return res.json();
}



async function createExport(
  project: VideoProject,
  onProgress: (percent: number) => void,
  token: string
): Promise<Export> {
  if (CONFIG.USE_MOCK) {
    return new Promise((resolve) => {
      let pct = 0;
      const tick = setInterval(() => {
        pct += Math.random() * 12 + 4;
        if (pct >= 100) {
          pct = 100;
          clearInterval(tick);
          onProgress(pct);
          const newExport: Export = {
            id: `e${Date.now()}`,
            projectId: project.projectId,
            projectName: project.title,
            title: project.title,
            resolution: '1080p',
            format: 'MP4',
            sizeMb: Math.round((project.totalDurationMs / 1000) * 2.5),
            status: 'Ready',
            createdAt: new Date().toISOString(),
            fileUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4', // ADDED: mock placeholder, replace once real render pipeline exists
          };
          mockStore = [newExport, ...mockStore];
          resolve(newExport);
          return;
        }
        onProgress(pct);
      }, 220);
    });
  }
  const res = await fetch(`${CONFIG.API_BASE}/exports`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: project.projectId }),
  });
  if (!res.ok) throw new Error('Failed to create export');
  return res.json();
}


export const exportService = {
  getExports,
  deleteExport,
  retryExport,
  createExport,
}
