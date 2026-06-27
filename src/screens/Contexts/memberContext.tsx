//For member context//
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';
import { Member, MemberRole } from '../types';
import { memberService } from '../services/membersServvice';
import { useAuth } from './Authcontext';
// ─── Context Type ─────────────────────────────────────────────────────────────
interface MemberContextType {
  members: { [projectId: string]: Member[] };
  isLoading: boolean;
  error: string | null;
  fetchMembers: (projectId: string) => Promise<void>;
  inviteMember: (projectId: string, email: string, role: MemberRole) => Promise<void>;
  changeRole: (projectId: string, memberId: string, role: MemberRole) => Promise<void>;
  removeMember: (projectId: string, memberId: string) => Promise<void>;
  getMembersForProject: (projectId: string) => Member[];
  setMemberOnline: (projectId: string, userId: string, online: boolean) => void;
}
// ─── Context ─────────────────────────────────────────────────────────────────
const MemberContext = createContext<MemberContextType | undefined>(undefined);
// ─── Provider ────────────────────────────────────────────────────────────────
export function MemberProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [members, setMembers] = useState<{ [projectId: string]: Member[] }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchMembers = async (projectId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await memberService.getMembers(projectId, token!);
      setMembers(prev => ({ ...prev, [projectId]: data }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };
  const inviteMember = async (
    projectId: string,
    email: string,
    role: MemberRole
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      const newMember = await memberService.inviteMember(
        projectId,
        email,
        role,
        token!
      );
      setMembers(prev => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), newMember],
      }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };
  const changeRole = async (
    projectId: string,
    memberId: string,
    role: MemberRole
  ) => {
    try {
      setError(null);
      const updated = await memberService.changeRole(
        projectId,
        memberId,
        role,
        token!
      );
      setMembers(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).map(m =>
          m.id === memberId ? updated : m
        ),
      }));
    } catch (e: any) {
      setError(e.message);
    }
  };
  const removeMember = async (projectId: string, memberId: string) => {
    try {
      setError(null);
      await memberService.removeMember(projectId, memberId, token!);
      setMembers(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter(m => m.id !== memberId),
      }));
    } catch (e: any) {
      setError(e.message);
    }
  };
  const getMembersForProject = (projectId: string): Member[] => {
    return members[projectId] || [];
  };
  // called by WebSocket when member comes online/offline
  const setMemberOnline = (
    projectId: string,
    userId: string,
    online: boolean
  ) => {
    setMembers(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).map(m =>
        m.userId === userId ? { ...m, online } : m
      ),
    }));
  };
  return (
    <MemberContext.Provider value={{
      members,
      isLoading,
      error,
      fetchMembers,
      inviteMember,
      changeRole,
      removeMember,
      getMembersForProject,
      setMemberOnline,
    }}>
      {children}
    </MemberContext.Provider>
  );
}
// ─── Hook ────────────────────────────────────────────────────────────────────
export function useMember() {
  const context = useContext(MemberContext);
  if (!context) throw new Error('useMember must be used within MemberProvider');
  return context;
}