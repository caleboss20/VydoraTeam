import { CropRatioPreset } from '../types';
// ─── Crop Ratio Presets ─────────────────────────────────────────────────────
// Framed around platforms rather than raw ratios, so the picker shows
// "TikTok · 9:16" instead of a bare number the user has to interpret.
// Each preset still resolves to a plain ratioValue under the hood, so
// CropOverlay and the export/FFmpeg step later only ever deal with a number.
//
// "Original" is included as a real preset (matching how "None" worked for
// filters) rather than a special case scattered through components — its
// ratioValue is a placeholder (1) because the real ratio is derived from the
// clip's own dimensions at runtime wherever "Original" is selected.
export const CROP_RATIO_PRESETS: CropRatioPreset[] = [
  {
    id: 'original',
    label: 'Original',
    ratioLabel: 'Source',
    ratioValue: 1, // placeholder — resolve from clip's native dimensions at runtime
  },
  {
    id: 'tiktok',
    label: 'TikTok / Reels / Shorts',
    ratioLabel: '9:16',
    ratioValue: 9 / 16,
  },
  {
    id: 'instagram_feed',
    label: 'Instagram Feed',
    ratioLabel: '4:5',
    ratioValue: 4 / 5,
  },
  {
    id: 'square',
    label: 'Square',
    ratioLabel: '1:1',
    ratioValue: 1,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    ratioLabel: '16:9',
    ratioValue: 16 / 9,
  },
  {
    id: 'whatsapp_status',
    label: 'WhatsApp Status',
    ratioLabel: '9:16',
    ratioValue: 9 / 16,
  },
];
// ─── Helpers ────────────────────────────────────────────────────────────────
/**
Look up a crop preset by id. Falls back to "original" if the id doesn't
match anything (e.g. stale cropRatioId from an older save).
*/
export function getCropPresetById(cropRatioId?: string): CropRatioPreset {
  const found = CROP_RATIO_PRESETS.find((p) => p.id === cropRatioId);
  return found ?? CROP_RATIO_PRESETS[0];
}