/**
 * Clip motion effects — CapCut-style look beyond tint filters.
 * Preview approximates; export bakes with FFmpeg.
 */
import { ClipEffectId } from '../types';

export type EffectPreset = {
  id: ClipEffectId;
  label: string;
  hint: string;
  icon: string;
  category: 'basic' | 'motion' | 'impact' | 'atmosphere';
};

export const EFFECT_PRESETS: EffectPreset[] = [
  { id: 'none', label: 'None', hint: 'No effect', icon: 'remove-outline', category: 'basic' },
  { id: 'blur', label: 'Blur', hint: 'Soft focus', icon: 'water-outline', category: 'basic' },
  { id: 'vignette', label: 'Vignette', hint: 'Dark edges', icon: 'ellipse-outline', category: 'basic' },
  { id: 'filmGrain', label: 'Film grain', hint: 'Old-film texture', icon: 'film-outline', category: 'atmosphere' },
  { id: 'lightning', label: 'Lightning', hint: 'Thunder flashes', icon: 'flash-outline', category: 'atmosphere' },
  { id: 'dust', label: 'Dust', hint: 'Floating specks', icon: 'cloudy-outline', category: 'atmosphere' },
  { id: 'shake', label: 'Shake', hint: 'Handheld energy', icon: 'phone-portrait-outline', category: 'impact' },
  { id: 'zoomPunch', label: 'Zoom punch', hint: 'Impact zoom', icon: 'scan-outline', category: 'impact' },
  { id: 'zoomIn', label: 'Zoom in', hint: 'Slow push-in', icon: 'add-circle-outline', category: 'motion' },
  { id: 'zoomOut', label: 'Zoom out', hint: 'Slow pull-back', icon: 'remove-circle-outline', category: 'motion' },
  { id: 'panLeft', label: 'Pan ←', hint: 'Drift left', icon: 'arrow-back-outline', category: 'motion' },
  { id: 'panRight', label: 'Pan →', hint: 'Drift right', icon: 'arrow-forward-outline', category: 'motion' },
  { id: 'bounce', label: 'Bounce', hint: 'Vertical hop', icon: 'basketball-outline', category: 'impact' },
  { id: 'spin', label: 'Spin', hint: 'Rotate punch', icon: 'sync-outline', category: 'impact' },
];

export function getEffectById(id?: ClipEffectId): EffectPreset {
  return EFFECT_PRESETS.find((e) => e.id === id) ?? EFFECT_PRESETS[0];
}

export function effectsByCategory(cat: EffectPreset['category'] | 'all') {
  if (cat === 'all') return EFFECT_PRESETS;
  return EFFECT_PRESETS.filter((e) => e.category === cat || e.id === 'none');
}
