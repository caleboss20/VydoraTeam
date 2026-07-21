// ─── User ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  avatarUrl?: string;
  /** Soft Pro from referral / promo. */
  isPro?: boolean;
  plan?: string;
  proUntil?: string;
  referralCode?: string;
}
// ─── Project ─────────────────────────────────────────────────────────────────
export type ProjectStatus = 'Active' | 'Archived' | 'Draft' | 'FinalLocked';
export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  ownerId: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  visibility: 'Private' | 'Team' | 'Public';
  members: Pick<Member, 'id' | 'initials' | 'color' | 'online'>[];
  /** Caller's role on this project (from list/get API). */
  myRole?: MemberRole;
}
// ─── Clip (collaboration/project-detail clip metadata) ────────────────────────
export interface Clip {
  id: string;
  projectId: string;
  title: string;
  duration: string;
  resolution: string;
  uploadedAt: string;
  uploadedBy: string;
  /** CDN URL from upload — used for playback / teammate sync */
  videoUrl?: string;
  thumbnailUrl?: string;
}
// ─── Member ──────────────────────────────────────────────────────────────────
export type MemberRole = 'Owner' | 'Editor' | 'Viewer';
/** Mirrors backend statuses — INVITED = invitee pending; PENDING_APPROVAL = waiting on Owner admit. */
export type MemberInviteStatus = 'INVITED' | 'ACTIVE' | 'PENDING_APPROVAL';
export interface Member {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  initials: string;
  color: string;
  role: MemberRole;
  online: boolean;
  /** Present on real API members; used by Team Members screen. */
  email?: string;
  /** Profile photo URL from the linked user account. */
  avatarUrl?: string;
  /** ACTIVE = full member; INVITED = invitee pending; PENDING_APPROVAL = host admit. */
  status?: MemberInviteStatus;
  /** ISO timestamp from backend `joinedAt` (invite sent / accepted time). */
  joinedAt?: string;
}
// ─── Comment ─────────────────────────────────────────────────────────────────
export interface Comment {
  id: string;
  projectId: string;
  clipId: string;
  authorId: string;
  author: string;
  initials: string;
  color: string;
  text: string;
  timestamp: string;
  /** Frame-accurate position on the project timeline (ms) */
  timecodeMs?: number;
  timecodeLabel?: string;
  /** Normalized pin on the preview canvas (0–1). */
  canvasX?: number;
  canvasY?: number;
  /** Reviewer marked this feedback done */
  resolved?: boolean;
}
// ─── Chat message (project-wide group chat) ───────────────────────────────────
export interface ChatMessage {
  id: string;
  projectId: string;
  userId: string;
  author: string;
  initials: string;
  color: string;
  avatarUrl?: string;
  text: string;
  /** Relative label for display, e.g. "2m ago". */
  timestamp: string;
  /** ISO creation time from the backend — used for ordering. */
  createdAt: string;
}
// ─── Notification ────────────────────────────────────────────────────────────
export type NotificationType =
  | 'invite'
  | 'invite_approval'
  | 'comment'
  | 'clip_upload'
  | 'role_change'
  | 'role_upgrade';
export interface Notification {
  id: string;
  type: NotificationType;
  /** Actor display name (e.g. "Maya Alvarez") */
  title: string;
  /** Action phrase (e.g. "commented on your clip at 0:24") */
  message: string;
  read: boolean;
  createdAt: string;
  projectId?: string;
  /** Project label for the yellow link row — only when a real project is attached */
  projectName?: string;
}
// ─── Video Project (editor domain) ────────────────────────────────────────────
export type TextAnimationType =
  | 'fade'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'zoom'
  | 'none'
  | 'typewriter'
  | 'pop'
  | 'bounce'
  | 'bounceDrop'
  | 'elastic'
  | 'spin'
  | 'flip'
  | 'wave'
  | 'glitch'
  | 'sparkle'
  | 'pulse'
  | 'shake'
  | 'jiggle'
  | 'float'
  | 'swing'
  | 'rubberBand'
  | 'tada'
  | 'flash'
  | 'hinge'
  /** CapCut/VN linear wipe reveal (mask-style in-anim). */
  | 'reveal'
  /** Alight Motion–style ghost trail / echo. */
  | 'ghost';

/** How text composites over the video (Alight Motion Blending). */
export type TextBlendMode = 'normal' | 'screen' | 'multiply' | 'add' | 'overlay';

/** Word timing for true karaoke (highlight-in-line) captions. */
export type KaraokeWord = {
  text: string;
  startMs: number;
  endMs: number;
};

export type TextOverlay = {
  id: string;
  text: string;
  clipId: string;
  /** Clip-local start (ms); export maps this through trim + speed. */
  startMs: number;
  durationMs: number;
  /** Glyph fill — Text tool "Text color" swatches. */
  color?: string;
  isAiGenerated?: boolean; // powers the sparkles icon e.g. "Emotions"
  /** 0–1 normalized center in the preview (drag to reposition). */
  x?:number;
  y?:number;
  fontSize?:number;
  fontWeight?:'normal'|'bold';
  /** RN font family (System, sans-serif, etc.). Preview uses it; export maps when possible. */
  fontFamily?: string;
  align?:'left'|'center'|'right';
  /**
   * CapCut-style pill behind the text. Undefined / omit = no background.
   * Baked on export via FFmpeg drawtext box=1.
   */
  backgroundColor?:string;
  /** 0–1; used with backgroundColor in preview + export. */
  backgroundOpacity?:number;
  backgroundRadius?:number;
  strokeColor?:string|undefined;
  strokeWidth?:number;
  animationIn?: TextAnimationType;
  animationOut?: TextAnimationType;
  /** Loops while the text is on screen (bounce / pulse / float…). */
  animationLoop?: TextAnimationType;
  /** In/out duration in ms (VN-style Duration slider). Default ~500. */
  animationDurationMs?: number;
  /** Alight Motion–style blending over the plate. */
  blendMode?: TextBlendMode;
  /** Layer opacity 0–1 (Blending & Opacity panel). */
  textOpacity?: number;
  /**
   * True karaoke: full line stays visible; the active word uses highlightColor.
   * Word times are clip-local (same clock as startMs).
   */
  karaokeWords?: KaraokeWord[];
  /** Active-word color for karaokeWords (default brand yellow). */
  highlightColor?: string;
  /**
   * Motion-track / manual position diamonds (clip-local ms).
   * When set, preview + export lerp x/y like media overlays.
   */
  keyframes?: TextPositionKeyframe[];
  /**
   * CapCut-style mask on text (Split / Linear reveal behind subject).
   * Keyframe mask.centerX to walk the reveal line with the person.
   */
  mask?: OverlayMask;
  /** Speaker diarization — colored / labeled by who spoke. */
  speakerId?: string;
  speakerLabel?: string;
};

/** Position track for text overlays (motion tracking / manual diamonds). */
export type TextPositionKeyframe = {
  timeMs: number;
  x: number;
  y: number;
};

export type VideoSegment = {
  id: string;
  startMs: number;   // in-point within the original clip
  endMs: number;     // out-point within the original clip
  transitionOut?: {  // transition into the NEXT segment, undefined = hard cut
    type: 'crossfade' | 'wipe' | 'none';
    durationMs: number;
  };
};



export type ClipTransitionType =
  | 'none'
  | 'crossfade'
  | 'wipe'
  | 'slide'
  | 'zoom'
  | 'whip'
  | 'glitch'
  | 'dissolve'
  | 'fadeblack'
  | 'fadewhite'
  | 'circle'
  | 'radial'
  | 'pixelate'
  | 'smoothleft'
  | 'smoothright';

export interface ClipTransition {
  type: ClipTransitionType;
  durationMs: number;
}

// ─── Speed curves (CapCut-style variable speed presets) ───────────────────────
/**
 * Identifier of a curve preset (see services/speedCurves.ts for the actual
 * segment definitions). 'none' / undefined = constant `speed` applies.
 */
export type SpeedCurveId = 'none' | 'montage' | 'hero' | 'bullet' | 'jumpcut';

/** One camera angle in a synced multi-cam group (A-roll / B-roll). */
export type CamAngle = {
  id: string;
  uri: string;
  label: string;
  /**
   * Sync clock: primaryMediaTime = angleMediaTime + offsetMs.
   * Cam A is usually 0; Cam B is the audio-correlation lag from sync.
   */
  offsetMs: number;
  durationMs: number;
  thumbnailUri?: string;
};

export type MultiCamGroup = {
  groupId: string;
  angles: CamAngle[];
  /** Which angle this timeline piece is showing. */
  angleId: string;
};

/**
 * Colored blank sheet — intro/outro cards (e.g. “Welcome to Amalife Clinic”).
 * Timeline duration = durationMs; no camera footage.
 */
export type TitleCardSettings = {
  backgroundColor: string;
  title: string;
  subtitle?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  animationIn?: TextAnimationType;
  animationLoop?: TextAnimationType;
};

export type VideoClip = {
  id: string;
  /**
   * Media URI. Empty / unused when {@link kind} === 'title'
   * (solid color sheet generated on preview + export).
   * For {@link kind} === 'flyer' this is the still-image URI.
   */
  uri: string;
  durationMs: number;
  width?: number;
  height?: number;
  thumbnailUri?: string;
  order: number;
  /** Default video; `title` = blank colored page; `flyer` = still image sheet. */
  kind?: 'video' | 'title' | 'flyer';
  titleCard?: TitleCardSettings;
  textOverlays?: TextOverlay[];
  trimStartMs?: number; // ADDED: defaults to 0 if unset
  trimEndMs?: number;   // ADDED: defaults to durationMs if unset
 segments?: VideoSegment[];
  volume?:number;
  speed?:number;
  /**
   * Variable-speed preset. Preview plays at the curve's average speed;
   * the export bakes the real per-segment speeds (slow-fast-slow etc).
   */
  speedCurve?: SpeedCurveId;
  /** Play the clip backwards. Baked on export; preview plays forward. */
  reversed?: boolean;
  filterId?:string;
  /** CapCut-style motion/look effects beyond tint filters. */
  effectId?: ClipEffectId;
  /** 0–1 intensity for blur / vignette / shake / zoom punch. */
  effectIntensity?: number;
  /** One-tap cinematic bundle (flashback / dream / rewind…). */
  movieEffectId?: MovieEffectId;
  /** Manual color grade (eq / temperature) on top of the tint filter. */
  colorGrade?: ColorGrade;
  cropRatioId?: string;   // references CropRatioPreset.id; undefined = uncropped/original
  cropOffsetX?: number;   // 0 to 1, horizontal position of the crop box within the frame
  cropOffsetY?: number;   // 0 to 1, vertical position of the crop box within the frame
  cropZoom?: number;      // 1 = no zoom, >1 = zoomed in, used with offsets to pan around
  transitionOut?: ClipTransition;
  /** Synced multi-cam angles; director cuts switch angleId + remap trims. */
  multiCam?: MultiCamGroup;
  /** Deshake / stabilize (baked on export). */
  stabilize?: StabilizeSettings;
  /** 9:16 smart reframe that follows motion/face energy over time. */
  autoReframe?: AutoReframeSettings;
  /** Per-clip mix bus: NR, speech enhance, EQ, compressor. */
  audioFx?: ClipAudioFx;
  /** Dark / gradient color wash (preview + export). */
  lookOverlay?: ClipLookOverlay;
  /**
   * CapCut-style property keyframes (clip-local ms). Scalars above are the
   * baseline when a curve is empty.
   */
  volumeKeyframes?: ScalarKeyframe[];
  /** Clip opacity over time (0–1); preview + export fade the picture. */
  opacity?: number;
  opacityKeyframes?: ScalarKeyframe[];
  /**
   * Camera-tilt rotation in degrees (−180…180). Filmora-style Dutch angle /
   * “turn the camera”. Preview + export fill the frame (no black corners).
   */
  rotation?: number;
  /** Animate the camera tilt over clip-local time (degrees). */
  rotationKeyframes?: ScalarKeyframe[];
  /**
   * Canva-style free placement on the canvas (normalized center 0–1).
   * Defaults 0.5 / 0.5 — drag the person wherever you want.
   */
  layoutX?: number;
  layoutY?: number;
  /** 1 = fill cover; <1 smaller floating layer; >1 zoomed. */
  layoutScale?: number;
  /** Mirror horizontally / vertically. */
  flipH?: boolean;
  flipV?: boolean;
  /**
   * Background remover — chromakey cut so the subject floats on the blank
   * canvas (green/blue/custom). Auto uses a sampled edge key on export.
   */
  bgRemove?: BgRemoveSettings;
  colorGradeKeyframes?: ColorGradeKeyframe[];
  cropKeyframes?: CropKeyframe[];
  /**
   * When set, this clip belongs to a compound/nested group (CapCut compound clip).
   * Export flattens — groups are a timeline UX convenience.
   */
  compoundId?: string;
  /** RGB master curves (−1…1 control points simplified to mid lift). */
  colorCurves?: ColorCurves;
  /** Local/cached .cube LUT path applied on export via lut3d. */
  lutUri?: string;
  lutIntensity?: number;
};

/** CapCut-style RGB curves — mid control per channel (−1…1). */
export type ColorCurves = {
  master: number;
  r: number;
  g: number;
  b: number;
};

export const DEFAULT_COLOR_CURVES: ColorCurves = {
  master: 0,
  r: 0,
  g: 0,
  b: 0,
};

/** Time-ranged look applied over clips without mutating them. */
export type AdjustmentLayer = {
  id: string;
  startMs: number;
  durationMs: number;
  colorGrade?: ColorGrade;
  opacity?: number;
  effectId?: ClipEffectId;
  effectIntensity?: number;
  name?: string;
};

/** Compound / nested clip group metadata. */
export type CompoundGroup = {
  id: string;
  name: string;
  collapsed: boolean;
};
/** Canva-style cutout — subject kept, backdrop keyed out onto canvasColor. */
export type BgRemoveSettings = {
  enabled: boolean;
  mode: 'auto' | 'green' | 'blue' | 'custom';
  /** Used when mode === custom (and as override). */
  color?: string;
  similarity?: number;
  blend?: number;
};

/** Generic scalar diamond on the clip timeline. */
export type ScalarKeyframe = {
  timeMs: number;
  value: number;
};

export type ColorGradeKeyframe = {
  timeMs: number;
  grade: ColorGrade;
};

export type CropKeyframe = {
  timeMs: number;
  cropOffsetX: number;
  cropOffsetY: number;
  cropZoom: number;
};

/** Warp stabilizer — shakiness 0–1 (higher = stronger deshake). */
export type StabilizeSettings = {
  enabled: boolean;
  shakiness?: number;
};

/** One keyframe for auto-reframe crop center (0–1 along the long axis). */
export type ReframeKeyframe = {
  timeMs: number;
  /** Horizontal center of the 9:16 window in the source (0–1). */
  x: number;
};

export type AutoReframeSettings = {
  enabled: boolean;
  /** Target aspect preset id — default tiktok (9:16). */
  ratioId?: string;
  keyframes?: ReframeKeyframe[];
};

/** Clip audio processing — preview approximates; export bakes with FFmpeg. */
export type ClipAudioFx = {
  /** 0–1 noise reduction strength (afftdn). */
  noiseReduction?: number;
  /** Presence boost + light compression for dialogue. */
  enhanceSpeech?: boolean;
  /** 0–1 strength when enhanceSpeech is on (default 0.75). */
  enhanceStrength?: number;
  /** 5-band EQ gains (−1…1 → ≈ −12…+12 dB). */
  eqSub?: number;
  eqLow?: number;
  eqMid?: number;
  eqPresence?: number;
  eqHigh?: number;
  eqAir?: number;
  /** Compressor on/off. */
  compressor?: boolean;
  /** −40…−5 dB threshold (default −18). */
  compThreshold?: number;
  /** 1–8 ratio (default 3). */
  compRatio?: number;
  /** 0–1 de-esser (cuts harsh 6–8 kHz sibilance). */
  deEsser?: number;
  /** 0–1 noise gate (cuts quiet hiss between words). */
  gate?: number;
};

export const DEFAULT_AUDIO_FX: ClipAudioFx = {
  noiseReduction: 0,
  enhanceSpeech: false,
  enhanceStrength: 0.75,
  eqSub: 0,
  eqLow: 0,
  eqMid: 0,
  eqPresence: 0,
  eqHigh: 0,
  eqAir: 0,
  compressor: false,
  compThreshold: -18,
  compRatio: 3,
  deEsser: 0,
  gate: 0,
};

/** Dark scrim + gradient wash over a clip (CapCut-style look overlay). */
export type ClipLookOverlay = {
  /** Black dim 0–1. */
  darkOpacity?: number;
  /** Gradient wash strength 0–1. */
  gradientOpacity?: number;
  gradientColorTop?: string;
  gradientColorBottom?: string;
  /** 0 = top→bottom, 90 = left→right (degrees). */
  gradientAngle?: number;
};

export const DEFAULT_LOOK_OVERLAY: ClipLookOverlay = {
  darkOpacity: 0,
  gradientOpacity: 0,
  gradientColorTop: '#000000',
  gradientColorBottom: '#F5C518',
  gradientAngle: 0,
};

/** Motion / polish effects baked with FFmpeg (preview approximates). */
export type ClipEffectId =
  | 'none'
  | 'blur'
  | 'vignette'
  | 'shake'
  | 'zoomPunch'
  | 'zoomIn'
  | 'zoomOut'
  | 'panLeft'
  | 'panRight'
  | 'bounce'
  | 'spin'
  | 'filmGrain'
  | 'lightning'
  | 'dust';

/** One-tap cinematic look bundles (see movieEffectsService). */
export type MovieEffectId =
  | 'none'
  | 'flashback'
  | 'dream'
  | 'rewind'
  | 'slowMo'
  | 'memory'
  | 'impact'
  | 'vhs'
  | 'beauty'
  | 'enhance'
  | 'glow';

/** Manual grade knobs — all centered at 0 = unchanged. */
export type ColorGrade = {
  /** -1 … 1 (0 = neutral) */
  brightness: number;
  /** -1 … 1 */
  contrast: number;
  /** -1 … 1 */
  saturation: number;
  /** -1 … 1 (cool ← → warm) */
  temperature: number;
};

export const DEFAULT_COLOR_GRADE: ColorGrade = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
};

// ─── Media overlays (multi-track: PiP video, images/GIFs, emoji stickers) ────
export type MediaOverlayType = 'image' | 'video' | 'emoji';

/**
 * A recorded transform at a point on the project timeline. With 2+ keyframes,
 * playback interpolates position/scale/rotation/opacity between them
 * (CapCut-style keyframe animation).
 */
export type OverlayKeyframe = {
  timeMs: number;    // project-timeline time this keyframe applies at
  x: number;         // 0–1 normalized center position in the preview
  y: number;
  scale: number;     // 1 = base size
  rotation: number;  // degrees
  opacity: number;   // 0–1
};

// ─── Voiceover (narration recorded over the timeline) ─────────────────────────
/** One recorded narration take, positioned on the project timeline. */
export type VoiceoverClip = {
  id: string;
  /** Local recording file URI (uploaded to a remote URL at export time). */
  uri: string;
  /** Where on the project timeline this narration starts. */
  startMs: number;
  durationMs: number;
  /** 0–2 (1 = recorded level). */
  volume: number;
};

/** Chroma-key (green/blue screen) settings for a media overlay. */
export type ChromaKeySettings = {
  enabled: boolean;
  /** Key color hex, e.g. #00FF00. */
  color: string;
  /** 0.01–1 how aggressively to cut the key (FFmpeg similarity). */
  similarity: number;
  /** 0–1 edge softness (FFmpeg blend). */
  blend: number;
  /** Optional plate shown behind the keyed subject (preview + export). */
  backgroundUri?: string;
};

/**
 * CapCut-style mask on a media overlay (PiP / image).
 * Coordinates are local to the overlay box (0–1). Soft edges use feather.
 */
export type OverlayMaskShape =
  | 'none'
  | 'circle'
  | 'rectangle'
  | 'linear'
  | 'linearH'
  | 'radial'
  | 'heart'
  | 'star'
  | 'splitLR'
  | 'splitTB'
  | 'splitDiag';

export type OverlayMaskKeyframe = {
  timeMs: number;
  centerX: number;
  centerY: number;
  scale: number;
  rotation: number;
};

export type OverlayMask = {
  enabled: boolean;
  shape: OverlayMaskShape;
  /** 0–1 edge softness ( CapCut feather ). */
  feather: number;
  /** Flip visible / hidden regions. */
  invert: boolean;
  /** Mask center inside the overlay (0–1). */
  centerX: number;
  centerY: number;
  /** Mask size relative to overlay (0.15–1.6). */
  scale: number;
  /** Degrees — linear / split / rectangle. */
  rotation: number;
  /**
   * When true, Track bakes subject motion onto the overlay (and keeps the
   * mask locked to overlay-local center) — CapCut “follow”.
   */
  followMotion?: boolean;
  /** Optional animated mask transform (preview + first-kf export). */
  keyframes?: OverlayMaskKeyframe[];
};

/** An overlay element living on its own timeline track above the video. */
export type MediaOverlay = {
  id: string;
  type: MediaOverlayType;
  /** Image/video URI. For 'emoji' this is the emoji character itself. */
  uri: string;
  /** Visibility window on the project timeline. */
  startMs: number;
  durationMs: number;
  x: number;         // 0–1 normalized (base transform when no keyframes)
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  /** Kept sorted by timeMs. */
  keyframes?: OverlayKeyframe[];
  /** Green/blue screen key — baked with FFmpeg chromakey on export. */
  chromaKey?: ChromaKeySettings;
  /** Shape / gradient mask (CapCut Mask tool). */
  mask?: OverlayMask;
  flipH?: boolean;
  flipV?: boolean;
  /** CapCut entrance animation for stickers / PiP. */
  animationIn?: TextAnimationType;
  /** Guest / speaker name shown under profile photos. */
  label?: string;
  /** Optional role line under the label (e.g. “Keynote”). */
  role?: string;
};

export type VideoProject = {
  id: string;
  projectId:string;
  title: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  clips: VideoClip[];
  /**
   * Canva blank canvas behind free-placed clips (hex). Default #000000.
   * Shows through when layoutScale < 1 or BG remover is on.
   */
  canvasColor?: string;
  coverThumbnailUri?: string;
  totalDurationMs: number;
  backgroundMusic?: BackgroundMusic;
  /**
   * Multi music / SFX tracks on the timeline. Prefer this over singular
   * `backgroundMusic` (kept in sync as tracks[0] for older code paths).
   */
  musicTracks?: BackgroundMusic[];
  /** Multi-track media overlays (PiP video, images/GIFs, emoji stickers). */
  overlays?: MediaOverlay[];
  /** Recorded narration takes on their own timeline track. */
  voiceovers?: VoiceoverClip[];
  /**
   * Beat / cut markers on the project timeline (ms). Split snaps to the
   * nearest marker within a small window — CapCut-style beat sync.
   */
  beatMarkersMs?: number[];
  /** Nested compound clip groups (timeline UX). */
  compounds?: CompoundGroup[];
  /** Adjustment layers spanning project time. */
  adjustmentLayers?: AdjustmentLayer[];
  /** Shared team brand kit (synced via version / AsyncStorage for now). */
  brandKit?: BrandKitSnapshot;
};

/** Lightweight brand kit persisted on the project for all members. */
export type BrandKitSnapshot = {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  logoUri?: string;
  updatedAt?: string;
};
export interface VideoFilter{
id:string;
name:string;
thumbnailUri?:string;
tintColor:string;
tintOpacity:number;
intensity?:number;
}

export interface CropRatioPreset {
id:string
label:string;
ratioLabel:string;
ratioValue:number;
}


// ─── Export ────────────────────────────────────────────────────────────────
export type ExportStatus = 'Ready' | 'Processing' | 'Failed';
export interface Export {
  id: string;
  fileUrl?:string;
  projectId: string;
  projectName: string;
  title: string;
  resolution: string;
  format: string;
  sizeMb: number;
  status: ExportStatus;
  isFinal?: boolean;
  errorMessage?: string;
  createdAt: string;
}




// ─── Version (version history domain) ────────────────────────────────────────
export type VersionKind = 'auto' | 'named' | 'pre_restore';

export type VersionSnapshot = {
  schemaVersion: 1;
  videoProject: VideoProject;
  savedAt: string;
};

export interface ProjectVersion {
  id: string;
  versionNumber: number;
  projectId: string;
  /** Optional named checkpoint label. */
  name?: string;
  kind?: VersionKind;
  author: Pick<Member, 'id' | 'name' | 'initials' | 'color'>;
  createdAt: string;
  isCurrent: boolean;
  isRestored: boolean;
  changeSummary?: string;
  thumbnailUrl?: string;
  /** Present after create / get / restore — used to apply editor state. */
  snapshot?: VersionSnapshot;
}
export interface VersionHistoryState {
  versions: ProjectVersion[];
  loading: boolean;
  error: string | null;
  restoringVersionId: string | null;
}
export interface VersionListItem extends ProjectVersion {
  relativeTime: string;
}
export interface VersionRowProps {
  version: VersionListItem;
  isLast: boolean;
  isRestoring: boolean;
  onRestore: (versionId: string) => void;
}
export type VersionHistoryScreenParams = {
  projectId: string;
};



export interface BackgroundMusic {
  /** Stable id once on a multi-track list. */
  id?: string;
  uri: string;
  volume: number;
  startMs: number;
  trimStartMs?: number;
  trimEndMs?: number;
  durationMs?: number;
  /** CapCut-style fade in at the start of the audible window (ms). */
  fadeInMs?: number;
  /** CapCut-style fade out at the end of the audible window (ms). */
  fadeOutMs?: number;
  /**
   * When true (default), music volume dips under overlapping voiceovers
   * on export (and lightly in preview).
   */
  duckUnderVoiceover?: boolean;
  /**
   * Volume multiplier while ducked (0–1). Default ~0.28.
   * Lower = more ducking under VO.
   */
  duckLevel?: number;
  /** Optional display name (library track title). */
  title?: string;
}




