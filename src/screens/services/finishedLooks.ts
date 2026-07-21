/**
 * 10 locked Finished Looks — each pack is export-ready:
 * look + hook text + music + 9:16. QA’d for phone selfies / talking-head reels.
 */
import type { EditTemplate } from './editTemplateService';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type FinishedLookCard = {
  id: string;
  name: string;
  tagline: string;
  category: 'Looks';
  tier: 'free';
  accent: string;
  accent2: string;
  icon: IconName;
  previewVideoUrl?: string;
  recipe: EditTemplate;
};

function recipe(
  partial: Omit<EditTemplate, 'id' | 'createdAt'> & { id?: string }
): EditTemplate {
  return {
    id: partial.id ?? `look-${partial.name}`,
    name: partial.name,
    createdAt: '2026-07-21T00:00:00.000Z',
    look: partial.look,
    textStyle: partial.textStyle,
    hookText: partial.hookText,
    transitionOut: partial.transitionOut,
    coachHint: partial.coachHint,
    music: partial.music,
    cropRatioId: partial.cropRatioId ?? 'tiktok',
    photoSlot: partial.photoSlot,
  };
}

function look(
  partial: Omit<FinishedLookCard, 'category' | 'tier' | 'recipe'> & {
    recipe: EditTemplate;
  }
): FinishedLookCard {
  return {
    ...partial,
    category: 'Looks',
    tier: 'free',
    recipe: partial.recipe,
  };
}

/**
 * Locked premium packs — do not dilute; swap music via weekly drop ids only.
 */
export const FINISHED_LOOKS: FinishedLookCard[] = [
  look({
    id: 'look-beauty-glow',
    name: 'Beauty Glow',
    tagline: 'Soft skin · warm · Reels-ready',
    accent: '#F9A8D4',
    accent2: '#DB2777',
    icon: 'sparkles' as IconName,
    recipe: recipe({
      id: 'look-beauty-glow',
      name: 'Beauty Glow',
      look: {
        filterId: 'warm',
        effectId: 'vignette',
        effectIntensity: 0.32,
        movieEffectId: 'beauty',
        colorGrade: {
          brightness: 0.12,
          contrast: -0.08,
          saturation: 0.1,
          temperature: 0.3,
        },
      },
      textStyle: {
        color: '#FFF7ED',
        fontSize: 26,
        fontWeight: 'bold',
        backgroundOpacity: 0,
        animationIn: 'fade',
        y: 0.8,
      },
      hookText: 'soft glow ✨',
      transitionOut: { type: 'crossfade', durationMs: 400 },
      music: { libraryId: 'mix-dreaming-off', volume: 0.4 },
      coachHint: 'Beauty pack on · 9:16 · music. Export when you like the face light.',
    }),
  }),
  look({
    id: 'look-hook-punch',
    name: 'Hook Punch',
    tagline: 'Bold opener · stop the scroll',
    accent: '#F5C518',
    accent2: '#F97316',
    icon: 'flash' as IconName,
    recipe: recipe({
      id: 'look-hook-punch',
      name: 'Hook Punch',
      look: {
        filterId: 'cinematic',
        effectId: 'zoomPunch',
        effectIntensity: 0.72,
        movieEffectId: 'impact',
        colorGrade: {
          brightness: 0.06,
          contrast: 0.3,
          saturation: 0.18,
          temperature: 0.08,
        },
      },
      textStyle: {
        color: '#FFFFFF',
        fontSize: 40,
        fontWeight: 'bold',
        backgroundColor: '#000000',
        backgroundOpacity: 0.55,
        animationIn: 'pop',
        y: 0.42,
      },
      hookText: 'WAIT FOR IT…',
      transitionOut: { type: 'whip', durationMs: 320 },
      music: { libraryId: 'mix-tech-house', volume: 0.55 },
      coachHint: 'Hook text + punch zoom + beat. Trim the first 2s tight, then export.',
    }),
  }),
  look({
    id: 'look-manifesto',
    name: 'Photo Manifesto',
    tagline: 'Still · vintage · bottom line · VO',
    accent: '#C9A227',
    accent2: '#6B4E2E',
    icon: 'document-text' as IconName,
    recipe: recipe({
      id: 'look-manifesto',
      name: 'Photo Manifesto',
      look: {
        filterId: 'vintage',
        effectId: 'vignette',
        effectIntensity: 0.55,
        movieEffectId: 'memory',
        colorGrade: {
          brightness: -0.04,
          contrast: 0.22,
          saturation: -0.22,
          temperature: 0.32,
        },
      },
      textStyle: {
        color: '#FEF3C7',
        fontSize: 26,
        fontWeight: 'bold',
        backgroundColor: '#000000',
        backgroundOpacity: 0.62,
        animationIn: 'slideUp',
        y: 0.82,
      },
      hookText: 'Your line appears here…',
      transitionOut: { type: 'fadeblack', durationMs: 650 },
      music: { libraryId: 'mix-deep-urban', volume: 0.38 },
      photoSlot: {
        placeholderUri:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&q=80',
        durationMs: 6000,
        where: 'before',
      },
      coachHint: 'Pick your photo → edit the line → Voiceover sync optional → export.',
    }),
  }),
  look({
    id: 'look-night-hustle',
    name: 'Night Hustle',
    tagline: 'Cool city · grind energy',
    accent: '#818CF8',
    accent2: '#312E81',
    icon: 'moon' as IconName,
    recipe: recipe({
      id: 'look-night-hustle',
      name: 'Night Hustle',
      look: {
        filterId: 'cool',
        effectId: 'filmGrain',
        effectIntensity: 0.45,
        colorGrade: {
          brightness: -0.06,
          contrast: 0.28,
          saturation: -0.1,
          temperature: -0.25,
        },
      },
      textStyle: {
        color: '#E0E7FF',
        fontSize: 28,
        fontWeight: 'bold',
        backgroundColor: '#0F172A',
        backgroundOpacity: 0.7,
        animationIn: 'slideUp',
        y: 0.78,
      },
      hookText: 'built different.',
      transitionOut: { type: 'smoothleft', durationMs: 400 },
      music: { libraryId: 'mix-hazy-after-hours', volume: 0.48 },
      coachHint: 'Night grade + grain + chill bed. Keep cuts under 3s.',
    }),
  }),
  look({
    id: 'look-soft-sell',
    name: 'Soft Sell',
    tagline: 'Product · warm · shoppable',
    accent: '#F472B6',
    accent2: '#BE185D',
    icon: 'bag-handle' as IconName,
    recipe: recipe({
      id: 'look-soft-sell',
      name: 'Soft Sell',
      look: {
        filterId: 'warm',
        effectId: 'vignette',
        effectIntensity: 0.4,
        colorGrade: {
          brightness: 0.1,
          contrast: 0.14,
          saturation: 0.16,
          temperature: 0.22,
        },
      },
      textStyle: {
        color: '#FFFFFF',
        fontSize: 30,
        fontWeight: 'bold',
        backgroundColor: '#DB2777',
        backgroundOpacity: 0.85,
        animationIn: 'pop',
        y: 0.75,
      },
      hookText: 'Shop the look →',
      transitionOut: { type: 'crossfade', durationMs: 450 },
      music: { libraryId: 'mix-cat-walk', volume: 0.45 },
      coachHint: 'Warm product frame + CTA. Hold on the item 2s before text.',
    }),
  }),
  look({
    id: 'look-clean-caption',
    name: 'Clean Caption',
    tagline: 'Talking head · minimal lower-third',
    accent: '#60A5FA',
    accent2: '#1D4ED8',
    icon: 'chatbubble-ellipses' as IconName,
    recipe: recipe({
      id: 'look-clean-caption',
      name: 'Clean Caption',
      look: {
        filterId: 'none',
        effectId: 'none',
        movieEffectId: 'enhance',
        colorGrade: {
          brightness: 0.08,
          contrast: 0.12,
          saturation: 0.05,
          temperature: 0.02,
        },
      },
      textStyle: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: 'bold',
        backgroundColor: '#0B0D13',
        backgroundOpacity: 0.78,
        animationIn: 'fade',
        y: 0.84,
      },
      hookText: 'Your name · what you do',
      transitionOut: { type: 'crossfade', durationMs: 350 },
      music: { libraryId: 'mix-smooth-tension', volume: 0.28 },
      coachHint: 'Enhance only — Captions → karaoke for speech. Keep music low.',
    }),
  }),
  look({
    id: 'look-thunder',
    name: 'Thunder Drama',
    tagline: 'Lightning · grain · manifesto energy',
    accent: '#94A3B8',
    accent2: '#0F172A',
    icon: 'thunderstorm' as IconName,
    recipe: recipe({
      id: 'look-thunder',
      name: 'Thunder Drama',
      look: {
        filterId: 'noir',
        effectId: 'lightning',
        effectIntensity: 0.7,
        colorGrade: {
          brightness: -0.08,
          contrast: 0.35,
          saturation: -0.4,
          temperature: -0.15,
        },
      },
      textStyle: {
        color: '#F8FAFC',
        fontSize: 32,
        fontWeight: 'bold',
        backgroundColor: '#000000',
        backgroundOpacity: 0.55,
        animationIn: 'pop',
        y: 0.5,
      },
      hookText: 'WAKE UP.',
      transitionOut: { type: 'fadewhite', durationMs: 280 },
      music: { libraryId: 'lib-slow-burn', volume: 0.5 },
      coachHint: 'Lightning flashes on preview + export. Pair with VO karaoke.',
    }),
  }),
  look({
    id: 'look-summer-pop',
    name: 'Summer Pop',
    tagline: 'Bright · fun · outdoor Reels',
    accent: '#FBBF24',
    accent2: '#EA580C',
    icon: 'sunny' as IconName,
    recipe: recipe({
      id: 'look-summer-pop',
      name: 'Summer Pop',
      look: {
        filterId: 'kodak',
        effectId: 'none',
        movieEffectId: 'enhance',
        colorGrade: {
          brightness: 0.1,
          contrast: 0.2,
          saturation: 0.28,
          temperature: 0.2,
        },
      },
      textStyle: {
        color: '#0B0D13',
        fontSize: 34,
        fontWeight: 'bold',
        backgroundColor: '#F5C518',
        backgroundOpacity: 0.95,
        animationIn: 'pop',
        y: 0.72,
      },
      hookText: 'this weekend ☀️',
      transitionOut: { type: 'whip', durationMs: 300 },
      music: { libraryId: 'mix-sun-and-water', volume: 0.52 },
      coachHint: 'Kodak pop + yellow chip text. Keep shots sunny.',
    }),
  }),
  look({
    id: 'look-dream-glow',
    name: 'Dream Glow',
    tagline: 'Soft halo · slow · emotional',
    accent: '#C4B5FD',
    accent2: '#6D28D9',
    icon: 'cloudy-night' as IconName,
    recipe: recipe({
      id: 'look-dream-glow',
      name: 'Dream Glow',
      look: {
        filterId: 'dream',
        effectId: 'blur',
        effectIntensity: 0.28,
        movieEffectId: 'glow',
        colorGrade: {
          brightness: 0.14,
          contrast: -0.14,
          saturation: 0.08,
          temperature: 0.18,
        },
      },
      textStyle: {
        color: '#F5F3FF',
        fontSize: 28,
        fontWeight: 'bold',
        backgroundOpacity: 0,
        animationIn: 'fade',
        y: 0.7,
      },
      hookText: 'remember this…',
      transitionOut: { type: 'dissolve', durationMs: 550 },
      music: { libraryId: 'mix-dreaming-off', volume: 0.42 },
      coachHint: 'Soft glow pack. Slow the clip slightly in Speed if needed.',
    }),
  }),
  look({
    id: 'look-auto-enhance',
    name: 'Auto Enhance',
    tagline: 'One-tap contrast & color pop',
    accent: '#34D399',
    accent2: '#047857',
    icon: 'color-wand' as IconName,
    recipe: recipe({
      id: 'look-auto-enhance',
      name: 'Auto Enhance',
      look: {
        filterId: 'kodak',
        effectId: 'none',
        movieEffectId: 'enhance',
        colorGrade: {
          brightness: 0.09,
          contrast: 0.3,
          saturation: 0.22,
          temperature: 0.06,
        },
      },
      textStyle: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: 'bold',
        backgroundColor: '#064E3B',
        backgroundOpacity: 0.75,
        animationIn: 'slideUp',
        y: 0.8,
      },
      hookText: 'looks better already',
      transitionOut: { type: 'crossfade', durationMs: 400 },
      music: { libraryId: 'mix-fun-life', volume: 0.48 },
      coachHint: 'Safe default for any clip. Export 9:16 from Publish.',
    }),
  }),
];

export function listFinishedLooks() {
  return FINISHED_LOOKS;
}
