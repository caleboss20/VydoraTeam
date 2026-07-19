import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Member, MemberRole } from '../types';
import { memberService } from '../services/membersServvice';
import { useAuth } from './Authcontext';
import { CONFIG } from '../config';
// ─── Context Type ─────────────────────────────────────────────────────────────
interface MemberContextType {
  members: { [projectId: string]: Member[] };
  isLoading: boolean;
  error: string | null;
  fetchMembers: (projectId: string) => Promise<void>;
  /** `role` accepts Title-Case MemberRole or InviteMember keys (editor/viewer/admin). */
  inviteMember: (projectId: string, email: string, role: MemberRole | string) => Promise<void>;
  changeRole: (projectId: string, memberId: string, role: MemberRole | string) => Promise<void>;
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
  // ── Rehydrate the whole { [projectId]: Member[] } map from AsyncStorage ──
  // Note: online/offline status gets cached too, so on cold start a member
  // may briefly show as "online" from a stale snapshot until the next real
  // fetch or WebSocket presence update corrects it.
  useEffect(() => {
    const rehydrate = async () => {
      try {
        const cached = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.MEMBERS);
        if (cached) setMembers(JSON.parse(cached));
      } catch (e) {
        console.log('Member rehydration failed', e);
      }
    };
    rehydrate();
  }, []);
  const persist = async (next: { [projectId: string]: Member[] }) => {
    await AsyncStorage.setItem(CONFIG.ASYNC_STORAGE_KEYS.MEMBERS, JSON.stringify(next));
  };
  const fetchMembers = async (projectId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await memberService.getMembers(projectId, token!);
      const next = { ...members, [projectId]: data };
      setMembers(next);
      await persist(next);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };
  const inviteMember = async (
    projectId: string,
    email: string,
    role: MemberRole | string
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      // role may arrive as Title-Case or InviteMember’s lowercase keys — mapper handles both.
      const newMember = await memberService.inviteMember(projectId, email, role, token!);
      const next = {
        ...members,
        [projectId]: [...(members[projectId] || []), newMember],
      };
      setMembers(next);
      await persist(next);
    } catch (e: any) {
      setError(e.message);
      // Re-throw so InviteMemberScreen can show its Alert on failure.
      throw e;
    } finally {
      setIsLoading(false);
    }
  };
  const changeRole = async (
    projectId: string,
    memberId: string,
    role: MemberRole | string
  ) => {
    try {
      setError(null);
      const updated = await memberService.changeRole(projectId, memberId, role, token!);
      const next = {
        ...members,
        [projectId]: (members[projectId] || []).map(m => (m.id === memberId ? updated : m)),
      };
      setMembers(next);
      await persist(next);
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };
  const removeMember = async (projectId: string, memberId: string) => {
    try {
      setError(null);
      await memberService.removeMember(projectId, memberId, token!);
      const next = {
        ...members,
        [projectId]: (members[projectId] || []).filter(m => m.id !== memberId),
      };
      setMembers(next);
      await persist(next);
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };
  const getMembersForProject = (projectId: string): Member[] => {
    return members[projectId] || [];
  };
  // Called by WebSocket when member comes online/offline.
  // Fire-and-forget persist here — not awaited because this fires rapidly
  // on every presence event and shouldn't block the caller. Worth knowing:
  // a crash between setMembers and the AsyncStorage write would lose this
  // particular presence flip on next cold start, which is an acceptable
  // tradeoff for presence data (it'll just refetch/resync from the server).
  const setMemberOnline = (
    projectId: string,
    userId: string,
    online: boolean
  ) => {
    const next = {
      ...members,
      [projectId]: (members[projectId] || []).map(m =>
        m.userId === userId ? { ...m, online } : m
      ),
    };
    setMembers(next);
    persist(next).catch(e => console.log('Member presence persist failed', e));
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