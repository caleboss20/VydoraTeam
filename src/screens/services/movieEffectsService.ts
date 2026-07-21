/**
 * One-tap cinematic looks — flashback, dream, rewind, slow-mo reveal, etc.
 * Each preset bundles speed / reverse / effect / grade / opacity fades that
 * already bake on export (no new FFmpeg filters required).
 */
import type {
  ClipEffectId,
  ColorGrade,
  MovieEffectId,
  ScalarKeyframe,
  SpeedCurveId,
  VideoClip,
} from '../types';
import { DEFAULT_COLOR_GRADE } from '../types';

export type { MovieEffectId };

export type MovieEffectPreset = {
  id: MovieEffectId;
  label: string;
  hint: string;
  icon: string;
};

/** Fields stamped onto a clip when a movie look is applied. */
export type MovieEffectPatch = {
  movieEffectId: MovieEffectId;
  reversed: boolean;
  speed: number;
  speedCurve: SpeedCurveId;
  effectId: ClipEffectId;
  effectIntensity: number;
  filterId?: string;
  colorGrade: ColorGrade;
  opacity: number;
  opacityKeyframes?: ScalarKeyframe[];
  volume?: number;
  volumeKeyframes?: ScalarKeyframe[];
};

export const MOVIE_EFFECT_PRESETS: MovieEffectPreset[] = [
  { id: 'none', label: 'None', hint: 'Clear movie look', icon: 'ban-outline' },
  { id: 'beauty', label: 'Beauty', hint: 'Soft · warm · glow', icon: 'sparkles-outline' },
  { id: 'enhance', label: 'Enhance', hint: 'Punchy contrast', icon: 'sunny-outline' },
  { id: 'glow', label: 'Glow', hint: 'Dream halo', icon: 'moon-outline' },
  { id: 'flashback', label: 'Flashback', hint: 'Reverse · desat · blur', icon: 'hourglass-outline' },
  { id: 'dream', label: 'Dream', hint: 'Soft · warm · slow', icon: 'cloudy-night-outline' },
  { id: 'rewind', label: 'Rewind', hint: 'Playback reverse', icon: 'play-back-outline' },
  { id: 'slowMo', label: 'Slow-mo', hint: 'Hero reveal', icon: 'timer-outline' },
  { id: 'memory', label: 'Memory', hint: 'Faded recollection', icon: 'images-outline' },
  { id: 'impact', label: 'Impact', hint: 'Punch zoom', icon: 'flash-outline' },
  { id: 'vhs', label: 'VHS', hint: 'Retro shake', icon: 'videocam-outline' },
];

function fadeInOutOpacity(durationMs: number): ScalarKeyframe[] {
  const d = Math.max(800, durationMs);
  return [
    { timeMs: 0, value: 0 },
    { timeMs: Math.min(500, d * 0.15), value: 1 },
    { timeMs: Math.max(d - 500, d * 0.85), value: 1 },
    { timeMs: d, value: 0 },
  ];
}

function clipWindowMs(clip: VideoClip): number {
  const start = clip.trimStartMs ?? 0;
  const end = clip.trimEndMs ?? clip.durationMs;
  return Math.max(500, end - start);
}

export function buildMovieEffectPatch(
  id: MovieEffectId,
  clip: VideoClip
): MovieEffectPatch {
  const windowMs = clipWindowMs(clip);

  if (id === 'none') {
    return {
      movieEffectId: 'none',
      reversed: false,
      speed: 1,
      speedCurve: 'none',
      effectId: 'none',
      effectIntensity: 0.55,
      filterId: 'none',
      colorGrade: { ...DEFAULT_COLOR_GRADE },
      opacity: 1,
      opacityKeyframes: undefined,
      volume: clip.volume ?? 1,
      volumeKeyframes: undefined,
    };
  }

  switch (id) {
    case 'beauty':
      return {
        movieEffectId: id,
        reversed: false,
        speed: 1,
        speedCurve: 'none',
        effectId: 'blur',
        effectIntensity: 0.22,
        filterId: 'warm',
        colorGrade: {
          brightness: 0.14,
          contrast: -0.1,
          saturation: 0.06,
          temperature: 0.32,
        },
        opacity: 1,
        volume: 1,
      };
    case 'enhance':
      return {
        movieEffectId: id,
        reversed: false,
        speed: 1,
        speedCurve: 'none',
        effectId: 'none',
        effectIntensity: 0.55,
        filterId: 'kodak',
        colorGrade: {
          brightness: 0.1,
          contrast: 0.32,
          saturation: 0.25,
          temperature: 0.08,
        },
        opacity: 1,
        volume: 1,
      };
    case 'glow':
      return {
        movieEffectId: id,
        reversed: false,
        speed: 0.9,
        speedCurve: 'none',
        effectId: 'vignette',
        effectIntensity: 0.55,
        filterId: 'dream',
        colorGrade: {
          brightness: 0.16,
          contrast: -0.12,
          saturation: 0.12,
          temperature: 0.2,
        },
        opacity: 1,
        opacityKeyframes: [
          { timeMs: 0, value: 0.4 },
          { timeMs: Math.min(500, windowMs * 0.15), value: 1 },
          { timeMs: windowMs, value: 1 },
        ],
        volume: 0.9,
      };
    case 'flashback':
      return {
        movieEffectId: id,
        reversed: true,
        speed: 0.85,
        speedCurve: 'none',
        effectId: 'blur',
        effectIntensity: 0.45,
        filterId: 'bw',
        colorGrade: {
          brightness: 0.08,
          contrast: -0.15,
          saturation: -0.85,
          temperature: -0.35,
        },
        opacity: 1,
        opacityKeyframes: fadeInOutOpacity(windowMs),
        volume: 0.7,
      };
    case 'dream':
      return {
        movieEffectId: id,
        reversed: false,
        speed: 0.65,
        speedCurve: 'none',
        effectId: 'vignette',
        effectIntensity: 0.7,
        colorGrade: {
          brightness: 0.12,
          contrast: -0.2,
          saturation: -0.15,
          temperature: 0.45,
        },
        opacity: 1,
        opacityKeyframes: [
          { timeMs: 0, value: 0.2 },
          { timeMs: Math.min(700, windowMs * 0.2), value: 1 },
          { timeMs: windowMs, value: 1 },
        ],
        volume: 0.85,
      };
    case 'rewind':
      return {
        movieEffectId: id,
        reversed: true,
        speed: 1.75,
        speedCurve: 'none',
        effectId: 'shake',
        effectIntensity: 0.35,
        colorGrade: {
          brightness: 0.05,
          contrast: 0.1,
          saturation: -0.2,
          temperature: -0.1,
        },
        opacity: 1,
        volume: 0.9,
      };
    case 'slowMo':
      return {
        movieEffectId: id,
        reversed: false,
        speed: 1,
        speedCurve: 'hero',
        effectId: 'zoomPunch',
        effectIntensity: 0.55,
        colorGrade: {
          brightness: 0.05,
          contrast: 0.15,
          saturation: 0.1,
          temperature: 0.05,
        },
        opacity: 1,
        opacityKeyframes: [
          { timeMs: 0, value: 0 },
          { timeMs: Math.min(400, windowMs * 0.12), value: 1 },
          { timeMs: windowMs, value: 1 },
        ],
        volume: 1,
      };
    case 'memory':
      return {
        movieEffectId: id,
        reversed: false,
        speed: 0.75,
        speedCurve: 'none',
        effectId: 'blur',
        effectIntensity: 0.3,
        filterId: 'noir',
        colorGrade: {
          brightness: 0.1,
          contrast: -0.25,
          saturation: -0.7,
          temperature: -0.2,
        },
        opacity: 1,
        opacityKeyframes: fadeInOutOpacity(windowMs),
        volume: 0.65,
      };
    case 'impact':
      return {
        movieEffectId: id,
        reversed: false,
        speed: 1,
        speedCurve: 'bullet',
        effectId: 'zoomPunch',
        effectIntensity: 0.8,
        colorGrade: {
          brightness: 0.05,
          contrast: 0.35,
          saturation: 0.15,
          temperature: 0.1,
        },
        opacity: 1,
        volume: 1,
      };
    case 'vhs':
      return {
        movieEffectId: id,
        reversed: false,
        speed: 1,
        speedCurve: 'none',
        effectId: 'shake',
        effectIntensity: 0.65,
        colorGrade: {
          brightness: -0.05,
          contrast: 0.2,
          saturation: -0.25,
          temperature: 0.25,
        },
        opacity: 1,
        volume: 0.95,
      };
    default:
      return buildMovieEffectPatch('none', clip);
  }
}

export function getMovieEffectById(id?: MovieEffectId): MovieEffectPreset {
  return MOVIE_EFFECT_PRESETS.find((p) => p.id === id) ?? MOVIE_EFFECT_PRESETS[0];
}
