/**
 * One-tap atmosphere FX for manifesto / cinematic stills.
 * Applied as clip effectIds (export-baked via FFmpeg).
 */
import type { ClipEffectId } from '../types';

export type StockFxPreset = {
  id: string;
  label: string;
  hint: string;
  icon: string;
  effectId: ClipEffectId;
  intensity: number;
};

export const STOCK_FX_PRESETS: StockFxPreset[] = [
  {
    id: 'lightning',
    label: 'Lightning',
    hint: 'Thunder flashes',
    icon: 'flash-outline',
    effectId: 'lightning',
    intensity: 0.7,
  },
  {
    id: 'filmGrain',
    label: 'Film grain',
    hint: 'Old-film texture',
    icon: 'film-outline',
    effectId: 'filmGrain',
    intensity: 0.55,
  },
  {
    id: 'dust',
    label: 'Dust',
    hint: 'Floating specks',
    icon: 'cloudy-outline',
    effectId: 'dust',
    intensity: 0.45,
  },
];
