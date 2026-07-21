/**
 * Weekly curated music drop — 5 fresh picks + prune weak / outdated ids.
 * Rotate WEEKLY_DROP_ID when you ship a new pack (ISO week or manual).
 */
import type { LibraryTrack } from './musicLibrary';

/** Bump this when publishing a new weekly set. */
export const WEEKLY_DROP_ID = '2026-W30';

export const WEEKLY_DROP_LABEL = 'This week’s heat · W30';

/**
 * Hand-picked Mixkit / SoundHelix tracks that rotate into the top of Music.
 * Kill list removes weak or broken ids from the browsable library.
 */
export const WEEKLY_DROP_TRACKS: LibraryTrack[] = [
  {
    id: 'week-drive',
    title: 'Driving Ambition',
    mood: 'Energetic',
    durationLabel: '1:35',
    durationMs: 95_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3',
    kind: 'music',
  },
  {
    id: 'week-house',
    title: 'Tech House Vibes',
    mood: 'Dance',
    durationLabel: '1:30',
    durationMs: 90_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    kind: 'music',
  },
  {
    id: 'week-dream',
    title: 'Dreaming Off',
    mood: 'Chill',
    durationLabel: '1:45',
    durationMs: 105_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-dreaming-off-202.mp3',
    kind: 'music',
  },
  {
    id: 'week-urban',
    title: 'Deep Urban',
    mood: 'Cinematic',
    durationLabel: '2:10',
    durationMs: 130_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-deep-urban-623.mp3',
    kind: 'music',
  },
  {
    id: 'week-summer',
    title: 'Sun and Water',
    mood: 'Summer',
    durationLabel: '1:25',
    durationMs: 85_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-sun-and-water-1150.mp3',
    kind: 'music',
  },
];

/** Weak / redundant / unreliable ids to hide from the Music library. */
export const WEEKLY_KILL_IDS = new Set<string>([
  'lib-upbeat-drive', // long SoundHelix demos feel unfinished vs Mixkit packs
  'lib-open-road',
  'mix-hip-hop-02b', // keep one hip-hop hero
  'mix-serene-mind',
  'mix-lifestyle',
]);

/** Merge weekly drop to the front; drop killed ids from the base catalog. */
export function applyWeeklyMusicDrop(base: LibraryTrack[]): LibraryTrack[] {
  const killed = base.filter((t) => !WEEKLY_KILL_IDS.has(t.id));
  const dropIds = new Set(WEEKLY_DROP_TRACKS.map((t) => t.id));
  // Prefer weekly titles; skip duplicates by URL from base.
  const dropUrls = new Set(WEEKLY_DROP_TRACKS.map((t) => t.url));
  const rest = killed.filter(
    (t) => !dropIds.has(t.id) && !dropUrls.has(t.url)
  );
  return [...WEEKLY_DROP_TRACKS, ...rest];
}
