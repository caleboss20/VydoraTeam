/**
 * Clip motion effects — CapCut-style look beyond tint filters.
 * Preview approximates; export bakes with FFmpeg (gblur / vignette / shake / zoompan).
 */
import { ClipEffectId } from '../types';

export type EffectPreset = {
  id: ClipEffectId;
  label: string;
  hint: string;
  icon: string;
};

export const EFFECT_PRESETS: EffectPreset[] = [
  { id: 'none', label: 'None', hint: 'No effect', icon: 'remove-outline' },
  { id: 'blur', label: 'Blur', hint: 'Soft focus', icon: 'water-outline' },
  { id: 'vignette', label: 'Vignette', hint: 'Dark edges', icon: 'ellipse-outline' },
  { id: 'shake', label: 'Shake', hint: 'Handheld energy', icon: 'phone-portrait-outline' },
  { id: 'zoomPunch', label: 'Zoom punch', hint: 'Impact zoom', icon: 'scan-outline' },
];

export function getEffectById(id?: ClipEffectId): EffectPreset {
  return EFFECT_PRESETS.find((e) => e.id === id) ?? EFFECT_PRESETS[0];
}
