/**
 * CapCut-style clip property curves — sample volume / opacity / color / crop
 * at a clip-local time (ms). Empty curves fall back to the clip's scalar fields.
 */
import type {
  ColorGrade,
  ColorGradeKeyframe,
  CropKeyframe,
  ScalarKeyframe,
  TextPositionKeyframe,
  VideoClip,
} from '../types';
import { DEFAULT_COLOR_GRADE as NEUTRAL_GRADE } from '../types';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sampleScalar(
  kfs: ScalarKeyframe[] | undefined,
  timeMs: number,
  fallback: number
): number {
  if (!kfs?.length) return fallback;
  const sorted = [...kfs].sort((a, b) => a.timeMs - b.timeMs);
  if (timeMs <= sorted[0].timeMs) return sorted[0].value;
  const last = sorted[sorted.length - 1];
  if (timeMs >= last.timeMs) return last.value;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (timeMs >= a.timeMs && timeMs <= b.timeMs) {
      const t = (timeMs - a.timeMs) / Math.max(1, b.timeMs - a.timeMs);
      return lerp(a.value, b.value, t);
    }
  }
  return last.value;
}

export function sampleClipVolume(clip: VideoClip, localTimeMs: number): number {
  return sampleScalar(clip.volumeKeyframes, localTimeMs, clip.volume ?? 1);
}

export function sampleClipOpacity(clip: VideoClip, localTimeMs: number): number {
  return sampleScalar(clip.opacityKeyframes, localTimeMs, clip.opacity ?? 1);
}

/** Camera-tilt degrees (−180…180). */
export function sampleClipRotation(clip: VideoClip, localTimeMs: number): number {
  return sampleScalar(clip.rotationKeyframes, localTimeMs, clip.rotation ?? 0);
}

/**
 * Scale factor so a rotated WxH frame still covers the preview (no black corners),
 * like Filmora / CapCut when you Dutch-angle the clip.
 */
export function coverScaleForRotation(degrees: number): number {
  const r = (Math.abs(degrees) % 180) * (Math.PI / 180);
  if (r < 0.001) return 1;
  return Math.abs(Math.cos(r)) + Math.abs(Math.sin(r));
}

export function sampleClipColorGrade(
  clip: VideoClip,
  localTimeMs: number
): ColorGrade {
  const base = clip.colorGrade ?? NEUTRAL_GRADE;
  const kfs = clip.colorGradeKeyframes;
  if (!kfs?.length) return base;
  const sorted = [...kfs].sort((a, b) => a.timeMs - b.timeMs);
  if (localTimeMs <= sorted[0].timeMs) return { ...sorted[0].grade };
  const last = sorted[sorted.length - 1];
  if (localTimeMs >= last.timeMs) return { ...last.grade };
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (localTimeMs >= a.timeMs && localTimeMs <= b.timeMs) {
      const t = (localTimeMs - a.timeMs) / Math.max(1, b.timeMs - a.timeMs);
      return {
        brightness: lerp(a.grade.brightness, b.grade.brightness, t),
        contrast: lerp(a.grade.contrast, b.grade.contrast, t),
        saturation: lerp(a.grade.saturation, b.grade.saturation, t),
        temperature: lerp(a.grade.temperature, b.grade.temperature, t),
      };
    }
  }
  return { ...last.grade };
}

export function sampleClipCrop(
  clip: VideoClip,
  localTimeMs: number
): { cropOffsetX: number; cropOffsetY: number; cropZoom: number } {
  const fallback = {
    cropOffsetX: clip.cropOffsetX ?? 0.5,
    cropOffsetY: clip.cropOffsetY ?? 0.5,
    cropZoom: clip.cropZoom ?? 1,
  };
  const kfs = clip.cropKeyframes;
  if (!kfs?.length) return fallback;
  const sorted = [...kfs].sort((a, b) => a.timeMs - b.timeMs);
  if (localTimeMs <= sorted[0].timeMs) {
    const k = sorted[0];
    return {
      cropOffsetX: k.cropOffsetX,
      cropOffsetY: k.cropOffsetY,
      cropZoom: k.cropZoom,
    };
  }
  const last = sorted[sorted.length - 1];
  if (localTimeMs >= last.timeMs) {
    return {
      cropOffsetX: last.cropOffsetX,
      cropOffsetY: last.cropOffsetY,
      cropZoom: last.cropZoom,
    };
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (localTimeMs >= a.timeMs && localTimeMs <= b.timeMs) {
      const t = (localTimeMs - a.timeMs) / Math.max(1, b.timeMs - a.timeMs);
      return {
        cropOffsetX: lerp(a.cropOffsetX, b.cropOffsetX, t),
        cropOffsetY: lerp(a.cropOffsetY, b.cropOffsetY, t),
        cropZoom: lerp(a.cropZoom, b.cropZoom, t),
      };
    }
  }
  return {
    cropOffsetX: last.cropOffsetX,
    cropOffsetY: last.cropOffsetY,
    cropZoom: last.cropZoom,
  };
}

export function sampleTextPosition(
  keyframes: TextPositionKeyframe[] | undefined,
  baseX: number,
  baseY: number,
  localTimeMs: number
): { x: number; y: number } {
  if (!keyframes?.length) return { x: baseX, y: baseY };
  const sorted = [...keyframes].sort((a, b) => a.timeMs - b.timeMs);
  if (localTimeMs <= sorted[0].timeMs) {
    return { x: sorted[0].x, y: sorted[0].y };
  }
  const last = sorted[sorted.length - 1];
  if (localTimeMs >= last.timeMs) return { x: last.x, y: last.y };
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (localTimeMs >= a.timeMs && localTimeMs <= b.timeMs) {
      const t = (localTimeMs - a.timeMs) / Math.max(1, b.timeMs - a.timeMs);
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
    }
  }
  return { x: last.x, y: last.y };
}

/** Upsert keyframe within 100ms; keep sorted. */
export function upsertScalarKeyframe(
  existing: ScalarKeyframe[] | undefined,
  kf: ScalarKeyframe
): ScalarKeyframe[] {
  const kept = (existing ?? []).filter((k) => Math.abs(k.timeMs - kf.timeMs) > 100);
  return [...kept, kf].sort((a, b) => a.timeMs - b.timeMs);
}

export function upsertColorGradeKeyframe(
  existing: ColorGradeKeyframe[] | undefined,
  kf: ColorGradeKeyframe
): ColorGradeKeyframe[] {
  const kept = (existing ?? []).filter((k) => Math.abs(k.timeMs - kf.timeMs) > 100);
  return [...kept, kf].sort((a, b) => a.timeMs - b.timeMs);
}

export function upsertCropKeyframe(
  existing: CropKeyframe[] | undefined,
  kf: CropKeyframe
): CropKeyframe[] {
  const kept = (existing ?? []).filter((k) => Math.abs(k.timeMs - kf.timeMs) > 100);
  return [...kept, kf].sort((a, b) => a.timeMs - b.timeMs);
}

export function upsertTextPositionKeyframe(
  existing: TextPositionKeyframe[] | undefined,
  kf: TextPositionKeyframe
): TextPositionKeyframe[] {
  const kept = (existing ?? []).filter((k) => Math.abs(k.timeMs - kf.timeMs) > 100);
  return [...kept, kf].sort((a, b) => a.timeMs - b.timeMs);
}
