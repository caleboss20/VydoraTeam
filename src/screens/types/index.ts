// ─── User ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  avatarUrl?: string;
}
// ─── Project ─────────────────────────────────────────────────────────────────
export type ProjectStatus = 'Active' | 'Archived' | 'Draft';
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
  thumbnailUrl?: string;
}
// ─── Member ──────────────────────────────────────────────────────────────────
export type MemberRole = 'Owner' | 'Editor' | 'Viewer';
export interface Member {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  initials: string;
  color: string;
  role: MemberRole;
  online: boolean;
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
}
// ─── Notification ────────────────────────────────────────────────────────────
export type NotificationType = 'invite' | 'comment' | 'clip_upload' | 'role_change';
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  projectId?: string;
}
// ─── Video Project (editor domain) ────────────────────────────────────────────
export type TextAnimationType = 'fade' | 'slideUp' | 'slideDown' | 'zoom' | 'none'|'typewriter'|'pop'|'bounce'|'spin'|'flip'|'wave'|'glitch'|'sparkle'|'pulse'|'shake'|'jiggle'|'float'|'swing'|'rubberBand'|'tada'|'flash'|'hinge';

export type TextOverlay = {
  id: string;
  text: string;
  clipId: string;
  startMs: number;
  durationMs: number;
  color?: string;
  isAiGenerated?: boolean; // powers the sparkles icon e.g. "Emotions"
  x?:number;
  y?:number;
  fontSize?:number;
  fontWeight?:'normal'|'bold';
  align?:'left'|'center'|'right';
  backgroundColor?:string;
  backgroundOpacity?:number;
  backgroundRadius?:number;
  strokeColor?:string|undefined;
  strokeWidth?:number;
  animationIn?:TextAnimationType;
  animationOut?:TextAnimationType;



};



export type VideoClip = {
  id: string;
  uri: string;
  durationMs: number;
  width?: number;
  height?: number;
  thumbnailUri?: string;
  order: number;
  textOverlays?: TextOverlay[];
  trimStartMs?: number; // ADDED: defaults to 0 if unset
  trimEndMs?: number;   // ADDED: defaults to durationMs if unset
  volume?:number;
  speed?:number;
  filterId?:string;
  cropRatioId?: string;   // references CropRatioPreset.id; undefined = uncropped/original
  cropOffsetX?: number;   // 0 to 1, horizontal position of the crop box within the frame
  cropOffsetY?: number;   // 0 to 1, vertical position of the crop box within the frame
  cropZoom?: number;      // 1 = no zoom, >1 = zoomed in, used with offsets to pan around
};

export type VideoProject = {
  id: string;
  projectId:string;
  title: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  clips: VideoClip[];
  coverThumbnailUri?: string;
  totalDurationMs: number;
  backgroundMusic?: BackgroundMusic;
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
id:string;
label:string;
ratioLabel:string;
ratioValue:number;
}


// ─── Export ────────────────────────────────────────────────────────────────
export type ExportStatus = 'Ready' | 'Processing' | 'Failed';
export interface Export {
  id: string;
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
export interface ProjectVersion {
  id: string;
  versionNumber: number;
  projectId: string;
  author: Pick<Member, 'id' | 'name' | 'initials' | 'color'>;
  createdAt: string;
  isCurrent: boolean;
  isRestored: boolean;
  changeSummary?: string;
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



export interface BackgroundMusic{
uri:string;
volume:number;
startMs:number;
trimStartMs?:number;
trimEndMs?:number;
durationMs?:number;
}




