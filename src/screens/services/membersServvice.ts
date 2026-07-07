import { CONFIG } from '../config';
import { Member, MemberRole } from '../types';
// ─── Mock Data ───────────────────────────────────────────────────────────────
// Base member "template" — projectId gets stamped in dynamically per request,
// so mocks work regardless of what project ID is generated at runtime.
const MOCK_MEMBER_TEMPLATE: Omit<Member, 'projectId'>[] = [
  {
    id: '1',
    userId: '1',
    name: 'Caleb Dwamena',
    initials: 'CD',
    color: '#F5C518',
    role: 'Owner',
    online: true,
  },
  {
    id: '2',
    userId: '2',
    name: 'Jesse Sarfo',
    initials: 'JS',
    color: '#4CAF50',
    role: 'Editor',
    online: true,
  },
  {
    id: '3',
    userId: '3',
    name: 'Ama Owusu',
    initials: 'AO',
    color: '#E91E63',
    role: 'Editor',
    online: false,
  },
  {
    id: '4',
    userId: '4',
    name: 'Kofi Mensah',
    initials: 'KM',
    color: '#2196F3',
    role: 'Viewer',
    online: false,
  },
];
// Keeps a per-project copy so online/offline flips (setMemberOnline) persist
// correctly across calls instead of resetting on every getMembers() call.
let MOCK_MEMBERS_BY_PROJECT: { [projectId: string]: Member[] } = {};
function getOrCreateMockMembers(projectId: string): Member[] {
  if (!MOCK_MEMBERS_BY_PROJECT[projectId]) {
    MOCK_MEMBERS_BY_PROJECT[projectId] = MOCK_MEMBER_TEMPLATE.map((m) => ({
      ...m,
      projectId,
    }));
  }
  return MOCK_MEMBERS_BY_PROJECT[projectId];
}
// ─── Service ─────────────────────────────────────────────────────────────────
export const memberService = {
  getMembers: async (projectId: string, token: string): Promise<Member[]> => {
    if (CONFIG.USE_MOCK) {
      return getOrCreateMockMembers(projectId);
    }
    const res = await fetch(`${CONFIG.API_BASE}/projects/${projectId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch members');
    return res.json();
  },
  inviteMember: async (
    projectId: string,
    email: string,
    role: MemberRole,
    token: string
  ): Promise<Member> => {
    if (CONFIG.USE_MOCK) {
      const newMember: Member = {
        id: Date.now().toString(),
        projectId,
        userId: Date.now().toString(),
        name: email.split('@')[0],
        initials: email.slice(0, 2).toUpperCase(),
        color: '#888888',
        role,
        online: false,
      };
      const list = getOrCreateMockMembers(projectId);
      list.push(newMember);
      return newMember;
    }
    const res = await fetch(`${CONFIG.API_BASE}/projects/${projectId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, role }),
    });
    if (!res.ok) throw new Error('Failed to invite member');
    return res.json();
  },
  changeRole: async (
    projectId: string,
    memberId: string,
    role: MemberRole,
    token: string
  ): Promise<Member> => {
    if (CONFIG.USE_MOCK) {
      const list = getOrCreateMockMembers(projectId);
      const member = list.find((m) => m.id === memberId)!;
      const updated = { ...member, role };
      const idx = list.findIndex((m) => m.id === memberId);
      list[idx] = updated;
      return updated;
    }
    const res = await fetch(
      `${CONFIG.API_BASE}/projects/${projectId}/members/${memberId}/role`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      }
    );
    if (!res.ok) throw new Error('Failed to change role');
    return res.json();
  },
  removeMember: async (
    projectId: string,
    memberId: string,
    token: string
  ): Promise<void> => {
    if (CONFIG.USE_MOCK) {
      const list = getOrCreateMockMembers(projectId);
      MOCK_MEMBERS_BY_PROJECT[projectId] = list.filter((m) => m.id !== memberId);
      return;
    }
    const res = await fetch(
      `${CONFIG.API_BASE}/projects/${projectId}/members/${memberId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) throw new Error('Failed to remove member');
  },
};