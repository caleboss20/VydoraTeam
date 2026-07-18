/**
 * Member service — `/api/v1/projects/{projectId}/members`.
 *
 * Invite:  POST .../members/invite  { email, role: OWNER|EDITOR|VIEWER }
 *            Invitee must already have a Vydora account.
 * List:    GET  .../members         → { items: MemberResponse[] }
 * Role:    PUT  .../members/{userId} { role }
 * Remove:  DELETE .../members/{userId}
 * Accept:  POST .../members/{userId}/accept   (invitee only)
 * Decline: POST .../members/{userId}/decline  (invitee only)
 *
 * `memberId` arguments from the UI are treated as `userId` (see mappers).
 */
import { CONFIG } from '../config';
import { Member, MemberRole } from '../types';
import { apiRequest } from './apiClient';
import {
  ApiMember,
  mapMemberFromApi,
  mapMemberRoleToApi,
} from './mappers';

type ItemsMembers = { items: ApiMember[] };

export const memberService = {
  getMembers: async (projectId: string, _token: string): Promise<Member[]> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock members disabled.');
    const data = await apiRequest<ItemsMembers>(
      `/projects/${projectId}/members`
    );
    return (data.items || []).map(mapMemberFromApi);
  },

  inviteMember: async (
    projectId: string,
    email: string,
    role: MemberRole | string,
    _token: string
  ): Promise<Member> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock members disabled.');
    const data = await apiRequest<ApiMember>(
      `/projects/${projectId}/members/invite`,
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          role: mapMemberRoleToApi(role),
        }),
      }
    );
    return mapMemberFromApi(data);
  },

  changeRole: async (
    projectId: string,
    memberId: string,
    role: MemberRole | string,
    _token: string
  ): Promise<Member> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock members disabled.');
    // memberId === userId in our mapped Member model
    const data = await apiRequest<ApiMember>(
      `/projects/${projectId}/members/${memberId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ role: mapMemberRoleToApi(role) }),
      }
    );
    return mapMemberFromApi(data);
  },

  removeMember: async (
    projectId: string,
    memberId: string,
    _token: string
  ): Promise<void> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock members disabled.');
    await apiRequest<void>(`/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    });
  },

  /** Invitee accepts their own INVITED membership. */
  acceptInvite: async (
    projectId: string,
    userId: string,
    _token: string
  ): Promise<Member> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock members disabled.');
    const data = await apiRequest<ApiMember>(
      `/projects/${projectId}/members/${userId}/accept`,
      { method: 'POST' }
    );
    return mapMemberFromApi(data);
  },

  /** Invitee declines; membership row is removed server-side. */
  declineInvite: async (
    projectId: string,
    userId: string,
    _token: string
  ): Promise<void> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock members disabled.');
    await apiRequest<void>(
      `/projects/${projectId}/members/${userId}/decline`,
      { method: 'POST' }
    );
  },
};
