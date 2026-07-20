/**
 * App-wide STOMP connection for private user queues.
 *
 * Subscribes to `/user/queue/notifications` so project invites + Zoom-style
 * invite-approval requests land instantly while the user is logged in.
 */
import { useEffect, useRef } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';
import { useAuth } from '../Contexts/Authcontext';

/** Invitee was added to a project (Owner sent invite or host approved). */
export type InvitePushPayload = {
  type?: 'invite';
  projectId: string;
  projectTitle: string;
  invitedBy: string;
  role: string;
  invitedAt?: string;
};

/** Editor asked Owner to admit someone. */
export type InviteApprovalPush = {
  type: 'invite_approval';
  requestId: string;
  projectId: string;
  projectTitle: string;
  requestedById: string;
  requestedByName: string;
  inviteeEmail: string;
  role: string;
  requestedAt?: string;
};

export type InviteApprovalResolvedPush = {
  type: 'invite_approval_resolved';
  approved: boolean;
  projectId: string;
  projectTitle: string;
  inviteeEmail: string;
};

export type UserNotificationPush =
  | InvitePushPayload
  | InviteApprovalPush
  | InviteApprovalResolvedPush
  | Record<string, unknown>;

type Handlers = {
  onInvite?: (payload: InvitePushPayload) => void;
  onInviteApproval?: (payload: InviteApprovalPush) => void;
  onInviteApprovalResolved?: (payload: InviteApprovalResolvedPush) => void;
  onNotification?: () => void;
};

export function useUserNotificationSocket(handlers: Handlers) {
  const { token } = useAuth();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    const client = new Client({
      brokerURL: CONFIG.WS_BROKER_URL,
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      beforeConnect: async () => {
        const stored = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.TOKEN);
        client.connectHeaders = {
          Authorization: `Bearer ${stored ?? token}`,
        };
      },
      onConnect: () => {
        if (cancelled) return;

        client.subscribe('/user/queue/notifications', (msg: IMessage) => {
          try {
            const body = JSON.parse(msg.body) as UserNotificationPush;
            const type = (body as { type?: string }).type;

            if (type === 'invite_approval' && 'requestId' in body) {
              handlersRef.current.onInviteApproval?.(body as InviteApprovalPush);
            } else if (type === 'invite_approval_resolved') {
              handlersRef.current.onInviteApprovalResolved?.(
                body as InviteApprovalResolvedPush
              );
            } else if (
              (type === 'invite' || !type) &&
              'projectId' in body &&
              'projectTitle' in body &&
              !('requestId' in body)
            ) {
              handlersRef.current.onInvite?.(body as InvitePushPayload);
            }
          } catch (e) {
            console.log('[UserSocket] bad notification payload', e);
          }
          handlersRef.current.onNotification?.();
        });

        console.log('[UserSocket] connected — invites + host approvals');
      },
      onStompError: (frame) =>
        console.log('[UserSocket] STOMP error', frame.headers['message'], frame.body),
      onWebSocketError: (e: any) =>
        console.log('[UserSocket] WebSocket error', e?.message ?? e),
    });

    client.activate();

    return () => {
      cancelled = true;
      client.deactivate().catch(() => {});
    };
  }, [token]);
}
