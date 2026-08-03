/**
 * One-tap audio cleanup presets for Mixer / Audio tools.
 */
import type { ClipAudioFx } from '../types';
import { DEFAULT_AUDIO_FX } from '../types';

export type AudioFxPresetId = 'clean' | 'broadcast' | 'podcast' | 'reset';

export type AudioFxPreset = {
  id: AudioFxPresetId;
  label: string;
  hint: string;
  fx: ClipAudioFx;
};

export const AUDIO_FX_PRESETS: AudioFxPreset[] = [
  {
    id: 'clean',
    label: 'Clean voice',
    hint: 'Strong denoise + speech',
    fx: {
      ...DEFAULT_AUDIO_FX,
      noiseReduction: 0.72,
      enhanceSpeech: true,
      enhanceStrength: 0.8,
      eqSub: -0.25,
      eqLow: -0.1,
      eqMid: 0.08,
      eqPresence: 0.35,
      eqHigh: 0.15,
      eqAir: 0.1,
      compressor: true,
      compThreshold: -20,
      compRatio: 3.5,
      deEsser: 0.35,
      gate: 0.25,
    },
  },
  {
    id: 'broadcast',
    label: 'Broadcast',
    hint: 'Radio / YouTube voice',
    fx: {
      ...DEFAULT_AUDIO_FX,
      noiseReduction: 0.55,
      enhanceSpeech: true,
      enhanceStrength: 0.9,
      eqSub: -0.35,
      eqLow: 0.05,
      eqMid: 0.12,
      eqPresence: 0.45,
      eqHigh: 0.2,
      eqAir: 0.18,
      compressor: true,
      compThreshold: -18,
      compRatio: 4,
      deEsser: 0.45,
      gate: 0.2,
    },
  },
  {
    id: 'podcast',
    label: 'Podcast',
    hint: 'Warm dialogue EQ',
    fx: {
      ...DEFAULT_AUDIO_FX,
      noiseReduction: 0.48,
      enhanceSpeech: true,
      enhanceStrength: 0.65,
      eqSub: -0.15,
      eqLow: 0.2,
      eqMid: 0.05,
      eqPresence: 0.25,
      eqHigh: 0.05,
      eqAir: -0.05,
      compressor: true,
      compThreshold: -22,
      compRatio: 2.8,
      deEsser: 0.3,
      gate: 0.15,
    },
  },
  {
    id: 'reset',
    label: 'Reset',
    hint: 'Flat / off',
    fx: { ...DEFAULT_AUDIO_FX },
  },
];
