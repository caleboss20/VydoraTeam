/**
 * Clip service — collaboration clip metadata under `/api/v1`.
 *
 * CreateClipRequest requires: { videoUrl, durationSeconds, title?, order? }
 * List: GET /projects/{id}/clips → PagedResponse
 * Get:  GET /clips/{clipId}
 * Delete: DELETE /clips/{clipId}
 *
 * The editor’s local VideoProject (file:// URIs, trims, filters) is separate.
 * Wire uploads through uploadService first, then call addClip with videoUrl.
 */
import { CONFIG } from '../config';
import { Clip } from '../types';
import { apiRequest } from './apiClient';
import { ApiClip, mapClipFromApi, parseDurationToSeconds } from './mappers';

type PagedClips = { items: ApiClip[]; page: number; limit: number; total: number };

export type AddClipOptions = {
  /** Required for the real API — Cloudinary (or other CDN) URL from uploadService. */
  videoUrl?: string;
  durationSeconds?: number;
  order?: number;
};

export const clipService = {
  getClips: async (projectId: string, _token: string): Promise<Clip[]> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock clips disabled.');
    const data = await apiRequest<PagedClips>(
      `/projects/${projectId}/clips?page=1&limit=100`
    );
    return (data.items || []).map(mapClipFromApi);
  },

  getClipById: async (
    _projectId: string,
    clipId: string,
    _token: string
  ): Promise<Clip> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock clips disabled.');
    const data = await apiRequest<ApiClip>(`/clips/${clipId}`);
    return mapClipFromApi(data);
  },

  /**
   * Create a clip on the project.
   * Legacy callers still pass (title, duration string, resolution); when
   * `options.videoUrl` is missing we throw a clear error so upload wiring
   * is obvious during the editor integration pass.
   */
  addClip: async (
    projectId: string,
    title: string,
    duration: string,
    _resolution: string,
    _token: string,
    options?: AddClipOptions
  ): Promise<Clip> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock clips disabled.');

    const videoUrl = options?.videoUrl;
    if (!videoUrl) {
      throw new Error(
        'Clip create requires a videoUrl. Upload with uploadService.uploadVideo() first, then pass { videoUrl, durationSeconds }.'
      );
    }

    const durationSeconds =
      options?.durationSeconds ?? parseDurationToSeconds(duration);

    const data = await apiRequest<ApiClip>(`/projects/${projectId}/clips`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        videoUrl,
        durationSeconds,
        order: options?.order ?? 0,
      }),
    });
    return mapClipFromApi(data);
  },

  deleteClip: async (
    _projectId: string,
    clipId: string,
    _token: string
  ): Promise<void> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock clips disabled.');
    await apiRequest<void>(`/clips/${clipId}`, { method: 'DELETE' });
  },
};
