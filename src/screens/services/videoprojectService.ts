/**
 * Local video-project / timeline helpers.
 *
 * NOT used by VideoProjectContext today (editor state is AsyncStorage-only).
 * There is no `/video-projects` API on vydora-backend yet — leave this alone
 * until the editor persistence pass. Do not flip this onto the network without
 * a matching Spring resource.
 */
import { VideoProject, VideoClip, TextOverlay } from '../types';
import { CONFIG } from '../config';
// ─── Mock store ────────────────────────────────────────────────────────────
// IMPORTANT: this must be `let`, not `const` — 
// it gets reassigned on every
// mutation below. 
// Declaring this as a frozen const is the 
// exact bug that hit
// clipService/commentService/memberService,
//  so watch this one closely.
let mockVideoProjects: VideoProject[] = [];
const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const buildProject = (firstClip: Omit<VideoClip, 'id' | 'order'>): VideoProject => {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    // Local-only editor project; collab projectId is filled when linked later.
    projectId: '',
    title: 'Untitled Project',
    createdAt: now,
    updatedAt: now,
    clips: [{ ...firstClip, id: generateId(), order: 0 }],
    coverThumbnailUri: firstClip.thumbnailUri,
    totalDurationMs: firstClip.durationMs,
  };
};
// ─── Service ───────────────────────────────────────────────────────────────
export const videoProjectService = {
  async getVideoProjects(token: string): Promise<VideoProject[]> {
    if (CONFIG.USE_MOCK) {
      return mockVideoProjects;
    }
    const res = await fetch(`${CONFIG.API_BASE}/video-projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch video projects');
    return res.json();
  },
  async createVideoProject(
    firstClip: Omit<VideoClip, 'id' | 'order'>,
    token: string
  ): Promise<VideoProject> {
    if (CONFIG.USE_MOCK) {
      const newProject = buildProject(firstClip);
      mockVideoProjects = [newProject, ...mockVideoProjects];
      return newProject;
    }
    const res = await fetch(`${CONFIG.API_BASE}/video-projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ firstClip }),
    });
    if (!res.ok) throw new Error('Failed to create video project');
    return res.json();
  },
  async addClip(
    projectId: string,
    clip: Omit<VideoClip, 'id' | 'order'>,
    token: string
  ): Promise<VideoProject> {
    if (CONFIG.USE_MOCK) {
      mockVideoProjects = mockVideoProjects.map((project) => {
        if (project.id !== projectId) return project;
        const newClip: VideoClip = { ...clip, id: generateId(), order: project.clips.length };
        return {
          ...project,
          clips: [...project.clips, newClip],
          totalDurationMs: project.totalDurationMs + clip.durationMs,
          updatedAt: new Date().toISOString(),
        };
      });
      const updated = mockVideoProjects.find((p) => p.id === projectId);
      if (!updated) throw new Error('Project not found');
      return updated;
    }
    const res = await fetch(`${CONFIG.API_BASE}/video-projects/${projectId}/clips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(clip),
    });
    if (!res.ok) throw new Error('Failed to add clip');
    return res.json();
  },
  async addTextOverlay(
    projectId: string,
    clipId: string,
    overlay: Omit<TextOverlay, 'id' | 'clipId'>,
    token: string
  ): Promise<VideoProject> {
    if (CONFIG.USE_MOCK) {
      mockVideoProjects = mockVideoProjects.map((project) => {
        if (project.id !== projectId) return project;
        return {
          ...project,
          clips: project.clips.map((clip) => {
            if (clip.id !== clipId) return clip;
            const newOverlay: TextOverlay = { ...overlay, id: generateId(), clipId };
            return {
              ...clip,
              textOverlays: [...(clip.textOverlays ?? []), newOverlay],
            };
          }),
          updatedAt: new Date().toISOString(),
        };
      });
      const updated = mockVideoProjects.find((p) => p.id === projectId);
      if (!updated) throw new Error('Project not found');
      return updated;
    }
    const res = await fetch(
      `${CONFIG.API_BASE}/video-projects/${projectId}/clips/${clipId}/overlays`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(overlay),
      }
    );
    if (!res.ok) throw new Error('Failed to add text overlay');
    return res.json();
  },
  async removeClip(projectId: string, clipId: string, token: string): Promise<VideoProject> {
    if (CONFIG.USE_MOCK) {
      mockVideoProjects = mockVideoProjects.map((project) => {
        if (project.id !== projectId) return project;
        const removedClip = project.clips.find((c) => c.id === clipId);
        const remainingClips = project.clips
          .filter((c) => c.id !== clipId)
          .map((c, index) => ({ ...c, order: index }));
        return {
          ...project,
          clips: remainingClips,
          totalDurationMs: project.totalDurationMs - (removedClip?.durationMs ?? 0),
          updatedAt: new Date().toISOString(),
        };
      });
      const updated = mockVideoProjects.find((p) => p.id === projectId);
      if (!updated) throw new Error('Project not found');
      return updated;
    }
    const res = await fetch(`${CONFIG.API_BASE}/video-projects/${projectId}/clips/${clipId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to remove clip');
    return res.json();
  },
  async reorderClips(projectId: string, clips: VideoClip[], token: string): Promise<VideoProject> {
    if (CONFIG.USE_MOCK) {
      mockVideoProjects = mockVideoProjects.map((project) => {
        if (project.id !== projectId) return project;
        const reordered = clips.map((c, index) => ({ ...c, order: index }));
        return { ...project, clips: reordered, updatedAt: new Date().toISOString() };
      });
      const updated = mockVideoProjects.find((p) => p.id === projectId);
      if (!updated) throw new Error('Project not found');
      return updated;
    }
    const res = await fetch(`${CONFIG.API_BASE}/video-projects/${projectId}/clips/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ clips }),
    });
    if (!res.ok) throw new Error('Failed to reorder clips');
    return res.json();
  },
  async renameVideoProject(projectId: string, newName: string, token: string): Promise<VideoProject> {
    if (CONFIG.USE_MOCK) {
      mockVideoProjects = mockVideoProjects.map((project) =>
        project.id === projectId
          ? { ...project, title: newName, updatedAt: new Date().toISOString() }
          : project
      );
      const updated = mockVideoProjects.find((p) => p.id === projectId);
      if (!updated) throw new Error('Project not found');
      return updated;
    }
    const res = await fetch(`${CONFIG.API_BASE}/video-projects/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: newName }),
    });
    if (!res.ok) throw new Error('Failed to rename video project');
    return res.json();
  },
  async deleteVideoProject(projectId: string, token: string): Promise<void> {
    if (CONFIG.USE_MOCK) {
      mockVideoProjects = mockVideoProjects.filter((p) => p.id !== projectId);
      return;
    }
    const res = await fetch(`${CONFIG.API_BASE}/video-projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete video project');
  },
};