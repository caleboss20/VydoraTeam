/**
 * Rough cut helpers — merge silence + filler keep windows, invert cut ranges.
 */
export type TimeRange = { startMs: number; endMs: number };

/** Merge overlapping/adjacent ranges. */
export function mergeRanges(ranges: TimeRange[], gapMs = 40): TimeRange[] {
  if (!ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a.startMs - b.startMs);
  const out: TimeRange[] = [];
  let s = sorted[0].startMs;
  let e = sorted[0].endMs;
  for (let i = 1; i < sorted.length; i++) {
    const r = sorted[i];
    if (r.startMs <= e + gapMs) {
      e = Math.max(e, r.endMs);
    } else {
      out.push({ startMs: s, endMs: e });
      s = r.startMs;
      e = r.endMs;
    }
  }
  out.push({ startMs: s, endMs: e });
  return out;
}

/** Window minus cut ranges → keep speech. */
export function invertCuts(
  winStart: number,
  winEnd: number,
  cuts: TimeRange[]
): TimeRange[] {
  const merged = mergeRanges(cuts);
  const keep: TimeRange[] = [];
  let cursor = winStart;
  for (const c of merged) {
    const start = Math.max(winStart, c.startMs);
    const end = Math.min(winEnd, c.endMs);
    if (start > cursor) keep.push({ startMs: cursor, endMs: start });
    cursor = Math.max(cursor, end);
  }
  if (cursor < winEnd) keep.push({ startMs: cursor, endMs: winEnd });
  return keep.filter((k) => k.endMs - k.startMs >= 200);
}

/** Invert keep → cuts (for merging two keep lists via cut-union). */
export function keepToCuts(
  winStart: number,
  winEnd: number,
  keep: TimeRange[]
): TimeRange[] {
  return invertCuts(winStart, winEnd, keep);
}

/**
 * Intersection of two keep lists = remove anything either pass wanted cut.
 * (keepA ∩ keepB)
 */
export function intersectKeep(
  winStart: number,
  winEnd: number,
  keepA: TimeRange[],
  keepB: TimeRange[]
): TimeRange[] {
  const cuts = mergeRanges([
    ...keepToCuts(winStart, winEnd, keepA),
    ...keepToCuts(winStart, winEnd, keepB),
  ]);
  return invertCuts(winStart, winEnd, cuts);
}
