/**
 * Silence / filler rough cut — opt-in. User chooses what to remove.
 * `/api/v1/ai/silence-detect` + `/ai/filler-detect`
 */
import { CONFIG } from '../config';
import { apiRequest } from './apiClient';
import { intersectKeep, TimeRange } from './roughCutUtils';

export type SilenceKeepRange = TimeRange;

export type SilenceDetectResult = {
  items: SilenceKeepRange[];
  silenceCount: number;
  removedMs: number;
  keptMs: number;
};

export type FillerDetectResult = {
  items: SilenceKeepRange[];
  fillers: { startMs: number; endMs: number; word: string }[];
  fillerCount: number;
  removedMs: number;
  keptMs: number;
};

export type SilenceDetectOptions = {
  windowStartMs?: number;
  windowEndMs?: number;
  minSilenceMs?: number;
  paddingMs?: number;
};

export type RoughCutOptions = SilenceDetectOptions & {
  /** Default true — user can turn off. */
  removeSilence?: boolean;
  /** Default false — opt-in filler cut (needs GROQ_API_KEY). */
  removeFillers?: boolean;
};

export const silenceService = {
  detect: async (
    videoUrl: string,
    options: SilenceDetectOptions = {}
  ): Promise<SilenceDetectResult> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock silence detection disabled.');
    return apiRequest<SilenceDetectResult>('/ai/silence-detect', {
      method: 'POST',
      body: JSON.stringify({
        videoUrl,
        windowStartMs: options.windowStartMs,
        windowEndMs: options.windowEndMs,
        minSilenceMs: options.minSilenceMs ?? 500,
        paddingMs: options.paddingMs ?? 120,
      }),
    });
  },

  detectFillers: async (
    videoUrl: string,
    options: Pick<SilenceDetectOptions, 'windowStartMs' | 'windowEndMs'> = {}
  ): Promise<FillerDetectResult> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock filler detection disabled.');
    return apiRequest<FillerDetectResult>('/ai/filler-detect', {
      method: 'POST',
      body: JSON.stringify({
        videoUrl,
        windowStartMs: options.windowStartMs,
        windowEndMs: options.windowEndMs,
      }),
    });
  },

  /** Run only what the user enabled; never auto-applies without their tap. */
  roughCut: async (
    videoUrl: string,
    options: RoughCutOptions = {}
  ): Promise<{
    items: TimeRange[];
    silenceCount: number;
    fillerCount: number;
    removedMs: number;
    keptMs: number;
  }> => {
    const removeSilence = options.removeSilence !== false;
    const removeFillers = !!options.removeFillers;
    if (!removeSilence && !removeFillers) {
      throw new Error('Turn on silence and/or fillers first.');
    }

    const winStart = options.windowStartMs ?? 0;
    const winEnd = options.windowEndMs ?? Number.MAX_SAFE_INTEGER;

    let silence: SilenceDetectResult | null = null;
    let fillers: FillerDetectResult | null = null;

    if (removeSilence) {
      silence = await silenceService.detect(videoUrl, options);
    }
    if (removeFillers) {
      fillers = await silenceService.detectFillers(videoUrl, {
        windowStartMs: options.windowStartMs,
        windowEndMs: options.windowEndMs,
      });
    }

    let items: TimeRange[];
    if (silence && fillers) {
      const endHint = Math.max(
        winStart + 1,
        ...silence.items.map((i) => i.endMs),
        ...fillers.items.map((i) => i.endMs)
      );
      const end = Math.min(winEnd, endHint);
      items = intersectKeep(winStart, end, silence.items, fillers.items);
    } else {
      items = (silence ?? fillers)!.items;
    }

    const keptMs = items.reduce((a, r) => a + (r.endMs - r.startMs), 0);
    const span =
      options.windowEndMs != null && options.windowStartMs != null
        ? options.windowEndMs - options.windowStartMs
        : (silence?.keptMs ?? 0) + (silence?.removedMs ?? 0) ||
          (fillers?.keptMs ?? 0) + (fillers?.removedMs ?? 0);

    return {
      items,
      silenceCount: silence?.silenceCount ?? 0,
      fillerCount: fillers?.fillerCount ?? 0,
      removedMs: Math.max(0, span - keptMs),
      keptMs,
    };
  },
};
