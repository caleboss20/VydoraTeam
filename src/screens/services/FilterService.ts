import { VideoFilter } from '../types';
// ─── Filter Definitions ────────────────────────────────────────────────────
// Fixed list of available filters. Each one is just a name + a tint overlay
// recipe (color + opacity) applied on top of the raw video frame.
//
// "None" is deliberately included here as a real VideoFilter (tintOpacity: 0)
// rather than a special case handled in components — this way
// FilterToolPanel, EditorScreen, and future FFmpeg export logic can all treat
// every entry in this list identically, with no if (filterId === 'none')
// branches scattered around.
//
// tintColor/tintOpacity drive the live preview overlay today. Later, when
// export baking is built (FFmpeg), this is the single place those values
// would be read from to build the real color filter command — components
// and context never need to change.
export const FILTER_LIST: VideoFilter[] = [
  {
    id: 'none',
    name: 'None',
    tintColor: '#000000',
    tintOpacity: 0,
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    tintColor: '#1B2A3A',
    tintOpacity: 0.25,
  },
  {
    id: 'film',
    name: 'Film',
    tintColor: '#8A6D3B',
    tintOpacity: 0.2,
  },
  {
    id: 'kodak',
    name: 'SL Kodak',
    tintColor: '#FF8A3D',
    tintOpacity: 0.22,
  },
  {
    id: 'bw',
    name: 'B&W',
    tintColor: '#808080',
    tintOpacity: 0.55,
  },
  {
    id: 'warm',
    name: 'Warm',
    tintColor: '#FFB347',
    tintOpacity: 0.2,
  },
  {
    id: 'cool',
    name: 'Cool',
    tintColor: '#3D7EFF',
    tintOpacity: 0.18,
  },
  {
    id: 'vintage',
    name: 'Vintage',
    tintColor: '#C9A227',
    tintOpacity: 0.28,
  },
  {
    id: 'noir',
    name: 'Noir',
    tintColor: '#0D0D0D',
    tintOpacity: 0.5,
  },
  {
    id: 'dream',
    name: 'Dream',
    tintColor: '#D6A8FF',
    tintOpacity: 0.22,
  },
];
// ─── Helpers ────────────────────────────────────────────────────────────────
/**
Look up a filter definition by id. Falls back to the "none" filter if the
id doesn't match anything (e.g. stale filterId from an older save, or
a clip that was never given a filterId).
*/
export function getFilterById(filterId?: string): VideoFilter {
  const found = FILTER_LIST.find((f) => f.id === filterId);
  return found ?? FILTER_LIST[0];
}