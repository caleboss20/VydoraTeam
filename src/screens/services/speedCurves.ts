import { SpeedCurveId } from '../types';

/**
 * Speed curves — CapCut-style variable-speed presets.
 *
 * Each preset splits the (trimmed) clip into segments, given as fractions of
 * the clip that play at different speed multipliers. The preview can't play
 * variable speed with expo-video, so it uses `averageSpeed` (correct overall
 * duration, constant rate); the export bakes the true per-segment speeds by
 * splitting the clip in FFmpeg and re-concatenating.
 */

export type CurveSegment = {
  /** Portion of the trimmed clip this segment covers (fractions sum to 1). */
  fraction: number;
  /** Playback speed inside the segment (1 = normal). */
  speed: number;
};

export type SpeedCurvePreset = {
  id: SpeedCurveId;
  label: string;
  /** Short description shown under the preset name. */
  hint: string;
  /** Ionicons glyph for the preset chip. */
  icon: string;
  segments: CurveSegment[];
};

export const SPEED_CURVE_PRESETS: SpeedCurvePreset[] = [
  {
    id: 'none',
    label: 'Normal',
    hint: 'Constant speed',
    icon: 'remove-outline',
    segments: [{ fraction: 1, speed: 1 }],
  },
  {
    // Ease in, rush the middle, ease out — the classic music-montage feel.
    id: 'montage',
    label: 'Montage',
    hint: 'Slow · fast · slow',
    icon: 'pulse-outline',
    segments: [
      { fraction: 0.25, speed: 0.6 },
      { fraction: 0.5, speed: 1.8 },
      { fraction: 0.25, speed: 0.6 },
    ],
  },
  {
    // Rush in, hang on the key moment, rush out — highlights one beat.
    id: 'hero',
    label: 'Hero',
    hint: 'Fast · slow · fast',
    icon: 'flash-outline',
    segments: [
      { fraction: 0.3, speed: 1.8 },
      { fraction: 0.4, speed: 0.5 },
      { fraction: 0.3, speed: 1.8 },
    ],
  },
  {
    // Near-freeze in the middle — "bullet time".
    id: 'bullet',
    label: 'Bullet',
    hint: 'Freeze the middle',
    icon: 'aperture-outline',
    segments: [
      { fraction: 0.35, speed: 1.3 },
      { fraction: 0.3, speed: 0.3 },
      { fraction: 0.35, speed: 1.3 },
    ],
  },
  {
    // Rhythmic fast/normal alternation — punchy jump-cut energy.
    id: 'jumpcut',
    label: 'Jump cut',
    hint: 'Punchy rhythm',
    icon: 'analytics-outline',
    segments: [
      { fraction: 0.2, speed: 2 },
      { fraction: 0.2, speed: 0.8 },
      { fraction: 0.2, speed: 2 },
      { fraction: 0.2, speed: 0.8 },
      { fraction: 0.2, speed: 2 },
    ],
  },
];

export function getSpeedCurveById(id?: SpeedCurveId): SpeedCurvePreset {
  return SPEED_CURVE_PRESETS.find((p) => p.id === id) ?? SPEED_CURVE_PRESETS[0];
}

/**
 * The constant speed that produces the same total duration as the curve:
 * output time = Σ(fractionᵢ / speedᵢ) of input time, so avg = 1 / that sum.
 * Used for preview playback and timeline-duration math.
 */
export function curveAverageSpeed(id?: SpeedCurveId): number {
  const preset = getSpeedCurveById(id);
  const outPerIn = preset.segments.reduce((acc, s) => acc + s.fraction / s.speed, 0);
  return outPerIn > 0 ? 1 / outPerIn : 1;
}
