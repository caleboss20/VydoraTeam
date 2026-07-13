import { BackgroundMusic } from '../types';
export function createBackgroundMusic(
  uri: string,
  durationMs: number,
  startMs: number = 0
): BackgroundMusic {
  return {
    uri,
    volume: 1,
    startMs,
    durationMs,
    trimStartMs: 0,
    trimEndMs: durationMs,
  };
}
export function updateBackgroundMusic(
  current: BackgroundMusic,
  changes: Partial<BackgroundMusic>
): BackgroundMusic {
  return { ...current, ...changes };
}