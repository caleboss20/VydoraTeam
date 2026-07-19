/**
 * DTO ↔ UI mappers.
 *
 * The Expo screens keep Title-Case / friendly field names (`name`, `Owner`, `Ready`).
 * The Spring Boot API uses camelCase + UPPER_SNAKE enums (`title`, `OWNER`, `COMPLETED`).
 * Mapping here means screens never need style or layout changes when the wire format differs.
 */
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Clip,
  Comment,
  Export,
  ExportStatus,
  Member,
  MemberRole,
  Project,
  ProjectStatus,
  User,
} from '../types';

dayjs.extend(relativeTime);

const AVATAR_COLORS = [
  '#F5C518',
  '#4CAF50',
  '#E91E63',
  '#2196F3',
  '#FF9800',
  '#9C27B0',
  '#00BCD4',
  '#8BC34A',
];

/** Two-letter initials for avatar badges (UI-only; backend does not send these). */
export function initialsFromName(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable color from an id so the same user always gets the same badge hue. */
export function colorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < (id || '').length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Parse UI duration strings like `01:05` or `00:18` into seconds for CreateClipRequest. */
export function parseDurationToSeconds(duration: string): number {
  if (!duration) return 0;
  if (/^\d+(\.\d+)?$/.test(duration.trim())) return Number(duration);
  const parts = duration.split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

/** Build the User object screens expect from AuthResponse /me fields. */
export function mapAuthUser(data: {
  userId: string;
  name: string;
  email: string;
  initials?: string | null;
  color?: string | null;
  avatarUrl?: string | null;
}): User {
  return {
    id: data.userId,
    name: data.name,
    email: data.email,
    initials: data.initials?.trim() || initialsFromName(data.name),
    color: data.color?.trim() || colorFromId(data.userId),
    avatarUrl: data.avatarUrl || undefined,
  };
}

// ─── Projects ────────────────────────────────────────────────────────────────

/** Backend project status → Dashboard / ProjectDetail values (Title-Case on Supabase). */
export function mapProjectStatusFromApi(status: string): ProjectStatus {
  switch (status) {
    case 'Draft':
    case 'DRAFT':
      return 'Draft';
    case 'Archived':
    case 'PUBLISHED':
      return 'Archived';
    case 'Active':
    case 'IN_REVIEW':
    default:
      return 'Active';
  }
}

/** UI status → UpdateProjectRequest.status (matches DB CHECK: Active|Archived|Draft). */
export function mapProjectStatusToApi(status: ProjectStatus): string {
  return status;
}

export type ApiProject = {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  ownerId: string;
  status: string;
  visibility?: string | null;
  memberCount?: number;
  clipCount?: number;
  createdAt: string;
  updatedAt: string;
};

function mapVisibilityFromApi(
  visibility?: string | null
): 'Private' | 'Team' | 'Public' {
  if (visibility === 'Team' || visibility === 'Public') return visibility;
  return 'Private';
}

export function mapProjectFromApi(p: ApiProject): Project {
  return {
    id: p.id,
    // Screens bind `project.name`; API field is `title`.
    name: p.title,
    description: p.description || '',
    visibility: mapVisibilityFromApi(p.visibility),
    status: mapProjectStatusFromApi(p.status),
    ownerId: p.ownerId,
    thumbnailUrl: p.thumbnailUrl || undefined,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    members: [],
  };
}

// ─── Members ─────────────────────────────────────────────────────────────────

export function mapMemberRoleFromApi(role: string): MemberRole {
  switch ((role || '').toUpperCase()) {
    case 'OWNER':
      return 'Owner';
    case 'VIEWER':
      return 'Viewer';
    case 'EDITOR':
    default:
      return 'Editor';
  }
}

/**
 * Accepts Title-Case MemberRole or InviteMember lowercase keys.
 * Backend/DB now store Owner|Editor|Viewer.
 */
export function mapMemberRoleToApi(role: string): 'Owner' | 'Editor' | 'Viewer' {
  const r = (role || '').toUpperCase();
  if (r === 'OWNER' || r === 'ADMIN') return 'Owner';
  if (r === 'VIEWER') return 'Viewer';
  return 'Editor';
}

export type ApiMember = {
  userId: string;
  projectId: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  role: string;
  status: string;
  joinedAt: string;
};

export function mapMemberFromApi(m: ApiMember): Member {
  const status =
    (m.status || 'ACTIVE').toUpperCase() === 'INVITED' ? 'INVITED' : 'ACTIVE';
  return {
    // Screens key rows by `member.id`; backend membership PK is userId+projectId.
    id: m.userId,
    projectId: m.projectId,
    userId: m.userId,
    name: m.name,
    initials: initialsFromName(m.name),
    color: colorFromId(m.userId),
    role: mapMemberRoleFromApi(m.role),
    // Presence comes from WebSocket later; REST always starts offline.
    online: false,
    email: m.email || undefined,
    status,
    joinedAt: m.joinedAt,
  };
}

// ─── Clips ───────────────────────────────────────────────────────────────────

export type ApiClip = {
  id: string;
  projectId: string;
  title?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  durationSeconds: number;
  order: number;
  uploadedBy: string;
  status: string;
  createdAt: string;
};

export function mapClipFromApi(c: ApiClip): Clip {
  return {
    id: c.id,
    projectId: c.projectId,
    title: c.title || 'Untitled clip',
    duration: formatDuration(c.durationSeconds),
    // Resolution is not stored on the backend clip yet — keep a sensible UI default.
    resolution: '1080p',
    uploadedAt: c.createdAt,
    uploadedBy: c.uploadedBy,
    videoUrl: c.videoUrl || undefined,
    thumbnailUrl: c.thumbnailUrl || undefined,
  };
}

// ─── Comments ────────────────────────────────────────────────────────────────

export type ApiComment = {
  id: string;
  clipId: string;
  projectId: string;
  authorId: string;
  authorName: string;
  text: string;
  timestampSeconds: number;
  resolved: boolean;
  createdAt: string;
};

export function mapCommentFromApi(c: ApiComment): Comment {
  const secs = Math.max(0, Math.floor(c.timestampSeconds || 0));
  return {
    id: c.id,
    projectId: c.projectId,
    clipId: c.clipId,
    authorId: c.authorId,
    author: c.authorName,
    initials: initialsFromName(c.authorName),
    color: colorFromId(c.authorId),
    text: c.text,
    timestamp: dayjs(c.createdAt).fromNow(),
    timecodeMs: Math.round((c.timestampSeconds || 0) * 1000),
    timecodeLabel: formatDuration(secs),
  };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export type ApiExport = {
  id: string;
  projectId: string;
  requestedBy: string;
  format: string;
  resolution: string;
  status: string;
  progress: number;
  downloadUrl?: string | null;
  createdAt: string;
  completedAt?: string | null;
};

export function mapExportStatusFromApi(status: string): ExportStatus {
  const s = (status || '').toUpperCase();
  switch (s) {
    case 'READY':
    case 'COMPLETED':
      return 'Ready';
    case 'FAILED':
      return 'Failed';
    case 'QUEUED':
    case 'PROCESSING':
    default:
      return 'Processing';
  }
}

export function mapExportFromApi(e: ApiExport, projectName = 'Export'): Export {
  return {
    id: e.id,
    projectId: e.projectId,
    projectName,
    title: projectName,
    resolution: e.resolution,
    format: e.format,
    // Backend does not return file size yet.
    sizeMb: 0,
    status: mapExportStatusFromApi(e.status),
    createdAt: e.createdAt,
    fileUrl: e.downloadUrl || undefined,
  };
}
