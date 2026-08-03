import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef,
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
  inviteMember: (
    projectId: string,
    email: string,
    role: MemberRole | string
  ) => Promise<Member>;
  changeRole: (projectId: string, memberId: string, role: MemberRole | string) => Promise<void>;
  removeMember: (projectId: string, memberId: string) => Promise<void>;
  getMembersForProject: (projectId: string) => Member[];
  /** Current user's role on a project (undefined if not a member yet). */
  getMyRoleForProject: (projectId: string) => MemberRole | undefined;
  /** Owner or Editor — can mutate timeline / export. */
  canEditProject: (projectId: string) => boolean;
  setMemberOnline: (projectId: string, userId: string, online: boolean) => void;
  /** Replace the full online set for a project (from WebSocket presence broadcast). */
  setOnlineMembers: (
    projectId: string,
    onlineUserIds: string[],
    /** Always keep this user marked online (self) across empty/race broadcasts. */
    keepOnlineUserId?: string | null
  ) => void;
}
// ─── Context ─────────────────────────────────────────────────────────────────
const MemberContext = createContext<MemberContextType | undefined>(undefined);

/** Apply cached presence ids onto a member list (REST always returns online:false). */
function withPresence(list: Member[], onlineIds: Set<string> | undefined): Member[] {
  if (!onlineIds || onlineIds.size === 0) {
    return list.map((m) => (m.online ? { ...m, online: false } : m));
  }
  return list.map((m) => {
    const online = onlineIds.has(m.userId);
    return m.online === online ? m : { ...m, online };
  });
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function MemberProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [members, setMembers] = useState<{ [projectId: string]: Member[] }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Live presence from WebSocket — kept separate so a REST refetch can't wipe
  // "you're online" back to 0 when members reload with online:false.
  const onlineByProjectRef = useRef<{ [projectId: string]: Set<string> }>({});
  // ── Rehydrate the whole { [projectId]: Member[] } map from AsyncStorage ──
  // Presence is NOT trusted from cache — start everyone offline until WS says so.
  useEffect(() => {
    const rehydrate = async () => {
      try {
        const cached = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.MEMBERS);
        if (cached) {
          const parsed = JSON.parse(cached) as { [projectId: string]: Member[] };
          const cleared: { [projectId: string]: Member[] } = {};
          for (const [pid, list] of Object.entries(parsed)) {
            cleared[pid] = (list || []).map((m) => ({ ...m, online: false }));
          }
          setMembers(cleared);
        }
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
      const merged = withPresence(data, onlineByProjectRef.current[projectId]);
      setMembers((prev) => {
        const next = { ...prev, [projectId]: merged };
        persist(next).catch((e) => console.log('Member persist failed', e));
        return next;
      });
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
  ): Promise<Member> => {
    try {
      setIsLoading(true);
      setError(null);
      // role may arrive as Title-Case or InviteMember’s lowercase keys — mapper handles both.
      const newMember = await memberService.inviteMember(projectId, email, role, token!);
      // Host-approval requests are not roster rows yet — Owners admit first.
      if (newMember.status !== 'PENDING_APPROVAL') {
        setMembers((prev) => {
          const list = [...(prev[projectId] || []), newMember];
          const merged = withPresence(list, onlineByProjectRef.current[projectId]);
          const next = { ...prev, [projectId]: merged };
          persist(next).catch((e) => console.log('Member persist failed', e));
          return next;
        });
      }
      return newMember;
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
      setMembers((prev) => {
        const next = {
          ...prev,
          [projectId]: (prev[projectId] || []).map((m) =>
            m.id === memberId ? updated : m
          ),
        };
        const merged = withPresence(next[projectId], onlineByProjectRef.current[projectId]);
        const out = { ...next, [projectId]: merged };
        persist(out).catch((e) => console.log('Member persist failed', e));
        return out;
      });
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };
  const removeMember = async (projectId: string, memberId: string) => {
    try {
      setError(null);
      await memberService.removeMember(projectId, memberId, token!);
      setMembers((prev) => {
        const next = {
          ...prev,
          [projectId]: (prev[projectId] || []).filter((m) => m.id !== memberId),
        };
        persist(next).catch((e) => console.log('Member persist failed', e));
        return next;
      });
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };
  const getMembersForProject = (projectId: string): Member[] => {
    return members[projectId] || [];
  };

  const getMyRoleForProject = (projectId: string): MemberRole | undefined => {
    if (!user?.id || !projectId) return undefined;
    const me = (members[projectId] || []).find(
      (m) => m.userId === user.id && (m.status || 'ACTIVE') === 'ACTIVE'
    );
    return me?.role;
  };

  const canEditProject = (projectId: string): boolean => {
    const role = getMyRoleForProject(projectId);
    return role === 'Owner' || role === 'Editor';
  };

  // Called by WebSocket when member comes online/offline.
  const setMemberOnline = (
    projectId: string,
    userId: string,
    online: boolean
  ) => {
    const set = onlineByProjectRef.current[projectId] ?? new Set<string>();
    if (online) set.add(userId);
    else set.delete(userId);
    onlineByProjectRef.current[projectId] = set;
    setMembers((prev) => {
      const list = prev[projectId] || [];
      const updated = withPresence(list, set);
      const next = { ...prev, [projectId]: updated };
      persist(next).catch((e) => console.log('Member presence persist failed', e));
      return next;
    });
  };
  // Called by the WebSocket presence broadcast: the backend sends the full set
  // of userIds currently online in the project. Everyone else is offline.
  // Always merge `keepOnlineUserId` (usually self) so a empty/race broadcast
  // never flashes "0 online" while you're still connected.
  const setOnlineMembers = (
    projectId: string,
    onlineUserIds: string[],
    keepOnlineUserId?: string | null
  ) => {
    const onlineSet = new Set(
      (onlineUserIds || []).map((id) => String(id)).filter(Boolean)
    );
    if (keepOnlineUserId) onlineSet.add(String(keepOnlineUserId));
    onlineByProjectRef.current[projectId] = onlineSet;
    setMembers((prev) => {
      const list = prev[projectId] || [];
      if (!list.length) return prev; // presence cached in ref; applied on next fetchMembers
      const updated = withPresence(list, onlineSet);
      let changed = false;
      for (let i = 0; i < list.length; i++) {
        if (list[i].online !== updated[i].online) {
          changed = true;
          break;
        }
      }
      if (!changed) return prev;
      const next = { ...prev, [projectId]: updated };
      persist(next).catch((e) => console.log('Member presence persist failed', e));
      return next;
    });
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
      getMyRoleForProject,
      canEditProject,
      setMemberOnline,
      setOnlineMembers,
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
