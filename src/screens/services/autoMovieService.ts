/**
 * Quik-style one-tap Auto Movie — pick highlight windows across a source
 * and stamp cinematic transitions + a movie look.
 */
import type { ClipTransitionType, MovieEffectId } from '../types';

export type AutoMovieStyleId = 'quik' | 'cinematic' | 'energetic';

export type AutoMovieRange = {
  startMs: number;
  endMs: number;
  label: string;
};

export type AutoMoviePlan = {
  styleId: AutoMovieStyleId;
  ranges: AutoMovieRange[];
  movieEffectId: MovieEffectId;
  transitionType: ClipTransitionType;
  transitionMs: number;
};

export type AutoMovieStyle = {
  id: AutoMovieStyleId;
  label: string;
  hint: string;
  icon: string;
};

export const AUTO_MOVIE_STYLES: AutoMovieStyle[] = [
  {
    id: 'quik',
    label: 'Auto Movie',
    hint: 'One-tap highlight reel',
    icon: 'film-outline',
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    hint: 'Soft fades · dream look',
    icon: 'moon-outline',
  },
  {
    id: 'energetic',
    label: 'Energetic',
    hint: 'Punch cuts · impact',
    icon: 'flash-outline',
  },
];

const LABELS = ['Hook', 'Beat', 'Peak', 'Turn', 'Finale'];

/**
 * Build evenly spaced highlight windows that total ~18–42s (Quik-like).
 */
export function buildAutoMoviePlan(
  durationMs: number,
  styleId: AutoMovieStyleId = 'quik'
): AutoMoviePlan {
  const D = Math.max(1200, Math.round(durationMs));
  const n =
    D < 16_000 ? 2 : D < 28_000 ? 3 : D < 55_000 ? 4 : D < 120_000 ? 5 : 6;
  const targetTotal = Math.min(Math.max(16_000, Math.round(D * 0.38)), 42_000);
  const pieceLen = Math.max(1800, Math.round(targetTotal / n));

  const ranges: AutoMovieRange[] = [];
  for (let i = 0; i < n; i++) {
    const center = ((i + 0.5) / n) * D;
    let start = Math.round(center - pieceLen / 2);
    let end = start + pieceLen;
    if (start < 0) {
      end -= start;
      start = 0;
    }
    if (end > D) {
      start -= end - D;
      end = D;
    }
    start = Math.max(0, start);
    end = Math.min(D, Math.max(start + 800, end));
    // Slight bias: first clip opens earlier (hook), last leans to climax.
    if (i === 0 && start > 400) {
      const shift = Math.min(800, start);
      start -= shift;
      end -= shift;
    }
    if (i === n - 1 && end < D - 400) {
      const shift = Math.min(900, D - end);
      start += shift;
      end += shift;
    }
    const label =
      i === 0
        ? 'Hook'
        : i === n - 1
          ? 'Finale'
          : LABELS[Math.min(i, LABELS.length - 1)] ?? `Beat ${i + 1}`;
    ranges.push({ startMs: start, endMs: end, label });
  }

  if (styleId === 'cinematic') {
    return {
      styleId,
      ranges,
      movieEffectId: 'dream',
      transitionType: 'crossfade',
      transitionMs: 550,
    };
  }
  if (styleId === 'energetic') {
    return {
      styleId,
      ranges,
      movieEffectId: 'impact',
      transitionType: 'whip',
      transitionMs: 280,
    };
  }
  return {
    styleId: 'quik',
    ranges,
    movieEffectId: 'memory',
    transitionType: 'dissolve',
    transitionMs: 400,
  };
}
