/**
 * Motion tracking — stick text/emoji to a moving subject (`/ai/motion-track`).
 */
import { CONFIG } from '../config';
import { apiRequest } from './apiClient';
import type { TextPositionKeyframe } from '../types';

export type MotionTrackResult = {
  items: TextPositionKeyframe[];
  message: string;
};

export const motionTrackService = {
  track: async (
    videoUrl: string,
    seed: { x: number; y: number; timeMs?: number },
    opts: { windowStartMs?: number; windowEndMs?: number } = {}
  ): Promise<MotionTrackResult> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock motion-track disabled.');
    return apiRequest<MotionTrackResult>('/ai/motion-track', {
      method: 'POST',
      body: JSON.stringify({
        videoUrl,
        seedX: seed.x,
        seedY: seed.y,
        seedTimeMs: seed.timeMs ?? 0,
        windowStartMs: opts.windowStartMs,
        windowEndMs: opts.windowEndMs,
      }),
    });
  },
};
