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
  srt: string;
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

type CaptionsResponse = {
  items: CaptionSegment[];
  words?: CaptionWord[];
  srt?: string;
};

/** Build SubRip from timed segments (client fallback if API omits srt). */
export function segmentsToSrt(segments: CaptionSegment[]): string {
  if (!segments.length) return '';
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const fmt = (ms: number) => {
    const t = Math.max(0, Math.floor(ms));
    const h = Math.floor(t / 3_600_000);
    const m = Math.floor((t % 3_600_000) / 60_000);
    const s = Math.floor((t % 60_000) / 1000);
    const milli = t % 1000;
    return `${pad(h)}:${pad(m)}:${pad(s)},${pad(milli, 3)}`;
  };
  return (
    segments
      .map(
        (seg, i) =>
          `${i + 1}\n${fmt(seg.startMs)} --> ${fmt(seg.endMs)}\n${(seg.text || '').trim()}\n`
      )
      .join('\n') + '\n'
  );
}

/** Rebuild SRT from AI caption overlays already on a clip. */
export function overlaysToSrt(
  overlays: Array<{ text: string; startMs: number; durationMs: number }>
): string {
  return segmentsToSrt(
    overlays.map((o) => ({
      startMs: o.startMs,
      endMs: o.startMs + Math.max(0, o.durationMs),
      text: o.text,
    }))
  );
}

export const captionService = {
  generateCaptions: async (videoUrl: string): Promise<CaptionsResult> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock captions disabled.');
    const data = await apiRequest<CaptionsResponse>('/ai/captions', {
      method: 'POST',
      body: JSON.stringify({ videoUrl }),
    });
    const items = data.items || [];
    return {
      items,
      words: data.words || [],
      srt: data.srt?.trim() ? data.srt : segmentsToSrt(items),
    };
  },
};
