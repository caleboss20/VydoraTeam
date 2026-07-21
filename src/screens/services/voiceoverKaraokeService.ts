/**
 * Sync voiceover speech → karaoke captions on the active clip.
 */
import { captionService, type CaptionWord } from './captionService';
import { buildCaptionOverlays } from './captionStylePresets';
import { uploadService } from './uploadService';
import type { KaraokeWord, TextOverlay, VideoClip, VoiceoverClip } from '../types';

/** Shift Whisper words from VO-local time into clip-local ms. */
export function mapVoWordsToClipLocal(
  words: CaptionWord[],
  voiceover: VoiceoverClip,
  clipTimelineStartMs: number,
  clipWindowMs: number
): KaraokeWord[] {
  return words
    .map((w) => ({
      text: w.text,
      startMs: voiceover.startMs + w.startMs - clipTimelineStartMs,
      endMs: voiceover.startMs + w.endMs - clipTimelineStartMs,
    }))
    .filter((w) => w.endMs > 40 && w.startMs < clipWindowMs - 40)
    .map((w) => ({
      ...w,
      startMs: Math.max(0, w.startMs),
      endMs: Math.min(clipWindowMs, Math.max(w.startMs + 80, w.endMs)),
    }));
}

export type VoKaraokeResult = {
  drafts: ReturnType<typeof buildCaptionOverlays>;
  remoteUrl: string;
};

/**
 * Upload VO if needed, transcribe, build bottom karaoke overlays for the clip.
 */
export async function buildKaraokeFromVoiceover(
  voiceover: VoiceoverClip,
  clip: VideoClip,
  clipTimelineStartMs: number
): Promise<VoKaraokeResult> {
  let remoteUrl = voiceover.uri;
  if (!/^https?:\/\//i.test(remoteUrl)) {
    const uploaded = await uploadService.uploadVideo(
      voiceover.uri,
      `voiceover_${voiceover.id}.m4a`,
      'audio/mp4'
    );
    remoteUrl = uploaded.url;
  }

  const { items, words } = await captionService.generateCaptions(remoteUrl);
  if (!items.length && !words.length) {
    throw new Error('No speech detected in this voiceover.');
  }

  const trimStart = clip.trimStartMs ?? 0;
  const trimEnd = clip.trimEndMs ?? clip.durationMs;
  const windowMs = Math.max(500, trimEnd - trimStart);

  const shiftedWords = mapVoWordsToClipLocal(
    words,
    voiceover,
    clipTimelineStartMs,
    windowMs
  );

  const shiftedItems = items
    .map((s) => ({
      ...s,
      startMs: voiceover.startMs + s.startMs - clipTimelineStartMs,
      endMs: voiceover.startMs + s.endMs - clipTimelineStartMs,
    }))
    .filter((s) => s.endMs > 0 && s.startMs < windowMs)
    .map((s) => ({
      ...s,
      startMs: Math.max(0, s.startMs),
      endMs: Math.min(windowMs, Math.max(s.startMs + 200, s.endMs)),
    }));

  const drafts = buildCaptionOverlays(
    'karaoke',
    shiftedItems,
    shiftedWords.length ? shiftedWords : words,
    windowMs
  ).map((d) => ({
    ...d,
    y: 0.82,
    backgroundOpacity: 0.65,
  }));

  if (!drafts.length) {
    throw new Error('Could not build karaoke lines from this voiceover.');
  }

  return { drafts, remoteUrl };
}

/** Clear helper type for applying drafts onto a clip. */
export type KaraokeDraft = Pick<
  TextOverlay,
  | 'text'
  | 'startMs'
  | 'durationMs'
  | 'color'
  | 'fontSize'
  | 'fontWeight'
  | 'fontFamily'
  | 'highlightColor'
  | 'karaokeWords'
  | 'backgroundColor'
  | 'backgroundOpacity'
  | 'backgroundRadius'
  | 'animationIn'
  | 'animationOut'
  | 'align'
  | 'x'
  | 'y'
>;
