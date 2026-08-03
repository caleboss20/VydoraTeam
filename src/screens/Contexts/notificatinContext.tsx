//For notifications//
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { Alert } from 'react-native';
import { Notification } from '../types';
import { notificationService } from '../services/notificationService';
import { memberService } from '../services/membersServvice';
import { useAuth } from './Authcontext';
import {
  useUserNotificationSocket,
  InvitePushPayload,
  InviteApprovalPush,
  InviteApprovalResolvedPush,
  RoleUpgradePush,
  RoleUpgradeResolvedPush,
} from '../socket/userNotificationSocket';
import InviteApprovalModal from '../components/InviteApprovalModal';
import RoleUpgradeApprovalModal from '../components/RoleUpgradeApprovalModal';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  latestInvite: InvitePushPayload | null;
  pendingApproval: InviteApprovalPush | null;
  pendingRoleUpgrade: RoleUpgradePush | null;
  clearLatestInvite: () => void;
  clearPendingApproval: () => void;
  clearPendingRoleUpgrade: () => void;
  /** Owner: load pending admit queue for a project (Activity / Team). */
  openPendingApprovals: (
    projectId: string,
    projectTitle?: string
  ) => Promise<void>;
  /** Owner: load pending Viewer→Editor upgrade requests. */
  openPendingRoleUpgrades: (
    projectId: string,
    projectTitle?: string
  ) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

function enqueueUnique(
  prev: InviteApprovalPush[],
  next: InviteApprovalPush
): InviteApprovalPush[] {
  if (prev.some((p) => p.requestId === next.requestId)) return prev;
  return [...prev, next];
}

function enqueueRoleUnique(
  prev: RoleUpgradePush[],
  next: RoleUpgradePush
): RoleUpgradePush[] {
  if (prev.some((p) => p.requestId === next.requestId)) return prev;
  return [...prev, next];
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestInvite, setLatestInvite] = useState<InvitePushPayload | null>(null);
  const [approvalQueue, setApprovalQueue] = useState<InviteApprovalPush[]>([]);
  const [approvalBusy, setApprovalBusy] = useState(false);
  const [roleUpgradeQueue, setRoleUpgradeQueue] = useState<RoleUpgradePush[]>([]);
  const [roleUpgradeBusy, setRoleUpgradeBusy] = useState(false);
  const hasItemsRef = useRef(false);
  const fetchInFlightRef = useRef(false);
  const lastInviteAlertKey = useRef('');

  const pendingApproval = approvalQueue[0] ?? null;
  const pendingRoleUpgrade = roleUpgradeQueue[0] ?? null;

  useEffect(() => {
    hasItemsRef.current = notifications.length > 0;
  }, [notifications.length]);

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      return;
    }
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;
    try {
      if (!hasItemsRef.current) setIsLoading(true);
      setError(null);
      const data = await notificationService.getNotifications(token);
      setNotifications(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
      fetchInFlightRef.current = false;
    }
  }, [token]);

  const clearLatestInvite = useCallback(() => setLatestInvite(null), []);
  const clearPendingApproval = useCallback(() => {
    setApprovalQueue((q) => q.slice(1));
  }, []);
  const clearPendingRoleUpgrade = useCallback(() => {
    setRoleUpgradeQueue((q) => q.slice(1));
  }, []);

  const openPendingApprovals = useCallback(
    async (projectId: string, projectTitle?: string) => {
      if (!token) return;
      try {
        const items = await memberService.listInviteRequests(projectId, token);
        if (items.length === 0) {
          Alert.alert('No pending admits', 'There are no invite requests waiting for you.');
          return;
        }
        setApprovalQueue((prev) => {
          let next = [...prev];
          for (const r of items) {
            next = enqueueUnique(next, {
              type: 'invite_approval',
              requestId: r.id,
              projectId: r.projectId,
              projectTitle: projectTitle || 'Project',
              requestedById: r.requestedById,
              requestedByName: r.requestedByName,
              inviteeEmail: r.inviteeEmail,
              role: r.role,
              requestedAt: r.createdAt,
            });
          }
          return next;
        });
      } catch (e: any) {
        Alert.alert('Could not load requests', e?.message ?? 'Try again later.');
      }
    },
    [token]
  );

  const openPendingRoleUpgrades = useCallback(
    async (projectId: string, projectTitle?: string) => {
      if (!token) return;
      try {
        const items = await memberService.listRoleUpgradeRequests(projectId, token);
        if (items.length === 0) {
          Alert.alert(
            'No pending requests',
            'There are no Editor access requests waiting for you.'
          );
          return;
        }
        setRoleUpgradeQueue((prev) => {
          let next = [...prev];
          for (const r of items) {
            next = enqueueRoleUnique(next, {
              type: 'role_upgrade',
              requestId: r.id,
              projectId: r.projectId,
              projectTitle: projectTitle || 'Project',
              requestedById: r.requestedById,
              requestedByName: r.requestedByName,
              requestedRole: r.requestedRole,
              requestedAt: r.createdAt,
            });
          }
          return next;
        });
      } catch (e: any) {
        Alert.alert('Could not load requests', e?.message ?? 'Try again later.');
      }
    },
    [token]
  );

  useUserNotificationSocket({
    onInvite: (payload) => {
      setLatestInvite(payload);
      const key = `${payload.projectId}:${payload.invitedAt ?? ''}`;
      if (key !== lastInviteAlertKey.current) {
        lastInviteAlertKey.current = key;
        Alert.alert(
          'Project invite',
          `You've been invited to collaborate on "${payload.projectTitle}" as ${payload.role}.`,
          [{ text: 'OK' }]
        );
      }
    },
    onInviteApproval: (payload) => {
      setApprovalQueue((prev) => enqueueUnique(prev, payload));
    },
    onInviteApprovalResolved: (payload: InviteApprovalResolvedPush) => {
      Alert.alert(
        payload.approved ? 'Invite approved' : 'Invite declined',
        payload.approved
          ? `Host admitted ${payload.inviteeEmail} to "${payload.projectTitle}".`
          : `Host declined your invite for ${payload.inviteeEmail} on "${payload.projectTitle}".`
      );
    },
    onRoleUpgrade: (payload) => {
      setRoleUpgradeQueue((prev) => enqueueRoleUnique(prev, payload));
    },
    onRoleUpgradeResolved: (payload: RoleUpgradeResolvedPush) => {
      Alert.alert(
        payload.approved ? 'Editor access granted' : 'Request declined',
        payload.approved
          ? `You're now an Editor on "${payload.projectTitle}". You can cut and export.`
          : `The Owner declined your Editor request on "${payload.projectTitle}".`
      );
    },
    onNotification: () => {
      setTimeout(() => {
        void fetchNotifications();
      }, 400);
    },
  });

  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setLatestInvite(null);
      setApprovalQueue([]);
      setRoleUpgradeQueue([]);
      return;
    }
    void fetchNotifications();
  }, [token, fetchNotifications]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!token) return;
      try {
        await notificationService.markAsRead(notificationId, token);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
      } catch (e: any) {
        setError(e.message);
      }
    },
    [token]
  );

  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    try {
      await notificationService.markAllAsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e: any) {
      setError(e.message);
    }
  }, [token]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!token) return;
      try {
        await notificationService.deleteNotification(notificationId, token);
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      } catch (e: any) {
        setError(e.message);
      }
    },
    [token]
  );

  const clearAll = useCallback(async () => {
    if (!token) return;
    try {
      await notificationService.clearAll(token);
      setNotifications([]);
    } catch (e: any) {
      setError(e.message);
    }
  }, [token]);

  const shiftQueue = useCallback(() => {
    setApprovalQueue((q) => q.slice(1));
  }, []);

  const shiftRoleQueue = useCallback(() => {
    setRoleUpgradeQueue((q) => q.slice(1));
  }, []);

  const handleAdmit = useCallback(async () => {
    if (!pendingApproval || !token) return;
    try {
      setApprovalBusy(true);
      await memberService.approveInviteRequest(
        pendingApproval.projectId,
        pendingApproval.requestId,
        token
      );
      shiftQueue();
      void fetchNotifications();
    } catch (e: any) {
      Alert.alert('Could not admit', e?.message ?? 'Try again from Activity.');
    } finally {
      setApprovalBusy(false);
    }
  }, [pendingApproval, token, fetchNotifications, shiftQueue]);

  const handleDeclineApproval = useCallback(async () => {
    if (!pendingApproval || !token) return;
    try {
      setApprovalBusy(true);
      await memberService.rejectInviteRequest(
        pendingApproval.projectId,
        pendingApproval.requestId,
        token
      );
      shiftQueue();
      void fetchNotifications();
    } catch (e: any) {
      Alert.alert('Could not decline', e?.message ?? 'Try again later.');
    } finally {
      setApprovalBusy(false);
    }
  }, [pendingApproval, token, fetchNotifications, shiftQueue]);

  const handleGrantEditor = useCallback(async () => {
    if (!pendingRoleUpgrade || !token) return;
    try {
      setRoleUpgradeBusy(true);
      await memberService.approveRoleUpgrade(
        pendingRoleUpgrade.projectId,
        pendingRoleUpgrade.requestId,
        token
      );
      shiftRoleQueue();
      void fetchNotifications();
    } catch (e: any) {
      Alert.alert('Could not grant access', e?.message ?? 'Try again from Activity.');
    } finally {
      setRoleUpgradeBusy(false);
    }
  }, [pendingRoleUpgrade, token, fetchNotifications, shiftRoleQueue]);

  const handleDeclineRoleUpgrade = useCallback(async () => {
    if (!pendingRoleUpgrade || !token) return;
    try {
      setRoleUpgradeBusy(true);
      await memberService.rejectRoleUpgrade(
        pendingRoleUpgrade.projectId,
        pendingRoleUpgrade.requestId,
        token
      );
      shiftRoleQueue();
      void fetchNotifications();
    } catch (e: any) {
      Alert.alert('Could not decline', e?.message ?? 'Try again later.');
    } finally {
      setRoleUpgradeBusy(false);
    }
  }, [pendingRoleUpgrade, token, fetchNotifications, shiftRoleQueue]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      error,
      latestInvite,
      pendingApproval,
      pendingRoleUpgrade,
      clearLatestInvite,
      clearPendingApproval,
      clearPendingRoleUpgrade,
      openPendingApprovals,
      openPendingRoleUpgrades,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll,
    }),
    [
      notifications,
      unreadCount,
      isLoading,
      error,
      latestInvite,
      pendingApproval,
      pendingRoleUpgrade,
      clearLatestInvite,
      clearPendingApproval,
      clearPendingRoleUpgrade,
      openPendingApprovals,
      openPendingRoleUpgrades,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <InviteApprovalModal
        visible={!!pendingApproval && !pendingRoleUpgrade}
        request={pendingApproval}
        busy={approvalBusy}
        onAdmit={handleAdmit}
        onDecline={handleDeclineApproval}
        onDismiss={clearPendingApproval}
      />
      <RoleUpgradeApprovalModal
        visible={!!pendingRoleUpgrade}
        request={pendingRoleUpgrade}
        busy={roleUpgradeBusy}
        onAdmit={handleGrantEditor}
        onDecline={handleDeclineRoleUpgrade}
        onDismiss={clearPendingRoleUpgrade}
      />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context)
    throw new Error('useNotification must be used within NotificationProvider');
  return context;
}
