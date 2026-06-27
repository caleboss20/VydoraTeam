import { CONFIG } from '../config';
import { Member, MemberRole } from '../types';
// ─── Mock Data ───────────────────────────────────────────────────────────────
const MOCK_MEMBERS: Member[] = [
  {
    id: '1',
    projectId: '1',
    userId: '1',
    name: 'Caleb Dwamena',
    initials: 'CD',
    color: '#F5C518',
    role: 'Owner',
    online: true,
  },
  {
    id: '2',
    projectId: '1',
    userId: '2',
    name: 'Jesse Sarfo',
    initials: 'JS',
    color: '#4CAF50',
    role: 'Editor',
    online: true,
  },
  {
    id: '3',
    projectId: '1',
    userId: '3',
    name: 'Ama Owusu',
    initials: 'AO',
    color: '#E91E63',
    role: 'Editor',
    online: false,
  },
  {
    id: '4',
    projectId: '1',
    userId: '4',
    name: 'Kofi Mensah',
    initials: 'KM',
    color: '#2196F3',
    role: 'Viewer',
    online: false,
  },
];
// ─── Service ─────────────────────────────────────────────────────────────────
export const memberService = {
  // get all members for a project
  getMembers: async (projectId: string, token: string): Promise<Member[]> => {
    if (CONFIG.USE_MOCK) {
      return MOCK_MEMBERS.filter(m => m.projectId === projectId);
    }
    const res = await fetch(`${CONFIG.API_BASE}/projects/${projectId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch members');
    return res.json();
  },
  // invite a user to a project by email
  inviteMember: async (
    projectId: string,
    email: string,
    role: MemberRole,
    token: string
  ): Promise<Member> => {
    if (CONFIG.USE_MOCK) {
      return {
        id: Date.now().toString(),
        projectId,
        userId: Date.now().toString(),
        name: email.split('@')[0],
        initials: email.slice(0, 2).toUpperCase(),
        color: '#888888',
        role,
        online: false,
      };
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
  // change a member's role
  changeRole: async (
    projectId: string,
    memberId: string,
    role: MemberRole,
    token: string
  ): Promise<Member> => {
    if (CONFIG.USE_MOCK) {
      const member = MOCK_MEMBERS.find(m => m.id === memberId)!;
      return { ...member, role };
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
  // remove a member from project
  removeMember: async (
    projectId: string,
    memberId: string,
    token: string
  ): Promise<void> => {
    if (CONFIG.USE_MOCK) return;
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