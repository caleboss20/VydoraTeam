/**
 * Brand kit — pure client CRUD in AsyncStorage.
 * Apply helpers return Partial overlay / color-grade suggestions;
 * nothing is applied until the user taps Apply in the panel.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'vydora:brandKit';

export type BrandCaptionStyle = {
  fontSize: number;
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  /** Vertical position 0–1 (0 top, 1 bottom). */
  y: number;
};

export type BrandKit = {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  captionStyle: BrandCaptionStyle;
  introText?: string;
  outroText?: string;
};

export type BrandOverlaySuggestion = {
  text: string;
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  fontSize: number;
  fontFamily: string;
  y: number;
  /** Suggested placement: intro at 0ms, outro near end. */
  role: 'intro' | 'outro' | 'caption';
};

export type BrandColorGradeSuggestion = {
  /** Tint toward primary (0–1). */
  tintStrength: number;
  primaryColor: string;
  accentColor: string;
  /** Soft contrast lift suggestion for the editor. */
  contrastBoost: number;
};

const DEFAULT_CAPTION: BrandCaptionStyle = {
  fontSize: 28,
  color: '#FFFFFF',
  backgroundColor: '#000000',
  backgroundOpacity: 0.45,
  y: 0.78,
};

export function defaultBrandKit(partial?: Partial<BrandKit>): BrandKit {
  return {
    id: partial?.id ?? `kit_${Date.now()}`,
    name: partial?.name ?? 'My brand',
    primaryColor: partial?.primaryColor ?? '#F5C518',
    accentColor: partial?.accentColor ?? '#FFFFFF',
    fontFamily: partial?.fontFamily ?? 'System',
    captionStyle: { ...DEFAULT_CAPTION, ...partial?.captionStyle },
    introText: partial?.introText,
    outroText: partial?.outroText,
  };
}

async function readAll(): Promise<BrandKit[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(kits: BrandKit[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(kits));
}

export const brandKitService = {
  list: async (): Promise<BrandKit[]> => readAll(),

  get: async (id: string): Promise<BrandKit | null> => {
    const kits = await readAll();
    return kits.find((k) => k.id === id) ?? null;
  },

  save: async (kit: BrandKit): Promise<BrandKit> => {
    const kits = await readAll();
    const idx = kits.findIndex((k) => k.id === kit.id);
    const next = { ...kit, captionStyle: { ...DEFAULT_CAPTION, ...kit.captionStyle } };
    if (idx >= 0) kits[idx] = next;
    else kits.push(next);
    await writeAll(kits);
    return next;
  },

  remove: async (id: string): Promise<void> => {
    const kits = await readAll();
    await writeAll(kits.filter((k) => k.id !== id));
  },

  /** Caption + intro/outro overlay patches — caller merges into timeline. */
  applyOverlays: (kit: BrandKit): BrandOverlaySuggestion[] => {
    const cs = { ...DEFAULT_CAPTION, ...kit.captionStyle };
    const items: BrandOverlaySuggestion[] = [];
    if (kit.introText?.trim()) {
      items.push({
        text: kit.introText.trim(),
        color: kit.primaryColor,
        backgroundColor: cs.backgroundColor,
        backgroundOpacity: cs.backgroundOpacity,
        fontSize: cs.fontSize + 4,
        fontFamily: kit.fontFamily,
        y: 0.42,
        role: 'intro',
      });
    }
    if (kit.outroText?.trim()) {
      items.push({
        text: kit.outroText.trim(),
        color: kit.accentColor,
        backgroundColor: cs.backgroundColor,
        backgroundOpacity: cs.backgroundOpacity,
        fontSize: cs.fontSize + 2,
        fontFamily: kit.fontFamily,
        y: 0.5,
        role: 'outro',
      });
    }
    items.push({
      text: '',
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      backgroundOpacity: cs.backgroundOpacity,
      fontSize: cs.fontSize,
      fontFamily: kit.fontFamily,
      y: cs.y,
      role: 'caption',
    });
    return items;
  },

  /** Soft color-grade suggestion derived from brand colors (not auto-applied). */
  applyColorGrade: (kit: BrandKit): BrandColorGradeSuggestion => ({
    tintStrength: 0.18,
    primaryColor: kit.primaryColor,
    accentColor: kit.accentColor,
    contrastBoost: 0.08,
  }),
};
