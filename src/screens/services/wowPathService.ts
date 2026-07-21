/**
 * 5-minute wow path — seed a demo project so first-run users see
 * captions on a real clip, export once, then get nudged to invite.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';
import { FOOTAGE_LIBRARY } from './musicLibrary';
import { createTextOverlay } from './textOverlayservice';
import type { TextOverlay, VideoClip, VideoProject } from '../types';

export const WOW_PROJECT_NAME = 'First edit';
export const WOW_PROJECT_DESC = 'Your 5-minute demo — captions, export, invite.';

/** Short Mixkit B-roll — HTTPS so AI tools & export work without device upload. */
export function getWowDemoFootage() {
  return (
    FOOTAGE_LIBRARY.find((f) => f.id === 'stock-ocean-waves') ??
    FOOTAGE_LIBRARY[0]
  );
}

export async function isWowPathDone(): Promise<boolean> {
  const v = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.WOW_PATH_DONE);
  return v === 'true';
}

export async function markWowPathDone(): Promise<void> {
  await AsyncStorage.multiSet([
    [CONFIG.ASYNC_STORAGE_KEYS.WOW_PATH_DONE, 'true'],
    [CONFIG.ASYNC_STORAGE_KEYS.WOW_PATH_ACTIVE, 'false'],
  ]);
}

export async function setWowPathActive(active: boolean): Promise<void> {
  await AsyncStorage.setItem(
    CONFIG.ASYNC_STORAGE_KEYS.WOW_PATH_ACTIVE,
    active ? 'true' : 'false'
  );
}

export async function isWowPathActive(): Promise<boolean> {
  const v = await AsyncStorage.getItem(
    CONFIG.ASYNC_STORAGE_KEYS.WOW_PATH_ACTIVE
  );
  return v === 'true';
}

/** Karaoke-style sample lines so silent stock still looks “finished”. */
export function buildWowDemoCaptions(
  clipId: string,
  durationMs: number
): TextOverlay[] {
  const scripts: Array<{ text: string; startMs: number; durationMs: number }> = [
    { text: 'Edit in minutes', startMs: 200, durationMs: 3200 },
    { text: 'Captions · Shorts · Export', startMs: 3600, durationMs: 3800 },
    {
      text: 'Invite a friend — both get Pro',
      startMs: 7800,
      durationMs: Math.max(2800, Math.min(4500, durationMs - 7800)),
    },
  ];

  return scripts
    .filter((s) => s.startMs < durationMs - 400)
    .map((s) => {
      const base = createTextOverlay(
        clipId,
        s.text,
        s.startMs,
        Math.min(s.durationMs, durationMs - s.startMs)
      );
      return {
        ...base,
        y: 0.78,
        fontSize: 26,
        fontWeight: 'bold' as const,
        color: '#FFFFFF',
        highlightColor: '#F5C518',
        backgroundColor: '#000000',
        backgroundOpacity: 0.55,
        backgroundRadius: 10,
        isAiGenerated: true,
        animationIn: 'pop' as const,
        animationOut: 'fade' as const,
      };
    });
}

export function buildWowVideoProject(projectId: string): VideoProject {
  const footage = getWowDemoFootage();
  const durationMs = footage.durationMs ?? 12_000;
  const clipId = `wow-clip-${Date.now()}`;
  const now = new Date().toISOString();

  const clip: VideoClip = {
    id: clipId,
    uri: footage.url,
    durationMs,
    order: 0,
    kind: 'video',
    filterId: 'cinematic',
    effectId: 'zoomPunch',
    effectIntensity: 0.55,
    colorGrade: {
      brightness: 0.04,
      contrast: 0.2,
      saturation: 0.15,
      temperature: 0.08,
    },
    textOverlays: buildWowDemoCaptions(clipId, durationMs),
  };

  return {
    id: `vp-wow-${Date.now()}`,
    projectId,
    title: footage.title,
    createdAt: now,
    updatedAt: now,
    clips: [clip],
    totalDurationMs: durationMs,
  };
}
