// inviteService.ts
// Follows Vydora's existing six-service USE_MOCK pattern.
// Swap USE_MOCK to false once the Spring Boot backend is live on GitHub,
// and point BASE_URL at the real API host.

const USE_MOCK = true;

const BASE_URL = 'https://api.vydora.io'; // placeholder — update when backend is pushed

// Lowercase to match MemberRole exactly — no mapping layer needed when
// AcceptInviteScreen hands this straight into useMember().inviteMember().
export type InviteRole = 'Owner' | 'Editor' | 'Viewer';

export interface SendInvitePayload {
  projectId: string;
  emails: string[];
  role: InviteRole;
  message?: string;
}

// One entry per email — each invitee gets their own token / accept-decline state.
export interface SentInvite {
  email: string;
  token: string;
  inviteLink: string;
}

export interface SendInviteResult {
  success: boolean;
  invitesSent: number;
  invites: SentInvite[];
  inviteLink:string;
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

// ---------------------------------------------------------------------------
// Mock data store — keyed by token. One record per invitee email, so each
// person has their own independent pending/accepted/declined state.
// ---------------------------------------------------------------------------

const MOCK_LATENCY_MS = 500;


// mock store — fix casing to match InviteRole
const mockInviteStore: Record<string, InviteDetails> = {
  'demo-token-123': {
    token: 'demo-token-123',
    projectId: 'proj-001',
    projectName: 'Summer Campaign Edit',
    projectThumbnailUrl: 'https://placehold.co/400x225/1a1a1a/F5C518?text=Vydora',
    inviterName: 'Kel',
    inviteeEmail: 'demo@vydora.io',
    role: 'Editor', // was 'editor'
    message: 'Hey! Would love your eye on the color grade before we lock this.',
    status: 'pending',
  },
};



function delay<T>(value: T, ms: number = MOCK_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function generateMockToken(): string {
  return `mock-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// sendInvite — creates one invite record per email, each with its own token.
// ---------------------------------------------------------------------------

// sendInvite mock branch — actually populate inviteLink
export async function sendInvite(
  projectId: string,
  emails: string[],
  role: InviteRole,
  message?: string
): Promise<SendInviteResult> {
  if (USE_MOCK) {
    const invites: SentInvite[] = emails.map((email) => {
      const token = generateMockToken();

      mockInviteStore[token] = {
        token,
        projectId,
        projectName: 'Summer Campaign Edit',
        projectThumbnailUrl: 'https://placehold.co/400x225/1a1a1a/F5C518?text=Vydora',
        inviterName: 'Kel',
        inviteeEmail: email,
        role,
        message,
        status: 'pending',
      };

      return {
        email,
        token,
        inviteLink: `vydora.io/invite/${token}`,
      };
    });

    return delay({
      success: true,
      invitesSent: invites.length,
      invites,
      // TWEAK: project-level link uses the first invite's link as a stand-in
      // until the backend generates a single shareable project invite link.
      inviteLink: invites[0]?.inviteLink ?? '',
    });
  }

  const response = await fetch(`${BASE_URL}/projects/${projectId}/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emails, role, message }),
  });

  if (!response.ok) {
    throw new Error(`sendInvite failed: ${response.status}`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// getInviteByToken
// ---------------------------------------------------------------------------

export async function getInviteByToken(token: string): Promise<InviteDetails> {
  if (USE_MOCK) {
    const invite = mockInviteStore[token];

    if (!invite) {
      throw new Error('Invite not found');
    }

    return delay(invite);
  }

  const response = await fetch(`${BASE_URL}/invites/${token}`);

  if (!response.ok) {
    throw new Error(`getInviteByToken failed: ${response.status}`);
  }

  return response.json();
}


// ---------------------------------------------------------------------------
// acceptInvite — flips this invite's own status server-side. The actual
// membership creation happens in AcceptInviteScreen via useMember().inviteMember(),
// which is the real source of truth for project membership.
// ---------------------------------------------------------------------------


export async function acceptInvite(token: string): Promise<AcceptInviteResult> {
  if (USE_MOCK) {
    const invite = mockInviteStore[token];

    if (!invite) {
      throw new Error('Invite not found');
    }

    invite.status = 'accepted';

    return delay({ success: true, projectId: invite.projectId });
  }

  const response = await fetch(`${BASE_URL}/invites/${token}/accept`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`acceptInvite failed: ${response.status}`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// declineInvite
// ---------------------------------------------------------------------------

export async function declineInvite(token: string): Promise<DeclineInviteResult> {
  if (USE_MOCK) {
    const invite = mockInviteStore[token];

    if (!invite) {
      throw new Error('Invite not found');
    }

    invite.status = 'declined';

    return delay({ success: true });
  }

  const response = await fetch(`${BASE_URL}/invites/${token}/decline`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`declineInvite failed: ${response.status}`);
  }

  return response.json();
}


