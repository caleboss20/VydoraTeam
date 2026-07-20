import { VideoClip, TextOverlay } from '../types';

/**
 * Pure helpers for clip-scoped text overlays (no React state).
 * Context owns setState + AsyncStorage; this file only builds / mutates objects.
 *
 * Defaults match CapCut-ish on-video text: centered white glyphs, ready for
 * a background pill once the user picks a Background swatch in the Text tool.
 */
export function createTextOverlay(
  clipId: string,
  text: string,
  startMs: number,
  durationMs: number = 3000
): TextOverlay {
  return {
    id: `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text,
    clipId,
    startMs,
    durationMs,
    x: 0.5, // center of preview
    y: 0.5,
    fontSize: 24,
    fontWeight: 'normal',
    align: 'center',
    color: '#FFFFFF',
    // No pill until user picks a Background color (undefined = transparent).
    backgroundColor: undefined,
    backgroundOpacity: 0.6,
    backgroundRadius: 8,
    strokeColor: undefined,
    strokeWidth: 0,
    animationIn: 'fade',
    animationOut: 'none',
  };
}
export function addOverlayToClip(clip: VideoClip, overlay: TextOverlay): VideoClip {
  return {
    ...clip,
    textOverlays: [...(clip.textOverlays ?? []), overlay],
  };
}
export function updateOverlayInClip(
  clip: VideoClip,
  overlayId: string,
  changes: Partial<TextOverlay>
): VideoClip {
  return {
    ...clip,
    textOverlays: (clip.textOverlays ?? []).map((o) =>
      o.id === overlayId ? { ...o, ...changes } : o
    ),
  };
}
export function removeOverlayFromClip(clip: VideoClip, overlayId: string): VideoClip {
  return {
    ...clip,
    textOverlays: (clip.textOverlays ?? []).filter((o) => o.id !== overlayId),
  };
}

/** Overlays whose [start, start+duration] window contains local clip time. */
export function getActiveOverlays(clip: VideoClip, localTimeMs: number): TextOverlay[] {
  return (clip.textOverlays ?? []).filter(
    (o) => localTimeMs >= o.startMs && localTimeMs <= o.startMs + o.durationMs
  );
}