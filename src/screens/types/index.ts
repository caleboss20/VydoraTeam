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
export type TextOverlay = {
  id: string;
  text: string;
  clipId: string;
  startMs: number;
  durationMs: number;
  color?: string;
  isAiGenerated?: boolean; // powers the sparkles icon e.g. "Emotions"
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
};

export type VideoProject = {
  id: string;
  title: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  clips: VideoClip[];
  coverThumbnailUri?: string;
  totalDurationMs: number;
};
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