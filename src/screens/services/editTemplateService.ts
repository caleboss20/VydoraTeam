/**
 * Edit templates — save a clip's look (filter, grade, effects, movie, speed,
 * text style) and reuse on another clip / project. Stored locally.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ClipEffectId,
  ColorGrade,
  MovieEffectId,
  SpeedCurveId,
  TextAnimationType,
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

  /** Merge template look onto a clip (caller persists via context). */
  applyLook: (clip: VideoClip, tpl: EditTemplate): VideoClip => ({
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
  }),

  applyToProjectClips: (
    project: VideoProject,
    tpl: EditTemplate
  ): VideoProject => ({
    ...project,
    clips: project.clips.map((c) => editTemplateService.applyLook(c, tpl)),
    updatedAt: new Date().toISOString(),
  }),
};
