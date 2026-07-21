/**
 * Edit templates — user-saved looks + starter recipe apply.
 * Stored locally in AsyncStorage for "My templates".
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ClipEffectId,
  ClipTransition,
  ColorGrade,
  MovieEffectId,
  SpeedCurveId,
  TextAnimationType,
  TextOverlay,
  VideoClip,
  VideoProject,
} from '../types';
import { DEFAULT_COLOR_GRADE } from '../types';

const STORAGE_KEY = 'vydora:editTemplates';

export type EditTemplate = {
  id: string;
  name: string;
  createdAt: string;
  /** Visual / motion look taken from a source clip. */
  look: {
    filterId?: string;
    effectId?: ClipEffectId;
    effectIntensity?: number;
    movieEffectId?: MovieEffectId;
    colorGrade?: ColorGrade;
    speed?: number;
    speedCurve?: SpeedCurveId;
    reversed?: boolean;
    opacity?: number;
  };
  /** Default text style for new overlays. */
  textStyle?: {
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: 'normal' | 'bold';
    backgroundColor?: string;
    backgroundOpacity?: number;
    animationIn?: TextAnimationType;
    /** Normalized vertical position (0–1). Default 0.72. */
    y?: number;
  };
  /** Headline written when applying a starter template. */
  hookText?: string;
  transitionOut?: ClipTransition;
  /** Coach copy after apply (e.g. Photo Manifesto steps). */
  coachHint?: string;
  /**
   * Filled CapCut-style extras — music + 9:16 frame + optional photo flyer.
   * Applied by Editorscreen after `applyLook`.
   */
  music?: {
    /** Id from MUSIC_LIBRARY / musicLibrary.ts */
    libraryId: string;
    volume?: number;
  };
  /** Platform frame (e.g. tiktok = 9:16). */
  cropRatioId?: string;
  /** Insert a still photo slot (placeholder or user-replaceable flyer). */
  photoSlot?: {
    placeholderUri: string;
    durationMs: number;
    caption?: string;
    where?: 'before' | 'after';
  };
};

function fromClip(clip: VideoClip): EditTemplate['look'] {
  return {
    filterId: clip.filterId,
    effectId: clip.effectId,
    effectIntensity: clip.effectIntensity,
    movieEffectId: clip.movieEffectId,
    colorGrade: clip.colorGrade ?? DEFAULT_COLOR_GRADE,
    speed: clip.speed,
    speedCurve: clip.speedCurve,
    reversed: clip.reversed,
    opacity: clip.opacity,
  };
}

function textStyleFromClip(clip: VideoClip): EditTemplate['textStyle'] {
  const o = clip.textOverlays?.[0];
  if (!o) return undefined;
  return {
    color: o.color,
    fontSize: o.fontSize,
    fontFamily: o.fontFamily,
    fontWeight: o.fontWeight,
    backgroundColor: o.backgroundColor,
    backgroundOpacity: o.backgroundOpacity,
    animationIn: o.animationIn,
  };
}

function buildHookOverlay(
  clip: VideoClip,
  tpl: EditTemplate
): TextOverlay | null {
  if (!tpl.textStyle && !tpl.hookText) return null;
  const style = tpl.textStyle ?? {};
  const durationMs = Math.max(
    1200,
    Math.min(
      4000,
      (clip.trimEndMs ?? clip.durationMs) - (clip.trimStartMs ?? 0)
    )
  );
  return {
    id: `tpl-hook-${Date.now()}`,
    clipId: clip.id,
    text: tpl.hookText || 'Your headline',
    startMs: Math.max(0, clip.trimStartMs ?? 0) + 200,
    durationMs,
    color: style.color ?? '#FFFFFF',
    fontSize: style.fontSize ?? 36,
    fontWeight: style.fontWeight ?? 'bold',
    fontFamily: style.fontFamily,
    backgroundColor: style.backgroundColor,
    backgroundOpacity: style.backgroundOpacity,
    animationIn: style.animationIn ?? 'fade',
    x: 0.5,
    y: style.y ?? 0.72,
    align: 'center',
  };
}

export const editTemplateService = {
  list: async (): Promise<EditTemplate[]> => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as EditTemplate[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveFromClip: async (
    clip: VideoClip,
    name: string
  ): Promise<EditTemplate> => {
    const tpl: EditTemplate = {
      id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || 'My template',
      createdAt: new Date().toISOString(),
      look: fromClip(clip),
      textStyle: textStyleFromClip(clip),
      hookText: clip.textOverlays?.[0]?.text,
      transitionOut: clip.transitionOut,
    };
    const all = await editTemplateService.list();
    all.unshift(tpl);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 40)));
    return tpl;
  },

  remove: async (id: string): Promise<void> => {
    const all = await editTemplateService.list();
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(all.filter((t) => t.id !== id))
    );
  },

  /** Merge template look + optional hook text + transition onto a clip. */
  applyLook: (clip: VideoClip, tpl: EditTemplate): VideoClip => {
    const hook = buildHookOverlay(clip, tpl);
    const withoutOldHook = (clip.textOverlays || []).filter(
      (o) => !String(o.id).startsWith('tpl-hook-')
    );
    return {
      ...clip,
      filterId: tpl.look.filterId ?? clip.filterId,
      effectId: tpl.look.effectId ?? clip.effectId,
      effectIntensity: tpl.look.effectIntensity ?? clip.effectIntensity,
      movieEffectId: tpl.look.movieEffectId ?? clip.movieEffectId,
      colorGrade: tpl.look.colorGrade ?? clip.colorGrade,
      speed: tpl.look.speed ?? clip.speed,
      speedCurve: tpl.look.speedCurve ?? clip.speedCurve,
      reversed: tpl.look.reversed ?? clip.reversed,
      opacity: tpl.look.opacity ?? clip.opacity,
      transitionOut: tpl.transitionOut ?? clip.transitionOut,
      textOverlays: hook ? [hook, ...withoutOldHook] : clip.textOverlays,
    };
  },

  applyToProjectClips: (
    project: VideoProject,
    tpl: EditTemplate
  ): VideoProject => ({
    ...project,
    clips: project.clips.map((c) => editTemplateService.applyLook(c, tpl)),
    updatedAt: new Date().toISOString(),
  }),
};
