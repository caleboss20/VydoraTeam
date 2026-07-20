import { BackgroundMusic } from '../types';

/** Build a music/SFX track ready for `musicTracks[]`. */
export function createBackgroundMusic(
  uri: string,
  durationMs: number,
  startMs: number = 0,
  title?: string
): BackgroundMusic {
  return {
    id: `music-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    uri,
    volume: 0.6,
    startMs,
    durationMs,
    trimStartMs: 0,
    trimEndMs: durationMs,
    fadeInMs: 500,
    fadeOutMs: 800,
    duckUnderVoiceover: true,
    title,
  };
}

export function updateBackgroundMusic(
  current: BackgroundMusic,
  changes: Partial<BackgroundMusic>
): BackgroundMusic {
  return { ...current, ...changes };
}

/**
 * Prefer `musicTracks`; fall back to legacy singular `backgroundMusic`
 * so older saved projects still load.
 */
export function getMusicTracks(project: {
  musicTracks?: BackgroundMusic[];
  backgroundMusic?: BackgroundMusic;
}): BackgroundMusic[] {
  if (project.musicTracks && project.musicTracks.length > 0) {
    return project.musicTracks;
  }
  return project.backgroundMusic ? [project.backgroundMusic] : [];
}

/** Audible window length on the timeline for a track. */
export function musicAudibleMs(m: BackgroundMusic): number {
  const trimStart = m.trimStartMs ?? 0;
  const trimEnd = m.trimEndMs ?? m.durationMs ?? 0;
  return Math.max(200, trimEnd - trimStart);
}
