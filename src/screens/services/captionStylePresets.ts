/**
 * Professional caption looks for AI auto-captions.
 * Includes true karaoke (highlight-in-line) using word timestamps.
 */
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { TextAnimationType, KaraokeWord, TextOverlay } from '../types';
import type { CaptionSegment, CaptionWord } from './captionService';
import { colorForSpeaker } from './captionService';

export type CaptionStyleId =
  | 'podcast'
  | 'karaoke'
  | 'wordPop'
  | 'phrases'
  | 'news'
  | 'typewriter'
  | 'softFade';

export type CaptionStylePreset = {
  id: CaptionStyleId;
  label: string;
  hint: string;
  icon: ComponentProps<typeof Ionicons>['name'];
};

export const CAPTION_STYLE_PRESETS: CaptionStylePreset[] = [
  {
    id: 'karaoke',
    label: 'Karaoke',
    hint: 'Full line stays up — spoken word lights up yellow',
    icon: 'musical-notes-outline',
  },
  {
    id: 'podcast',
    label: 'Podcast',
    hint: 'Rolling lines as you speak — YouTube interview look',
    icon: 'mic-outline',
  },
  {
    id: 'wordPop',
    label: 'Word pop',
    hint: 'One word at a time, locked to speech',
    icon: 'flash-outline',
  },
  {
    id: 'phrases',
    label: 'Phrases',
    hint: 'Natural Whisper sentences with a soft fade',
    icon: 'chatbubble-outline',
  },
  {
    id: 'news',
    label: 'Lower third',
    hint: 'Slide-up lines — broadcast / news feel',
    icon: 'newspaper-outline',
  },
  {
    id: 'typewriter',
    label: 'Typewriter',
    hint: 'Phrase reveals letter-by-letter',
    icon: 'create-outline',
  },
  {
    id: 'softFade',
    label: 'Soft fade',
    hint: 'Longer phrases, gentle in/out — documentary',
    icon: 'sunny-outline',
  },
];

export type CaptionOverlayDraft = Pick<
  TextOverlay,
  | 'text'
  | 'startMs'
  | 'durationMs'
  | 'color'
  | 'fontSize'
  | 'fontWeight'
  | 'fontFamily'
  | 'x'
  | 'y'
  | 'backgroundColor'
  | 'backgroundOpacity'
  | 'backgroundRadius'
  | 'animationIn'
  | 'animationOut'
  | 'align'
  | 'karaokeWords'
  | 'highlightColor'
  | 'speakerId'
  | 'speakerLabel'
> & { isAiGenerated: true };

/** Pack words into short readable lines (podcast / news / karaoke). */
export function packWordsIntoLines(
  words: CaptionWord[],
  opts: { maxWords?: number; maxGapMs?: number; maxSpanMs?: number } = {}
): { segment: CaptionSegment; words: KaraokeWord[] }[] {
  const maxWords = opts.maxWords ?? 6;
  const maxGapMs = opts.maxGapMs ?? 700;
  const maxSpanMs = opts.maxSpanMs ?? 3200;
  if (!words.length) return [];

  const lines: { segment: CaptionSegment; words: KaraokeWord[] }[] = [];
  let buf: CaptionWord[] = [];

  const flush = () => {
    if (!buf.length) return;
    const kw: KaraokeWord[] = buf.map((w) => ({
      text: w.text,
      startMs: w.startMs,
      endMs: w.endMs,
    }));
    const text = kw.map((w) => w.text).join(' ').replace(/\s+/g, ' ').trim();
    if (text) {
      lines.push({
        segment: {
          startMs: buf[0].startMs,
          endMs: Math.max(buf[0].startMs + 400, buf[buf.length - 1].endMs),
          text,
          speakerId: buf[0].speakerId,
          speakerLabel: buf[0].speakerLabel,
        },
        words: kw,
      });
    }
    buf = [];
  };

  for (const w of words) {
    if (!buf.length) {
      buf.push(w);
      continue;
    }
    const gap = w.startMs - buf[buf.length - 1].endMs;
    const span = w.endMs - buf[0].startMs;
    if (buf.length >= maxWords || gap > maxGapMs || span > maxSpanMs) {
      flush();
    }
    buf.push(w);
  }
  flush();
  return lines;
}

function styleLook(id: CaptionStyleId): {
  color: string;
  highlightColor?: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  y: number;
  backgroundColor?: string;
  backgroundOpacity?: number;
  backgroundRadius?: number;
  animationIn: TextAnimationType;
  animationOut: TextAnimationType;
  fontFamily?: string;
} {
  switch (id) {
    case 'karaoke':
      return {
        color: '#FFFFFF',
        highlightColor: '#F5C518',
        fontSize: 22,
        fontWeight: 'bold',
        y: 0.76,
        backgroundColor: '#000000',
        backgroundOpacity: 0.7,
        backgroundRadius: 10,
        animationIn: 'fade',
        animationOut: 'fade',
        fontFamily: 'System',
      };
    case 'wordPop':
      return {
        color: '#F5C518',
        fontSize: 28,
        fontWeight: 'bold',
        y: 0.72,
        backgroundColor: '#000000',
        backgroundOpacity: 0.55,
        backgroundRadius: 8,
        animationIn: 'pop',
        animationOut: 'fade',
        fontFamily: 'System',
      };
    case 'news':
      return {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        y: 0.86,
        backgroundColor: '#0B0D13',
        backgroundOpacity: 0.78,
        backgroundRadius: 4,
        animationIn: 'slideUp',
        animationOut: 'fade',
        fontFamily: 'System',
      };
    case 'typewriter':
      return {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: 'bold',
        y: 0.8,
        backgroundColor: '#000000',
        backgroundOpacity: 0.5,
        backgroundRadius: 6,
        animationIn: 'typewriter',
        animationOut: 'fade',
        fontFamily: 'System',
      };
    case 'softFade':
      return {
        color: '#F5F5F5',
        fontSize: 15,
        fontWeight: 'normal',
        y: 0.84,
        backgroundColor: '#000000',
        backgroundOpacity: 0.4,
        backgroundRadius: 10,
        animationIn: 'fade',
        animationOut: 'fade',
        fontFamily: 'System',
      };
    case 'phrases':
      return {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 'bold',
        y: 0.82,
        backgroundColor: '#000000',
        backgroundOpacity: 0.55,
        backgroundRadius: 6,
        animationIn: 'fade',
        animationOut: 'fade',
        fontFamily: 'System',
      };
    case 'podcast':
    default:
      return {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        y: 0.78,
        backgroundColor: '#000000',
        backgroundOpacity: 0.62,
        backgroundRadius: 8,
        animationIn: 'fade',
        animationOut: 'fade',
        fontFamily: 'System',
      };
  }
}

/**
 * Build overlay drafts for a caption style.
 * True karaoke packs words into lines and attaches karaokeWords for highlight.
 */
export function buildCaptionOverlays(
  styleId: CaptionStyleId,
  segments: CaptionSegment[],
  words: CaptionWord[],
  clipEndMs: number
): CaptionOverlayDraft[] {
  const look = styleLook(styleId);

  // True karaoke — line + per-word highlight data
  if (styleId === 'karaoke' && words.length) {
    const packed = packWordsIntoLines(words, {
      maxWords: 6,
      maxGapMs: 650,
      maxSpanMs: 3000,
    });
    return packed
      .filter((p) => p.segment.startMs < clipEndMs && p.segment.text.trim())
      .map((p) => {
        const startMs = Math.max(0, p.segment.startMs);
        const endMs = Math.min(clipEndMs, Math.max(p.segment.endMs, startMs + 500));
        const speakerColor = colorForSpeaker(p.segment.speakerId);
        return {
          text: p.segment.text.trim(),
          startMs,
          durationMs: Math.max(500, endMs - startMs),
          isAiGenerated: true as const,
          x: 0.5,
          y: look.y,
          fontSize: look.fontSize,
          fontWeight: look.fontWeight,
          fontFamily: look.fontFamily,
          color: p.segment.speakerId ? speakerColor : look.color,
          highlightColor: look.highlightColor ?? '#F5C518',
          karaokeWords: p.words,
          backgroundColor: look.backgroundColor,
          backgroundOpacity: look.backgroundOpacity,
          backgroundRadius: look.backgroundRadius,
          animationIn: look.animationIn,
          animationOut: look.animationOut,
          align: 'center' as const,
          speakerId: p.segment.speakerId,
          speakerLabel: p.segment.speakerLabel,
        };
      });
  }

  let units: CaptionSegment[];
  if (styleId === 'wordPop' && words.length) {
    units = words.map((w) => ({
      startMs: w.startMs,
      endMs: Math.max(w.endMs, w.startMs + 180),
      text: w.text,
      speakerId: w.speakerId,
      speakerLabel: w.speakerLabel,
    }));
  } else if (
    (styleId === 'podcast' || styleId === 'news' || styleId === 'softFade') &&
    words.length
  ) {
    units = packWordsIntoLines(words, {
      maxWords: styleId === 'softFade' ? 10 : styleId === 'news' ? 8 : 6,
      maxGapMs: styleId === 'softFade' ? 900 : 700,
      maxSpanMs: styleId === 'softFade' ? 4500 : 3200,
    }).map((p) => p.segment);
  } else {
    units = segments;
  }

  if (!units.length && segments.length) units = segments;

  return units
    .filter((u) => u.startMs < clipEndMs && u.text.trim())
    .map((u) => {
      const startMs = Math.max(0, u.startMs);
      let endMs = Math.min(clipEndMs, u.endMs);
      if (styleId === 'wordPop') {
        endMs = Math.min(clipEndMs, Math.max(endMs, startMs + 220));
      }
      const durationMs = Math.max(400, endMs - startMs);
      const speakerColor = colorForSpeaker(u.speakerId);
      return {
        text: u.text.trim(),
        startMs,
        durationMs,
        isAiGenerated: true as const,
        x: 0.5,
        y: look.y,
        fontSize: look.fontSize,
        fontWeight: look.fontWeight,
        fontFamily: look.fontFamily,
        color: u.speakerId ? speakerColor : look.color,
        backgroundColor: look.backgroundColor,
        backgroundOpacity: look.backgroundOpacity,
        backgroundRadius: look.backgroundRadius,
        animationIn: look.animationIn,
        animationOut: look.animationOut,
        align: 'center' as const,
        speakerId: u.speakerId,
        speakerLabel: u.speakerLabel,
      };
    });
}
