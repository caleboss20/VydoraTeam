/**
 * Beat detection — `/api/v1/ai/beat-detect`.
 * Opt-in only; returns onset peak times in ms for timeline markers.
 */
import { CONFIG } from '../config';
import { apiRequest } from './apiClient';

export type BeatDetectOptions = {
  windowStartMs?: number;
  windowEndMs?: number;
  /** 0–1, higher = more beats. Default 0.55. */
  sensitivity?: number;
};

type BeatDetectResponse = { items: number[] };

export const beatDetectService = {
  detect: async (
    videoUrl: string,
    options: BeatDetectOptions = {}
  ): Promise<number[]> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock beat detection disabled.');
    const data = await apiRequest<BeatDetectResponse>('/ai/beat-detect', {
      method: 'POST',
      body: JSON.stringify({
        videoUrl,
        windowStartMs: options.windowStartMs,
        windowEndMs: options.windowEndMs,
        sensitivity: options.sensitivity ?? 0.55,
      }),
    });
    return data.items || [];
  },
};
