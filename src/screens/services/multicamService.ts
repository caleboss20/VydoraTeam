/**
 * Multi-cam A/B sync — `/api/v1/ai/multicam-sync`.
 * Audio cross-correlation; returns Cam B lag vs Cam A.
 */
import { CONFIG } from '../config';
import { apiRequest } from './apiClient';
import type { CamAngle, MultiCamGroup, VideoClip } from '../types';

export type MulticamSyncResult = {
  offsetMs: number;
  confidence: number;
  message: string;
};

export const multicamService = {
  sync: async (videoUrlA: string, videoUrlB: string): Promise<MulticamSyncResult> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock multi-cam sync disabled.');
    return apiRequest<MulticamSyncResult>('/ai/multicam-sync', {
      method: 'POST',
      body: JSON.stringify({ videoUrlA, videoUrlB }),
    });
  },

  /** Build a multi-cam group from Cam A (active clip) + synced Cam B. */
  buildGroup: (
    clip: VideoClip,
    camB: { uri: string; durationMs: number; offsetMs: number; thumbnailUri?: string }
  ): MultiCamGroup => {
    const groupId = `mc_${Date.now().toString(36)}`;
    const angleA: CamAngle = {
      id: `${groupId}_a`,
      uri: clip.uri,
      label: 'Cam A',
      offsetMs: 0,
      durationMs: clip.durationMs,
      thumbnailUri: clip.thumbnailUri,
    };
    const angleB: CamAngle = {
      id: `${groupId}_b`,
      uri: camB.uri,
      label: 'Cam B',
      offsetMs: camB.offsetMs,
      durationMs: camB.durationMs,
      thumbnailUri: camB.thumbnailUri,
    };
    return {
      groupId,
      angles: [angleA, angleB],
      angleId: angleA.id,
    };
  },

  /**
   * Remap a clip piece onto another angle while keeping the same sync-clock
   * window (so mouths stay locked after a director cut).
   */
  remapClipToAngle: (clip: VideoClip, angleId: string): VideoClip | null => {
    const mc = clip.multiCam;
    if (!mc) return null;
    const next = mc.angles.find((a) => a.id === angleId);
    const cur = mc.angles.find((a) => a.id === mc.angleId) ?? mc.angles[0];
    if (!next || !cur) return null;

    const trimStart = clip.trimStartMs ?? 0;
    const trimEnd = clip.trimEndMs ?? clip.durationMs;
    // Sync clock for the window currently shown.
    const clockStart = trimStart + cur.offsetMs;
    const clockEnd = trimEnd + cur.offsetMs;

    const newTrimStart = Math.max(0, clockStart - next.offsetMs);
    const newTrimEnd = Math.min(next.durationMs, clockEnd - next.offsetMs);
    if (newTrimEnd - newTrimStart < 200) return null;

    return {
      ...clip,
      uri: next.uri,
      durationMs: next.durationMs,
      thumbnailUri: next.thumbnailUri ?? clip.thumbnailUri,
      trimStartMs: newTrimStart,
      trimEndMs: newTrimEnd,
      multiCam: { ...mc, angleId: next.id },
    };
  },
};
