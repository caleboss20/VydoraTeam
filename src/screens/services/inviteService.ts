/**
 * Invite service — adapted to the backend’s email-membership flow.
 *
 * The UI still speaks “invite tokens” and deep links (`vydora://invite/:token`).
 * The Spring API has no opaque invite tokens; instead:
 *   1. Owner calls POST /projects/{id}/members/invite { email, role }
 *   2. Invitee (logged in as that email) calls
 *        POST /projects/{id}/members/{userId}/accept|decline
 *
 * We therefore treat the deep-link “token” as the **projectId**. Share links
 * look like `vydora.io/invite/<projectId>` so AcceptInviteScreen keeps working
 * without UI changes. Auth is required for accept/decline and for loading
 * project details when logged in.
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
}

export interface InviteDetails {
  token: string;
  projectId: string;
  projectName: string;
  projectThumbnailUrl: string;
  inviterName: string;
  inviteeEmail: string;
  role: InviteRole;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
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

/**
 * Invite each email via the members API.
 * `accessToken` is unused directly (apiClient holds it) but kept so call sites
 * can pass auth explicitly once InviteContext wires useAuth.
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

  for (const email of emails) {
    await memberService.inviteMember(projectId, email, role as InviteRole, token);
    invites.push({
      email,
      // Deep-link token === projectId (see file header).
      token: projectId,
      inviteLink: shareLinkForProject(projectId),
    });
  }

  return {
    success: true,
    invitesSent: invites.length,
    invites,
    inviteLink: shareLinkForProject(projectId),
  };
}

/**
 * Load invite presentation data for AcceptInviteScreen.
 * `token` is the projectId embedded in the deep link.
 */
export async function getInviteByToken(token: string): Promise<InviteDetails> {
  if (CONFIG.USE_MOCK) {
    throw new Error('Mock invites disabled.');
  }

  const projectId = token;
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
    };
  } catch {
    // Logged-out users (or non-members) cannot GET the project yet.
    // Still return enough for the Accept screen to render and prompt login.
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
    };
  }
}

/**
 * Accept membership for the logged-in user.
 * Requires `userId` of the current user (from AuthContext).
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

// Re-export helpers used by invite UI if role labels need mapping later.
export { mapMemberRoleFromApi, mapMemberRoleToApi };
