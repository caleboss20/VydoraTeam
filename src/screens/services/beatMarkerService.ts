/**
 * Beat / cut markers — CapCut-style snap points on the timeline.
 * Markers are manual (tap to drop at playhead). Split snaps to the nearest
 * marker within SNAP_WINDOW_MS.
 */
export const SNAP_WINDOW_MS = 350;

/** Nearest marker to `timeMs`, or null if none within the snap window. */
export function nearestBeatMarker(
  markers: number[] | undefined,
  timeMs: number,
  windowMs = SNAP_WINDOW_MS
): number | null {
  if (!markers?.length) return null;
  let best: number | null = null;
  let bestDist = windowMs + 1;
  for (const m of markers) {
    const d = Math.abs(m - timeMs);
    if (d < bestDist) {
      bestDist = d;
      best = m;
    }
  }
  return bestDist <= windowMs ? best : null;
}

/** Insert a marker, deduping within 80ms, keep sorted. */
export function upsertBeatMarker(markers: number[] | undefined, timeMs: number): number[] {
  const t = Math.max(0, Math.round(timeMs));
  const kept = (markers ?? []).filter((m) => Math.abs(m - t) > 80);
  return [...kept, t].sort((a, b) => a - b);
}

export function removeBeatMarker(markers: number[] | undefined, timeMs: number): number[] {
  return (markers ?? []).filter((m) => Math.abs(m - timeMs) > 80);
}

/** Merge many detected beats into existing markers (dedupe ±80ms). */
export function mergeBeatMarkers(
  markers: number[] | undefined,
  timesMs: number[]
): number[] {
  let next = markers ?? [];
  for (const t of timesMs) {
    next = upsertBeatMarker(next, t);
  }
  return next;
}
