/**
 * Multi-video pick → timeline mix. Append several gallery clips in order,
 * then trim / split / reorder / export as one reel.
 */
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { uploadService } from './uploadService';

export type PickedMixVideo = {
  uri: string;
  durationMs: number;
  title: string;
  fileName: string;
  mimeType: string;
};

function mimeForName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? 'mp4';
  switch (ext) {
    case 'mov':
      return 'video/quicktime';
    case 'avi':
      return 'video/x-msvideo';
    case 'mkv':
      return 'video/x-matroska';
    case 'webm':
      return 'video/webm';
    default:
      return 'video/mp4';
  }
}

function titleFromName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').trim();
  return base || 'Clip';
}

/** Pick one or more videos from the camera roll (multi-select when the OS allows). */
export async function pickVideosFromGallery(
  selectionLimit = 12
): Promise<PickedMixVideo[]> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Allow photo library access to add videos to the timeline.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsMultipleSelection: true,
    selectionLimit,
    quality: 1,
  });

  if (result.canceled || !result.assets?.length) return [];

  return result.assets
    .filter((a) => !!a.uri)
    .map((a, i) => {
      const fileName =
        a.fileName || `mix_${Date.now()}_${i}.mp4`;
      const durationSec =
        typeof a.duration === 'number' && a.duration > 0 ? a.duration : 8;
      // Expo duration is seconds on most platforms.
      const durationMs = Math.max(
        500,
        Math.round(durationSec > 1000 ? durationSec : durationSec * 1000)
      );
      return {
        uri: a.uri,
        durationMs,
        title: titleFromName(fileName),
        fileName,
        mimeType: a.mimeType || mimeForName(fileName),
      };
    });
}

/** Pick videos from Files (also multi). */
export async function pickVideosFromFiles(): Promise<PickedMixVideo[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/*'],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.length) return [];

  return result.assets.map((a, i) => {
    const fileName = a.name || `file_${Date.now()}_${i}.mp4`;
    return {
      uri: a.uri,
      durationMs: 8000,
      title: titleFromName(fileName),
      fileName,
      mimeType: a.mimeType || mimeForName(fileName),
    };
  });
}

/** Upload a local mix clip; returns CDN URL + duration when the server reports it. */
export async function uploadMixVideo(
  picked: PickedMixVideo
): Promise<{ url: string; durationMs: number }> {
  if (/^https?:\/\//i.test(picked.uri)) {
    return { url: picked.uri, durationMs: picked.durationMs };
  }
  const uploaded = await uploadService.uploadVideo(
    picked.uri,
    picked.fileName,
    picked.mimeType
  );
  const durationMs =
    uploaded.durationSeconds && uploaded.durationSeconds > 0
      ? Math.round(uploaded.durationSeconds * 1000)
      : picked.durationMs;
  return { url: uploaded.url, durationMs: Math.max(500, durationMs) };
}
