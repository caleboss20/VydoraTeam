import { TextAnimationType, TextOverlay } from '../types';

const ANIM_IN_MS = 450;
const ANIM_OUT_MS = 400;

export function getOverlayElapsedMs(overlay: TextOverlay, localTimeMs: number): number {
  return Math.max(0, localTimeMs - overlay.startMs);
}

export function getAnimatedTextProps(
  overlay: TextOverlay,
  elapsedMs: number
): {
  opacity: number;
  transform: Array<{ translateY?: number; translateX?: number; scale?: number; rotate?: string }>;
  displayText: string;
} {
  const durationMs = overlay.durationMs;
  const animIn = overlay.animationIn ?? 'fade';
  const animOut = overlay.animationOut ?? 'none';

  let opacity = 1;
  let translateY = 0;
  let translateX = 0;
  let scale = 1;
  let rotate = '0deg';
  let displayText = overlay.text;

  const applyIn = (type: TextAnimationType, p: number) => {
    const t = Math.min(1, Math.max(0, p));
    switch (type) {
      case 'fade':
        opacity = t;
        break;
      case 'slideUp':
        opacity = t;
        translateY = (1 - t) * 40;
        break;
      case 'slideDown':
        opacity = t;
        translateY = (t - 1) * 40;
        break;
      case 'zoom':
        opacity = t;
        scale = 0.4 + t * 0.6;
        break;
      case 'pop':
        opacity = t;
        scale = 0.6 + t * 0.4;
        break;
      case 'bounce':
        opacity = Math.min(1, t * 1.2);
        scale = 0.5 + Math.sin(t * Math.PI) * 0.25 + t * 0.5;
        break;
      case 'spin':
        opacity = t;
        rotate = `${(1 - t) * 180}deg`;
        scale = 0.7 + t * 0.3;
        break;
      case 'flip':
        opacity = t;
        rotate = `${(1 - t) * 90}deg`;
        break;
      case 'shake':
        opacity = t;
        translateX = Math.sin(t * Math.PI * 8) * 6 * (1 - t);
        break;
      case 'pulse':
        opacity = t;
        scale = 0.85 + Math.sin(t * Math.PI * 2) * 0.1;
        break;
      case 'typewriter':
        opacity = 1;
        displayText = overlay.text.slice(0, Math.max(1, Math.ceil(overlay.text.length * t)));
        break;
      case 'none':
      default:
        opacity = 1;
        break;
    }
  };

  const applyOut = (type: TextAnimationType, p: number) => {
    const t = Math.min(1, Math.max(0, p));
    switch (type) {
      case 'fade':
        opacity = 1 - t;
        break;
      case 'slideUp':
        opacity = 1 - t;
        translateY = -t * 30;
        break;
      case 'slideDown':
        opacity = 1 - t;
        translateY = t * 30;
        break;
      case 'zoom':
        opacity = 1 - t;
        scale = 1 - t * 0.4;
        break;
      case 'pop':
        opacity = 1 - t;
        scale = 1 + t * 0.2;
        break;
      default:
        opacity = 1 - t;
        break;
    }
  };

  if (elapsedMs < ANIM_IN_MS && animIn !== 'none') {
    applyIn(animIn, elapsedMs / ANIM_IN_MS);
  } else if (
    animOut !== 'none' &&
    elapsedMs > durationMs - ANIM_OUT_MS
  ) {
    applyOut(animOut, (elapsedMs - (durationMs - ANIM_OUT_MS)) / ANIM_OUT_MS);
  }

  return {
    opacity,
    transform: [{ translateY }, { translateX }, { scale }, { rotate }],
    displayText,
  };
}
