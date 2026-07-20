/**
 * Alight Motion / CapCut–style text motion — in, out, and loop phases.
 */
import { TextAnimationType, TextBlendMode, TextOverlay } from '../types';

const DEFAULT_IN_MS = 500;
const DEFAULT_OUT_MS = 420;

function clamp01(t: number) {
  return Math.min(1, Math.max(0, t));
}

/** Ease-out back — overshoot for bounce / pop. */
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
}

function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

export type AnimatedTextProps = {
  opacity: number;
  transform: Array<{
    translateY?: number;
    translateX?: number;
    scale?: number;
    rotate?: string;
  }>;
  displayText: string;
  /** Ghost trail layer (AM echo look). */
  ghost?: { opacity: number; translateX: number; translateY: number };
  /** RN mixBlendMode-ish hint for preview. */
  blendMode?: TextBlendMode;
};

export function getOverlayElapsedMs(overlay: TextOverlay, localTimeMs: number): number {
  return Math.max(0, localTimeMs - overlay.startMs);
}

export function getAnimatedTextProps(
  overlay: TextOverlay,
  elapsedMs: number
): AnimatedTextProps {
  const durationMs = overlay.durationMs;
  const animIn = overlay.animationIn ?? 'fade';
  const animOut = overlay.animationOut ?? 'none';
  const animLoop = overlay.animationLoop ?? 'none';
  const inMs = Math.max(200, overlay.animationDurationMs ?? DEFAULT_IN_MS);
  const outMs = Math.max(200, Math.min(inMs, DEFAULT_OUT_MS));
  const baseOpacity = overlay.textOpacity ?? 1;

  let opacity = 1;
  let translateY = 0;
  let translateX = 0;
  let scale = 1;
  let rotate = '0deg';
  let displayText = overlay.text;
  let ghost: AnimatedTextProps['ghost'];

  const applyMotion = (type: TextAnimationType, tRaw: number, phase: 'in' | 'out' | 'loop') => {
    const t = clamp01(tRaw);
    const inv = phase === 'out' ? 1 - t : t;

    switch (type) {
      case 'fade':
        opacity = phase === 'out' ? 1 - t : t;
        break;
      case 'slideUp':
        opacity = phase === 'out' ? 1 - t : Math.min(1, t * 1.1);
        translateY = phase === 'out' ? -t * 36 : (1 - t) * 44;
        break;
      case 'slideDown':
        opacity = phase === 'out' ? 1 - t : Math.min(1, t * 1.1);
        translateY = phase === 'out' ? t * 36 : (t - 1) * 44;
        break;
      case 'slideLeft':
        opacity = Math.min(1, inv * 1.15);
        translateX = phase === 'out' ? -t * 40 : (1 - t) * 48;
        break;
      case 'slideRight':
        opacity = Math.min(1, inv * 1.15);
        translateX = phase === 'out' ? t * 40 : (t - 1) * 48;
        break;
      case 'zoom':
        opacity = inv;
        scale = phase === 'out' ? 1 - t * 0.45 : 0.35 + t * 0.65;
        break;
      case 'pop': {
        opacity = Math.min(1, t * 1.2);
        const e = easeOutBack(t);
        scale = phase === 'out' ? 1 + t * 0.25 : 0.45 + e * 0.55;
        break;
      }
      case 'bounce': {
        opacity = Math.min(1, t * 1.25);
        const b = easeOutBounce(t);
        scale = phase === 'out' ? 1 - t * 0.3 : 0.4 + b * 0.6;
        translateY = phase === 'out' ? t * 20 : (1 - b) * 28;
        break;
      }
      case 'bounceDrop': {
        opacity = Math.min(1, t * 1.3);
        const b = easeOutBounce(t);
        translateY = phase === 'out' ? t * 50 : (1 - b) * 70;
        scale = 0.85 + b * 0.15;
        break;
      }
      case 'elastic': {
        opacity = Math.min(1, t * 1.2);
        const e = easeOutElastic(t);
        scale = phase === 'out' ? 1 - t * 0.35 : 0.3 + e * 0.7;
        break;
      }
      case 'spin':
        opacity = inv;
        rotate = `${(1 - inv) * (phase === 'out' ? -120 : 180)}deg`;
        scale = 0.65 + inv * 0.35;
        break;
      case 'flip':
        opacity = inv;
        rotate = `${(1 - inv) * 90}deg`;
        break;
      case 'shake':
        opacity = Math.min(1, inv * 1.2);
        translateX = Math.sin(t * Math.PI * 10) * 8 * (phase === 'loop' ? 1 : 1 - t * 0.5);
        break;
      case 'jiggle':
        opacity = 1;
        rotate = `${Math.sin(t * Math.PI * 6) * 8}deg`;
        scale = 1 + Math.sin(t * Math.PI * 4) * 0.04;
        break;
      case 'pulse':
        opacity = 1;
        scale = 0.92 + Math.sin(t * Math.PI * 2) * 0.08;
        break;
      case 'float':
        opacity = 1;
        translateY = Math.sin(t * Math.PI * 2) * 10;
        break;
      case 'swing':
        opacity = Math.min(1, inv * 1.1);
        rotate = `${Math.sin(t * Math.PI * 3) * 14}deg`;
        break;
      case 'rubberBand': {
        opacity = Math.min(1, t * 1.2);
        const e = easeOutElastic(t);
        scale = 0.5 + e * 0.5;
        translateX = Math.sin(t * Math.PI * 2) * 6 * (1 - t);
        break;
      }
      case 'tada':
        opacity = Math.min(1, t * 1.2);
        scale = 0.9 + Math.sin(t * Math.PI * 3) * 0.12;
        rotate = `${Math.sin(t * Math.PI * 4) * 6}deg`;
        break;
      case 'flash':
        opacity = phase === 'loop'
          ? 0.35 + Math.abs(Math.sin(t * Math.PI * 4)) * 0.65
          : t < 0.5
            ? t * 2
            : 1;
        break;
      case 'wave':
        opacity = Math.min(1, inv * 1.1);
        translateY = Math.sin(t * Math.PI * 4) * 12 * (phase === 'loop' ? 1 : 1 - t * 0.3);
        break;
      case 'glitch':
        opacity = Math.min(1, inv * 1.2);
        translateX = Math.sin(t * 40) * 5 * (Math.sin(t * 17) > 0 ? 1 : -1);
        translateY = Math.sin(t * 55) * 2.5;
        break;
      case 'sparkle':
        opacity = 0.5 + Math.abs(Math.sin(t * Math.PI * 5)) * 0.5;
        scale = 0.95 + Math.sin(t * Math.PI * 3) * 0.08;
        break;
      case 'hinge':
        opacity = phase === 'out' ? 1 - t : t;
        rotate = `${(phase === 'out' ? t : 1 - t) * 65}deg`;
        translateY = (phase === 'out' ? t : 1 - t) * 30;
        break;
      case 'typewriter':
        opacity = 1;
        if (phase === 'in') {
          displayText = overlay.text.slice(
            0,
            Math.max(1, Math.ceil(overlay.text.length * t))
          );
        }
        break;
      case 'reveal':
        opacity = Math.min(1, t * 1.15);
        scale = 0.92 + t * 0.08;
        translateX = phase === 'out' ? t * 24 : (1 - t) * -28;
        break;
      case 'ghost': {
        opacity = Math.min(1, t * 1.1);
        scale = 0.96 + t * 0.04;
        const trail = phase === 'loop' ? 0.35 : (1 - t) * 0.55;
        ghost = {
          opacity: trail * baseOpacity,
          translateX: phase === 'loop' ? Math.sin(t * Math.PI * 2) * 10 : (1 - t) * 22,
          translateY: phase === 'loop' ? Math.cos(t * Math.PI * 2) * 4 : 0,
        };
        break;
      }
      case 'none':
      default:
        opacity = 1;
        break;
    }
  };

  // ── Phases ──
  if (elapsedMs < inMs && animIn !== 'none') {
    applyMotion(animIn, elapsedMs / inMs, 'in');
  } else if (animOut !== 'none' && elapsedMs > durationMs - outMs) {
    applyMotion(animOut, (elapsedMs - (durationMs - outMs)) / outMs, 'out');
  } else if (animLoop && animLoop !== 'none') {
    const loopMs = Math.max(600, inMs * 1.4);
    const mid = elapsedMs - inMs;
    const cycle = (mid % loopMs) / loopMs;
    applyMotion(animLoop, cycle, 'loop');
  }

  opacity *= baseOpacity;

  return {
    opacity,
    transform: [{ translateY }, { translateX }, { scale }, { rotate }],
    displayText,
    ghost,
    blendMode: overlay.blendMode ?? 'normal',
  };
}
