/**
 * Upload service — `POST /api/v1/uploads/video` and `/uploads/image`.
 *
 * Multipart field name must be `file` (matches UploadController).
 * Response: { url, publicId, sizeBytes, contentType, durationSeconds }.
 *
 * Use `url` + `durationSeconds` when creating a clip via clipService.addClip.
 * Editor-local `file://` URIs are fine for on-device preview; anything that
 * must sync across teammates has to go through this upload first.
 */
import { CONFIG } from '../config';
import { apiRequest } from './apiClient';

export type UploadResult = {
  url: string;
  publicId: string;
  sizeBytes: number;
  contentType: string;
  durationSeconds?: number | null;
};

async function upload(path: '/uploads/video' | '/uploads/image', uri: string, fileName: string, mimeType: string): Promise<UploadResult> {
  if (CONFIG.USE_MOCK) {
    throw new Error('Uploads require CONFIG.USE_MOCK = false and a running backend.');
  }

  const form = new FormData();
  // React Native FormData file shape
  form.append('file', {
    uri,
    name: fileName,
    type: mimeType,
  } as any);

  return apiRequest<UploadResult>(path, {
    method: 'POST',
    body: form,
  });
}

export const uploadService = {
  /** Upload a video to Cloudinary via the backend; returns CDN url + duration. */
  uploadVideo: (uri: string, fileName = 'clip.mp4', mimeType = 'video/mp4') =>
    upload('/uploads/video', uri, fileName, mimeType),

  /** Upload an image (thumbnail / avatar) via the backend. */
  uploadImage: (uri: string, fileName = 'image.jpg', mimeType = 'image/jpeg') =>
    upload('/uploads/image', uri, fileName, mimeType),
};
