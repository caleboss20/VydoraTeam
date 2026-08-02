/**
 * Episode Factory — one interview → content pack:
 * cold-open hook + vertical Shorts + intro/outro cards.
 */
import type { CaptionSegment } from "./captionService";
import type { ShortSuggestion } from "./shortsService";
import { shortsService } from "./shortsService";

export type EpisodePackItem = {
  kind: "cold_open" | "hook";
  title: string;
  startMs: number;
  endMs: number;
  score: number;
  hook: string;
  sourceClipId: string;
};

export type EpisodeFactoryPlan = {
  seriesTitle: string;
  introTitle: string;
  introSubtitle: string;
  outroTitle: string;
  outroSubtitle: string;
  coldOpen: EpisodePackItem | null;
  hooks: EpisodePackItem[];
  /** Human summary for the UI. */
  summary: string;
};

const clampRange = (startMs: number, endMs: number, maxMs: number) => {
  const s = Math.max(0, Math.round(startMs));
  const e = Math.min(maxMs, Math.round(endMs));
  return e - s >= 1200 ? { startMs: s, endMs: e } : null;
};

/** Caption-only hooks when shorts API is down — still ships a pack. */
export function hooksFromCaptions(
  segments: CaptionSegment[],
  sourceClipId: string,
  durationMs: number,
  maxHooks = 4
): EpisodePackItem[] {
  if (!segments?.length) return [];

  const scored = segments
    .map((s) => {
      const dur = Math.max(0, s.endMs - s.startMs);
      const text = (s.text || "").trim();
      let score = 0.2;
      if (/\?/.test(text)) score += 0.35;
      if (dur >= 2500 && dur <= 12000) score += 0.25;
      if (dur > 12000) score += 0.15;
      if (/\b(because|money|farm|cocoa|yield|change|future|hope)\b/i.test(text))
        score += 0.2;
      if (text.length > 40) score += 0.1;
      const pad = 8000;
      const mid = (s.startMs + s.endMs) / 2;
      const startMs = Math.max(0, mid - pad);
      const endMs = Math.min(durationMs, mid + pad);
      return {
        kind: "hook" as const,
        title: text.slice(0, 42) || "Moment",
        startMs,
        endMs,
        score,
        hook: text.slice(0, 80) || "Highlight",
        sourceClipId,
      };
    })
    .filter((h) => h.endMs - h.startMs >= 8000)
    .sort((a, b) => b.score - a.score);

  const out: EpisodePackItem[] = [];
  for (const h of scored) {
    if (out.length >= maxHooks) break;
    const overlaps = out.some(
      (o) => !(h.endMs <= o.startMs + 1500 || h.startMs >= o.endMs - 1500)
    );
    if (!overlaps) out.push(h);
  }
  return out;
}

export function planFromShorts(
  items: ShortSuggestion[],
  sourceClipId: string,
  durationMs: number,
  maxHooks = 4
): EpisodePackItem[] {
  return items
    .map((s) => {
      const range = clampRange(s.startMs, s.endMs, durationMs);
      if (!range) return null;
      return {
        kind: "hook" as const,
        title: s.title || "Hook",
        startMs: range.startMs,
        endMs: range.endMs,
        score: s.score ?? 0.5,
        hook: s.hook || s.title || "Highlight",
        sourceClipId,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score)
    .slice(0, maxHooks) as EpisodePackItem[];
}

export async function buildEpisodePlan(opts: {
  seriesTitle: string;
  sourceClipId: string;
  videoUrl: string;
  durationMs: number;
  segments?: CaptionSegment[];
  maxHooks?: number;
}): Promise<EpisodeFactoryPlan> {
  const maxHooks = opts.maxHooks ?? 4;
  const title = (opts.seriesTitle || "Podcast").trim() || "Podcast";

  let hooks: EpisodePackItem[] = [];
  try {
    if (/^https?:\/\//i.test(opts.videoUrl)) {
      const items = await shortsService.suggest(opts.videoUrl, {
        maxClips: Math.max(8, maxHooks + 2),
        targetDurationMs: 28_000,
      });
      hooks = planFromShorts(
        items,
        opts.sourceClipId,
        opts.durationMs,
        maxHooks
      );
    }
  } catch {
    /* fall through to captions */
  }

  if (hooks.length < 2 && opts.segments?.length) {
    const fromCaps = hooksFromCaptions(
      opts.segments,
      opts.sourceClipId,
      opts.durationMs,
      maxHooks
    );
    const merged = [...hooks];
    for (const h of fromCaps) {
      if (merged.length >= maxHooks) break;
      const overlaps = merged.some(
        (o) => !(h.endMs <= o.startMs + 1500 || h.startMs >= o.endMs - 1500)
      );
      if (!overlaps) merged.push(h);
    }
    hooks = merged;
  }

  const coldOpen =
    hooks.length > 0
      ? {
          ...hooks[0],
          kind: "cold_open" as const,
          title: "Cold open",
          hook: hooks[0].hook,
        }
      : null;

  const rest = coldOpen
    ? hooks.filter(
        (h) =>
          !(
            Math.abs(h.startMs - coldOpen.startMs) < 500 &&
            Math.abs(h.endMs - coldOpen.endMs) < 500
          )
      )
    : hooks;

  return {
    seriesTitle: title,
    introTitle: title,
    introSubtitle: "A Vydora Podcast",
    outroTitle: "Thanks for watching",
    outroSubtitle: "Follow for the next episode",
    coldOpen,
    hooks: rest.slice(0, maxHooks),
    summary: coldOpen
      ? `1 cold open · ${rest.slice(0, maxHooks).length} Shorts · intro + outro`
      : `Could not find hooks — add captions or try a longer interview clip.`,
  };
}
