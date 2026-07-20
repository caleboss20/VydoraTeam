/**
 * AI auto-captions — `/api/v1/ai/captions`.
 *
 * Returns timed segments + words, with optional speaker diarization labels
 * for multi-color captions.
 */
import { CONFIG } from '../config';
import { apiRequest } from './apiClient';

export type CaptionSegment = {
  startMs: number;
  endMs: number;
  text: string;
  speakerId?: string;
  speakerLabel?: string;
};

export type CaptionWord = {
  startMs: number;
  endMs: number;
  text: string;
  speakerId?: string;
  speakerLabel?: string;
};

export type CaptionsResult = {
  items: CaptionSegment[];
  words: CaptionWord[];
};

/** CapCut-style speaker palette. */
export const SPEAKER_COLORS: Record<string, string> = {
  SA: '#F5C518',
  SB: '#4DA6FF',
  SC: '#FF4D6D',
  SD: '#4DFF88',
};

export function colorForSpeaker(speakerId?: string): string {
  if (!speakerId) return '#FFFFFF';
  return SPEAKER_COLORS[speakerId] ?? '#FFFFFF';
}

type CaptionsResponse = { items: CaptionSegment[]; words?: CaptionWord[] };

export const captionService = {
  generateCaptions: async (videoUrl: string): Promise<CaptionsResult> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock captions disabled.');
    const data = await apiRequest<CaptionsResponse>('/ai/captions', {
      method: 'POST',
      body: JSON.stringify({ videoUrl }),
    });
    return {
      items: data.items || [],
      words: data.words || [],
    };
  },
};
