// ── types─ User ────────────────────────────────────────────────────────────────────
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
}
// ─── Clip ────────────────────────────────────────────────────────────────────
export interface Clip {
  id: string;
  projectId: string;
  title: string;
  duration: string;
  resolution: string;
  uploadedAt: string;
  uploadedBy: string;
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