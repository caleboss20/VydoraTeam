/**
 * Shorts / reel suggestions — `/api/v1/ai/shorts-suggest`.
 * Opt-in only; needs GROQ or OPENAI on the backend.
 */
import { CONFIG } from '../config';
import { apiRequest } from './apiClient';

export type ShortSuggestion = {
  startMs: number;
  endMs: number;
  title: string;
  score: number;
  hook: string;
};

export type ShortsSuggestOptions = {
  maxClips?: number;
  /** Preferred length in ms (15–60s). Default 45000. */
  targetDurationMs?: number;
};

type ShortsResponse = { items: ShortSuggestion[] };

export const shortsService = {
  suggest: async (
    videoUrl: string,
    options: ShortsSuggestOptions = {}
  ): Promise<ShortSuggestion[]> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock shorts suggestions disabled.');
    const data = await apiRequest<ShortsResponse>('/ai/shorts-suggest', {
      method: 'POST',
      body: JSON.stringify({
        videoUrl,
        maxClips: options.maxClips ?? 12,
        targetDurationMs: options.targetDurationMs ?? 45_000,
      }),
    });
    return data.items || [];
  },
};
