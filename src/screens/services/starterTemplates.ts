/**
 * Curated CapCut-style starter templates — look recipes applied to the
 * active clip. Free vs Pro tier; Pro unlocks via useIsPro() (dev toggle
 * until Paystack).
 */
import type { EditTemplate } from './editTemplateService';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { FINISHED_LOOKS } from './finishedLooks';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type StarterCategory =
  | 'Looks'
  | 'Social'
  | 'Business'
  | 'Lifestyle'
  | 'Cinematic'
  | 'Music';

export type StarterTemplate = {
  id: string;
  name: string;
  tagline: string;
  category: StarterCategory;
  tier: 'free' | 'pro';
  /** Gradient card colors */
  accent: string;
  accent2: string;
  icon: IconName;
  /** Optional silent loop URL for template card preview. */
  previewVideoUrl?: string;
  /** Applied via editTemplateService.applyLook */
  recipe: EditTemplate;
};

function recipe(
  partial: Omit<EditTemplate, 'id' | 'createdAt'> & { id?: string }
): EditTemplate {
  return {
    id: partial.id ?? `starter-${partial.name}`,
    name: partial.name,
    createdAt: '2026-01-01T00:00:00.000Z',
    look: partial.look,
    textStyle: partial.textStyle,
    hookText: partial.hookText,
    transitionOut: partial.transitionOut,
    coachHint: partial.coachHint,
    music: partial.music,
    cropRatioId: partial.cropRatioId,
    photoSlot: partial.photoSlot,
  };
}

export const STARTER_CATEGORIES: Array<StarterCategory | 'All'> = [
  'All',
  'Looks',
  'Social',
  'Business',
  'Lifestyle',
  'Cinematic',
  'Music',
];

export const STARTER_TEMPLATES: StarterTemplate[] = [
  ...(FINISHED_LOOKS as StarterTemplate[]),
  {
    id: 'product-pop',
    name: 'Product Pop',
    tagline: 'Warm shoppable product spot',
    category: 'Business',
    tier: 'free',
    accent: '#F472B6',
    accent2: '#DB2777',
    icon: 'bag-handle',
    recipe: recipe({
      name: 'Product Pop',
      look: {
        filterId: 'warm',
        effectId: 'vignette',
        effectIntensity: 0.45,
        colorGrade: {
          brightness: 0.1,
          contrast: 0.15,
          saturation: 0.3,
          temperature: 0.35,
        },
      },
      textStyle: {
        color: '#1A0E00',
        fontSize: 34,
        fontWeight: 'bold',
        backgroundColor: '#F5C518',
        backgroundOpacity: 0.95,
        animationIn: 'slideUp',
      },
      hookText: 'NEW DROP',
      transitionOut: { type: 'crossfade', durationMs: 400 },
      cropRatioId: 'tiktok',
      music: { libraryId: 'mix-cat-walk', volume: 0.45 },
    }),
  },
  {
    id: 'podcast-cut',
    name: 'Podcast Cut',
    tagline: 'Neutral grade + bold quote card',
    category: 'Business',
    tier: 'free',
    accent: '#A78BFA',
    accent2: '#6D28D9',
    icon: 'mic',
    recipe: recipe({
      name: 'Podcast Cut',
      look: {
        filterId: 'cool',
        colorGrade: {
          brightness: 0,
          contrast: 0.2,
          saturation: -0.15,
          temperature: -0.2,
        },
      },
      textStyle: {
        color: '#F5C518',
        fontSize: 32,
        fontWeight: 'bold',
        backgroundColor: '#0B0D13',
        backgroundOpacity: 0.8,
        animationIn: 'typewriter',
      },
      hookText: '"The best insight from this episode"',
      cropRatioId: 'tiktok',
      music: { libraryId: 'mix-smooth-tension', volume: 0.3 },
    }),
  },
  {
    id: 'travel-glow',
    name: 'Travel Glow',
    tagline: 'Sun-kissed vlog energy',
    category: 'Lifestyle',
    tier: 'free',
    accent: '#34D399',
    accent2: '#059669',
    icon: 'airplane',
    recipe: recipe({
      name: 'Travel Glow',
      look: {
        filterId: 'warm',
        movieEffectId: 'dream',
        colorGrade: {
          brightness: 0.12,
          contrast: 0.1,
          saturation: 0.35,
          temperature: 0.4,
        },
        speed: 1,
      },
      textStyle: {
        color: '#FFFFFF',
        fontSize: 36,
        fontWeight: 'bold',
        backgroundOpacity: 0,
        animationIn: 'fade',
      },
      hookText: 'Day 01 · Accra',
      transitionOut: { type: 'dissolve', durationMs: 500 },
      cropRatioId: 'tiktok',
      music: { libraryId: 'mix-sun-and-water', volume: 0.5 },
    }),
  },
  {
    id: 'noir-story',
    name: 'Noir Story',
    tagline: 'Moody B&W narrative',
    category: 'Cinematic',
    tier: 'free',
    accent: '#9CA3AF',
    accent2: '#374151',
    icon: 'film',
    previewVideoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-waves-coming-to-the-beach-5016-large.mp4',
    recipe: recipe({
      name: 'Noir Story',
      look: {
        filterId: 'noir',
        effectId: 'vignette',
        effectIntensity: 0.65,
        movieEffectId: 'memory',
        colorGrade: {
          brightness: -0.05,
          contrast: 0.35,
          saturation: -1,
          temperature: -0.1,
        },
      },
      textStyle: {
        color: '#FFFFFF',
        fontSize: 30,
        fontWeight: 'normal',
        backgroundOpacity: 0,
        animationIn: 'fade',
      },
      hookText: 'Chapter One',
      transitionOut: { type: 'fadeblack', durationMs: 600 },
      cropRatioId: 'tiktok',
      music: { libraryId: 'lib-slow-burn', volume: 0.4 },
    }),
  },
  // ── Pro ──────────────────────────────────────────────────────────
  {
    id: 'viral-zoom',
    name: 'Viral Zoom',
    tagline: 'High-energy scroll-stopper',
    category: 'Social',
    tier: 'pro',
    accent: '#EF4444',
    accent2: '#B91C1C',
    icon: 'rocket',
    recipe: recipe({
      name: 'Viral Zoom',
      look: {
        filterId: 'kodak',
        effectId: 'zoomPunch',
        effectIntensity: 0.9,
        movieEffectId: 'impact',
        colorGrade: {
          brightness: 0.08,
          contrast: 0.35,
          saturation: 0.4,
          temperature: 0.15,
        },
        speed: 1.05,
      },
      textStyle: {
        color: '#FFFFFF',
        fontSize: 48,
        fontWeight: 'bold',
        backgroundColor: '#EF4444',
        backgroundOpacity: 0.9,
        animationIn: 'pop',
      },
      hookText: 'STOP SCROLLING',
      transitionOut: { type: 'glitch', durationMs: 280 },
      cropRatioId: 'tiktok',
      music: { libraryId: 'mix-fun-life', volume: 0.55 },
    }),
  },
  {
    id: 'luxury-brand',
    name: 'Luxury Brand',
    tagline: 'Soft contrast, gold titles',
    category: 'Business',
    tier: 'pro',
    accent: '#F5C518',
    accent2: '#92400E',
    icon: 'diamond',
    recipe: recipe({
      name: 'Luxury Brand',
      look: {
        filterId: 'cinematic',
        effectId: 'vignette',
        effectIntensity: 0.35,
        colorGrade: {
          brightness: -0.02,
          contrast: 0.18,
          saturation: -0.1,
          temperature: 0.2,
        },
      },
      textStyle: {
        color: '#F5C518',
        fontSize: 38,
        fontWeight: 'bold',
        backgroundOpacity: 0,
        animationIn: 'fade',
      },
      hookText: 'EST. 2026',
      transitionOut: { type: 'fadewhite', durationMs: 700 },
      cropRatioId: 'tiktok',
      music: { libraryId: 'mix-deep-urban', volume: 0.35 },
    }),
  },
  {
    id: 'fitness-fire',
    name: 'Fitness Fire',
    tagline: 'High contrast workout cut',
    category: 'Lifestyle',
    tier: 'pro',
    accent: '#F97316',
    accent2: '#C2410C',
    icon: 'barbell',
    recipe: recipe({
      name: 'Fitness Fire',
      look: {
        filterId: 'film',
        effectId: 'shake',
        effectIntensity: 0.4,
        colorGrade: {
          brightness: 0.05,
          contrast: 0.4,
          saturation: 0.25,
          temperature: 0.25,
        },
        speed: 1.1,
      },
      textStyle: {
        color: '#FFFFFF',
        fontSize: 44,
        fontWeight: 'bold',
        backgroundColor: '#000000',
        backgroundOpacity: 0.4,
        animationIn: 'slideUp',
      },
      hookText: 'NO DAYS OFF',
      transitionOut: { type: 'whip', durationMs: 300 },
      cropRatioId: 'tiktok',
      music: { libraryId: 'mix-tech-house', volume: 0.55 },
    }),
  },
  {
    id: 'wedding-soft',
    name: 'Wedding Soft',
    tagline: 'Dreamy romantic grade',
    category: 'Lifestyle',
    tier: 'pro',
    accent: '#FDA4AF',
    accent2: '#E11D48',
    icon: 'heart',
    recipe: recipe({
      name: 'Wedding Soft',
      look: {
        filterId: 'dream',
        movieEffectId: 'dream',
        effectId: 'blur',
        effectIntensity: 0.15,
        colorGrade: {
          brightness: 0.15,
          contrast: -0.05,
          saturation: 0.1,
          temperature: 0.3,
        },
      },
      textStyle: {
        color: '#FFFFFF',
        fontSize: 34,
        fontWeight: 'normal',
        backgroundOpacity: 0,
        animationIn: 'fade',
      },
      hookText: 'Forever starts here',
      transitionOut: { type: 'dissolve', durationMs: 800 },
      cropRatioId: 'tiktok',
      music: { libraryId: 'mix-dreaming-off', volume: 0.4 },
    }),
  },
  {
    id: 'vhs-retro',
    name: 'VHS Retro',
    tagline: 'Tape grain + flashback vibe',
    category: 'Cinematic',
    tier: 'pro',
    accent: '#C084FC',
    accent2: '#7C3AED',
    icon: 'videocam',
    recipe: recipe({
      name: 'VHS Retro',
      look: {
        filterId: 'vintage',
        movieEffectId: 'vhs',
        colorGrade: {
          brightness: 0.05,
          contrast: 0.2,
          saturation: -0.2,
          temperature: 0.15,
        },
      },
      textStyle: {
        color: '#39FF14',
        fontSize: 28,
        fontWeight: 'bold',
        backgroundColor: '#000000',
        backgroundOpacity: 0.7,
        animationIn: 'glitch',
      },
      hookText: 'PLAY ▶',
      transitionOut: { type: 'glitch', durationMs: 400 },
      cropRatioId: 'tiktok',
      music: { libraryId: 'lib-synth-city', volume: 0.45 },
    }),
  },
  {
    id: 'slow-mo-epic',
    name: 'Slow-Mo Epic',
    tagline: 'Cinematic half-speed hero',
    category: 'Cinematic',
    tier: 'pro',
    accent: '#38BDF8',
    accent2: '#0369A1',
    icon: 'speedometer',
    recipe: recipe({
      name: 'Slow-Mo Epic',
      look: {
        filterId: 'cinematic',
        movieEffectId: 'slowMo',
        speed: 0.5,
        colorGrade: {
          brightness: -0.05,
          contrast: 0.3,
          saturation: 0.05,
          temperature: -0.15,
        },
      },
      textStyle: {
        color: '#FFFFFF',
        fontSize: 40,
        fontWeight: 'bold',
        backgroundOpacity: 0,
        animationIn: 'fade',
      },
      hookText: 'IN THIS MOMENT',
      transitionOut: { type: 'crossfade', durationMs: 900 },
      cropRatioId: 'tiktok',
      music: { libraryId: 'lib-slow-burn', volume: 0.42 },
    }),
  },
  {
    id: 'beat-drop',
    name: 'Beat Drop',
    tagline: 'Music video impact cut',
    category: 'Music',
    tier: 'pro',
    accent: '#22D3EE',
    accent2: '#0891B2',
    icon: 'musical-notes',
    recipe: recipe({
      name: 'Beat Drop',
      look: {
        filterId: 'cool',
        effectId: 'zoomPunch',
        effectIntensity: 0.85,
        movieEffectId: 'impact',
        colorGrade: {
          brightness: 0.05,
          contrast: 0.3,
          saturation: 0.35,
          temperature: -0.25,
        },
      },
      textStyle: {
        color: '#22D3EE',
        fontSize: 46,
        fontWeight: 'bold',
        backgroundColor: '#0B0D13',
        backgroundOpacity: 0.85,
        animationIn: 'pop',
      },
      hookText: 'DROP',
      transitionOut: { type: 'whip', durationMs: 250 },
      cropRatioId: 'tiktok',
      music: { libraryId: 'mix-tech-house', volume: 0.6 },
    }),
  },
  {
    id: 'lofi-night',
    name: 'Lo-Fi Night',
    tagline: 'Chill late-night grade',
    category: 'Music',
    tier: 'pro',
    accent: '#818CF8',
    accent2: '#4338CA',
    icon: 'moon',
    recipe: recipe({
      name: 'Lo-Fi Night',
      look: {
        filterId: 'cool',
        movieEffectId: 'memory',
        effectId: 'vignette',
        effectIntensity: 0.5,
        colorGrade: {
          brightness: -0.1,
          contrast: 0.15,
          saturation: -0.25,
          temperature: -0.35,
        },
      },
      textStyle: {
        color: '#C7D2FE',
        fontSize: 30,
        fontWeight: 'normal',
        backgroundOpacity: 0,
        animationIn: 'fade',
      },
      hookText: '2:14 AM',
      transitionOut: { type: 'dissolve', durationMs: 700 },
      cropRatioId: 'tiktok',
      music: { libraryId: 'mix-hazy-after-hours', volume: 0.45 },
    }),
  },
  {
    id: 'flashback',
    name: 'Flashback',
    tagline: 'Memory reel with soft rewind',
    category: 'Cinematic',
    tier: 'pro',
    accent: '#FBBF24',
    accent2: '#D97706',
    icon: 'hourglass',
    recipe: recipe({
      name: 'Flashback',
      look: {
        filterId: 'film',
        movieEffectId: 'flashback',
        colorGrade: {
          brightness: 0.1,
          contrast: 0.05,
          saturation: -0.3,
          temperature: 0.45,
        },
      },
      textStyle: {
        color: '#FEF3C7',
        fontSize: 32,
        fontWeight: 'bold',
        backgroundOpacity: 0,
        animationIn: 'fade',
      },
      hookText: 'Years ago…',
      transitionOut: { type: 'fadewhite', durationMs: 550 },
      cropRatioId: 'tiktok',
      music: { libraryId: 'lib-night-groove', volume: 0.4 },
    }),
  },
  {
    id: 'agency-pitch',
    name: 'Agency Pitch',
    tagline: 'Clean corporate case study',
    category: 'Business',
    tier: 'pro',
    accent: '#94A3B8',
    accent2: '#334155',
    icon: 'briefcase',
    recipe: recipe({
      name: 'Agency Pitch',
      look: {
        filterId: 'none',
        colorGrade: {
          brightness: 0.06,
          contrast: 0.12,
          saturation: -0.08,
          temperature: -0.05,
        },
      },
      textStyle: {
        color: '#0F172A',
        fontSize: 30,
        fontWeight: 'bold',
        backgroundColor: '#F8FAFC',
        backgroundOpacity: 0.95,
        animationIn: 'slideUp',
      },
      hookText: 'Results that scale',
      transitionOut: { type: 'smoothleft', durationMs: 450 },
      cropRatioId: 'youtube',
      music: { libraryId: 'mix-smooth-tension', volume: 0.32 },
    }),
  },
];

export function listStarters(category: StarterCategory | 'All' = 'All') {
  if (category === 'All') return STARTER_TEMPLATES;
  return STARTER_TEMPLATES.filter((t) => t.category === category);
}

export function getStarterById(id: string) {
  return STARTER_TEMPLATES.find((t) => t.id === id);
}
