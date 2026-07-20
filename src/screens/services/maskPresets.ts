/**
 * CapCut-style overlay mask presets + helpers.
 */
import type {
  MediaOverlay,
  OverlayMask,
  OverlayMaskKeyframe,
  OverlayMaskShape,
} from '../types';

export type MaskPresetId =
  | 'none'
  | 'circle_pip'
  | 'soft_cloud'
  | 'dream_edge'
  | 'spotlight'
  | 'split_lr'
  | 'split_tb'
  | 'split_diag'
  | 'film_strip'
  | 'heart_cutout'
  | 'star_burst'
  | 'linear_wipe'
  | 'radial_glow';

export type MaskPreset = {
  id: MaskPresetId;
  label: string;
  hint: string;
  icon: string;
  /** Partial overlay update (mask + optional layout for splits). */
  apply: () => Partial<Pick<MediaOverlay, 'mask' | 'x' | 'y' | 'scale'>>;
};

export const DEFAULT_OVERLAY_MASK: OverlayMask = {
  enabled: false,
  shape: 'none',
  feather: 0.12,
  invert: false,
  centerX: 0.5,
  centerY: 0.5,
  scale: 1,
  rotation: 0,
  followMotion: false,
};

export function ensureMask(mask?: OverlayMask | null): OverlayMask {
  return { ...DEFAULT_OVERLAY_MASK, ...(mask ?? {}) };
}

export function maskWithShape(
  shape: OverlayMaskShape,
  overrides: Partial<OverlayMask> = {}
): OverlayMask {
  return {
    ...DEFAULT_OVERLAY_MASK,
    enabled: shape !== 'none',
    shape,
    ...overrides,
  };
}

/** Sample mask transform at timeline time (keyframes lerp). */
export function sampleMaskTransform(
  mask: OverlayMask,
  timeMs: number
): Pick<OverlayMask, 'centerX' | 'centerY' | 'scale' | 'rotation'> {
  const kfs = mask.keyframes ?? [];
  if (kfs.length === 0) {
    return {
      centerX: mask.centerX,
      centerY: mask.centerY,
      scale: mask.scale,
      rotation: mask.rotation,
    };
  }
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  if (timeMs <= kfs[0].timeMs) {
    const k = kfs[0];
    return {
      centerX: k.centerX,
      centerY: k.centerY,
      scale: k.scale,
      rotation: k.rotation,
    };
  }
  const last = kfs[kfs.length - 1];
  if (timeMs >= last.timeMs) {
    return {
      centerX: last.centerX,
      centerY: last.centerY,
      scale: last.scale,
      rotation: last.rotation,
    };
  }
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (timeMs >= a.timeMs && timeMs <= b.timeMs) {
      const t = (timeMs - a.timeMs) / Math.max(1, b.timeMs - a.timeMs);
      return {
        centerX: lerp(a.centerX, b.centerX, t),
        centerY: lerp(a.centerY, b.centerY, t),
        scale: lerp(a.scale, b.scale, t),
        rotation: lerp(a.rotation, b.rotation, t),
      };
    }
  }
  return {
    centerX: last.centerX,
    centerY: last.centerY,
    scale: last.scale,
    rotation: last.rotation,
  };
}

export const MASK_SHAPES: {
  id: OverlayMaskShape;
  label: string;
  icon: string;
}[] = [
  { id: 'none', label: 'None', icon: 'close-circle-outline' },
  { id: 'circle', label: 'Circle', icon: 'ellipse-outline' },
  { id: 'rectangle', label: 'Rect', icon: 'square-outline' },
  { id: 'linear', label: 'Linear', icon: 'swap-vertical-outline' },
  { id: 'linearH', label: 'Wipe', icon: 'swap-horizontal-outline' },
  { id: 'radial', label: 'Radial', icon: 'radio-button-on-outline' },
  { id: 'splitLR', label: 'L / R', icon: 'tablet-landscape-outline' },
  { id: 'splitTB', label: 'T / B', icon: 'tablet-portrait-outline' },
  { id: 'splitDiag', label: 'Diag', icon: 'git-commit-outline' },
  { id: 'heart', label: 'Heart', icon: 'heart-outline' },
  { id: 'star', label: 'Star', icon: 'star-outline' },
];

export const MASK_PRESETS: MaskPreset[] = [
  {
    id: 'none',
    label: 'None',
    hint: 'Clear mask',
    icon: 'close-outline',
    apply: () => ({ mask: { ...DEFAULT_OVERLAY_MASK, enabled: false, shape: 'none' } }),
  },
  {
    id: 'circle_pip',
    label: 'Circle PiP',
    hint: 'Classic round picture-in-picture',
    icon: 'ellipse-outline',
    apply: () => ({
      mask: maskWithShape('circle', { feather: 0.06, scale: 0.95 }),
      scale: 1.1,
    }),
  },
  {
    id: 'soft_cloud',
    label: 'Soft cloud',
    hint: 'Dreamy feathered circle blend',
    icon: 'cloud-outline',
    apply: () => ({
      mask: maskWithShape('circle', { feather: 0.42, scale: 1.05 }),
    }),
  },
  {
    id: 'dream_edge',
    label: 'Dream edge',
    hint: 'Radial glow into the plate',
    icon: 'sparkles-outline',
    apply: () => ({
      mask: maskWithShape('radial', { feather: 0.55, scale: 1.15 }),
    }),
  },
  {
    id: 'spotlight',
    label: 'Spotlight',
    hint: 'Tight radial focus',
    icon: 'sunny-outline',
    apply: () => ({
      mask: maskWithShape('radial', { feather: 0.28, scale: 0.7 }),
    }),
  },
  {
    id: 'split_lr',
    label: 'Split L/R',
    hint: 'Half-screen left/right layout',
    icon: 'tablet-landscape-outline',
    apply: () => ({
      mask: maskWithShape('splitLR', { feather: 0.03, scale: 1 }),
      x: 0.25,
      y: 0.5,
      scale: 1.85,
    }),
  },
  {
    id: 'split_tb',
    label: 'Split T/B',
    hint: 'Half-screen top/bottom layout',
    icon: 'tablet-portrait-outline',
    apply: () => ({
      mask: maskWithShape('splitTB', { feather: 0.03, scale: 1 }),
      x: 0.5,
      y: 0.25,
      scale: 1.85,
    }),
  },
  {
    id: 'split_diag',
    label: 'Diagonal',
    hint: 'Diagonal split wipe',
    icon: 'git-commit-outline',
    apply: () => ({
      mask: maskWithShape('splitDiag', { feather: 0.08, rotation: 1, rotation: 0 }),
    }),
  },
  {
    id: 'film_strip',
    label: 'Film strip',
    hint: 'Soft vertical letterbox reveal',
    icon: 'film-outline',
    apply: () => ({
      mask: maskWithShape('rectangle', {
        feather: 0.18,
        scale: 0.72,
        centerX: 0.5,
        centerY: 0.5,
      }),
    }),
  },
  {
    id: 'linear_wipe',
    label: 'Linear wipe',
    hint: 'Soft vertical gradient reveal',
    icon: 'swap-vertical-outline',
    apply: () => ({
      mask: maskWithShape('linear', { feather: 0.35, scale: 1 }),
    }),
  },
  {
    id: 'radial_glow',
    label: 'Radial glow',
    hint: 'Center-weighted soft mask',
    icon: 'radio-button-on-outline',
    apply: () => ({
      mask: maskWithShape('radial', { feather: 0.4, scale: 1 }),
    }),
  },
  {
    id: 'heart_cutout',
    label: 'Heart',
    hint: 'Romantic cutout',
    icon: 'heart-outline',
    apply: () => ({
      mask: maskWithShape('heart', { feather: 0.1, scale: 0.95 }),
    }),
  },
  {
    id: 'star_burst',
    label: 'Star',
    hint: 'Star-shaped reveal',
    icon: 'star-outline',
    apply: () => ({
      mask: maskWithShape('star', { feather: 0.08, scale: 0.9 }),
    }),
  },
];

export function buildMaskKeyframe(
  mask: OverlayMask,
  timeMs: number
): OverlayMaskKeyframe {
  return {
    timeMs,
    centerX: mask.centerX,
    centerY: mask.centerY,
    scale: mask.scale,
    rotation: mask.rotation,
  };
}
