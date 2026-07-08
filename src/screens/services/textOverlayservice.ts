import { VideoClip, TextOverlay } from '../types';
// ─── Text Overlay Service ─────────────────────────────────────────────────────
// Pure functions only — no state, no persistence. The context calls these
// and handles setState + AsyncStorage, same pattern as updateClipVolume etc.
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
    x: 0.5,
    y: 0.5,
    fontSize: 24,
    fontWeight: 'normal',
    align: 'center',
    color: '#FFFFFF',
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
// Returns overlay(s) visible at a given local clip time (ms).
export function getActiveOverlays(clip: VideoClip, localTimeMs: number): TextOverlay[] {
  return (clip.textOverlays ?? []).filter(
    (o) => localTimeMs >= o.startMs && localTimeMs <= o.startMs + o.durationMs
  );
}