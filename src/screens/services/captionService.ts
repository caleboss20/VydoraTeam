/**
 * AI auto-captions — `/api/v1/ai/captions`.
 *
 * Sends the clip's public video URL; the backend extracts the audio,
 * transcribes it with Whisper, and returns timed segments. The editor turns
 * each segment into a styled text overlay on the timeline.
 */
import { CONFIG } from '../config';
import { apiRequest } from './apiClient';

export type CaptionSegment = {
  startMs: number;
  endMs: number;
  text: string;
};

type CaptionsResponse = { items: CaptionSegment[] };

export const captionService = {
  generateCaptions: async (videoUrl: string): Promise<CaptionSegment[]> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock captions disabled.');
    const data = await apiRequest<CaptionsResponse>('/ai/captions', {
      method: 'POST',
      body: JSON.stringify({ videoUrl }),
    });
    return data.items || [];
  },
};
