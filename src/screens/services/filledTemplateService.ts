/**
 * Apply filled CapCut-style recipe extras (music, 9:16, photo flyer).
 */
import * as ImagePicker from 'expo-image-picker';
import type { EditTemplate } from './editTemplateService';
import { getMusicById, type LibraryTrack } from './musicLibrary';

export function getTemplateMusicTrack(tpl: EditTemplate): LibraryTrack | null {
  const id = tpl.music?.libraryId;
  if (!id) return null;
  return getMusicById(id) ?? null;
}

/** Parse "6:12" → ms; fallback 60s. */
export function libraryTrackDurationMs(track: LibraryTrack): number {
  if (track.durationMs && track.durationMs > 0) return track.durationMs;
  const parts = track.durationLabel.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 2 && parts.every((n) => !Number.isNaN(n))) {
    return Math.max(1000, (parts[0] * 60 + parts[1]) * 1000);
  }
  return 60_000;
}

/** Camera-roll photo for template flyer slot. */
export async function pickTemplatePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Allow photo access to use your image in this template.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.92,
    allowsMultipleSelection: false,
  });
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
}
