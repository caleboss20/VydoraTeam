import { CONFIG } from '../config';
import { Clip } from '../types';
// ─── Mock Data ───────────────────────────────────────────────────────────────
const MOCK_CLIPS: Clip[] = [
  {
    id: '1',
    projectId: '1',
    title: 'Intro clip',
    duration: '00:18',
    resolution: '1080p',
    uploadedAt: 'Jun 12, 2026',
    uploadedBy: '1',
  },
  {
    id: '2',
    projectId: '1',
    title: 'Main segment',
    duration: '00:42',
    resolution: '4K',
    uploadedAt: 'Jun 11, 2026',
    uploadedBy: '1',
  },
  {
    id: '3',
    projectId: '1',
    title: 'Outro',
    duration: '00:12',
    resolution: '1080p',
    uploadedAt: 'Jun 10, 2026',
    uploadedBy: '2',
  },
  {
    id: '4',
    projectId: '1',
    title: 'B-Roll montage',
    duration: '01:05',
    resolution: '1080p',
    uploadedAt: 'Jun 9, 2026',
    uploadedBy: '3',
  },
];
// ─── Service ─────────────────────────────────────────────────────────────────
export const clipService = {
  // get all clips for a project
  getClips: async (projectId: string, token: string): Promise<Clip[]> => {
    if (CONFIG.USE_MOCK) {
      return MOCK_CLIPS.filter(c => c.projectId === projectId);
    }
    const res = await fetch(`${CONFIG.API_BASE}/projects/${projectId}/clips`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch clips');
    return res.json();
  },
  // get single clip
  getClipById: async (
    projectId: string,
    clipId: string,
    token: string
  ): Promise<Clip> => {
    if (CONFIG.USE_MOCK) {
      const clip = MOCK_CLIPS.find(c => c.id === clipId);
      if (!clip) throw new Error('Clip not found');
      return clip;
    }
    const res = await fetch(
      `${CONFIG.API_BASE}/projects/${projectId}/clips/${clipId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error('Failed to fetch clip');
    return res.json();
  },
  // add new clip to project
  addClip: async (
    projectId: string,
    title: string,
    duration: string,
    resolution: string,
    token: string
  ): Promise<Clip> => {
    if (CONFIG.USE_MOCK) {
      return {
        id: Date.now().toString(),
        projectId,
        title,
        duration,
        resolution,
        uploadedAt: new Date().toISOString(),
        uploadedBy: '1',
      };
    }
    const res = await fetch(`${CONFIG.API_BASE}/projects/${projectId}/clips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, duration, resolution }),
    });
    if (!res.ok) throw new Error('Failed to add clip');
    return res.json();
  },
  // delete a clip
  deleteClip: async (
    projectId: string,
    clipId: string,
    token: string
  ): Promise<void> => {
    if (CONFIG.USE_MOCK) return;
    const res = await fetch(
      `${CONFIG.API_BASE}/projects/${projectId}/clips/${clipId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) throw new Error('Failed to delete clip');
  },
};