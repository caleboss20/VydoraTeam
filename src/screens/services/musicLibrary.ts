/**
 * Music & SFX library — curated royalty-free packs by mood.
 * Mixkit (free license) + SoundHelix demos. Remote URLs → timeline + export download.
 * Weekly drop prunes weak tracks and pins 5 “this week” picks on top.
 */
import { applyWeeklyMusicDrop } from './weeklyMusicDrop';

export type LibraryTrack = {
  id: string;
  title: string;
  /** Mood pack tag shown in Music library chips. */
  mood: string;
  durationLabel: string;
  url: string;
  kind: 'music' | 'sfx' | 'footage';
  thumbnailUrl?: string;
  durationMs?: number;
};

/** CapCut-style mood packs for browsing. */
export const MUSIC_MOODS = [
  'All',
  'Energetic',
  'Chill',
  'Cinematic',
  'Dance',
  'Hip-Hop',
  'Lifestyle',
  'Summer',
  'Electronic',
] as const;

export type MusicMood = (typeof MUSIC_MOODS)[number];

export const MUSIC_LIBRARY_BASE: LibraryTrack[] = [
  // ── Energetic / Uplifting ──
  {
    id: 'mix-fun-life',
    title: 'Fun Life',
    mood: 'Energetic',
    durationLabel: '1:15',
    durationMs: 75_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-fun-life-1124.mp3',
    kind: 'music',
  },
  {
    id: 'mix-driving-ambition',
    title: 'Driving Ambition',
    mood: 'Energetic',
    durationLabel: '1:35',
    durationMs: 95_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3',
    kind: 'music',
  },
  {
    id: 'lib-upbeat-drive',
    title: 'Upbeat Drive',
    mood: 'Energetic',
    durationLabel: '6:12',
    durationMs: 372_000,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    kind: 'music',
  },
  {
    id: 'lib-open-road',
    title: 'Open Road',
    mood: 'Energetic',
    durationLabel: '5:29',
    durationMs: 329_000,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
    kind: 'music',
  },

  // ── Chill ──
  {
    id: 'mix-dreaming-off',
    title: 'Dreaming Off',
    mood: 'Chill',
    durationLabel: '1:45',
    durationMs: 105_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-dreaming-off-202.mp3',
    kind: 'music',
  },
  {
    id: 'mix-hazy-after-hours',
    title: 'Hazy After Hours',
    mood: 'Chill',
    durationLabel: '1:50',
    durationMs: 110_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-hazy-after-hours-132.mp3',
    kind: 'music',
  },
  {
    id: 'lib-night-groove',
    title: 'Night Groove',
    mood: 'Chill',
    durationLabel: '7:05',
    durationMs: 425_000,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    kind: 'music',
  },

  // ── Cinematic ──
  {
    id: 'mix-deep-urban',
    title: 'Deep Urban',
    mood: 'Cinematic',
    durationLabel: '2:10',
    durationMs: 130_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-deep-urban-623.mp3',
    kind: 'music',
  },
  {
    id: 'mix-smooth-tension',
    title: 'Smooth Tension',
    mood: 'Cinematic',
    durationLabel: '1:40',
    durationMs: 100_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-smooth-tension-162.mp3',
    kind: 'music',
  },
  {
    id: 'lib-slow-burn',
    title: 'Slow Burn',
    mood: 'Cinematic',
    durationLabel: '6:45',
    durationMs: 405_000,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    kind: 'music',
  },

  // ── Dance ──
  {
    id: 'mix-tech-house',
    title: 'Tech House Vibes',
    mood: 'Dance',
    durationLabel: '1:30',
    durationMs: 90_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    kind: 'music',
  },
  {
    id: 'mix-dance-with-me',
    title: 'Dance With Me',
    mood: 'Dance',
    durationLabel: '1:20',
    durationMs: 80_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-dance-with-me-3.mp3',
    kind: 'music',
  },
  {
    id: 'lib-festival-lights',
    title: 'Festival Lights',
    mood: 'Dance',
    durationLabel: '5:55',
    durationMs: 355_000,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    kind: 'music',
  },

  // ── Hip-Hop ──
  {
    id: 'mix-hip-hop-02',
    title: 'Hip Hop 02',
    mood: 'Hip-Hop',
    durationLabel: '1:20',
    durationMs: 80_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
    kind: 'music',
  },
  {
    id: 'mix-hip-hop-02b',
    title: 'Raising Me Higher',
    mood: 'Hip-Hop',
    durationLabel: '1:25',
    durationMs: 85_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-raising-me-higher-34.mp3',
    kind: 'music',
  },

  // ── Lifestyle / Fashion ──
  {
    id: 'mix-cat-walk',
    title: 'Cat Walk',
    mood: 'Lifestyle',
    durationLabel: '1:10',
    durationMs: 70_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-cat-walk-143.mp3',
    kind: 'music',
  },
  {
    id: 'mix-lifestyle',
    title: 'Life Is a Dream',
    mood: 'Lifestyle',
    durationLabel: '1:30',
    durationMs: 90_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-life-is-a-dream-837.mp3',
    kind: 'music',
  },

  // ── Summer ──
  {
    id: 'mix-sun-and-water',
    title: 'Sun and Water',
    mood: 'Summer',
    durationLabel: '1:25',
    durationMs: 85_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-sun-and-water-1150.mp3',
    kind: 'music',
  },
  {
    id: 'mix-beach-party',
    title: 'Island Beat',
    mood: 'Summer',
    durationLabel: '1:15',
    durationMs: 75_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-island-beat-150.mp3',
    kind: 'music',
  },

  // ── Electronic ──
  {
    id: 'lib-synth-city',
    title: 'Synth City',
    mood: 'Electronic',
    durationLabel: '5:26',
    durationMs: 326_000,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    kind: 'music',
  },
  {
    id: 'mix-serene-mind',
    title: 'Serene View',
    mood: 'Electronic',
    durationLabel: '1:40',
    durationMs: 100_000,
    url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
    kind: 'music',
  },
];

/** Live catalog = weekly drop on top + pruned base. */
export const MUSIC_LIBRARY: LibraryTrack[] = applyWeeklyMusicDrop(
  MUSIC_LIBRARY_BASE
);

/** Legacy ids used by filled templates — keep aliases resolving. */
const TEMPLATE_ALIASES: Record<string, string> = {
  'mix-upbeat-fun': 'mix-fun-life',
  'mix-dreamy-vibes': 'mix-dreaming-off',
  'mix-cinematic-piano': 'mix-deep-urban',
  'mix-guitar-smooth': 'mix-smooth-tension',
  'mix-hip-hop': 'mix-hip-hop-02',
};

export function resolveMusicTrackId(id: string): string {
  return TEMPLATE_ALIASES[id] ?? id;
}

export function getMusicById(id: string): LibraryTrack | undefined {
  const resolved = resolveMusicTrackId(id);
  return MUSIC_LIBRARY.find((t) => t.id === resolved);
}

export const SFX_LIBRARY: LibraryTrack[] = [
  {
    id: 'sfx-ta-da',
    title: 'Ta-da!',
    mood: 'Win',
    durationLabel: '0:02',
    url: 'https://assets.mixkit.co/active_storage/sfx/2010/2010-preview.mp3',
    kind: 'sfx',
  },
  {
    id: 'sfx-whoosh',
    title: 'Whoosh',
    mood: 'Transition',
    durationLabel: '0:01',
    url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    kind: 'sfx',
  },
  {
    id: 'sfx-pop',
    title: 'Pop',
    mood: 'UI',
    durationLabel: '0:01',
    url: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
    kind: 'sfx',
  },
  {
    id: 'sfx-applause',
    title: 'Applause',
    mood: 'Crowd',
    durationLabel: '0:05',
    url: 'https://assets.mixkit.co/active_storage/sfx/435/435-preview.mp3',
    kind: 'sfx',
  },
  {
    id: 'sfx-camera',
    title: 'Camera Shutter',
    mood: 'Foley',
    durationLabel: '0:01',
    url: 'https://assets.mixkit.co/active_storage/sfx/1421/1421-preview.mp3',
    kind: 'sfx',
  },
  {
    id: 'sfx-impact',
    title: 'Cinematic Hit',
    mood: 'Impact',
    durationLabel: '0:02',
    url: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    kind: 'sfx',
  },
];

export const FOOTAGE_LIBRARY: LibraryTrack[] = [
  {
    id: 'stock-city-night',
    title: 'City Night Drive',
    mood: 'Urban',
    durationLabel: '0:15',
    durationMs: 15_000,
    url: 'https://assets.mixkit.co/videos/preview/mixkit-highway-in-the-middle-of-a-mountain-range-4630-large.mp4',
    thumbnailUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-highway-in-the-middle-of-a-mountain-range-4630-large.mp4',
    kind: 'footage',
  },
  {
    id: 'stock-ocean-waves',
    title: 'Ocean Waves',
    mood: 'Nature',
    durationLabel: '0:12',
    durationMs: 12_000,
    url: 'https://assets.mixkit.co/videos/preview/mixkit-waves-coming-to-the-beach-5016-large.mp4',
    kind: 'footage',
  },
  {
    id: 'stock-forest-sun',
    title: 'Forest Sunbeams',
    mood: 'Cinematic',
    durationLabel: '0:14',
    durationMs: 14_000,
    url: 'https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-forest-4823-large.mp4',
    kind: 'footage',
  },
  {
    id: 'stock-coffee-pour',
    title: 'Coffee Pour',
    mood: 'Lifestyle',
    durationLabel: '0:10',
    durationMs: 10_000,
    url: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-a-cup-of-coffee-422-large.mp4',
    kind: 'footage',
  },
  {
    id: 'stock-typing',
    title: 'Typing Hands',
    mood: 'Work',
    durationLabel: '0:11',
    durationMs: 11_000,
    url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-man-working-on-a-laptop-42614-large.mp4',
    kind: 'footage',
  },
  {
    id: 'stock-crowd',
    title: 'Festival Crowd',
    mood: 'Energy',
    durationLabel: '0:13',
    durationMs: 13_000,
    url: 'https://assets.mixkit.co/videos/preview/mixkit-people-dancing-at-a-party-4275-large.mp4',
    kind: 'footage',
  },
];

export function filterLibrary(
  tracks: LibraryTrack[],
  query: string,
  mood?: string | null
): LibraryTrack[] {
  const q = query.trim().toLowerCase();
  const moodFilter =
    mood && mood !== 'All' ? mood.toLowerCase() : null;
  return tracks.filter((t) => {
    if (moodFilter && t.mood.toLowerCase() !== moodFilter) return false;
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.mood.toLowerCase().includes(q) ||
      t.kind.toLowerCase().includes(q)
    );
  });
}

export function stockMoods(tracks: LibraryTrack[]): string[] {
  return Array.from(new Set(tracks.map((t) => t.mood))).sort();
}
