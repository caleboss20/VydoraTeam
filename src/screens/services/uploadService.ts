/**
 * Upload service — `POST /api/v1/uploads/video` and `/uploads/image`.
 *
 * - Images (covers, avatars): stored on the backend disk, URL under /files/**
 * - Videos: Cloudinary CDN (needs CLOUDINARY_* on the backend)
 *
 * Multipart field name must be `file`.
 * Response: { url, publicId, sizeBytes, contentType, durationSeconds }.
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

async function upload(
  path: '/uploads/video' | '/uploads/image',
  uri: string,
  fileName: string,
  mimeType: string
): Promise<UploadResult> {
  if (CONFIG.USE_MOCK) {
    throw new Error('Uploads require CONFIG.USE_MOCK = false and a running backend.');
  }

  const form = new FormData();
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
  /** Video → Cloudinary via backend. */
  uploadVideo: (uri: string, fileName = 'clip.mp4', mimeType = 'video/mp4') =>
    upload('/uploads/video', uri, fileName, mimeType),

  /** Image → local backend storage (no Cloudinary). */
  uploadImage: (uri: string, fileName = 'image.jpg', mimeType = 'image/jpeg') =>
    upload('/uploads/image', uri, fileName, mimeType),
};
