/**
 * Invite service — hybrid join (best-product path).
 *
 * - Email invite → push + membership INVITED for that account
 * - Share link `vydora://invite/<projectId>` → always opens Accept screen
 * - Wrong account → clear CTA to request join (Owner admits)
 * - Matching account → Accept
 *
 * Deep-link token === projectId (backend has no opaque invite tokens yet).
 */
import { CONFIG } from '../config';
import { apiRequest } from './apiClient';
import {
  ApiProject,
  mapMemberRoleFromApi,
  mapMemberRoleToApi,
} from './mappers';
import { memberService } from './membersServvice';

export type InviteRole = 'Owner' | 'Editor' | 'Viewer';

export type InvitePreviewState =
  | 'LOGIN_REQUIRED'
  | 'CAN_ACCEPT'
  | 'ALREADY_ACTIVE'
  | 'JOIN_REQUEST_PENDING'
  | 'CAN_REQUEST_JOIN'
  | 'NOT_FOUND';

export interface SendInvitePayload {
  projectId: string;
  emails: string[];
  role: InviteRole;
  message?: string;
}

export interface SentInvite {
  email: string;
  token: string;
  inviteLink: string;
}

export interface SendInviteResult {
  success: boolean;
  invitesSent: number;
  invites: SentInvite[];
  inviteLink: string;
  /** >0 when Editor invites need host (Owner) admit. */
  pendingApprovalCount?: number;
}

export interface InviteDetails {
  token: string;
  projectId: string;
  projectName: string;
  projectThumbnailUrl: string;
  inviterName: string;
  inviteeEmail: string;
  yourEmail?: string;
  role: InviteRole;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  /** Hybrid accept-screen state from invite-preview. */
  state?: InvitePreviewState;
}

export interface AcceptInviteResult {
  success: boolean;
  projectId: string;
}

export interface DeclineInviteResult {
  success: boolean;
}

function shareLinkForProject(projectId: string): string {
  return `vydora.io/invite/${projectId}`;
}

function deepLinkForProject(projectId: string): string {
  return `vydora://invite/${projectId}`;
}

/**
 * Invite each email via the members API.
 */
export async function sendInvite(
  projectId: string,
  emails: string[],
  role: InviteRole | string,
  _message?: string,
  accessToken?: string
): Promise<SendInviteResult> {
  if (CONFIG.USE_MOCK) {
    throw new Error('Mock invites disabled — use the real members/invite API.');
  }

  const token = accessToken || '';
  const invites: SentInvite[] = [];

  let pendingApprovalCount = 0;
  for (const email of emails) {
    const member = await memberService.inviteMember(
      projectId,
      email,
      role as InviteRole,
      token
    );
    if ((member as { status?: string }).status === 'PENDING_APPROVAL') {
      pendingApprovalCount += 1;
    }
    invites.push({
      email,
      token: projectId,
      inviteLink: shareLinkForProject(projectId),
    });
  }

  return {
    success: true,
    invitesSent: invites.length,
    invites,
    inviteLink: shareLinkForProject(projectId),
    pendingApprovalCount,
  };
}

type ApiInvitePreview = {
  projectId: string;
  projectTitle: string;
  thumbnailUrl?: string | null;
  inviterName?: string | null;
  yourEmail?: string | null;
  state: InvitePreviewState;
  role?: string | null;
  message?: string | null;
};

function mapPreview(projectId: string, data: ApiInvitePreview): InviteDetails {
  const role = (data.role as InviteRole) || 'Editor';
  const state = data.state;
  let status: InviteDetails['status'] = 'pending';
  if (state === 'ALREADY_ACTIVE') status = 'accepted';
  if (state === 'NOT_FOUND') status = 'expired';

  return {
    token: projectId,
    projectId: data.projectId || projectId,
    projectName: data.projectTitle || 'Project invite',
    projectThumbnailUrl:
      data.thumbnailUrl ||
      'https://placehold.co/400x225/1a1a1a/F5C518?text=Vydora',
    inviterName: data.inviterName || 'A teammate',
    inviteeEmail: data.yourEmail || '',
    yourEmail: data.yourEmail || undefined,
    role,
    message: data.message || undefined,
    status,
    state,
  };
}

/**
 * Load invite presentation + personalized join state for AcceptInviteScreen.
 */
export async function getInviteByToken(token: string): Promise<InviteDetails> {
  if (CONFIG.USE_MOCK) {
    throw new Error('Mock invites disabled.');
  }

  const projectId = token;
  try {
    const data = await apiRequest<ApiInvitePreview>(
      `/projects/${projectId}/members/invite-preview`,
      { skipRefresh: true }
    );
    return mapPreview(projectId, data);
  } catch {
    // Offline / old server fallback.
    try {
      const project = await apiRequest<ApiProject>(`/projects/${projectId}`);
      return {
        token: projectId,
        projectId: project.id,
        projectName: project.title,
        projectThumbnailUrl:
          project.thumbnailUrl ||
          'https://placehold.co/400x225/1a1a1a/F5C518?text=Vydora',
        inviterName: 'A teammate',
        inviteeEmail: '',
        role: 'Editor',
        status: 'pending',
        state: 'CAN_REQUEST_JOIN',
        message: 'Request to join this project — the Owner will Admit you.',
      };
    } catch {
      return {
        token: projectId,
        projectId,
        projectName: 'Project invite',
        projectThumbnailUrl:
          'https://placehold.co/400x225/1a1a1a/F5C518?text=Vydora',
        inviterName: 'A teammate',
        inviteeEmail: '',
        role: 'Editor',
        status: 'pending',
        state: 'LOGIN_REQUIRED',
        message: 'Sign in to accept this invite or request to join.',
      };
    }
  }
}

/**
 * Current user requests to join via the share link (Owner admit queue).
 */
export async function requestJoinViaLink(
  projectId: string,
  role: InviteRole = 'Editor'
): Promise<{ status: string }> {
  if (CONFIG.USE_MOCK) throw new Error('Mock invites disabled.');
  const data = await apiRequest<{ status: string }>(
    `/projects/${projectId}/members/join-request?role=${encodeURIComponent(role)}`,
    { method: 'POST' }
  );
  return { status: data.status || 'PENDING_APPROVAL' };
}

/**
 * Accept membership for the logged-in user.
 */
export async function acceptInvite(
  token: string,
  userId?: string,
  accessToken?: string
): Promise<AcceptInviteResult> {
  if (CONFIG.USE_MOCK) throw new Error('Mock invites disabled.');
  if (!userId) {
    throw new Error('You must be signed in to accept an invite.');
  }
  const projectId = token;
  await memberService.acceptInvite(projectId, userId, accessToken || '');
  return { success: true, projectId };
}

export async function declineInvite(
  token: string,
  userId?: string,
  accessToken?: string
): Promise<DeclineInviteResult> {
  if (CONFIG.USE_MOCK) throw new Error('Mock invites disabled.');
  if (!userId) {
    throw new Error('You must be signed in to decline an invite.');
  }
  const projectId = token;
  await memberService.declineInvite(projectId, userId, accessToken || '');
  return { success: true };
}

export { mapMemberRoleFromApi, mapMemberRoleToApi, deepLinkForProject, shareLinkForProject };
