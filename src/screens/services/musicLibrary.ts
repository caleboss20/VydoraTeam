/**
 * Music & sound-effects library — curated royalty-free tracks streamed from
 * stable public CDNs, so nothing has to be bundled in the app binary.
 *
 * Tracks: SoundHelix demo songs (T. Schürger, free for any use).
 * SFX: Mixkit free sound effects (Mixkit license — free with no attribution).
 *
 * Because these are already remote URLs, picking one plugs straight into the
 * existing BackgroundMusic flow AND the baked-export pipeline (the server
 * downloads the URL directly — no upload step needed).
 */

export type LibraryTrack = {
  id: string;
  title: string;
  /** Mood/genre tag shown on the row, e.g. "Upbeat". */
  mood: string;
  /** Rough duration for the row label — the player reads the real one. */
  durationLabel: string;
  url: string;
  kind: 'music' | 'sfx' | 'footage';
  /** Optional poster for footage rows. */
  thumbnailUrl?: string;
  /** Approximate duration in ms (footage append). */
  durationMs?: number;
};

export const MUSIC_LIBRARY: LibraryTrack[] = [
  {
    id: 'lib-upbeat-drive',
    title: 'Upbeat Drive',
    mood: 'Energetic',
    durationLabel: '6:12',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    kind: 'music',
  },
  {
    id: 'lib-night-groove',
    title: 'Night Groove',
    mood: 'Chill',
    durationLabel: '7:05',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    kind: 'music',
  },
  {
    id: 'lib-synth-city',
    title: 'Synth City',
    mood: 'Electronic',
    durationLabel: '5:26',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    kind: 'music',
  },
  {
    id: 'lib-slow-burn',
    title: 'Slow Burn',
    mood: 'Cinematic',
    durationLabel: '6:45',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    kind: 'music',
  },
  {
    id: 'lib-festival-lights',
    title: 'Festival Lights',
    mood: 'Dance',
    durationLabel: '5:55',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    kind: 'music',
  },
  {
    id: 'lib-open-road',
    title: 'Open Road',
    mood: 'Uplifting',
    durationLabel: '5:29',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
    kind: 'music',
  },
];

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
];

/**
 * Stock B-roll — Mixkit free stock video (Mixkit license).
 * Remote URLs plug into the timeline + export download path.
 */
export const FOOTAGE_LIBRARY: LibraryTrack[] = [
  {
    id: 'stock-city-night',
    title: 'City Night Drive',
    mood: 'Urban',
    durationLabel: '0:15',
    durationMs: 15_000,
    url: 'https://assets.mixkit.co/videos/preview/mixkit-highway-in-the-middle-of-a-mountain-range-4630-large.mp4',
    thumbnailUrl: 'https://assets.mixkit.co/videos/preview/mixkit-highway-in-the-middle-of-a-mountain-range-4630-large.mp4',
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
