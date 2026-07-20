/**
 * Stabilize helpers + auto-reframe API (`/ai/auto-reframe`).
 */
import { CONFIG } from '../config';
import { apiRequest } from './apiClient';
import type { AutoReframeSettings, ReframeKeyframe, StabilizeSettings } from '../types';

export type ReframeResult = {
  items: ReframeKeyframe[];
  ratioId: string;
  message: string;
};

export const reframeService = {
  analyze: async (
    videoUrl: string,
    opts: { windowStartMs?: number; windowEndMs?: number } = {}
  ): Promise<ReframeResult> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock auto-reframe disabled.');
    return apiRequest<ReframeResult>('/ai/auto-reframe', {
      method: 'POST',
      body: JSON.stringify({
        videoUrl,
        windowStartMs: opts.windowStartMs,
        windowEndMs: opts.windowEndMs,
      }),
    });
  },

  defaultStabilize: (enabled = true): StabilizeSettings => ({
    enabled,
    shakiness: 0.55,
  }),

  fromAnalysis: (result: ReframeResult): AutoReframeSettings => ({
    enabled: true,
    ratioId: result.ratioId || 'tiktok',
    keyframes: result.items || [],
  }),

  /** Interpolate crop center x (0–1) at clip-local time. */
  sampleX: (reframe: AutoReframeSettings | undefined, localTimeMs: number): number => {
    const kfs = reframe?.keyframes;
    if (!reframe?.enabled || !kfs?.length) return 0.5;
    if (kfs.length === 1) return kfs[0].x;
    if (localTimeMs <= kfs[0].timeMs) return kfs[0].x;
    if (localTimeMs >= kfs[kfs.length - 1].timeMs) return kfs[kfs.length - 1].x;
    for (let i = 0; i < kfs.length - 1; i++) {
      const a = kfs[i];
      const b = kfs[i + 1];
      if (localTimeMs >= a.timeMs && localTimeMs <= b.timeMs) {
        const t = (localTimeMs - a.timeMs) / Math.max(1, b.timeMs - a.timeMs);
        return a.x + (b.x - a.x) * t;
      }
    }
    return 0.5;
  },
};
