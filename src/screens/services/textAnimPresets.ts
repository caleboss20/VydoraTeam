/**
 * Alight Motion / CapCut text motion presets — In / Out / Loop grids.
 */
import { TextAnimationType, TextBlendMode } from '../types';

export type TextAnimPreset = {
  id: TextAnimationType;
  label: string;
  icon: string;
};

/** Entrance presets shown under In Animation. */
export const TEXT_ANIM_IN_PRESETS: TextAnimPreset[] = [
  { id: 'none', label: 'None', icon: 'remove-outline' },
  { id: 'fade', label: 'Fade', icon: 'sunny-outline' },
  { id: 'reveal', label: 'Reveal', icon: 'git-commit-outline' },
  { id: 'typewriter', label: 'Type', icon: 'text-outline' },
  { id: 'pop', label: 'Pop', icon: 'expand-outline' },
  { id: 'bounce', label: 'Bounce', icon: 'basketball-outline' },
  { id: 'bounceDrop', label: 'Drop', icon: 'arrow-down-outline' },
  { id: 'elastic', label: 'Elastic', icon: 'git-branch-outline' },
  { id: 'rubberBand', label: 'Rubber', icon: 'resize-outline' },
  { id: 'zoom', label: 'Zoom', icon: 'search-outline' },
  { id: 'slideUp', label: 'Slide ↑', icon: 'arrow-up-outline' },
  { id: 'slideDown', label: 'Slide ↓', icon: 'arrow-down-outline' },
  { id: 'slideLeft', label: 'Slide ←', icon: 'arrow-back-outline' },
  { id: 'slideRight', label: 'Slide →', icon: 'arrow-forward-outline' },
  { id: 'spin', label: 'Spin', icon: 'sync-outline' },
  { id: 'flip', label: 'Flip', icon: 'swap-vertical-outline' },
  { id: 'tada', label: 'Tada', icon: 'sparkles-outline' },
  { id: 'ghost', label: 'Ghost', icon: 'copy-outline' },
  { id: 'glitch', label: 'Glitch', icon: 'flash-outline' },
  { id: 'shake', label: 'Shake', icon: 'pulse-outline' },
];

/** Exit presets. */
export const TEXT_ANIM_OUT_PRESETS: TextAnimPreset[] = [
  { id: 'none', label: 'None', icon: 'remove-outline' },
  { id: 'fade', label: 'Fade', icon: 'sunny-outline' },
  { id: 'pop', label: 'Pop', icon: 'contract-outline' },
  { id: 'zoom', label: 'Zoom', icon: 'search-outline' },
  { id: 'slideUp', label: 'Slide ↑', icon: 'arrow-up-outline' },
  { id: 'slideDown', label: 'Slide ↓', icon: 'arrow-down-outline' },
  { id: 'slideLeft', label: 'Slide ←', icon: 'arrow-back-outline' },
  { id: 'bounce', label: 'Bounce', icon: 'basketball-outline' },
  { id: 'spin', label: 'Spin', icon: 'sync-outline' },
  { id: 'hinge', label: 'Hinge', icon: 'exit-outline' },
  { id: 'reveal', label: 'Reveal', icon: 'git-commit-outline' },
];

/** Loop while on screen — AM continuous motion. */
export const TEXT_ANIM_LOOP_PRESETS: TextAnimPreset[] = [
  { id: 'none', label: 'None', icon: 'remove-outline' },
  { id: 'bounce', label: 'Bounce', icon: 'basketball-outline' },
  { id: 'pulse', label: 'Pulse', icon: 'radio-button-on-outline' },
  { id: 'float', label: 'Float', icon: 'cloud-outline' },
  { id: 'wave', label: 'Wave', icon: 'water-outline' },
  { id: 'swing', label: 'Swing', icon: 'git-compare-outline' },
  { id: 'jiggle', label: 'Jiggle', icon: 'happy-outline' },
  { id: 'shake', label: 'Shake', icon: 'pulse-outline' },
  { id: 'flash', label: 'Flash', icon: 'flash-outline' },
  { id: 'sparkle', label: 'Sparkle', icon: 'sparkles-outline' },
  { id: 'ghost', label: 'Ghost', icon: 'copy-outline' },
  { id: 'glitch', label: 'Glitch', icon: 'flash-outline' },
];

/** @deprecated use TEXT_ANIM_IN_PRESETS */
export const TEXT_ANIM_PRESETS = TEXT_ANIM_IN_PRESETS;

export const TEXT_BLEND_MODES: { id: TextBlendMode; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'screen', label: 'Screen' },
  { id: 'multiply', label: 'Multiply' },
  { id: 'add', label: 'Add' },
  { id: 'overlay', label: 'Overlay' },
];
